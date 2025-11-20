import { Shield } from 'lucide-react'

export function Header() {
  return (
    <header className="bg-white border-b border-slate-200 px-6 py-4">
      <div className="flex items-center gap-3">
        <div className="bg-blue-900 p-2 rounded-lg">
          <Shield className="w-8 h-8 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Sistema de Verificación de EPP
          </h1>
          <p className="text-sm text-slate-600">
            Monitoreo en tiempo real del uso de equipos de protección personal
          </p>
        </div>
      </div>
    </header>
  )
}
