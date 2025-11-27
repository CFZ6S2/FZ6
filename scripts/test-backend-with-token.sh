#!/bin/bash
# Test TuCitaSegura backend with Firebase ID tokens
# Author: Claude
# Date: 2025-11-27

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
BACKEND_URL=${BACKEND_URL:-"http://127.0.0.1:8000"}
REQUEST_ID=$(uuidgen 2>/dev/null || echo "test-$(date +%s)")

echo -e "${BLUE}🧪 TuCitaSegura Backend API Tester${NC}"
echo "===================================="
echo ""

# Function to print section header
print_header() {
    echo ""
    echo -e "${CYAN}▶ $1${NC}"
    echo "----------------------------------------"
}

# Function to test endpoint
test_endpoint() {
    local method=$1
    local endpoint=$2
    local token=$3
    local data=$4
    local description=$5

    echo -e "${YELLOW}Testing:${NC} $method $endpoint"
    echo -e "${YELLOW}Description:${NC} $description"
    echo ""

    if [ -n "$data" ]; then
        response=$(curl -i -X "$method" \
            -H "Authorization: Bearer $token" \
            -H "X-Request-ID: $REQUEST_ID" \
            -H "Content-Type: application/json" \
            -d "$data" \
            "$BACKEND_URL$endpoint" 2>&1)
    else
        response=$(curl -i -X "$method" \
            -H "Authorization: Bearer $token" \
            -H "X-Request-ID: $REQUEST_ID" \
            "$BACKEND_URL$endpoint" 2>&1)
    fi

    # Extract HTTP status
    http_status=$(echo "$response" | grep -E "^HTTP" | tail -1 | awk '{print $2}')

    # Extract body (after empty line)
    body=$(echo "$response" | sed -n '/^$/,$ p' | tail -n +2)

    # Color code the status
    if [[ "$http_status" =~ ^2 ]]; then
        echo -e "${GREEN}✅ Status: $http_status${NC}"
    elif [[ "$http_status" =~ ^4 ]]; then
        echo -e "${YELLOW}⚠️  Status: $http_status${NC}"
    else
        echo -e "${RED}❌ Status: $http_status${NC}"
    fi

    # Pretty print JSON if possible
    if command -v jq &> /dev/null; then
        echo "$body" | jq '.' 2>/dev/null || echo "$body"
    else
        echo "$body"
    fi

    echo ""
    return 0
}

# Main menu
show_menu() {
    echo ""
    echo -e "${CYAN}Select test mode:${NC}"
    echo "1. Test with custom token (from firebase-token-builder.py)"
    echo "2. Test with ID token (paste your own)"
    echo "3. Test without authentication (should fail)"
    echo "4. Run full test suite"
    echo "5. Exit"
    echo ""
    read -p "Choose option (1-5): " choice
    echo ""

    case $choice in
        1) test_with_custom_token ;;
        2) test_with_id_token ;;
        3) test_without_auth ;;
        4) run_full_suite ;;
        5) exit 0 ;;
        *) echo "Invalid option"; show_menu ;;
    esac
}

# Test with custom token
test_with_custom_token() {
    echo -e "${YELLOW}⚠️  Custom tokens must be exchanged for ID tokens first${NC}"
    echo "To get a custom token:"
    echo "  python3 scripts/firebase-token-builder.py generate-token test@example.com"
    echo ""
    echo "Then use the Node.js script to exchange it:"
    echo "  node scripts/get-firebase-id-token.js <custom_token>"
    echo ""
    read -p "Press Enter to return to menu..." dummy
    show_menu
}

# Test with ID token
test_with_id_token() {
    print_header "Testing with Firebase ID Token"

    read -p "Paste your Firebase ID token: " ID_TOKEN

    if [ -z "$ID_TOKEN" ]; then
        echo -e "${RED}❌ Token cannot be empty${NC}"
        show_menu
        return
    fi

    echo ""
    echo -e "${GREEN}Token received (first 50 chars): ${ID_TOKEN:0:50}...${NC}"
    echo ""

    # Test 1: Auth status
    test_endpoint \
        "GET" \
        "/api/v1/auth/status" \
        "$ID_TOKEN" \
        "" \
        "Get authenticated user status"

    # Test 2: Health check
    test_endpoint \
        "GET" \
        "/health" \
        "$ID_TOKEN" \
        "" \
        "Backend health check"

    # Test 3: Profile endpoint (example)
    test_endpoint \
        "GET" \
        "/api/v1/users/profile" \
        "$ID_TOKEN" \
        "" \
        "Get user profile"

    read -p "Press Enter to return to menu..." dummy
    show_menu
}

# Test without authentication
test_without_auth() {
    print_header "Testing without authentication (should fail)"

    # Test 1: Auth status without token
    echo -e "${YELLOW}Testing:${NC} GET /api/v1/auth/status"
    echo -e "${YELLOW}Expected:${NC} 401 Unauthorized"
    echo ""

    response=$(curl -i -X GET \
        -H "X-Request-ID: $REQUEST_ID" \
        "$BACKEND_URL/api/v1/auth/status" 2>&1)

    http_status=$(echo "$response" | grep -E "^HTTP" | tail -1 | awk '{print $2}')

    if [ "$http_status" = "401" ]; then
        echo -e "${GREEN}✅ Correctly rejected: $http_status${NC}"
    else
        echo -e "${RED}❌ Unexpected status: $http_status${NC}"
    fi

    echo ""
    read -p "Press Enter to return to menu..." dummy
    show_menu
}

# Run full test suite
run_full_suite() {
    print_header "Running Full Test Suite"

    read -p "Paste your Firebase ID token: " ID_TOKEN

    if [ -z "$ID_TOKEN" ]; then
        echo -e "${RED}❌ Token cannot be empty${NC}"
        show_menu
        return
    fi

    echo ""

    # Array of endpoints to test
    declare -a endpoints=(
        "GET:/health::Backend health check"
        "GET:/health/detailed::Detailed health check"
        "GET:/security-info::Security configuration"
        "GET:/api/v1/auth/status::User auth status"
        "GET:/api/v1/users/profile::User profile"
    )

    for endpoint_info in "${endpoints[@]}"; do
        IFS=':' read -r method path data desc <<< "$endpoint_info"
        test_endpoint "$method" "$path" "$ID_TOKEN" "$data" "$desc"
        sleep 1
    done

    echo ""
    echo -e "${GREEN}✅ Full test suite completed${NC}"
    echo ""

    read -p "Press Enter to return to menu..." dummy
    show_menu
}

# Check backend connectivity first
print_header "Checking backend connectivity"

if curl -s -f "$BACKEND_URL/health" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Backend is reachable at: $BACKEND_URL${NC}"
else
    echo -e "${RED}❌ Backend not reachable at: $BACKEND_URL${NC}"
    echo ""
    echo "Is the backend running?"
    echo "Start with: cd backend && uvicorn main:app --reload"
    echo ""
    echo "Or change the URL:"
    read -p "Enter backend URL [default: http://127.0.0.1:8000]: " NEW_URL
    if [ -n "$NEW_URL" ]; then
        BACKEND_URL=$NEW_URL
    fi
fi

# Start interactive menu
show_menu
