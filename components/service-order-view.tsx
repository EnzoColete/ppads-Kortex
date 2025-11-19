"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { X } from "lucide-react"
import type { ServiceOrder, Client, Product } from "@/lib/types"

interface ServiceOrderViewProps {
  order: ServiceOrder
  clients: Client[]
  products: Product[]
  onClose: () => void
  ownerLabel?: string
}

export function ServiceOrderView({ order, clients, products, onClose, ownerLabel }: ServiceOrderViewProps) {
  const client = clients.find((c) => c.id === order.clientId)

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: "Pendente",
      in_progress: "Em Andamento",
      completed: "Concluída",
      cancelled: "Cancelada",
    }
    return labels[status] || status
  }

  const getPriorityLabel = (priority?: string) => {
    if (!priority) return "Não definida"
    const labels: Record<string, string> = {
      low: "Baixa",
      medium: "Média",
      high: "Alta",
      urgent: "Urgente",
    }
    return labels[priority] || priority
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <Card className="w-full max-w-4xl my-8">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Ordem de Serviço #{order.orderNumber}</CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-6">
          {ownerLabel && <p className="text-xs text-gray-500">Criado por: {ownerLabel}</p>}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">Cliente</p>
              <p className="font-medium">{client?.name || "N/A"}</p>
            </div>

            <div>
              <p className="text-sm text-gray-600">Status</p>
              <p className="font-medium">{getStatusLabel(order.status)}</p>
            </div>

            <div>
              <p className="text-sm text-gray-600">Prioridade</p>
              <p className="font-medium">{getPriorityLabel(order.priority)}</p>
            </div>

            <div>
              <p className="text-sm text-gray-600">Valor Total</p>
              <p className="font-medium text-lg">R$ {order.totalValue.toFixed(2)}</p>
            </div>

            <div className="md:col-span-2">
              <p className="text-sm text-gray-600">Título</p>
              <p className="font-medium">{order.title}</p>
            </div>

            {order.description && (
              <div className="md:col-span-2">
                <p className="text-sm text-gray-600">Descrição</p>
                <p className="font-medium">{order.description}</p>
              </div>
            )}

            {order.scheduledDate && (
              <div>
                <p className="text-sm text-gray-600">Data Agendada</p>
                <p className="font-medium">{new Date(order.scheduledDate).toLocaleDateString("pt-BR")}</p>
              </div>
            )}

            {order.completedDate && (
              <div>
                <p className="text-sm text-gray-600">Data de Conclusão</p>
                <p className="font-medium">{new Date(order.completedDate).toLocaleDateString("pt-BR")}</p>
              </div>
            )}

            {order.notes && (
              <div className="md:col-span-2">
                <p className="text-sm text-gray-600">Observações</p>
                <p className="font-medium">{order.notes}</p>
              </div>
            )}
          </div>

          {order.items && order.items.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-4">Itens da Ordem de Serviço</h3>
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-sm font-medium">Descrição</th>
                      <th className="px-4 py-2 text-right text-sm font-medium">Quantidade</th>
                      <th className="px-4 py-2 text-right text-sm font-medium">Preço Unitário</th>
                      <th className="px-4 py-2 text-right text-sm font-medium">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {order.items.map((item, index) => (
                      <tr key={index} className="border-t">
                        <td className="px-4 py-2 text-sm">{item.description}</td>
                        <td className="px-4 py-2 text-sm text-right">{item.quantity}</td>
                        <td className="px-4 py-2 text-sm text-right">R$ {item.unitPrice.toFixed(2)}</td>
                        <td className="px-4 py-2 text-sm text-right">R$ {item.total.toFixed(2)}</td>
                      </tr>
                    ))}
                    <tr className="border-t bg-gray-50 font-semibold">
                      <td colSpan={3} className="px-4 py-2 text-right">
                        Total:
                      </td>
                      <td className="px-4 py-2 text-right">R$ {order.totalValue.toFixed(2)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="text-sm text-gray-500 space-y-1">
            <p>Criada em: {new Date(order.createdAt).toLocaleString("pt-BR")}</p>
            <p>Última atualização: {new Date(order.updatedAt).toLocaleString("pt-BR")}</p>
          </div>

          <div className="flex justify-end">
            <Button onClick={onClose}>Fechar</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
