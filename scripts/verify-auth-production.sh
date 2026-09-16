#!/usr/bin/env bash
set -euo pipefail

origin="${1:-https://app.slickhood.com}"
tmp_dir="$(mktemp -d)"
trap 'rm -rf "$tmp_dir"' EXIT

login_status="$(curl --silent --show-error --location --retry 5 --retry-delay 3 \
  --output "$tmp_dir/login.html" --write-out '%{http_code}' "$origin/login")"
test "$login_status" = "200"
grep -qi "sign in" "$tmp_dir/login.html"

unknown_status="$(curl --silent --show-error --retry 3 \
  --header 'Content-Type: application/json' \
  --data '{"email":"auth-contract-probe@example.invalid","password":"NotARealPassword1!"}' \
  --output "$tmp_dir/unknown.json" --write-out '%{http_code}' "$origin/api/auth/login")"
test "$unknown_status" = "401"

malformed_status="$(curl --silent --show-error --retry 3 \
  --header 'Content-Type: application/json' \
  --header "Origin: $origin" \
  --header 'x-slickhood-csrf: browser-session-v1' \
  --data '{"token":"not-a-jwt","refreshToken":"long-but-invalid-refresh-token"}' \
  --output "$tmp_dir/malformed.json" --write-out '%{http_code}' "$origin/browser-session/set-cookie")"
test "$malformed_status" = "400"

hostile_status="$(curl --silent --show-error --retry 3 \
  --header 'Content-Type: application/json' \
  --header 'Origin: https://attacker.example' \
  --header 'x-slickhood-csrf: browser-session-v1' \
  --data '{"token":"not-a-jwt","refreshToken":"long-but-invalid-refresh-token"}' \
  --output "$tmp_dir/hostile.json" --write-out '%{http_code}' "$origin/browser-session/set-cookie")"
test "$hostile_status" = "403"

missing_csrf_status="$(curl --silent --show-error --retry 3 \
  --header 'Content-Type: application/json' \
  --header "Origin: $origin" \
  --data '{}' \
  --output "$tmp_dir/missing-csrf.json" --write-out '%{http_code}' "$origin/browser-session/clear-cookie")"
test "$missing_csrf_status" = "403"

echo "Production authentication smoke checks passed."
