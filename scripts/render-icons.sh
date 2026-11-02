#!/bin/sh
set -eu
cd "$(dirname "$0")/../resources"
rsvg-convert -w 512 -h 512 source/icon.svg -o icon.png
rsvg-convert -w 22 -h 22 source/tray.svg -o tray/tray.png
rsvg-convert -w 44 -h 44 source/tray.svg -o tray/tray@2x.png
