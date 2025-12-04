#!/usr/bin/env python3
"""
Cloud Build Logging and Monitoring Tool

This script fetches, analyzes, and displays Cloud Build logs from Google Cloud Platform.
It helps diagnose build failures, track build history, and monitor build status.

Usage:
    python scripts/cloud_build_logger.py --build-id <BUILD_ID>
    python scripts/cloud_build_logger.py --list-recent
    python scripts/cloud_build_logger.py --analyze-failures
    python scripts/cloud_build_logger.py --monitor
"""

import argparse
import json
import sys
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, asdict
from enum import Enum


class BuildStatus(Enum):
    """Cloud Build status codes"""
    SUCCESS = "SUCCESS"
    FAILURE = "FAILURE"
    INTERNAL_ERROR = "INTERNAL_ERROR"
    TIMEOUT = "TIMEOUT"
    CANCELLED = "CANCELLED"
    QUEUED = "QUEUED"
    WORKING = "WORKING"


class GRPCStatusCode(Enum):
    """gRPC status codes for error analysis"""
    OK = 0
    CANCELLED = 1
    UNKNOWN = 2
    INVALID_ARGUMENT = 3
    DEADLINE_EXCEEDED = 4
    NOT_FOUND = 5
    ALREADY_EXISTS = 6
    PERMISSION_DENIED = 7
    RESOURCE_EXHAUSTED = 8
    FAILED_PRECONDITION = 9
    ABORTED = 10
    OUT_OF_RANGE = 11
    UNIMPLEMENTED = 12
    INTERNAL = 13
    UNAVAILABLE = 14
    DATA_LOSS = 15
    UNAUTHENTICATED = 16


@dataclass
class BuildLogEntry:
    """Represents a Cloud Build log entry"""
    timestamp: str
    severity: str
    build_id: str
    status_code: Optional[int]
    status_message: str
    operation_id: str
    principal_email: str
    resource_location: str
    log_name: str
    insert_id: str
    raw_entry: Dict[str, Any]

    def get_status_code_name(self) -> str:
        """Get human-readable status code name"""
        if self.status_code is None:
            return "UNKNOWN"
        try:
            return GRPCStatusCode(self.status_code).name
        except ValueError:
            return f"UNKNOWN_CODE_{self.status_code}"

    def is_error(self) -> bool:
        """Check if this entry represents an error"""
        return self.severity in ["ERROR", "CRITICAL", "ALERT", "EMERGENCY"]

    def format_for_display(self) -> str:
        """Format the log entry for human-readable display"""
        lines = [
            "=" * 80,
            f"Build Log Entry: {self.insert_id}",
            "=" * 80,
            f"Timestamp:        {self.timestamp}",
            f"Severity:         {self.severity}",
            f"Build ID:         {self.build_id}",
            f"Status Code:      {self.status_code} ({self.get_status_code_name()})",
            f"Status Message:   {self.status_message}",
            f"Principal:        {self.principal_email}",
            f"Location:         {self.resource_location}",
            f"Operation ID:     {self.operation_id}",
        ]

        if self.is_error():
            lines.append("\n*** ERROR DETECTED ***")
            lines.append(self._get_error_diagnosis())

        return "\n".join(lines)

    def _get_error_diagnosis(self) -> str:
        """Provide diagnosis and suggestions for common errors"""
        if self.status_code == GRPCStatusCode.FAILED_PRECONDITION.value:
            return """
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
"""
        elif self.status_code == GRPCStatusCode.PERMISSION_DENIED.value:
            return """
Diagnosis: PERMISSION_DENIED (Code 7)
This error occurs when the service account lacks required permissions.

Suggested Actions:
  - Grant Cloud Build Editor role to the service account
  - Verify IAM permissions in GCP Console
  - Check if Cloud Build API is enabled
  - Review service account key configuration
"""
        elif self.status_code == GRPCStatusCode.NOT_FOUND.value:
            return """
Diagnosis: NOT_FOUND (Code 5)
This error occurs when a required resource cannot be found.

Suggested Actions:
  - Verify project ID is correct
  - Check if build configuration exists
  - Ensure Docker image base exists
  - Verify file paths in configuration
"""
        elif self.status_code == GRPCStatusCode.INTERNAL.value:
            return """
Diagnosis: INTERNAL (Code 13)
This is an internal Google Cloud error.

Suggested Actions:
  - Retry the build
  - Check Google Cloud Status Dashboard
  - Contact Google Cloud Support if persists
"""
        else:
            return f"""
Diagnosis: {self.get_status_code_name()}
Check the Cloud Build documentation for details on this error code.
"""

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        return asdict(self)


