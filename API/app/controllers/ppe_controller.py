
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.responses import JSONResponse
import asyncio
import json
from typing import Dict, List, Optional
import time
import traceback
import base64
import os
from concurrent.futures import ThreadPoolExecutor
from starlette.websockets import WebSocketState
from collections import deque

from app.models.ppe_models import ImageRequest, DetectionResponse, ErrorResponse
from app.services.ppe_service import PPEDetectorService


router = APIRouter(prefix="/api", tags=["PPE Detection"])

detector_service: Optional[PPEDetectorService] = None

MAX_WORKERS = min(4, (os.cpu_count() or 1) + 1)
MAX_IMAGE_SIZE_MB = 2
MAX_ACTIVE_CONNECTIONS = 50 
INACTIVE_TIMEOUT = 120
MAX_QUEUE_SIZE = 100 

executor = ThreadPoolExecutor(max_workers=MAX_WORKERS, thread_name_prefix="yolo_")


def init_detector(service: PPEDetectorService):
    global detector_service
    detector_service = service


@router.post("/detect", response_model=DetectionResponse)
async def detect_ppe(request: ImageRequest):
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
    metrics = ws_manager.get_metrics()
    
    return {
        "status": "healthy" if is_ready else "unhealthy",
        "detector_ready": is_ready,
        "model_info": model_info,
        "websocket_metrics": {
            "active_connections": metrics["active"],
            "total_connections": metrics["total"],
            "rejected_connections": metrics["rejected"],
            "max_connections": MAX_ACTIVE_CONNECTIONS
        },
        "resource_limits": {
            "max_image_size_mb": MAX_IMAGE_SIZE_MB,
            "max_workers": MAX_WORKERS,
            "inactive_timeout_seconds": INACTIVE_TIMEOUT
        },
        "timestamp": time.time()
    }

class WebSocketManager:
    
    def __init__(self):
        self.active_connections: List[WebSocket] = []
        self.connection_times: Dict[WebSocket, float] = {} 
        self.connection_metrics: Dict[str, int] = {"total": 0, "active": 0, "rejected": 0}
    
    async def connect(self, websocket: WebSocket) -> bool:
        if len(self.active_connections) >= MAX_ACTIVE_CONNECTIONS:
            await websocket.close(code=1008, reason="Máximo de conexiones alcanzado")
            self.connection_metrics["rejected"] += 1
            print(f"Conexión rechazada - Límite alcanzado ({MAX_ACTIVE_CONNECTIONS})")
            return False
        
        await websocket.accept()
        self.active_connections.append(websocket)
        self.connection_times[websocket] = time.time()
        self.connection_metrics["total"] += 1
        self.connection_metrics["active"] = len(self.active_connections)
        return True
    
    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
        if websocket in self.connection_times:
            del self.connection_times[websocket]
        self.connection_metrics["active"] = len(self.active_connections)
    
    async def send_detection(self, websocket: WebSocket, result: DetectionResponse):
        try:
            await websocket.send_json(result.model_dump())
        except Exception as e:
            print(f"Error enviando detección: {e}")
            self.disconnect(websocket)
    
    async def send_error(self, websocket: WebSocket, error: str):
        try:
            await websocket.send_json({
                "error": error,
                "timestamp": time.time()
            })
        except Exception:
            pass
    
    def update_activity(self, websocket: WebSocket):

        if websocket in self.connection_times:
            self.connection_times[websocket] = time.time()
    
    def get_inactive_connections(self) -> List[WebSocket]:

        current_time = time.time()
        inactive = []
        for ws, last_activity in self.connection_times.items():
            if current_time - last_activity > INACTIVE_TIMEOUT:
                inactive.append(ws)
        return inactive
    
    def get_metrics(self) -> Dict[str, int]:

        return self.connection_metrics.copy()


ws_manager = WebSocketManager()


def validate_image_size(base64_image: str) -> tuple[bool, str]:
    """Validar tamaño de imagen base64"""
    try:
        size_bytes = len(base64_image.encode('utf-8'))
        size_mb = size_bytes / (1024 * 1024)
        
        if size_mb > MAX_IMAGE_SIZE_MB:
            return False, f"Imagen muy grande: {size_mb:.2f}MB (máx {MAX_IMAGE_SIZE_MB}MB)"
        
        return True, "OK"
    except Exception as e:
        return False, f"Error validando imagen: {str(e)}"


def validate_base64_format(base64_image: str) -> tuple[bool, str]:
    """Validar formato base64 de imagen"""
    try:
        if not base64_image or len(base64_image) < 100:
            return False, "Imagen vacía o muy pequeña"

        if base64_image.startswith('data:image'):
            base64_image = base64_image.split(',')[1] if ',' in base64_image else base64_image

        base64.b64decode(base64_image[:100])
        return True, "OK"
    except Exception as e:
        return False, f"Formato base64 inválido: {str(e)}"


