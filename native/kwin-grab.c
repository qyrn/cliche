#define _GNU_SOURCE
#include <errno.h>
#include <fcntl.h>
#include <pthread.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <systemd/sd-bus.h>
#include <unistd.h>

enum {
  QIMAGE_FORMAT_RGB32 = 4,
  QIMAGE_FORMAT_ARGB32 = 5,
  QIMAGE_FORMAT_ARGB32_PREMULTIPLIED = 6,
  QIMAGE_FORMAT_RGBX8888 = 16,
  QIMAGE_FORMAT_RGBA8888 = 17,
  QIMAGE_FORMAT_RGBA8888_PREMULTIPLIED = 18
};

enum { EXIT_CAPTURE_FAILED = 2, EXIT_UNSUPPORTED_FORMAT = 3 };

typedef struct {
  int fd;
  uint8_t *bytes;
  size_t length;
  size_t capacity;
  int failed;
} PipeDrain;

typedef struct {
  uint32_t width;
  uint32_t height;
  uint32_t stride;
  uint32_t format;
} FrameInfo;

static void *drain_pipe(void *argument) {
  PipeDrain *drain = argument;
  for (;;) {
    if (drain->length == drain->capacity) {
      size_t grown_capacity = drain->capacity ? drain->capacity * 2 : (size_t)16 << 20;
      uint8_t *grown = realloc(drain->bytes, grown_capacity);
      if (!grown) {
        drain->failed = 1;
        return NULL;
      }
      drain->bytes = grown;
      drain->capacity = grown_capacity;
    }
    ssize_t received = read(drain->fd, drain->bytes + drain->length, drain->capacity - drain->length);
    if (received == 0) {
      return NULL;
    }
    if (received < 0) {
      if (errno == EINTR) {
        continue;
      }
      drain->failed = 1;
      return NULL;
    }
    drain->length += (size_t)received;
  }
}

static int read_frame_info(sd_bus_message *reply, FrameInfo *info) {
  int status = sd_bus_message_enter_container(reply, 'a', "{sv}");
  if (status < 0) {
    return status;
  }
  while ((status = sd_bus_message_enter_container(reply, 'e', "sv")) > 0) {
    const char *key = NULL;
    const char *variant_type = NULL;
    char container_type = 0;
    if ((status = sd_bus_message_read(reply, "s", &key)) < 0) {
      return status;
    }
    if ((status = sd_bus_message_peek_type(reply, &container_type, &variant_type)) < 0) {
      return status;
    }
    if (strcmp(variant_type, "u") == 0) {
      uint32_t value = 0;
      if ((status = sd_bus_message_read(reply, "v", "u", &value)) < 0) {
        return status;
      }
      if (strcmp(key, "width") == 0) {
        info->width = value;
      } else if (strcmp(key, "height") == 0) {
        info->height = value;
      } else if (strcmp(key, "stride") == 0) {
        info->stride = value;
      } else if (strcmp(key, "format") == 0) {
        info->format = value;
      }
    } else if ((status = sd_bus_message_skip(reply, "v")) < 0) {
      return status;
    }
    if ((status = sd_bus_message_exit_container(reply)) < 0) {
      return status;
    }
  }
  if (status < 0) {
    return status;
  }
  return sd_bus_message_exit_container(reply);
}

static int pack_rgba(const FrameInfo *info, uint8_t *source, uint8_t *target) {
  int swap_red_blue = 0;
  switch (info->format) {
    case QIMAGE_FORMAT_RGB32:
    case QIMAGE_FORMAT_ARGB32:
    case QIMAGE_FORMAT_ARGB32_PREMULTIPLIED:
      swap_red_blue = 1;
      break;
    case QIMAGE_FORMAT_RGBX8888:
    case QIMAGE_FORMAT_RGBA8888:
    case QIMAGE_FORMAT_RGBA8888_PREMULTIPLIED:
      break;
    default:
      return -1;
  }
  size_t row_bytes = (size_t)info->width * 4;
  for (uint32_t row = 0; row < info->height; row++) {
    const uint8_t *source_row = source + (size_t)row * info->stride;
    uint8_t *target_row = target + (size_t)row * row_bytes;
    for (size_t offset = 0; offset < row_bytes; offset += 4) {
      target_row[offset] = source_row[offset + (swap_red_blue ? 2 : 0)];
      target_row[offset + 1] = source_row[offset + 1];
      target_row[offset + 2] = source_row[offset + (swap_red_blue ? 0 : 2)];
      target_row[offset + 3] = 0xff;
    }
  }
  return 0;
}

static int write_all(const uint8_t *bytes, size_t length) {
  while (length > 0) {
    ssize_t written = write(STDOUT_FILENO, bytes, length);
    if (written < 0) {
      if (errno == EINTR) {
        continue;
      }
      return -1;
    }
    bytes += written;
    length -= (size_t)written;
  }
  return 0;
}

int main(void) {
  int pipe_fds[2];
  if (pipe2(pipe_fds, O_CLOEXEC) < 0) {
    perror("pipe2");
    return EXIT_CAPTURE_FAILED;
  }

  PipeDrain drain = {.fd = pipe_fds[0]};
  pthread_t drain_thread;
  if (pthread_create(&drain_thread, NULL, drain_pipe, &drain) != 0) {
    fputs("pthread_create failed\n", stderr);
    return EXIT_CAPTURE_FAILED;
  }

  sd_bus *bus = NULL;
  sd_bus_message *reply = NULL;
  sd_bus_error error = SD_BUS_ERROR_NULL;
  int status = sd_bus_open_user(&bus);
  if (status >= 0) {
    status = sd_bus_call_method(bus, "org.kde.KWin", "/org/kde/KWin/ScreenShot2", "org.kde.KWin.ScreenShot2",
                                "CaptureActiveScreen", &error, &reply, "a{sv}h", 2, "include-cursor", "b", 0,
                                "native-resolution", "b", 1, pipe_fds[1]);
  }
  close(pipe_fds[1]);
  pthread_join(drain_thread, NULL);

  if (status < 0) {
    fprintf(stderr, "%s\n", error.message ? error.message : strerror(-status));
    return EXIT_CAPTURE_FAILED;
  }

  FrameInfo info = {0};
  if (read_frame_info(reply, &info) < 0 || drain.failed || info.width == 0 || info.height == 0 ||
      info.stride < info.width * 4 || drain.length < (size_t)info.stride * info.height) {
    fputs("incomplete frame from KWin\n", stderr);
    return EXIT_CAPTURE_FAILED;
  }

  uint8_t *rgba = malloc((size_t)info.width * info.height * 4);
  if (!rgba) {
    fputs("out of memory\n", stderr);
    return EXIT_CAPTURE_FAILED;
  }
  if (pack_rgba(&info, drain.bytes, rgba) < 0) {
    fprintf(stderr, "unsupported QImage format %u\n", info.format);
    return EXIT_UNSUPPORTED_FORMAT;
  }

  char header[64];
  int header_length = snprintf(header, sizeof header, "%u %u\n", info.width, info.height);
  if (write_all((const uint8_t *)header, (size_t)header_length) < 0 ||
      write_all(rgba, (size_t)info.width * info.height * 4) < 0) {
    return EXIT_CAPTURE_FAILED;
  }
  return 0;
}
