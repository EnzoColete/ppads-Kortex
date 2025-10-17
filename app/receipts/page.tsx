"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Plus, Search, Eye, Trash2 } from "lucide-react"
import { receiptStorage, supplierStorage, clientStorage, productStorage } from "@/lib/storage"
import type { Receipt, Supplier, Client, Product } from "@/lib/types"
import { ReceiptForm } from "@/components/receipt-form"
import { ReceiptView } from "@/components/receipt-view"

export default function ReceiptsPage() {
  const [receipts, setReceipts] = useState<Receipt[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [showForm, setShowForm] = useState(false)
  const [viewingReceipt, setViewingReceipt] = useState<Receipt | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadData = async () => {
      try {
        const [receiptsData, suppliersData, clientsData, productsData] = await Promise.all([
          receiptStorage.getAll(),
          supplierStorage.getAll(),
          clientStorage.getAll(),
          productStorage.getAll(),
        ])
        setReceipts(receiptsData)
        setSuppliers(suppliersData)
        setClients(clientsData)
        setProducts(productsData)
      } catch (error) {
        console.error("Error loading data:", error)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  const getEntityName = (receipt: Receipt) => {
    if (receipt.type === "supplier" && receipt.supplierId) {
      const supplier = suppliers.find((s) => s.id === receipt.supplierId)
      return supplier?.name || "Fornecedor não encontrado"
    }
    if (receipt.type === "client" && receipt.clientId) {
      const client = clients.find((c) => c.id === receipt.clientId)
      return client?.name || "Cliente não encontrado"
    }
    return "N/A"
  }

  const filteredReceipts = receipts.filter((receipt) => {
    const entityName = getEntityName(receipt).toLowerCase()
    const searchLower = searchTerm.toLowerCase()
    return (
      entityName.includes(searchLower) ||
      receipt.id.toLowerCase().includes(searchLower) ||
      receipt.type.includes(searchLower)
    )
  })

<<<<<<< HEAD
  const formatDate = (dateValue: any): string => {
    try {
      let date: Date

      if (!dateValue) {
        date = new Date()
      } else if (dateValue instanceof Date) {
        date = dateValue
      } else if (typeof dateValue === "string") {
        date = new Date(dateValue)
      } else {
        date = new Date()
      }

      if (isNaN(date.getTime())) {
        date = new Date()
      }

      return date.toLocaleDateString("pt-BR")
    } catch (error) {
      console.error("[v0] Error formatting date:", error)
      return new Date().toLocaleDateString("pt-BR")
    }
  }

=======
>>>>>>> 3969ce6e07b797e7bc94ebcb0efc8cecfcf4b892
  const handleCreateReceipt = async (data: Omit<Receipt, "id" | "createdAt" | "updatedAt">) => {
    try {
      const newReceipt = await receiptStorage.create(data)
      setReceipts([...receipts, newReceipt])
      setShowForm(false)
    } catch (error) {
      console.error("Error creating receipt:", error)
    }
  }

  const handleDeleteReceipt = async (id: string) => {
    if (confirm("Tem certeza que deseja excluir este recibo?")) {
      try {
        await receiptStorage.delete(id)
        setReceipts(receipts.filter((r) => r.id !== id))
      } catch (error) {
        console.error("Error deleting receipt:", error)
      }
    }
  }

  const handleViewReceipt = (receipt: Receipt) => {
    setViewingReceipt(receipt)
  }

  const handleCloseForm = () => {
    setShowForm(false)
  }

  const handleCloseView = () => {
    setViewingReceipt(null)
  }

  if (loading) {
    return <div className="flex justify-center items-center h-64">Carregando recibos...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Recibos</h1>
<<<<<<< HEAD
          <p className="text-gray-600 mt-2">Gerencie recibos de clientes</p>
=======
          <p className="text-gray-600 mt-2">Gerencie recibos de fornecedores e clientes</p>
>>>>>>> 3969ce6e07b797e7bc94ebcb0efc8cecfcf4b892
        </div>
        <Button onClick={() => setShowForm(true)} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Novo Recibo
        </Button>
      </div>

      {/* Estatísticas */}
<<<<<<< HEAD
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
=======
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
>>>>>>> 3969ce6e07b797e7bc94ebcb0efc8cecfcf4b892
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{receipts.length}</div>
              <p className="text-sm text-gray-600">Total de Recibos</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
<<<<<<< HEAD
              <div className="text-2xl font-bold text-green-600">{receipts.filter((r) => r.hasInvoice).length}</div>
              <p className="text-sm text-gray-600">Recibos com Nota Fiscal</p>
=======
              <div className="text-2xl font-bold text-green-600">
                {receipts.filter((r) => r.type === "supplier").length}
              </div>
              <p className="text-sm text-gray-600">Recibos de Fornecedores</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {receipts.filter((r) => r.type === "client").length}
              </div>
              <p className="text-sm text-gray-600">Recibos de Clientes</p>
>>>>>>> 3969ce6e07b797e7bc94ebcb0efc8cecfcf4b892
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
              placeholder="Buscar por nome, ID ou tipo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Lista de recibos */}
      <div className="grid gap-4">
        {filteredReceipts.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8 text-gray-500">
                {searchTerm ? "Nenhum recibo encontrado" : "Nenhum recibo emitido"}
              </div>
            </CardContent>
          </Card>
        ) : (
          filteredReceipts.map((receipt) => (
            <Card key={receipt.id}>
              <CardContent className="pt-6">
                <div className="flex justify-between items-start">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-semibold">#{receipt.id.slice(0, 8)}</h3>
                      <Badge variant={receipt.type === "supplier" ? "default" : "secondary"}>
                        {receipt.type === "supplier" ? "Fornecedor" : "Cliente"}
                      </Badge>
                      {receipt.type === "client" && (
                        <Badge variant={receipt.hasInvoice ? "default" : "destructive"}>
                          {receipt.hasInvoice ? "Com NF" : "Sem NF"}
                        </Badge>
                      )}
                    </div>
                    <div className="text-sm text-gray-600 space-y-1">
                      <p>
                        <span className="font-medium">{receipt.type === "supplier" ? "Fornecedor" : "Cliente"}:</span>{" "}
                        {getEntityName(receipt)}
                      </p>
                      <p>
                        <span className="font-medium">Total:</span> R$ {receipt.total.toFixed(2)}
                      </p>
                      <p>
                        <span className="font-medium">Produtos:</span> {receipt.products.length} item(s)
                      </p>
                      {receipt.observations && (
                        <p>
                          <span className="font-medium">Observações:</span> {receipt.observations}
                        </p>
                      )}
                      <p className="text-xs text-gray-500">
<<<<<<< HEAD
                        Emitido em: {formatDate(receipt.date || receipt.createdAt)}
=======
                        Emitido em: {new Date(receipt.createdAt).toLocaleDateString("pt-BR")}
>>>>>>> 3969ce6e07b797e7bc94ebcb0efc8cecfcf4b892
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleViewReceipt(receipt)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteReceipt(receipt.id)}
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
        <ReceiptForm
          suppliers={suppliers}
          clients={clients}
          products={products}
          onSubmit={handleCreateReceipt}
          onCancel={handleCloseForm}
        />
      )}

      {/* Visualização do recibo */}
      {viewingReceipt && (
        <ReceiptView
          receipt={viewingReceipt}
          suppliers={suppliers}
          clients={clients}
          products={products}
          onClose={handleCloseView}
        />
      )}
    </div>
  )
}
