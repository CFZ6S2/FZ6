#!/bin/bash
# Code formatting script for TuCitaSegura Backend

echo "🎨 Formatting TuCitaSegura Backend Code"
echo "========================================"

# Check if black and isort are installed
if ! command -v black &> /dev/null; then
    echo "❌ black not found. Install it with: pip install black"
    exit 1
fi

if ! command -v isort &> /dev/null; then
    echo "❌ isort not found. Install it with: pip install isort"
    exit 1
fi

# Run isort to sort imports
echo "📦 Sorting imports with isort..."
isort app/ tests/ --profile black

# Run black to format code
echo "🖤 Formatting code with black..."
black app/ tests/ --line-length 100

echo "✅ Code formatting complete!"
