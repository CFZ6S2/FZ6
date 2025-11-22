"""
Advanced input validators for Pydantic models.

Provides robust validation for:
- Names and aliases
- Phone numbers (international)
- URLs
- Text content (bio, descriptions)
- Geographic data
- Monetary values
"""
import re
import logging
from typing import Optional, List
import phonenumbers
from phonenumbers import NumberParseException
from urllib.parse import urlparse

logger = logging.getLogger(__name__)

# ============================================================================
# Constants
# ============================================================================

# Profanity/inappropriate words (Spanish + English)
PROFANITY_LIST = [
    # Add your profanity list here
    "spam", "scam", "fraud", "fake",
]

# Valid interests whitelist (expandable)
VALID_INTERESTS = [
    "deportes", "música", "cine", "arte", "viajes", "cocina",
    "tecnología", "lectura", "fotografía", "naturaleza", "fitness",
    "gaming", "moda", "diseño", "emprendimiento", "yoga",
    "sports", "music", "movies", "art", "travel", "cooking",
    "technology", "reading", "photography", "nature",
    "fashion", "design", "entrepreneurship"
]

# Valid city names (Spain - expandable)
VALID_CITIES_SPAIN = [
    "Madrid", "Barcelona", "Valencia", "Sevilla", "Zaragoza",
    "Málaga", "Murcia", "Palma", "Las Palmas", "Bilbao",
    "Alicante", "Córdoba", "Valladolid", "Vigo", "Gijón",
    "Hospitalet", "Vitoria", "Granada", "Elche", "Oviedo",
    "Badalona", "Cartagena", "Terrassa", "Jerez", "Sabadell",
    # Add more as needed
]

# URL schemes whitelist
ALLOWED_URL_SCHEMES = ["http", "https"]

# Suspicious URL patterns
SUSPICIOUS_URL_PATTERNS = [
    r"bit\.ly",  # URL shorteners
    r"tinyurl",
    r"goo\.gl",
    r"t\.co",
    r"ow\.ly",
    r"\d+\.\d+\.\d+\.\d+",  # IP addresses
]


# ============================================================================
# Name/Alias Validators
# ============================================================================

def validate_alias(alias: str, min_length: int = 2, max_length: int = 30) -> str:
    """
    Validate user alias/username.

    Rules:
        - 2-30 characters
        - Letters, numbers, spaces, underscore, hyphen only
        - No special characters or emojis
        - No leading/trailing spaces
        - No multiple consecutive spaces

    Args:
        alias: The alias to validate
        min_length: Minimum length (default: 2)
        max_length: Maximum length (default: 30)

    Returns:
        Validated and normalized alias

    Raises:
        ValueError: If alias is invalid

    Example:
        >>> validate_alias("John Doe")
        "John Doe"
        >>> validate_alias("user_123")
        "user_123"
        >>> validate_alias("ab#c")  # raises ValueError
    """
    if not alias:
        raise ValueError("Alias cannot be empty")

    # Remove leading/trailing whitespace
    alias = alias.strip()

    # Check length
    if len(alias) < min_length:
        raise ValueError(f"Alias must be at least {min_length} characters long")

    if len(alias) > max_length:
        raise ValueError(f"Alias must be at most {max_length} characters long")

    # Check for valid characters: letters, numbers, spaces, underscore, hyphen
    if not re.match(r"^[a-zA-ZáéíóúÁÉÍÓÚñÑ0-9\s_-]+$", alias):
        raise ValueError(
            "Alias can only contain letters, numbers, spaces, underscores, and hyphens"
        )

    # Check for consecutive spaces
    if "  " in alias:
        raise ValueError("Alias cannot contain consecutive spaces")

    # Check for leading/trailing spaces or special characters
    if alias[0] in [" ", "_", "-"] or alias[-1] in [" ", "_", "-"]:
        raise ValueError("Alias cannot start or end with spaces or special characters")

    return alias


def validate_name(name: str, field_name: str = "Name") -> str:
    """
    Validate person's name (first name, last name, etc.).

    Rules:
        - 2-50 characters
        - Letters and spaces only
        - No numbers or special characters
        - No leading/trailing spaces

    Args:
        name: The name to validate
        field_name: Name of the field (for error messages)

    Returns:
        Validated and normalized name

    Raises:
        ValueError: If name is invalid
    """
    if not name:
        raise ValueError(f"{field_name} cannot be empty")

    name = name.strip()

    if len(name) < 2:
        raise ValueError(f"{field_name} must be at least 2 characters long")

    if len(name) > 50:
        raise ValueError(f"{field_name} must be at most 50 characters long")

    # Only letters and spaces (including Spanish letters)
    if not re.match(r"^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$", name):
        raise ValueError(f"{field_name} can only contain letters and spaces")

    # No consecutive spaces
    if "  " in name:
        raise ValueError(f"{field_name} cannot contain consecutive spaces")

    return name


# ============================================================================
# Phone Number Validators
# ============================================================================

