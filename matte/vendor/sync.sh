#!/bin/sh
# The extension root is shot/, so it cannot reach ../data.json or
# ../qrcode/vendor/. These are copies of the site's canonical files — re-run
# this if either changes upstream.
set -e
cd "$(dirname "$0")"
cp ../../qrcode/vendor/lottie-light.js lottie-light.js
cp ../../data.json mark.json
echo "synced lottie-light.js and mark.json"
