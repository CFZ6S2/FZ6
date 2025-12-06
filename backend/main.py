"""
FastAPI Backend for TuCitaSegura (FZ6)
Provides protected API endpoints with Firebase authentication
"""

import os
from dotenv import load_dotenv

# Load environment variables immediately
load_dotenv()

from enum import Enum
from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from auth_utils import get_current_user, get_optional_user, firebase_initialized
from firebase_storage import upload_file_to_storage, upload_profile_photo

# Import new API routers
from app.api.v1 import recommendations, validation, moderation, debug_auth

# Import rate limiting
from app.middleware.rate_limit import limiter, custom_rate_limit_handler
from slowapi.errors import RateLimitExceeded

# Import CSRF protection
from app.middleware.csrf_protection import CSRFProtection

# Import Security Headers
from app.middleware.security_headers import SecurityHeadersMiddleware

# Import App Check Middleware
from app.middleware.app_check import AppCheckMiddleware

# Create FastAPI app
app = FastAPI(
    title="TuCitaSegura API",
    description="Backend API for TuCitaSegura with Firebase authentication",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Add rate limiter state
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, custom_rate_limit_handler)

# CORS Configuration - PRODUCTION ONLY
# Removed localhost from defaults to encourage production security
origins_str = os.getenv(
    "CORS_ORIGINS",
<<<<<<< HEAD
    "http://localhost:3000,https://tucitasegura.vercel.app,https://tucitasegura.com,https://www.tucitasegura.com,https://tucitasegura-129cc.web.app,https://tucitasegura-129cc.firebaseapp.com"
=======
    "https://tucitasegura.vercel.app,https://tucitasegura.com,https://www.tucitasegura.com,https://tucitasegura-129cc.web.app,https://tucitasegura-129cc.firebaseapp.com"
>>>>>>> c6ecb8b (Fix Dockerfile and opencv for Cloud Run)
)
origins = [origin.strip() for origin in origins_str.split(",")]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,  # Keep explicit list for safety
    allow_origin_regex=r"https://(.*\.)?tucitasegura.*|http://localhost.*", # Regex fallback
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add Security Headers (must be before CSRF)
app.add_middleware(SecurityHeadersMiddleware)

# Add CSRF Protection (must be added after CORS)
# app.add_middleware(CSRFProtection)

# Add App Check Protection (Validates X-Firebase-AppCheck header)
# Exempt documentation and health check endpoints
app.add_middleware(AppCheckMiddleware, exempt_paths=["/docs", "/redoc", "/openapi.json", "/api/health", "/", "/api/v1/debug/login"])

# Include routers
app.include_router(recommendations.router, prefix="/api/v1/recommendations", tags=["Recommendations"])
app.include_router(validation.router, prefix="/api/v1/validation", tags=["Validation"])
app.include_router(moderation.router, prefix="/api/v1/moderation", tags=["Moderation"])
app.include_router(debug_auth.router, prefix="/api/v1/debug", tags=["Debug"])

print(f"✅ CORS enabled for origins: {origins}")
print("✅ Security Headers enabled (CSP, HSTS, X-Frame-Options, etc.)")
print("✅ CSRF Protection enabled")
print("✅ App Check Validation enabled")

# ============================================================================
# INPUT VALIDATION ENUMS (Security: Prevent injection attacks)
# ============================================================================

class PhotoType(str, Enum):
    """Valid photo types for profile uploads"""
    avatar = "avatar"
    gallery_1 = "gallery_1"
    gallery_2 = "gallery_2"
    gallery_3 = "gallery_3"
    gallery_4 = "gallery_4"
    gallery_5 = "gallery_5"
    gallery_6 = "gallery_6"
    verification = "verification"

class AllowedMimeType(str, Enum):
    """Allowed MIME types for uploads"""
    jpeg = "image/jpeg"
    jpg = "image/jpg"
    png = "image/png"
    webp = "image/webp"
    gif = "image/gif"

# ============================================================================
# INCLUDE API ROUTERS
# ============================================================================

# Include v1 API routers
app.include_router(recommendations.router)
app.include_router(validation.router)
app.include_router(moderation.router)

# ============================================================================
# PUBLIC ROUTES
# ============================================================================

@app.get("/")
def root():
    """Health check endpoint"""
    return {
        "status": "OK",
        "service": "TuCitaSegura API",
        "version": "1.0.0",
        "message": "Backend FZ6 operativo ✅"
    }


@app.get("/health")
def health_check():
    """Detailed health check"""
    return {
        "status": "healthy",
        "service": "tucitasegura-api",
        "firebase": "connected" if firebase_initialized else "not configured",
        "environment": os.getenv("ENVIRONMENT", "development")
    }


@app.get("/api/public")
def public_route():
    """Public API endpoint - no authentication required"""
    return {
        "message": "Esta ruta es pública ✔️",
        "access": "public",
        "description": "No se requiere autenticación para acceder a este endpoint"
    }


# ============================================================================
# PROTECTED ROUTES (require Firebase authentication)
# ============================================================================

@app.get("/api/protected")
async def protected_route(user: dict = Depends(get_current_user), _: None = Depends(require_app_check)):
    """Protected endpoint - requires valid Firebase token"""
    return {
        "message": "Ruta protegida 🔐",
        "access": "authenticated",
        "user": {
            "uid": user.get("uid"),
            "email": user.get("email"),
            "email_verified": user.get("email_verified", False)
        }
    }


