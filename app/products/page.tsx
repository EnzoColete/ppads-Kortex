"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Plus, Search, Edit, Trash2 } from "lucide-react"
import { productStorage } from "@/lib/storage"
import type { Product } from "@/lib/types"
import { ProductForm } from "@/components/product-form"

const productTypeLabels = {
  nitrogen: "Nitrogênio",
  semen: "Sêmen",
  other: "Outro",
}

const productTypeBadgeColors = {
  nitrogen: "bg-blue-100 text-blue-800",
  semen: "bg-green-100 text-green-800",
  other: "bg-gray-100 text-gray-800",
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [showForm, setShowForm] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadProducts = async () => {
      try {
        const data = await productStorage.getAll()
        setProducts(data)
      } catch (error) {
        console.error("Error loading products:", error)
      } finally {
        setLoading(false)
      }
    }
    loadProducts()
  }, [])

  const filteredProducts = products.filter(
    (product) =>
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      productTypeLabels[product.type].toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const handleCreateProduct = async (data: Omit<Product, "id" | "createdAt" | "updatedAt">) => {
    try {
      const newProduct = await productStorage.create(data)
      setProducts([...products, newProduct])
      setShowForm(false)
    } catch (error) {
      console.error("Error creating product:", error)
    }
  }

  const handleUpdateProduct = async (data: Omit<Product, "id" | "createdAt" | "updatedAt">) => {
    if (!editingProduct) return
    try {
      const updated = await productStorage.update(editingProduct.id, data)
      if (updated) {
        setProducts(products.map((p) => (p.id === editingProduct.id ? updated : p)))
        setEditingProduct(null)
        setShowForm(false)
      }
    } catch (error) {
      console.error("Error updating product:", error)
    }
  }

  const handleDeleteProduct = async (id: string) => {
    if (confirm("Tem certeza que deseja excluir este produto?")) {
      try {
        await productStorage.delete(id)
        setProducts(products.filter((p) => p.id !== id))
      } catch (error) {
        console.error("Error deleting product:", error)
      }
    }
  }

  const handleEdit = (product: Product) => {
    setEditingProduct(product)
    setShowForm(true)
  }

  const handleCloseForm = () => {
    setShowForm(false)
    setEditingProduct(null)
  }

  if (loading) {
    return <div className="flex justify-center items-center h-64">Carregando produtos...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Produtos</h1>
          <p className="text-gray-600 mt-2">Gerencie seus produtos (Nitrogênio, Sêmen e outros)</p>
        </div>
        <Button onClick={() => setShowForm(true)} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Novo Produto
        </Button>
      </div>

      {/* Barra de busca */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Buscar por nome, descrição ou tipo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Lista de produtos */}
      <div className="grid gap-4">
        {filteredProducts.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8 text-gray-500">
                {searchTerm ? "Nenhum produto encontrado" : "Nenhum produto cadastrado"}
              </div>
            </CardContent>
          </Card>
        ) : (
          filteredProducts.map((product) => (
            <Card key={product.id}>
              <CardContent className="pt-6">
                <div className="flex justify-between items-start">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-semibold">{product.name}</h3>
                      <Badge className={productTypeBadgeColors[product.type]}>{productTypeLabels[product.type]}</Badge>
                    </div>
                    <div className="text-sm text-gray-600 space-y-1">
                      <p>Descrição: {product.description}</p>
                      <div className="flex gap-4">
                        <p>
                          Preço: <span className="font-medium">R$ {product.price.toFixed(2)}</span>
                        </p>
                        <p>
                          Unidade: <span className="font-medium">{product.unit}</span>
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleEdit(product)}>
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

      {/* Estatísticas por tipo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {products.filter((p) => p.type === "nitrogen").length}
              </div>
              <p className="text-sm text-gray-600">Produtos de Nitrogênio</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {products.filter((p) => p.type === "semen").length}
              </div>
              <p className="text-sm text-gray-600">Produtos de Sêmen</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-600">
                {products.filter((p) => p.type === "other").length}
              </div>
              <p className="text-sm text-gray-600">Outros Produtos</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Formulário */}
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
