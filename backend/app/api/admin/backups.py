"""
Admin API endpoints for Firestore backups.
"""
import logging
from typing import Optional
from fastapi import APIRouter, HTTPException, status, Depends, Query
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from app.services.auth.firebase_auth import firebase_auth_service
from app.services.backup import firestore_backup_service

logger = logging.getLogger(__name__)

router = APIRouter()


class BackupTriggerRequest(BaseModel):
    """Request model for triggering a backup."""
    backup_type: str = Field(
        default="manual",
        description="Type of backup: manual, daily, weekly, monthly"
    )
    collection_ids: Optional[list[str]] = Field(
        default=None,
        description="Optional list of collection IDs to backup (None = all collections)"
    )


class BackupTriggerResponse(BaseModel):
    """Response model for backup trigger."""
    success: bool
    operation_name: str
    backup_type: str
    output_uri: str
    timestamp: str
    status: str
    message: str


class BackupListResponse(BaseModel):
    """Response model for listing backups."""
    success: bool
    count: int
    backups: list[dict]
    bucket: str


class BackupHealthResponse(BaseModel):
    """Response model for backup health check."""
    status: str
    checks: dict
    warnings: Optional[list[str]] = None
    errors: Optional[list[str]] = None
    project_id: str
    bucket: str
    timestamp: str


# Dependency for admin-only access
async def require_admin(authorization: str = Depends()):
    """
    Dependency to require admin authentication.

    Args:
        authorization: Authorization header with Bearer token

    Returns:
        Decoded token if admin

    Raises:
        HTTPException: If not admin
    """
    # Extract token from "Bearer <token>"
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token de autenticación requerido"
        )

    token = authorization.split(" ")[1]

    # Verify token
    decoded_token = await firebase_auth_service.verify_token(token)

    # Verify admin role
    await firebase_auth_service.verify_admin(decoded_token)

    return decoded_token


@router.post(
    "/trigger",
    response_model=BackupTriggerResponse,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Trigger Firestore backup",
    description="Triggers a manual Firestore backup export. Admin only.",
    tags=["admin", "backups"]
)
async def trigger_backup(
    request: BackupTriggerRequest,
    admin_token: dict = Depends(require_admin)
):
    """
    Trigger a Firestore backup export.

    This endpoint triggers an asynchronous export operation.
    Use the operation_name to check status.

    **Admin authentication required.**
    """
    try:
        result = await firestore_backup_service.trigger_backup(
            backup_type=request.backup_type,
            collection_ids=request.collection_ids
        )

        logger.info(
            f"Backup triggered by admin {admin_token.get('uid')}: "
            f"{result['operation_name']}"
        )

        return BackupTriggerResponse(
            success=result["success"],
            operation_name=result["operation_name"],
            backup_type=result["backup_type"],
            output_uri=result["output_uri"],
            timestamp=result["timestamp"],
            status=result["status"],
            message=f"Backup {result['backup_type']} started successfully"
        )

    except Exception as e:
        logger.error(f"Error triggering backup: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al iniciar backup: {str(e)}"
        )


@router.get(
    "/status/{operation_name:path}",
    summary="Get backup operation status",
    description="Gets the status of a backup operation. Admin only.",
    tags=["admin", "backups"]
)
async def get_backup_status(
    operation_name: str,
    admin_token: dict = Depends(require_admin)
):
    """
    Get the status of a backup operation.

    **Admin authentication required.**
    """
    try:
        status_info = await firestore_backup_service.get_operation_status(
            operation_name
        )

        return JSONResponse(content=status_info)

    except Exception as e:
        logger.error(f"Error getting backup status: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al obtener estado del backup: {str(e)}"
        )


@router.get(
    "/list",
    response_model=BackupListResponse,
    summary="List recent backups",
    description="Lists recent backups from Cloud Storage. Admin only.",
    tags=["admin", "backups"]
)
async def list_backups(
    backup_type: Optional[str] = Query(
        None,
        description="Filter by backup type (manual, daily, weekly, monthly)"
    ),
    limit: int = Query(
        10,
        ge=1,
        le=100,
        description="Maximum number of backups to return"
    ),
    admin_token: dict = Depends(require_admin)
):
    """
    List recent backups from Cloud Storage.

    **Admin authentication required.**
    """
    try:
        result = await firestore_backup_service.list_backups(
            backup_type=backup_type,
            limit=limit
        )

        return BackupListResponse(**result)

    except Exception as e:
        logger.error(f"Error listing backups: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al listar backups: {str(e)}"
        )


@router.get(
    "/health",
    response_model=BackupHealthResponse,
    summary="Check backup system health",
    description="Checks the health of the backup system. Admin only.",
    tags=["admin", "backups"]
)
async def check_backup_health(
    admin_token: dict = Depends(require_admin)
):
    """
    Check backup system health.

    Verifies:
    - Backup service is initialized
    - Cloud Storage bucket is accessible
    - Recent backups exist

    **Admin authentication required.**
    """
    try:
        health = await firestore_backup_service.get_backup_health()

        return BackupHealthResponse(**health)

    except Exception as e:
        logger.error(f"Error checking backup health: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al verificar salud del sistema de backups: {str(e)}"
        )


@router.post(
    "/verify",
    summary="Verify backup integrity",
    description="Verifies a backup exists and is valid. Admin only.",
    tags=["admin", "backups"]
)
async def verify_backup(
    backup_path: str = Query(
        ...,
        description="GCS path to backup (gs://bucket/path)"
    ),
    admin_token: dict = Depends(require_admin)
):
    """
    Verify a backup exists and is valid.

    **Admin authentication required.**
    """
    try:
        result = await firestore_backup_service.verify_backup(backup_path)

        return JSONResponse(content=result)

    except Exception as e:
        logger.error(f"Error verifying backup: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al verificar backup: {str(e)}"
        )
