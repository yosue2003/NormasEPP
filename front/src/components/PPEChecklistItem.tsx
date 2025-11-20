import { CheckCircle2, XCircle } from 'lucide-react'

interface PPEChecklistItemProps {
  label: string
  icon: React.ReactNode
  detected: boolean
}

export function PPEChecklistItem({
  label,
  icon,
  detected,
}: PPEChecklistItemProps) {
  return (
    <div className="flex items-center justify-between py-3 px-4 bg-slate-50 rounded-lg">
      <div className="flex items-center gap-3">
        <div className="text-slate-700">{icon}</div>
        <span className="font-medium text-slate-900">{label}</span>
      </div>
      {detected ? (
        <CheckCircle2 className="w-6 h-6 text-green-600" />
      ) : (
        <XCircle className="w-6 h-6 text-red-600" />
      )}
    </div>
  )
}
