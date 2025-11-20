"""
EPP Detection API - Main Application
Arquitectura MVC con FastAPI
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.controllers import router, init_detector
from app.services import PPEDetectorService


# ============================================================================
# Crear aplicación FastAPI
# ============================================================================

app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="API para detección de Equipos de Protección Personal usando YOLO v8",
    docs_url="/docs",
    redoc_url="/redoc"
)


# ============================================================================
# Configurar CORS
# ============================================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================================
# Inicializar servicios
# ============================================================================

@app.on_event("startup")
async def startup_event():
    """Inicializa servicios al arrancar la aplicación"""
    print("🚀 Iniciando EPP Detection API...")
    print(f"📍 Modelo: {settings.model_path or 'yolov8n.pt'}")
    
    # Inicializar detector
    try:
        detector = PPEDetectorService(model_path=settings.model_path)
        init_detector(detector)
        print("✅ Detector inicializado correctamente")
            
    except Exception as e:
        print(f"❌ Error al inicializar detector: {e}")
        raise


@app.on_event("shutdown")
async def shutdown_event():
    """Limpia recursos al cerrar la aplicación"""
    print("👋 Cerrando EPP Detection API...")


# ============================================================================
# Registrar rutas
# ============================================================================

app.include_router(router)


@app.get("/")
async def root():
    """Endpoint raíz de la API"""
    return {
        "message": settings.app_name,
        "version": settings.app_version,
        "docs": "/docs",
        "endpoints": {
            "POST /api/detect": "Detectar EPP en imagen",
            "WebSocket /api/ws/detect": "Detección en tiempo real",
            "GET /api/health": "Estado del servicio"
        }
    }


# ============================================================================
# Ejecutar aplicación
# ============================================================================

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.debug
    )