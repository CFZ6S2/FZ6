"""
Authentication utilities for Firebase Admin SDK
Handles token verification and user authentication
"""

import os
from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from firebase_admin import auth, credentials, initialize_app
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Initialize Firebase Admin SDK
cred_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
service_account_json = os.getenv("SERVICE_ACCOUNT_JSON")

# Flag to track if Firebase is initialized
firebase_initialized = False

# Try to load from JSON string first (for Railway/cloud deployment)
if service_account_json:
    try:
        import json
        service_account_dict = json.loads(service_account_json)
        cred = credentials.Certificate(service_account_dict)
        initialize_app(cred)
        firebase_initialized = True
        print(f"✅ Firebase Admin SDK initialized from JSON variable")
    except Exception as e:
        print(f"⚠️ Failed to parse SERVICE_ACCOUNT_JSON: {str(e)}")
        print(f"⚠️ Protected endpoints will not work without Firebase credentials")
# Otherwise load from file path (for local development)
elif cred_path and os.path.exists(cred_path):
    try:
        cred = credentials.Certificate(cred_path)
        initialize_app(cred)
        firebase_initialized = True
        print(f"✅ Firebase Admin SDK initialized from file: {cred_path}")
    except Exception as e:
        print(f"⚠️ Failed to initialize from file: {str(e)}")
        print(f"⚠️ Protected endpoints will not work without Firebase credentials")
else:
    print(f"⚠️ Firebase credentials not found.")
    print(f"   Set SERVICE_ACCOUNT_JSON environment variable (JSON string)")
    print(f"   OR set GOOGLE_APPLICATION_CREDENTIALS to file path")
    print(f"⚠️ Protected endpoints will not work without Firebase credentials")

# HTTP Bearer security scheme
security = HTTPBearer(auto_error=False)


async def get_current_user(
    token: Optional[HTTPAuthorizationCredentials] = Depends(security)
) -> dict:
    """
    Verify Firebase ID token and return user information

    Args:
        token: HTTP Bearer token from Authorization header

    Returns:
        dict: Decoded token with user information (uid, email, etc.)

    Raises:
        HTTPException: 401 if token is missing or invalid
    """
    if not firebase_initialized:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Firebase no está configurado. Configura SERVICE_ACCOUNT_JSON en las variables de entorno.",
        )

    if token is None or not token.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token de autenticación ausente. Incluye 'Authorization: Bearer <token>' en los headers.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        # Verify the ID token
        decoded_token = auth.verify_id_token(token.credentials)
        return decoded_token
    except auth.ExpiredIdTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token expirado. Por favor, inicia sesión de nuevo.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except auth.RevokedIdTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token revocado. Por favor, inicia sesión de nuevo.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except auth.InvalidIdTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido. Verifica que el token sea válido.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Error al verificar el token: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )


async def get_optional_user(
    token: Optional[HTTPAuthorizationCredentials] = Depends(security)
) -> Optional[dict]:
    """
    Optionally verify Firebase ID token
    Returns None if no token provided, otherwise validates it

    Args:
        token: HTTP Bearer token from Authorization header

    Returns:
        Optional[dict]: Decoded token with user information, or None if no token
    """
    if token is None or not token.credentials:
        return None

    try:
        decoded_token = auth.verify_id_token(token.credentials)
        return decoded_token
    except:
        return None
