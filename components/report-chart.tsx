"use client"

interface ReportChartProps {
  data: Array<{ [key: string]: any }>
  type: "line" | "pie"
}

export function ReportChart({ data, type }: ReportChartProps) {
  if (data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-gray-500">
        Nenhum dado disponível para o período selecionado
      </div>
    )
  }

  if (type === "line") {
    const maxRevenue = Math.max(...data.map((d) => d.revenue))

    return (
      <div className="h-64 p-4">
        <div className="h-full flex items-end justify-between gap-2">
          {data.map((item, index) => {
            const height = maxRevenue > 0 ? (item.revenue / maxRevenue) * 100 : 0
            const date = new Date(item.date)

            return (
              <div key={index} className="flex flex-col items-center flex-1">
                <div className="text-xs text-gray-600 mb-1">R$ {item.revenue.toFixed(0)}</div>
                <div
                  className="bg-blue-500 w-full min-h-[4px] rounded-t"
                  style={{ height: `${height}%` }}
                  title={`${date.getDate()}/${date.getMonth() + 1}: R$ ${item.revenue.toFixed(2)}`}
                />
                <div className="text-xs text-gray-500 mt-1">
                  {date.getDate()}/{date.getMonth() + 1}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  if (type === "pie") {
    const total = data.reduce((sum, item) => sum + item.count, 0)
    const colors = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6"]

    return (
      <div className="h-64 flex items-center justify-center">
        <div className="space-y-4">
          {data.map((item, index) => {
            const percentage = total > 0 ? ((item.count / total) * 100).toFixed(1) : 0

            return (
              <div key={index} className="flex items-center gap-3">
                <div className="w-4 h-4 rounded" style={{ backgroundColor: colors[index % colors.length] }} />
                <span className="text-sm">
                  {item.type}: {item.count} ({percentage}%)
                </span>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  return null
}
