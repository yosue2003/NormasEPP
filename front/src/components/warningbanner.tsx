import { AlertTriangle } from 'lucide-react'

interface WarningBannerProps {
  show: boolean
  missingItems: string[]
}

export function WarningBanner({ show, missingItems }: WarningBannerProps) {
  if (!show) return null
  
  return (
    <div className="bg-red-600 text-white px-6 py-4 rounded-xl shadow-lg flex items-center gap-4">
      <AlertTriangle className="w-6 h-6 flex-shrink-0" />
      <div>
        <div className="font-bold text-lg">Faltan elementos de seguridad</div>
        <div className="text-sm text-red-100">
          Elementos faltantes: {missingItems.join(', ')}
        </div>
      </div>
    </div>
  )
}
