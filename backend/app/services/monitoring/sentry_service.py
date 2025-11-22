"""
Sentry Integration - Error Tracking and Performance Monitoring

Provides comprehensive error tracking and performance monitoring using Sentry.
"""

import logging
from typing import Optional, Dict, Any
import os

try:
    import sentry_sdk
    from sentry_sdk.integrations.fastapi import FastAPIIntegration
    from sentry_sdk.integrations.logging import LoggingIntegration
    SENTRY_AVAILABLE = True
except ImportError:
    SENTRY_AVAILABLE = False
    sentry_sdk = None

from app.core.config import settings

logger = logging.getLogger(__name__)


class SentryService:
    """
    Sentry service for error tracking and monitoring

    Features:
    - Automatic error tracking
    - Performance monitoring
    - Release tracking
    - Environment tagging
    - User context
    - Custom tags and context
    """

    def __init__(self):
        """Initialize Sentry service"""
        self.initialized = False
        self.dsn = getattr(settings, 'SENTRY_DSN', os.getenv('SENTRY_DSN', ''))
        self.environment = settings.ENVIRONMENT
        self.version = settings.API_VERSION

    def initialize(self) -> bool:
        """
        Initialize Sentry SDK

        Returns:
            True if initialization successful, False otherwise
        """
        if not SENTRY_AVAILABLE:
            logger.warning("Sentry SDK not installed. Install with: pip install sentry-sdk[fastapi]")
            return False

        if not self.dsn or self.dsn == "":
            logger.info("Sentry DSN not configured. Skipping Sentry initialization.")
            return False

        try:
            # Configure logging integration
            sentry_logging = LoggingIntegration(
                level=logging.INFO,  # Capture info and above as breadcrumbs
                event_level=logging.ERROR  # Send errors as events
            )

            # Initialize Sentry
            sentry_sdk.init(
                dsn=self.dsn,
                environment=self.environment,
                release=f"tucitasegura@{self.version}",

                # Integrations
                integrations=[
                    FastAPIIntegration(),
                    sentry_logging
                ],

                # Performance monitoring
                traces_sample_rate=self._get_traces_sample_rate(),

                # Error sampling
                sample_rate=1.0,  # Sample 100% of errors

                # Send default PII (like user IPs)
                send_default_pii=False,  # Disable for privacy

                # Attach stacktrace to messages
                attach_stacktrace=True,

                # Max breadcrumbs
                max_breadcrumbs=50,

                # Before send hook
                before_send=self._before_send,

                # Before breadcrumb hook
                before_breadcrumb=self._before_breadcrumb,
            )

            self.initialized = True
            logger.info(f"Sentry initialized successfully (env: {self.environment}, release: {self.version})")
            return True

        except Exception as e:
            logger.error(f"Failed to initialize Sentry: {e}")
            return False

    def _get_traces_sample_rate(self) -> float:
        """
        Get traces sample rate based on environment

        Returns:
            Sample rate (0.0 to 1.0)
        """
        if self.environment == "production":
            return 0.1  # Sample 10% of transactions in production
        elif self.environment == "staging":
            return 0.5  # Sample 50% in staging
        else:
            return 1.0  # Sample 100% in development

    def _before_send(self, event: Dict[str, Any], hint: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        Hook called before sending event to Sentry

        Allows filtering or modifying events

        Args:
            event: The event data
            hint: Additional context

        Returns:
            Modified event or None to drop the event
        """
        # Filter out specific errors if needed
        if 'exc_info' in hint:
            exc_type, exc_value, tb = hint['exc_info']

            # Don't send certain exceptions
            if exc_type.__name__ in ['HTTPException', 'RequestValidationError']:
                # These are expected errors, not bugs
                return None

        # Add custom tags
        event.setdefault('tags', {}).update({
            'environment': self.environment,
            'version': self.version
        })

        return event

    def _before_breadcrumb(self, crumb: Dict[str, Any], hint: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        Hook called before adding breadcrumb

        Args:
            crumb: The breadcrumb data
            hint: Additional context

        Returns:
            Modified breadcrumb or None to drop it
        """
        # Filter sensitive data from breadcrumbs
        if crumb.get('category') == 'httplib':
            # Remove authorization headers from HTTP breadcrumbs
            if 'data' in crumb and 'headers' in crumb['data']:
                headers = crumb['data']['headers']
                if 'Authorization' in headers:
                    headers['Authorization'] = '[Filtered]'
                if 'Cookie' in headers:
                    headers['Cookie'] = '[Filtered]'

        return crumb

    def capture_exception(self, exception: Exception, **kwargs) -> Optional[str]:
        """
        Capture an exception

        Args:
            exception: The exception to capture
            **kwargs: Additional context (tags, user, etc.)

        Returns:
            Event ID if sent, None otherwise
        """
        if not self.initialized or not SENTRY_AVAILABLE:
            return None

        try:
            # Set scope context
            with sentry_sdk.push_scope() as scope:
                # Add tags
                for key, value in kwargs.get('tags', {}).items():
                    scope.set_tag(key, value)

                # Add user context
                if 'user' in kwargs:
                    scope.set_user(kwargs['user'])

                # Add extra context
                if 'extra' in kwargs:
                    for key, value in kwargs['extra'].items():
                        scope.set_extra(key, value)

                # Capture exception
                event_id = sentry_sdk.capture_exception(exception)
                logger.info(f"Exception captured in Sentry: {event_id}")
                return event_id

        except Exception as e:
            logger.error(f"Failed to capture exception in Sentry: {e}")
            return None

    def capture_message(self, message: str, level: str = "info", **kwargs) -> Optional[str]:
        """
        Capture a message

        Args:
            message: The message to capture
            level: Severity level (debug, info, warning, error, fatal)
            **kwargs: Additional context

        Returns:
            Event ID if sent, None otherwise
        """
        if not self.initialized or not SENTRY_AVAILABLE:
            return None

        try:
            with sentry_sdk.push_scope() as scope:
                # Add context
                for key, value in kwargs.get('tags', {}).items():
                    scope.set_tag(key, value)

                if 'user' in kwargs:
                    scope.set_user(kwargs['user'])

                if 'extra' in kwargs:
                    for key, value in kwargs['extra'].items():
                        scope.set_extra(key, value)

                event_id = sentry_sdk.capture_message(message, level=level)
                return event_id

        except Exception as e:
            logger.error(f"Failed to capture message in Sentry: {e}")
            return None

    def set_user_context(self, user_id: str, email: Optional[str] = None, **kwargs):
        """
        Set user context for error tracking

        Args:
            user_id: User identifier
            email: User email
            **kwargs: Additional user data
        """
        if not self.initialized or not SENTRY_AVAILABLE:
            return

        try:
            sentry_sdk.set_user({
                "id": user_id,
                "email": email,
                **kwargs
            })
        except Exception as e:
            logger.error(f"Failed to set user context: {e}")

    def clear_user_context(self):
        """Clear user context"""
        if not self.initialized or not SENTRY_AVAILABLE:
            return

        try:
            sentry_sdk.set_user(None)
        except Exception as e:
            logger.error(f"Failed to clear user context: {e}")

    def add_breadcrumb(self, message: str, category: str = "default", level: str = "info", **kwargs):
        """
        Add a breadcrumb for debugging

        Args:
            message: Breadcrumb message
            category: Category (e.g., 'http', 'db', 'auth')
            level: Severity level
            **kwargs: Additional data
        """
        if not self.initialized or not SENTRY_AVAILABLE:
            return

        try:
            sentry_sdk.add_breadcrumb(
                message=message,
                category=category,
                level=level,
                data=kwargs
            )
        except Exception as e:
            logger.error(f"Failed to add breadcrumb: {e}")


# Global instance
sentry_service = SentryService()
