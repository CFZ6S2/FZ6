#!/bin/bash

###############################################################################
# Firestore Restore Script
#
# Restores Firestore database from a backup in Cloud Storage
#
# Usage:
#   ./scripts/restore-firestore.sh gs://bucket/backups/daily/20240115-020000
#
# Requirements:
#   - gcloud CLI installed and authenticated
#   - Firestore Admin permissions
#   - Cloud Storage read permissions
#
###############################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Functions
print_header() {
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Main script
print_header "FIRESTORE RESTORE SCRIPT"

# Check arguments
if [ -z "$1" ]; then
    print_error "Usage: $0 <backup-path>"
    echo ""
    echo "Examples:"
    echo "  $0 gs://my-project-backups/backups/daily/20240115-020000"
    echo "  $0 gs://my-project-backups/backups/weekly/20240114-030000"
    echo ""
    exit 1
fi

BACKUP_PATH="$1"

# Validate backup path
if [[ ! "$BACKUP_PATH" =~ ^gs:// ]]; then
    print_error "Backup path must start with gs://"
    exit 1
fi

print_info "Backup path: $BACKUP_PATH"
echo ""

# Get Firebase project ID
print_info "Detecting Firebase project..."

if [ -n "$FIREBASE_PROJECT_ID" ]; then
    PROJECT_ID="$FIREBASE_PROJECT_ID"
    print_success "Using project from environment: $PROJECT_ID"
elif [ -f ".firebaserc" ]; then
    PROJECT_ID=$(cat .firebaserc | grep -oP '"default"\s*:\s*"\K[^"]+')
    print_success "Using project from .firebaserc: $PROJECT_ID"
else
    print_error "Could not detect Firebase project ID"
    echo ""
    echo "Please set FIREBASE_PROJECT_ID environment variable or run from project root."
    exit 1
fi

echo ""

# Confirm with user
print_warning "WARNING: This will restore Firestore database from backup!"
print_warning "This operation will OVERWRITE existing data if there are conflicts."
echo ""
print_info "Project: $PROJECT_ID"
print_info "Backup: $BACKUP_PATH"
echo ""

read -p "Are you sure you want to continue? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    print_info "Restore cancelled."
    exit 0
fi

echo ""

# Verify backup exists
print_header "1. VERIFYING BACKUP"

print_info "Checking if backup exists..."

if ! gsutil ls "$BACKUP_PATH/" > /dev/null 2>&1; then
    print_error "Backup path does not exist or is not accessible"
    exit 1
fi

print_success "Backup path is accessible"

# Check for metadata file
if gsutil ls "$BACKUP_PATH/overall_export_metadata" > /dev/null 2>&1; then
    print_success "Found export metadata file"
else
    print_warning "Export metadata file not found (this may be okay for some backups)"
fi

# List backup contents
print_info "Backup contents:"
gsutil ls -lh "$BACKUP_PATH/" | head -10
echo ""

# Backup size
BACKUP_SIZE=$(gsutil du -sh "$BACKUP_PATH" | awk '{print $1}')
print_info "Backup size: $BACKUP_SIZE"

echo ""

# Create pre-restore backup
print_header "2. CREATE PRE-RESTORE BACKUP"

print_warning "Creating safety backup before restore..."

TIMESTAMP=$(date +%Y%m%d-%H%M%S)
SAFETY_BACKUP="gs://${PROJECT_ID}-backups/backups/pre-restore/${TIMESTAMP}"

print_info "Safety backup path: $SAFETY_BACKUP"

gcloud firestore export "$SAFETY_BACKUP" \
    --project="$PROJECT_ID" \
    --async

print_success "Safety backup initiated (check status with 'gcloud firestore operations list')"
echo ""

# Optional: Wait for safety backup
read -p "Wait for safety backup to complete before restore? (recommended: yes/no): " wait_backup

if [ "$wait_backup" = "yes" ]; then
    print_info "Waiting for safety backup to complete..."

    # Get operation name
    OPERATION=$(gcloud firestore operations list --project="$PROJECT_ID" --filter="done=false" --format="value(name)" | head -1)

    if [ -n "$OPERATION" ]; then
        while true; do
            STATUS=$(gcloud firestore operations describe "$OPERATION" --project="$PROJECT_ID" --format="value(done)" 2>/dev/null || echo "false")

            if [ "$STATUS" = "True" ]; then
                print_success "Safety backup completed!"
                break
            fi

            echo -n "."
            sleep 5
        done
    fi

    echo ""
fi

# Perform restore
print_header "3. RESTORE FIRESTORE DATABASE"

print_warning "Starting Firestore import..."

gcloud firestore import "$BACKUP_PATH" \
    --project="$PROJECT_ID" \
    --async

# Get operation name
RESTORE_OPERATION=$(gcloud firestore operations list --project="$PROJECT_ID" --filter="done=false" --format="value(name)" | head -1)

if [ -z "$RESTORE_OPERATION" ]; then
    print_error "Could not find restore operation"
    exit 1
fi

print_success "Restore operation started: $RESTORE_OPERATION"
print_info "Waiting for restore to complete..."
echo ""

# Wait for restore to complete
MAX_WAIT=3600  # 1 hour
ELAPSED=0
INTERVAL=10

while [ $ELAPSED -lt $MAX_WAIT ]; do
    STATUS=$(gcloud firestore operations describe "$RESTORE_OPERATION" \
        --project="$PROJECT_ID" \
        --format="value(done)" 2>/dev/null || echo "false")

    if [ "$STATUS" = "True" ]; then
        # Check for errors
        ERROR=$(gcloud firestore operations describe "$RESTORE_OPERATION" \
            --project="$PROJECT_ID" \
            --format="value(error.message)" 2>/dev/null || echo "")

        if [ -n "$ERROR" ]; then
            print_error "Restore failed with error:"
            echo "$ERROR"
            exit 1
        fi

        print_success "Restore completed successfully!"
        break
    fi

    echo -n "."
    sleep $INTERVAL
    ELAPSED=$((ELAPSED + INTERVAL))
done

if [ $ELAPSED -ge $MAX_WAIT ]; then
    print_error "Restore timed out after $MAX_WAIT seconds"
    echo ""
    print_info "Check operation status manually:"
    echo "  gcloud firestore operations describe $RESTORE_OPERATION --project=$PROJECT_ID"
    exit 1
fi

echo ""

# Verify restore
print_header "4. VERIFY RESTORE"

print_info "Getting restore operation details..."

gcloud firestore operations describe "$RESTORE_OPERATION" \
    --project="$PROJECT_ID" \
    --format="yaml"

echo ""

# Final summary
print_header "RESTORE COMPLETED"

print_success "Firestore database has been restored!"
echo ""
print_info "Restore summary:"
echo "  • Source: $BACKUP_PATH"
echo "  • Project: $PROJECT_ID"
echo "  • Operation: $RESTORE_OPERATION"
echo "  • Safety backup: $SAFETY_BACKUP"
echo ""
print_warning "Next steps:"
echo "  1. Verify data in Firebase Console"
echo "  2. Run application tests"
echo "  3. Check application functionality"
echo "  4. Monitor for errors"
echo ""
print_info "If you need to rollback, use the safety backup:"
echo "  ./scripts/restore-firestore.sh $SAFETY_BACKUP"
echo ""

print_header "DONE"
