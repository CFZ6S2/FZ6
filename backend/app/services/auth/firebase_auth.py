"""
Firebase Authentication Service for TuCitaSegura.
Provides real JWT token verification and user authorization.
"""
import logging
from typing import Optional, Dict, Any
from fastapi import HTTPException, status
from firebase_admin import auth
from datetime import datetime

logger = logging.getLogger(__name__)


class FirebaseAuthService:
    """Service for Firebase Authentication operations."""

    @staticmethod
    async def verify_token(token: str) -> Dict[str, Any]:
        """
        Verify a Firebase ID token and return decoded claims.

        Args:
            token: Firebase ID token from the client

        Returns:
            Dict containing user claims (uid, email, custom claims, etc.)

        Raises:
            HTTPException: If token is invalid or expired
        """
        if not token:
            logger.warning("Authentication attempted with empty token")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token de autenticación requerido",
                headers={"WWW-Authenticate": "Bearer"},
            )

        try:
            # Verify the token with Firebase
            decoded_token = auth.verify_id_token(token, check_revoked=True)

            # Log successful authentication
            logger.info(f"Token verified successfully for user: {decoded_token.get('uid')}")

            return decoded_token

        except auth.InvalidIdTokenError:
            logger.warning("Invalid ID token received")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token de autenticación inválido",
                headers={"WWW-Authenticate": "Bearer"},
            )

        except auth.ExpiredIdTokenError:
            logger.warning("Expired ID token received")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token de autenticación expirado",
                headers={"WWW-Authenticate": "Bearer"},
            )

        except auth.RevokedIdTokenError:
            logger.warning("Revoked ID token received")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token de autenticación revocado",
                headers={"WWW-Authenticate": "Bearer"},
            )

        except auth.CertificateFetchError:
            logger.error("Error fetching Firebase certificates")
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Servicio de autenticación temporalmente no disponible",
            )

        except Exception as e:
            logger.error(f"Unexpected error verifying token: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Error interno al verificar autenticación",
            )

    @staticmethod
    async def verify_email_verified(decoded_token: Dict[str, Any]) -> bool:
        """
        Verify that the user's email is verified.

        Args:
            decoded_token: Decoded Firebase token

        Returns:
            True if email is verified

        Raises:
            HTTPException: If email is not verified
        """
        email_verified = decoded_token.get("email_verified", False)

        if not email_verified:
            logger.warning(f"Unverified email access attempt: {decoded_token.get('uid')}")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Debes verificar tu email antes de acceder a esta función",
            )

        return True

    @staticmethod
    async def get_user_role(decoded_token: Dict[str, Any]) -> str:
        """
        Get user role from custom claims.

        Args:
            decoded_token: Decoded Firebase token

        Returns:
            User role ('admin', 'concierge', 'regular')
        """
        return decoded_token.get("role", "regular")

    @staticmethod
    async def verify_admin(decoded_token: Dict[str, Any]) -> bool:
        """
        Verify that the user is an admin.

        Args:
            decoded_token: Decoded Firebase token

        Returns:
            True if user is admin

        Raises:
            HTTPException: If user is not admin
        """
        role = await FirebaseAuthService.get_user_role(decoded_token)

        if role != "admin":
            logger.warning(
                f"Unauthorized admin access attempt by user: {decoded_token.get('uid')} "
                f"with role: {role}"
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Acceso denegado. Se requieren privilegios de administrador",
            )

        return True

    @staticmethod
    async def verify_concierge(decoded_token: Dict[str, Any]) -> bool:
        """
        Verify that the user is a concierge.

        Args:
            decoded_token: Decoded Firebase token

        Returns:
            True if user is concierge

        Raises:
            HTTPException: If user is not concierge
        """
        role = await FirebaseAuthService.get_user_role(decoded_token)

        if role not in ["concierge", "admin"]:  # Admins también tienen acceso
            logger.warning(
                f"Unauthorized concierge access attempt by user: {decoded_token.get('uid')} "
                f"with role: {role}"
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Acceso denegado. Se requieren privilegios de concierge",
            )

        return True

    @staticmethod
    async def verify_resource_ownership(
        decoded_token: Dict[str, Any],
        resource_user_id: str,
        allow_admin: bool = True
    ) -> bool:
        """
        Verify that the user owns the resource or is an admin.

        Args:
            decoded_token: Decoded Firebase token
            resource_user_id: User ID that owns the resource
            allow_admin: Whether to allow admin access

        Returns:
            True if user owns resource or is admin

        Raises:
            HTTPException: If user doesn't own resource and is not admin
        """
        user_id = decoded_token.get("uid")
        role = await FirebaseAuthService.get_user_role(decoded_token)

        # Check if user owns the resource
        if user_id == resource_user_id:
            return True

        # Check if admin and admin access is allowed
        if allow_admin and role == "admin":
            return True

        logger.warning(
            f"Unauthorized resource access: user {user_id} "
            f"attempted to access resource owned by {resource_user_id}"
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acceso denegado. No tienes permiso para acceder a este recurso",
        )

    @staticmethod
    async def get_user_info(uid: str) -> Optional[Dict[str, Any]]:
        """
        Get user information from Firebase Auth.

        Args:
            uid: User ID

        Returns:
            User information dict or None if not found
        """
        try:
            user_record = auth.get_user(uid)
            return {
                "uid": user_record.uid,
                "email": user_record.email,
                "email_verified": user_record.email_verified,
                "display_name": user_record.display_name,
                "photo_url": user_record.photo_url,
                "disabled": user_record.disabled,
                "custom_claims": user_record.custom_claims or {},
                "created_at": user_record.user_metadata.creation_timestamp,
                "last_sign_in": user_record.user_metadata.last_sign_in_timestamp,
            }
        except auth.UserNotFoundError:
            logger.warning(f"User not found: {uid}")
            return None
        except Exception as e:
            logger.error(f"Error fetching user info: {e}")
            return None

    @staticmethod
    async def set_custom_claims(uid: str, claims: Dict[str, Any]) -> bool:
        """
        Set custom claims for a user.

        Args:
            uid: User ID
            claims: Custom claims to set

        Returns:
            True if successful
        """
        try:
            # Get existing claims
            user_record = auth.get_user(uid)
            existing_claims = user_record.custom_claims or {}

            # Merge with new claims
            updated_claims = {**existing_claims, **claims}

            # Set updated claims
            auth.set_custom_claims(uid, updated_claims)

            logger.info(f"Custom claims updated for user {uid}: {claims}")
            return True

        except auth.UserNotFoundError:
            logger.error(f"Cannot set claims - user not found: {uid}")
            return False
        except Exception as e:
            logger.error(f"Error setting custom claims: {e}")
            return False

    @staticmethod
    async def revoke_refresh_tokens(uid: str) -> bool:
        """
        Revoke all refresh tokens for a user (force re-authentication).

        Args:
            uid: User ID

        Returns:
            True if successful
        """
        try:
            auth.revoke_refresh_tokens(uid)
            logger.info(f"Refresh tokens revoked for user: {uid}")
            return True
        except Exception as e:
            logger.error(f"Error revoking refresh tokens: {e}")
            return False


# Global instance
firebase_auth_service = FirebaseAuthService()
