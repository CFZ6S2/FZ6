#!/bin/bash
# Code linting script for TuCitaSegura Backend

echo "🔍 Linting TuCitaSegura Backend Code"
echo "====================================="

ERRORS=0

# Check if tools are installed
if ! command -v pylint &> /dev/null; then
    echo "⚠️  pylint not found. Install it with: pip install pylint"
    ERRORS=$((ERRORS+1))
fi

if ! command -v black &> /dev/null; then
    echo "⚠️  black not found. Install it with: pip install black"
    ERRORS=$((ERRORS+1))
fi

if ! command -v isort &> /dev/null; then
    echo "⚠️  isort not found. Install it with: pip install isort"
    ERRORS=$((ERRORS+1))
fi

if [ $ERRORS -gt 0 ]; then
    echo ""
    echo "Install missing tools with: pip install -r requirements.txt"
    exit 1
fi

echo ""
echo "1️⃣  Running isort check..."
isort app/ tests/ --check-only --profile black
ISORT_EXIT=$?

echo ""
echo "2️⃣  Running black check..."
black app/ tests/ --check --line-length 100
BLACK_EXIT=$?

echo ""
echo "3️⃣  Running pylint..."
pylint app/ --fail-under=8.0
PYLINT_EXIT=$?

echo ""
echo "================================"
if [ $ISORT_EXIT -eq 0 ] && [ $BLACK_EXIT -eq 0 ] && [ $PYLINT_EXIT -eq 0 ]; then
    echo "✅ All linting checks passed!"
    exit 0
else
    echo "❌ Some linting checks failed:"
    [ $ISORT_EXIT -ne 0 ] && echo "   - isort: FAILED"
    [ $BLACK_EXIT -ne 0 ] && echo "   - black: FAILED"
    [ $PYLINT_EXIT -ne 0 ] && echo "   - pylint: FAILED"
    echo ""
    echo "Run ./scripts/format.sh to auto-fix formatting issues"
    exit 1
fi
