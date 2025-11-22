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
    <div className="bg-white rounded-2xl shadow-xl border-2 border-slate-200 overflow-hidden">
      {/* Header con degradado industrial */}
      <div className="bg-gradient-to-br from-industrial-dark to-steel-blue p-4">
        <h2 className="text-lg font-bold text-white mb-1">Estado del EPP</h2>
        {isDetecting && (
          <div className="flex items-center gap-2 text-warning-yellow">
            <div className="w-2 h-2 bg-warning-yellow rounded-full animate-pulse" />
            <span className="text-xs font-semibold">Analizando...</span>
          </div>
        )}
      </div>

      {/* Contenido */}
      <div className="p-4">
        {/* Status Badge */}
        <div
          className={`p-4 rounded-xl text-center border-2 ${
            isCompliant 
              ? 'bg-green-50 border-success-green' 
              : 'bg-red-50 border-danger-red'
          }`}
        >
          <div
            className={`text-2xl font-black mb-1 ${
              isCompliant ? 'text-success-green' : 'text-danger-red'
            }`}
          >
            {isCompliant ? '✓ EPP COMPLETO' : '⚠ EPP INCOMPLETO'}
          </div>
          {!isCompliant && (
            <div className="text-xs text-danger-red font-semibold">
              Faltan {missingItems} elemento{missingItems > 1 ? 's' : ''}
            </div>
          )}
        </div>

        {/* Lista EPP */}
        <div className="mt-4 space-y-2">
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
    </div>
  )
}
