"""
Input sanitization utilities to prevent XSS and injection attacks.
"""
import bleach
from typing import Optional, List

# Allowed HTML tags (very restrictive - text only)
ALLOWED_TAGS: List[str] = []  # No HTML allowed by default

# Allowed attributes (none)
ALLOWED_ATTRIBUTES: dict = {}

# Strip everything
STRIP = True


def sanitize_html(text: Optional[str], allow_newlines: bool = True) -> Optional[str]:
    """
    Sanitize HTML content to prevent XSS attacks.

    Removes ALL HTML tags and attributes by default.
    Use this for user-generated content that should be plain text.

    Args:
        text: Input text that may contain HTML
        allow_newlines: Whether to preserve newlines (default: True)

    Returns:
        Sanitized plain text without HTML

    Examples:
        >>> sanitize_html("<script>alert('xss')</script>Hello")
        "Hello"
        >>> sanitize_html("<b>Bold</b> text")
        "Bold text"
        >>> sanitize_html("Normal text")
        "Normal text"
    """
    if text is None:
        return None

    if not isinstance(text, str):
        return str(text)

    # Clean HTML - removes all tags
    cleaned = bleach.clean(
        text,
        tags=ALLOWED_TAGS,
        attributes=ALLOWED_ATTRIBUTES,
        strip=STRIP
    )

    # Optionally preserve newlines
    if not allow_newlines:
        cleaned = cleaned.replace('\n', ' ').replace('\r', '')

    # Remove excessive whitespace
    cleaned = ' '.join(cleaned.split())

    return cleaned.strip()


def sanitize_rich_text(
    text: Optional[str],
    allowed_tags: Optional[List[str]] = None,
    allowed_attributes: Optional[dict] = None
) -> Optional[str]:
    """
    Sanitize rich text with limited HTML tags allowed.

    Use this when you need to allow some formatting (bold, italic, links).
    By default allows: b, i, u, a[href], p, br

    Args:
        text: Input HTML text
        allowed_tags: Custom list of allowed tags (default: ['b', 'i', 'u', 'a', 'p', 'br'])
        allowed_attributes: Custom dict of allowed attributes per tag

    Returns:
        Sanitized HTML with only allowed tags

    Examples:
        >>> sanitize_rich_text("<b>Bold</b> and <script>alert('xss')</script>")
        "<b>Bold</b> and alert('xss')"
    """
    if text is None:
        return None

    if not isinstance(text, str):
        return str(text)

    # Default allowed tags for rich text
    if allowed_tags is None:
        allowed_tags = ['b', 'i', 'u', 'a', 'p', 'br', 'strong', 'em']

    # Default allowed attributes
    if allowed_attributes is None:
        allowed_attributes = {
            'a': ['href', 'title'],
        }

    # Clean HTML - only allows specified tags
    cleaned = bleach.clean(
        text,
        tags=allowed_tags,
        attributes=allowed_attributes,
        strip=True
    )

    return cleaned.strip()


def sanitize_url(url: Optional[str]) -> Optional[str]:
    """
    Sanitize a URL to prevent javascript: and data: schemes.

    Args:
        url: Input URL

    Returns:
        Sanitized URL (http/https only) or None if invalid

    Examples:
        >>> sanitize_url("https://example.com")
        "https://example.com"
        >>> sanitize_url("javascript:alert('xss')")
        None
    """
    if url is None:
        return None

    if not isinstance(url, str):
        return None

    url = url.strip()

    # Block dangerous schemes
    dangerous_schemes = ['javascript:', 'data:', 'vbscript:', 'file:']
    url_lower = url.lower()

    for scheme in dangerous_schemes:
        if url_lower.startswith(scheme):
            return None

    # Only allow http/https
    if not (url_lower.startswith('http://') or url_lower.startswith('https://')):
        return None

    return url


def sanitize_phone_number(phone: Optional[str]) -> Optional[str]:
    """
    Sanitize phone number - removes all except numbers, +, -, (, ), spaces.

    Args:
        phone: Input phone number

    Returns:
        Sanitized phone number

    Examples:
        >>> sanitize_phone_number("+34 (123) 456-789")
        "+34 (123) 456-789"
        >>> sanitize_phone_number("+34<script>alert()</script>123")
        "+34123"
    """
    if phone is None:
        return None

    if not isinstance(phone, str):
        return str(phone)

    # Remove all HTML first
    phone = sanitize_html(phone, allow_newlines=False)

    # Keep only valid phone characters
    allowed_chars = set('0123456789+- ()')
    sanitized = ''.join(c for c in phone if c in allowed_chars)

    return sanitized.strip()


def sanitize_email(email: Optional[str]) -> Optional[str]:
    """
    Basic email sanitization.

    Args:
        email: Input email

    Returns:
        Sanitized email (lowercase, no HTML)

    Examples:
        >>> sanitize_email("User@Example.COM")
        "user@example.com"
    """
    if email is None:
        return None

    if not isinstance(email, str):
        return None

    # Remove HTML
    email = sanitize_html(email, allow_newlines=False)

    # Lowercase and strip
    return email.lower().strip() if email else None
