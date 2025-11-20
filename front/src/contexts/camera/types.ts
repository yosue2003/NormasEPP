export type CameraType = 'webcam' | 'ip'

export interface PPEConfig {
  casco: boolean
  lentes: boolean
  guantes: boolean
  botas: boolean
  ropa: boolean
  tapabocas: boolean
}

export interface CameraConfig {
  type: CameraType
  ipUrl: string
  resolution: '1080p' | '720p' | '480p'
  analysisFrequency: 1 | 2 | 5
  requiredPPE: PPEConfig
}

export interface CameraContextType {
  config: CameraConfig
  updateConfig: (config: Partial<CameraConfig>) => void
}

export const DEFAULT_CAMERA_CONFIG: CameraConfig = {
  type: 'webcam',
  ipUrl: '',
  resolution: '1080p',
  analysisFrequency: 2,
  requiredPPE: {
    casco: true,
    lentes: true,
    guantes: true,
    botas: true,
    ropa: true,
    tapabocas: true,
  },
}
