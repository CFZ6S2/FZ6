"""
FastAPI dependencies for authentication and authorization.
"""
import logging
from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from app.services.auth.firebase_auth import firebase_auth_service
from app.models.schemas import AuthenticatedUser

logger = logging.getLogger(__name__)

# Security scheme for bearer token
security = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> AuthenticatedUser:
    """
    Dependency to get the current authenticated user from JWT token.

    Usage:
        @router.get("/protected")
        async def protected_route(user: AuthenticatedUser = Depends(get_current_user)):
            return {"user_id": user.uid}

    Args:
        credentials: HTTP Bearer credentials from request header

    Returns:
        AuthenticatedUser object with user information

    Raises:
        HTTPException: If token is invalid or user not found
    """
    token = credentials.credentials

    # Verify token with Firebase
    decoded_token = await firebase_auth_service.verify_token(token)

    # Create AuthenticatedUser object
    user = AuthenticatedUser(
        uid=decoded_token.get("uid"),
        email=decoded_token.get("email"),
        email_verified=decoded_token.get("email_verified", False),
        role=decoded_token.get("role", "regular"),
        custom_claims=decoded_token,
    )

    return user


async def get_current_user_optional(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(HTTPBearer(auto_error=False))
) -> Optional[AuthenticatedUser]:
    """
    Dependency to optionally get the current user (doesn't require authentication).

    Usage:
        @router.get("/public")
        async def public_route(user: Optional[AuthenticatedUser] = Depends(get_current_user_optional)):
            if user:
                return {"message": f"Hello {user.email}"}
            return {"message": "Hello anonymous"}

    Args:
        credentials: HTTP Bearer credentials from request header (optional)

    Returns:
        AuthenticatedUser object if authenticated, None otherwise
    """
    if not credentials:
        return None

    try:
        return await get_current_user(credentials)
    except HTTPException:
        return None


async def get_current_verified_user(
    user: AuthenticatedUser = Depends(get_current_user)
) -> AuthenticatedUser:
    """
    Dependency to get current user with verified email.

    Usage:
        @router.post("/send-message")
        async def send_message(user: AuthenticatedUser = Depends(get_current_verified_user)):
            # User email is guaranteed to be verified
            ...

    Args:
        user: Current authenticated user

    Returns:
        AuthenticatedUser with verified email

    Raises:
        HTTPException: If email is not verified
    """
    await firebase_auth_service.verify_email_verified(user.custom_claims)
    return user


async def get_current_admin(
    user: AuthenticatedUser = Depends(get_current_user)
) -> AuthenticatedUser:
    """
    Dependency to verify current user is an admin.

    Usage:
        @router.delete("/users/{user_id}")
        async def delete_user(
            user_id: str,
            admin: AuthenticatedUser = Depends(get_current_admin)
        ):
            # Only admins can reach this code
            ...

    Args:
        user: Current authenticated user

    Returns:
        AuthenticatedUser with admin role

    Raises:
        HTTPException: If user is not admin
    """
    await firebase_auth_service.verify_admin(user.custom_claims)
    return user


async def get_current_concierge(
    user: AuthenticatedUser = Depends(get_current_user)
) -> AuthenticatedUser:
    """
    Dependency to verify current user is a concierge.

    Usage:
        @router.post("/vip-events")
        async def create_vip_event(
            event_data: VipEventCreate,
            concierge: AuthenticatedUser = Depends(get_current_concierge)
        ):
            # Only concierges can reach this code
            ...

    Args:
        user: Current authenticated user

    Returns:
        AuthenticatedUser with concierge role

    Raises:
        HTTPException: If user is not concierge
    """
    await firebase_auth_service.verify_concierge(user.custom_claims)
    return user


async def verify_resource_ownership(
    resource_user_id: str,
    user: AuthenticatedUser = Depends(get_current_user)
) -> AuthenticatedUser:
    """
    Dependency to verify user owns a resource or is admin.

    Usage:
        @router.get("/users/{user_id}/profile")
        async def get_profile(
            user_id: str,
            current_user: AuthenticatedUser = Depends(verify_resource_ownership)
        ):
            # User can only access their own profile (or admin can access any)
            ...

    Args:
        resource_user_id: ID of the user who owns the resource
        user: Current authenticated user

    Returns:
        AuthenticatedUser who owns the resource or is admin

    Raises:
        HTTPException: If user doesn't own resource and is not admin
    """
    await firebase_auth_service.verify_resource_ownership(
        user.custom_claims,
        resource_user_id
    )
    return user
