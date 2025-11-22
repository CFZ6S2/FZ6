"""
Health Check Service - TuCitaSegura

Comprehensive health monitoring for all system components:
- Database connections (Firestore)
- External APIs (PayPal, Stripe, reCAPTCHA)
- Firebase services
- System resources
"""

import asyncio
import time
from typing import Dict, Any, Optional
from datetime import datetime
import logging
import httpx

try:
    import firebase_admin
    from firebase_admin import firestore, auth
    FIREBASE_AVAILABLE = True
except ImportError:
    FIREBASE_AVAILABLE = False

from app.core.config import settings

logger = logging.getLogger(__name__)


class HealthStatus:
    """Health status constants"""
    HEALTHY = "healthy"
    DEGRADED = "degraded"
    UNHEALTHY = "unhealthy"
    UNKNOWN = "unknown"


class HealthCheckService:
    """
    Comprehensive health check service

    Checks:
    - Firestore database connectivity
    - Firebase Auth service
    - PayPal API connectivity
    - reCAPTCHA API connectivity
    - System resources
    """

    def __init__(self):
        """Initialize health check service"""
        self.timeout = 5  # seconds
        self.cache_ttl = 30  # Cache health results for 30 seconds
        self._last_check: Optional[Dict[str, Any]] = None
        self._last_check_time: Optional[float] = None

    async def check_all(self, use_cache: bool = True) -> Dict[str, Any]:
        """
        Run all health checks

        Args:
            use_cache: Use cached results if available

        Returns:
            Dict with health status for all components
        """
        # Return cached results if recent enough
        if use_cache and self._last_check and self._last_check_time:
            age = time.time() - self._last_check_time
            if age < self.cache_ttl:
                return self._last_check

        start_time = time.time()

        # Run all checks concurrently
        firestore_check, auth_check, paypal_check, recaptcha_check = await asyncio.gather(
            self.check_firestore(),
            self.check_firebase_auth(),
            self.check_paypal(),
            self.check_recaptcha(),
            return_exceptions=True
        )

        # Process results (handle exceptions)
        def process_result(result, name):
            if isinstance(result, Exception):
                logger.error(f"Health check failed for {name}: {result}")
                return {
                    "status": HealthStatus.UNHEALTHY,
                    "error": str(result),
                    "timestamp": datetime.utcnow().isoformat()
                }
            return result

        firestore_result = process_result(firestore_check, "Firestore")
        auth_result = process_result(auth_check, "Firebase Auth")
        paypal_result = process_result(paypal_check, "PayPal")
        recaptcha_result = process_result(recaptcha_check, "reCAPTCHA")

        # Determine overall status
        statuses = [
            firestore_result["status"],
            auth_result["status"],
            paypal_result["status"],
            recaptcha_result["status"]
        ]

        if all(s == HealthStatus.HEALTHY for s in statuses):
            overall_status = HealthStatus.HEALTHY
        elif any(s == HealthStatus.UNHEALTHY for s in statuses):
            overall_status = HealthStatus.DEGRADED
        else:
            overall_status = HealthStatus.DEGRADED

        elapsed = round((time.time() - start_time) * 1000, 2)

        result = {
            "status": overall_status,
            "timestamp": datetime.utcnow().isoformat(),
            "version": settings.API_VERSION,
            "environment": settings.ENVIRONMENT,
            "checks": {
                "firestore": firestore_result,
                "firebase_auth": auth_result,
                "paypal": paypal_result,
                "recaptcha": recaptcha_result
            },
            "elapsed_ms": elapsed
        }

        # Cache the result
        self._last_check = result
        self._last_check_time = time.time()

        return result

    async def check_firestore(self) -> Dict[str, Any]:
        """
        Check Firestore database connectivity

        Returns:
            Health check result for Firestore
        """
        if not FIREBASE_AVAILABLE:
            return {
                "status": HealthStatus.UNKNOWN,
                "message": "Firebase Admin SDK not available",
                "timestamp": datetime.utcnow().isoformat()
            }

        try:
            start = time.time()

            # Try to read a document (test connection)
            db = firestore.client()

            # Use a test collection
            test_ref = db.collection('_health_check').document('test')

            # Try to set and get
            test_ref.set({'timestamp': datetime.utcnow(), 'test': True})
            doc = test_ref.get()

            # Clean up
            test_ref.delete()

            elapsed = round((time.time() - start) * 1000, 2)

            if doc.exists:
                return {
                    "status": HealthStatus.HEALTHY,
                    "message": "Firestore connection successful",
                    "response_time_ms": elapsed,
                    "timestamp": datetime.utcnow().isoformat()
                }
            else:
                return {
                    "status": HealthStatus.UNHEALTHY,
                    "message": "Could not verify Firestore write",
                    "timestamp": datetime.utcnow().isoformat()
                }

        except Exception as e:
            logger.error(f"Firestore health check failed: {e}")
            return {
                "status": HealthStatus.UNHEALTHY,
                "message": "Firestore connection failed",
                "error": str(e),
                "timestamp": datetime.utcnow().isoformat()
            }

    async def check_firebase_auth(self) -> Dict[str, Any]:
        """
        Check Firebase Auth service

        Returns:
            Health check result for Firebase Auth
        """
        if not FIREBASE_AVAILABLE:
            return {
                "status": HealthStatus.UNKNOWN,
                "message": "Firebase Admin SDK not available",
                "timestamp": datetime.utcnow().isoformat()
            }

        try:
            start = time.time()

            # Try to list users (test connection)
            # Only fetch 1 user to minimize impact
            users_page = auth.list_users(max_results=1)

            elapsed = round((time.time() - start) * 1000, 2)

            return {
                "status": HealthStatus.HEALTHY,
                "message": "Firebase Auth service accessible",
                "response_time_ms": elapsed,
                "timestamp": datetime.utcnow().isoformat()
            }

        except Exception as e:
            logger.error(f"Firebase Auth health check failed: {e}")
            return {
                "status": HealthStatus.UNHEALTHY,
                "message": "Firebase Auth service failed",
                "error": str(e),
                "timestamp": datetime.utcnow().isoformat()
            }

    async def check_paypal(self) -> Dict[str, Any]:
        """
        Check PayPal API connectivity

        Returns:
            Health check result for PayPal
        """
        # If PayPal not configured, skip
        if not hasattr(settings, 'PAYPAL_CLIENT_ID'):
            return {
                "status": HealthStatus.UNKNOWN,
                "message": "PayPal not configured",
                "timestamp": datetime.utcnow().isoformat()
            }

        try:
            start = time.time()

            # Try to reach PayPal API (token endpoint)
            mode = getattr(settings, 'PAYPAL_MODE', 'sandbox')
            base_url = "https://api-m.paypal.com" if mode == "live" else "https://api-m.sandbox.paypal.com"

            async with httpx.AsyncClient(timeout=self.timeout) as client:
                # Just check if the endpoint is reachable (don't authenticate)
                response = await client.get(f"{base_url}/v1/oauth2/token")

                # We expect 401 (unauthorized), which means the endpoint is reachable
                # 200 would mean success, 401 means endpoint works but auth needed
                elapsed = round((time.time() - start) * 1000, 2)

                if response.status_code in [200, 401]:
                    return {
                        "status": HealthStatus.HEALTHY,
                        "message": "PayPal API reachable",
                        "mode": mode,
                        "response_time_ms": elapsed,
                        "timestamp": datetime.utcnow().isoformat()
                    }
                else:
                    return {
                        "status": HealthStatus.DEGRADED,
                        "message": f"PayPal API returned unexpected status: {response.status_code}",
                        "mode": mode,
                        "timestamp": datetime.utcnow().isoformat()
                    }

        except httpx.TimeoutException:
            return {
                "status": HealthStatus.UNHEALTHY,
                "message": "PayPal API timeout",
                "timestamp": datetime.utcnow().isoformat()
            }
        except Exception as e:
            logger.error(f"PayPal health check failed: {e}")
            return {
                "status": HealthStatus.UNHEALTHY,
                "message": "PayPal API unreachable",
                "error": str(e),
                "timestamp": datetime.utcnow().isoformat()
            }

    async def check_recaptcha(self) -> Dict[str, Any]:
        """
        Check reCAPTCHA API connectivity

        Returns:
            Health check result for reCAPTCHA
        """
        # If reCAPTCHA not configured, skip
        if not hasattr(settings, 'RECAPTCHA_SECRET_KEY'):
            return {
                "status": HealthStatus.UNKNOWN,
                "message": "reCAPTCHA not configured",
                "timestamp": datetime.utcnow().isoformat()
            }

        try:
            start = time.time()

            # Try to reach reCAPTCHA API
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                # Just check if endpoint is reachable
                response = await client.post(
                    "https://www.google.com/recaptcha/api/siteverify",
                    data={"secret": "test", "response": "test"}
                )

                elapsed = round((time.time() - start) * 1000, 2)

                # Any response (even error) means the endpoint is reachable
                if response.status_code == 200:
                    return {
                        "status": HealthStatus.HEALTHY,
                        "message": "reCAPTCHA API reachable",
                        "response_time_ms": elapsed,
                        "timestamp": datetime.utcnow().isoformat()
                    }
                else:
                    return {
                        "status": HealthStatus.DEGRADED,
                        "message": f"reCAPTCHA API returned unexpected status: {response.status_code}",
                        "timestamp": datetime.utcnow().isoformat()
                    }

        except httpx.TimeoutException:
            return {
                "status": HealthStatus.UNHEALTHY,
                "message": "reCAPTCHA API timeout",
                "timestamp": datetime.utcnow().isoformat()
            }
        except Exception as e:
            logger.error(f"reCAPTCHA health check failed: {e}")
            return {
                "status": HealthStatus.UNHEALTHY,
                "message": "reCAPTCHA API unreachable",
                "error": str(e),
                "timestamp": datetime.utcnow().isoformat()
            }


# Global instance
health_service = HealthCheckService()
