"""
Endpoints para gestión de teléfonos de emergencia.
ACTUALIZADO: Ahora usa autenticación real de Firebase en lugar de mocks.
PROTECCIÓN: Rate limiting implementado en todos los endpoints.
"""
from fastapi import APIRouter, HTTPException, Depends, Request
from fastapi.responses import JSONResponse
import logging
from typing import List, Optional
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.models.schemas import (
    EmergencyPhoneCreate,
    EmergencyPhoneResponse,
    EmergencyPhoneUpdate,
    EmergencyPhoneListResponse,
    SuccessResponse,
    AuthenticatedUser,
)
from app.core.dependencies import (
    get_current_user,
    get_current_verified_user,
    get_current_admin,
)
from app.services.security.recaptcha_service import recaptcha_service
from app.services.firestore.emergency_phones_service import emergency_phone_service
from app.services.security.security_logger import security_logger

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/emergency", tags=["emergency-phones"])
limiter = Limiter(key_func=get_remote_address)


@router.post("/phones", response_model=EmergencyPhoneResponse)
@limiter.limit("15/minute")
async def create_emergency_phone(
    phone_data: EmergencyPhoneCreate,
    request: Request,
    user: AuthenticatedUser = Depends(get_current_verified_user),
    user_id: Optional[str] = None
):
    """
    Crea un nuevo teléfono de emergencia para un usuario.

    AUTENTICACIÓN REQUERIDA:
    - Token de Firebase válido
    - Email verificado
    - reCAPTCHA validado (para usuarios no admin)

    Args:
        phone_data: Datos del teléfono de emergencia
        user_id: (Opcional) ID del usuario. Si es admin, puede especificar user_id

    Returns:
        Teléfono de emergencia creado
    """
    try:
        # Determinar el user_id objetivo
        # Admins pueden crear para otros usuarios, regulares solo para sí mismos
        if user_id and user_id != user.uid:
            # Verificar que sea admin
            if not user.is_admin:
                # Log unauthorized access attempt
                await security_logger.log_unauthorized_access(
                    user_id=user.uid,
                    resource=f"emergency_phones (user {user_id})",
                    action="create",
                    ip_address=request.client.host if request.client else None,
                    user_agent=request.headers.get("user-agent")
                )
                raise HTTPException(
                    status_code=403,
                    detail="Solo administradores pueden crear teléfonos para otros usuarios"
                )
            target_user_id = user_id
        else:
            target_user_id = user.uid

        # Validar reCAPTCHA para usuarios no administradores
        if not user.is_admin:
            recaptcha_token = request.headers.get("X-Recaptcha-Token")
            if not recaptcha_token:
                raise HTTPException(status_code=400, detail="Token reCAPTCHA requerido")

            is_human = await recaptcha_service.is_human(recaptcha_token)
            if not is_human:
                raise HTTPException(status_code=400, detail="Verificación reCAPTCHA fallida")

        # Guardar en Firestore
        phone_dict = phone_data.dict()
        new_phone = await emergency_phone_service.create_emergency_phone(target_user_id, phone_dict)

        logger.info(
            f"Emergency phone created by {user.uid} for user {target_user_id}: "
            f"{new_phone['phone_number']}"
        )

        # Log sensitive data creation
        await security_logger.log_sensitive_data_access(
            user_id=user.uid,
            data_type="emergency_phone",
            resource_id=new_phone['id'],
            action="create",
            ip_address=request.client.host if request.client else None,
            user_agent=request.headers.get("user-agent")
        )

        # Log admin action if creating for another user
        if user.is_admin and target_user_id != user.uid:
            await security_logger.log_admin_action(
                admin_user_id=user.uid,
                action="create_emergency_phone",
                target_user_id=target_user_id,
                ip_address=request.client.host if request.client else None,
                user_agent=request.headers.get("user-agent"),
                details={"phone_id": new_phone['id']}
            )

        return EmergencyPhoneResponse(**new_phone)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating emergency phone: {e}")
        raise HTTPException(status_code=500, detail="Error interno del servidor")


