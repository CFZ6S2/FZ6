"""
API Version 1 - Router Aggregation

This module aggregates all v1 API routers and provides version management.
"""

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse
import logging

logger = logging.getLogger(__name__)

api_v1_router = APIRouter(prefix="/v1")

# Import new v1 routers (using relative imports to avoid circular dependency)
try:
    from . import recommendations
    logger.info("V1 Recommendations module imported")
except Exception as e:
    logger.warning(f"Could not import recommendations module: {e}")
    recommendations = None

try:
    from . import validation
    logger.info("V1 Validation module imported")
except Exception as e:
    logger.warning(f"Could not import validation module: {e}")
    validation = None

# V1 specific endpoints
@api_v1_router.get(
    "/info",
    tags=["v1", "info"],
    summary="API Version Info",
    description="Información sobre la versión 1 de la API"
)
async def v1_info(request: Request):
    """
    Returns information about API v1 features and status.
    """
    return JSONResponse({
        "version": "1.0.0",
        "status": "stable",
        "deprecated": False,
        "eol_date": None,
        "features": [
            "authentication",
            "matching",
            "validation",
            "messaging"
        ],
        "base_path": "/v1",
        "documentation": "/docs",
        "health_check": "/health"
    })

@api_v1_router.get(
    "/",
    tags=["v1", "info"],
    summary="API v1 Root",
    description="Root endpoint para API v1"
)
async def v1_root(request: Request):
    """
    ## API v1 Root Endpoint

    Welcome to TuCitaSegura API v1
    """
    return JSONResponse({
        "message": "TuCitaSegura API v1",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/health",
        "info": "/v1/info"
    })

__all__ = ['api_v1_router', 'recommendations', 'validation']