def validate_phone_number(
    phone: str,
    country_code: str = "ES",
    require_mobile: bool = False
) -> str:
    """
    Validate international phone number using phonenumbers library.

    Args:
        phone: Phone number to validate
        country_code: ISO country code (default: ES for Spain)
        require_mobile: If True, only accept mobile numbers

    Returns:
        Formatted phone number in E164 format (e.g., +34612345678)

    Raises:
        ValueError: If phone number is invalid

    Example:
        >>> validate_phone_number("612 34 56 78", "ES")
        "+34612345678"
        >>> validate_phone_number("+1 (555) 123-4567", "US")
        "+15551234567"
    """
    if not phone:
        raise ValueError("Phone number cannot be empty")

    try:
        # Parse phone number
        parsed = phonenumbers.parse(phone, country_code)

        # Validate
        if not phonenumbers.is_valid_number(parsed):
            raise ValueError("Invalid phone number")

        # Check if mobile (if required)
        if require_mobile:
            number_type = phonenumbers.number_type(parsed)
            if number_type != phonenumbers.PhoneNumberType.MOBILE:
                raise ValueError("Phone number must be a mobile number")

        # Return in E164 format
        return phonenumbers.format_number(parsed, phonenumbers.PhoneNumberFormat.E164)

    except NumberParseException as e:
        raise ValueError(f"Invalid phone number: {str(e)}")


# ============================================================================
# URL Validators
# ============================================================================

def validate_url(url: str, allow_localhost: bool = False) -> str:
    """
    Validate URL with security checks.

    Rules:
        - Must be valid URL format
        - Only HTTP/HTTPS schemes allowed
        - No IP addresses (unless localhost in dev)
        - No URL shorteners
        - No suspicious patterns

    Args:
        url: URL to validate
        allow_localhost: Allow localhost URLs (for development)

    Returns:
        Validated URL

    Raises:
        ValueError: If URL is invalid or suspicious

    Example:
        >>> validate_url("https://example.com/page")
        "https://example.com/page"
        >>> validate_url("javascript:alert('xss')")  # raises ValueError
    """
    if not url:
        raise ValueError("URL cannot be empty")

    url = url.strip()

    try:
        parsed = urlparse(url)

        # Check scheme
        if parsed.scheme not in ALLOWED_URL_SCHEMES:
            raise ValueError(
                f"URL scheme must be one of: {', '.join(ALLOWED_URL_SCHEMES)}"
            )

        # Check hostname exists
        if not parsed.netloc:
            raise ValueError("Invalid URL format")

        # Check for localhost
        if not allow_localhost and parsed.netloc in ["localhost", "127.0.0.1", "0.0.0.0"]:
            raise ValueError("Localhost URLs are not allowed")

        # Check for suspicious patterns
        for pattern in SUSPICIOUS_URL_PATTERNS:
            if re.search(pattern, url, re.IGNORECASE):
                raise ValueError(f"Suspicious URL pattern detected: {pattern}")

        # Check URL length
        if len(url) > 2048:
            raise ValueError("URL is too long (max 2048 characters)")

        return url

    except Exception as e:
        if isinstance(e, ValueError):
            raise
        raise ValueError(f"Invalid URL: {str(e)}")


# ============================================================================
# Text Content Validators
# ============================================================================

def validate_bio(bio: str, max_length: int = 500) -> str:
    """
    Validate user bio/description.

    Rules:
        - Maximum length limit
        - No profanity
        - No excessive special characters
        - No URLs (to prevent spam)

    Args:
        bio: Bio text to validate
        max_length: Maximum allowed length

    Returns:
        Validated bio

    Raises:
        ValueError: If bio is invalid
    """
    if not bio:
        return bio

    bio = bio.strip()

    # Check length
    if len(bio) > max_length:
        raise ValueError(f"Bio must be at most {max_length} characters long")

    # Check for URLs (basic check)
    if re.search(r"https?://|www\.", bio, re.IGNORECASE):
        raise ValueError("Bio cannot contain URLs")

    # Check for profanity (basic check)
    bio_lower = bio.lower()
    for word in PROFANITY_LIST:
        if word in bio_lower:
            raise ValueError(f"Bio contains inappropriate content")

    # Check for excessive special characters (spam indicator)
    special_char_count = len(re.findall(r"[^a-zA-Z0-9\s\.,!?áéíóúÁÉÍÓÚñÑ]", bio))
    if special_char_count > len(bio) * 0.2:  # More than 20% special chars
        raise ValueError("Bio contains too many special characters")

    return bio


