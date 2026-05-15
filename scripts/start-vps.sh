#!/usr/bin/env sh
set -eu

cd "$(dirname "$0")/.."

if [ -f ".env" ]; then
  set -a
  . ./.env
  set +a
fi

PROMPTLITE_PYTHON_HOST="${PROMPTLITE_PYTHON_HOST:-127.0.0.1}"
PROMPTLITE_PYTHON_PORT="${PROMPTLITE_PYTHON_PORT:-7861}"
PROMPTLITE_NODE_HOST="${PROMPTLITE_NODE_HOST:-0.0.0.0}"
PROMPTLITE_NODE_PORT="${PROMPTLITE_NODE_PORT:-1234}"
PROMPTLITE_PYTHON_BACKEND_URL="${PROMPTLITE_PYTHON_BACKEND_URL:-http://127.0.0.1:${PROMPTLITE_PYTHON_PORT}}"

export PROMPTLITE_PYTHON_HOST
export PROMPTLITE_PYTHON_PORT
export PROMPTLITE_NODE_HOST
export PROMPTLITE_NODE_PORT
export PROMPTLITE_PYTHON_BACKEND_URL

if [ ! -x "backend/.venv/bin/python" ]; then
  echo "Python virtual environment was not found."
  echo "Run: bash scripts/setup-unix.sh"
  exit 1
fi

if [ ! -d "node_modules" ]; then
  echo "Node dependencies were not found."
  echo "Run: bash scripts/setup-unix.sh"
  exit 1
fi

. backend/.venv/bin/activate

echo
echo "Starting PromptLite..."
echo "UI listen:      http://${PROMPTLITE_NODE_HOST}:${PROMPTLITE_NODE_PORT}"
echo "Backend listen: http://${PROMPTLITE_PYTHON_HOST}:${PROMPTLITE_PYTHON_PORT}"
if [ "${PROMPTLITE_PUBLIC_URL:-}" != "" ]; then
  echo "Public URL:     ${PROMPTLITE_PUBLIC_URL}"
else
  echo "Public URL:     http://SERVER_IP:${PROMPTLITE_NODE_PORT}"
fi
echo

python -m uvicorn backend.main:app --host "$PROMPTLITE_PYTHON_HOST" --port "$PROMPTLITE_PYTHON_PORT" &
BACKEND_PID="$!"

cleanup() {
  if kill -0 "$BACKEND_PID" >/dev/null 2>&1; then
    kill "$BACKEND_PID" >/dev/null 2>&1 || true
  fi
}

trap cleanup INT TERM EXIT

sleep 2
if ! kill -0 "$BACKEND_PID" >/dev/null 2>&1; then
  echo "Python backend stopped during startup. Check the error above."
  exit 1
fi

npm start
