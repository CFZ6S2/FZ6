"""
Configuration management for TuCitaSegura Backend
"""
<<<<<<< HEAD
from typing import List, Union
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import field_validator
import json
=======
from typing import List
from pydantic_settings import BaseSettings
from pydantic import field_validator
>>>>>>> c6ecb8b (Fix Dockerfile and opencv for Cloud Run)


class Settings(BaseSettings):
    """Application settings"""

    # Environment
    ENVIRONMENT: str = "development"
    DEBUG: bool = True

    # API
    API_HOST: str = "0.0.0.0"
    API_PORT: int = 8000
    API_WORKERS: int = 4
    API_TITLE: str = "TuCitaSegura API"
    API_VERSION: str = "1.0.0"
    API_DESCRIPTION: str = "Backend API para TuCitaSegura - Plataforma de citas seguras"

    # Firebase
    FIREBASE_PROJECT_ID: str = ""
    FIREBASE_PRIVATE_KEY_PATH: str = "./serviceAccountKey.json"

    # Database
    DATABASE_URL: str = ""
    DATABASE_POOL_SIZE: int = 20
    DATABASE_MAX_OVERFLOW: int = 0

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"
    REDIS_PASSWORD: str = ""

    # Stripe
    STRIPE_SECRET_KEY: str = ""
    STRIPE_PUBLISHABLE_KEY: str = ""
    STRIPE_WEBHOOK_SECRET: str = ""

    # Google Maps
    GOOGLE_MAPS_API_KEY: str = ""

    # OpenAI
    OPENAI_API_KEY: str = ""

    # JWT
    SECRET_KEY: str = ""
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    # Email
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""

    # Sentry
    SENTRY_DSN: str = ""

    # Machine Learning
    ML_MODEL_PATH: str = "./models"
    ML_ENABLE_TRAINING: bool = False
    ML_MIN_SAMPLES_FOR_TRAINING: int = 100

    # Computer Vision
    CV_MAX_IMAGE_SIZE: int = 5242880  # 5MB
    CV_ALLOWED_FORMATS: str = "jpg,jpeg,png,webp"
    CV_FACE_DETECTION_CONFIDENCE: float = 0.7

    # Security
    MAX_LOGIN_ATTEMPTS: int = 5
    LOGIN_ATTEMPT_WINDOW_MINUTES: int = 15
    PASSWORD_MIN_LENGTH: int = 8

    # Rate Limiting
    RATE_LIMIT_PER_MINUTE: int = 60
    RATE_LIMIT_PER_HOUR: int = 1000

    # CORS - Using str to avoid pydantic-settings auto JSON-decoding
    CORS_ORIGINS: str = ""

<<<<<<< HEAD
    @field_validator("SECRET_KEY", mode="after")
=======
    @field_validator("SECRET_KEY")
>>>>>>> c6ecb8b (Fix Dockerfile and opencv for Cloud Run)
    @classmethod
    def validate_secret_key(cls, v):
        """
        Validate that SECRET_KEY is strong and not a default value.
        Prevents using weak or example keys in production.
        """
        # Allow empty SECRET_KEY for development/testing
        if not v:
            import logging
            logging.warning("SECRET_KEY is not set. This is insecure for production use.")
            return v

        # Check for forbidden default values
        forbidden_values = [
            "your-secret-key",
            "change-this",
            "example",
            "secret",
            "password",
            "12345",
            "test",
            "demo",
            "changeme"
        ]

        v_lower = v.lower()
        for forbidden in forbidden_values:
            if forbidden in v_lower:
                raise ValueError(
                    f"SECRET_KEY contains forbidden value '{forbidden}'. "
                    "Generate a secure key with: python -c \"import secrets; print(secrets.token_urlsafe(32))\""
                )

        # Check minimum length
        if len(v) < 32:
            raise ValueError(
                f"SECRET_KEY must be at least 32 characters long (got {len(v)}). "
                "Generate a secure key with: python -c \"import secrets; print(secrets.token_urlsafe(32))\""
            )

        # Check entropy (basic check - should have mix of characters)
        if v.isalnum() or v.isalpha() or v.isdigit():
            raise ValueError(
                "SECRET_KEY is too simple. Must contain a mix of characters. "
                "Generate a secure key with: python -c \"import secrets; print(secrets.token_urlsafe(32))\""
            )

        return v

<<<<<<< HEAD
    @field_validator("CORS_ORIGINS", mode="after")
    @classmethod
    def parse_cors_origins(cls, v) -> List[str]:
        """Parse CORS origins from comma-separated string or JSON, handle empty values"""
        # Default origins
        default_origins = [
            "http://localhost:3000",
            "http://localhost:5173",
            "http://localhost:8000",
            "http://127.0.0.1:8000"
        ]

        # Handle None or empty string - return default
        if v is None or v == "":
            return default_origins

        # If string, try to parse as JSON first, then fall back to comma-separated
        if isinstance(v, str):
            v = v.strip()

            # Empty after strip
            if not v:
                return default_origins

            # Try JSON parsing first
            if v.startswith('['):
                try:
                    parsed = json.loads(v)
                    if isinstance(parsed, list):
                        return parsed
                except (json.JSONDecodeError, ValueError):
                    pass

            # Fall back to comma-separated parsing
            origins = [origin.strip() for origin in v.split(",") if origin.strip()]
            return origins if origins else default_origins

        # If already a list, return as-is (shouldn't happen with str type, but safe)
        if isinstance(v, list):
            return v

        return default_origins

    # Pydantic v2 settings config
    model_config = SettingsConfigDict(
        env_file=".env",
        case_sensitive=True,
        env_ignore_empty=True
    )
=======
    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def parse_cors_origins(cls, v):
        """Parse CORS origins from comma-separated string"""
        if isinstance(v, str):
            return [origin.strip() for origin in v.split(",")]
        elif isinstance(v, list):
            return v
        return v

    class Config:
        env_file = ".env"
        case_sensitive = True
        extra = 'ignore'  # Allow extra env vars like VITE_*
>>>>>>> c6ecb8b (Fix Dockerfile and opencv for Cloud Run)


# Global settings instance
settings = Settings()
