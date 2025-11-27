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
if not cred_path or not os.path.exists(cred_path):
    raise RuntimeError(
        f"⚠️ Firebase credentials file not found at: {cred_path}\n"
        "Please ensure serviceAccountKey.json exists and GOOGLE_APPLICATION_CREDENTIALS is set correctly in .env"
    )

try:
    cred = credentials.Certificate(cred_path)
    initialize_app(cred)
    print(f"✅ Firebase Admin SDK initialized successfully")
except Exception as e:
    raise RuntimeError(f"❌ Failed to initialize Firebase Admin SDK: {str(e)}")

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
