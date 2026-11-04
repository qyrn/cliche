#!/bin/sh
set -eu

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
APP_DIR="$HOME/Applications/cliche"
APPLICATIONS_DIR="${XDG_DATA_HOME:-$HOME/.local/share}/applications"

if pgrep -f "^$APP_DIR/cliche" >/dev/null; then
  pkill -TERM -f "^$APP_DIR/cliche"
  while pgrep -f "^$APP_DIR/cliche" >/dev/null; do sleep 0.2; done
fi

rm -rf "$APP_DIR"
mkdir -p "$(dirname "$APP_DIR")" "$APPLICATIONS_DIR"
cp -r "$PROJECT_DIR/dist/linux-unpacked" "$APP_DIR"

cat > "$APPLICATIONS_DIR/cliche.desktop" <<DESKTOP
[Desktop Entry]
Type=Application
Name=cliché
Comment=Captures d'écran avec historique et lecture du texte
Exec="$APP_DIR/cliche"
Icon=$APP_DIR/resources/icon.png
StartupWMClass=cliche
Categories=Utility;
Keywords=screenshot;capture;ocr;
Terminal=false
Actions=capture;

[Desktop Action capture]
Name=Capturer une zone
Exec="$APP_DIR/cliche" --capture
DESKTOP

nohup "$APP_DIR/cliche" --hidden >/dev/null 2>&1 &
echo "cliché installé dans $APP_DIR"
