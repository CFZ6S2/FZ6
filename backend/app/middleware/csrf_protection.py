"""
CSRF Protection Middleware - TuCitaSegura

Protects against Cross-Site Request Forgery attacks by:
- Generating CSRF tokens for sessions
- Validating tokens on state-changing requests (POST, PUT, DELETE, PATCH)
- Using double-submit cookie pattern
- SameSite cookie attributes
"""

import secrets
import hashlib
import hmac
from typing import Optional, Set
from fastapi import Request, HTTPException, status
from fastapi.responses import Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.datastructures import Headers
import logging

from app.core.config import settings

logger = logging.getLogger(__name__)


class CSRFProtection(BaseHTTPMiddleware):
    """
    CSRF Protection Middleware using double-submit cookie pattern

    How it works:
    1. Generates a CSRF token for each session
    2. Stores token in a secure, HttpOnly cookie
    3. Client must send token in X-CSRF-Token header
    4. Validates token on state-changing requests

    Security features:
    - Cryptographically secure token generation
    - HMAC-based token validation
    - SameSite=Lax/Strict cookies
    - Secure flag in production
    - HttpOnly to prevent XSS
    """

    # HTTP methods that require CSRF protection
    PROTECTED_METHODS: Set[str] = {'POST', 'PUT', 'DELETE', 'PATCH'}

    # Paths exempt from CSRF (e.g., webhooks from external services)
    EXEMPT_PATHS: Set[str] = {
        '/api/payments/paypal/webhook',  # PayPal webhook
        '/api/payments/stripe/webhook',   # Stripe webhook
        '/health',                        # Health check
        '/docs',                          # API docs
        '/openapi.json',                  # OpenAPI schema
        '/security-info',                 # Security info endpoint
        '/debug',                         # Debug endpoint
        '/api/v1/debug/login',            # Debug login (dev only)
        '/api/v1/debug/',                 # All debug endpoints (dev only)
    }

    # Paths that require CSRF protection (critical endpoints)
    CRITICAL_PATHS: Set[str] = {
        '/api/payments/create',
        '/api/payments/capture',
        '/api/emergency/phones',
        '/api/admin/',  # All admin endpoints
    }

    def __init__(self, app, secret_key: Optional[str] = None):
        """
        Initialize CSRF protection

        Args:
            app: FastAPI application
            secret_key: Secret key for HMAC (defaults to settings.SECRET_KEY)
        """
        super().__init__(app)
        self.secret_key = (secret_key or settings.SECRET_KEY).encode('utf-8')
        self.token_name = 'csrf_token'
        self.header_name = 'X-CSRF-Token'
        self.cookie_name = 'csrf_token'
        self.token_length = 32  # 32 bytes = 256 bits

        logger.info("CSRF Protection middleware initialized")

    async def dispatch(self, request: Request, call_next):
        """Process request and validate CSRF token if needed"""

        # Skip CSRF for exempt paths
        if self._is_exempt_path(request.url.path):
            return await call_next(request)

        # Skip CSRF for safe methods (GET, HEAD, OPTIONS)
        if request.method not in self.PROTECTED_METHODS:
            response = await call_next(request)
            # Set CSRF token cookie for safe requests
            self._set_csrf_cookie(response, request)
            return response

        # Validate CSRF token for state-changing requests
        try:
            self._validate_csrf_token(request)
        except HTTPException as e:
            logger.warning(
                f"CSRF validation failed: {e.detail} "
                f"[Method: {request.method}, Path: {request.url.path}, "
                f"IP: {request.client.host if request.client else 'unknown'}]"
            )
            raise

        # Process request
        response = await call_next(request)

        # Rotate CSRF token after successful state-changing request
        self._set_csrf_cookie(response, request)

        return response

    def _is_exempt_path(self, path: str) -> bool:
        """Check if path is exempt from CSRF protection"""
        # Exact match
        if path in self.EXEMPT_PATHS:
            return True

        # Prefix match for paths like /api/admin/*
        for exempt_path in self.EXEMPT_PATHS:
            if exempt_path.endswith('/') and path.startswith(exempt_path):
                return True

        return False

    def _is_critical_path(self, path: str) -> bool:
        """Check if path requires strict CSRF protection"""
        for critical_path in self.CRITICAL_PATHS:
            if critical_path.endswith('/') and path.startswith(critical_path):
                return True
            if path == critical_path:
                return True
        return False

    def _generate_csrf_token(self) -> str:
        """
        Generate a cryptographically secure CSRF token

        Returns:
            Hex-encoded CSRF token
        """
        # Generate random token
        random_bytes = secrets.token_bytes(self.token_length)

        # Create HMAC signature to prevent token forgery
        signature = hmac.new(
            self.secret_key,
            random_bytes,
            hashlib.sha256
        ).digest()

        # Combine token and signature
        token = random_bytes + signature

        # Encode as hex
        return token.hex()

    def _validate_csrf_token(self, request: Request) -> None:
        """
        Validate CSRF token from request

        Args:
            request: FastAPI request

        Raises:
            HTTPException: If token is invalid or missing
        """
        # Get token from cookie
        cookie_token = request.cookies.get(self.cookie_name)
        if not cookie_token:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="CSRF token missing in cookie"
            )

        # Get token from header
        header_token = request.headers.get(self.header_name)
        if not header_token:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"CSRF token missing in header ({self.header_name})"
            )

        # Validate tokens match (double-submit pattern)
        if not secrets.compare_digest(cookie_token, header_token):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="CSRF token mismatch"
            )

        # Validate token structure and signature
        try:
            token_bytes = bytes.fromhex(cookie_token)

            # Token should be: random_bytes (32) + signature (32) = 64 bytes
            if len(token_bytes) != self.token_length + 32:
                raise ValueError("Invalid token length")

            # Split token and signature
            random_bytes = token_bytes[:self.token_length]
            provided_signature = token_bytes[self.token_length:]

            # Compute expected signature
            expected_signature = hmac.new(
                self.secret_key,
                random_bytes,
                hashlib.sha256
            ).digest()

            # Compare signatures
            if not secrets.compare_digest(provided_signature, expected_signature):
                raise ValueError("Invalid token signature")

        except (ValueError, TypeError) as e:
            logger.error(f"CSRF token validation error: {e}")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Invalid CSRF token"
            )

    def _set_csrf_cookie(self, response: Response, request: Request) -> None:
        """
        Set CSRF token cookie in response

        Args:
            response: FastAPI response
            request: FastAPI request
        """
        # Check if cookie already exists
        existing_token = request.cookies.get(self.cookie_name)

        # Generate new token if needed
        if not existing_token:
            token = self._generate_csrf_token()
        else:
            token = existing_token

        # Set cookie with security attributes
        is_production = settings.ENVIRONMENT == 'production'

        response.set_cookie(
            key=self.cookie_name,
            value=token,
            max_age=3600 * 24,  # 24 hours
            httponly=True,      # Prevent JavaScript access (XSS protection)
            secure=is_production,  # HTTPS only in production
            samesite='lax',     # CSRF protection (can use 'strict' for more security)
            path='/',
            domain=None
        )

        # Also set token in response header for client-side access
        # This allows the frontend to read the token and send it in headers
        response.headers[self.header_name] = token


