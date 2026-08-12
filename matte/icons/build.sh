#!/bin/sh
# Regenerate the toolbar icons from icon.svg. Needs rsvg-convert (brew install librsvg).
set -e
cd "$(dirname "$0")"
for size in 16 32 48 128; do
    rsvg-convert -w "$size" -h "$size" icon.svg -o "icon-$size.png"
done
echo "wrote icon-16 icon-32 icon-48 icon-128"
