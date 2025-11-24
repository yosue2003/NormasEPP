
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export interface PPEStatus {
  casco: boolean
  lentes: boolean
  guantes: boolean
  botas: boolean
  ropa: boolean
  tapabocas: boolean
}

export interface Detection {
  class: string
  confidence: number
  bbox: number[]
}

export interface DetectionResponse {
  ppe_status: PPEStatus
  detections: Detection[]
  is_compliant: boolean
  has_person?: boolean
}


export async function detectPPE(
  imageData: string,
  confidence: number = 0.5
): Promise<DetectionResponse> {
  try {
    const response = await fetch(`${API_URL}/api/detect`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image: imageData,
        confidence,
      }),
    })

    if (!response.ok) {
      throw new Error(`Error HTTP: ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    console.error('Error al detectar EPP:', error)
    throw error
  }
}


export class PPEWebSocket {
  private ws: WebSocket | null = null
  private reconnectAttempts = 0
  private reconnectDelays = [2000, 5000, 10000, 30000]
  private currentDelayIndex = 0
  private heartbeatInterval: number | null = null
  private stableConnectionTimer: number | null = null
  private connectionStartTime: number = 0
  private onMessageCallback: (data: DetectionResponse) => void
  private onErrorCallback?: (error: Event) => void
  private onConnectCallback?: () => void
  private onDisconnectCallback?: () => void
  private isManualDisconnect = false

  constructor(
    onMessage: (data: DetectionResponse) => void,
    onError?: (error: Event) => void,
    onConnect?: () => void,
    onDisconnect?: () => void
  ) {
    this.onMessageCallback = onMessage
    this.onErrorCallback = onError
    this.onConnectCallback = onConnect
    this.onDisconnectCallback = onDisconnect
  }

  connect() {
    this.isManualDisconnect = false
    const wsUrl = API_URL.replace('http', 'ws') + '/api/ws/detect'
    console.log('🔌 Intentando conectar WebSocket a:', wsUrl)
    
    try {
      this.ws = new WebSocket(wsUrl)

      this.ws.onopen = () => {
        console.log('WebSocket conectado exitosamente')
        this.connectionStartTime = Date.now()
        this.startHeartbeat()
        
        this.startStableConnectionTimer()
        
        if (this.onConnectCallback) {
          this.onConnectCallback()
        }
      }

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          console.log('📨 Mensaje recibido del servidor:', data)
          
          if (data.type === 'connected') {
            console.log('✅ Servidor confirmó conexión:', data.message)
            return
          }
          
          if (data.type === 'processing') {
            console.log('⏳ Servidor procesando imagen...')
            return
          }
          
          if (data.type === 'ping') {
            this.sendPong()
            return
          }

          if (data.type === 'pong') {
            return
          }

          console.log('✅ Procesando respuesta de detección...')
          this.onMessageCallback(data as DetectionResponse)
        } catch (error) {
          console.error('Error al parsear mensaje WebSocket:', error)
          console.error('Datos recibidos:', event.data)
        }
      }

      this.ws.onerror = (error) => {
        console.error('Error en WebSocket:', error)
        if (this.onErrorCallback) {
          this.onErrorCallback(error)
        }
      }

      this.ws.onclose = (event) => {
        const duration = Date.now() - this.connectionStartTime
        console.log(`WebSocket desconectado - Código: ${event.code} | Duración: ${(duration/1000).toFixed(1)}s`)
        
        this.stopStableConnectionTimer()
        
        if (this.onDisconnectCallback) {
          this.onDisconnectCallback()
        }
        
        if (!this.isManualDisconnect) {
          this.attemptReconnect()
        }
      }
    } catch (error) {
      console.error('Error al crear WebSocket:', error)
    }
  }

  send(imageData: string, confidence: number = 0.5) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        const payload = {
          image: imageData,
          confidence,
        }
        console.log('🚀 Enviando imagen al servidor via WebSocket...')
        console.log(`📊 Tamaño: ${(imageData.length / 1024).toFixed(2)}KB`)
        this.ws.send(JSON.stringify(payload))
      } catch (error) {
        console.error('Error al enviar datos:', error)
        if (!this.isManualDisconnect) {
          this.attemptReconnect()
        }
      }
    } else {
      console.warn('WebSocket no está conectado, reconectando...')
      if (!this.isManualDisconnect) {
        this.connect()
      }
    }
  }

  disconnect() {
    this.isManualDisconnect = true
    this.stopHeartbeat()
    this.stopStableConnectionTimer()
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
    this.reconnectAttempts = 0
    this.currentDelayIndex = 0
  }

  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN
  }

  private attemptReconnect() {
    this.reconnectAttempts++

    const delay = this.reconnectDelays[this.currentDelayIndex]

    if (this.currentDelayIndex < this.reconnectDelays.length - 1) {
      this.currentDelayIndex++
    }
    
    console.log(
      `🔄 Reconectando en ${delay/1000}s... (intento #${this.reconnectAttempts})`
    )
    
    setTimeout(() => this.connect(), delay)
  }

  private startHeartbeat() {
    this.stopHeartbeat()
    this.heartbeatInterval = window.setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        try {
          this.ws.send(JSON.stringify({ type: 'ping' }))
        } catch {
          console.warn('Error en heartbeat, reconectando...')
          this.connect()
        }
      }
    }, 30000)
  }

  private stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
      this.heartbeatInterval = null
    }
  }
  
  private sendPong() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }))
      } catch (error) {
        console.warn('⚠️ Error enviando pong:', error)
      }
    }
  }
  
  private startStableConnectionTimer() {
    this.stopStableConnectionTimer()
    this.stableConnectionTimer = window.setTimeout(() => {
      console.log('✅ Conexión estable por 5 min - Reseteando backoff')
      this.reconnectAttempts = 0
      this.currentDelayIndex = 0
    }, 5 * 60 * 1000)
  }
  
  private stopStableConnectionTimer() {
    if (this.stableConnectionTimer) {
      clearTimeout(this.stableConnectionTimer)
      this.stableConnectionTimer = null
    }
  }
}
