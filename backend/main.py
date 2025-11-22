# Railway-specific FastAPI deployment
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

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Configure rate limiter
limiter = Limiter(key_func=get_remote_address)

app = FastAPI(title="TuCitaSegura Railway")

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

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["*"],
    max_age=3600  # Cache pre-flight requests for 1 hour
)

# Add Security Headers Middleware
if SecurityHeadersMiddleware:
    app.add_middleware(SecurityHeadersMiddleware, environment=environment)
    logger.info("Security Headers Middleware added")
else:
    logger.warning("Security Headers Middleware not available")

# Incluir routers de la API
if payments_router:
    app.include_router(payments_router)
    logger.info("Router de pagos incluido")

if emergency_phones_router:
    app.include_router(emergency_phones_router)
    logger.info("Router de teléfonos de emergencia incluido")

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

@app.get("/", response_model=HealthCheck if HealthCheck else None)
@app.get("/health", response_model=HealthCheck if HealthCheck else None)
@limiter.limit("60/minute")
async def health_check(request: Request):
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
            "ml": "loaded",
        },
    }

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

@app.get("/security-info")
@limiter.limit("30/minute")
async def security_info(request: Request):
    """Get information about active security features."""
    logger.info("Security info endpoint accessed")
    security_headers = get_security_headers_summary() if get_security_headers_summary else None
    return JSONResponse({
        "environment": environment,
        "security_headers": security_headers,
        "cors_origins": cors_origins if environment != "production" else ["[HIDDEN FOR SECURITY]"],
        "rate_limiting": "enabled",
        "firebase_auth": "enabled" if firebase_admin and firebase_admin._apps else "disabled"
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
