"""Admin API endpoints for TuCitaSegura."""

from fastapi import APIRouter
from .backups import router as backups_router

# Create admin router
admin_router = APIRouter(prefix="/admin", tags=["admin"])

# Include sub-routers
admin_router.include_router(backups_router, prefix="/backups")

__all__ = ["admin_router"]
