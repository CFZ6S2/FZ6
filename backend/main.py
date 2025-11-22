# Railway-specific FastAPI deployment
# Updated: 2025-11-22 - CORS configuration for tucitasegura.com
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import os
import logging
from datetime import datetime
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

# Security Headers Middleware
try:
    from app.middleware.security_headers import SecurityHeadersMiddleware, get_security_headers_summary
except Exception as e:
    logger = logging.getLogger(__name__)
    logger.warning(f"Could not import SecurityHeadersMiddleware: {e}")
    SecurityHeadersMiddleware = None
    get_security_headers_summary = None

# CSRF Protection Middleware
try:
    from app.middleware.csrf_protection import CSRFProtection, csrf_protect, get_csrf_token
except Exception as e:
    logger = logging.getLogger(__name__)
    logger.warning(f"Could not import CSRFProtection: {e}")
    CSRFProtection = None
    csrf_protect = None
    get_csrf_token = None

# Health Check Service
try:
    from app.services.health import health_service
except Exception as e:
    logger = logging.getLogger(__name__)
    logger.warning(f"Could not import health_service: {e}")
    health_service = None

# Sentry Monitoring Service
try:
    from app.services.monitoring import sentry_service
except Exception as e:
    logger = logging.getLogger(__name__)
    logger.warning(f"Could not import sentry_service: {e}")
    sentry_service = None
try:
    import firebase_admin
    from firebase_admin import credentials
except Exception:
    firebase_admin = None
try:
    from app.core.config import settings
except Exception:
    class _SettingsFallback:
        API_VERSION = os.getenv("API_VERSION", "unknown")
    settings = _SettingsFallback()
try:
    from app.models.schemas import HealthCheck
except Exception:
    HealthCheck = None

try:
    from app.api.payments import router as payments_router
except Exception:
    payments_router = None

try:
    from app.api.emergency_phones import router as emergency_phones_router
except Exception:
    emergency_phones_router = None

try:
    from app.api.v1 import api_v1_router
except Exception:
    api_v1_router = None

try:
    from app.api.admin import admin_router
except Exception:
    logger = logging.getLogger(__name__)
    logger.warning("Could not import admin_router")
    admin_router = None

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Configure rate limiter
limiter = Limiter(key_func=get_remote_address)

# OpenAPI documentation configuration
app = FastAPI(
    title="TuCitaSegura API",
    description="""
## TuCitaSegura - Plataforma de Citas Seguras

API REST para la gestión de citas seguras con características de seguridad avanzadas.

### Características

* **Autenticación**: Firebase Auth con JWT tokens
* **Seguridad**: Rate limiting, CSRF protection, input validation
* **Pagos**: PayPal integration para suscripciones
* **Notificaciones**: Push notifications en tiempo real
* **Eventos VIP**: Sistema de concierge para eventos exclusivos
* **SOS**: Sistema de emergencia integrado

### Seguridad

Todas las peticiones requieren autenticación mediante Firebase JWT token.
Se aplica rate limiting para prevenir abuso.
Los datos sensibles están encriptados en reposo.

### Autenticación

```
Authorization: Bearer <firebase_jwt_token>
```

### Rate Limits

- Endpoints de pago: 10/minuto
- Health check: 60/minuto
- Teléfonos de emergencia: 15/minuto
- Endpoints generales: según configuración
    """,
    version="1.0.0",
    terms_of_service="https://tucitasegura.com/terms",
    contact={
        "name": "TuCitaSegura Support",
        "url": "https://tucitasegura.com/support",
        "email": "support@tucitasegura.com",
    },
    license_info={
        "name": "Proprietary",
    },
    openapi_tags=[
        {
            "name": "health",
            "description": "Health check endpoints para monitoring"
        },
        {
            "name": "v1",
            "description": "API Version 1 - Stable endpoints"
        },
        {
            "name": "info",
            "description": "Información de la API y versiones"
        },
        {
            "name": "payments",
            "description": "Endpoints de pagos y suscripciones (PayPal)"
        },
        {
            "name": "emergency",
            "description": "Gestión de teléfonos de emergencia y SOS"
        },
        {
            "name": "security",
            "description": "Endpoints de seguridad (CSRF, info)"
        }
    ],
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json"
)

# Add rate limiter to app state
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Configuración de CORS para producción
environment = os.getenv("ENVIRONMENT", "development")
debug_mode = os.getenv("DEBUG", "false").lower() == "true"

# CORS origins - configurar según el entorno
if environment == "production":
    required = [
        "https://tucitasegura.com",
        "https://www.tucitasegura.com",
        "https://api.tucitasegura.com",
        "https://tuscitasseguras-2d1a6.web.app",
        "https://tuscitasseguras-2d1a6.firebaseapp.com",
    ]
    env_origins = os.getenv("CORS_ORIGINS", "")
    base = env_origins.split(",") if env_origins else []
    cors_origins = sorted({o.strip() for o in (base + required) if o.strip()})
