"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Plus, Search, Eye, Edit, Trash2 } from "lucide-react"
import { serviceOrderStorage, clientStorage, productStorage } from "@/lib/storage"
import { ErrorDialog, type ErrorDialogState } from "@/components/error-dialog"
import type { ServiceOrder, Client, Product } from "@/lib/types"
import { ServiceOrderForm } from "@/components/service-order-form"
import { ServiceOrderView } from "@/components/service-order-view"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useOwnerDirectory } from "@/hooks/use-owner-directory"
import { showErrorToast, showSuccessToast } from "@/lib/toast"

export default function ServiceOrdersPage() {
  const [orders, setOrders] = useState<ServiceOrder[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [priorityFilter, setPriorityFilter] = useState<string>("all")
  const [showForm, setShowForm] = useState(false)
  const [editingOrder, setEditingOrder] = useState<ServiceOrder | null>(null)
  const [viewingOrder, setViewingOrder] = useState<ServiceOrder | null>(null)
  const [errorDialog, setErrorDialog] = useState<ErrorDialogState | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [ownerFilter, setOwnerFilter] = useState("all")
  const itemsPerPage = 10
  const { isAdmin, getOwnerLabel, owners } = useOwnerDirectory()

  useEffect(() => {
    if (!isAdmin) {
      setOwnerFilter("all")
    }
  }, [isAdmin])

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [ordersData, clientsData, productsData] = await Promise.all([
        serviceOrderStorage.getAll(),
        clientStorage.getAll(),
        productStorage.getAll(),
      ])
      setOrders(ordersData)
      setClients(clientsData)
      setProducts(productsData)
    } catch (error) {
      console.error("Error loading data:", error)
      if (error instanceof Error) {
        setErrorDialog({ title: "Erro ao carregar dados", message: error.message })
      } else {
        setErrorDialog({ title: "Erro ao carregar dados", message: "Nao foi possivel carregar as informacoes." })
      }
    } finally {
      setLoading(false)
    }
  }

  const getClientName = (clientId: string) => {
    const client = clients.find((c) => c.id === clientId)
    return client?.name || "Cliente nao encontrado"
  }

  const filteredOrders = orders.filter((order) => {
    const clientName = getClientName(order.clientId).toLowerCase()
    const searchLower = searchTerm.toLowerCase()
    const matchesSearch =
      clientName.includes(searchLower) ||
      order.orderNumber.toLowerCase().includes(searchLower) ||
      order.title.toLowerCase().includes(searchLower)

    const matchesStatus = statusFilter === "all" || order.status === statusFilter
    const matchesPriority = priorityFilter === "all" || order.priority === priorityFilter
    const matchesOwner = !isAdmin || ownerFilter === "all" || order.userId === ownerFilter

    return matchesSearch && matchesStatus && matchesPriority && matchesOwner
  })

  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage)
  const paginatedOrders = filteredOrders.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

  const handleCreateOrder = async (data: Omit<ServiceOrder, "id" | "createdAt" | "updatedAt">) => {
    try {
      const newOrder = await serviceOrderStorage.create(data)
      setOrders([newOrder, ...orders])
      setShowForm(false)
      setEditingOrder(null)
      showSuccessToast("Ordem de serviço cadastrada com sucesso.")
    } catch (error) {
      console.error("Error creating order:", error)
      const message = error instanceof Error ? error.message : "Erro ao criar ordem de servico"
      showErrorToast(message)
    }
  }

  const handleUpdateOrder = async (data: Omit<ServiceOrder, "id" | "createdAt" | "updatedAt">) => {
    if (!editingOrder) return

    try {
      const updated = await serviceOrderStorage.update(editingOrder.id, data)
      if (updated) {
        setOrders(orders.map((o) => (o.id === editingOrder.id ? updated : o)))
        setShowForm(false)
        setEditingOrder(null)
        showSuccessToast("Ordem de serviço atualizada com sucesso.")
      }
    } catch (error) {
      console.error("Error updating order:", error)
      showErrorToast("Erro ao atualizar ordem de serviço.")
    }
  }

  const handleDeleteOrder = async (id: string) => {
    try {
      await serviceOrderStorage.delete(id)
      setOrders(orders.filter((o) => o.id !== id))
      showSuccessToast("Ordem de serviço excluída com sucesso.")
    } catch (error) {
      console.error("Error deleting order:", error)
      showErrorToast("Erro ao excluir ordem de serviço.")
    }
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      pending: "outline",
      in_progress: "default",
      completed: "secondary",
      cancelled: "destructive",
    }
    const labels: Record<string, string> = {
      pending: "Pendente",
      in_progress: "Em Andamento",
      completed: "Concluidas",
      cancelled: "Cancelada",
    }
    return <Badge variant={variants[status] || "default"}>{labels[status] || status}</Badge>
  }

  const getPriorityBadge = (priority?: string) => {
    if (!priority) return null
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      low: "secondary",
      medium: "default",
      high: "outline",
      urgent: "destructive",
    }
    const labels: Record<string, string> = {
      low: "Baixa",
      medium: "Media",
      high: "Alta",
      urgent: "Urgente",
    }
    return <Badge variant={variants[priority] || "default"}>{labels[priority] || priority}</Badge>
  }

  if (loading) {
    return <div className="flex justify-center items-center h-64">Carregando ordens de servico...</div>
  }

  return (
    <>
      <ErrorDialog
        open={Boolean(errorDialog)}
        onClose={() => setErrorDialog(null)}
        title={errorDialog?.title}
        message={errorDialog?.message || ""}
        details={errorDialog?.details}
      />
      <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Ordens de servico</h1>
          <p className="text-gray-600 mt-2">Gerencie as ordens de servico do sistema</p>
        </div>
        <Button
          onClick={() => {
            setShowForm(true)
            setEditingOrder(null)
          }}
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Nova Ordem
        </Button>
      </div>

      {/* EstatAsticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card >
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {orders.filter((o) => o.status === "pending").length}
              </div>
              <p className="text-sm text-gray-600">Pendentes</p>
            </div>
          </CardContent>
        </Card>

        <Card >
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">
                {orders.filter((o) => o.status === "in_progress").length}
              </div>
              <p className="text-sm text-gray-600">Em Andamento</p>
            </div>
          </CardContent>
        </Card>

        <Card >
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {orders.filter((o) => o.status === "completed").length}
              </div>
              <p className="text-sm text-gray-600">Concluídas</p>
            </div>
          </CardContent>
        </Card>

        <Card >
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-600">{orders.length}</div>
              <p className="text-sm text-gray-600">Total</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card >
        <CardContent className="pt-6">
          <div className={`grid grid-cols-1 ${isAdmin ? "md:grid-cols-4" : "md:grid-cols-3"} gap-4`}>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Buscar por cliente, nAomero ou tAtulo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filtrar por status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Status</SelectItem>
                <SelectItem value="pending">Pendente</SelectItem>
                <SelectItem value="in_progress">Em Andamento</SelectItem>
                <SelectItem value="completed">ConcluAda</SelectItem>
                <SelectItem value="cancelled">Cancelada</SelectItem>
              </SelectContent>
            </Select>

            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filtrar por prioridade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Prioridades</SelectItem>
                <SelectItem value="low">Baixa</SelectItem>
                <SelectItem value="medium">Media</SelectItem>
                <SelectItem value="high">Alta</SelectItem>
                <SelectItem value="urgent">Urgente</SelectItem>
              </SelectContent>
            </Select>
            {isAdmin && (
              <Select value={ownerFilter} onValueChange={setOwnerFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filtrar por usuário" />
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
            )}
          </div>
        </CardContent>
      </Card>

      {/* Lista de ordens */}
      <div className="grid gap-4">
        {paginatedOrders.length === 0 ? (
          <Card >
            <CardContent className="pt-6">
              <div className="text-center py-8 text-gray-500">
                {searchTerm || statusFilter !== "all" || priorityFilter !== "all"
                  ? "Nenhuma ordem encontrada com os filtros aplicados"
                  : "Nenhuma ordem de servico cadastrada"}
              </div>
            </CardContent>
          </Card>
        ) : (
          paginatedOrders.map((order) => (
            <Card key={order.id}>
              <CardContent className="pt-6">
                <div className="flex justify-between items-start">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-3 flex-wrap">
                      <h3 className="text-lg font-semibold">OS #{order.orderNumber}</h3>
                      {getStatusBadge(order.status)}
                      {getPriorityBadge(order.priority)}
                    </div>
                    <div className="text-sm text-gray-600 space-y-1">
                      <p className="font-medium text-base">{order.title}</p>
                      <p>
                        <span className="font-medium">Cliente:</span> {getClientName(order.clientId)}
                      </p>
                      {order.description && (
                        <p>
                          <span className="font-medium">Descricao:</span> {order.description}
                        </p>
                      )}
                      {order.scheduledDate && (
                        <p>
                          <span className="font-medium">Data Agendada:</span>{" "}
                          {new Date(order.scheduledDate).toLocaleDateString("pt-BR")}
                        </p>
                      )}
                      <p>
                        <span className="font-medium">Valor Total:</span> R$ {order.totalValue.toFixed(2)}
                      </p>
                      <p className="text-xs text-gray-500">
                        Criada em: {new Date(order.createdAt).toLocaleDateString("pt-BR")}
                      </p>
                      {isAdmin && (
                        <p className="text-xs text-gray-500">
                          Criado por: {getOwnerLabel(order.userId) ?? "Desconhecido"}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setViewingOrder(order)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditingOrder(order)
                        setShowForm(true)
                      }}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteOrder(order.id)}
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

      {/* PaginaASALo */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <Button
            variant="outline"
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
          >
            Anterior
          </Button>
          <span className="flex items-center px-4">
            Página {currentPage} de {totalPages}
          </span>
          <Button
            variant="outline"
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
          >
            Próxima
          </Button>
        </div>
      )}

      {/* FormulA!rio */}
      {showForm && (
        <ServiceOrderForm
          clients={clients}
          products={products}
          order={editingOrder}
          onSubmit={editingOrder ? handleUpdateOrder : handleCreateOrder}
          onCancel={() => {
            setShowForm(false)
            setEditingOrder(null)
          }}
        />
      )}

      {/* VisualizaASALo */}
      {viewingOrder && (
        <ServiceOrderView
          order={viewingOrder}
          clients={clients}
          products={products}
          onClose={() => setViewingOrder(null)}
          ownerLabel={isAdmin ? getOwnerLabel(viewingOrder.userId) : undefined}
        />
      )}
      </div>
    </>
  )
}
