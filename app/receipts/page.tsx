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
import { useOwnerDirectory } from "@/hooks/use-owner-directory"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { showErrorToast, showSuccessToast } from "@/lib/toast"

const DEFAULT_PAGE_SIZE = 15

export default function ReceiptsPage() {
  const [receipts, setReceipts] = useState<Receipt[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [showForm, setShowForm] = useState(false)
  const [viewingReceipt, setViewingReceipt] = useState<Receipt | null>(null)
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
    const fetchRelatedData = async () => {
      try {
        const [suppliersData, clientsData, productsData] = await Promise.all([
          supplierStorage.getAll({ limit: 1000 }),
          clientStorage.getAll({ limit: 1000 }),
          productStorage.getAll({ limit: 1000 }),
        ])
        setSuppliers(suppliersData)
        setClients(clientsData)
        setProducts(productsData)
      } catch (error) {
        console.error("Error loading related data:", error)
      }
    }

    void fetchRelatedData()
  }, [])

  useEffect(() => {
    const handle = setTimeout(() => {
      void loadReceipts(pagination.page)
    }, 250)
    return () => clearTimeout(handle)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, ownerFilter, pagination.page])

  const loadReceipts = async (pageValue = pagination.page) => {
    try {
      setLoading(true)
      const response = await receiptStorage.list({
        page: pageValue,
        pageSize: pagination.pageSize,
        search: searchTerm,
        ownerId: ownerFilter !== "all" ? ownerFilter : undefined,
      })
      setReceipts(response.data)
      setPagination((prev) => ({
        ...prev,
        page: response.meta.page,
        pageSize: response.meta.pageSize,
        total: response.meta.total,
      }))
    } catch (error) {
      console.error("Error loading receipts:", error)
      showErrorToast("Erro ao carregar recibos.")
    } finally {
      setLoading(false)
    }
  }

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

  const handleCreateReceipt = async (data: Omit<Receipt, "id" | "createdAt" | "updatedAt">) => {
    try {
      await receiptStorage.create(data)
      setShowForm(false)
      setPagination((prev) => ({ ...prev, page: 1 }))
      void loadReceipts(1)
      showSuccessToast("Recibo emitido com sucesso.")
    } catch (error) {
      console.error("Error creating receipt:", error)
      showErrorToast("Erro ao criar recibo.")
    }
  }

  const handleDeleteReceipt = async (id: string) => {
    try {
      await receiptStorage.delete(id)
      void loadReceipts(pagination.page)
      showSuccessToast("Recibo excluído com sucesso.")
    } catch (error) {
      console.error("Error deleting receipt:", error)
      showErrorToast("Erro ao excluir recibo.")
    }
  }

  const totalPages = Math.max(1, Math.ceil(pagination.total / pagination.pageSize))

  if (loading && receipts.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Carregando recibos...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Recibos</h1>
          <p className="text-gray-600 mt-2">Gerencie os recibos emitidos</p>
        </div>
        <Button onClick={() => setShowForm(true)} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Novo Recibo
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Buscar por nome, ID ou tipo..."
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
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-sm text-gray-600">Recibos no período atual</p>
            <p className="text-2xl font-bold text-blue-600">{pagination.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-sm text-gray-600">Itens exibidos</p>
            <p className="text-2xl font-bold text-green-600">{receipts.length}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4">
        {receipts.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8 text-gray-500">
                {searchTerm ? "Nenhum recibo encontrado" : "Nenhum recibo emitido"}
              </div>
            </CardContent>
          </Card>
        ) : (
          receipts.map((receipt) => (
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
                        Emitido em: {new Date(receipt.createdAt ?? receipt.date).toLocaleDateString("pt-BR")}
                      </p>
                      {isAdmin && (
                        <p className="text-xs text-gray-500">
                          Criado por: {getOwnerLabel(receipt.userId) ?? "Desconhecido"}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setViewingReceipt(receipt)}>
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
        <ReceiptForm
          suppliers={suppliers}
          clients={clients}
          products={products}
          onSubmit={handleCreateReceipt}
          onCancel={() => setShowForm(false)}
        />
      )}

      {viewingReceipt && (
        <ReceiptView
          receipt={viewingReceipt}
          suppliers={suppliers}
          clients={clients}
          products={products}
          onClose={() => setViewingReceipt(null)}
          ownerLabel={isAdmin ? getOwnerLabel(viewingReceipt.userId) : undefined}
        />
      )}
    </div>
  )
}
