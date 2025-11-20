import { useState } from 'react'
import {
  X,
  Camera,
  Shield,
  Bell,
  Clock,
  User,
  Settings as SettingsIcon,
} from 'lucide-react'
import { useCameraConfig } from '../contexts/camera'

interface ConfigModalProps {
  isOpen: boolean
  onClose: () => void
}

export function ConfigModal({ isOpen, onClose }: ConfigModalProps) {
  const [activeTab, setActiveTab] = useState<
    'camera' | 'ppe' | 'alerts' | 'history' | 'user'
  >('camera')
  if (!isOpen) return null
  const tabs = [
    {
      id: 'camera' as const,
      label: 'Cámara',
      icon: Camera,
    },
    {
      id: 'ppe' as const,
      label: 'Detección EPP',
      icon: Shield,
    },
    {
      id: 'alerts' as const,
      label: 'Alertas',
      icon: Bell,
    },
    {
      id: 'history' as const,
      label: 'Historial',
      icon: Clock,
    },
    {
      id: 'user' as const,
      label: 'Usuario',
      icon: User,
    },
  ]
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <SettingsIcon className="w-6 h-6 text-blue-900" />
            <h2 className="text-2xl font-bold text-slate-900">Configuración</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-6 h-6 text-slate-600" />
          </button>
        </div>

        <div className="flex border-b border-slate-200 px-6 overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors whitespace-nowrap ${activeTab === tab.id ? 'border-blue-900 text-blue-900 font-bold' : 'border-transparent text-slate-600 hover:text-slate-900'}`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            )
          })}
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'camera' && <CameraSettings />}
          {activeTab === 'ppe' && <PPESettings />}
          {activeTab === 'alerts' && <AlertsSettings />}
          {activeTab === 'history' && <HistorySettings />}
          {activeTab === 'user' && <UserSettings />}
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50">
          <button
            onClick={onClose}
            className="px-6 py-3 bg-white border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={onClose}
            className="px-6 py-3 bg-blue-900 text-white rounded-lg font-bold hover:bg-blue-800 transition-colors"
          >
            Guardar cambios
          </button>
        </div>
      </div>
    </div>
  )
}

