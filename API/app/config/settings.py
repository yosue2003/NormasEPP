from pydantic_settings import BaseSettings
from typing import Optional
import os


class Settings(BaseSettings):
    
    app_name: str = "EPP Detection API"
    app_version: str = "1.0.0"
    debug: bool = False
    
    host: str = "0.0.0.0"
    port: int = 8000
    
    cors_origins: list = [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
    ]
    
    # Configuración del modelo
    model_path: Optional[str] = None
    confidence_threshold: float = 0.5
    
    # Configuración WebSocket
    ws_heartbeat_interval: int = 15  # Ping cada 15 segundos
    ws_inactive_timeout: int = 120  # Desconectar tras 2 minutos inactivo
    ws_max_connections: int = 50  # Máximo conexiones simultáneas
    
    # Configuración de recursos
    max_image_size_mb: float = 2.0  # Máximo 2MB por imagen
    max_workers: int = 4  # Workers para ThreadPoolExecutor
    max_queue_size: int = 100  # Máximo tareas en cola
    
    # Configuración Uvicorn
    uvicorn_timeout_keep_alive: int = 600  # 10 minutos
    uvicorn_limit_concurrency: int = 50  # Máximo conexiones
    uvicorn_limit_max_requests: int = 10000  # Reiniciar worker tras N requests
    uvicorn_backlog: int = 2048  # Cola de conexiones pendientes
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        protected_namespaces = ()


settings = Settings()