else:
    # Development - NEVER use wildcard "*" even in dev
    # Security: Only allow specific localhost ports
    cors_origins = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:8000",
        "http://localhost:8080",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:8000",
        "http://127.0.0.1:8080",
    ]
    logger.info(f"Development CORS origins: {cors_origins}")

# IMPORTANT: Middleware order matters! They execute in REVERSE order during response.
# Add Security Headers FIRST so it runs BEFORE CORS in response chain
if SecurityHeadersMiddleware:
    app.add_middleware(SecurityHeadersMiddleware, environment=environment)
    logger.info("Security Headers Middleware added")
else:
    logger.warning("Security Headers Middleware not available")

# Add CORS Middleware LAST so it runs AFTER all other middleware in response chain
# This ensures CORS headers are applied last and not overwritten by other middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["*"],
    max_age=3600  # Cache pre-flight requests for 1 hour
)

# Add CSRF Protection Middleware
# Only enable in production or if explicitly enabled
enable_csrf = os.getenv("ENABLE_CSRF", "false").lower() == "true" or environment == "production"
if CSRFProtection and enable_csrf:
    app.add_middleware(CSRFProtection)
    logger.info("CSRF Protection Middleware added")
elif CSRFProtection:
    logger.info("CSRF Protection available but disabled in development")
else:
    logger.warning("CSRF Protection Middleware not available")

# Incluir routers de la API

# Include versioned API v1
if api_v1_router:
    app.include_router(api_v1_router)
    logger.info("API v1 router incluido")

# Include admin endpoints
if admin_router:
    app.include_router(admin_router)
    logger.info("Admin router incluido")

# Legacy endpoints (backwards compatibility)
# These will be deprecated in favor of versioned endpoints
if payments_router:
    app.include_router(payments_router)
    logger.info("Router de pagos incluido (legacy, use /v1/payments)")

if emergency_phones_router:
    app.include_router(emergency_phones_router)
    logger.info("Router de teléfonos de emergencia incluido (legacy, use /v1/emergency-phones)")

logger.info(f"Environment: {environment}")
logger.info(f"CORS origins: {cors_origins}")
logger.info(f"Debug mode: {debug_mode}")

if firebase_admin and not firebase_admin._apps:
    key_path = os.getenv("FIREBASE_PRIVATE_KEY_PATH", "./firebase-credentials.json")
    env_json = os.getenv("FIREBASE_SERVICE_ACCOUNT", "")
    env_b64 = os.getenv("FIREBASE_SERVICE_ACCOUNT_B64", "")
    try:
        if env_json or env_b64:
            import json, tempfile
            if env_b64:
                import base64
                decoded = base64.b64decode(env_b64).decode("utf-8")
                data = json.loads(decoded)
            else:
                data = json.loads(env_json)
            with tempfile.NamedTemporaryFile("w", delete=False, suffix=".json") as tmp:
                import pathlib
                json.dump(data, tmp)
                tmp_path = str(pathlib.Path(tmp.name))
            cred = credentials.Certificate(tmp_path)
            firebase_admin.initialize_app(cred)
            logger.info("Firebase Admin inicializado desde variable de entorno")
        elif os.path.exists(key_path):
            cred = credentials.Certificate(key_path)
            firebase_admin.initialize_app(cred)
            logger.info("Firebase Admin inicializado")
        else:
            logger.warning("Credenciales de Firebase no encontradas")
    except Exception as e:
        logger.error(f"Error inicializando Firebase Admin: {e}")

# Initialize Sentry for error tracking and monitoring
if sentry_service:
    try:
        if sentry_service.initialize():
            logger.info("Sentry monitoring initialized successfully")
        else:
            logger.info("Sentry monitoring not initialized (DSN not configured or SDK not available)")
    except Exception as e:
        logger.error(f"Error initializing Sentry: {e}")

@app.get(
    "/",
    response_model=HealthCheck if HealthCheck else None,
    tags=["health"],
    summary="Health Check",
    description="Verifica el estado de todos los servicios críticos"
)
@app.get(
    "/health",
    response_model=HealthCheck if HealthCheck else None,
    tags=["health"],
    summary="Health Check",
    description="Verifica el estado de todos los servicios críticos"
)
@limiter.limit("60/minute")
async def health_check(request: Request):
    """
    ## Health Check Endpoint

    Verifica el estado de salud de todos los servicios críticos:

    - **Firestore**: Base de datos
    - **Firebase Auth**: Autenticación
    - **PayPal API**: Procesamiento de pagos
    - **reCAPTCHA**: Protección anti-bots

    ### Response
    - `status`: Estado general (healthy/degraded/unhealthy)
    - `checks`: Estado detallado de cada servicio
    - `elapsed_ms`: Tiempo de respuesta del health check

    ### Caching
    Los resultados se cachean por 30 segundos para mejorar performance.
    Usa `/health/detailed` para forzar un check fresco.
    """
    if health_service:
        # Use comprehensive health check service
        return await health_service.check_all(use_cache=True)
    else:
        # Fallback to basic health check
        try:
            firebase_connected = bool(firebase_admin._apps) if firebase_admin else False
        except Exception:
            firebase_connected = False
        return {
            "status": "healthy",
            "version": getattr(settings, "API_VERSION", os.getenv("API_VERSION", "unknown")),
            "timestamp": datetime.utcnow(),
            "services": {
                "api": "running",
                "firebase": "connected" if firebase_connected else "unavailable",
            },
        }

