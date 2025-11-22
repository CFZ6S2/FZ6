"""
Endpoints para gestión de teléfonos de emergencia.
Solo accesible por administradores y el propio usuario.
"""
from fastapi import APIRouter, HTTPException, Depends, Request, Security
from fastapi.responses import JSONResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import logging
from typing import List, Optional
from datetime import datetime

from app.models.schemas import (
    EmergencyPhoneCreate,
    EmergencyPhoneResponse,
    EmergencyPhoneUpdate,
    EmergencyPhoneListResponse,
    SuccessResponse,
    ErrorResponse
)
from app.services.security.recaptcha_service import recaptcha_service
from app.services.firestore.emergency_phones_service import emergency_phone_service

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/emergency", tags=["emergency-phones"])

# Configuración de seguridad
security = HTTPBearer()

async def verify_admin_access(credentials: HTTPAuthorizationCredentials = Security(security)):
    """
    Verifica que el usuario sea administrador.
    En una implementación real, verificarías el token JWT y los roles.
    """
    # TODO: Implementar verificación real de JWT y roles de administrador
    # Por ahora, simular verificación
    token = credentials.credentials
    
    # Simular verificación - en producción usar Firebase Auth o similar
    if token != "admin_token_secreto":
        raise HTTPException(status_code=403, detail="Acceso denegado. Se requieren privilegios de administrador")
    
    return {"user_id": "admin", "is_admin": True}

async def verify_user_access(
    request: Request,
    credentials: HTTPAuthorizationCredentials = Security(security),
    user_id: Optional[str] = None
):
    """
    Verifica que el usuario tenga acceso a los datos.
    Los usuarios solo pueden acceder a sus propios datos, los admins a todos.
    """
    # TODO: Implementar verificación real de JWT
    token = credentials.credentials
    
    # Simular verificación básica
    if token == "admin_token_secreto":
        return {"user_id": "admin", "is_admin": True}
    
    # Para usuarios normales, verificar que acceden solo a sus datos
    if user_id and token != f"user_token_{user_id}":
        raise HTTPException(status_code=403, detail="Acceso denegado a datos de otro usuario")
    
    return {"user_id": user_id or "current_user", "is_admin": False}

@router.post("/phones", response_model=EmergencyPhoneResponse)
async def create_emergency_phone(
    phone_data: EmergencyPhoneCreate,
    request: Request,
    credentials: HTTPAuthorizationCredentials = Security(security),
    user_id: str = None
):
    """
    Crea un nuevo teléfono de emergencia para un usuario.
    
    Args:
        phone_data: Datos del teléfono de emergencia
        user_id: (Opcional) ID del usuario. Si es admin, puede especificar user_id
    
    Returns:
        Teléfono de emergencia creado
    """
    try:
        # Verificar acceso
        auth_info = await verify_user_access(request, credentials, user_id)
        target_user_id = user_id or auth_info["user_id"]
        
        # Validar reCAPTCHA para usuarios no administradores
        if not auth_info["is_admin"]:
            recaptcha_token = request.headers.get("X-Recaptcha-Token")
            if not recaptcha_token:
                raise HTTPException(status_code=400, detail="Token reCAPTCHA requerido")
            
            is_human = await recaptcha_service.is_human(recaptcha_token)
            if not is_human:
                raise HTTPException(status_code=400, detail="Verificación reCAPTCHA fallida")
        
        # Guardar en Firestore usando el servicio
        phone_dict = phone_data.dict()
        new_phone = await emergency_phone_service.create_emergency_phone(target_user_id, phone_dict)
        
        logger.info(f"Teléfono de emergencia creado para usuario {target_user_id}: {new_phone['phone_number']}")
        
        return EmergencyPhoneResponse(**new_phone)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creando teléfono de emergencia: {e}")
        raise HTTPException(status_code=500, detail="Error interno del servidor")

