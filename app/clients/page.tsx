"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Plus, Search, Edit, Trash2 } from "lucide-react"
import { clientStorage } from "@/lib/storage"
import type { Client } from "@/lib/types"
import { ClientForm } from "@/components/client-form"
import { useOwnerDirectory } from "@/hooks/use-owner-directory"
import { showErrorToast, showSuccessToast } from "@/lib/toast"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const DEFAULT_PAGE_SIZE = 20

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [showForm, setShowForm] = useState(false)
  const [editingClient, setEditingClient] = useState<Client | null>(null)
  const [loading, setLoading] = useState(true)
  const [ownerFilter, setOwnerFilter] = useState("all")
  const [pagination, setPagination] = useState({ page: 1, pageSize: DEFAULT_PAGE_SIZE, total: 0 })
  const { isAdmin, getOwnerLabel, owners } = useOwnerDirectory()

  useEffect(() => {
    if (!isAdmin) {
      setOwnerFilter("all")
    }
  }, [isAdmin])

  useEffect(() => {
    const handle = setTimeout(() => {
      void loadClients(pagination.page)
    }, 250)
    return () => clearTimeout(handle)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, ownerFilter, pagination.page])

  const loadClients = async (pageValue = pagination.page) => {
    try {
      setLoading(true)
      const response = await clientStorage.list({
        page: pageValue,
        pageSize: pagination.pageSize,
        search: searchTerm,
        ownerId: ownerFilter !== "all" ? ownerFilter : undefined,
      })
      setClients(response.data)
      setPagination((prev) => ({
        ...prev,
        page: response.meta.page,
        pageSize: response.meta.pageSize,
        total: response.meta.total,
      }))
    } catch (error) {
      console.error("Erro ao carregar clientes:", error)
      showErrorToast("Erro ao carregar clientes.")
    } finally {
      setLoading(false)
    }
  }

  const handleCreateClient = async (data: Omit<Client, "id" | "createdAt" | "updatedAt">) => {
    try {
      await clientStorage.create(data)
      setShowForm(false)
      setSearchTerm("")
      setPagination((prev) => ({ ...prev, page: 1 }))
      void loadClients(1)
      showSuccessToast("Cliente cadastrado com sucesso.")
    } catch (error) {
      console.error("Erro ao criar cliente:", error)
      const errorMessage = error instanceof Error ? error.message : "Erro desconhecido ao criar cliente"
      showErrorToast(errorMessage)

      if (errorMessage.includes("email")) {
        setSearchTerm(data.email)
      } else if (errorMessage.includes("CPF/CNPJ")) {
        setSearchTerm(data.cpfCnpj)
      }
    }
  }

  const handleUpdateClient = async (data: Omit<Client, "id" | "createdAt" | "updatedAt">) => {
    if (!editingClient) return
    try {
      const updated = await clientStorage.update(editingClient.id, data)
      if (updated) {
        setEditingClient(null)
        setShowForm(false)
        void loadClients(pagination.page)
        showSuccessToast("Cliente atualizado com sucesso.")
      }
    } catch (error) {
      console.error("Erro ao atualizar cliente:", error)
      const errorMessage = error instanceof Error ? error.message : "Erro desconhecido ao atualizar cliente"
      showErrorToast(errorMessage)
    }
  }

  const handleDeleteClient = async (id: string) => {
    try {
      await clientStorage.delete(id)
      void loadClients(pagination.page)
      showSuccessToast("Cliente excluído com sucesso.")
    } catch (error) {
      console.error("Erro ao excluir cliente:", error)
      showErrorToast("Erro ao excluir cliente.")
    }
  }

  const handleEdit = (client: Client) => {
    setEditingClient(client)
    setShowForm(true)
  }

  const handleCloseForm = () => {
    setShowForm(false)
    setEditingClient(null)
  }

  const totalPages = Math.max(1, Math.ceil(pagination.total / pagination.pageSize))

  if (loading && clients.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Carregando clientes...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Clientes</h1>
          <p className="text-gray-600 mt-2">Gerencie seus clientes</p>
        </div>
        <Button onClick={() => setShowForm(true)} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Novo Cliente
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Buscar por nome, email ou CPF/CNPJ..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value)
                setPagination((prev) => ({ ...prev, page: 1 }))
              }}
              className="pl-10"
            />
          </div>
          {isAdmin && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-600">Filtrar por usuário</p>
              <Select
                value={ownerFilter}
                onValueChange={(value) => {
                  setOwnerFilter(value)
                  setPagination((prev) => ({ ...prev, page: 1 }))
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos os usuários" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os usuários</SelectItem>
                  {owners.map((owner) => (
                    <SelectItem key={owner.id} value={owner.id}>
                      {owner.fullName || owner.email || owner.id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4">
        {clients.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8 text-gray-500">
                {searchTerm ? "Nenhum cliente encontrado" : "Nenhum cliente cadastrado"}
              </div>
            </CardContent>
          </Card>
        ) : (
          clients.map((client) => (
            <Card key={client.id}>
              <CardContent className="pt-6">
                <div className="flex justify-between items-start">
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold">{client.name}</h3>
                    <div className="text-sm text-gray-600 space-y-1">
                      <p>Email: {client.email}</p>
                      <p>Telefone: {client.phone}</p>
                      <p>CPF/CNPJ: {client.cpfCnpj}</p>
                      <p>Endereço: {client.address}</p>
                      {isAdmin && (
                        <p className="text-xs text-gray-500">
                          Criado por: {getOwnerLabel(client.userId) ?? "Desconhecido"}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleEdit(client)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteClient(client.id)}
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

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-gray-600">
          Página {pagination.page} de {totalPages} — {pagination.total} registros
        </p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={pagination.page === 1}
            onClick={() => setPagination((prev) => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
          >
            Anterior
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={pagination.page >= totalPages}
            onClick={() =>
              setPagination((prev) => ({
                ...prev,
                page: Math.min(totalPages, prev.page + 1),
              }))
            }
          >
            Próxima
          </Button>
        </div>
      </div>

      {showForm && (
        <ClientForm
          client={editingClient}
          onSubmit={editingClient ? handleUpdateClient : handleCreateClient}
          onCancel={handleCloseForm}
        />
      )}
    </div>
  )
}