@router.websocket("/ws/detect")
async def websocket_detect(websocket: WebSocket):

    connected = await ws_manager.connect(websocket)
    if not connected:
        return
    
    pong_task = None
    cleanup_task = None
    last_ping_time = time.time()

    async def heartbeat_handler():
        """Envía ping cada 15s y verifica que cliente responda"""
        nonlocal last_ping_time
        try:
            while websocket.client_state == WebSocketState.CONNECTED:
                await asyncio.sleep(15)
                if websocket.client_state == WebSocketState.CONNECTED:
                    try:
                        await websocket.send_json({"type": "ping", "timestamp": time.time()})
                        last_ping_time = time.time()
                    except (RuntimeError, Exception):
                        break
        except asyncio.CancelledError:
            pass

    async def cleanup_inactive():
        """Verifica y cierra conexiones inactivas"""
        try:
            while websocket.client_state == WebSocketState.CONNECTED:
                await asyncio.sleep(30)
                inactive = ws_manager.get_inactive_connections()
                if websocket in inactive:
                    print(f"⚠️ Cerrando conexión inactiva (>{INACTIVE_TIMEOUT}s)")
                    await websocket.close(code=1000, reason="Inactividad")
                    break
        except asyncio.CancelledError:
            pass
    
    try:
        if not detector_service or not detector_service.is_ready():
            await ws_manager.send_error(websocket, "Servicio de detección no disponible")
            await websocket.close()
            return
        
        metrics = ws_manager.get_metrics()
        print(f"WebSocket conectado - Activas: {metrics['active']}/{MAX_ACTIVE_CONNECTIONS} | Total: {metrics['total']}")

        # Enviar mensaje de bienvenida al cliente
        try:
            await websocket.send_json({
                "type": "connected",
                "message": "Servidor listo para detección",
                "timestamp": time.time()
            })
            print("✅ Mensaje de bienvenida enviado al cliente")
        except Exception as e:
            print(f"Error enviando mensaje de bienvenida: {e}")

        pong_task = asyncio.create_task(heartbeat_handler())
        cleanup_task = asyncio.create_task(cleanup_inactive())
        
        print("✅ WebSocket listo para recibir datos")
        
        while websocket.client_state == WebSocketState.CONNECTED:
            try:
                # Aumentar timeout inicial para dar tiempo al cliente
                data = await asyncio.wait_for(websocket.receive_text(), timeout=30.0)
                message = json.loads(data)
                print(f"📨 Mensaje recibido del cliente: {list(message.keys())}")

                ws_manager.update_activity(websocket)

                # Manejar mensajes de heartbeat
                if message.get("type") == "pong":
                    continue

                if message.get("type") == "ping":
                    if websocket.client_state == WebSocketState.CONNECTED:
                        await websocket.send_json({"type": "pong", "timestamp": time.time()})
                    continue
                
                # Ignorar mensajes de tipo 'connected' que el cliente podría reenviar
                if message.get("type") == "connected":
                    continue

                # Validar que el mensaje contenga una imagen
                if "image" not in message:
                    await ws_manager.send_error(websocket, "Falta campo 'image'")
                    continue
                
                image_data = message["image"]

                valid_format, format_msg = validate_base64_format(image_data)
                if not valid_format:
                    await ws_manager.send_error(websocket, format_msg)
                    continue
                
                valid_size, size_msg = validate_image_size(image_data)
                if not valid_size:
                    await ws_manager.send_error(websocket, size_msg)
                    continue
                
                confidence = message.get("confidence", 0.5)

                # Enviar confirmación de que se está procesando la imagen
                if websocket.client_state == WebSocketState.CONNECTED:
                    await websocket.send_json({
                        "type": "processing",
                        "message": "Procesando imagen...",
                        "timestamp": time.time()
                    })

                try:
                    loop = asyncio.get_event_loop()
                    result = await asyncio.wait_for(
                        loop.run_in_executor(
                            executor,
                            detector_service.detect_from_base64,
                            image_data,
                            confidence
                        ),
                        timeout=30.0  # Aumentado de 10s a 30s para imágenes grandes
                    )
                    
                    if websocket.client_state == WebSocketState.CONNECTED:
                        await ws_manager.send_detection(websocket, result)
                        print("✅ Respuesta de detección enviada al cliente")
                    else:
                        print("⚠️ Cliente desconectado, no se envió respuesta")
                
                except asyncio.TimeoutError:
                    print(f"⏱️ Timeout en detección YOLO (>30s)")
                    if websocket.client_state == WebSocketState.CONNECTED:
                        await ws_manager.send_error(websocket, "Timeout en procesamiento")
                    continue
                
                except Exception as yolo_error:
                    print(f"Error YOLO (sin romper conexión): {type(yolo_error).__name__}: {str(yolo_error)}")
                    await ws_manager.send_error(websocket, "Error en detección, reintenta")
                    continue
            
            except asyncio.TimeoutError:
                continue
            
            except json.JSONDecodeError:
                await ws_manager.send_error(websocket, "JSON inválido")
            
            except ValueError as e:
                await ws_manager.send_error(websocket, str(e))
            
            except RuntimeError as e:
                if "disconnect" in str(e).lower():
                    print(f"Cliente desconectado durante operación")
                    break
                else:
                    print(f"RuntimeError: {str(e)}")
                    break
            
            except Exception as e:
                print(f"Error inesperado: {type(e).__name__}: {str(e)}")
                traceback.print_exc()
                try:
                    await ws_manager.send_error(websocket, "Error interno")
                except:
                    break
    
    except WebSocketDisconnect as e:
        print(f"Cliente desconectado - Código: {e.code if hasattr(e, 'code') else 'N/A'}")
    
    except RuntimeError as e:
        if "disconnect" in str(e).lower():
            print(f"WebSocket cerrado por cliente")
        else:
            print(f"RuntimeError: {str(e)}")
            traceback.print_exc()
    
    except Exception as e:
        print(f"Error crítico: {type(e).__name__}: {str(e)}")
        traceback.print_exc()
    
    finally:
        for task in [pong_task, cleanup_task]:
            if task:
                task.cancel()
                try:
                    await task
                except asyncio.CancelledError:
                    pass
        
        ws_manager.disconnect(websocket)
        metrics = ws_manager.get_metrics()
        print(f"🔌 Conexión cerrada - Activas: {metrics['active']} | Total: {metrics['total']}")
