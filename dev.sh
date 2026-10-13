#!/bin/sh
# Start the API and the web app together. Ctrl+C stops both.
cd "$(dirname "$0")" || exit 1
trap 'kill 0' EXIT
(cd backend && uv run uvicorn app.main:app --port 8000 --reload --reload-dir app) &
(cd frontend && npm run dev -- --open) &
wait
