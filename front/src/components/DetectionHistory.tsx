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
    <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-slate-200">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-steel-blue" />
          <h2 className="text-lg font-bold text-industrial-dark">
            Detecciones recientes
          </h2>
        </div>
        <span className="px-3 py-1 bg-steel-blue/10 text-steel-blue rounded-full text-sm font-bold">
          {records.length} registro{records.length !== 1 ? 's' : ''}
        </span>
      </div>

      {records.length === 0 ? (
        <div className="text-center py-12">
          <Clock className="w-16 h-16 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">No hay detecciones registradas</p>
          <p className="text-slate-400 text-sm mt-1">Inicia la detección para ver el historial</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-slate-200">
                <th className="text-left py-3 px-4 text-sm font-bold text-industrial-dark">
                  Fecha
                </th>
                <th className="text-left py-3 px-4 text-sm font-bold text-industrial-dark">
                  Hora
                </th>
                <th className="text-left py-3 px-4 text-sm font-bold text-industrial-dark">
                  Estado
                </th>
                <th className="text-left py-3 px-4 text-sm font-bold text-industrial-dark">
                  Faltantes
                </th>
              </tr>
            </thead>
            <tbody>
              {records.map((record) => (
                <tr
                  key={record.id}
                  className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
                >
                  <td className="py-3 px-4 text-sm font-medium text-slate-900">
                    {record.fecha}
                  </td>
                  <td className="py-3 px-4 text-sm font-medium text-slate-900">
                    {record.hora}
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`inline-flex px-3 py-1 rounded-full text-xs font-bold ${
                        record.estado === 'Completo' 
                          ? 'bg-success-green/20 text-success-green border-2 border-success-green/30' 
                          : 'bg-danger-red/20 text-danger-red border-2 border-danger-red/30'
                      }`}
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
      )}
    </div>
  )
}
