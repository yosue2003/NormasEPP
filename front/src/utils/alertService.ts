// Servicio de alertas para EPP
class AlertService {
  private audioContext: AudioContext | null = null
  private lastAlertTime: number = 0
  private repeatInterval: number = 5000 // milisegundos

  constructor() {
    // Inicializar AudioContext solo cuando se necesite
  }

  private initAudio() {
    if (!this.audioContext) {
      // @ts-expect-error - Soporte para navegadores antiguos con webkitAudioContext
      const AudioContextClass = window.AudioContext || window.webkitAudioContext
      this.audioContext = new AudioContextClass()
    }
  }

  // Genera un beep de alerta con Web Audio API
  private playBeep(volume: number) {
    this.initAudio()
    if (!this.audioContext) return

    const oscillator = this.audioContext.createOscillator()
    const gainNode = this.audioContext.createGain()

    oscillator.connect(gainNode)
    gainNode.connect(this.audioContext.destination)

    // Configuración del beep
    oscillator.frequency.value = 800 // Frecuencia en Hz
    oscillator.type = 'sine'

    // Volumen (0.0 a 1.0)
    gainNode.gain.setValueAtTime(volume / 100, this.audioContext.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.3)

    oscillator.start(this.audioContext.currentTime)
    oscillator.stop(this.audioContext.currentTime + 0.3)
  }

  // Trigger de alerta
  trigger(type: 'visual' | 'sound' | 'both', volume: number, repeatIntervalSeconds: number) {
    const now = Date.now()
    this.repeatInterval = repeatIntervalSeconds * 1000

    // Verificar si debe repetir según el intervalo
    if (now - this.lastAlertTime < this.repeatInterval) {
      return false // No repetir aún
    }

    this.lastAlertTime = now

    // Ejecutar alerta según tipo
    if (type === 'sound' || type === 'both') {
      this.playBeep(volume)
    }

    return true // Alerta ejecutada
  }

  // Reset del timer (útil cuando se completa el EPP)
  reset() {
    this.lastAlertTime = 0
  }
}

export const alertService = new AlertService()
