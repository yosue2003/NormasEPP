# 🛡️ Sistema de Detección de EPP

Sistema completo para detección de Equipos de Protección Personal usando YOLO v8, FastAPI y React.

## 📁 Estructura del Proyecto

```
EPP/
├── API/                    # Backend FastAPI
│   ├── app/               # Código de la API (MVC)
│   │   ├── models/        # Modelos Pydantic
│   │   ├── services/      # Lógica de negocio
│   │   ├── controllers/   # Controladores/Rutas
│   │   └── config/        # Configuración
│   ├── models/            # Modelos YOLO (.pt)
│   ├── docs/              # Documentación
│   ├── main.py           # Punto de entrada
│   └── requirements.txt  # Dependencias Python
│
├── front/                 # Frontend React
│   ├── src/
│   │   ├── components/   # Componentes React
│   │   ├── contexts/     # Context API
│   │   ├── services/     # Servicios (API calls)
│   │   └── utils/        # Utilidades
│   └── package.json
│
└── README.md             # Este archivo
```

## 🚀 Inicio Rápido

### 1. Backend (API)

```bash
cd API

# Instalar dependencias
pip install -r requirements.txt

# Configurar variables de entorno
copy .env.example .env
# Edita .env con tu configuración

# Iniciar servidor
python main.py
```

**Servidor**: http://localhost:8000  
**Documentación**: http://localhost:8000/docs

### 2. Frontend

```bash
cd front

# Instalar dependencias
npm install

# Iniciar desarrollo
npm run dev
```

**Aplicación**: http://localhost:5173

## 🤖 Configurar Modelo de Detección

El proyecto usa **modelos preentrenados** de YOLO para detectar EPP.

### Opción 1: Roboflow API (⚡ Recomendado - Sin GPU)

```bash
# Instalar Roboflow
pip install roboflow

# Agregar a .env:
ROBOFLOW_API_KEY=tu_api_key
```

**Obtén tu API key**: https://app.roboflow.com/settings/api

### Opción 2: Descargar Modelo Preentrenado

1. **Roboflow Universe**: https://universe.roboflow.com/ai-project-yolo/ppe-detection-q897z
2. Descarga en formato YOLOv8
3. Copiar modelo:
   ```bash
   Copy-Item ruta\al\best.pt -Destination API\models\ppe_model.pt
   ```
4. Actualizar `.env`:
   ```env
   MODEL_PATH=models/ppe_model.pt
   ```

### Documentación Completa

Ver: **`API/docs/PRETRAINED_MODELS.md`** para todas las opciones de modelos

## 📊 Endpoints de la API

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/` | Info de la API |
| GET | `/api/health` | Estado del servicio |
| POST | `/api/detect` | Detección en imagen |
| WS | `/api/ws/detect` | Detección en tiempo real |

## 🔧 Configuración

### Backend (.env)

```env
MODEL_PATH=models/ppe_model.pt
CONFIDENCE_THRESHOLD=0.5
HOST=0.0.0.0
PORT=8000
```

### Frontend (.env)

```env
VITE_API_URL=http://localhost:8000
```

## 📚 Documentación

- **API**: `API/docs/API_README.md`
- **Modelos Preentrenados**: `API/docs/PRETRAINED_MODELS.md` ⭐

## 🛠️ Tecnologías

### Backend
- **FastAPI** - Framework web
- **YOLO v8** - Detección de objetos
- **OpenCV** - Procesamiento de imágenes
- **WebSocket** - Comunicación en tiempo real

### Frontend
- **React 19** - UI framework
- **TypeScript** - Tipado estático
- **Vite** - Build tool
- **Tailwind CSS** - Estilos

## 📝 Notas

- El modelo base `yolov8n.pt` detecta **personas** pero NO EPP específico
- Para detectar EPP usa un **modelo especializado** (ver `PRETRAINED_MODELS.md`)
- Recomendado: **Roboflow API** para empezar sin necesidad de GPU

## 🐛 Problemas Comunes

### Backend no inicia
```bash
# Verifica que las dependencias estén instaladas
pip install -r requirements.txt

# Verifica Python 3.10+
python --version
```

### Frontend no conecta con API
- Verifica que el backend esté corriendo en http://localhost:8000
- Revisa CORS en `API/app/config/settings.py`
- Verifica `VITE_API_URL` en `front/.env`

### Modelo no carga
- Verifica que `MODEL_PATH` en `.env` apunte a un archivo .pt válido
- Si no tienes modelo entrenado, el sistema usará `yolov8n.pt` base

## 📧 Soporte

Para más información, revisa la documentación en `API/docs/`
