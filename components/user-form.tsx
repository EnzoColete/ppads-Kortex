"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { X } from "lucide-react"
import type { Role } from "@/lib/rbac"
import { showErrorToast } from "@/lib/toast"

interface UserFormData {
  email: string
  fullName: string
  role: Role
}

interface UserFormProps {
  user?: UserFormData | null
  onSubmit: (data: UserFormData) => void
  onCancel: () => void
}

export function UserForm({ user, onSubmit, onCancel }: UserFormProps) {
  const [formData, setFormData] = useState<UserFormData>({
    email: user?.email || "",
    fullName: user?.fullName || "",
    role: (user?.role || "USER") as Role,
  })

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!formData.email || !formData.fullName) {
      showErrorToast("Preencha todos os campos obrigatórios.")
      return
    }

    onSubmit({
      email: formData.email.trim().toLowerCase(),
      fullName: formData.fullName.trim(),
      role: formData.role,
    })
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-md">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{user ? "Editar Usuario" : "Novo Usuario"}</CardTitle>
          <Button variant="ghost" size="icon" onClick={onCancel}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(event) => setFormData({ ...formData, email: event.target.value })}
                required
                disabled={Boolean(user)}
              />
              {user && <p className="text-xs text-gray-500 mt-1">O email nao pode ser alterado</p>}
            </div>

            <div>
              <Label htmlFor="fullName">Nome completo *</Label>
              <Input
                id="fullName"
                value={formData.fullName}
                onChange={(event) => setFormData({ ...formData, fullName: event.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="role">Nivel de Acesso *</Label>
              <Select value={formData.role} onValueChange={(value) => setFormData({ ...formData, role: value as Role })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ADMIN">Administrador</SelectItem>
                  <SelectItem value="USER">Usuário</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500 mt-1">
                {formData.role === "ADMIN" && "Acesso total ao sistema"}
                {formData.role === "USER" && "Pode gerenciar apenas os proprios dados"}
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancelar
              </Button>
              <Button type="submit">{user ? "Atualizar" : "Criar"} Usuario</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
