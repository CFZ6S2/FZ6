# Cloud Build Logging and Monitoring Guide

This guide explains the Cloud Build logging infrastructure for TuCitaSegura and how to diagnose and resolve build failures.

## Table of Contents

1. [Overview](#overview)
2. [Error Analysis](#error-analysis)
3. [Using the Logging Tools](#using-the-logging-tools)
4. [Common Issues and Solutions](#common-issues-and-solutions)
5. [Configuration Files](#configuration-files)
6. [Monitoring Best Practices](#monitoring-best-practices)

## Overview

The Cloud Build logging infrastructure provides:

- **Automated log fetching** from Google Cloud Logging API
- **Error analysis** with diagnostic suggestions
- **Build monitoring** with real-time status tracking
- **Enhanced logging** in Cloud Build configurations

### Architecture

```
Firebase App Hosting → Cloud Build → Container Registry → Cloud Run
                            ↓
                     Cloud Logging API
                            ↓
                    Logging Tools (scripts/)
```

## Error Analysis

### Understanding the Original Error

The error log you encountered had these key indicators:

```json
{
  "protoPayload.status.code": 9,
  "severity": "ERROR",
  "build_id": "48c5f33d-d65f-4513-9458-a577568cfcc2"
}
```

**Status Code 9 = FAILED_PRECONDITION**

This error occurred because Firebase App Hosting couldn't find the `apphosting.yaml` configuration file.

### gRPC Status Codes Reference

| Code | Name | Common Causes |
|------|------|---------------|
| 0 | OK | Successful build |
| 7 | PERMISSION_DENIED | IAM permissions missing |
| 9 | FAILED_PRECONDITION | Missing config, invalid setup |
| 5 | NOT_FOUND | Missing files or resources |
| 13 | INTERNAL | Google Cloud internal error |

## Using the Logging Tools

### 1. Cloud Build Logger

Parses and analyzes Cloud Build log entries.

```bash
# Analyze a specific log entry from JSON
cat error.json | python scripts/cloud_build_logger.py --analyze --verbose

# Analyze from file
python scripts/cloud_build_logger.py --input logs.json --analyze

# Filter by build ID
python scripts/cloud_build_logger.py --input logs.json --build-id <BUILD_ID>

# Export analyzed logs
python scripts/cloud_build_logger.py --input logs.json --output analyzed.json
```

### 2. Fetch Cloud Build Logs

Fetches logs directly from Google Cloud Logging API.

**Prerequisites:**
```bash
pip install google-cloud-logging
```

**Usage:**
```bash
# Fetch recent errors (last 24 hours)
python scripts/fetch_cloud_build_logs.py --errors-only

# Fetch logs for specific build
python scripts/fetch_cloud_build_logs.py --build-id <BUILD_ID>

# Fetch logs from last 7 days
python scripts/fetch_cloud_build_logs.py --recent 7d

# Fetch and analyze
python scripts/fetch_cloud_build_logs.py --recent 24h | \
  python scripts/cloud_build_logger.py --analyze --verbose
```

**Time range formats:**
- `30m` - Last 30 minutes
- `24h` - Last 24 hours
- `7d` - Last 7 days
- `1w` - Last week

### 3. Quick Analysis Script

```bash
# Analyze specific build
./scripts/analyze_build_error.sh <BUILD_ID>

# Analyze recent errors
./scripts/analyze_build_error.sh --recent
```

## Common Issues and Solutions

### Issue 1: FAILED_PRECONDITION (Code 9)

**Symptoms:**
- Build fails immediately
- Error code 9 in logs
- Firebase App Hosting deployment fails

**Diagnosis:**
```bash
# Check for apphosting.yaml
ls -la apphosting.yaml

# Verify Dockerfile exists
ls -la Dockerfile
```

**Solution:**
1. Ensure `apphosting.yaml` exists in repository root
2. Verify `Dockerfile` exists and is valid
3. Check all required environment variables are set
4. Verify Cloud Build API is enabled:
   ```bash
   gcloud services enable cloudbuild.googleapis.com
   ```

### Issue 2: PERMISSION_DENIED (Code 7)

**Symptoms:**
- Build fails with permission error
- Service account errors in logs

**Solution:**
```bash
# Grant Cloud Build permissions
gcloud projects add-iam-policy-binding tucitasegura-129cc \
  --member=serviceAccount:service-180656060538@gcp-sa-firebaseapphosting.iam.gserviceaccount.com \
  --role=roles/cloudbuild.builds.editor

# Enable required APIs
gcloud services enable cloudbuild.googleapis.com
gcloud services enable containerregistry.googleapis.com
gcloud services enable run.googleapis.com
```

### Issue 3: Build Timeout

**Symptoms:**
- Build fails after 10-20 minutes
- DEADLINE_EXCEEDED error

**Solution:**
Update timeout in `apphosting.yaml`:
```yaml
cloudBuildConfig:
  timeout: 1200s  # 20 minutes
```

Or in `backend/cloudbuild.yaml`:
```yaml
options:
  timeout: '1200s'
```

### Issue 4: Out of Memory / Resources

**Symptoms:**
- Build fails during Docker build
- Out of memory errors

**Solution:**
Increase machine type in `apphosting.yaml`:
```yaml
cloudBuildConfig:
  machineType: E2_HIGHCPU_8
  diskSizeGb: 100
```

## Configuration Files

### apphosting.yaml

Main configuration for Firebase App Hosting builds.

**Location:** `/apphosting.yaml`

**Key sections:**
- `runConfig`: Runtime configuration (CPU, memory, scaling)
- `env`: Environment variables
- `cloudBuildConfig`: Build configuration

**Example:**
```yaml
runConfig:
  cpu: 1
  memoryMiB: 512
  maxConcurrency: 100

env:
  - variable: PORT
    value: "8080"
    availability:
      - BUILD
      - RUNTIME

cloudBuildConfig:
  dockerfilePath: "Dockerfile"
  context: "."
  timeout: 1200s
  logging: CLOUD_LOGGING_ONLY
```

### backend/cloudbuild.yaml

Enhanced Cloud Build configuration with detailed logging.

**Location:** `/backend/cloudbuild.yaml`

**Features:**
- Step-by-step logging
- Error validation
- Health checks
- Build tagging
- Substitution variables

**Key improvements:**
1. Pre-build validation (checks Dockerfile exists)
2. Detailed logging at each step
3. Post-deployment health check
4. Build metadata (BUILD_ID, timestamps)

### Dockerfile

Root Dockerfile for Firebase App Hosting.

**Location:** `/Dockerfile`

Builds the FastAPI backend from the `backend/` directory.

## Monitoring Best Practices

### 1. Set Up Alerts

Create alerts for build failures in Google Cloud Console:

1. Go to **Monitoring > Alerting**
2. Create alert policy
3. Set condition: Cloud Build logs with severity ERROR
4. Add notification channel (email, Slack, etc.)

### 2. Regular Log Reviews

```bash
# Weekly error summary
python scripts/fetch_cloud_build_logs.py --recent 7d --errors-only | \
  python scripts/cloud_build_logger.py --analyze > weekly_report.txt
```

### 3. Monitor Build Duration

Track builds taking longer than expected:

```bash
# List recent builds sorted by duration
gcloud builds list \
  --project=tucitasegura-129cc \
  --limit=10 \
  --sort-by=~createTime
```

### 4. Check Build History

```bash
# View build history in GCP Console
gcloud builds list --project=tucitasegura-129cc --limit=20

# Get specific build details
gcloud builds describe <BUILD_ID> --project=tucitasegura-129cc
```

### 5. Enable Build Notifications

Configure Cloud Build to send notifications:

```bash
# Enable Pub/Sub notifications
gcloud projects add-iam-policy-binding tucitasegura-129cc \
  --member=serviceAccount:service-180656060538@gcp-sa-firebaseapphosting.iam.gserviceaccount.com \
  --role=roles/pubsub.publisher
```

## Troubleshooting Workflow

When a build fails, follow this workflow:

1. **Get Build ID** from Firebase Console or error notification
2. **Fetch Logs:**
   ```bash
   ./scripts/analyze_build_error.sh <BUILD_ID>
   ```
3. **Review Analysis** - Check the error diagnosis and suggestions
4. **Apply Fix** - Implement the recommended solution
5. **Verify** - Trigger a new build and monitor
6. **Document** - Add notes if it's a new issue type

## Advanced Usage

### Creating Custom Filters

```python
# Custom filter for specific error patterns
python scripts/fetch_cloud_build_logs.py --recent 24h | \
  python -c "
import sys, json
logs = json.load(sys.stdin)
filtered = [l for l in logs if 'Dockerfile' in str(l)]
print(json.dumps(filtered, indent=2))
" | python scripts/cloud_build_logger.py --analyze
```

### Integrating with CI/CD

Add to your CI/CD pipeline:

```yaml
# Example GitHub Actions workflow
- name: Check Cloud Build Status
  run: |
    python scripts/fetch_cloud_build_logs.py --recent 1h --errors-only > errors.json
    if [ -s errors.json ]; then
      echo "Build errors detected!"
      python scripts/cloud_build_logger.py --input errors.json --verbose
      exit 1
    fi
```

### Automated Reports

Create daily reports:

```bash
#!/bin/bash
# daily_build_report.sh

DATE=$(date +%Y-%m-%d)
REPORT_FILE="build_reports/report_${DATE}.txt"

echo "Daily Build Report - ${DATE}" > "$REPORT_FILE"
echo "================================" >> "$REPORT_FILE"

python scripts/fetch_cloud_build_logs.py --recent 24h | \
  python scripts/cloud_build_logger.py --analyze >> "$REPORT_FILE"

# Email or upload report
# mail -s "Cloud Build Report ${DATE}" admin@example.com < "$REPORT_FILE"
```

## Additional Resources

- [Google Cloud Build Documentation](https://cloud.google.com/build/docs)
- [Firebase App Hosting Documentation](https://firebase.google.com/docs/app-hosting)
- [Cloud Logging Documentation](https://cloud.google.com/logging/docs)
- [gRPC Status Codes](https://grpc.github.io/grpc/core/md_doc_statuscodes.html)

## Support

For issues with these tools:
1. Check this documentation first
2. Review error logs with `--verbose` flag
3. Verify Google Cloud permissions
4. Check that all required APIs are enabled

## Contributing

To improve these tools:
1. Add new error patterns to `cloud_build_logger.py`
2. Enhance diagnostic messages
3. Add more automated checks
4. Improve documentation with real examples
