#!/bin/bash
# Railway startup script for TuCitaSegura backend

# Activate virtualenv if it exists
if [ -d "/app/venv" ]; then
    source /app/venv/bin/activate
    echo "Virtualenv activated"
fi

# Set PORT with fallback - ensure it's a number
if [ -z "$PORT" ]; then
    PORT=8000
fi

echo "Starting uvicorn on port $PORT"

# Start uvicorn from current directory (should already be in backend/)
exec uvicorn main:app --host 0.0.0.0 --port "$PORT"
