#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
mkdir -p resources/bin
for helper in kwin-grab kwin-windows; do
  cc -O2 -Wall -Wextra -Werror -o "resources/bin/$helper" "native/$helper.c" $(pkg-config --cflags --libs libsystemd) -pthread
done
