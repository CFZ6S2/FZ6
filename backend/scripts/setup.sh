#!/bin/bash
# Setup script for TuCitaSegura Backend development environment

echo "🔧 Setting up TuCitaSegura Backend Development Environment"
echo "==========================================================="

# Check Python version
PYTHON_VERSION=$(python3 --version | cut -d ' ' -f 2)
echo "📍 Python version: $PYTHON_VERSION"

# Create virtual environment
if [ ! -d "venv" ]; then
    echo "📦 Creating virtual environment..."
    python3 -m venv venv
    echo "✅ Virtual environment created"
else
    echo "✅ Virtual environment already exists"
fi

# Activate virtual environment
echo "🔌 Activating virtual environment..."
source venv/bin/activate

# Upgrade pip
echo "⬆️  Upgrading pip..."
pip install --upgrade pip

# Install dependencies
echo "📥 Installing dependencies..."
pip install -r requirements.txt

# Copy environment file if it doesn't exist
if [ ! -f ".env" ]; then
    echo "📝 Creating .env file from template..."
    cp .env.example .env
    echo "⚠️  Please edit .env and add your configuration"
else
    echo "✅ .env file already exists"
fi

# Create necessary directories
echo "📁 Creating necessary directories..."
mkdir -p logs
mkdir -p uploads
mkdir -p models
mkdir -p backups

echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Activate virtual environment: source venv/bin/activate"
echo "2. Configure .env file with your settings"
echo "3. Run development server: ./scripts/dev.sh"
echo "4. Run tests: ./scripts/test.sh"
