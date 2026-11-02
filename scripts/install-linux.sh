#!/bin/sh
set -eu

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
APP_DIR="$HOME/Applications/cliche"
APPLICATIONS_DIR="${XDG_DATA_HOME:-$HOME/.local/share}/applications"
AUTOSTART_DIR="${XDG_CONFIG_HOME:-$HOME/.config}/autostart"

write_desktop_entry() {
  target="$1"
  launch_flags="$2"
  cat > "$target" <<EOF
[Desktop Entry]
Type=Application
Name=cliché
Comment=Captures d'écran avec historique et lecture du texte
Exec="$APP_DIR/cliche"$launch_flags
Icon=$APP_DIR/resources/icon.png
StartupWMClass=cliche
Categories=Utility;Graphics;
Keywords=screenshot;capture;ocr;
Terminal=false
EOF
}

if pgrep -f "^$APP_DIR/cliche" >/dev/null; then
  pkill -TERM -f "^$APP_DIR/cliche"
  while pgrep -f "^$APP_DIR/cliche" >/dev/null; do sleep 0.2; done
fi

rm -rf "$APP_DIR"
mkdir -p "$(dirname "$APP_DIR")" "$APPLICATIONS_DIR" "$AUTOSTART_DIR"
cp -r "$PROJECT_DIR/dist/linux-unpacked" "$APP_DIR"

write_desktop_entry "$APPLICATIONS_DIR/cliche.desktop" ""
write_desktop_entry "$AUTOSTART_DIR/cliche.desktop" " --hidden"

nohup "$APP_DIR/cliche" --hidden >/dev/null 2>&1 &
echo "cliché installé dans $APP_DIR"
