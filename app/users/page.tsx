"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Plus, Search, Edit, Trash2 } from "lucide-react"
import { supabase } from "@/lib/supabase/client"
import type { User } from "@/lib/types"
import { UserForm } from "@/components/user-form"
import { RoleBadge } from "@/components/role-badge"
import { ProtectedRoute } from "@/components/protected-route"

function UsersPageContent() {
  const [users, setUsers] = useState<User[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [showForm, setShowForm] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadUsers()
  }, [])

  const loadUsers = async () => {
    try {
      const { data, error } = await supabase.from("users").select("*").order("created_at", { ascending: false })

      if (error) throw error

      setUsers(
        (data || []).map((u) => ({
          id: u.id,
          email: u.email,
          name: u.name,
          role: u.role,
          createdAt: new Date(u.created_at),
          updatedAt: new Date(u.updated_at),
        })),
      )
    } catch (error) {
      console.error("Error loading users:", error)
    } finally {
      setLoading(false)
    }
  }

  const filteredUsers = users.filter((user) => {
    const searchLower = searchTerm.toLowerCase()
    return user.name.toLowerCase().includes(searchLower) || user.email.toLowerCase().includes(searchLower)
  })

  const handleCreateUser = async (data: Omit<User, "id" | "createdAt" | "updatedAt">) => {
    try {
      const { data: newUser, error } = await supabase
        .from("users")
        .insert([{ email: data.email, name: data.name, role: data.role }])
        .select()
        .single()

      if (error) throw error

      setUsers([
        {
          id: newUser.id,
          email: newUser.email,
          name: newUser.name,
          role: newUser.role,
          createdAt: new Date(newUser.created_at),
          updatedAt: new Date(newUser.updated_at),
        },
        ...users,
      ])
      setShowForm(false)
    } catch (error) {
      console.error("Error creating user:", error)
      alert("Erro ao criar usuário")
    }
  }

  const handleUpdateUser = async (data: Omit<User, "id" | "createdAt" | "updatedAt">) => {
    if (!editingUser) return

    try {
      const { data: updated, error } = await supabase
        .from("users")
        .update({ name: data.name, role: data.role })
        .eq("id", editingUser.id)
        .select()
        .single()

      if (error) throw error

      setUsers(
        users.map((u) =>
          u.id === editingUser.id
            ? {
                id: updated.id,
                email: updated.email,
                name: updated.name,
                role: updated.role,
                createdAt: new Date(updated.created_at),
                updatedAt: new Date(updated.updated_at),
              }
            : u,
        ),
      )
      setShowForm(false)
      setEditingUser(null)
    } catch (error) {
      console.error("Error updating user:", error)
      alert("Erro ao atualizar usuário")
    }
  }

  const handleDeleteUser = async (id: string) => {
    if (confirm("Tem certeza que deseja excluir este usuário?")) {
      try {
        const { error } = await supabase.from("users").delete().eq("id", id)

        if (error) throw error

        setUsers(users.filter((u) => u.id !== id))
      } catch (error) {
        console.error("Error deleting user:", error)
        alert("Erro ao excluir usuário")
      }
    }
  }

  if (loading) {
    return <div className="flex justify-center items-center h-64">Carregando usuários...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gerenciamento de Usuários</h1>
          <p className="text-gray-600 mt-2">Gerencie usuários e suas permissões</p>
        </div>
        <Button
          onClick={() => {
            setShowForm(true)
            setEditingUser(null)
          }}
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Novo Usuário
        </Button>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{users.filter((u) => u.role === "admin").length}</div>
              <p className="text-sm text-gray-600">Administradores</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {users.filter((u) => u.role === "technician").length}
              </div>
              <p className="text-sm text-gray-600">Técnicos</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{users.filter((u) => u.role === "client").length}</div>
              <p className="text-sm text-gray-600">Clientes</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Barra de busca */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Buscar por nome ou email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Lista de usuários */}
      <div className="grid gap-4">
        {filteredUsers.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8 text-gray-500">
                {searchTerm ? "Nenhum usuário encontrado" : "Nenhum usuário cadastrado"}
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
                      <h3 className="text-lg font-semibold">{user.name}</h3>
                      <RoleBadge role={user.role} />
                    </div>
                    <div className="text-sm text-gray-600 space-y-1">
                      <p>
                        <span className="font-medium">Email:</span> {user.email}
                      </p>
                      <p className="text-xs text-gray-500">
                        Criado em: {new Date(user.createdAt).toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditingUser(user)
                        setShowForm(true)
                      }}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteUser(user.id)}
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

      {/* Formulário */}
      {showForm && (
        <UserForm
          user={editingUser}
          onSubmit={editingUser ? handleUpdateUser : handleCreateUser}
          onCancel={() => {
            setShowForm(false)
            setEditingUser(null)
          }}
        />
      )}
    </div>
  )
}

export default function UsersPage() {
  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <UsersPageContent />
    </ProtectedRoute>
  )
}
