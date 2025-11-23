import { HardHat, Glasses, Hand, Footprints, Shirt, Workflow, CheckCircle2, AlertCircle, Pause } from 'lucide-react'
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
  hasDetection?: boolean
}

export function StatusPanel({ ppeStatus, isDetecting = false, hasDetection = false }: StatusPanelProps) {
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
      <div className="bg-gradient-to-br from-industrial-dark to-steel-blue p-4">
        <h2 className="text-lg font-bold text-white mb-1">Estado del EPP</h2>
        {isDetecting && (
          <div className="flex items-center gap-2 text-warning-yellow">
            <div className="w-2 h-2 bg-warning-yellow rounded-full animate-pulse" />
            <span className="text-xs font-semibold">Analizando...</span>
          </div>
        )}
      </div>

      <div className="p-4">
        {hasDetection ? (
          <div
            className={`p-4 rounded-xl text-center border-2 ${
              isCompliant 
                ? 'bg-green-50 border-success-green' 
                : 'bg-red-50 border-danger-red'
            }`}
          >
            <div className="flex items-center justify-center gap-2 mb-1">
              {isCompliant ? (
                <CheckCircle2 className="w-7 h-7 text-success-green" />
              ) : (
                <AlertCircle className="w-7 h-7 text-danger-red" />
              )}
              <span
                className={`text-2xl font-black ${
                  isCompliant ? 'text-success-green' : 'text-danger-red'
                }`}
              >
                {isCompliant ? 'EPP COMPLETO' : 'EPP INCOMPLETO'}
              </span>
            </div>
            {!isCompliant && (
              <div className="text-xs text-danger-red font-semibold">
                Faltan {missingItems} elemento{missingItems > 1 ? 's' : ''}
              </div>
            )}
          </div>
        ) : (
          <div className="p-4 rounded-xl text-center border-2 border-slate-300 bg-slate-50">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Pause className="w-7 h-7 text-slate-400" />
              <span className="text-2xl font-black text-slate-400">
                EN ESPERA
              </span>
            </div>
            <div className="text-xs text-slate-500 font-semibold">
              Inicia la detección para ver el estado
            </div>
          </div>
        )}

        <div className="mt-4 space-y-2">
        <PPEChecklistItem
          label="Casco"
          icon={<HardHat className="w-5 h-5" />}
          detected={ppeStatus.casco}
          hasDetection={hasDetection}
        />
        <PPEChecklistItem
          label="Lentes de seguridad"
          icon={<Glasses className="w-5 h-5" />}
          detected={ppeStatus.lentes}
          hasDetection={hasDetection}
        />
        <PPEChecklistItem
          label="Guantes"
          icon={<Hand className="w-5 h-5" />}
          detected={ppeStatus.guantes}
          hasDetection={hasDetection}
        />
        <PPEChecklistItem
          label="Botas"
          icon={<Footprints className="w-5 h-5" />}
          detected={ppeStatus.botas}
          hasDetection={hasDetection}
        />
        <PPEChecklistItem
          label="Chaleco/Protector"
          icon={<Shirt className="w-5 h-5" />}
          detected={ppeStatus.ropa}
          hasDetection={hasDetection}
        />
        <PPEChecklistItem
          label="Tapabocas"
          icon={<Workflow className="w-5 h-5" />}
          detected={ppeStatus.tapabocas}
          hasDetection={hasDetection}
        />
        </div>
      </div>
    </div>
  )
}