@router.get("/phones", response_model=EmergencyPhoneListResponse)
@limiter.limit("30/minute")
async def get_emergency_phones(
    request: Request,
    user: AuthenticatedUser = Depends(get_current_user),
    user_id: Optional[str] = None,
    page: int = 1,
    limit: int = 50
):
    """
    Obtiene los teléfonos de emergencia de un usuario.

    AUTENTICACIÓN REQUERIDA:
    - Token de Firebase válido
    - Usuarios solo pueden ver sus propios teléfonos
    - Admins pueden ver teléfonos de cualquier usuario

    Args:
        user_id: (Opcional) Filtrar por usuario específico (solo admins)
        page: Número de página para paginación
        limit: Límite de resultados por página

    Returns:
        Lista de teléfonos de emergencia
    """
    try:
        # Determinar qué teléfonos puede ver
        if user_id and user_id != user.uid:
            # Verificar que sea admin
            if not user.is_admin:
                # Log unauthorized access attempt
                await security_logger.log_unauthorized_access(
                    user_id=user.uid,
                    resource=f"emergency_phones (user {user_id})",
                    action="read",
                    ip_address=request.client.host if request.client else None,
                    user_agent=request.headers.get("user-agent")
                )
                raise HTTPException(
                    status_code=403,
                    detail="Solo administradores pueden ver teléfonos de otros usuarios"
                )
            target_user_id = user_id
        else:
            target_user_id = user.uid

        # Consultar teléfonos de Firestore
        phones = await emergency_phone_service.get_user_emergency_phones(target_user_id)

        logger.info(f"User {user.uid} retrieved {len(phones)} emergency phones")

        # Log sensitive data access
        if phones:
            await security_logger.log_sensitive_data_access(
                user_id=user.uid,
                data_type="emergency_phone",
                resource_id=f"user_{target_user_id}_phones",
                action="read",
                ip_address=request.client.host if request.client else None,
                user_agent=request.headers.get("user-agent")
            )

        # Log admin action if viewing another user's phones
        if user.is_admin and target_user_id != user.uid:
            await security_logger.log_admin_action(
                admin_user_id=user.uid,
                action="view_emergency_phones",
                target_user_id=target_user_id,
                ip_address=request.client.host if request.client else None,
                user_agent=request.headers.get("user-agent"),
                details={"count": len(phones)}
            )

        return EmergencyPhoneListResponse(
            phones=phones,
            total_count=len(phones)
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting emergency phones: {e}")
        raise HTTPException(status_code=500, detail="Error interno del servidor")


@router.get("/phones/{phone_id}", response_model=EmergencyPhoneResponse)
@limiter.limit("40/minute")
async def get_emergency_phone(
    request: Request,
    phone_id: str,
    user: AuthenticatedUser = Depends(get_current_user)
):
    """
    Obtiene un teléfono de emergencia específico por ID.

    AUTENTICACIÓN REQUERIDA:
    - Token de Firebase válido
    - Usuario debe ser dueño del teléfono o admin

    Args:
        phone_id: ID del teléfono de emergencia

    Returns:
        Detalles del teléfono de emergencia
    """
    try:
        # Consultar teléfono de Firestore
        phone_data = await emergency_phone_service.get_emergency_phone(user.uid, phone_id)

        if not phone_data:
            raise HTTPException(status_code=404, detail="Teléfono no encontrado")

        # Verificar acceso
        if phone_data["user_id"] != user.uid and not user.is_admin:
            # Log unauthorized access attempt
            await security_logger.log_unauthorized_access(
                user_id=user.uid,
                resource=f"emergency_phone {phone_id}",
                action="read",
                ip_address=request.client.host if request.client else None,
                user_agent=request.headers.get("user-agent")
            )
            raise HTTPException(status_code=403, detail="Acceso denegado")

        # Log sensitive data access
        await security_logger.log_sensitive_data_access(
            user_id=user.uid,
            data_type="emergency_phone",
            resource_id=phone_id,
            action="read",
            ip_address=request.client.host if request.client else None,
            user_agent=request.headers.get("user-agent")
        )

        return EmergencyPhoneResponse(**phone_data)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting emergency phone {phone_id}: {e}")
        raise HTTPException(status_code=500, detail="Error interno del servidor")


@router.put("/phones/{phone_id}", response_model=EmergencyPhoneResponse)
@limiter.limit("20/minute")
async def update_emergency_phone(
    request: Request,
    phone_id: str,
    phone_data: EmergencyPhoneUpdate,
    user: AuthenticatedUser = Depends(get_current_user)
):
    """
    Actualiza un teléfono de emergencia existente.

    AUTENTICACIÓN REQUERIDA:
    - Token de Firebase válido
    - Usuario debe ser dueño del teléfono o admin

    Args:
        phone_id: ID del teléfono de emergencia
        phone_data: Datos a actualizar

    Returns:
        Teléfono de emergencia actualizado
    """
    try:
        # Verificar que el teléfono existe
        existing_phone = await emergency_phone_service.get_emergency_phone(user.uid, phone_id)

        if not existing_phone:
            raise HTTPException(status_code=404, detail="Teléfono no encontrado")

        # Verificar acceso
        if existing_phone["user_id"] != user.uid and not user.is_admin:
            # Log unauthorized access attempt
            await security_logger.log_unauthorized_access(
                user_id=user.uid,
                resource=f"emergency_phone {phone_id}",
                action="update",
                ip_address=request.client.host if request.client else None,
                user_agent=request.headers.get("user-agent")
            )
            raise HTTPException(status_code=403, detail="Acceso denegado")

        # Aplicar actualizaciones
        update_data = phone_data.dict(exclude_unset=True)

        # Actualizar en Firestore
        updated_phone = await emergency_phone_service.update_emergency_phone(
            existing_phone["user_id"], phone_id, update_data
        )

        logger.info(f"Emergency phone {phone_id} updated by {user.uid}")

        # Log sensitive data modification
        await security_logger.log_sensitive_data_access(
            user_id=user.uid,
            data_type="emergency_phone",
            resource_id=phone_id,
            action="update",
            ip_address=request.client.host if request.client else None,
            user_agent=request.headers.get("user-agent")
        )

        # Log admin action if updating another user's phone
        if user.is_admin and existing_phone["user_id"] != user.uid:
            await security_logger.log_admin_action(
                admin_user_id=user.uid,
                action="update_emergency_phone",
                target_user_id=existing_phone["user_id"],
                ip_address=request.client.host if request.client else None,
                user_agent=request.headers.get("user-agent"),
                details={"phone_id": phone_id}
            )

        return EmergencyPhoneResponse(**updated_phone)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating emergency phone {phone_id}: {e}")
        raise HTTPException(status_code=500, detail="Error interno del servidor")


@router.delete("/phones/{phone_id}", response_model=SuccessResponse)
@limiter.limit("15/minute")
async def delete_emergency_phone(
    request: Request,
    phone_id: str,
    user: AuthenticatedUser = Depends(get_current_user)
):
    """
    Elimina un teléfono de emergencia.

    AUTENTICACIÓN REQUERIDA:
    - Token de Firebase válido
    - Usuario debe ser dueño del teléfono o admin

    Args:
        phone_id: ID del teléfono de emergencia

    Returns:
        Confirmación de eliminación
    """
    try:
        # Verificar que el teléfono existe
        existing_phone = await emergency_phone_service.get_emergency_phone(user.uid, phone_id)

        if not existing_phone:
            raise HTTPException(status_code=404, detail="Teléfono no encontrado")

        # Verificar acceso
        if existing_phone["user_id"] != user.uid and not user.is_admin:
            # Log unauthorized access attempt
            await security_logger.log_unauthorized_access(
                user_id=user.uid,
                resource=f"emergency_phone {phone_id}",
                action="delete",
                ip_address=request.client.host if request.client else None,
                user_agent=request.headers.get("user-agent")
            )
            raise HTTPException(status_code=403, detail="Acceso denegado")

        # Eliminar de Firestore
        await emergency_phone_service.delete_emergency_phone(existing_phone["user_id"], phone_id)

        logger.info(f"Emergency phone {phone_id} deleted by {user.uid}")

        # Log sensitive data deletion
        await security_logger.log_sensitive_data_access(
            user_id=user.uid,
            data_type="emergency_phone",
            resource_id=phone_id,
            action="delete",
            ip_address=request.client.host if request.client else None,
            user_agent=request.headers.get("user-agent")
        )

        # Log admin action if deleting another user's phone
        if user.is_admin and existing_phone["user_id"] != user.uid:
            await security_logger.log_admin_action(
                admin_user_id=user.uid,
                action="delete_emergency_phone",
                target_user_id=existing_phone["user_id"],
                ip_address=request.client.host if request.client else None,
                user_agent=request.headers.get("user-agent"),
                details={"phone_id": phone_id}
            )

        return SuccessResponse(
            message="Teléfono de emergencia eliminado correctamente",
            data={"phone_id": phone_id}
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting emergency phone {phone_id}: {e}")
        raise HTTPException(status_code=500, detail="Error interno del servidor")


@router.post("/phones/{phone_id}/verify", response_model=EmergencyPhoneResponse)
@limiter.limit("10/minute")
async def verify_emergency_phone(
    request: Request,
    phone_id: str,
    admin: AuthenticatedUser = Depends(get_current_admin)
):
    """
    Marca un teléfono de emergencia como verificado.

    AUTENTICACIÓN REQUERIDA:
    - Token de Firebase válido
    - Rol de administrador

    Args:
        phone_id: ID del teléfono de emergencia

    Returns:
        Teléfono de emergencia verificado
    """
    try:
        # Buscar el teléfono (admin puede acceder a cualquiera)
        # Necesitamos buscar en todos los usuarios, lo cual es costoso
        # TODO: Implementar índice o mejor estructura para búsqueda admin
        # Por ahora, requerir user_id en la query

        # Obtener user_id del query param sería mejor
        # Por ahora, lanzar error para implementar después
        raise HTTPException(
            status_code=501,
            detail="Verificación admin requiere especificar user_id en la query"
        )

        # existing_phone = await emergency_phone_service.get_emergency_phone(user_id, phone_id)
        #
        # if not existing_phone:
        #     raise HTTPException(status_code=404, detail="Teléfono no encontrado")
        #
        # # Marcar como verificado en Firestore
        # verified_phone = await emergency_phone_service.verify_emergency_phone(
        #     existing_phone["user_id"], phone_id
        # )
        #
        # logger.info(f"Emergency phone {phone_id} verified by admin {admin.uid}")
        #
        # return EmergencyPhoneResponse(**verified_phone)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error verifying emergency phone {phone_id}: {e}")
        raise HTTPException(status_code=500, detail="Error interno del servidor")


@router.post("/recaptcha/verify", response_model=SuccessResponse)
@limiter.limit("20/minute")
async def verify_recaptcha(
    request: Request,
    user: AuthenticatedUser = Depends(get_current_user)
):
    """
    Endpoint para verificar tokens de reCAPTCHA desde el frontend.

    AUTENTICACIÓN REQUERIDA:
    - Token de Firebase válido

    Returns:
        Resultado de la verificación
    """
    try:
        data = await request.json()
        recaptcha_token = data.get("recaptcha_token")

        if not recaptcha_token:
            raise HTTPException(status_code=400, detail="Token reCAPTCHA requerido")

        # Verificar reCAPTCHA
        is_human = await recaptcha_service.is_human(recaptcha_token)

        if not is_human:
            raise HTTPException(status_code=400, detail="Verificación reCAPTCHA fallida")

        logger.info(f"reCAPTCHA verified for user {user.uid}")

        return SuccessResponse(
            message="reCAPTCHA verificado correctamente",
            data={"is_human": True}
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error verifying reCAPTCHA: {e}")
        raise HTTPException(status_code=500, detail="Error interno del servidor")
