
from ultralytics import YOLO
import cv2
import numpy as np
from typing import Dict, List, Optional
import os
import time
import base64
from app.models.ppe_models import PPEStatus, Detection, DetectionResponse


class PPEDetectorService:
    """Servicio para detectar Equipos de Protección Personal usando YOLO v8"""
    
    def __init__(self, model_path: Optional[str] = None):
        self.model_path = model_path
        self.model: Optional[YOLO] = None
        self.model_loaded = False
        
        self._load_model()
        

        # Mapeo de clases del modelo entrenado a estados del frontend
        # Clases del modelo: Botas, Casco, Chaleco, Gafas, Guantes, Protector, tapabocas
        self.ppe_classes = {
            'casco': ['casco'],
            'lentes': ['gafas'],  # El modelo detecta "Gafas"
            'guantes': ['guantes'],
            'botas': ['botas'],
            'ropa': ['chaleco', 'protector'],  # Chaleco o Protector cuentan como ropa de seguridad
            'tapabocas': ['tapabocas']  # El modelo detecta tapabocas directamente
        }
    
    def _load_model(self):

        try:
            if self.model_path and os.path.exists(self.model_path):
                self.model = YOLO(self.model_path)
                print(f"✅ Modelo personalizado cargado: {self.model_path}")
            else:

                self.model = YOLO('yolov8n.pt')
                print("⚠️ Usando YOLOv8n preentrenado. Entrena tu propio modelo para EPP.")
            
            self.model_loaded = True
        except Exception as e:
            print(f"❌ Error al cargar modelo: {e}")
            self.model_loaded = False
            raise
    
    def detect(self, image: np.ndarray, confidence: float = 0.5) -> DetectionResponse:

        start_time = time.time()
        
        if self.model is None:
            raise RuntimeError("Modelo YOLO no inicializado")
        
        print(f"\n🔍 Iniciando detección con confianza: {confidence}")
        results = self.model(image, conf=confidence, verbose=False)

        ppe_status = PPEStatus()
        detections = []
        
        print(f"📦 Número de resultados: {len(results)}")
        for result in results:
            boxes = result.boxes
            print(f"📦 Número de cajas detectadas: {len(boxes)}")
            for box in boxes:
                class_id = int(box.cls[0])
                class_name = self.model.names[class_id]  # Mantener capitalización original
                class_name_lower = class_name.lower()
                conf = float(box.conf[0])
                bbox = box.xyxy[0].cpu().numpy().tolist()
                
                print(f"  🎯 Objeto detectado: '{class_name}' (confianza: {conf:.2%})")
                
                # Mapear detecciones a estados de EPP
                matched = False
                for ppe_type, class_names in self.ppe_classes.items():
                    print(f"    🔎 Comparando '{class_name_lower}' con {class_names} para '{ppe_type}'")
                    if any(cn in class_name_lower for cn in class_names):
                        setattr(ppe_status, ppe_type, True)
                        print(f"    ✅ MATCH! {class_name} → {ppe_type}")
                        matched = True
                        break
                
                if not matched:
                    print(f"    ❌ No se encontró match para '{class_name}'")
                
                detections.append(Detection(
                    **{"class": class_name},
                    confidence=conf,
                    bbox=bbox
                ))
        

        processing_time = (time.time() - start_time) * 1000 
        
        print(f"\n📊 Estado final de EPP:")
        print(f"  Casco: {ppe_status.casco}")
        print(f"  Lentes: {ppe_status.lentes}")
        print(f"  Guantes: {ppe_status.guantes}")
        print(f"  Botas: {ppe_status.botas}")
        print(f"  Ropa: {ppe_status.ropa}")
        print(f"  Tapabocas: {ppe_status.tapabocas}")
        
        is_compliant = all([
            ppe_status.casco,
            ppe_status.lentes,
            ppe_status.guantes,
            ppe_status.botas,
            ppe_status.ropa,
            ppe_status.tapabocas
        ])
        
        print(f"  ✅ Cumplimiento: {is_compliant}")
        print(f"  ⏱️ Tiempo de procesamiento: {processing_time:.2f}ms\n")
        
        return DetectionResponse(
            ppe_status=ppe_status,
            detections=detections,
            is_compliant=is_compliant,
            processing_time=processing_time
        )
    
    def detect_from_base64(self, base64_image: str, confidence: float = 0.5) -> DetectionResponse:

        try:

            if ',' in base64_image:
                base64_image = base64_image.split(',')[1]
            
            img_bytes = base64.b64decode(base64_image)
            nparr = np.frombuffer(img_bytes, np.uint8)
            image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            
            if image is None:
                raise ValueError("No se pudo decodificar la imagen")
            
            # Guardar imagen para debug (solo la primera vez)
            debug_path = "debug_image.jpg"
            if not os.path.exists(debug_path):
                cv2.imwrite(debug_path, image)
                print(f"🖼️ Imagen guardada en {debug_path} - Tamaño: {image.shape}")
            
            print(f"📸 Imagen recibida: {image.shape} (height, width, channels)")
            
            return self.detect(image, confidence)
        
        except Exception as e:
            raise ValueError(f"Error al procesar imagen base64: {str(e)}")
    
    def is_ready(self) -> bool:
        return self.model_loaded and self.model is not None
    
    def get_model_info(self) -> Dict:
        if not self.model_loaded:
            return {"loaded": False}
        
        return {
            "loaded": True,
                "type": "local_yolo",
                "model_path": self.model_path or "yolov8n.pt (preentrenado)",
                "classes": list(self.model.names.values()) if self.model else [],
                "ppe_classes": list(self.ppe_classes.keys())
            }
