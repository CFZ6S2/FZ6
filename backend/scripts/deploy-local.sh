#!/bin/bash
# ==============================================================================
# Deploy TuCitaSegura Backend Locally with Docker
# ==============================================================================

set -e  # Exit on error

echo "🐳 Starting TuCitaSegura Backend locally with Docker..."

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker not found. Please install Docker first."
    exit 1
fi

# Check if docker-compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "❌ docker-compose not found. Please install docker-compose first."
    exit 1
fi

# Check if .env exists
if [ ! -f ".env" ]; then
    echo "⚠️  .env file not found. Copying from .env.example..."
    cp .env.example .env
    echo "✏️  Please edit .env with your actual credentials before continuing."
    read -p "Press enter when ready..."
fi

# Stop existing containers
echo "🛑 Stopping existing containers..."
docker-compose down

# Build images
echo "🔨 Building Docker images..."
docker-compose build

# Start services
echo "🚀 Starting services..."
docker-compose up -d

# Wait for services to be healthy
echo "⏳ Waiting for services to be ready..."
sleep 10

# Check service health
echo "🏥 Checking service health..."
docker-compose ps

# Test API
echo "🧪 Testing API..."
sleep 5
curl -f http://localhost:8000/health || echo "⚠️  API not responding yet, please wait..."

echo ""
echo "✅ Backend is running!"
echo ""
echo "Services:"
echo "  API:      http://localhost:8000"
echo "  Docs:     http://localhost:8000/docs"
echo "  ReDoc:    http://localhost:8000/redoc"
echo "  Postgres: localhost:5432"
echo "  Redis:    localhost:6379"
echo "  Flower:   http://localhost:5555"
echo ""
echo "Commands:"
echo "  View logs:     docker-compose logs -f api"
echo "  Stop:          docker-compose down"
echo "  Restart:       docker-compose restart api"
echo "  Shell:         docker-compose exec api bash"
echo ""
