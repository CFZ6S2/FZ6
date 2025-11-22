#!/bin/bash
# Railway startup script for TuCitaSegura backend

cd /app/backend
uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}
