# Cloud Build Logging Scripts

This directory contains tools for fetching, analyzing, and monitoring Cloud Build logs from Google Cloud Platform.

## Quick Start

### Analyze the Example Error

```bash
# Analyze the example error from your build
cat scripts/example_error_analysis.json | python scripts/cloud_build_logger.py --analyze --verbose
```

This will show:
- Detailed error information
- Status code explanation (Code 9 = FAILED_PRECONDITION)
- Diagnostic suggestions
- Recommended actions

### Fetch Recent Build Errors

```bash
# First, install dependencies
pip install google-cloud-logging

# Fetch and analyze recent errors
python scripts/fetch_cloud_build_logs.py --errors-only | \
  python scripts/cloud_build_logger.py --analyze --verbose
```

### Analyze Specific Build

```bash
# Using the convenience script
./scripts/analyze_build_error.sh 48c5f33d-d65f-4513-9458-a577568cfcc2

# Or manually
python scripts/fetch_cloud_build_logs.py --build-id 48c5f33d-d65f-4513-9458-a577568cfcc2 | \
  python scripts/cloud_build_logger.py --analyze --verbose
```

## Scripts Overview

### 1. `cloud_build_logger.py`

**Purpose:** Parse and analyze Cloud Build log entries

**Features:**
- Parse structured log entries
- Identify error patterns
- Provide diagnostic suggestions
- Export to JSON
- Generate summaries

**Usage:**
```bash
# From stdin
cat log.json | python scripts/cloud_build_logger.py --verbose

# From file
python scripts/cloud_build_logger.py --input logs.json --analyze

# With filtering
python scripts/cloud_build_logger.py --input logs.json --build-id <ID> --verbose

# Export results
python scripts/cloud_build_logger.py --input logs.json --output analyzed.json
```

**Options:**
- `--project-id`: Google Cloud Project ID (default: tucitasegura-129cc)
- `--build-id`: Filter by specific build ID
- `--input`: Input JSON file
- `--output`: Output JSON file
- `--analyze`: Perform failure analysis
- `--verbose`: Show detailed output

### 2. `fetch_cloud_build_logs.py`

**Purpose:** Fetch logs from Google Cloud Logging API

**Prerequisites:**
```bash
pip install google-cloud-logging
```

**Authentication:**
Ensure you have valid GCP credentials:
```bash
gcloud auth application-default login
```

**Usage:**
```bash
# Fetch recent errors
python scripts/fetch_cloud_build_logs.py --errors-only

# Fetch specific build
python scripts/fetch_cloud_build_logs.py --build-id <BUILD_ID>

# Fetch from time range
python scripts/fetch_cloud_build_logs.py --recent 24h
python scripts/fetch_cloud_build_logs.py --recent 7d

# Filter by severity
python scripts/fetch_cloud_build_logs.py --recent 24h --severity ERROR

# Save to file
python scripts/fetch_cloud_build_logs.py --recent 24h --output logs.json
```

**Time Range Formats:**
- `30m` - Last 30 minutes
- `24h` - Last 24 hours
- `7d` - Last 7 days
- `1w` - Last week

**Options:**
- `--project-id`: GCP Project ID
- `--build-id`: Specific build ID
- `--recent`: Time range (e.g., '24h', '7d')
- `--severity`: Filter by severity (ERROR, WARNING, INFO, DEBUG)
- `--limit`: Max number of entries (default: 100)
- `--output`: Output file
- `--errors-only`: Fetch only errors from last 24h

### 3. `analyze_build_error.sh`

**Purpose:** Convenience script for quick analysis

**Usage:**
```bash
# Analyze specific build
./scripts/analyze_build_error.sh 48c5f33d-d65f-4513-9458-a577568cfcc2

# Analyze recent errors
./scripts/analyze_build_error.sh --recent
```

## Common Workflows

### 1. Diagnose Current Build Failure

```bash
# Get the build ID from Firebase Console or error message
# Then run:
./scripts/analyze_build_error.sh <BUILD_ID>
```

