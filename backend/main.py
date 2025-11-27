"""
FastAPI Backend for TuCitaSegura (FZ6)
Provides protected API endpoints with Firebase authentication
"""

import os
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from auth_utils import get_current_user, get_optional_user

# Load environment variables
load_dotenv()

# Create FastAPI app
app = FastAPI(
    title="TuCitaSegura API",
    description="Backend API for TuCitaSegura with Firebase authentication",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS Configuration
origins_str = os.getenv(
    "CORS_ORIGINS",
    "http://localhost:3000,https://tucitasegura.vercel.app,https://tucitasegura.com,https://www.tucitasegura.com"
)
origins = [origin.strip() for origin in origins_str.split(",")]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

print(f"✅ CORS enabled for origins: {origins}")


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
        "firebase": "connected",
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
async def protected_route(user: dict = Depends(get_current_user)):
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
        port=8000,
        reload=True if os.getenv("ENVIRONMENT") == "development" else False
    )
