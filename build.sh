#!/bin/sh
set -e

ARCHIVE=deploy.tar.gz

rm -rf deploy

# Create required directory structure
mkdir -p deploy/.next/static

# Copy standalone server output
cp -r .next/standalone/* deploy/

# Copy static assets
cp -r .next/* deploy/.next/

# Copy public assets
cp -r public deploy/

# Create archive
tar -czvf "$ARCHIVE" deploy