
from ultralytics import YOLO
import cv2
import numpy as np
from typing import Dict, List, Optional
import os
import time
import base64
from app.models.ppe_models import PPEStatus, Detection, DetectionResponse


class PPEDetectorService:
    
    def __init__(self, model_path: Optional[str] = None):
        self.model_path = model_path
        self.model: Optional[YOLO] = None
        self.person_detector: Optional[YOLO] = None
        self.model_loaded = False
        self.person_detector_loaded = False
        
        self._load_model()
        self._load_person_detector()
        
        self.ppe_classes = {
            'casco': ['casco'],
            'lentes': ['gafas'],
            'guantes': ['guantes'],
            'botas': ['botas'],
            'ropa': ['chaleco', 'protector'],
            'tapabocas': ['tapabocas'] 
        }
    
    def _load_model(self):

        try:
            if self.model_path and os.path.exists(self.model_path):
                self.model = YOLO(self.model_path)
                print(f"Modelo personalizado cargado: {self.model_path}")
            else:

                self.model = YOLO('yolov8n.pt')
                print("Usando YOLOv8n preentrenado. Entrena tu propio modelo para EPP.")
            
            self.model_loaded = True
        except Exception as e:
            print(f"Error al cargar modelo: {e}")
            self.model_loaded = False
            raise
    
    def _load_person_detector(self):
        try:
            person_model_path = os.path.join(os.path.dirname(self.model_path or ''), 'yolov8n.pt')
            if not os.path.exists(person_model_path):
                person_model_path = 'models/yolov8n.pt'
            
            self.person_detector = YOLO(person_model_path)
            self.person_detector_loaded = True
            print(f"Detector de personas cargado: {person_model_path}")
        except Exception as e:
            print(f"Error al cargar detector de personas: {e}")
            print("Continuando sin validación de personas")
            self.person_detector_loaded = False
    
    def detect_person(self, image: np.ndarray, confidence: float = 0.4) -> bool:
        if not self.person_detector_loaded or self.person_detector is None:
            return True
        
        try:
            results = self.person_detector(image, conf=confidence, verbose=False)
            
            for result in results:
                boxes = result.boxes
                for box in boxes:
                    class_id = int(box.cls[0])
                    class_name = self.person_detector.names[class_id].lower()

                    if class_name == "person":
                        conf = float(box.conf[0])
                        print(f"Persona detectada (confianza: {conf:.2%})")
                        return True
            
            print("No se detectaron personas en la imagen")
            return False
        
        except Exception as e:
            print(f"Error en detección de personas: {e}")

            return True
    
    def detect(self, image: np.ndarray, confidence: float = 0.5) -> DetectionResponse:
        """Detección robusta con manejo de errores que no rompe la conexión"""
        start_time = time.time()
        
        try:
            if self.model is None:
                raise RuntimeError("Modelo YOLO no inicializado")
            
            print(f"\n🔍 Iniciando detección con confianza: {confidence}")

            has_person = self.detect_person(image, confidence=0.4)
            
            if not has_person:
                print("Sin personas detectadas - Omitiendo detección EPP")
                processing_time = (time.time() - start_time) * 1000
                return DetectionResponse(
                    ppe_status=PPEStatus(),
                    detections=[],
                    is_compliant=True,
                    processing_time=processing_time,
                    has_person=False
                )
            
            print("Persona detectada - Procesando EPP")
            
            try:
                results = self.model(image, conf=confidence, verbose=False)
            except Exception as yolo_error:
                print(f"Error en inferencia YOLO: {type(yolo_error).__name__}: {str(yolo_error)}")

                return DetectionResponse(
                    ppe_status=PPEStatus(),
                    detections=[],
                    is_compliant=False,
                    processing_time=0.0,
                    has_person=True
                )

            ppe_status = PPEStatus()
            detections = []
            
            print(f"Número de resultados: {len(results)}")
            for result in results:
                try:
                    boxes = result.boxes
                    print(f"Número de cajas detectadas: {len(boxes)}")
                    for box in boxes:
                        try:
                            class_id = int(box.cls[0])
                            class_name = self.model.names[class_id]
                            class_name_lower = class_name.lower()
                            conf = float(box.conf[0])
                            bbox = box.xyxy[0].cpu().numpy().tolist()
                            
                            print(f"Objeto detectado: '{class_name}' (confianza: {conf:.2%})")

                            matched = False
                            for ppe_type, class_names in self.ppe_classes.items():
                                if any(cn in class_name_lower for cn in class_names):
                                    setattr(ppe_status, ppe_type, True)
                                    print(f"MATCH! {class_name} → {ppe_type}")
                                    matched = True
                                    break
                            
                            if not matched:
                                print(f"No se encontró match para '{class_name}'")
                            
                            detections.append(Detection(
                                **{"class": class_name},
                                confidence=conf,
                                bbox=bbox
                            ))
                        except Exception as box_error:
                            print(f"Error procesando box: {str(box_error)}")
                            continue
                
                except Exception as result_error:
                    print(f"Error procesando resultado: {str(result_error)}")
                    continue
            
            processing_time = (time.time() - start_time) * 1000 
            
            print(f"Estado final de EPP:")
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
            
            print(f" Cumplimiento: {is_compliant}")
            print(f" Tiempo de procesamiento: {processing_time:.2f}ms\n")
            
            return DetectionResponse(
                ppe_status=ppe_status,
                detections=detections,
                is_compliant=is_compliant,
                processing_time=processing_time,
                has_person=True
            )
        
        except Exception as e:
            print(f"Error crítico en detect(): {type(e).__name__}: {str(e)}")
            return DetectionResponse(
                ppe_status=PPEStatus(),
                detections=[],
                is_compliant=False,
                processing_time=0.0,
                has_person=True
            )
    
    def detect_from_base64(self, base64_image: str, confidence: float = 0.5) -> DetectionResponse:
        """Decodificación robusta de base64 con manejo de errores"""
        try:
            if ',' in base64_image:
                base64_image = base64_image.split(',')[1]
            
            try:
                img_bytes = base64.b64decode(base64_image)
            except Exception as decode_error:
                print(f"Error decodificando base64: {str(decode_error)}")
                raise ValueError(f"Base64 inválido: {str(decode_error)}")

            try:
                nparr = np.frombuffer(img_bytes, np.uint8)
                image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            except Exception as cv_error:
                print(f"Error en cv2.imdecode: {str(cv_error)}")
                raise ValueError(f"Imagen corrupta: {str(cv_error)}")
            
            if image is None:
                raise ValueError("No se pudo decodificar la imagen - formato no soportado")
            
            print(f"Imagen recibida: {image.shape} (height, width, channels)")
            
            return self.detect(image, confidence)
        
        except ValueError:
            raise
        except Exception as e:
            print(f"Error inesperado en detect_from_base64: {type(e).__name__}: {str(e)}")
            raise ValueError(f"Error procesando imagen: {str(e)}")
    
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
                "ppe_classes": list(self.ppe_classes.keys()),
                "person_detection_enabled": self.person_detector_loaded
            }
