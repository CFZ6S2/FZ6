#!/bin/bash
# Railway startup script for TuCitaSegura backend

# Activate virtualenv if it exists
if [ -d "/app/venv" ]; then
    source /app/venv/bin/activate
    echo "Virtualenv activated"
fi

# Set PORT with fallback
PORT=${PORT:-8000}
echo "Starting uvicorn on port $PORT"

# Start uvicorn from current directory (should already be in backend/)
# --proxy-headers: Trust X-Forwarded-* headers from Railway's Envoy proxy
# --forwarded-allow-ips='*': Accept forwarded headers from any IP (Railway proxy)
exec uvicorn main:app --host 0.0.0.0 --port $PORT --proxy-headers --forwarded-allow-ips='*'
