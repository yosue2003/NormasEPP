import { useState, useEffect, useRef, useCallback } from 'react'
import { Settings, Power, PowerOff } from 'lucide-react'
import { CameraFeed, type CameraFeedHandle } from './CameraFeed'
import { StatusPanel } from './StatusPanel'
import { WarningBanner } from './warningbanner'
import { DetectionHistory } from './DetectionHistory'
import { PPEWebSocket, type DetectionResponse } from '../services/ppeService'
import { useCameraConfig } from '../contexts/camera'
import { alertService } from '../utils/alertService'

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
  const [detectionRecords, setDetectionRecords] = useState<DetectionRecord[]>(() => {
    // Cargar historial desde localStorage
    try {
      const stored = localStorage.getItem('epp-detection-history')
      if (stored) {
        const parsed = JSON.parse(stored)
        return parsed.slice(0, config.history.maxRecords)
      }
    } catch (error) {
      console.error('Error cargando historial:', error)
    }
    return []
  })
  const [cameraActive, setCameraActive] = useState(false)
  const [hasDetection, setHasDetection] = useState(false)
  const [detections, setDetections] = useState<Array<{class: string, confidence: number, bbox: number[]}>>([])  
  const wsRef = useRef<PPEWebSocket | null>(null)
  const cameraFeedRef = useRef<CameraFeedHandle | null>(null)
  const detectionIntervalRef = useRef<number | null>(null)
  const isProcessingRef = useRef(false)
  const lastSendTimeRef = useRef<number>(0)
  const adaptiveIntervalRef = useRef<number>(1500)
  const latencyHistoryRef = useRef<number[]>([])

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

    const latency = Date.now() - lastSendTimeRef.current
    console.log(`Latencia: ${latency}ms | Detecciones: ${data.detections?.length || 0}`)

    if (!data || !data.ppe_status) {
      console.warn('Respuesta inválida del servidor:', data)
      setIsDetecting(false)
      isProcessingRef.current = false
      return
    }

    if (data.has_person === false) {
      console.log('Sin personas en escena - Omitiendo alertas EPP')
      setPpeStatus({
        casco: false,
        lentes: false,
        guantes: false,
        botas: false,
        ropa: false,
        tapabocas: false,
      })
      setDetections([])
      setHasDetection(false)
      setIsDetecting(false)
      isProcessingRef.current = false
      return
    }

    latencyHistoryRef.current.push(latency)
    if (latencyHistoryRef.current.length > 10) {
      latencyHistoryRef.current.shift()
    }

    if (latencyHistoryRef.current.length >= 5) {
      const avgLatency = latencyHistoryRef.current.reduce((a, b) => a + b, 0) / latencyHistoryRef.current.length
      
      if (avgLatency < 300) {
        adaptiveIntervalRef.current = 1000
      } else if (avgLatency < 600) {
        adaptiveIntervalRef.current = 1500
      } else {
        adaptiveIntervalRef.current = 2500
      }
      
      console.log(`Intervalo ajustado: ${adaptiveIntervalRef.current}ms (latencia avg: ${avgLatency.toFixed(0)}ms)`)
    }

    setPpeStatus(data.ppe_status)
    setDetections(data.detections || [])
    setIsDetecting(false)
    isProcessingRef.current = false
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

    setDetectionRecords((prev) => {
      const updated = [newRecord, ...prev.slice(0, config.history.maxRecords - 1)]
      // Persistir en localStorage
      localStorage.setItem('epp-detection-history', JSON.stringify(updated))
      return updated
    })

    // Trigger de alertas si NO es compliant
    if (!data.is_compliant) {
      const alertTriggered = alertService.trigger(
        config.alerts.type,
        config.alerts.volume,
        config.alerts.repeatInterval
      )
      if (alertTriggered) {
        console.log(`🚨 Alerta ${config.alerts.type} ejecutada`)
      }
    } else {
      // Reset del timer cuando se completa el EPP
      alertService.reset()
    }
  }, [config.alerts, config.history.maxRecords])

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
          console.log('Conectado al servidor')
        },
        () => {
          setIsConnected(false)
          console.log('Desconectado del servidor')
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
        clearTimeout(detectionIntervalRef.current)
      }
    }
  }, [handleDetectionResponse])

  const startDetection = () => {
    if (!cameraFeedRef.current || !wsRef.current?.isConnected()) {
      alert('La cámara o el servidor no están disponibles')
      return
    }

    setCameraActive(true)
    console.log('▶️ Iniciando detección continua con intervalo adaptativo')

    const scheduleNextDetection = () => {
      detectionIntervalRef.current = window.setTimeout(() => {
        if (!cameraFeedRef.current || !wsRef.current?.isConnected()) {
          return
        }

        if (!isProcessingRef.current) {
          isProcessingRef.current = true
          setIsDetecting(true)
          lastSendTimeRef.current = Date.now()
          
          const imageData = cameraFeedRef.current.handleCapture()
          if (imageData) {
            wsRef.current.send(imageData, 0.3)
          } else {
            isProcessingRef.current = false
            setIsDetecting(false)
          }
        }

        scheduleNextDetection()
      }, adaptiveIntervalRef.current)
    }

    scheduleNextDetection()
  }

  const stopDetection = () => {
    console.log('⏸️ Deteniendo detección continua')
    setCameraActive(false)
    if (detectionIntervalRef.current) {
      clearTimeout(detectionIntervalRef.current)
      detectionIntervalRef.current = null
    }
    setIsDetecting(false)
    isProcessingRef.current = false
    latencyHistoryRef.current = []
    adaptiveIntervalRef.current = 1500
  }

  const handleRefresh = () => {
    console.log('Refreshing camera...')
    stopDetection()
  }
  return (
    <div className="space-y-6">
      <WarningBanner show={!isCompliant} missingItems={missingItems} />

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_400px] gap-4 sm:gap-6 items-start">
        <div className="w-full">
          <CameraFeed
            ref={cameraFeedRef}
            isCompliant={isCompliant}
            onRefresh={handleRefresh}
            detections={detections}
            isConnected={isConnected}
          />
        </div>

        <div className="w-full xl:sticky xl:top-6">
          <StatusPanel ppeStatus={ppeStatus} isDetecting={isDetecting} />
        </div>
      </div>

      <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3">
        {/* Botón principal - Más grande y destacado */}
        <button
          onClick={cameraActive ? stopDetection : startDetection}
          disabled={!isConnected}
          className={`flex items-center justify-center gap-3 px-8 py-4 rounded-xl font-bold text-base
            transition-all shadow-lg hover:shadow-xl hover:scale-[1.02] ${
            cameraActive
              ? 'bg-gradient-to-r from-red-600 to-red-700 text-white hover:from-red-700 hover:to-red-800'
              : 'bg-gradient-to-r from-success-green to-green-700 text-white hover:from-green-700 hover:to-green-800'
          } disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100`}
        >
          {cameraActive ? (
            <>
              <PowerOff className="w-6 h-6" />
              <span>Detener</span>
            </>
          ) : (
            <>
              <Power className="w-6 h-6" />
              <span className="hidden sm:inline">Iniciar Detección</span>
              <span className="sm:hidden">Iniciar</span>
            </>
          )}
        </button>

        {/* Botón secundario */}
        <button
          onClick={onOpenConfig}
          className="flex items-center justify-center gap-2 px-5 py-4 bg-white border-2 border-slate-300 
            text-slate-700 rounded-xl font-semibold hover:bg-slate-50 hover:border-slate-400
            transition-all shadow-md"
        >
          <Settings className="w-5 h-5" />
          <span className="hidden sm:inline">Configuración</span>
        </button>
      </div>

      <DetectionHistory records={detectionRecords} />
    </div>
  )
}
