"""
Controlador de detección de EPP
"""
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.responses import JSONResponse
import asyncio
import json
from typing import Dict, List
import time

from app.models.ppe_models import ImageRequest, DetectionResponse, ErrorResponse
from app.services.ppe_service import PPEDetectorService


router = APIRouter(prefix="/api", tags=["PPE Detection"])

detector_service: PPEDetectorService = None


def init_detector(service: PPEDetectorService):
    """Inicializa el servicio de detección"""
    global detector_service
    detector_service = service


# ============================================================================
# REST ENDPOINTS
# ============================================================================

@router.post("/detect", response_model=DetectionResponse)
async def detect_ppe(request: ImageRequest):
    """
    Detecta EPP en una imagen
    
    Args:
        request: Solicitud con imagen en base64 y opciones
        
    Returns:
        Resultado de la detección con estado de EPP
    """
    try:
        if not detector_service or not detector_service.is_ready():
            raise HTTPException(
                status_code=503,
                detail="Servicio de detección no disponible"
            )
        
        result = detector_service.detect_from_base64(
            request.image,
            confidence=request.confidence
        )
        
        return result
    
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error interno: {str(e)}")


@router.get("/health")
async def health_check():
    """Verifica el estado del servicio"""
    if not detector_service:
        return JSONResponse(
            status_code=503,
            content={
                "status": "unhealthy",
                "message": "Detector no inicializado"
            }
        )
    
    is_ready = detector_service.is_ready()
    model_info = detector_service.get_model_info()
    
    return {
        "status": "healthy" if is_ready else "unhealthy",
        "detector_ready": is_ready,
        "model_info": model_info,
        "timestamp": time.time()
    }


# ============================================================================
# WEBSOCKET ENDPOINT
# ============================================================================

class WebSocketManager:
    """Gestiona conexiones WebSocket para detección en tiempo real"""
    
    def __init__(self):
        self.active_connections: List[WebSocket] = []
    
    async def connect(self, websocket: WebSocket):
        """Acepta nueva conexión WebSocket"""
        await websocket.accept()
        self.active_connections.append(websocket)
    
    def disconnect(self, websocket: WebSocket):
        """Remueve conexión WebSocket"""
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
    
    async def send_detection(self, websocket: WebSocket, result: DetectionResponse):
        """Envía resultado de detección a cliente"""
        try:
            await websocket.send_json(result.model_dump())
        except Exception as e:
            print(f"Error enviando detección: {e}")
            self.disconnect(websocket)
    
    async def send_error(self, websocket: WebSocket, error: str):
        """Envía error a cliente"""
        try:
            await websocket.send_json({
                "error": error,
                "timestamp": time.time()
            })
        except Exception:
            pass


ws_manager = WebSocketManager()


@router.websocket("/ws/detect")
async def websocket_detect(websocket: WebSocket):
    """
    WebSocket para detección de EPP en tiempo real
    
    El cliente envía frames en formato:
    {
        "image": "base64_string",
        "confidence": 0.5
    }
    """
    await ws_manager.connect(websocket)
    
    try:
        # Verificar que el detector esté listo
        if not detector_service or not detector_service.is_ready():
            await ws_manager.send_error(
                websocket,
                "Servicio de detección no disponible"
            )
            await websocket.close()
            return
        
        while True:
            try:
                # Recibir datos del cliente
                data = await websocket.receive_text()
                message = json.loads(data)
                
                # Validar mensaje
                if "image" not in message:
                    await ws_manager.send_error(websocket, "Falta campo 'image'")
                    continue
                
                confidence = message.get("confidence", 0.5)
                
                # Realizar detección
                result = detector_service.detect_from_base64(
                    message["image"],
                    confidence=confidence
                )
                
                # Enviar resultado
                await ws_manager.send_detection(websocket, result)
            
            except json.JSONDecodeError:
                await ws_manager.send_error(websocket, "JSON inválido")
            except ValueError as e:
                await ws_manager.send_error(websocket, str(e))
            except Exception as e:
                await ws_manager.send_error(websocket, f"Error: {str(e)}")
    
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
    except Exception as e:
        print(f"Error en WebSocket: {e}")
        ws_manager.disconnect(websocket)
