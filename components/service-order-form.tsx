"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { X, Plus, Trash2 } from "lucide-react"
import type { ServiceOrder, Client, Product, ServiceOrderItem } from "@/lib/types"

interface ServiceOrderFormProps {
  clients: Client[]
  products: Product[]
  order?: ServiceOrder | null
  onSubmit: (data: Omit<ServiceOrder, "id" | "createdAt" | "updatedAt">) => void
  onCancel: () => void
}

export function ServiceOrderForm({ clients, products, order, onSubmit, onCancel }: ServiceOrderFormProps) {
  const [formData, setFormData] = useState({
    orderNumber: order?.orderNumber || `OS-${Date.now()}`,
    clientId: order?.clientId || "",
    status: order?.status || "pending",
    title: order?.title || "",
    description: order?.description || "",
    priority: order?.priority || "medium",
    scheduledDate: order?.scheduledDate || "",
    notes: order?.notes || "",
  })

  const [items, setItems] = useState<Omit<ServiceOrderItem, "id" | "serviceOrderId" | "createdAt">[]>(
    order?.items.map((item) => ({
      productId: item.productId,
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      total: item.total,
    })) || [],
  )

  const [currentItem, setCurrentItem] = useState({
    productId: "",
    description: "",
    quantity: 1,
    unitPrice: 0,
  })

  const handleAddItem = () => {
    if (!currentItem.description || currentItem.quantity <= 0 || currentItem.unitPrice <= 0) {
      alert("Preencha todos os campos do item")
      return
    }

    const total = currentItem.quantity * currentItem.unitPrice
    setItems([...items, { ...currentItem, total }])
    setCurrentItem({ productId: "", description: "", quantity: 1, unitPrice: 0 })
  }

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index))
  }

  const handleProductSelect = (productId: string) => {
    const product = products.find((p) => p.id === productId)
    if (product) {
      setCurrentItem({
        ...currentItem,
        productId,
        description: product.name,
        unitPrice: product.price,
      })
    }
  }

  const totalValue = items.reduce((sum, item) => sum + item.total, 0)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.clientId || !formData.title) {
      alert("Preencha os campos obrigatórios")
      return
    }

    onSubmit({
      ...formData,
      totalValue,
      items,
    } as Omit<ServiceOrder, "id" | "createdAt" | "updatedAt">)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <Card className="w-full max-w-4xl my-8">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{order ? "Editar Ordem de Serviço" : "Nova Ordem de Serviço"}</CardTitle>
          <Button variant="ghost" size="icon" onClick={onCancel}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="orderNumber">Número da OS *</Label>
                <Input
                  id="orderNumber"
                  value={formData.orderNumber}
                  onChange={(e) => setFormData({ ...formData, orderNumber: e.target.value })}
                  required
                  disabled={!!order}
                />
              </div>

              <div>
                <Label htmlFor="clientId">Cliente *</Label>
                <Select
                  value={formData.clientId}
                  onValueChange={(value) => setFormData({ ...formData, clientId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="status">Status *</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData({ ...formData, status: value as any })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pendente</SelectItem>
                    <SelectItem value="in_progress">Em Andamento</SelectItem>
                    <SelectItem value="completed">Concluída</SelectItem>
                    <SelectItem value="cancelled">Cancelada</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="priority">Prioridade</Label>
                <Select
                  value={formData.priority}
                  onValueChange={(value) => setFormData({ ...formData, priority: value as any })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Baixa</SelectItem>
                    <SelectItem value="medium">Média</SelectItem>
                    <SelectItem value="high">Alta</SelectItem>
                    <SelectItem value="urgent">Urgente</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="title">Título *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                />
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="scheduledDate">Data Agendada</Label>
                <Input
                  id="scheduledDate"
                  type="date"
                  value={formData.scheduledDate}
                  onChange={(e) => setFormData({ ...formData, scheduledDate: e.target.value })}
                />
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="notes">Observações</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={2}
                />
              </div>
            </div>

            {/* Itens da OS */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Itens da Ordem de Serviço</h3>

              <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                <div>
                  <Label>Produto</Label>
                  <Select value={currentItem.productId} onValueChange={handleProductSelect}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {products.map((product) => (
                        <SelectItem key={product.id} value={product.id}>
                          {product.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Descrição</Label>
                  <Input
                    value={currentItem.description}
                    onChange={(e) => setCurrentItem({ ...currentItem, description: e.target.value })}
                    placeholder="Descrição do item"
                  />
                </div>

                <div>
                  <Label>Quantidade</Label>
                  <Input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={currentItem.quantity}
                    onChange={(e) =>
                      setCurrentItem({ ...currentItem, quantity: Number.parseFloat(e.target.value) || 0 })
                    }
                  />
                </div>

                <div>
                  <Label>Preço Unitário</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={currentItem.unitPrice}
                    onChange={(e) =>
                      setCurrentItem({ ...currentItem, unitPrice: Number.parseFloat(e.target.value) || 0 })
                    }
                  />
                </div>

                <Button type="button" onClick={handleAddItem}>
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar
                </Button>
              </div>

              {items.length > 0 && (
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-sm font-medium">Descrição</th>
                        <th className="px-4 py-2 text-right text-sm font-medium">Qtd</th>
                        <th className="px-4 py-2 text-right text-sm font-medium">Preço Unit.</th>
                        <th className="px-4 py-2 text-right text-sm font-medium">Total</th>
                        <th className="px-4 py-2"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item, index) => (
                        <tr key={index} className="border-t">
                          <td className="px-4 py-2 text-sm">{item.description}</td>
                          <td className="px-4 py-2 text-sm text-right">{item.quantity}</td>
                          <td className="px-4 py-2 text-sm text-right">R$ {item.unitPrice.toFixed(2)}</td>
                          <td className="px-4 py-2 text-sm text-right">R$ {item.total.toFixed(2)}</td>
                          <td className="px-4 py-2 text-right">
                            <Button type="button" variant="ghost" size="sm" onClick={() => handleRemoveItem(index)}>
                              <Trash2 className="h-4 w-4 text-red-600" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                      <tr className="border-t bg-gray-50 font-semibold">
                        <td colSpan={3} className="px-4 py-2 text-right">
                          Total:
                        </td>
                        <td className="px-4 py-2 text-right">R$ {totalValue.toFixed(2)}</td>
                        <td></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancelar
              </Button>
              <Button type="submit">{order ? "Atualizar" : "Criar"} Ordem de Serviço</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
