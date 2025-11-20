import { Clock } from 'lucide-react'



interface DetectionRecord {
  id: string
  fecha: string
  hora: string
  estado: 'Completo' | 'Incompleto'
  faltantes: string
}

interface DetectionHistoryProps {
  records: DetectionRecord[]
}


export function DetectionHistory({ records }: DetectionHistoryProps) {
  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <div className="flex items-center gap-2 mb-4">
        <Clock className="w-5 h-5 text-slate-700" />
        <h2 className="text-lg font-bold text-slate-900">
          Detecciones recientes
        </h2>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-200">
              <th className="text-left py-3 px-4 text-sm font-bold text-slate-700">
                Fecha
              </th>
              <th className="text-left py-3 px-4 text-sm font-bold text-slate-700">
                Hora
              </th>
              <th className="text-left py-3 px-4 text-sm font-bold text-slate-700">
                Estado
              </th>
              <th className="text-left py-3 px-4 text-sm font-bold text-slate-700">
                Faltantes
              </th>
            </tr>
          </thead>
          <tbody>
            {records.map((record) => (
              <tr
                key={record.id}
                className="border-b border-slate-100 hover:bg-slate-50"
              >
                <td className="py-3 px-4 text-sm text-slate-900">
                  {record.fecha}
                </td>
                <td className="py-3 px-4 text-sm text-slate-900">
                  {record.hora}
                </td>
                <td className="py-3 px-4">
                  <span
                    className={`inline-flex px-3 py-1 rounded-full text-xs font-bold ${record.estado === 'Completo' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}
                  >
                    {record.estado}
                  </span>
                </td>
                <td className="py-3 px-4 text-sm text-slate-600">
                  {record.faltantes || '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
