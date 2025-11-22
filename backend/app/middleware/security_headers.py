"""
Security Headers Middleware
Adds essential security headers to all HTTP responses.

Headers Included:
- HSTS (HTTP Strict Transport Security)
- CSP (Content Security Policy)
- X-Frame-Options (Clickjacking protection)
- X-Content-Type-Options (MIME sniffing protection)
- X-XSS-Protection (XSS filter)
- Referrer-Policy (Privacy)
- Permissions-Policy (Feature control)
"""
import os
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response
from typing import Callable
import logging

logger = logging.getLogger(__name__)


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """
    Middleware that adds security headers to all responses.

    Configuration via environment variables:
        ENVIRONMENT: production, staging, or development
        ENABLE_HSTS: Enable HTTP Strict Transport Security (default: true in production)
        HSTS_MAX_AGE: HSTS max-age in seconds (default: 31536000 = 1 year)
        CSP_REPORT_URI: URI for CSP violation reports (optional)
    """

    def __init__(self, app, environment: str = None):
        super().__init__(app)
        self.environment = environment or os.getenv("ENVIRONMENT", "development").lower()

        # HSTS configuration
        self.enable_hsts = os.getenv("ENABLE_HSTS", "true" if self.environment == "production" else "false").lower() == "true"
        self.hsts_max_age = int(os.getenv("HSTS_MAX_AGE", "31536000"))  # 1 year default

        # CSP configuration
        self.csp_report_uri = os.getenv("CSP_REPORT_URI", "")

        logger.info(
            f"Security Headers Middleware initialized - "
            f"Environment: {self.environment}, "
            f"HSTS: {self.enable_hsts}"
        )

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """Add security headers to response."""
        response = await call_next(request)

        # Get headers dict (create if doesn't exist)
        headers = dict(response.headers)

        # 1. HSTS - Force HTTPS (only in production over HTTPS)
        if self.enable_hsts and self.environment == "production":
            headers["Strict-Transport-Security"] = (
                f"max-age={self.hsts_max_age}; "
                "includeSubDomains; "
                "preload"
            )

        # 2. CSP - Content Security Policy
        # Restrict content sources to prevent XSS
        csp_directives = [
            "default-src 'self'",  # Default: only same origin
            "script-src 'self' https://www.google.com https://www.gstatic.com",  # Allow reCAPTCHA
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",  # Inline styles for components
            "font-src 'self' https://fonts.gstatic.com",  # Google Fonts
            "img-src 'self' data: https:",  # Images from same origin, data URIs, and HTTPS
            "connect-src 'self' https://www.google.com https://api.paypal.com https://www.paypal.com",  # API calls
            "frame-src 'self' https://www.google.com https://www.paypal.com",  # iframes (reCAPTCHA, PayPal)
            "object-src 'none'",  # No plugins
            "base-uri 'self'",  # Restrict base tag
            "form-action 'self'",  # Forms can only submit to same origin
            "frame-ancestors 'none'",  # Prevent embedding (same as X-Frame-Options DENY)
            "upgrade-insecure-requests",  # Upgrade HTTP to HTTPS automatically
        ]

        if self.csp_report_uri:
            csp_directives.append(f"report-uri {self.csp_report_uri}")

        headers["Content-Security-Policy"] = "; ".join(csp_directives)

        # 3. X-Frame-Options - Prevent clickjacking
        # Deny embedding in iframes (redundant with CSP frame-ancestors but good for older browsers)
        headers["X-Frame-Options"] = "DENY"

        # 4. X-Content-Type-Options - Prevent MIME sniffing
        # Force browser to respect declared Content-Type
        headers["X-Content-Type-Options"] = "nosniff"

        # 5. X-XSS-Protection - Enable browser XSS filter
        # Modern browsers have this on by default, but good to be explicit
        headers["X-XSS-Protection"] = "1; mode=block"

        # 6. Referrer-Policy - Control referrer information
        # Balance between privacy and functionality
        headers["Referrer-Policy"] = "strict-origin-when-cross-origin"

        # 7. Permissions-Policy (formerly Feature-Policy)
        # Disable unnecessary browser features
        permissions_policy = [
            "geolocation=(self)",  # Allow geolocation from same origin
            "camera=()",  # Disable camera
            "microphone=()",  # Disable microphone
            "payment=(self)",  # Allow payment APIs from same origin
            "usb=()",  # Disable USB
            "magnetometer=()",  # Disable magnetometer
            "gyroscope=()",  # Disable gyroscope
            "accelerometer=()",  # Disable accelerometer
        ]
        headers["Permissions-Policy"] = ", ".join(permissions_policy)

        # 8. X-Permitted-Cross-Domain-Policies
        # Prevent Flash/PDF from loading content cross-domain
        headers["X-Permitted-Cross-Domain-Policies"] = "none"

        # 9. Cache-Control for sensitive endpoints
        # Prevent caching of API responses with sensitive data
        if request.url.path.startswith("/api/"):
            headers["Cache-Control"] = "no-store, no-cache, must-revalidate, private"
            headers["Pragma"] = "no-cache"
            headers["Expires"] = "0"

        # Update response headers
        response.headers.update(headers)

        return response


def get_security_headers_summary() -> dict:
    """
    Get a summary of security headers configuration.
    Useful for debugging and monitoring.

    Returns:
        Dict with current security headers configuration
    """
    environment = os.getenv("ENVIRONMENT", "development").lower()
    enable_hsts = os.getenv("ENABLE_HSTS", "true" if environment == "production" else "false").lower() == "true"

    return {
        "environment": environment,
        "hsts_enabled": enable_hsts,
        "hsts_max_age": int(os.getenv("HSTS_MAX_AGE", "31536000")),
        "csp_report_uri": os.getenv("CSP_REPORT_URI", "not configured"),
        "headers_applied": [
            "Strict-Transport-Security" if enable_hsts else "HSTS disabled (not production)",
            "Content-Security-Policy",
            "X-Frame-Options",
            "X-Content-Type-Options",
            "X-XSS-Protection",
            "Referrer-Policy",
            "Permissions-Policy",
            "X-Permitted-Cross-Domain-Policies",
            "Cache-Control (for /api/* endpoints)"
        ]
    }
