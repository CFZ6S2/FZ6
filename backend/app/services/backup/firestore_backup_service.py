"""
Firestore Backup Service for TuCitaSegura.
Provides programmatic backup triggers and status monitoring.
"""
import logging
import os
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
import httpx
from google.cloud import storage
from google.cloud import firestore_admin_v1
from google.api_core import exceptions as google_exceptions

logger = logging.getLogger(__name__)


class FirestoreBackupService:
    """Service for Firestore backup operations and monitoring."""

    def __init__(self):
        """Initialize Firestore backup service."""
        self.project_id = os.getenv('FIREBASE_PROJECT_ID')
        self.bucket_name = f"{self.project_id}-backups" if self.project_id else None
        self.initialized = False

        if not self.project_id:
            logger.warning("FIREBASE_PROJECT_ID not set - backup service disabled")
            return

        try:
            # Initialize clients
            self.admin_client = firestore_admin_v1.FirestoreAdminClient()
            self.storage_client = storage.Client(project=self.project_id)
            self.initialized = True
            logger.info("Firestore backup service initialized successfully")
        except Exception as e:
            logger.error(f"Error initializing backup service: {e}")
            self.initialized = False

    def _get_database_path(self) -> str:
        """Get the Firestore database path."""
        return f"projects/{self.project_id}/databases/(default)"

    def _get_backup_bucket_uri(self, backup_type: str = "manual") -> str:
        """Get the Cloud Storage bucket URI for backups."""
        timestamp = datetime.utcnow().strftime("%Y%m%d-%H%M%S")
        return f"gs://{self.bucket_name}/backups/{backup_type}/{timestamp}"

    async def trigger_backup(
        self,
        backup_type: str = "manual",
        collection_ids: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """
        Trigger a Firestore backup export.

        Args:
            backup_type: Type of backup (manual, daily, weekly, monthly)
            collection_ids: Optional list of collection IDs to export (None = all)

        Returns:
            Dict with operation details

        Raises:
            Exception: If backup trigger fails
        """
        if not self.initialized:
            raise Exception("Backup service not initialized")

        try:
            database_path = self._get_database_path()
            output_uri = self._get_backup_bucket_uri(backup_type)

            logger.info(f"Triggering {backup_type} backup to {output_uri}")

            # Create export request
            request = firestore_admin_v1.ExportDocumentsRequest(
                name=database_path,
                output_uri_prefix=output_uri,
                collection_ids=collection_ids,  # None exports all collections
            )

            # Trigger export operation
            operation = self.admin_client.export_documents(request=request)

            logger.info(f"Backup operation started: {operation.operation.name}")

            return {
                "success": True,
                "operation_name": operation.operation.name,
                "backup_type": backup_type,
                "output_uri": output_uri,
                "timestamp": datetime.utcnow().isoformat(),
                "collection_ids": collection_ids or "all",
                "status": "in_progress"
            }

        except google_exceptions.GoogleAPIError as e:
            logger.error(f"Google API error triggering backup: {e}")
            raise Exception(f"Failed to trigger backup: {str(e)}")
        except Exception as e:
            logger.error(f"Error triggering backup: {e}")
            raise

    async def get_operation_status(self, operation_name: str) -> Dict[str, Any]:
        """
        Get the status of a backup operation.

        Args:
            operation_name: The operation name from trigger_backup

        Returns:
            Dict with operation status
        """
        if not self.initialized:
            raise Exception("Backup service not initialized")

        try:
            # Get operation details
            operation = self.admin_client.get_operation(name=operation_name)

            done = operation.done
            error = None

            if operation.error.message:
                error = operation.error.message

            return {
                "operation_name": operation_name,
                "done": done,
                "error": error,
                "status": "completed" if done and not error else
                         "failed" if error else "in_progress"
            }

        except Exception as e:
            logger.error(f"Error getting operation status: {e}")
            return {
                "operation_name": operation_name,
                "error": str(e),
                "status": "error"
            }

    async def list_backups(
        self,
        backup_type: Optional[str] = None,
        limit: int = 10
    ) -> Dict[str, Any]:
        """
        List recent backups from Cloud Storage.

        Args:
            backup_type: Filter by backup type (None = all types)
            limit: Maximum number of backups to return

        Returns:
            Dict with backup list and metadata
        """
        if not self.initialized:
            raise Exception("Backup service not initialized")

        try:
            bucket = self.storage_client.bucket(self.bucket_name)

            # List backups
            prefix = f"backups/{backup_type}/" if backup_type else "backups/"
            blobs = bucket.list_blobs(prefix=prefix, delimiter="/")

            # Group by backup folder
            backup_folders = set()
            for blob in blobs:
                # Extract backup folder from path
                parts = blob.name.split("/")
                if len(parts) >= 4:  # backups/type/timestamp/...
                    backup_folder = "/".join(parts[:3])
                    backup_folders.add(backup_folder)

            # Sort by timestamp (most recent first)
            sorted_folders = sorted(backup_folders, reverse=True)[:limit]

            # Get details for each backup
            backups = []
            for folder in sorted_folders:
                parts = folder.split("/")
                backup_type_name = parts[1] if len(parts) > 1 else "unknown"
                timestamp_str = parts[2] if len(parts) > 2 else "unknown"

                # Get metadata if exists
                metadata_path = f"{folder}/metadata.json"
                metadata = None

                try:
                    metadata_blob = bucket.blob(metadata_path)
                    if metadata_blob.exists():
                        import json
                        metadata = json.loads(metadata_blob.download_as_text())
                except Exception as e:
                    logger.warning(f"Could not load metadata for {folder}: {e}")

                # Calculate backup size (sum of all blobs in folder)
                folder_blobs = bucket.list_blobs(prefix=f"{folder}/")
                total_size = sum(blob.size for blob in folder_blobs)

                backups.append({
                    "path": f"gs://{self.bucket_name}/{folder}",
                    "type": backup_type_name,
                    "timestamp": timestamp_str,
                    "size_bytes": total_size,
                    "size_mb": round(total_size / (1024 * 1024), 2),
                    "metadata": metadata
                })

            return {
                "success": True,
                "count": len(backups),
                "backups": backups,
                "bucket": self.bucket_name
            }

        except google_exceptions.NotFound:
            logger.warning(f"Backup bucket not found: {self.bucket_name}")
            return {
                "success": False,
                "error": "Backup bucket not found",
                "count": 0,
                "backups": []
            }
        except Exception as e:
            logger.error(f"Error listing backups: {e}")
            raise

    async def get_backup_health(self) -> Dict[str, Any]:
        """
        Check backup system health.

        Returns:
            Dict with health status and metrics
        """
        try:
            if not self.initialized:
                return {
                    "status": "unhealthy",
                    "error": "Backup service not initialized",
                    "checks": {
                        "service_initialized": False,
                        "bucket_accessible": False,
                        "recent_backup_exists": False
                    }
                }

            checks = {
                "service_initialized": True,
                "bucket_accessible": False,
                "recent_backup_exists": False
            }

            warnings = []
            errors = []

            # Check if bucket exists
            try:
                bucket = self.storage_client.bucket(self.bucket_name)
                bucket.reload()
                checks["bucket_accessible"] = True
            except google_exceptions.NotFound:
                errors.append(f"Backup bucket not found: {self.bucket_name}")
            except Exception as e:
                errors.append(f"Error accessing bucket: {str(e)}")

            # Check for recent backups (within last 48 hours)
            if checks["bucket_accessible"]:
                try:
                    recent_backups = await self.list_backups(limit=5)
                    if recent_backups.get("count", 0) > 0:
                        # Check timestamp of most recent backup
                        latest = recent_backups["backups"][0]
                        timestamp_str = latest["timestamp"]

                        try:
                            # Parse timestamp (format: YYYYMMDD-HHMMSS)
                            backup_time = datetime.strptime(
                                timestamp_str,
                                "%Y%m%d-%H%M%S"
                            )
                            age = datetime.utcnow() - backup_time

                            if age < timedelta(hours=48):
                                checks["recent_backup_exists"] = True
                            else:
                                warnings.append(
                                    f"Latest backup is {age.days} days old"
                                )
                        except ValueError:
                            warnings.append("Could not parse backup timestamp")

                except Exception as e:
                    warnings.append(f"Error checking recent backups: {str(e)}")

            # Determine overall status
            if errors:
                status = "unhealthy"
            elif warnings:
                status = "degraded"
            else:
                status = "healthy"

            return {
                "status": status,
                "checks": checks,
                "warnings": warnings if warnings else None,
                "errors": errors if errors else None,
                "project_id": self.project_id,
                "bucket": self.bucket_name,
                "timestamp": datetime.utcnow().isoformat()
            }

        except Exception as e:
            logger.error(f"Error checking backup health: {e}")
            return {
                "status": "error",
                "error": str(e),
                "timestamp": datetime.utcnow().isoformat()
            }

    async def verify_backup(self, backup_path: str) -> Dict[str, Any]:
        """
        Verify a backup exists and is valid.

        Args:
            backup_path: GCS path to backup (gs://bucket/path)

        Returns:
            Dict with verification results
        """
        if not self.initialized:
            raise Exception("Backup service not initialized")

        try:
            # Parse GCS path
            if not backup_path.startswith("gs://"):
                raise ValueError("Backup path must start with gs://")

            path_parts = backup_path[5:].split("/", 1)
            bucket_name = path_parts[0]
            prefix = path_parts[1] if len(path_parts) > 1 else ""

            # Get bucket
            bucket = self.storage_client.bucket(bucket_name)

            # List all files in backup
            blobs = list(bucket.list_blobs(prefix=prefix))

            if not blobs:
                return {
                    "valid": False,
                    "error": "No files found in backup path",
                    "file_count": 0
                }

            # Check for required files
            has_metadata = any("overall_export_metadata" in blob.name for blob in blobs)
            has_output_files = any("output-" in blob.name for blob in blobs)

            # Calculate total size
            total_size = sum(blob.size for blob in blobs)

            return {
                "valid": has_metadata and has_output_files,
                "file_count": len(blobs),
                "total_size_bytes": total_size,
                "total_size_mb": round(total_size / (1024 * 1024), 2),
                "has_metadata": has_metadata,
                "has_data_files": has_output_files,
                "files": [blob.name for blob in blobs[:10]]  # First 10 files
            }

        except Exception as e:
            logger.error(f"Error verifying backup: {e}")
            return {
                "valid": False,
                "error": str(e)
            }


# Global instance
firestore_backup_service = FirestoreBackupService()