function CameraSettings() {
  const { config, updateConfig } = useCameraConfig()
  const [showIpInput, setShowIpInput] = useState(false)

  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-bold text-slate-900 mb-2">
          Tipo de cámara
        </label>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => {
              updateConfig({ type: 'webcam', ipUrl: '' })
              setShowIpInput(false)
            }}
            className={`px-4 py-3 border-2 rounded-lg font-bold transition-colors ${
              config.type === 'webcam'
                ? 'border-blue-900 bg-blue-50 text-blue-900'
                : 'border-slate-300 text-slate-700 hover:border-blue-900 hover:bg-blue-50'
            }`}
          >
            Cámara del equipo (Webcam)
          </button>
          <button
            onClick={() => {
              updateConfig({ type: 'ip' })
              setShowIpInput(true)
            }}
            className={`px-4 py-3 border-2 rounded-lg font-bold transition-colors ${
              config.type === 'ip'
                ? 'border-blue-900 bg-blue-50 text-blue-900'
                : 'border-slate-300 text-slate-700 hover:border-blue-900 hover:bg-blue-50'
            }`}
          >
            Cámara IP
          </button>
        </div>
      </div>

      {(config.type === 'ip' || showIpInput) && (
        <div>
          <label className="block text-sm font-bold text-slate-900 mb-2">
            URL de la cámara IP
          </label>
          <input
            type="text"
            value={config.ipUrl}
            onChange={(e) => updateConfig({ ipUrl: e.target.value })}
            placeholder="http://192.168.1.100:8080/video"
            className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <p className="mt-2 text-sm text-slate-600">
            Ejemplos: rtsp://192.168.1.100:554/stream o http://192.168.1.100:8080/video
          </p>
        </div>
      )}

      <div>
        <label className="block text-sm font-bold text-slate-900 mb-2">
          Resolución
        </label>
        <div className="grid grid-cols-3 gap-3">
          {(['1080p', '720p', '480p'] as const).map((res) => (
            <button
              key={res}
              onClick={() => updateConfig({ resolution: res })}
              className={`px-4 py-3 border-2 rounded-lg font-bold transition-colors ${
                config.resolution === res
                  ? 'border-blue-900 bg-blue-50 text-blue-900'
                  : 'border-slate-300 text-slate-700 hover:border-blue-900 hover:bg-blue-50'
              }`}
            >
              {res}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-bold text-slate-900 mb-2">
          Frecuencia de análisis
        </label>
        <div className="grid grid-cols-3 gap-3">
          {([1, 2, 5] as const).map((freq) => (
            <button
              key={freq}
              onClick={() => updateConfig({ analysisFrequency: freq })}
              className={`px-4 py-3 border-2 rounded-lg font-medium transition-colors ${
                config.analysisFrequency === freq
                  ? 'border-blue-900 bg-blue-50 text-blue-900 font-bold'
                  : 'border-slate-300 text-slate-700 hover:border-blue-900 hover:bg-blue-50'
              }`}
            >
              {freq}s
            </button>
          ))}
        </div>
      </div>

      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-2">
        <p className="text-sm text-blue-900 font-bold">
          📱 Cómo usar tu celular como cámara IP:
        </p>
        <ol className="text-sm text-blue-800 list-decimal list-inside space-y-1">
          <li>Instala "IP Webcam" desde Google Play Store</li>
          <li>Abre la app y presiona "Iniciar servidor"</li>
          <li>Copia la URL que aparece (ej: http://192.168.1.67:8080)</li>
          <li>Pégala aquí arriba (automáticamente agregará /video)</li>
          <li>¡Asegúrate de estar en la misma red WiFi!</li>
        </ol>
        <p className="text-xs text-blue-700 mt-2">
          💡 Tip: Abre primero la URL en tu navegador para verificar que funciona
        </p>
      </div>
    </div>
  )
}
function PPESettings() {
  const { config, updateConfig } = useCameraConfig()
  
  const ppeItems = [
    { key: 'casco' as const, label: 'Casco' },
    { key: 'lentes' as const, label: 'Lentes de seguridad' },
    { key: 'guantes' as const, label: 'Guantes' },
    { key: 'botas' as const, label: 'Botas' },
    { key: 'ropa' as const, label: 'Pantalón/camisa jean' },
    { key: 'tapabocas' as const, label: 'Tapabocas' },
  ]

  const handleTogglePPE = (key: keyof typeof config.requiredPPE) => {
    updateConfig({
      requiredPPE: {
        ...config.requiredPPE,
        [key]: !config.requiredPPE[key],
      },
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-bold text-slate-900 mb-4">
          Elementos requeridos
        </h3>
        <div className="space-y-3">
          {ppeItems.map((item) => (
            <label
              key={item.key}
              className="flex items-center justify-between p-4 bg-slate-50 rounded-lg cursor-pointer hover:bg-slate-100"
            >
              <span className="font-medium text-slate-900">{item.label}</span>
              <input
                type="checkbox"
                checked={config.requiredPPE[item.key]}
                onChange={() => handleTogglePPE(item.key)}
                className="w-5 h-5 text-blue-900 rounded focus:ring-2 focus:ring-blue-500"
              />
            </label>
          ))}
        </div>
        <p className="mt-4 text-sm text-slate-600">
          💡 Solo se evaluarán los elementos marcados. Los desmarcados no afectarán el cumplimiento.
        </p>
      </div>

      <div>
        <label className="block text-sm font-bold text-slate-900 mb-2">
          Sensibilidad de detección
        </label>
        <div className="flex items-center gap-4">
          <span className="text-sm text-slate-600">Baja</span>
          <input
            type="range"
            min="0"
            max="2"
            defaultValue="1"
            className="flex-1"
          />
          <span className="text-sm text-slate-600">Alta</span>
        </div>
        <div className="mt-2 text-center">
          <span className="inline-block px-3 py-1 bg-blue-100 text-blue-900 rounded-full text-sm font-bold">
            Media
          </span>
        </div>
      </div>
    </div>
  )
}

function AlertsSettings() {
  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-bold text-slate-900 mb-4">
          Tipo de alerta
        </label>
        <div className="grid grid-cols-3 gap-3">
          {['Visual', 'Sonora', 'Ambas'].map((type) => (
            <button
              key={type}
              className="px-4 py-3 border-2 border-slate-300 text-slate-700 rounded-lg font-medium hover:border-blue-900 hover:bg-blue-50 transition-colors"
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-bold text-slate-900 mb-2">
          Volumen
        </label>
        <div className="flex items-center gap-4">
          <span className="text-sm text-slate-600">🔈</span>
          <input
            type="range"
            min="0"
            max="100"
            defaultValue="70"
            className="flex-1"
          />
          <span className="text-sm text-slate-600">🔊</span>
        </div>
        <div className="mt-2 text-center text-sm text-slate-600">70%</div>
      </div>

      <div>
        <label className="block text-sm font-bold text-slate-900 mb-2">
          Intervalo de repetición
        </label>
        <select className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
          <option>Cada 5 segundos</option>
          <option>Cada 10 segundos</option>
          <option>Cada 30 segundos</option>
          <option>Una vez</option>
        </select>
      </div>
    </div>
  )
}

function HistorySettings() {
  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-bold text-slate-900 mb-2">
          Registros a mostrar
        </label>
        <div className="grid grid-cols-3 gap-3">
          {['10', '20', '50'].map((num) => (
            <button
              key={num}
              className="px-4 py-3 border-2 border-slate-300 text-slate-700 rounded-lg font-medium hover:border-blue-900 hover:bg-blue-50 transition-colors"
            >
              {num} registros
            </button>
          ))}
        </div>
      </div>

      <div className="pt-4 space-y-3">
        <button className="w-full px-4 py-3 bg-blue-900 text-white rounded-lg font-bold hover:bg-blue-800 transition-colors">
          Descargar historial (CSV)
        </button>
        <button className="w-full px-4 py-3 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700 transition-colors">
          Limpiar historial
        </button>
      </div>

      <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
        <p className="text-sm text-amber-800">
          <strong>Nota:</strong> Limpiar el historial eliminará permanentemente
          todos los registros de detección.
        </p>
      </div>
    </div>
  )
}

function UserSettings() {
  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-bold text-slate-900 mb-2">
          Idioma
        </label>
        <div className="grid grid-cols-2 gap-3">
          <button className="px-4 py-3 border-2 border-blue-900 bg-blue-50 text-blue-900 rounded-lg font-bold">
            Español
          </button>
          <button className="px-4 py-3 border-2 border-slate-300 text-slate-700 rounded-lg font-medium hover:border-blue-900 hover:bg-blue-50 transition-colors">
            English
          </button>
        </div>
      </div>

      <div className="pt-4">
        <h3 className="text-sm font-bold text-slate-900 mb-4">Avanzado</h3>

        <div className="space-y-4">
          <div className="p-4 bg-slate-50 rounded-lg">
            <div className="text-sm text-slate-600 mb-1">
              Versión del modelo
            </div>
            <div className="font-bold text-slate-900">v2.4.1 (Actualizado)</div>
          </div>

          <button className="w-full px-4 py-3 bg-slate-100 text-slate-900 rounded-lg font-bold hover:bg-slate-200 transition-colors">
            Cargar nuevo modelo de IA
          </button>
        </div>
      </div>
    </div>
  )
}
