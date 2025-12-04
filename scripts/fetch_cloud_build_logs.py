#!/usr/bin/env python3
"""
Fetch Cloud Build Logs from Google Cloud Logging API

This script uses the Google Cloud Logging API to fetch build logs
and can pipe them directly to the cloud_build_logger.py for analysis.

Usage:
    # Fetch recent logs
    python scripts/fetch_cloud_build_logs.py --recent 24h

    # Fetch specific build
    python scripts/fetch_cloud_build_logs.py --build-id <BUILD_ID>

    # Fetch and analyze
    python scripts/fetch_cloud_build_logs.py --recent 24h | python scripts/cloud_build_logger.py --analyze

Requirements:
    pip install google-cloud-logging
"""

import argparse
import json
import sys
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional

try:
    from google.cloud import logging_v2
    from google.cloud.logging_v2 import types
    LOGGING_AVAILABLE = True
except ImportError:
    LOGGING_AVAILABLE = False
    print("Warning: google-cloud-logging not installed", file=sys.stderr)
    print("Install with: pip install google-cloud-logging", file=sys.stderr)


class CloudBuildLogFetcher:
    """Fetches Cloud Build logs from Google Cloud Logging"""

    def __init__(self, project_id: str):
        if not LOGGING_AVAILABLE:
            raise ImportError(
                "google-cloud-logging is required. "
                "Install with: pip install google-cloud-logging"
            )

        self.project_id = project_id
        self.client = logging_v2.Client(project=project_id)

    def parse_time_range(self, time_str: str) -> datetime:
        """Parse time range strings like '24h', '7d', '1w'"""
        now = datetime.utcnow()

        if time_str.endswith('h'):
            hours = int(time_str[:-1])
            return now - timedelta(hours=hours)
        elif time_str.endswith('d'):
            days = int(time_str[:-1])
            return now - timedelta(days=days)
        elif time_str.endswith('w'):
            weeks = int(time_str[:-1])
            return now - timedelta(weeks=weeks)
        elif time_str.endswith('m'):
            minutes = int(time_str[:-1])
            return now - timedelta(minutes=minutes)
        else:
            raise ValueError(
                f"Invalid time range: {time_str}. "
                "Use format like '24h', '7d', '1w', '30m'"
            )

    def build_filter(
        self,
        build_id: Optional[str] = None,
        since: Optional[datetime] = None,
        severity: Optional[str] = None,
    ) -> str:
        """Build a filter string for Cloud Logging"""
        filters = [
            'resource.type="build"',
            'logName="projects/{}/logs/cloudaudit.googleapis.com%2Factivity"'.format(
                self.project_id
            ),
        ]

        if build_id:
            filters.append(f'resource.labels.build_id="{build_id}"')

        if since:
            timestamp = since.isoformat() + "Z"
            filters.append(f'timestamp>="{timestamp}"')

        if severity:
            filters.append(f'severity={severity}')

        return " AND ".join(filters)

    def fetch_logs(
        self,
        build_id: Optional[str] = None,
        since: Optional[datetime] = None,
        severity: Optional[str] = None,
        limit: int = 100,
    ) -> List[Dict[str, Any]]:
        """Fetch logs from Cloud Logging"""
        filter_str = self.build_filter(
            build_id=build_id,
            since=since,
            severity=severity,
        )

        print(f"Fetching logs with filter: {filter_str}", file=sys.stderr)

        entries = []
        try:
            for entry in self.client.list_entries(
                filter_=filter_str,
                max_results=limit,
                order_by=logging_v2.DESCENDING,
            ):
                # Convert entry to dictionary
                entry_dict = {
                    "logName": entry.log_name,
                    "resource": {
                        "type": entry.resource.type,
                        "labels": dict(entry.resource.labels),
                    },
                    "timestamp": entry.timestamp.isoformat(),
                    "receiveTimestamp": entry.timestamp.isoformat(),
                    "severity": entry.severity,
                    "insertId": entry.insert_id,
                }

                # Add proto payload if present
                if entry.payload:
                    entry_dict["protoPayload"] = self._extract_payload(entry.payload)

                # Add operation if present
                if hasattr(entry, 'operation') and entry.operation:
                    entry_dict["operation"] = {
                        "id": entry.operation.id,
                        "producer": entry.operation.producer,
                        "last": entry.operation.last,
                    }

                entries.append(entry_dict)

        except Exception as e:
            print(f"Error fetching logs: {e}", file=sys.stderr)
            raise

        print(f"Fetched {len(entries)} log entries", file=sys.stderr)
        return entries

    def _extract_payload(self, payload) -> Dict[str, Any]:
        """Extract payload data from log entry"""
        # This is a simplified extraction
        # In production, you'd want more robust handling
        try:
            if hasattr(payload, 'to_dict'):
                return payload.to_dict()
            else:
                return dict(payload)
        except:
            return {"raw": str(payload)}

    def fetch_recent_errors(self, hours: int = 24, limit: int = 50) -> List[Dict[str, Any]]:
        """Fetch recent error logs"""
        since = datetime.utcnow() - timedelta(hours=hours)
        return self.fetch_logs(
            since=since,
            severity="ERROR",
            limit=limit,
        )

    def fetch_build_logs(self, build_id: str, limit: int = 100) -> List[Dict[str, Any]]:
        """Fetch all logs for a specific build"""
        return self.fetch_logs(build_id=build_id, limit=limit)


def main():
    """Main entry point"""
    parser = argparse.ArgumentParser(
        description="Fetch Cloud Build logs from Google Cloud Logging"
    )
    parser.add_argument(
        "--project-id",
        default="tucitasegura-129cc",
        help="Google Cloud Project ID"
    )
    parser.add_argument(
        "--build-id",
        help="Fetch logs for a specific build ID"
    )
    parser.add_argument(
        "--recent",
        help="Fetch logs from the recent time period (e.g., '24h', '7d', '1w')"
    )
    parser.add_argument(
        "--severity",
        choices=["ERROR", "WARNING", "INFO", "DEBUG"],
        help="Filter by severity level"
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=100,
        help="Maximum number of log entries to fetch"
    )
    parser.add_argument(
        "--output",
        help="Output file (default: stdout)"
    )
    parser.add_argument(
        "--errors-only",
        action="store_true",
        help="Fetch only error logs from the last 24 hours"
    )

    args = parser.parse_args()

    if not LOGGING_AVAILABLE:
        print("\nERROR: google-cloud-logging package is not installed", file=sys.stderr)
        print("Install it with: pip install google-cloud-logging\n", file=sys.stderr)
        sys.exit(1)

    fetcher = CloudBuildLogFetcher(args.project_id)

    try:
        # Determine what to fetch
        if args.errors_only:
            logs = fetcher.fetch_recent_errors(hours=24, limit=args.limit)
        elif args.build_id:
            logs = fetcher.fetch_build_logs(args.build_id, limit=args.limit)
        elif args.recent:
            since = fetcher.parse_time_range(args.recent)
            logs = fetcher.fetch_logs(
                since=since,
                severity=args.severity,
                limit=args.limit,
            )
        else:
            # Default: fetch recent logs
            since = datetime.utcnow() - timedelta(hours=24)
            logs = fetcher.fetch_logs(since=since, limit=args.limit)

        # Output results
        output = json.dumps(logs, indent=2)

        if args.output:
            with open(args.output, 'w') as f:
                f.write(output)
            print(f"Logs written to {args.output}", file=sys.stderr)
        else:
            print(output)

    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
