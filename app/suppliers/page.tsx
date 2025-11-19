"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Plus, Search, Edit, Trash2 } from "lucide-react"
import { supplierStorage } from "@/lib/storage"
import type { Supplier } from "@/lib/types"
import { SupplierForm } from "@/components/supplier-form"
import { useOwnerDirectory } from "@/hooks/use-owner-directory"
import { showErrorToast, showSuccessToast } from "@/lib/toast"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [showForm, setShowForm] = useState(false)
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null)
  const [loading, setLoading] = useState(true)
  const [ownerFilter, setOwnerFilter] = useState("all")
  const { isAdmin, getOwnerLabel, owners } = useOwnerDirectory()

  useEffect(() => {
    if (!isAdmin) {
      setOwnerFilter("all")
    }
  }, [isAdmin])

  useEffect(() => {
    loadSuppliers()
  }, [])

  const loadSuppliers = async () => {
    try {
      const data = await supplierStorage.getAll()
      setSuppliers(data)
    } catch (error) {
      console.error("Erro ao carregar fornecedores:", error)
      showErrorToast("Erro ao carregar fornecedores.")
    } finally {
      setLoading(false)
    }
  }

  const filteredSuppliers = suppliers.filter((supplier) => {
    const matchesSearch =
      supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      supplier.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      supplier.cnpj.includes(searchTerm)
    const matchesOwner = !isAdmin || ownerFilter === "all" || supplier.userId === ownerFilter
    return matchesSearch && matchesOwner
  })

  const handleCreateSupplier = async (data: Omit<Supplier, "id" | "createdAt" | "updatedAt">) => {
    try {
      const newSupplier = await supplierStorage.create(data)
      setSuppliers([...suppliers, newSupplier])
      setShowForm(false)
      showSuccessToast("Fornecedor cadastrado com sucesso.")
    } catch (error) {
      console.error("Erro ao criar fornecedor:", error)
      showErrorToast("Erro ao criar fornecedor.")
    }
  }

  const handleUpdateSupplier = async (data: Omit<Supplier, "id" | "createdAt" | "updatedAt">) => {
    if (!editingSupplier) return
    try {
      const updated = await supplierStorage.update(editingSupplier.id, data)
      if (updated) {
        setSuppliers(suppliers.map((s) => (s.id === editingSupplier.id ? updated : s)))
        setEditingSupplier(null)
        setShowForm(false)
        showSuccessToast("Fornecedor atualizado com sucesso.")
      }
    } catch (error) {
      console.error("Erro ao atualizar fornecedor:", error)
      showErrorToast("Erro ao atualizar fornecedor.")
    }
  }

  const handleDeleteSupplier = async (id: string) => {
    try {
      await supplierStorage.delete(id)
      setSuppliers(suppliers.filter((s) => s.id !== id))
      showSuccessToast("Fornecedor excluído com sucesso.")
    } catch (error) {
      console.error("Erro ao excluir fornecedor:", error)
      showErrorToast("Erro ao excluir fornecedor.")
    }
  }

  const handleEdit = (supplier: Supplier) => {
    setEditingSupplier(supplier)
    setShowForm(true)
  }

  const handleCloseForm = () => {
    setShowForm(false)
    setEditingSupplier(null)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Carregando fornecedores...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Fornecedores</h1>
          <p className="text-gray-600 mt-2">Gerencie seus fornecedores</p>
        </div>
        <Button onClick={() => setShowForm(true)} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Novo Fornecedor
        </Button>
      </div>

      {/* Barra de busca */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Buscar por nome, email ou CNPJ..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          {isAdmin && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-600">Filtrar por usuário</p>
              <Select value={ownerFilter} onValueChange={setOwnerFilter}>
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

      {/* Lista de fornecedores */}
      <div className="grid gap-4">
        {filteredSuppliers.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8 text-gray-500">
                {searchTerm ? "Nenhum fornecedor encontrado" : "Nenhum fornecedor cadastrado"}
              </div>
            </CardContent>
          </Card>
        ) : (
          filteredSuppliers.map((supplier) => (
            <Card key={supplier.id}>
              <CardContent className="pt-6">
                <div className="flex justify-between items-start">
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold">{supplier.name}</h3>
                    <div className="text-sm text-gray-600 space-y-1">
                      <p>Email: {supplier.email}</p>
                      <p>Telefone: {supplier.phone}</p>
                      <p>CNPJ: {supplier.cnpj}</p>
                      <p>Endereço: {supplier.address}</p>
                        {isAdmin && (
                          <p className="text-xs text-gray-500">
                            Criado por: {getOwnerLabel(supplier.userId) ?? "Desconhecido"}
                          </p>
                        )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleEdit(supplier)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteSupplier(supplier.id)}
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
        <SupplierForm
          supplier={editingSupplier}
          onSubmit={editingSupplier ? handleUpdateSupplier : handleCreateSupplier}
          onCancel={handleCloseForm}
        />
      )}
    </div>
  )
}
