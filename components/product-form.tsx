"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
<<<<<<< HEAD
=======
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
>>>>>>> 3969ce6e07b797e7bc94ebcb0efc8cecfcf4b892
import { Textarea } from "@/components/ui/textarea"
import { X } from "lucide-react"
import type { Product } from "@/lib/types"

interface ProductFormProps {
  product?: Product | null
  onSubmit: (data: Omit<Product, "id" | "createdAt" | "updatedAt">) => void
  onCancel: () => void
}

<<<<<<< HEAD
export function ProductForm({ product, onSubmit, onCancel }: ProductFormProps) {
  const [formData, setFormData] = useState({
    name: product?.name || "",
=======
const productTypes = [
  { value: "nitrogen", label: "Nitrogênio" },
  { value: "semen", label: "Sêmen" },
  { value: "other", label: "Outro" },
] as const

const commonUnits = ["Litro", "Kg", "Unidade", "Dose", "ml", "g", "m³", "Pacote"]

export function ProductForm({ product, onSubmit, onCancel }: ProductFormProps) {
  const [formData, setFormData] = useState({
    name: product?.name || "",
    type: product?.type || ("nitrogen" as const),
>>>>>>> 3969ce6e07b797e7bc94ebcb0efc8cecfcf4b892
    description: product?.description || "",
    price: product?.price?.toString() || "",
    unit: product?.unit || "",
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const data = {
      ...formData,
      price: Number.parseFloat(formData.price),
    }
    onSubmit(data)
  }

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-md">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{product ? "Editar Produto" : "Novo Produto"}</CardTitle>
          <Button variant="ghost" size="sm" onClick={onCancel}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">Nome do Produto *</Label>
<<<<<<< HEAD
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleChange("name", e.target.value)}
                placeholder="Ex: Nitrogênio Líquido, Sêmen Bovino, etc."
                required
              />
            </div>

            <div>
              <Label htmlFor="description">Descrição</Label>
=======
              <Input id="name" value={formData.name} onChange={(e) => handleChange("name", e.target.value)} required />
            </div>

            <div>
              <Label htmlFor="type">Tipo *</Label>
              <Select value={formData.type} onValueChange={(value) => handleChange("type", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  {productTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="description">Descrição *</Label>
>>>>>>> 3969ce6e07b797e7bc94ebcb0efc8cecfcf4b892
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleChange("description", e.target.value)}
<<<<<<< HEAD
                placeholder="Descreva o produto (opcional)..."
=======
                placeholder="Descreva o produto..."
                required
>>>>>>> 3969ce6e07b797e7bc94ebcb0efc8cecfcf4b892
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label htmlFor="price">Preço (R$) *</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.price}
                  onChange={(e) => handleChange("price", e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="unit">Unidade *</Label>
<<<<<<< HEAD
                <Input
                  id="unit"
                  value={formData.unit}
                  onChange={(e) => handleChange("unit", e.target.value)}
                  placeholder="Ex: Litro, Kg, Dose"
                  required
                />
=======
                <Select value={formData.unit} onValueChange={(value) => handleChange("unit", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Unidade" />
                  </SelectTrigger>
                  <SelectContent>
                    {commonUnits.map((unit) => (
                      <SelectItem key={unit} value={unit}>
                        {unit}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
>>>>>>> 3969ce6e07b797e7bc94ebcb0efc8cecfcf4b892
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <Button type="submit" className="flex-1">
                {product ? "Atualizar" : "Criar"}
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