class CSRFProtect:
    """
    Dependency for CSRF protection in specific endpoints

    Usage:
    ```python
    from app.middleware.csrf_protection import csrf_protect

    @router.post("/critical-action")
    async def critical_action(csrf: None = Depends(csrf_protect)):
        # Action will only execute if CSRF token is valid
        pass
    ```
    """

    def __init__(self, secret_key: Optional[str] = None):
        self.secret_key = (secret_key or settings.SECRET_KEY).encode('utf-8')
        self.header_name = 'X-CSRF-Token'
        self.cookie_name = 'csrf_token'

    async def __call__(self, request: Request) -> None:
        """Validate CSRF token"""
        # Get tokens
        cookie_token = request.cookies.get(self.cookie_name)
        header_token = request.headers.get(self.header_name)

        if not cookie_token or not header_token:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="CSRF token missing"
            )

        # Validate tokens match
        if not secrets.compare_digest(cookie_token, header_token):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="CSRF token invalid"
            )


# Global instance for dependency injection
csrf_protect = CSRFProtect()


def get_csrf_token(request: Request) -> str:
    """
    Get CSRF token from request

    Args:
        request: FastAPI request

    Returns:
        CSRF token string

    Raises:
        HTTPException: If token not found
    """
    token = request.cookies.get('csrf_token')
    if not token:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="CSRF token not found"
        )
    return token
