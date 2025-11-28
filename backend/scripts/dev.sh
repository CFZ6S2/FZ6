#!/bin/bash
# Development server script for TuCitaSegura Backend

echo "🚀 Starting TuCitaSegura Backend (Development Mode)"
echo "=================================================="

# Check if virtual environment exists
if [ ! -d "venv" ] && [ ! -d ".venv" ]; then
    echo "⚠️  No virtual environment found. Create one with:"
    echo "   python -m venv venv"
    echo "   source venv/bin/activate"
    echo "   pip install -r requirements.txt"
    exit 1
fi

# Load environment variables
if [ -f ".env" ]; then
    echo "✅ Loading environment variables from .env"
    export $(cat .env | grep -v '^#' | xargs)
else
    echo "⚠️  No .env file found. Copy .env.example to .env and configure it."
    exit 1
fi

# Run development server with hot reload
echo "📍 Server will be available at: http://localhost:${PORT:-8000}"
echo "📚 API Docs: http://localhost:${PORT:-8000}/docs"
echo "📖 ReDoc: http://localhost:${PORT:-8000}/redoc"
echo ""

python -m uvicorn main:app --reload --host ${HOST:-0.0.0.0} --port ${PORT:-8000}
