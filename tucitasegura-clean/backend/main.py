"""
FastAPI application - LIMPIO Y ESENCIAL
"""
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="TucitaSegura Security API",
    description="API para gestión de seguridad y teléfonos de emergencia",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "https://tucitasegura.com"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

try:
    from app.api.emergency_phones import router as emergency_phones_router
    app.include_router(emergency_phones_router)
    logger.info("Router de teléfonos de emergencia incluido")
except Exception as e:
    logger.warning(f"No se pudo cargar el router de teléfonos de emergencia: {e}")

@app.get("/")
async def root():
    return {
        "message": "TucitaSegura Security System API",
        "version": "1.0.0",
        "status": "healthy"
    }

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)