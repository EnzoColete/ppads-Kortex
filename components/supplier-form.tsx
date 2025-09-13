"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { X } from "lucide-react"
import type { Supplier } from "@/lib/types"

interface SupplierFormProps {
  supplier?: Supplier | null
  onSubmit: (data: Omit<Supplier, "id" | "createdAt" | "updatedAt">) => void
  onCancel: () => void
}

export function SupplierForm({ supplier, onSubmit, onCancel }: SupplierFormProps) {
  const [formData, setFormData] = useState({
    name: supplier?.name || "",
    email: supplier?.email || "",
    phone: supplier?.phone || "",
    address: supplier?.address || "",
    cnpj: supplier?.cnpj || "",
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(formData)
  }

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-md">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{supplier ? "Editar Fornecedor" : "Novo Fornecedor"}</CardTitle>
          <Button variant="ghost" size="sm" onClick={onCancel}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">Nome *</Label>
              <Input id="name" value={formData.name} onChange={(e) => handleChange("name", e.target.value)} required />
            </div>

            <div>
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleChange("email", e.target.value)}
                required
              />
            </div>

            <div>
              <Label htmlFor="phone">Telefone *</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => handleChange("phone", e.target.value)}
                required
              />
            </div>

            <div>
              <Label htmlFor="cnpj">CNPJ *</Label>
              <Input id="cnpj" value={formData.cnpj} onChange={(e) => handleChange("cnpj", e.target.value)} required />
            </div>

            <div>
              <Label htmlFor="address">Endereço *</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => handleChange("address", e.target.value)}
                required
              />
            </div>

            <div className="flex gap-2 pt-4">
              <Button type="submit" className="flex-1">
                {supplier ? "Atualizar" : "Criar"}
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
