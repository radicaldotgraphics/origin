#!/bin/sh
# Copies of the site's canonical files so the Vite root (shaders/) can reach
# them. Re-run if either changes upstream.
set -e
cd "$(dirname "$0")"
cp ../../qrcode/vendor/lottie-light.js lottie-light.js
cp ../../data.json mark.json
echo "synced lottie-light.js and mark.json"
