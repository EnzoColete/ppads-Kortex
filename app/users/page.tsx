"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Edit, Plus, Search, Trash2 } from "lucide-react"
import type { User } from "@/lib/types"
import { UserForm } from "@/components/user-form"
import { RoleBadge } from "@/components/role-badge"
import { ProtectedRoute } from "@/components/protected-route"

function UnauthorizedMessage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <Card className="max-w-md">
        <CardContent className="space-y-4 py-8 text-center">
          <h1 className="text-2xl font-semibold text-gray-900">Acesso restrito</h1>
          <p className="text-gray-600">Esta aba esta disponivel apenas para administradores.</p>
          <Button asChild>
            <Link href="/">Voltar para a pagina inicial</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

function UsersPageContent() {
  const [users, setUsers] = useState<User[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    void loadUsers()
  }, [])

  const loadUsers = async () => {
    try {
      const response = await fetch("/api/users")
      const payload = await response.json().catch(() => ({ data: [] }))

      if (!response.ok) {
        throw new Error(payload?.error || "Erro ao carregar usuarios")
      }

      const data = Array.isArray(payload.data) ? payload.data : []

      setUsers(
        data.map((row: any) => ({
          id: row.id,
          email: row.email,
          fullName: row.fullName,
          emailVerified: Boolean(row.emailVerified),
          role: row.role,
          createdAt: new Date(row.createdAt),
          updatedAt: new Date(row.updatedAt),
        })),
      )
    } catch (err) {
      console.error("Error loading users:", err)
    } finally {
      setLoading(false)
    }
  }

  const filteredUsers = users.filter((user) => {
    const query = searchTerm.toLowerCase()
    return user.fullName.toLowerCase().includes(query) || user.email.toLowerCase().includes(query)
  })

  const handleUpdateUser = async (data: Pick<User, "email" | "fullName" | "role">) => {
    if (!editingUser) return

    try {
      const response = await fetch("/api/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: editingUser.email,
          updates: { fullName: data.fullName.trim(), role: data.role },
        }),
      })

      const payload = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(payload?.error || "Erro ao atualizar usuario")
      }

      const updated = payload.data

      setUsers((prev) =>
        prev.map((user) =>
          user.email === editingUser.email
            ? {
                id: updated.id,
                email: updated.email,
                fullName: updated.fullName,
                emailVerified: Boolean(updated.emailVerified),
                role: updated.role,
                createdAt: new Date(updated.createdAt),
                updatedAt: new Date(updated.updatedAt),
              }
            : user,
        ),
      )
      setIsFormOpen(false)
      setEditingUser(null)
    } catch (err) {
      console.error("Error updating user:", err)
      alert("Erro ao atualizar usuario")
    }
  }

  const handleDeleteUser = async (email: string) => {
    if (!confirm("Tem certeza que deseja excluir este usuario?")) return

    try {
      const response = await fetch("/api/users", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })

      const payload = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(payload?.error || "Erro ao excluir usuario")
      }

      setUsers((prev) => prev.filter((user) => user.email !== email))
    } catch (err) {
      console.error("Error deleting user:", err)
      alert("Erro ao excluir usuario")
    }
  }

  if (loading) {
    return <div className="py-8 text-center text-sm text-gray-500">Carregando usuarios...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Usuarios</h1>
          <p className="text-gray-600 mt-2">Gerencie niveis de acesso e dados dos usuarios</p>
        </div>
        <Button asChild className="flex items-center gap-2">
          <Link href="/auth/register">
            <Plus className="h-4 w-4" />
            Novo cadastro
          </Link>
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Buscar por nome ou email..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4">
        {filteredUsers.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8 text-gray-500">
                {searchTerm ? "Nenhum usuario encontrado" : "Nenhum usuario cadastrado"}
              </div>
            </CardContent>
          </Card>
        ) : (
          filteredUsers.map((user) => (
            <Card key={user.id}>
              <CardContent className="pt-6">
                <div className="flex justify-between items-start">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-semibold">{user.fullName}</h3>
                      <RoleBadge role={user.role} />
                    </div>
                    <div className="text-sm text-gray-600 space-y-1">
                      <p>
                        <span className="font-medium">Email:</span> {user.email}
                      </p>
                      <p className="text-xs text-gray-500">
                        Criado em: {user.createdAt.toLocaleDateString("pt-BR")}
                      </p>
                      <p className="text-xs">
                        Status: {user.emailVerified ? "Email verificado" : "Aguardando confirmacao"}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditingUser(user)
                        setIsFormOpen(true)
                      }}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteUser(user.email)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {isFormOpen && editingUser && (
        <UserForm
          user={{ email: editingUser.email, fullName: editingUser.fullName, role: editingUser.role }}
          onSubmit={(formData) =>
            handleUpdateUser({ email: editingUser.email, fullName: formData.fullName, role: formData.role })
          }
          onCancel={() => {
            setIsFormOpen(false)
            setEditingUser(null)
          }}
        />
      )}
    </div>
  )
}

export default function UsersPage() {
  return (
    <ProtectedRoute allowedRoles={["admin"]} fallback={<UnauthorizedMessage />}>
      <UsersPageContent />
    </ProtectedRoute>
  )
}
