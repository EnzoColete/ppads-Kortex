"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Plus, Search, Edit, Trash2 } from "lucide-react"
import { productStorage } from "@/lib/storage"
import type { Product } from "@/lib/types"
import { ProductForm } from "@/components/product-form"
import { useOwnerDirectory } from "@/hooks/use-owner-directory"
import { showErrorToast, showSuccessToast } from "@/lib/toast"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const DEFAULT_PAGE_SIZE = 20

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [showForm, setShowForm] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
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
      void loadProducts(pagination.page)
    }, 250)
    return () => clearTimeout(handle)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, ownerFilter, pagination.page])

  const loadProducts = async (pageValue = pagination.page) => {
    try {
      setLoading(true)
      const response = await productStorage.list({
        page: pageValue,
        pageSize: pagination.pageSize,
        search: searchTerm,
        ownerId: ownerFilter !== "all" ? ownerFilter : undefined,
      })
      setProducts(response.data)
      setPagination((prev) => ({
        ...prev,
        page: response.meta.page,
        pageSize: response.meta.pageSize,
        total: response.meta.total,
      }))
    } catch (error) {
      console.error("Error loading products:", error)
      showErrorToast("Erro ao carregar produtos.")
    } finally {
      setLoading(false)
    }
  }

  const handleCreateProduct = async (data: Omit<Product, "id" | "createdAt" | "updatedAt">) => {
    try {
      await productStorage.create(data)
      setShowForm(false)
      setPagination((prev) => ({ ...prev, page: 1 }))
      void loadProducts(1)
      showSuccessToast("Produto cadastrado com sucesso.")
    } catch (error) {
      console.error("Error creating product:", error)
      showErrorToast("Erro ao criar produto.")
    }
  }

  const handleUpdateProduct = async (data: Omit<Product, "id" | "createdAt" | "updatedAt">) => {
    if (!editingProduct) return
    try {
      const updated = await productStorage.update(editingProduct.id, data)
      if (updated) {
        setEditingProduct(null)
        setShowForm(false)
        void loadProducts(pagination.page)
        showSuccessToast("Produto atualizado com sucesso.")
      }
    } catch (error) {
      console.error("Error updating product:", error)
      showErrorToast("Erro ao atualizar produto.")
    }
  }

  const handleDeleteProduct = async (id: string) => {
    try {
      await productStorage.delete(id)
      void loadProducts(pagination.page)
      showSuccessToast("Produto excluído com sucesso.")
    } catch (error) {
      console.error("Error deleting product:", error)
      showErrorToast("Erro ao excluir produto.")
    }
  }

  const handleCloseForm = () => {
    setShowForm(false)
    setEditingProduct(null)
  }

  const totalPages = Math.max(1, Math.ceil(pagination.total / pagination.pageSize))

  const averagePrice =
    products.length > 0 ? products.reduce((sum, product) => sum + product.price, 0) / products.length : 0

  const uniqueUnits = new Set(products.map((product) => product.unit)).size

  if (loading && products.length === 0) {
    return <div className="flex justify-center items-center h-64">Carregando produtos...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Produtos</h1>
          <p className="text-gray-600 mt-2">Gerencie seus produtos livremente</p>
        </div>
        <Button onClick={() => setShowForm(true)} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Novo Produto
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Buscar por nome, descrição ou unidade..."
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{pagination.total}</div>
              <p className="text-sm text-gray-600">Total de Produtos</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">R$ {averagePrice.toFixed(2)}</div>
              <p className="text-sm text-gray-600">Preço Médio (página atual)</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{uniqueUnits}</div>
              <p className="text-sm text-gray-600">Tipos de Unidades (página)</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4">
        {products.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8 text-gray-500">
                {searchTerm ? "Nenhum produto encontrado" : "Nenhum produto cadastrado"}
              </div>
            </CardContent>
          </Card>
        ) : (
          products.map((product) => (
            <Card key={product.id}>
              <CardContent className="pt-6">
                <div className="flex justify-between items-start">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-semibold">{product.name}</h3>
                    </div>
                    <div className="text-sm text-gray-600 space-y-1">
                      <p>Descrição: {product.description}</p>
                      <div className="flex flex-wrap gap-4">
                        <p>
                          Preço: <span className="font-medium">R$ {product.price.toFixed(2)}</span>
                        </p>
                        <p>
                          Unidade: <span className="font-medium">{product.unit}</span>
                        </p>
                      </div>
                      {isAdmin && (
                        <p className="text-xs text-gray-500">
                          Criado por: {getOwnerLabel(product.userId) ?? "Desconhecido"}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setEditingProduct(product)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteProduct(product.id)}
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
        <ProductForm
          product={editingProduct}
          onSubmit={editingProduct ? handleUpdateProduct : handleCreateProduct}
          onCancel={handleCloseForm}
        />
      )}
    </div>
  )
}
