#!/usr/bin/env sh
set -eu

cd "$(dirname "$0")/.."

echo
echo "PromptLite setup"
echo "================"
echo

if ! command -v python3 >/dev/null 2>&1; then
  echo "python3 was not found. Install Python 3.10 or newer, then run this script again."
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "npm was not found. Install Node.js 18 or newer, then run this script again."
  exit 1
fi

if [ ! -x "backend/.venv/bin/python" ]; then
  echo "Creating Python virtual environment at backend/.venv..."
  python3 -m venv backend/.venv
fi

. backend/.venv/bin/activate

python -m pip install --upgrade pip
python -m pip install -r backend/requirements.txt
npm install

echo
echo "Setup complete."
echo
echo "Next steps:"
echo "  1. Put a supported model folder inside models/, or use the web UI downloader."
echo "  2. Run: bash scripts/start-vps.sh"
echo "  3. Open: http://SERVER_IP:1234"
echo
