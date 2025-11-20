import { useState, useEffect, useRef, useCallback } from 'react'
import { Settings, Power, PowerOff } from 'lucide-react'
import { CameraFeed, type CameraFeedHandle } from './CameraFeed'
import { StatusPanel } from './StatusPanel'
import { WarningBanner } from './warningbanner'
import { DetectionHistory } from './DetectionHistory'
import { PPEWebSocket, type DetectionResponse } from '../services/ppeService'
import { useCameraConfig } from '../contexts/camera'

interface DashboardProps {
  onOpenConfig: () => void
}

interface DetectionRecord {
  id: string
  fecha: string
  hora: string
  estado: 'Completo' | 'Incompleto'
  faltantes: string
}

export function Dashboard({ onOpenConfig }: DashboardProps) {
  const { config } = useCameraConfig()
  const [ppeStatus, setPpeStatus] = useState({
    casco: false,
    lentes: false,
    guantes: false,
    botas: false,
    ropa: false,
    tapabocas: false,
  })
  const [isDetecting, setIsDetecting] = useState(false)
  const [isConnected, setIsConnected] = useState(false)
  const [detectionRecords, setDetectionRecords] = useState<DetectionRecord[]>([])
  const [cameraActive, setCameraActive] = useState(false)
  const [hasDetection, setHasDetection] = useState(false)
  const [detections, setDetections] = useState<Array<{class: string, confidence: number, bbox: number[]}>>([])  
  const wsRef = useRef<PPEWebSocket | null>(null)
  const cameraFeedRef = useRef<CameraFeedHandle | null>(null)
  const detectionIntervalRef = useRef<number | null>(null)

  const isCompliant = !hasDetection || Object.entries(ppeStatus).every(([key, detected]) => {
    const isRequired = config.requiredPPE[key as keyof typeof config.requiredPPE]
    return !isRequired || detected 
  })

  const missingItems = Object.entries(ppeStatus)
    .filter(([key, detected]) => {
      const isRequired = config.requiredPPE[key as keyof typeof config.requiredPPE]
      return isRequired && !detected 
    })
    .map(([key]) => {
      const labels: Record<string, string> = {
        casco: 'Casco',
        lentes: 'Lentes de seguridad',
        guantes: 'Guantes',
        botas: 'Botas de seguridad',
        ropa: 'Chaleco/Protector',
        tapabocas: 'Tapabocas',
      }
      return labels[key]
    })

  const handleDetectionResponse = useCallback((data: DetectionResponse) => {
    console.log('📥 Detecciones recibidas:', data.detections?.length || 0, data.detections)
    setPpeStatus(data.ppe_status)
    setDetections(data.detections || [])
    setIsDetecting(false)
    setHasDetection(true)

    const now = new Date()
    const newRecord: DetectionRecord = {
      id: Date.now().toString(),
      fecha: now.toLocaleDateString('es-ES'),
      hora: now.toLocaleTimeString('es-ES'),
      estado: data.is_compliant ? 'Completo' : 'Incompleto',
      faltantes: data.is_compliant
        ? ''
        : Object.entries(data.ppe_status)
            .filter(([, detected]) => !detected)
            .map(([key]) => {
              const labels: Record<string, string> = {
                casco: 'Casco',
                lentes: 'Lentes',
                guantes: 'Guantes',
                botas: 'Botas',
                ropa: 'Chaleco',
                tapabocas: 'Tapabocas',
              }
              return labels[key]
            })
            .join(', '),
    }

    setDetectionRecords((prev) => [newRecord, ...prev.slice(0, 9)])
  }, [])

  useEffect(() => {
    const initTimeout = setTimeout(() => {
      wsRef.current = new PPEWebSocket(
        handleDetectionResponse,
        (error) => {
          console.error('Error WebSocket:', error)
          setIsConnected(false)
        },
        () => {
          setIsConnected(true)
          console.log('✅ Conectado al servidor')
        },
        () => {
          setIsConnected(false)
          console.log('❌ Desconectado del servidor')
        }
      )

      wsRef.current.connect()
    }, 500)

    return () => {
      clearTimeout(initTimeout)
      if (wsRef.current) {
        wsRef.current.disconnect()
      }
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current)
      }
    }
  }, [handleDetectionResponse])

  const startDetection = () => {
    if (!cameraFeedRef.current || !wsRef.current?.isConnected()) {
      alert('La cámara o el servidor no están disponibles')
      return
    }

    setCameraActive(true)

    detectionIntervalRef.current = window.setInterval(() => {
      if (cameraFeedRef.current && wsRef.current?.isConnected()) {
        setIsDetecting(true)
        const imageData = cameraFeedRef.current.handleCapture()
        if (imageData) {
          wsRef.current.send(imageData, 0.3) 
        }
      }
    }, 1000)
  }

  const stopDetection = () => {
    setCameraActive(false)
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current)
      detectionIntervalRef.current = null
    }
    setIsDetecting(false)
  }

  const handleRefresh = () => {
    console.log('Refreshing camera...')
    stopDetection()
  }
  return (
    <div className="space-y-6">
      <WarningBanner show={!isCompliant} missingItems={missingItems} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <CameraFeed
            ref={cameraFeedRef}
            isCompliant={isCompliant}
            onRefresh={handleRefresh}
            detections={detections}
          />
        </div>

        <div>
          <StatusPanel ppeStatus={ppeStatus} isDetecting={isDetecting} />
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="flex items-center gap-2 px-4 py-2 bg-white border-2 border-slate-300 rounded-lg">
          <div
            className={`w-3 h-3 rounded-full ${
              isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'
            }`}
          />
          <span className="text-sm font-medium text-slate-700">
            {isConnected ? 'Servidor conectado' : 'Servidor desconectado'}
          </span>
        </div>

        <button
          onClick={cameraActive ? stopDetection : startDetection}
          disabled={!isConnected}
          className={`flex items-center gap-2 px-6 py-3 rounded-lg font-bold transition-colors shadow-lg ${
            cameraActive
              ? 'bg-red-600 text-white hover:bg-red-700'
              : 'bg-green-600 text-white hover:bg-green-700'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {cameraActive ? <PowerOff className="w-5 h-5" /> : <Power className="w-5 h-5" />}
          <span>{cameraActive ? 'Detener detección' : 'Iniciar detección'}</span>
        </button>

        <button
          onClick={onOpenConfig}
          className="flex items-center gap-2 px-6 py-3 bg-white border-2 border-slate-300 text-slate-700 rounded-lg font-bold hover:bg-slate-50 transition-colors"
        >
          <Settings className="w-5 h-5" />
          Configuración
        </button>
      </div>

      <DetectionHistory records={detectionRecords} />
    </div>
  )
}