def validate_description(
    description: str,
    min_length: int = 20,
    max_length: int = 1000,
    field_name: str = "Description"
) -> str:
    """
    Validate event/item description.

    Args:
        description: Description text
        min_length: Minimum required length
        max_length: Maximum allowed length
        field_name: Name of field (for error messages)

    Returns:
        Validated description

    Raises:
        ValueError: If description is invalid
    """
    if not description:
        raise ValueError(f"{field_name} cannot be empty")

    description = description.strip()

    if len(description) < min_length:
        raise ValueError(
            f"{field_name} must be at least {min_length} characters long"
        )

    if len(description) > max_length:
        raise ValueError(
            f"{field_name} must be at most {max_length} characters long"
        )

    # Check for profanity
    desc_lower = description.lower()
    for word in PROFANITY_LIST:
        if word in desc_lower:
            raise ValueError(f"{field_name} contains inappropriate content")

    return description


# ============================================================================
# Geographic Validators
# ============================================================================

def validate_city(city: str, country: str = "ES") -> str:
    """
    Validate city name.

    Args:
        city: City name to validate
        country: Country code (default: ES)

    Returns:
        Validated city name

    Raises:
        ValueError: If city is invalid

    Note:
        For production, consider using a geocoding API for validation
    """
    if not city:
        raise ValueError("City cannot be empty")

    city = city.strip().title()  # Normalize to Title Case

    # Basic validation - letters and spaces only
    if not re.match(r"^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s-]+$", city):
        raise ValueError("City name can only contain letters, spaces, and hyphens")

    if len(city) < 2:
        raise ValueError("City name must be at least 2 characters long")

    if len(city) > 100:
        raise ValueError("City name is too long")

    # Optional: Check against whitelist (if country is Spain)
    # if country == "ES" and city not in VALID_CITIES_SPAIN:
    #     logger.warning(f"City '{city}' not in Spain whitelist")

    return city


def validate_coordinates(lat: float, lng: float) -> tuple:
    """
    Validate geographic coordinates.

    Args:
        lat: Latitude
        lng: Longitude

    Returns:
        Tuple of validated (lat, lng)

    Raises:
        ValueError: If coordinates are invalid
    """
    if not isinstance(lat, (int, float)) or not isinstance(lng, (int, float)):
        raise ValueError("Coordinates must be numbers")

    if not -90 <= lat <= 90:
        raise ValueError("Latitude must be between -90 and 90")

    if not -180 <= lng <= 180:
        raise ValueError("Longitude must be between -180 and 180")

    return (round(lat, 6), round(lng, 6))


# ============================================================================
# List Validators
# ============================================================================

def validate_interests(interests: List[str], max_count: int = 10) -> List[str]:
    """
    Validate list of user interests.

    Args:
        interests: List of interests
        max_count: Maximum number of interests allowed

    Returns:
        Validated list of interests

    Raises:
        ValueError: If interests are invalid
    """
    if not interests:
        return []

    if len(interests) > max_count:
        raise ValueError(f"Maximum {max_count} interests allowed")

    validated = []
    for interest in interests:
        if not isinstance(interest, str):
            raise ValueError("All interests must be strings")

        interest = interest.strip().lower()

        if not interest:
            continue

        if len(interest) > 50:
            raise ValueError("Interest name too long (max 50 characters)")

        # Optional: Check against whitelist
        # if interest not in VALID_INTERESTS:
        #     raise ValueError(f"Interest '{interest}' is not valid")

        if interest not in validated:  # Remove duplicates
            validated.append(interest)

    return validated


# ============================================================================
# Monetary Validators
# ============================================================================

def validate_amount(
    amount: float,
    min_amount: float = 0.0,
    max_amount: float = 100000.0,
    field_name: str = "Amount"
) -> float:
    """
    Validate monetary amount.

    Args:
        amount: Amount to validate
        min_amount: Minimum allowed amount
        max_amount: Maximum allowed amount
        field_name: Name of field (for error messages)

    Returns:
        Validated amount (rounded to 2 decimals)

    Raises:
        ValueError: If amount is invalid
    """
    if not isinstance(amount, (int, float)):
        raise ValueError(f"{field_name} must be a number")

    if amount < min_amount:
        raise ValueError(f"{field_name} must be at least {min_amount}")

    if amount > max_amount:
        raise ValueError(f"{field_name} cannot exceed {max_amount}")

    # Round to 2 decimal places
    return round(amount, 2)


# ============================================================================
# Age Validators
# ============================================================================

def validate_age_range(
    min_age: int,
    max_age: int,
    absolute_min: int = 18,
    absolute_max: int = 100
) -> tuple:
    """
    Validate age range.

    Args:
        min_age: Minimum age
        max_age: Maximum age
        absolute_min: Absolute minimum allowed (default: 18)
        absolute_max: Absolute maximum allowed (default: 100)

    Returns:
        Tuple of validated (min_age, max_age)

    Raises:
        ValueError: If age range is invalid
    """
    if min_age < absolute_min:
        raise ValueError(f"Minimum age cannot be less than {absolute_min}")

    if max_age > absolute_max:
        raise ValueError(f"Maximum age cannot exceed {absolute_max}")

    if min_age > max_age:
        raise ValueError("Minimum age cannot be greater than maximum age")

    if max_age - min_age < 1:
        raise ValueError("Age range must be at least 1 year")

    return (min_age, max_age)
