"""
Script rápido para verificar el modelo entrenado
"""
from ultralytics import YOLO
from pathlib import Path

print("🔍 Verificando modelo entrenado...\n")

model_path = Path("models/ppe_best.pt")

if not model_path.exists():
    print(f"❌ No se encontró el modelo en: {model_path}")
    print("💡 Asegúrate de que ppe_best.pt esté en la carpeta models/")
    exit(1)

try:
    # Cargar modelo
    print(f"📦 Cargando modelo: {model_path.name}")
    model = YOLO(str(model_path))
    
    print("✅ Modelo cargado correctamente\n")
    
    # Información del modelo
    print(f"📋 Clases detectables ({len(model.names)}):")
    for idx, name in model.names.items():
        print(f"  {idx}: {name}")
    
    print(f"\n✅ Modelo listo para usar")
    print(f"\n📝 Configuración actual en .env:")
    print(f"   USE_ROBOFLOW=false")
    print(f"   MODEL_PATH=models/ppe_best.pt")
    
except Exception as e:
    print(f"❌ Error: {e}")
    exit(1)
