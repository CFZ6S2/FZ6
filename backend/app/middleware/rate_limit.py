"""
TuCitaSegura - Server-Side Rate Limiting Middleware
Protects API endpoints from abuse
"""

from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
import logging

logger = logging.getLogger(__name__)

# Initialize rate limiter
limiter = Limiter(
    key_func=get_remote_address,
    default_limits=["200/hour"],  # Default limit for all endpoints
    storage_uri="memory://",  # Use in-memory storage (consider Redis for production)
    headers_enabled=True  # Add rate limit info to response headers
)

# Custom rate limit exceeded handler
def custom_rate_limit_handler(request, exc: RateLimitExceeded):
    """
    Custom handler for rate limit exceeded errors
    """
    logger.warning(
        f"Rate limit exceeded for IP {get_remote_address(request)} "
        f"on path {request.url.path}"
    )

    return {
        "error": True,
        "status_code": 429,
        "message": "Demasiadas solicitudes. Por favor, intenta más tarde.",
        "detail": f"Límite de {exc.detail} excedido",
        "retry_after": "60 seconds"
    }


# Rate limit configurations for different endpoint types
RATE_LIMITS = {
    "auth": "5/minute",           # Login, register, password reset
    "upload": "10/minute",         # File uploads
    "messaging": "20/minute",      # Send messages
    "search": "30/minute",         # Search users
    "api_general": "100/minute",   # General API calls
    "public": "200/hour"           # Public endpoints
}
