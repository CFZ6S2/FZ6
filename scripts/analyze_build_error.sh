#!/bin/bash
# Quick script to analyze a specific Cloud Build error
# Usage: ./scripts/analyze_build_error.sh <BUILD_ID>

set -e

PROJECT_ID="${GOOGLE_CLOUD_PROJECT:-tucitasegura-129cc}"
BUILD_ID="$1"

if [ -z "$BUILD_ID" ]; then
    echo "Usage: $0 <BUILD_ID>"
    echo ""
    echo "Example: $0 48c5f33d-d65f-4513-9458-a577568cfcc2"
    echo ""
    echo "Or fetch recent errors:"
    echo "  $0 --recent"
    exit 1
fi

if [ "$BUILD_ID" = "--recent" ]; then
    echo "Fetching recent build errors..."
    python3 scripts/fetch_cloud_build_logs.py \
        --project-id "$PROJECT_ID" \
        --errors-only \
        --limit 10 | \
    python3 scripts/cloud_build_logger.py \
        --project-id "$PROJECT_ID" \
        --analyze \
        --verbose
else
    echo "Analyzing build: $BUILD_ID"
    python3 scripts/fetch_cloud_build_logs.py \
        --project-id "$PROJECT_ID" \
        --build-id "$BUILD_ID" | \
    python3 scripts/cloud_build_logger.py \
        --project-id "$PROJECT_ID" \
        --build-id "$BUILD_ID" \
        --analyze \
        --verbose
fi
