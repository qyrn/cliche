#define _GNU_SOURCE
#include <errno.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <systemd/sd-bus.h>
#include <time.h>
#include <unistd.h>

enum { EXIT_LISTING_FAILED = 2 };

static const uint64_t LISTING_TIMEOUT_USEC = 2000000;
static const char OBJECT_PATH[] = "/dev/qyrn/cliche";
static const char INTERFACE_NAME[] = "dev.qyrn.cliche";
static const char SCRIPT_TEMPLATE[] =
    "const desktop = workspace.currentDesktop;\n"
    "const rect = (geometry) => ({ x: geometry.x, y: geometry.y, width: geometry.width, height: geometry.height });\n"
    "const visible = workspace.stackingOrder.filter((window) =>\n"
    "  !window.minimized && !window.hidden &&\n"
    "  (window.normalWindow || window.dialog || window.utility || window.dock) &&\n"
    "  (window.onAllDesktops || window.desktops.some((candidate) => candidate.id === desktop.id)));\n"
    "callDBus('%s', '%s', '%s', 'windows', JSON.stringify({\n"
    "  screen: rect(workspace.activeScreen.geometry),\n"
    "  windows: visible.map((window) => rect(window.frameGeometry))\n"
    "}));\n";

typedef struct {
  char *json;
} Listing;

static int receive_windows(sd_bus_message *message, void *userdata, sd_bus_error *error) {
  (void)error;
  Listing *listing = userdata;
  const char *json = NULL;
  int status = sd_bus_message_read(message, "s", &json);
  if (status < 0) {
    return status;
  }
  free(listing->json);
  listing->json = strdup(json);
  if (!listing->json) {
    return -ENOMEM;
  }
  return sd_bus_reply_method_return(message, "");
}

static const sd_bus_vtable LISTING_VTABLE[] = {
    SD_BUS_VTABLE_START(0),
    SD_BUS_METHOD("windows", "s", "", receive_windows, SD_BUS_VTABLE_UNPRIVILEGED),
    SD_BUS_VTABLE_END,
};

static uint64_t monotonic_usec(void) {
  struct timespec now;
  clock_gettime(CLOCK_MONOTONIC, &now);
  return (uint64_t)now.tv_sec * 1000000 + (uint64_t)now.tv_nsec / 1000;
}

static int write_script(const char *unique_name, char *path, size_t path_size) {
  const char *runtime_directory = getenv("XDG_RUNTIME_DIR");
  snprintf(path, path_size, "%s/cliche-windows-XXXXXX.js",
           runtime_directory && *runtime_directory ? runtime_directory : "/tmp");
  int fd = mkstemps(path, 3);
  if (fd < 0) {
    path[0] = '\0';
    return -errno;
  }
  FILE *file = fdopen(fd, "w");
  if (!file) {
    close(fd);
    return -errno;
  }
  int written = fprintf(file, SCRIPT_TEMPLATE, unique_name, OBJECT_PATH, INTERFACE_NAME);
  if (fclose(file) != 0 || written < 0) {
    return -EIO;
  }
  return 0;
}

static int load_script(sd_bus *bus, const char *path, const char *plugin_name, int32_t *script_id,
                       sd_bus_error *error) {
  sd_bus_message *reply = NULL;
  int status = sd_bus_call_method(bus, "org.kde.KWin", "/Scripting", "org.kde.kwin.Scripting", "loadScript",
                                  error, &reply, "ss", path, plugin_name);
  if (status >= 0) {
    status = sd_bus_message_read(reply, "i", script_id);
  }
  sd_bus_message_unref(reply);
  if (status >= 0 && *script_id < 0) {
    return -EINVAL;
  }
  return status;
}

static int run_script(sd_bus *bus, int32_t script_id, sd_bus_error *error) {
  char script_path[64];
  snprintf(script_path, sizeof script_path, "/Scripting/Script%d", script_id);
  return sd_bus_call_method(bus, "org.kde.KWin", script_path, "org.kde.kwin.Script", "run", error, NULL, "");
}

static void unload_script(sd_bus *bus, const char *plugin_name) {
  sd_bus_call_method(bus, "org.kde.KWin", "/Scripting", "org.kde.kwin.Scripting", "unloadScript", NULL, NULL,
                     "s", plugin_name);
}

static int wait_for_listing(sd_bus *bus, const Listing *listing) {
  uint64_t deadline = monotonic_usec() + LISTING_TIMEOUT_USEC;
  while (!listing->json) {
    int processed = sd_bus_process(bus, NULL);
    if (processed < 0) {
      return processed;
    }
    if (processed > 0) {
      continue;
    }
    uint64_t now = monotonic_usec();
    if (now >= deadline) {
      return -ETIMEDOUT;
    }
    int waited = sd_bus_wait(bus, deadline - now);
    if (waited < 0) {
      return waited;
    }
  }
  return 0;
}

int main(void) {
  sd_bus *bus = NULL;
  sd_bus_slot *slot = NULL;
  sd_bus_error error = SD_BUS_ERROR_NULL;
  Listing listing = {0};
  const char *unique_name = NULL;
  char script_file[512] = "";
  char plugin_name[64];
  int32_t script_id = -1;
  snprintf(plugin_name, sizeof plugin_name, "cliche-windows-%d", (int)getpid());

  int status = sd_bus_open_user(&bus);
  if (status >= 0) {
    status = sd_bus_get_unique_name(bus, &unique_name);
  }
  if (status >= 0) {
    status = sd_bus_add_object_vtable(bus, &slot, OBJECT_PATH, INTERFACE_NAME, LISTING_VTABLE, &listing);
  }
  if (status >= 0) {
    status = write_script(unique_name, script_file, sizeof script_file);
  }
  if (status >= 0) {
    status = load_script(bus, script_file, plugin_name, &script_id, &error);
  }
  if (status >= 0) {
    status = run_script(bus, script_id, &error);
  }
  if (status >= 0) {
    status = wait_for_listing(bus, &listing);
  }
  if (script_id >= 0) {
    unload_script(bus, plugin_name);
  }
  if (script_file[0]) {
    unlink(script_file);
  }

  int exit_code = EXIT_LISTING_FAILED;
  if (status < 0) {
    fprintf(stderr, "%s\n", error.message ? error.message : strerror(-status));
  } else {
    printf("%s\n", listing.json);
    exit_code = 0;
  }
  free(listing.json);
  sd_bus_error_free(&error);
  sd_bus_slot_unref(slot);
  sd_bus_flush_close_unref(bus);
  return exit_code;
}
