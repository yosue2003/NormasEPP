"""
Configuración de la aplicación
"""
from pydantic_settings import BaseSettings
from typing import Optional
import os


class Settings(BaseSettings):
    """Configuración de la aplicación"""
    
    # API Configuration
    app_name: str = "EPP Detection API"
    app_version: str = "1.0.0"
    debug: bool = False
    
    # Server Configuration
    host: str = "0.0.0.0"
    port: int = 8000
    
    # CORS Configuration
    cors_origins: list = [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
    ]
    
    # Model Configuration
    model_path: Optional[str] = None
    confidence_threshold: float = 0.5
    
    # WebSocket Configuration
    ws_heartbeat_interval: int = 30
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        protected_namespaces = ()


# Instancia global de configuración
settings = Settings()
