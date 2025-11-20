import { HardHat, Glasses, Hand, Footprints, Shirt, Workflow } from 'lucide-react'
import { PPEChecklistItem } from './PPEChecklistItem'
import { useCameraConfig } from '../contexts/camera'


interface StatusPanelProps {
  ppeStatus: {
    casco: boolean
    lentes: boolean
    guantes: boolean
    botas: boolean
    ropa: boolean
    tapabocas: boolean
  }
  isDetecting?: boolean
}

export function StatusPanel({ ppeStatus, isDetecting = false }: StatusPanelProps) {
  const { config } = useCameraConfig()
  
  const isCompliant = Object.entries(ppeStatus).every(([key, detected]) => {
    const isRequired = config.requiredPPE[key as keyof typeof config.requiredPPE]
    return !isRequired || detected
  })
  
  const missingItems = Object.entries(ppeStatus).filter(
    ([key, detected]) => {
      const isRequired = config.requiredPPE[key as keyof typeof config.requiredPPE]
      return isRequired && !detected
    },
  ).length
  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-slate-900">Estado de EPP</h2>
        {isDetecting && (
          <div className="flex items-center gap-2 text-blue-600">
            <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse" />
            <span className="text-xs font-medium">Detectando...</span>
          </div>
        )}
      </div>

      <div
        className={`mb-6 p-6 rounded-xl text-center ${isCompliant ? 'bg-green-50 border-2 border-green-500' : 'bg-red-50 border-2 border-red-500'}`}
      >
        <div
          className={`text-3xl font-bold mb-2 ${isCompliant ? 'text-green-700' : 'text-red-700'}`}
        >
          {isCompliant ? 'EPP COMPLETO' : 'EPP INCOMPLETO'}
        </div>
        {!isCompliant && (
          <div className="text-sm text-red-600 font-medium">
            Faltan {missingItems} elemento{missingItems > 1 ? 's' : ''} de
            seguridad
          </div>
        )}
      </div>

      <div className="space-y-2">
        <PPEChecklistItem
          label="Casco"
          icon={<HardHat className="w-5 h-5" />}
          detected={ppeStatus.casco}
        />
        <PPEChecklistItem
          label="Lentes de seguridad"
          icon={<Glasses className="w-5 h-5" />}
          detected={ppeStatus.lentes}
        />
        <PPEChecklistItem
          label="Guantes"
          icon={<Hand className="w-5 h-5" />}
          detected={ppeStatus.guantes}
        />
        <PPEChecklistItem
          label="Botas"
          icon={<Footprints className="w-5 h-5" />}
          detected={ppeStatus.botas}
        />
        <PPEChecklistItem
          label="Pantalón/camisa jean"
          icon={<Shirt className="w-5 h-5" />}
          detected={ppeStatus.ropa}
        />
        <PPEChecklistItem
          label="Tapabocas"
          icon={<Workflow className="w-5 h-5" />}
          detected={ppeStatus.tapabocas}
        />
      </div>
    </div>
  )
}
