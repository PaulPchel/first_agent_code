#!/usr/bin/env bash
set -euo pipefail

PORT=8081

if ! command -v ngrok &>/dev/null; then
  echo "Error: ngrok v3+ is required. Install with: brew install ngrok"
  exit 1
fi

ngrok http "$PORT" &>/dev/null &
NGROK_PID=$!
trap "kill $NGROK_PID 2>/dev/null" EXIT

sleep 2

NGROK_URL=$(curl -s http://127.0.0.1:4040/api/tunnels | python3 -c "import sys,json; print(json.load(sys.stdin)['tunnels'][0]['public_url'])" 2>/dev/null)

if [ -z "$NGROK_URL" ]; then
  echo "Error: could not get ngrok URL. Is your authtoken set? Run: ngrok authtoken YOUR_TOKEN"
  exit 1
fi

echo ""
echo "Tunnel active: $NGROK_URL"
echo "QR code will use this URL — scan it with Expo Go as usual."
echo ""

EXPO_PACKAGER_PROXY_URL="$NGROK_URL" npx expo start --port "$PORT"