### 2. Monitor Daily Build Health

```bash
# Create a daily report
python scripts/fetch_cloud_build_logs.py --recent 24h | \
  python scripts/cloud_build_logger.py --analyze > daily_report.txt
```

### 3. Track Specific Error Patterns

```bash
# Fetch logs and filter
python scripts/fetch_cloud_build_logs.py --recent 7d --errors-only | \
  python scripts/cloud_build_logger.py --analyze --verbose | \
  grep "FAILED_PRECONDITION"
```

### 4. Export for Further Analysis

```bash
# Export raw logs
python scripts/fetch_cloud_build_logs.py --recent 24h --output raw_logs.json

# Analyze and export
python scripts/cloud_build_logger.py --input raw_logs.json --output analyzed.json --analyze
```

## Error Code Reference

Common gRPC status codes in Cloud Build logs:

| Code | Name | Description |
|------|------|-------------|
| 0 | OK | Success |
| 7 | PERMISSION_DENIED | IAM permission issue |
| 9 | FAILED_PRECONDITION | Missing config or invalid setup |
| 5 | NOT_FOUND | Resource not found |
| 13 | INTERNAL | Google Cloud internal error |

## Example Output

### Summary Output
```
================================================================================
CLOUD BUILD LOG SUMMARY
================================================================================
Project ID:       tucitasegura-129cc
Total Entries:    5
Error Entries:    1

Severity Distribution:
  ERROR                1 *
  INFO                 4 ****
================================================================================
```

### Detailed Error Analysis
```
================================================================================
Build Log Entry: -ugnns6c3dk
================================================================================
Timestamp:        2025-12-04T03:55:40.699048Z
Severity:         ERROR
Build ID:         48c5f33d-d65f-4513-9458-a577568cfcc2
Status Code:      9 (FAILED_PRECONDITION)
Status Message:
Principal:        service-180656060538@gcp-sa-firebaseapphosting.iam.gserviceaccount.com
Location:         us-east4
Operation ID:     operations/build/tucitasegura-129cc/...

*** ERROR DETECTED ***

Diagnosis: FAILED_PRECONDITION (Code 9)
This error typically occurs when:
  1. Missing apphosting.yaml configuration file
  2. Invalid build configuration
  3. Missing required environment variables
  4. Service account lacks necessary permissions
  5. Build triggers are misconfigured

Suggested Actions:
  - Verify apphosting.yaml exists in repository root
  - Check Dockerfile exists and is valid
  - Verify service account has cloudbuild.builds.create permission
  - Review build configuration for missing fields
  - Check Cloud Build API is enabled
```

## Troubleshooting

### Issue: "google-cloud-logging not installed"

```bash
pip install google-cloud-logging
```

### Issue: Authentication failed

```bash
# Login with gcloud
gcloud auth application-default login

# Or set service account key
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/key.json"
```

### Issue: No logs returned

Check:
1. Project ID is correct
2. Build ID exists
3. Time range includes the build
4. You have permissions to view logs

```bash
# Verify project
gcloud config get-value project

# Check permissions
gcloud projects get-iam-policy tucitasegura-129cc
```

## Integration Examples

### GitHub Actions

```yaml
- name: Check Build Errors
  run: |
    pip install google-cloud-logging
    python scripts/fetch_cloud_build_logs.py --errors-only | \
      python scripts/cloud_build_logger.py --analyze --verbose
```

### Cron Job (Daily Reports)

```bash
# Add to crontab
0 9 * * * cd /path/to/FZ6 && python scripts/fetch_cloud_build_logs.py --recent 24h | \
  python scripts/cloud_build_logger.py --analyze > /var/log/build_report_$(date +\%Y\%m\%d).txt
```

## Further Reading

- [Cloud Build Logging Guide](../CLOUD_BUILD_LOGGING.md) - Comprehensive documentation
- [Google Cloud Build Docs](https://cloud.google.com/build/docs)
- [Cloud Logging API](https://cloud.google.com/logging/docs/reference/v2/rest)
