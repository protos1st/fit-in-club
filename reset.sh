#!/usr/bin/env bash
# reset.sh — wipe local dev state and start fresh.
#
# Run this from the project root (the folder that contains server/ and client/):
#   bash reset.sh
#
# What it does:
#   1. Removes node_modules + lockfiles in server/ and client/
#   2. Deletes the old SQLite database (data/gym.db + WAL files)
#   3. Regenerates server/.env and client/.env from the .env.example files,
#      with a brand new random JWT_SECRET (so any old login tokens stop working)
#   4. Runs npm install in both folders
#
# It does NOT start the servers — run those yourself in two terminals afterwards:
#   cd server && npm run dev
#   cd client && npm run dev   (in a second terminal)

set -euo pipefail

if [ ! -d "server" ] || [ ! -d "client" ]; then
  echo "Error: run this from the project root (the folder containing server/ and client/)."
  exit 1
fi

echo "== 1/4  Removing node_modules and lockfiles =="
rm -rf server/node_modules server/package-lock.json
rm -rf client/node_modules client/package-lock.json
echo "done"
echo

echo "== 2/4  Removing old database =="
rm -f server/data/gym.db server/data/gym.db-shm server/data/gym.db-wal
echo "done (a fresh gym.db will be created automatically on next server start)"
echo

echo "== 3/4  Regenerating .env files =="

JWT_SECRET="$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))" 2>/dev/null || openssl rand -hex 32)"

# Preserve an existing GYM_SIGNUP_CODE if one is set, otherwise use the example default.
GYM_SIGNUP_CODE="GYMFIT2026"
if [ -f server/.env ]; then
  EXISTING_CODE="$(grep -E '^GYM_SIGNUP_CODE=' server/.env | head -1 | cut -d'=' -f2- || true)"
  if [ -n "${EXISTING_CODE:-}" ]; then
    GYM_SIGNUP_CODE="$EXISTING_CODE"
  fi
fi

cat > server/.env << EOF
PORT=4000
JWT_SECRET=$JWT_SECRET
GYM_SIGNUP_CODE=$GYM_SIGNUP_CODE
CLIENT_ORIGIN=http://localhost:5173
EOF
echo "wrote server/.env (new random JWT_SECRET, GYM_SIGNUP_CODE=$GYM_SIGNUP_CODE)"

cat > client/.env << EOF
VITE_API_URL=http://localhost:4000
EOF
echo "wrote client/.env"
echo

echo "== 4/4  Installing dependencies =="
echo "-- server --"
(cd server && npm install)
echo "-- client --"
(cd client && npm install)
echo

echo "All done. Old login tokens are now invalid (new JWT_SECRET), so open the app"
echo "in a fresh/incognito tab or clear localStorage to avoid a stale-token redirect."
echo
echo "Next steps, in two separate terminals:"
echo "  cd server && npm run dev"
echo "  cd client && npm run dev"
echo
echo "Then open http://localhost:5173 and sign up with gym code: $GYM_SIGNUP_CODE"
