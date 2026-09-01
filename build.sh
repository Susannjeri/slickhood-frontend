#!/bin/sh
set -e

read_production_value() {
  key="$1"
  sed -n "s/^[[:space:]]*${key}[[:space:]]*=[[:space:]]*//p" .env.production | tail -n 1
}

if [ -f .env.production ]; then
  # Production builds must not inherit stale values from a developer shell or
  # .env.local. The checked deployment configuration is authoritative here.
  NEXT_PUBLIC_API_URL="$(read_production_value NEXT_PUBLIC_API_URL)"
  NEXT_PUBLIC_CLIENT_ID="$(read_production_value NEXT_PUBLIC_CLIENT_ID)"
  export NEXT_PUBLIC_API_URL NEXT_PUBLIC_CLIENT_ID
fi

: "${NEXT_PUBLIC_API_URL:?NEXT_PUBLIC_API_URL must be set for a production build}"
: "${NEXT_PUBLIC_CLIENT_ID:?NEXT_PUBLIC_CLIENT_ID must be set for Google Sign-In}"

case "$NEXT_PUBLIC_API_URL" in
  https://*) ;;
  *)
    echo "Refusing to build: NEXT_PUBLIC_API_URL must be an HTTPS production URL." >&2
    exit 1
    ;;
esac

ARCHIVE=deploy.tar.gz

rm -rf deploy

if [ "${SKIP_BUILD:-false}" != "true" ]; then
  rm -rf .next
  # Build in the same exported production environment used for packaging. This
  # prevents an ignored developer .env.local file from overriding public URLs.
  NODE_ENV=production npm run build
elif [ ! -f .next/BUILD_ID ]; then
  echo "Refusing to package: SKIP_BUILD=true but no completed Next.js build exists." >&2
  exit 1
fi

if [ ! -f .next/standalone/server.js ] || [ ! -d .next/standalone/.next ]; then
  echo "Refusing to package: Next.js standalone output is not rooted in this project." >&2
  exit 1
fi

if grep -RqsE --include='*.js' "http://(localhost|127\\.0\\.0\\.1):8080" \
  .next/static/chunks .next/server; then
  echo "Refusing to package a production build containing localhost API URLs." >&2
  exit 1
fi

# NEXT_PUBLIC values are compiled into browser chunks. Checking only server
# routes allows a healthy-looking deployment whose users still post login
# credentials to their own localhost. Require the intended API origin in the
# browser bundle before packaging anything.
if ! grep -RqsF --include='*.js' "$NEXT_PUBLIC_API_URL" .next/static/chunks; then
  echo "Refusing to package: browser bundle does not contain NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL" >&2
  exit 1
fi

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
