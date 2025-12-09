"""Utility functions and helpers."""
from .sanitization import (
    sanitize_html,
    sanitize_rich_text,
    sanitize_url,
    sanitize_phone_number,
    sanitize_email
)
from .structured_logger import (
    StructuredLogger,
    PerformanceTimer,
    create_logger,
    Severity,
    sanitize_object,
    sanitize_value
)
from .app_check_metrics import (
    AppCheckMetrics,
    get_metrics,
    detect_legacy_sdk,
    extract_client_version
)

__all__ = [
    "sanitize_html",
    "sanitize_rich_text",
    "sanitize_url",
    "sanitize_phone_number",
    "sanitize_email",
    "StructuredLogger",
    "PerformanceTimer",
    "create_logger",
    "Severity",
    "sanitize_object",
    "sanitize_value",
    "AppCheckMetrics",
    "get_metrics",
    "detect_legacy_sdk",
    "extract_client_version"
]
