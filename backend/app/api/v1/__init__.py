"""
API Version 1 - Router Aggregation

This module aggregates all v1 API routers and provides version management.
"""

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse
import logging

logger = logging.getLogger(__name__)

# Create main v1 router
api_v1_router = APIRouter(prefix="/v1")

# Import existing routers
try:
    from app.api.payments import router as payments_router
    # Include payments router under v1
    api_v1_router.include_router(
        payments_router,
        tags=["v1", "payments"]
    )
    logger.info("V1 Payments router included")
except Exception as e:
    logger.warning(f"Could not import payments router for v1: {e}")

try:
    from app.api.emergency_phones import router as emergency_phones_router
    # Include emergency phones router under v1
    api_v1_router.include_router(
        emergency_phones_router,
        tags=["v1", "emergency"]
    )
    logger.info("V1 Emergency phones router included")
except Exception as e:
    logger.warning(f"Could not import emergency phones router for v1: {e}")

# V1 specific endpoints
@api_v1_router.get(
    "/info",
    tags=["v1", "info"],
    summary="API Version Info",
    description="Información sobre la versión 1 de la API"
)
async def v1_info(request: Request):
    """
    ## API Version 1 Information

    Returns information about API v1 features and deprecation status.

    ### Version Status
    - **Current**: Yes
    - **Stable**: Yes
    - **Deprecated**: No
    - **EOL Date**: TBD

    ### Features
    - Payment processing (PayPal)
    - Emergency phone management
    - User authentication
    - SOS alerts
    - VIP events
    - Subscriptions

    ### Migration
    For future versions, check `/v2/info` when available.
    """
    return JSONResponse({
        "version": "1.0.0",
        "status": "stable",
        "deprecated": False,
        "eol_date": None,
        "features": [
            "payments",
            "emergency_phones",
            "authentication",
            "sos_alerts",
            "vip_events",
            "subscriptions",
            "matching",
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

__all__ = ['api_v1_router']
