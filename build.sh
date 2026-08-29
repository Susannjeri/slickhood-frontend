#!/bin/sh
set -e

read_production_value() {
  key="$1"
  sed -n "s/^[[:space:]]*${key}[[:space:]]*=[[:space:]]*//p" .env.production | tail -n 1
}

if [ -f .env.production ]; then
  NEXT_PUBLIC_API_URL="${NEXT_PUBLIC_API_URL:-$(read_production_value NEXT_PUBLIC_API_URL)}"
  NEXT_PUBLIC_CLIENT_ID="${NEXT_PUBLIC_CLIENT_ID:-$(read_production_value NEXT_PUBLIC_CLIENT_ID)}"
  export NEXT_PUBLIC_API_URL NEXT_PUBLIC_CLIENT_ID
fi

: "${NEXT_PUBLIC_API_URL:?NEXT_PUBLIC_API_URL must be set for a production build}"
: "${NEXT_PUBLIC_CLIENT_ID:?NEXT_PUBLIC_CLIENT_ID must be set for Google Sign-In}"

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
