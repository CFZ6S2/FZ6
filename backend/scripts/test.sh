#!/bin/bash
# Test runner script for TuCitaSegura Backend

echo "🧪 Running TuCitaSegura Backend Tests"
echo "======================================"

# Parse command line arguments
MODE=${1:-all}
VERBOSE=${2:--v}

case $MODE in
    unit)
        echo "Running unit tests only..."
        pytest tests/ -m unit $VERBOSE
        ;;
    integration)
        echo "Running integration tests only..."
        pytest tests/ -m integration $VERBOSE
        ;;
    api)
        echo "Running API tests only..."
        pytest tests/ -m api $VERBOSE
        ;;
    security)
        echo "Running security tests only..."
        pytest tests/ -m security $VERBOSE
        ;;
    coverage)
        echo "Running tests with coverage report..."
        pytest tests/ --cov=app --cov-report=html --cov-report=term-missing $VERBOSE
        echo ""
        echo "📊 Coverage report generated in htmlcov/index.html"
        ;;
    quick)
        echo "Running quick tests (excluding slow tests)..."
        pytest tests/ -m "not slow" $VERBOSE
        ;;
    all)
        echo "Running all tests with coverage..."
        pytest tests/ $VERBOSE
        ;;
    *)
        echo "Usage: ./scripts/test.sh [unit|integration|api|security|coverage|quick|all] [pytest-args]"
        echo ""
        echo "Examples:"
        echo "  ./scripts/test.sh unit          # Run unit tests only"
        echo "  ./scripts/test.sh coverage      # Run with coverage report"
        echo "  ./scripts/test.sh all -v        # Run all tests verbose"
        exit 1
        ;;
esac
