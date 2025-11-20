import { useState } from 'react'
import type { ReactNode } from 'react'
import { CameraContext } from './context'
import { DEFAULT_CAMERA_CONFIG } from './types'
import type { CameraConfig } from './types'

interface CameraProviderProps {
  children: ReactNode
}

export function CameraProvider({ children }: CameraProviderProps) {
  const [config, setConfig] = useState<CameraConfig>(DEFAULT_CAMERA_CONFIG)

  const updateConfig = (newConfig: Partial<CameraConfig>) => {
    setConfig((prev) => ({ ...prev, ...newConfig }))
  }

  return (
    <CameraContext.Provider value={{ config, updateConfig }}>
      {children}
    </CameraContext.Provider>
  )
}
