
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
  private maxReconnectAttempts = 10
  private reconnectDelay = 3000
  private heartbeatInterval: number | null = null
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
    console.log('📡 API_URL configurado:', API_URL)
    
    try {
      this.ws = new WebSocket(wsUrl)

      this.ws.onopen = () => {
        console.log('✅ WebSocket conectado exitosamente')
        this.reconnectAttempts = 0
        this.startHeartbeat()
        if (this.onConnectCallback) {
          this.onConnectCallback()
        }
      }

      this.ws.onmessage = (event) => {
        try {
          const data: DetectionResponse = JSON.parse(event.data)
          this.onMessageCallback(data)
        } catch (error) {
          console.error('❌ Error al parsear mensaje WebSocket:', error)
          console.error('Datos recibidos:', event.data)
          // No desconectar por un error de parseo
        }
      }

      this.ws.onerror = (error) => {
        console.error('❌ Error en WebSocket:', error)
        if (this.onErrorCallback) {
          this.onErrorCallback(error)
        }
      }

      this.ws.onclose = () => {
        console.log('❌ WebSocket desconectado')
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
        this.ws.send(
          JSON.stringify({
            image: imageData,
            confidence,
          })
        )
      } catch (error) {
        console.error('❌ Error al enviar datos:', error)
        // Intentar reconectar si falla el envío
        if (!this.isManualDisconnect) {
          this.attemptReconnect()
        }
      }
    } else {
      console.warn('⚠️ WebSocket no está conectado, reconectando...')
      if (!this.isManualDisconnect) {
        this.connect()
      }
    }
  }

  disconnect() {
    this.isManualDisconnect = true
    this.stopHeartbeat()
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
    this.reconnectAttempts = 0
  }

  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN
  }

  private attemptReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++
      console.log(
        `🔄 Intentando reconectar (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`
      )
      setTimeout(() => this.connect(), this.reconnectDelay)
    } else {
      console.error('❌ Máximo de intentos de reconexión alcanzado')
    }
  }

  private startHeartbeat() {
    this.stopHeartbeat()
    // Ping cada 30 segundos para mantener conexión viva
    this.heartbeatInterval = window.setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        try {
          this.ws.send(JSON.stringify({ type: 'ping' }))
        } catch {
          console.warn('⚠️ Error en heartbeat, reconectando...')
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
}