@app.get(
    "/health/detailed",
    tags=["health"],
    summary="Detailed Health Check",
    description="Health check detallado sin caché (fresh check)"
)
@limiter.limit("30/minute")
async def health_check_detailed(request: Request):
    """
    ## Detailed Health Check (No Cache)

    Fuerza un health check fresco sin usar caché.

    Use este endpoint para:
    - Debugging de problemas de conectividad
    - Validación después de cambios de infraestructura
    - Monitoring detallado

    **Note**: Tiene rate limit más restrictivo (30/min) para evitar sobrecarga.
    """
    if health_service:
        return await health_service.check_all(use_cache=False)
    else:
        return {"error": "Health service not available"}

@app.options("/")
async def root_options():
    logger.info("Root OPTIONS request")
    return JSONResponse({"message": "CORS pre-flight approved"})

@app.options("/health")
async def health_options():
    logger.info("Health OPTIONS request")
    return JSONResponse({"message": "CORS pre-flight approved"})

@app.get("/debug")
@limiter.limit("10/minute")
async def debug(request: Request):
    logger.info("Debug endpoint accessed")
    security_headers = get_security_headers_summary() if get_security_headers_summary else None
    return JSONResponse({
        "env_vars": {k: v for k, v in os.environ.items() if not k.startswith('RAILWAY')},
        "cwd": os.getcwd(),
        "port": os.getenv("PORT", "8000"),
        "python_version": "3.11",
        "security_headers": security_headers
    })

@app.get(
    "/security-info",
    tags=["security"],
    summary="Security Configuration Info",
    description="Información sobre las características de seguridad activas"
)
@limiter.limit("30/minute")
async def security_info(request: Request):
    """
    ## Security Configuration Information

    Retorna información sobre las características de seguridad activas:

    - Security headers configurados
    - CORS origins (ocultos en producción)
    - Rate limiting status
    - Firebase Auth status
    - CSRF protection status

    Útil para validación de configuración y auditorías de seguridad.
    """
    logger.info("Security info endpoint accessed")
    security_headers = get_security_headers_summary() if get_security_headers_summary else None
    return JSONResponse({
        "environment": environment,
        "security_headers": security_headers,
        "cors_origins": cors_origins if environment != "production" else ["[HIDDEN FOR SECURITY]"],
        "rate_limiting": "enabled",
        "firebase_auth": "enabled" if firebase_admin and firebase_admin._apps else "disabled",
        "csrf_protection": "enabled" if enable_csrf else "disabled"
    })

@app.get(
    "/api/csrf-token",
    tags=["security"],
    summary="Get CSRF Token",
    description="Obtiene el token CSRF para la sesión actual"
)
@limiter.limit("60/minute")
async def get_csrf_token_endpoint(request: Request):
    """
    ## Get CSRF Token

    Obtiene el token CSRF para la sesión actual.

    ### Uso
    1. Llama a este endpoint para obtener el token
    2. Incluye el token en el header `X-CSRF-Token` para requests POST/PUT/DELETE/PATCH

    ### Response
    ```json
    {
        "csrf_token": "token_value",
        "header_name": "X-CSRF-Token",
        "info": "Include this token..."
    }
    ```

    El token también se establece en una cookie HttpOnly segura.

    ### Seguridad
    - Token firmado con HMAC
    - Cookie HttpOnly (protección XSS)
    - SameSite=Lax (protección CSRF)
    - Rotación automática después de requests exitosos
    """
    if get_csrf_token:
        try:
            token = get_csrf_token(request)
            return JSONResponse({
                "csrf_token": token,
                "header_name": "X-CSRF-Token",
                "info": "Include this token in the X-CSRF-Token header for POST/PUT/DELETE requests"
            })
        except Exception as e:
            logger.warning(f"Could not get CSRF token: {e}")
            return JSONResponse({
                "message": "CSRF token will be set in cookie after first request",
                "header_name": "X-CSRF-Token"
            })
    else:
        return JSONResponse({
            "message": "CSRF protection not enabled",
            "enabled": False
        })

@app.options("/debug")
async def debug_options():
    logger.info("Debug OPTIONS request")
    return JSONResponse({"message": "CORS pre-flight approved"})

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    logger.info(f"Starting server on 0.0.0.0:{port}")
    uvicorn.run(app, host="0.0.0.0", port=port, log_level="info")