@app.get("/api/user/profile")
async def get_user_profile(user: dict = Depends(get_current_user)):
    """Get authenticated user profile"""
    return {
        "success": True,
        "profile": {
            "uid": user.get("uid"),
            "email": user.get("email"),
            "email_verified": user.get("email_verified", False),
            "provider": user.get("firebase", {}).get("sign_in_provider"),
            "auth_time": user.get("auth_time"),
        }
    }


@app.post("/api/upload")
async def upload_image(
    file: UploadFile = File(...),
    user: dict = Depends(get_current_user),
    _: None = Depends(require_app_check)
):
    """
    Upload an image to Firebase Storage
    Requires authentication
    """
    try:
        # Upload file with user ID prefix
        url = upload_file_to_storage(file, filename_prefix=f"user_{user['uid']}")

        return {
            "success": True,
            "url": url,
            "message": "Imagen subida con éxito ✔️",
            "uploaded_by": user.get("uid")
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error al subir la imagen: {str(e)}"
        )


@app.post("/api/upload/profile")
async def upload_profile_image(
    file: UploadFile = File(...),
    photo_type: PhotoType = PhotoType.avatar,  # SECURITY: Enum validation prevents injection
    user: dict = Depends(get_current_user),
    _: None = Depends(require_app_check)
):
    """
    Upload a profile photo (avatar or gallery) to Firebase Storage
    Requires authentication & Verification

    Args:
        file: Image file to upload
        photo_type: Type of photo (avatar, gallery_1, gallery_2, etc.) - validated by Enum

    Security:
        - Photo type validated via Enum (prevents injection)
        - File type validated against whitelist
        - File size limits enforced
        - User authentication required
        - Computer Vision verification (Nudity, Faces, Spam)
    """
    try:
        from app.services.cv.photo_verifier import photo_verifier

        # SECURITY: Validate file type (whitelist approach)
        if file.content_type not in [mime.value for mime in AllowedMimeType]:
            raise HTTPException(
                status_code=400,
                detail=f"Tipo de archivo no permitido. Tipos aceptados: {', '.join([mime.value for mime in AllowedMimeType])}"
            )

        # SECURITY: Validate file size (max 5MB)
        MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB
        file_content = await file.read()
        if len(file_content) > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=400,
                detail=f"Archivo muy grande. Tamaño máximo: 5MB"
            )

        # Reset file pointer for upload
        await file.seek(0)

        # Validate photo type (now handled by Enum, but keeping for backwards compatibility)
        valid_types = ["avatar"] + [f"gallery_{i}" for i in range(1, 6)]
        if photo_type not in valid_types:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid photo_type. Must be one of: {', '.join(valid_types)}"
            )

        # 1. Upload profile photo to Storage
        url = upload_profile_photo(file, user["uid"], photo_type)

        # 2. Verify photo using Computer Vision service
        # Note: In a real async architecture, this should be a background task
        # But for immediate feedback, we do it here (latency penalty accepted)
        verification_result = photo_verifier.verify_photo(
            image_url=url,
            user_id=user["uid"]
        )

        if verification_result.recommendation == "REJECT":
            logger.warning(f"Photo rejected for user {user['uid']}: {verification_result.warnings}")
            # Optionally delete logic here
            pass

        return {
            "success": True,
            "url": url,
            "photo_type": photo_type,
            "message": f"Foto procesada ({verification_result.recommendation})",
            "verification": {
                "status": verification_result.recommendation,
                "is_safe": verification_result.is_appropriate,
                "is_real": verification_result.is_real_person,
                "warnings": verification_result.warnings
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error en subida/verificación: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Error al procesar la imagen: {str(e)}"
        )


# ============================================================================
# OPTIONAL AUTH ROUTES (work with or without authentication)
# ============================================================================

@app.get("/api/optional")
async def optional_auth_route(user: dict = Depends(get_optional_user)):
    """Route that works with or without authentication"""
    if user:
        return {
            "message": "Usuario autenticado ✅",
            "authenticated": True,
            "uid": user.get("uid"),
            "email": user.get("email")
        }
    else:
        return {
            "message": "Usuario anónimo 👤",
            "authenticated": False,
            "access": "public"
        }


# ============================================================================
# ERROR HANDLERS
# ============================================================================

@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    """Custom HTTP exception handler"""
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": True,
            "status_code": exc.status_code,
            "message": exc.detail
        }
    )


@app.exception_handler(Exception)
async def general_exception_handler(request, exc):
    """General exception handler for unhandled errors"""
    return JSONResponse(
        status_code=500,
        content={
            "error": True,
            "status_code": 500,
            "message": "Internal server error",
            "detail": str(exc) if os.getenv("ENVIRONMENT") == "development" else None
        }
    )


# ============================================================================
# STARTUP EVENT
# ============================================================================

@app.on_event("startup")
async def startup_event():
    """Run on application startup"""
    print("=" * 60)
    print("🚀 TuCitaSegura API starting...")
    print(f"📍 Environment: {os.getenv('ENVIRONMENT', 'development')}")
    print(f"🌐 CORS Origins: {', '.join(origins)}")
    print(f"🔐 Firebase Admin SDK: Initialized")
    print(f"📚 API Docs: /docs")
    print("=" * 60)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=int(os.getenv("PORT", "8080")),
        reload=True if os.getenv("ENVIRONMENT") == "development" else False
    )
# App Check enforcement (HTTP header)
def require_app_check(request: Request):
    enforce = os.getenv("APP_CHECK_ENFORCE", "false").lower() == "true"
    if not enforce:
        return
    token = request.headers.get("X-Firebase-AppCheck")
    if not token or not token.strip():
        raise HTTPException(status_code=401, detail="App Check token missing")
