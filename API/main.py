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



@app.on_event("startup")
async def startup_event():
    """Inicializa servicios al arrancar la aplicación"""
    print("Iniciando EPP Detection API...")
    print(f"Modelo: {settings.model_path or 'yolov8n.pt'}")
    try:
        detector = PPEDetectorService(model_path=settings.model_path)
        init_detector(detector)
        print("✅ Detector inicializado correctamente")
            
    except Exception as e:
        print(f"Error al inicializar detector: {e}")
        raise


@app.on_event("shutdown")
async def shutdown_event():
    """Limpia recursos al cerrar la aplicación"""
    print("👋 Cerrando EPP Detection API...")



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



if __name__ == "__main__":
    import uvicorn
    
    print("\n" + "="*60)
    print("🚀 INICIANDO EPP DETECTION API - MODO PRODUCCIÓN 24/7")
    print("="*60)
    print(f"📍 Host: {settings.host}:{settings.port}")
    print(f"🔧 Workers: {settings.max_workers}")
    print(f"🔌 Max Conexiones: {settings.ws_max_connections}")
    print(f"📦 Max Tamaño Imagen: {settings.max_image_size_mb}MB")
    print(f"⏱️  Timeout Inactividad: {settings.ws_inactive_timeout}s")
    print(f"💓 Heartbeat: {settings.ws_heartbeat_interval}s")
    print("="*60 + "\n")
    
    uvicorn.run(
        "main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.debug,
        # Configuración de timeouts
        timeout_keep_alive=settings.uvicorn_timeout_keep_alive,
        timeout_graceful_shutdown=30,
        # Configuración WebSocket
        ws_ping_interval=settings.ws_heartbeat_interval,
        ws_ping_timeout=20,
        ws_max_size=int(settings.max_image_size_mb * 1024 * 1024 * 10), 
        # Configuración de concurrencia
        limit_concurrency=settings.uvicorn_limit_concurrency,
        limit_max_requests=settings.uvicorn_limit_max_requests,
        backlog=settings.uvicorn_backlog,
        # Performance
        workers=1 if settings.debug else 1,  # 1 worker para WebSocket persistente
        log_level="info"
    )