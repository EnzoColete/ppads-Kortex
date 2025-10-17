"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { X, Plus, Trash2 } from "lucide-react"
import type { Receipt, Supplier, Client, Product, ReceiptProduct } from "@/lib/types"

interface ReceiptFormProps {
  suppliers: Supplier[]
  clients: Client[]
  products: Product[]
  onSubmit: (data: Omit<Receipt, "id" | "createdAt" | "updatedAt">) => void
  onCancel: () => void
}

export function ReceiptForm({ suppliers, clients, products, onSubmit, onCancel }: ReceiptFormProps) {
  const [formData, setFormData] = useState({
    type: "client" as "supplier" | "client",
    supplierId: "",
    clientId: "",
    hasInvoice: false,
    observations: "",
  })

  const [receiptProducts, setReceiptProducts] = useState<ReceiptProduct[]>([
    { productId: "", quantity: 1, unitPrice: 0, total: 0 },
  ])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const validProducts = receiptProducts.filter((p) => p.productId && p.quantity > 0)
    if (validProducts.length === 0) {
      alert("Adicione pelo menos um produto ao recibo")
      return
    }

    const total = validProducts.reduce((sum, p) => sum + p.total, 0)

    const data: Omit<Receipt, "id" | "createdAt" | "updatedAt"> = {
      type: formData.type,
      supplierId: formData.type === "supplier" ? formData.supplierId : undefined,
      clientId: formData.type === "client" ? formData.clientId : undefined,
      products: validProducts,
      total,
      hasInvoice: formData.type === "client" ? formData.hasInvoice : undefined,
      observations: formData.observations || undefined,
    }

    onSubmit(data)
  }

  const handleChange = (field: string, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleProductChange = (index: number, field: keyof ReceiptProduct, value: string | number) => {
    const newProducts = [...receiptProducts]
    newProducts[index] = { ...newProducts[index], [field]: value }

    // Recalcular total do produto
    if (field === "quantity" || field === "unitPrice") {
      newProducts[index].total = newProducts[index].quantity * newProducts[index].unitPrice
    }

    // Auto-preencher preço unitário quando produto é selecionado
    if (field === "productId" && value) {
      const product = products.find((p) => p.id === value)
      if (product) {
        newProducts[index].unitPrice = product.price
        newProducts[index].total = newProducts[index].quantity * product.price
      }
    }

    setReceiptProducts(newProducts)
  }

  const addProduct = () => {
    setReceiptProducts([...receiptProducts, { productId: "", quantity: 1, unitPrice: 0, total: 0 }])
  }

  const removeProduct = (index: number) => {
    if (receiptProducts.length > 1) {
      setReceiptProducts(receiptProducts.filter((_, i) => i !== index))
    }
  }

  const totalAmount = receiptProducts.reduce((sum, p) => sum + p.total, 0)

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <Card className="w-full max-w-2xl my-8">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Novo Recibo</CardTitle>
          <Button variant="ghost" size="sm" onClick={onCancel}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
<<<<<<< HEAD
            {/* Seleção de cliente */}
            <div>
              <Label htmlFor="client">Cliente *</Label>
              <Select value={formData.clientId} onValueChange={(value) => handleChange("clientId", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o cliente" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name}
                    </SelectItem>
                  ))}
=======
            {/* Tipo de recibo */}
            <div>
              <Label htmlFor="type">Tipo de Recibo *</Label>
              <Select
                value={formData.type}
                onValueChange={(value: "supplier" | "client") => handleChange("type", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="supplier">Fornecedor</SelectItem>
                  <SelectItem value="client">Cliente</SelectItem>
>>>>>>> 3969ce6e07b797e7bc94ebcb0efc8cecfcf4b892
                </SelectContent>
              </Select>
            </div>

<<<<<<< HEAD
=======
            {/* Seleção de fornecedor/cliente */}
            {formData.type === "supplier" ? (
              <div>
                <Label htmlFor="supplier">Fornecedor *</Label>
                <Select value={formData.supplierId} onValueChange={(value) => handleChange("supplierId", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o fornecedor" />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers.map((supplier) => (
                      <SelectItem key={supplier.id} value={supplier.id}>
                        {supplier.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div>
                <Label htmlFor="client">Cliente *</Label>
                <Select value={formData.clientId} onValueChange={(value) => handleChange("clientId", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o cliente" />
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
            )}

>>>>>>> 3969ce6e07b797e7bc94ebcb0efc8cecfcf4b892
            {/* Produtos */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <Label>Produtos *</Label>
                <Button type="button" variant="outline" size="sm" onClick={addProduct}>
                  <Plus className="h-4 w-4 mr-1" />
                  Adicionar Produto
                </Button>
              </div>

              {receiptProducts.map((receiptProduct, index) => (
                <Card key={index} className="p-4">
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                    <div className="md:col-span-2">
                      <Label>Produto</Label>
                      <Select
                        value={receiptProduct.productId}
                        onValueChange={(value) => handleProductChange(index, "productId", value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o produto" />
                        </SelectTrigger>
                        <SelectContent>
                          {products.map((product) => (
                            <SelectItem key={product.id} value={product.id}>
                              {product.name} - R$ {product.price.toFixed(2)}/{product.unit}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>Quantidade</Label>
                      <Input
                        type="number"
                        min="1"
                        step="0.01"
                        value={receiptProduct.quantity}
                        onChange={(e) => handleProductChange(index, "quantity", Number.parseFloat(e.target.value) || 0)}
                      />
                    </div>

                    <div>
                      <Label>Preço Unit.</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={receiptProduct.unitPrice}
                        onChange={(e) =>
                          handleProductChange(index, "unitPrice", Number.parseFloat(e.target.value) || 0)
                        }
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex-1">
                        <Label>Total</Label>
                        <div className="text-lg font-semibold">R$ {receiptProduct.total.toFixed(2)}</div>
                      </div>
                      {receiptProducts.length > 1 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removeProduct(index)}
                          className="text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              ))}

              <div className="text-right">
                <div className="text-xl font-bold">Total Geral: R$ {totalAmount.toFixed(2)}</div>
              </div>
            </div>

            {/* Campos específicos para cliente */}
<<<<<<< HEAD
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="hasInvoice"
                  checked={formData.hasInvoice}
                  onCheckedChange={(checked) => handleChange("hasInvoice", checked as boolean)}
                />
                <Label htmlFor="hasInvoice">Possui Nota Fiscal (NF)</Label>
              </div>
            </div>
=======
            {formData.type === "client" && (
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="hasInvoice"
                    checked={formData.hasInvoice}
                    onCheckedChange={(checked) => handleChange("hasInvoice", checked as boolean)}
                  />
                  <Label htmlFor="hasInvoice">Possui Nota Fiscal (NF)</Label>
                </div>
              </div>
            )}
>>>>>>> 3969ce6e07b797e7bc94ebcb0efc8cecfcf4b892

            {/* Observações */}
            <div>
              <Label htmlFor="observations">Observações</Label>
              <Textarea
                id="observations"
                value={formData.observations}
                onChange={(e) => handleChange("observations", e.target.value)}
                placeholder="Observações adicionais..."
                rows={3}
              />
            </div>

            <div className="flex gap-2 pt-4">
              <Button type="submit" className="flex-1">
                Emitir Recibo
              </Button>
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancelar
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
