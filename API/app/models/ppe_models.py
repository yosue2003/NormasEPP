"""
Modelos de datos para la aplicación EPP
"""
from pydantic import BaseModel, Field
from typing import List, Dict, Optional
from enum import Enum


class PPEType(str, Enum):
    """Tipos de EPP detectables"""
    CASCO = "casco"
    LENTES = "lentes"
    GUANTES = "guantes"
    BOTAS = "botas"
    ROPA = "ropa"
    TAPABOCAS = "tapabocas"


class PPEStatus(BaseModel):
    """Estado de detección de EPP"""
    casco: bool = Field(default=False, description="Casco detectado")
    lentes: bool = Field(default=False, description="Lentes de seguridad detectados")
    guantes: bool = Field(default=False, description="Guantes detectados")
    botas: bool = Field(default=False, description="Botas de seguridad detectadas")
    ropa: bool = Field(default=False, description="Ropa de seguridad detectada")
    tapabocas: bool = Field(default=False, description="Tapabocas detectado")

    class Config:
        json_schema_extra = {
            "example": {
                "casco": True,
                "lentes": False,
                "guantes": True,
                "botas": True,
                "ropa": False
            }
        }


class Detection(BaseModel):
    """Detección individual de un objeto"""
    class_name: str = Field(..., alias="class", description="Nombre de la clase detectada")
    confidence: float = Field(..., ge=0.0, le=1.0, description="Confianza de la detección")
    bbox: List[float] = Field(..., description="Bounding box [x1, y1, x2, y2]")

    class Config:
        populate_by_name = True
        json_schema_extra = {
            "example": {
                "class": "hardhat",
                "confidence": 0.89,
                "bbox": [100.5, 50.2, 200.3, 150.8]
            }
        }


class ImageRequest(BaseModel):
    """Request para detección de EPP en imagen"""
    image: str = Field(..., description="Imagen codificada en base64")
    confidence: float = Field(default=0.5, ge=0.0, le=1.0, description="Umbral de confianza mínimo")

    class Config:
        json_schema_extra = {
            "example": {
                "image": "data:image/jpeg;base64,/9j/4AAQSkZJRg...",
                "confidence": 0.5
            }
        }


class DetectionResponse(BaseModel):
    """Respuesta de detección de EPP"""
    ppe_status: PPEStatus = Field(..., description="Estado de cada elemento de EPP")
    detections: List[Detection] = Field(default=[], description="Lista de detecciones individuales")
    is_compliant: bool = Field(..., description="Si cumple con todos los EPP requeridos")
    processing_time: Optional[float] = Field(None, description="Tiempo de procesamiento en ms")

    class Config:
        json_schema_extra = {
            "example": {
                "ppe_status": {
                    "casco": True,
                    "lentes": False,
                    "guantes": True,
                    "botas": True,
                    "ropa": False
                },
                "detections": [
                    {
                        "class": "hardhat",
                        "confidence": 0.89,
                        "bbox": [100, 50, 200, 150]
                    }
                ],
                "is_compliant": False,
                "processing_time": 45.2
            }
        }


class ErrorResponse(BaseModel):
    """Respuesta de error"""
    error: str = Field(..., description="Mensaje de error")
    detail: Optional[str] = Field(None, description="Detalle adicional del error")

    class Config:
        json_schema_extra = {
            "example": {
                "error": "Invalid image format",
                "detail": "Could not decode base64 image"
            }
        }


class HealthResponse(BaseModel):
    """Respuesta del health check"""
    status: str = Field(..., description="Estado del servicio")
    detector: str = Field(..., description="Estado del detector")
    model_loaded: bool = Field(..., description="Si el modelo está cargado")
    version: str = Field(..., description="Versión de la API")

    class Config:
        protected_namespaces = ()
        json_schema_extra = {
            "example": {
                "status": "healthy",
                "detector": "ready",
                "model_loaded": True,
                "version": "1.0.0"
            }
        }
