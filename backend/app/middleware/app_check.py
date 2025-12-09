"""
Middleware de verificación de Firebase App Check
Valida que las peticiones provengan de una instancia legítima de la aplicación.
Incluye logging estructurado y métricas para rastrear solicitudes legadas.
"""

from fastapi import Request, HTTPException, status
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse
import firebase_admin
from firebase_admin import auth, app_check
import logging
import os
from typing import Optional
from datetime import datetime

from app.utils.app_check_metrics import (
    get_metrics,
    detect_legacy_sdk,
    extract_client_version
)

logger = logging.getLogger("security.app_check")


def _extract_auth_token(request: Request) -> Optional[str]:
    """
    Extraer token de Firebase Auth del header Authorization si existe.
    
    Args:
        request: FastAPI Request object
        
    Returns:
        Token string o None
    """
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        return auth_header[7:]
    return None


def _get_user_id_from_token(token: Optional[str]) -> Optional[str]:
    """
    Intentar extraer user ID del token de Firebase Auth sin validar completamente.
    Solo para logging - no usar para autorización.
    
    Args:
        token: Firebase ID token
        
    Returns:
        User ID o None
    """
    if not token:
        return None
    
    try:
        # Decodificar sin verificar (solo para logging de métricas)
        import base64
        import json
        # JWT tiene formato: header.payload.signature
        parts = token.split('.')
        if len(parts) >= 2:
            # Decodificar payload
            payload = parts[1]
            # Agregar padding si es necesario
            padding = 4 - len(payload) % 4
            if padding != 4:
                payload += '=' * padding
            decoded = base64.urlsafe_b64decode(payload)
            claims = json.loads(decoded)
            return claims.get('uid') or claims.get('user_id')
    except Exception:
        # Si falla, no es crítico - solo para logging
        pass
    
    return None


class AppCheckMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, exempt_paths: list = None):
        super().__init__(app)
        self.exempt_paths = exempt_paths or ["/docs", "/redoc", "/openapi.json", "/api/health", "/"]
        self.metrics = get_metrics()

    async def dispatch(self, request: Request, call_next):
        # 1. Verificar si la ruta está exenta
        path = request.url.path
        if any(path.startswith(exempt) for exempt in self.exempt_paths):
            return await call_next(request)
            
        # 1.5. Permitir OPTIONS (CORS Preflight)
        if request.method == "OPTIONS":
            return await call_next(request)
        
        # 2. Extraer información del cliente para logging y métricas
        client_host = request.client.host if request.client else "unknown"
        user_agent = request.headers.get("User-Agent", "")
        client_version = extract_client_version(dict(request.headers))
        auth_token = _extract_auth_token(request)
        user_id = _get_user_id_from_token(auth_token) if auth_token else None
        has_auth = bool(auth_token)
        
        # 3. Detectar si parece ser una versión antigua del SDK
        is_legacy = detect_legacy_sdk(user_agent, client_version)
        
        # 4. Verificar header X-Firebase-AppCheck
        app_check_token = request.headers.get("X-Firebase-AppCheck")
        
        if not app_check_token:
            # Logging estructurado para solicitudes sin App Check
            log_data = {
                "event": "app_check_missing",
                "type": "legacy_request" if is_legacy else "missing_token",
                "path": path,
                "method": request.method,
                "client_host": client_host,
                "client_version": client_version or "unknown",
                "user_agent": user_agent[:200] if user_agent else None,  # Limitar longitud
                "has_auth": has_auth,
                "user_id": user_id,
                "timestamp": datetime.utcnow().isoformat(),
                "is_legacy_sdk": is_legacy
            }
            
            logger.warning(
                f"Request without App Check token: {path} from {client_host}",
                extra={"log_data": log_data}
            )
            
            # Registrar en métricas
            self.metrics.record_request(
                has_app_check=False,
                client_version=client_version,
                path=path,
                is_legacy=is_legacy,
                token_valid=False
            )
            
            # SOFT FAIL - Permitir solicitud (Debug Mode)
            logger.info("⚠️ App Check Missing - Allowing request (Soft Enforcement)")
            return await call_next(request)
            
        try:
            # 5. Validar token con Firebase Admin SDK
            decoded_token = app_check.verify_token(app_check_token)
            app_id = decoded_token.get("app_id")
            
            # Logging estructurado para solicitudes exitosas
            log_data = {
                "event": "app_check_verified",
                "path": path,
                "method": request.method,
                "client_host": client_host,
                "client_version": client_version or "unknown",
                "app_id": app_id,
                "has_auth": has_auth,
                "user_id": user_id,
                "timestamp": datetime.utcnow().isoformat()
            }
            
            logger.debug(
                f"App Check verified: {path} (App ID: {app_id})",
                extra={"log_data": log_data}
            )
            
            # Registrar en métricas
            self.metrics.record_request(
                has_app_check=True,
                client_version=client_version,
                path=path,
                is_legacy=is_legacy,
                token_valid=True
            )
            
            # Continuar con la petición
            response = await call_next(request)
            return response
            
        except Exception as e:
            # Permitir fallo si es localhost o LAN para development
            is_dev = client_host in ["127.0.0.1", "::1", "localhost"] or client_host.startswith(("192.168.", "10."))
            
            if is_dev:
                logger.warning(
                    f"App Check failed in DEV/LAN ({client_host}), allowing access: {str(e)}",
                    extra={
                        "log_data": {
                            "event": "app_check_dev_bypass",
                            "path": path,
                            "client_host": client_host,
                            "error": str(e)
                        }
                    }
                )
                return await call_next(request)

            # Logging estructurado para tokens inválidos
            log_data = {
                "event": "app_check_invalid",
                "path": path,
                "method": request.method,
                "client_host": client_host,
                "client_version": client_version or "unknown",
                "user_agent": user_agent[:200] if user_agent else None,
                "has_auth": has_auth,
                "user_id": user_id,
                "error": str(e),
                "error_type": type(e).__name__,
                "timestamp": datetime.utcnow().isoformat(),
                "is_legacy_sdk": is_legacy
            }
            
            logger.error(
                f"Error validating App Check token: {str(e)}",
                extra={"log_data": log_data}
            )
            
            # Registrar en métricas
            self.metrics.record_request(
                has_app_check=True,  # Tenía token pero inválido
                client_version=client_version,
                path=path,
                is_legacy=is_legacy,
                token_valid=False
            )
            
            # SOFT FAIL - Permitir solicitud (Debug Mode)
            logger.info("⚠️ App Check Invalid - Allowing request (Soft Enforcement)")
            return await call_next(request)
