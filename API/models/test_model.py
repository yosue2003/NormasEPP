"""
Script para probar el modelo con una imagen específica
"""
from ultralytics import YOLO
import cv2
import os

# Cargar modelo
model = YOLO('models/ppe_best.pt')

# Ruta de la imagen a probar - MODIFICA ESTA RUTA
# Puedes usar:
# 1. Una imagen del dataset de entrenamiento
# 2. La imagen capturada: debug_image.jpg
# 3. Cualquier imagen con EPP
image_path = 'app/public/epp-2.jpg'  # Imagen de prueba con EPP

if not os.path.exists(image_path):
    print(f"❌ No se encontró la imagen: {image_path}")
    print("📝 Por favor, modifica la variable 'image_path' con la ruta correcta")
    exit(1)

print(f"🖼️ Probando modelo con: {image_path}")

# Cargar imagen
image = cv2.imread(image_path)
if image is None:
    print(f"❌ No se pudo cargar la imagen: {image_path}")
    exit(1)

print(f"📏 Tamaño de imagen: {image.shape}")

# Hacer detección con confianza baja para ver todo
results = model(image, conf=0.25, verbose=True)

print("\n" + "="*60)
print("RESULTADOS DE DETECCIÓN:")
print("="*60)

# Mostrar resultados
result = results[0]  # Obtener primer resultado
boxes = result.boxes
print(f"\n📦 Total de objetos detectados: {len(boxes)}")

if len(boxes) == 0:
    print("❌ No se detectó ningún objeto")
    print("\n💡 POSIBLES RAZONES:")
    print("  - La imagen es muy diferente al dataset de entrenamiento")
    print("  - El EPP no es visible o está muy pequeño en la imagen")
    print("  - La iluminación o ángulo es muy diferente")
    print("  - Necesitas acercar la cámara o mejorar la calidad")
else:
    print("\n✅ DETECCIONES:")
    for i, box in enumerate(boxes):
        class_id = int(box.cls[0])
        class_name = model.names[class_id]
        confidence = float(box.conf[0])
        bbox = box.xyxy[0].cpu().numpy().tolist()
        
        print(f"\n  {i+1}. {class_name}")
        print(f"     Confianza: {confidence:.2%}")
        print(f"     Ubicación: {[int(x) for x in bbox]}")

# Guardar imagen con detecciones
output_path = 'test_result.jpg'
annotated = result.plot()
cv2.imwrite(output_path, annotated)
print(f"\n💾 Resultado guardado en: {output_path}")
print("   Abre esta imagen para ver las detecciones marcadas")

print("\n" + "="*60)
print("📊 RESUMEN:")
print("="*60)
print(f"Imagen probada: {image_path}")
print(f"Objetos detectados: {len(boxes)}")
print(f"Resultado guardado: {output_path}")
