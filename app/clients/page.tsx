"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Plus, Search, Edit, Trash2 } from "lucide-react"
import { clientStorage } from "@/lib/storage"
import type { Client } from "@/lib/types"
import { ClientForm } from "@/components/client-form"

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [showForm, setShowForm] = useState(false)
  const [editingClient, setEditingClient] = useState<Client | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadClients()
  }, [])

  const loadClients = async () => {
    try {
      const data = await clientStorage.getAll()
      setClients(data)
    } catch (error) {
      console.error("Erro ao carregar clientes:", error)
    } finally {
      setLoading(false)
    }
  }

  const filteredClients = clients.filter(
    (client) =>
      client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.cpfCnpj.includes(searchTerm),
  )

  const handleCreateClient = async (data: Omit<Client, "id" | "createdAt" | "updatedAt">) => {
    try {
      const newClient = await clientStorage.create(data)
      setClients([...clients, newClient])
      setShowForm(false)
    } catch (error) {
      console.error("Erro ao criar cliente:", error)
    }
  }

  const handleUpdateClient = async (data: Omit<Client, "id" | "createdAt" | "updatedAt">) => {
    if (!editingClient) return
    try {
      const updated = await clientStorage.update(editingClient.id, data)
      if (updated) {
        setClients(clients.map((c) => (c.id === editingClient.id ? updated : c)))
        setEditingClient(null)
        setShowForm(false)
      }
    } catch (error) {
      console.error("Erro ao atualizar cliente:", error)
    }
  }

  const handleDeleteClient = async (id: string) => {
    if (confirm("Tem certeza que deseja excluir este cliente?")) {
      try {
        await clientStorage.delete(id)
        setClients(clients.filter((c) => c.id !== id))
      } catch (error) {
        console.error("Erro ao excluir cliente:", error)
      }
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

  if (loading) {
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

      {/* Barra de busca */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Buscar por nome, email ou CPF/CNPJ..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Lista de clientes */}
      <div className="grid gap-4">
        {filteredClients.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8 text-gray-500">
                {searchTerm ? "Nenhum cliente encontrado" : "Nenhum cliente cadastrado"}
              </div>
            </CardContent>
          </Card>
        ) : (
          filteredClients.map((client) => (
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

      {/* Formulário */}
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