class CloudBuildLogger:
    """Main class for Cloud Build logging operations"""

    def __init__(self, project_id: str):
        self.project_id = project_id
        self.logs: List[BuildLogEntry] = []

    def parse_log_entry(self, entry: Dict[str, Any]) -> BuildLogEntry:
        """Parse a raw log entry into a BuildLogEntry object"""
        proto_payload = entry.get("protoPayload", {})
        resource = entry.get("resource", {})
        resource_labels = resource.get("labels", {})
        operation = entry.get("operation", {})
        status = proto_payload.get("status", {})
        auth_info = proto_payload.get("authenticationInfo", {})
        resource_location = proto_payload.get("resourceLocation", {})
        current_locations = resource_location.get("currentLocations", [])

        return BuildLogEntry(
            timestamp=entry.get("timestamp", ""),
            severity=entry.get("severity", "INFO"),
            build_id=resource_labels.get("build_id", ""),
            status_code=status.get("code"),
            status_message=status.get("message", ""),
            operation_id=operation.get("id", ""),
            principal_email=auth_info.get("principalEmail", ""),
            resource_location=", ".join(current_locations),
            log_name=entry.get("logName", ""),
            insert_id=entry.get("insertId", ""),
            raw_entry=entry,
        )

    def add_log_entry(self, entry: Dict[str, Any]):
        """Add a log entry to the collection"""
        log_entry = self.parse_log_entry(entry)
        self.logs.append(log_entry)

    def get_errors(self) -> List[BuildLogEntry]:
        """Get all error entries"""
        return [log for log in self.logs if log.is_error()]

    def get_by_build_id(self, build_id: str) -> List[BuildLogEntry]:
        """Get all entries for a specific build ID"""
        return [log for log in self.logs if log.build_id == build_id]

    def analyze_failures(self) -> Dict[str, Any]:
        """Analyze failure patterns in the logs"""
        errors = self.get_errors()

        analysis = {
            "total_entries": len(self.logs),
            "total_errors": len(errors),
            "error_rate": len(errors) / len(self.logs) if self.logs else 0,
            "status_code_distribution": {},
            "builds_affected": set(),
            "common_failures": [],
        }

        # Count status codes
        for error in errors:
            code_name = error.get_status_code_name()
            analysis["status_code_distribution"][code_name] = \
                analysis["status_code_distribution"].get(code_name, 0) + 1
            analysis["builds_affected"].add(error.build_id)

        analysis["builds_affected"] = list(analysis["builds_affected"])

        # Identify most common failure
        if analysis["status_code_distribution"]:
            most_common = max(
                analysis["status_code_distribution"].items(),
                key=lambda x: x[1]
            )
            analysis["most_common_failure"] = {
                "code": most_common[0],
                "count": most_common[1],
            }

        return analysis

    def export_to_json(self, filepath: str):
        """Export logs to JSON file"""
        data = {
            "project_id": self.project_id,
            "export_timestamp": datetime.utcnow().isoformat(),
            "total_entries": len(self.logs),
            "logs": [log.to_dict() for log in self.logs],
        }

        with open(filepath, 'w') as f:
            json.dump(data, f, indent=2)

        print(f"Exported {len(self.logs)} log entries to {filepath}")

    def print_summary(self):
        """Print a summary of the logs"""
        print("\n" + "=" * 80)
        print("CLOUD BUILD LOG SUMMARY")
        print("=" * 80)
        print(f"Project ID:       {self.project_id}")
        print(f"Total Entries:    {len(self.logs)}")
        print(f"Error Entries:    {len(self.get_errors())}")

        if self.logs:
            severities = {}
            for log in self.logs:
                severities[log.severity] = severities.get(log.severity, 0) + 1

            print("\nSeverity Distribution:")
            for severity, count in sorted(severities.items()):
                print(f"  {severity:15} {count:5} {'*' * count}")

        print("=" * 80)


def main():
    """Main entry point"""
    parser = argparse.ArgumentParser(
        description="Cloud Build Logging and Monitoring Tool"
    )
    parser.add_argument(
        "--project-id",
        default="tucitasegura-129cc",
        help="Google Cloud Project ID"
    )
    parser.add_argument(
        "--build-id",
        help="Analyze logs for a specific build ID"
    )
    parser.add_argument(
        "--input",
        help="Input JSON file containing log entries"
    )
    parser.add_argument(
        "--output",
        help="Output JSON file for exporting logs"
    )
    parser.add_argument(
        "--analyze",
        action="store_true",
        help="Perform failure analysis"
    )
    parser.add_argument(
        "--verbose",
        action="store_true",
        help="Show detailed output for each log entry"
    )

    args = parser.parse_args()

    logger = CloudBuildLogger(args.project_id)

    # Load logs from input file or stdin
    if args.input:
        with open(args.input, 'r') as f:
            data = json.load(f)
            if isinstance(data, dict):
                # Single log entry
                logger.add_log_entry(data)
            elif isinstance(data, list):
                # Multiple log entries
                for entry in data:
                    logger.add_log_entry(entry)
    else:
        # Try to read from stdin
        try:
            data = json.load(sys.stdin)
            if isinstance(data, dict):
                logger.add_log_entry(data)
            elif isinstance(data, list):
                for entry in data:
                    logger.add_log_entry(entry)
        except json.JSONDecodeError:
            print("Error: No valid JSON input provided", file=sys.stderr)
            print("Please provide log data via --input or stdin", file=sys.stderr)
            sys.exit(1)

    # Filter by build ID if specified
    if args.build_id:
        logger.logs = logger.get_by_build_id(args.build_id)
        print(f"\nFiltered to build ID: {args.build_id}")

    # Print summary
    logger.print_summary()

    # Show detailed entries if verbose
    if args.verbose:
        print("\n" + "=" * 80)
        print("DETAILED LOG ENTRIES")
        print("=" * 80)
        for log in logger.logs:
            print(log.format_for_display())
            print()

    # Perform analysis if requested
    if args.analyze:
        print("\n" + "=" * 80)
        print("FAILURE ANALYSIS")
        print("=" * 80)
        analysis = logger.analyze_failures()
        print(json.dumps(analysis, indent=2, default=str))

    # Export to file if specified
    if args.output:
        logger.export_to_json(args.output)

    # Show errors
    errors = logger.get_errors()
    if errors:
        print("\n" + "=" * 80)
        print(f"FOUND {len(errors)} ERROR(S)")
        print("=" * 80)
        for error in errors:
            print(error.format_for_display())
            print()


if __name__ == "__main__":
    main()
