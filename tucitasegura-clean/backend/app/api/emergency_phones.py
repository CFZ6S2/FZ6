"""
Endpoints para gestión de teléfonos de emergencia - SOLO ADMIN Y USUARIO
"""
from fastapi import APIRouter, HTTPException, Request, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import logging
from typing import List, Optional

from app.models.schemas import (
    EmergencyPhoneCreate,
    EmergencyPhoneResponse,
    EmergencyPhoneUpdate,
    EmergencyPhoneListResponse,
    SuccessResponse
)
from app.services.security.recaptcha_service import recaptcha_service
from app.services.firestore.emergency_phones_service import emergency_phone_service

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/emergency", tags=["emergency-phones"])

security = HTTPBearer()

async def verify_admin_access(credentials: HTTPAuthorizationCredentials = Security(security)):
    """Verifica que el usuario sea administrador"""
    token = credentials.credentials
    if token != "admin_token_secreto":
        raise HTTPException(status_code=403, detail="Acceso denegado. Se requieren privilegios de administrador")
    return {"user_id": "admin", "is_admin": True}

async def verify_user_access(request: Request, credentials: HTTPAuthorizationCredentials = Security(security), user_id: Optional[str] = None):
    """Verifica que el usuario tenga acceso a los datos"""
    token = credentials.credentials
    if token == "admin_token_secreto":
        return {"user_id": "admin", "is_admin": True}
    if user_id and token != f"user_token_{user_id}":
        raise HTTPException(status_code=403, detail="Acceso denegado a datos de otro usuario")
    return {"user_id": user_id or "current_user", "is_admin": False}

@router.post("/phones", response_model=EmergencyPhoneResponse)
async def create_emergency_phone(phone_data: EmergencyPhoneCreate, request: Request, credentials: HTTPAuthorizationCredentials = Security(security), user_id: str = None):
    """Crea un nuevo teléfono de emergencia para un usuario"""
    try:
        auth_info = await verify_user_access(request, credentials, user_id)
        target_user_id = user_id or auth_info["user_id"]
        
        if not auth_info["is_admin"]:
            recaptcha_token = request.headers.get("X-Recaptcha-Token")
            if not recaptcha_token:
                raise HTTPException(status_code=400, detail="Token reCAPTCHA requerido")
            is_human = await recaptcha_service.is_human(recaptcha_token)
            if not is_human:
                raise HTTPException(status_code=400, detail="Verificación reCAPTCHA fallida")
        
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
async def get_emergency_phones(request: Request, credentials: HTTPAuthorizationCredentials = Security(security), user_id: Optional[str] = None, page: int = 1, limit: int = 50):
    """Obtiene los teléfonos de emergencia de un usuario"""
    try:
        auth_info = await verify_user_access(request, credentials, user_id)
        if auth_info["is_admin"] and not user_id:
            raise HTTPException(status_code=501, detail="Consulta de todos los teléfonos no implementada aún")
        else:
            target_user_id = user_id or auth_info["user_id"]
            phones = await emergency_phone_service.get_user_emergency_phones(target_user_id)
        return EmergencyPhoneListResponse(phones=phones, total_count=len(phones))
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error obteniendo teléfonos de emergencia: {e}")
        raise HTTPException(status_code=500, detail="Error interno del servidor")

@router.get("/phones/{phone_id}", response_model=EmergencyPhoneResponse)
async def get_emergency_phone(phone_id: str, request: Request, credentials: HTTPAuthorizationCredentials = Security(security), user_id: Optional[str] = None):
    """Obtiene un teléfono de emergencia específico"""
    try:
        auth_info = await verify_user_access(request, credentials, user_id)
        phone = await emergency_phone_service.get_emergency_phone(phone_id, user_id)
        if not phone:
            raise HTTPException(status_code=404, detail="Teléfono de emergencia no encontrado")
        return EmergencyPhoneResponse(**phone)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error obteniendo teléfono de emergencia {phone_id}: {e}")
        raise HTTPException(status_code=500, detail="Error interno del servidor")

@router.put("/phones/{phone_id}", response_model=EmergencyPhoneResponse)
async def update_emergency_phone(phone_id: str, phone_data: EmergencyPhoneUpdate, request: Request, credentials: HTTPAuthorizationCredentials = Security(security), user_id: Optional[str] = None):
    """Actualiza un teléfono de emergencia existente"""
    try:
        auth_info = await verify_user_access(request, credentials, user_id)
        target_user_id = user_id or auth_info["user_id"]
        
        if not auth_info["is_admin"]:
            recaptcha_token = request.headers.get("X-Recaptcha-Token")
            if not recaptcha_token:
                raise HTTPException(status_code=400, detail="Token reCAPTCHA requerido")
            is_human = await recaptcha_service.is_human(recaptcha_token)
            if not is_human:
                raise HTTPException(status_code=400, detail="Verificación reCAPTCHA fallida")
        
        update_data = phone_data.dict(exclude_unset=True)
        updated_phone = await emergency_phone_service.update_emergency_phone(phone_id, target_user_id, update_data)
        if not updated_phone:
            raise HTTPException(status_code=404, detail="Teléfono de emergencia no encontrado")
        logger.info(f"Teléfono de emergencia actualizado: {phone_id}")
        return EmergencyPhoneResponse(**updated_phone)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error actualizando teléfono de emergencia {phone_id}: {e}")
        raise HTTPException(status_code=500, detail="Error interno del servidor")

@router.delete("/phones/{phone_id}")
async def delete_emergency_phone(phone_id: str, request: Request, credentials: HTTPAuthorizationCredentials = Security(security), user_id: Optional[str] = None):
    """Elimina un teléfono de emergencia"""
    try:
        auth_info = await verify_user_access(request, credentials, user_id)
        target_user_id = user_id or auth_info["user_id"]
        
        if not auth_info["is_admin"]:
            recaptcha_token = request.headers.get("X-Recaptcha-Token")
            if not recaptcha_token:
                raise HTTPException(status_code=400, detail="Token reCAPTCHA requerido")
            is_human = await recaptcha_service.is_human(recaptcha_token)
            if not is_human:
                raise HTTPException(status_code=400, detail="Verificación reCAPTCHA fallida")
        
        success = await emergency_phone_service.delete_emergency_phone(phone_id, target_user_id)
        if not success:
            raise HTTPException(status_code=404, detail="Teléfono de emergencia no encontrado")
        logger.info(f"Teléfono de emergencia eliminado: {phone_id}")
        return SuccessResponse(success=True, message="Teléfono de emergencia eliminado correctamente")
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error eliminando teléfono de emergencia {phone_id}: {e}")
        raise HTTPException(status_code=500, detail="Error interno del servidor")