@router.get("/phones", response_model=EmergencyPhoneListResponse)
async def get_emergency_phones(
    request: Request,
    credentials: HTTPAuthorizationCredentials = Security(security),
    user_id: Optional[str] = None,
    page: int = 1,
    limit: int = 50
):
    """
    Obtiene los teléfonos de emergencia de un usuario.
    Los administradores pueden ver todos los teléfonos.
    
    Args:
        user_id: (Opcional) Filtrar por usuario específico
        page: Número de página para paginación
        limit: Límite de resultados por página
    
    Returns:
        Lista de teléfonos de emergencia
    """
    try:
        auth_info = await verify_user_access(request, credentials, user_id)
        
        # Consultar teléfonos reales de Firestore
        if auth_info["is_admin"] and not user_id:
            # TODO: Implementar consulta para que admin vea todos los teléfonos
            # Por ahora, solo permitir consulta específica por usuario
            raise HTTPException(status_code=501, detail="Consulta de todos los teléfonos no implementada aún")
        else:
            # Usuario viendo sus propios teléfonos o admin viendo teléfonos específicos
            target_user_id = user_id or auth_info["user_id"]
            phones = await emergency_phone_service.get_user_emergency_phones(target_user_id)
        
        return EmergencyPhoneListResponse(
            phones=phones,
            total_count=len(phones)
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error obteniendo teléfonos de emergencia: {e}")
        raise HTTPException(status_code=500, detail="Error interno del servidor")

@router.get("/phones/{phone_id}", response_model=EmergencyPhoneResponse)
async def get_emergency_phone(
    phone_id: str,
    request: Request,
    credentials: HTTPAuthorizationCredentials = Security(security)
):
    """
    Obtiene un teléfono de emergencia específico por ID.
    """
    try:
        auth_info = await verify_user_access(request, credentials)
        
        # Consultar teléfono real de Firestore
        phone_data = await emergency_phone_service.get_emergency_phone(auth_info["user_id"], phone_id)
        
        if not phone_data:
            raise HTTPException(status_code=404, detail="Teléfono no encontrado")
        
        # Verificar que el usuario tiene acceso a este teléfono
        if not auth_info["is_admin"] and phone_data["user_id"] != auth_info["user_id"]:
            raise HTTPException(status_code=403, detail="Acceso denegado")
        
        return EmergencyPhoneResponse(**phone_data)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error obteniendo teléfono de emergencia {phone_id}: {e}")
        raise HTTPException(status_code=500, detail="Error interno del servidor")

@router.put("/phones/{phone_id}", response_model=EmergencyPhoneResponse)
async def update_emergency_phone(
    phone_id: str,
    phone_data: EmergencyPhoneUpdate,
    request: Request,
    credentials: HTTPAuthorizationCredentials = Security(security)
):
    """
    Actualiza un teléfono de emergencia existente.
    """
    try:
        auth_info = await verify_user_access(request, credentials)
        
        # Verificar que el teléfono existe y el usuario tiene acceso
        existing_phone = await emergency_phone_service.get_emergency_phone(auth_info["user_id"], phone_id)
        
        if not existing_phone:
            raise HTTPException(status_code=404, detail="Teléfono no encontrado")
        
        # Verificar acceso
        if not auth_info["is_admin"] and existing_phone["user_id"] != auth_info["user_id"]:
            raise HTTPException(status_code=403, detail="Acceso denegado")
        
        # Aplicar actualizaciones
        update_data = phone_data.dict(exclude_unset=True)
        
        # Actualizar en Firestore
        updated_phone = await emergency_phone_service.update_emergency_phone(
            existing_phone["user_id"], phone_id, update_data
        )
        
        logger.info(f"Teléfono de emergencia {phone_id} actualizado")
        
        return EmergencyPhoneResponse(**updated_phone)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error actualizando teléfono de emergencia {phone_id}: {e}")
        raise HTTPException(status_code=500, detail="Error interno del servidor")

@router.delete("/phones/{phone_id}", response_model=SuccessResponse)
async def delete_emergency_phone(
    phone_id: str,
    request: Request,
    credentials: HTTPAuthorizationCredentials = Security(security)
):
    """
    Elimina un teléfono de emergencia.
    """
    try:
        auth_info = await verify_user_access(request, credentials)
        
        # Verificar que el teléfono existe y el usuario tiene acceso
        existing_phone = await emergency_phone_service.get_emergency_phone(auth_info["user_id"], phone_id)
        
        if not existing_phone:
            raise HTTPException(status_code=404, detail="Teléfono no encontrado")
        
        # Verificar acceso
        if not auth_info["is_admin"] and existing_phone["user_id"] != auth_info["user_id"]:
            raise HTTPException(status_code=403, detail="Acceso denegado")
        
        # Eliminar de Firestore
        await emergency_phone_service.delete_emergency_phone(existing_phone["user_id"], phone_id)
        
        logger.info(f"Teléfono de emergencia {phone_id} eliminado")
        
        return SuccessResponse(
            message="Teléfono de emergencia eliminado correctamente",
            data={"phone_id": phone_id}
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error eliminando teléfono de emergencia {phone_id}: {e}")
        raise HTTPException(status_code=500, detail="Error interno del servidor")

@router.post("/phones/{phone_id}/verify", response_model=EmergencyPhoneResponse)
async def verify_emergency_phone(
    phone_id: str,
    request: Request,
    credentials: HTTPAuthorizationCredentials = Security(security)
):
    """
    Marca un teléfono de emergencia como verificado.
    Solo accesible por administradores.
    """
    try:
        # Verificar que es administrador
        auth_info = await verify_admin_access(credentials)
        
        if not auth_info["is_admin"]:
            raise HTTPException(status_code=403, detail="Se requieren privilegios de administrador")
        
        # Verificar que el teléfono existe
        existing_phone = await emergency_phone_service.get_emergency_phone(auth_info["user_id"], phone_id)
        
        if not existing_phone:
            raise HTTPException(status_code=404, detail="Teléfono no encontrado")
        
        # Marcar como verificado en Firestore
        verified_phone = await emergency_phone_service.verify_emergency_phone(
            existing_phone["user_id"], phone_id
        )
        
        logger.info(f"Teléfono de emergencia {phone_id} verificado por administrador")
        
        return EmergencyPhoneResponse(**verified_phone)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error verificando teléfono de emergencia {phone_id}: {e}")
        raise HTTPException(status_code=500, detail="Error interno del servidor")

@router.post("/recaptcha/verify", response_model=SuccessResponse)
async def verify_recaptcha(
    request: Request,
    credentials: HTTPAuthorizationCredentials = Security(security)
):
    """
    Endpoint para verificar tokens de reCAPTCHA desde el frontend.
    """
    try:
        # Verificar acceso básico
        await verify_user_access(request, credentials)
        
        data = await request.json()
        recaptcha_token = data.get("recaptcha_token")
        
        if not recaptcha_token:
            raise HTTPException(status_code=400, detail="Token reCAPTCHA requerido")
        
        # Verificar reCAPTCHA
        is_human = await recaptcha_service.is_human(recaptcha_token)
        
        if not is_human:
            raise HTTPException(status_code=400, detail="Verificación reCAPTCHA fallida")
        
        return SuccessResponse(
            message="reCAPTCHA verificado correctamente",
            data={"is_human": True}
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error verificando reCAPTCHA: {e}")
        raise HTTPException(status_code=500, detail="Error interno del servidor")