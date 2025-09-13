"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Bell, Search, Check, Clock, AlertTriangle, Settings } from "lucide-react"
import { alertStorage, clientStorage, receiptStorage } from "@/lib/storage"
import type { Alert, Client, Receipt } from "@/lib/types"
import { AlertSettings } from "@/components/alert-settings"

const differenceInDays = (date1: Date, date2: Date): number => {
  const diffTime = Math.abs(date1.getTime() - date2.getTime())
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
}

const formatDate = (date: Date): string => {
  return date.toLocaleDateString("pt-BR")
}

const formatDateTime = (date: Date): string => {
  return (
    date.toLocaleDateString("pt-BR") + " às " + date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
  )
}

const alertTypeLabels = {
  "30days": "30 dias",
  "40days": "40 dias",
  "50days": "50 dias",
  "60days": "60 dias",
}

const alertTypeBadgeColors = {
  "30days": "bg-yellow-100 text-yellow-800",
  "40days": "bg-orange-100 text-orange-800",
  "50days": "bg-red-100 text-red-800",
  "60days": "bg-red-200 text-red-900",
}

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [receipts, setReceipts] = useState<Receipt[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [filterType, setFilterType] = useState<string>("all")
  const [filterStatus, setFilterStatus] = useState<string>("all")
  const [showSettings, setShowSettings] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const initializeData = async () => {
      await loadData()
      await generateAutomaticAlerts()
      setLoading(false)
    }
    initializeData()
  }, [])

  const loadData = async () => {
    try {
      const [alertsData, clientsData, receiptsData] = await Promise.all([
        alertStorage.getAll(),
        clientStorage.getAll(),
        receiptStorage.getAll(),
      ])
      setAlerts(alertsData)
      setClients(clientsData)
      setReceipts(receiptsData)
    } catch (error) {
      console.error("Error loading data:", error)
    }
  }

  const generateAutomaticAlerts = async () => {
    try {
      const existingAlerts = await alertStorage.getAll()
      const allClients = await clientStorage.getAll()
      const allReceipts = await receiptStorage.getAll()

      for (const client of allClients) {
        const clientReceipts = allReceipts
          .filter((receipt) => receipt.clientId === client.id)
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

        if (clientReceipts.length === 0) continue

        const lastReceipt = clientReceipts[0]
        const daysSinceLastReceipt = differenceInDays(new Date(), new Date(lastReceipt.createdAt))

        const alertTypes: Array<{ days: number; type: Alert["type"] }> = [
          { days: 30, type: "30days" },
          { days: 40, type: "40days" },
          { days: 50, type: "50days" },
          { days: 60, type: "60days" },
        ]

        for (const { days, type } of alertTypes) {
          if (daysSinceLastReceipt >= days) {
            const existingAlert = existingAlerts.find((alert) => alert.clientId === client.id && alert.type === type)

            if (!existingAlert) {
              const message = `Cliente ${client.name} sem movimentação há ${days} dias (último recibo: ${formatDate(new Date(lastReceipt.createdAt))})`

              await alertStorage.create({
                clientId: client.id,
                type,
                message,
                isRead: false,
              })
            }
          }
        }
      }

      const updatedAlerts = await alertStorage.getAll()
      setAlerts(updatedAlerts)
    } catch (error) {
      console.error("Error generating alerts:", error)
    }
  }

  const getClient = (clientId: string) => {
    return clients.find((c) => c.id === clientId)
  }

  const filteredAlerts = alerts.filter((alert) => {
    const client = getClient(alert.clientId)
    const clientName = client?.name.toLowerCase() || ""
    const searchLower = searchTerm.toLowerCase()

    const matchesSearch = clientName.includes(searchLower) || alert.message.toLowerCase().includes(searchLower)
    const matchesType = filterType === "all" || alert.type === filterType
    const matchesStatus =
      filterStatus === "all" ||
      (filterStatus === "read" && alert.isRead) ||
      (filterStatus === "unread" && !alert.isRead)

    return matchesSearch && matchesType && matchesStatus
  })

  const handleMarkAsRead = async (alertId: string) => {
    try {
      await alertStorage.markAsRead(alertId)
      setAlerts(alerts.map((alert) => (alert.id === alertId ? { ...alert, isRead: true } : alert)))
    } catch (error) {
      console.error("Error marking alert as read:", error)
    }
  }

  const handleMarkAllAsRead = async () => {
    try {
      const unreadAlerts = alerts.filter((alert) => !alert.isRead)
      await Promise.all(unreadAlerts.map((alert) => alertStorage.markAsRead(alert.id)))
      setAlerts(alerts.map((alert) => ({ ...alert, isRead: true })))
    } catch (error) {
      console.error("Error marking all alerts as read:", error)
    }
  }

  const unreadCount = alerts.filter((alert) => !alert.isRead).length

  if (loading) {
    return <div className="flex justify-center items-center h-64">Carregando alertas...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Alertas Automáticos</h1>
          <p className="text-gray-600 mt-2">Monitoramento de clientes com prazos de 30, 40, 50 e 60 dias</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowSettings(true)} variant="outline">
            <Settings className="h-4 w-4 mr-2" />
            Configurações
          </Button>
          <Button onClick={handleMarkAllAsRead} disabled={unreadCount === 0}>
            <Check className="h-4 w-4 mr-2" />
            Marcar Todos como Lidos
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total de Alertas</p>
                <p className="text-2xl font-bold">{alerts.length}</p>
              </div>
              <Bell className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Não Lidos</p>
                <p className="text-2xl font-bold text-red-600">{unreadCount}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Alertas 60+ dias</p>
                <p className="text-2xl font-bold text-red-800">{alerts.filter((a) => a.type === "60days").length}</p>
              </div>
              <Clock className="h-8 w-8 text-red-800" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Clientes Ativos</p>
                <p className="text-2xl font-bold text-green-600">
                  {clients.length - new Set(alerts.map((a) => a.clientId)).size}
                </p>
              </div>
              <Check className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Buscar por cliente ou mensagem..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <div>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger>
                  <SelectValue placeholder="Filtrar por prazo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os prazos</SelectItem>
                  <SelectItem value="30days">30 dias</SelectItem>
                  <SelectItem value="40days">40 dias</SelectItem>
                  <SelectItem value="50days">50 dias</SelectItem>
                  <SelectItem value="60days">60 dias</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Filtrar por status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="unread">Não lidos</SelectItem>
                  <SelectItem value="read">Lidos</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {filteredAlerts.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8 text-gray-500">
                {searchTerm || filterType !== "all" || filterStatus !== "all"
                  ? "Nenhum alerta encontrado com os filtros aplicados"
                  : "Nenhum alerta gerado"}
              </div>
            </CardContent>
          </Card>
        ) : (
          filteredAlerts.map((alert) => {
            const client = getClient(alert.clientId)
            return (
              <Card key={alert.id} className={`${!alert.isRead ? "border-l-4 border-l-red-500" : ""}`}>
                <CardContent className="pt-6">
                  <div className="flex justify-between items-start">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-3">
                        <h3 className="text-lg font-semibold">{client?.name || "Cliente não encontrado"}</h3>
                        <Badge className={alertTypeBadgeColors[alert.type]}>{alertTypeLabels[alert.type]}</Badge>
                        {!alert.isRead && <Badge variant="destructive">Novo</Badge>}
                      </div>
                      <p className="text-sm text-gray-600">{alert.message}</p>
                      {client && (
                        <div className="text-xs text-gray-500 space-y-1">
                          <p>Email: {client.email}</p>
                          <p>Telefone: {client.phone}</p>
                        </div>
                      )}
                      <p className="text-xs text-gray-400">
                        Alerta criado em: {formatDateTime(new Date(alert.createdAt))}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {!alert.isRead && (
                        <Button variant="outline" size="sm" onClick={() => handleMarkAsRead(alert.id)}>
                          <Check className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })
        )}
      </div>

      {showSettings && (
        <AlertSettings
          onClose={() => setShowSettings(false)}
          onRefresh={() => {
            generateAutomaticAlerts()
            loadData()
          }}
        />
      )}
    </div>
  )
}
