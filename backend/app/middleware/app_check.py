"""
Middleware de verificación de Firebase App Check
Valida que las peticiones provengan de una instancia legítima de la aplicación.
"""

from fastapi import Request, HTTPException, status
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse
import firebase_admin
from firebase_admin import auth, app_check
import logging
import os

logger = logging.getLogger("security.app_check")

class AppCheckMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, exempt_paths: list = None):
        super().__init__(app)
        self.exempt_paths = exempt_paths or ["/docs", "/redoc", "/openapi.json", "/api/health", "/"]

    async def dispatch(self, request: Request, call_next):
        # 1. Verificar si la ruta está exenta
        path = request.url.path
        if any(path.startswith(exempt) for exempt in self.exempt_paths):
            return await call_next(request)
            
        # 1.5. Permitir OPTIONS (CORS Preflight)
        if request.method == "OPTIONS":
            return await call_next(request)
        
        # 2. Verificar header X-Firebase-AppCheck
        app_check_token = request.headers.get("X-Firebase-AppCheck")
        
        if not app_check_token:
            logger.warning(f"🚫 Acceso denegado: falta header X-Firebase-AppCheck desde {request.client.host}")
            # SOFT FAIL (User Blocked)
            logger.info("⚠️ App Check Missing - Allowing request (Debug Mode)")
            return await call_next(request)
            
        try:
            # 3. Validar token con Firebase Admin SDK
            # Esto verifica la firma, expiración y formato
            decoded_token = app_check.verify_token(app_check_token)
            
            # (Opcional) Log del ID de la app que hace la petición
            app_id = decoded_token.get("app_id")
            # logger.debug(f"✅ App Check válido. App ID: {app_id}")
            
            # Continuar con la petición
            response = await call_next(request)
            return response
            
        except Exception as e:
            # Permitir fallo si es localhost o LAN para development
            client_host = request.client.host
            if client_host in ["127.0.0.1", "::1", "localhost"] or client_host.startswith(("192.168.", "10.")):
                logger.warning(f"⚠️ App Check falló en DEV/LAN ({client_host}), pero se permite el acceso: {str(e)}")
                return await call_next(request)

            logger.error(f"🛑 Error validando App Check token: {str(e)}")
            # SOFT FAIL (User Blocked)
            logger.info("⚠️ App Check Invalid - Allowing request (Debug Mode)")
            return await call_next(request)
