#!/bin/sh
set -e

ARCHIVE=deploy.tar.gz

rm -rf deploy

# Create required directory structure
mkdir -p deploy/.next/static

# Copy standalone server output
cp -r .next/standalone/* deploy/

# Shell globs do not include the hidden .next directory nested in the
# standalone bundle, so copy its traced server output explicitly.
cp -r .next/standalone/.next/* deploy/.next/

# Copy only browser-facing static assets. The standalone output already
# contains the traced server files; copying the full build tree also ships
# caches and duplicates hundreds of megabytes unnecessarily.
cp -r .next/static/* deploy/.next/static/

# Copy public assets
cp -r public deploy/

# Create archive
tar -czvf "$ARCHIVE" deploy
