"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ChevronLeft, ChevronRight, Filter } from "lucide-react"
import type { CalendarEvent, Client, Supplier } from "@/lib/types"
import { getDailyExpenses, getReceipts, getClients, getSuppliers } from "@/lib/storage"

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [view, setView] = useState<"month" | "week" | "day">("month")
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [filteredEvents, setFilteredEvents] = useState<CalendarEvent[]>([])
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const [filterType, setFilterType] = useState<string>("all")
  const [filterEntity, setFilterEntity] = useState<string>("all")
  const [clients, setClients] = useState<Client[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        const expenses = await getDailyExpenses()
        const receipts = await getReceipts()
        const clientsData = await getClients()
        const suppliersData = await getSuppliers()

        setClients(clientsData)
        setSuppliers(suppliersData)

        const calendarEvents: CalendarEvent[] = []

        // Processar gastos diários (especialmente combustível para alertas)
        expenses.forEach((expense) => {
          if (expense.fuel > 0) {
            const daysSince = Math.floor((Date.now() - new Date(expense.date).getTime()) / (1000 * 60 * 60 * 24))
            let alertLevel: "green" | "yellow" | "orange" | "red" = "green"

            if (daysSince >= 60) alertLevel = "red"
            else if (daysSince >= 50) alertLevel = "orange"
            else if (daysSince >= 40) alertLevel = "yellow"
            else if (daysSince >= 30) alertLevel = "green"

            calendarEvents.push({
              id: `fuel-${expense.id}`,
              date: expense.date,
              type: "fuel",
              title: `Abastecimento - R$ ${expense.fuel.toFixed(2)}`,
              description: `${daysSince} dias atrás`,
              value: expense.fuel,
              supplier: expense.supplierName,
              daysSince,
              alertLevel: daysSince >= 30 ? alertLevel : undefined,
            })
          }

          // Outros gastos
          const totalOther = expense.food + expense.supplier + (expense.toll || 0)
          if (totalOther > 0) {
            calendarEvents.push({
              id: `expense-${expense.id}`,
              date: expense.date,
              type: "expense",
              title: `Gastos Diários - R$ ${totalOther.toFixed(2)}`,
              description: expense.notes || "Gastos diversos",
              value: totalOther,
              supplier: expense.supplierName,
            })
          }
        })

        // Processar recibos
        receipts.forEach((receipt) => {
          calendarEvents.push({
            id: `receipt-${receipt.id}`,
            date: receipt.date,
            type: "receipt",
            title: `${receipt.type === "supplier" ? "Fornecedor" : "Cliente"} - R$ ${receipt.total.toFixed(2)}`,
            description: receipt.description || "Recibo emitido",
            value: receipt.total,
            supplier: receipt.type === "supplier" ? receipt.entityName : undefined,
            client: receipt.type === "client" ? receipt.entityName : undefined,
          })
        })

        setEvents(calendarEvents)
        setFilteredEvents(calendarEvents)
      } catch (error) {
        console.error("Erro ao carregar dados do calendário:", error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  useEffect(() => {
    let filtered = events

    if (filterType !== "all") {
      filtered = filtered.filter((event) => event.type === filterType)
    }

    if (filterEntity !== "all") {
      filtered = filtered.filter((event) => event.supplier === filterEntity || event.client === filterEntity)
    }

    setFilteredEvents(filtered)
  }, [events, filterType, filterEntity])

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("pt-BR", {
      year: "numeric",
      month: "long",
    })
  }

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDayOfWeek = firstDay.getDay()

    const days = []

    // Dias do mês anterior
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      const prevDate = new Date(year, month, -i)
      days.push({ date: prevDate, isCurrentMonth: false })
    }

    // Dias do mês atual
    for (let day = 1; day <= daysInMonth; day++) {
      days.push({ date: new Date(year, month, day), isCurrentMonth: true })
    }

    // Completar a grade com dias do próximo mês
    const remainingDays = 42 - days.length
    for (let day = 1; day <= remainingDays; day++) {
      days.push({ date: new Date(year, month + 1, day), isCurrentMonth: false })
    }

    return days
  }

  const getEventsForDate = (date: Date) => {
    const dateStr = date.toISOString().split("T")[0]
    return filteredEvents.filter((event) => event.date === dateStr)
  }

  const getAlertColor = (alertLevel?: string) => {
    switch (alertLevel) {
      case "green":
        return "bg-green-500"
      case "yellow":
        return "bg-yellow-500"
      case "orange":
        return "bg-orange-500"
      case "red":
        return "bg-red-500"
      default:
        return "bg-blue-500"
    }
  }

  const navigateMonth = (direction: "prev" | "next") => {
    setCurrentDate((prev) => {
      const newDate = new Date(prev)
      if (direction === "prev") {
        newDate.setMonth(prev.getMonth() - 1)
      } else {
        newDate.setMonth(prev.getMonth() + 1)
      }
      return newDate
    })
  }

  const days = getDaysInMonth(currentDate)

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex justify-center items-center h-64">
          <div className="text-lg">Carregando calendário...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Calendário</h1>
          <p className="text-gray-600">Visualize gastos e alertas por data</p>
        </div>
        <div className="flex gap-2">
          <Select value={view} onValueChange={(value: "month" | "week" | "day") => setView(value)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="month">Mensal</SelectItem>
              <SelectItem value="week">Semanal</SelectItem>
              <SelectItem value="day">Diário</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <Button variant="outline" size="sm" onClick={() => navigateMonth("prev")}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <CardTitle className="text-xl">{formatDate(currentDate)}</CardTitle>
                  <Button variant="outline" size="sm" onClick={() => navigateMonth("next")}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
                <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())}>
                  Hoje
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-1 mb-4">
                {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((day) => (
                  <div key={day} className="p-2 text-center text-sm font-medium text-gray-600">
                    {day}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {days.map((day, index) => {
                  const dayEvents = getEventsForDate(day.date)
                  const hasAlerts = dayEvents.some((event) => event.alertLevel)

                  return (
                    <div
                      key={index}
                      className={`min-h-24 p-1 border rounded cursor-pointer hover:bg-gray-50 ${
                        day.isCurrentMonth ? "bg-white" : "bg-gray-50"
                      } ${day.date.toDateString() === new Date().toDateString() ? "ring-2 ring-blue-500" : ""}`}
                    >
                      <div className={`text-sm ${day.isCurrentMonth ? "text-gray-900" : "text-gray-400"}`}>
                        {day.date.getDate()}
                      </div>
                      <div className="space-y-1">
                        {dayEvents.slice(0, 2).map((event) => (
                          <div
                            key={event.id}
                            onClick={() => setSelectedEvent(event)}
                            className={`text-xs p-1 rounded text-white cursor-pointer ${getAlertColor(event.alertLevel)}`}
                          >
                            {event.title.length > 15 ? event.title.substring(0, 15) + "..." : event.title}
                          </div>
                        ))}
                        {dayEvents.length > 2 && (
                          <div className="text-xs text-gray-500">+{dayEvents.length - 2} mais</div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filtros
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">Tipo</label>
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="fuel">Combustível</SelectItem>
                    <SelectItem value="expense">Gastos</SelectItem>
                    <SelectItem value="receipt">Recibos</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Cliente/Fornecedor</label>
                <Select value={filterEntity} onValueChange={setFilterEntity}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {clients.map((client) => (
                      <SelectItem key={`client-${client.id}`} value={client.name}>
                        {client.name} (Cliente)
                      </SelectItem>
                    ))}
                    {suppliers.map((supplier) => (
                      <SelectItem key={`supplier-${supplier.id}`} value={supplier.name}>
                        {supplier.name} (Fornecedor)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Legenda de Alertas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-green-500 rounded"></div>
                <span className="text-sm">30-39 dias</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-yellow-500 rounded"></div>
                <span className="text-sm">40-49 dias</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-orange-500 rounded"></div>
                <span className="text-sm">50-59 dias</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-red-500 rounded"></div>
                <span className="text-sm">60+ dias</span>
              </div>
            </CardContent>
          </Card>

          {selectedEvent && (
            <Card>
              <CardHeader>
                <CardTitle>Detalhes do Evento</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div>
                    <span className="font-medium">Título:</span>
                    <p className="text-sm">{selectedEvent.title}</p>
                  </div>
                  <div>
                    <span className="font-medium">Data:</span>
                    <p className="text-sm">{new Date(selectedEvent.date).toLocaleDateString("pt-BR")}</p>
                  </div>
                  {selectedEvent.description && (
                    <div>
                      <span className="font-medium">Descrição:</span>
                      <p className="text-sm">{selectedEvent.description}</p>
                    </div>
                  )}
                  {selectedEvent.value && (
                    <div>
                      <span className="font-medium">Valor:</span>
                      <p className="text-sm">R$ {selectedEvent.value.toFixed(2)}</p>
                    </div>
                  )}
                  {selectedEvent.supplier && (
                    <div>
                      <span className="font-medium">Fornecedor:</span>
                      <p className="text-sm">{selectedEvent.supplier}</p>
                    </div>
                  )}
                  {selectedEvent.client && (
                    <div>
                      <span className="font-medium">Cliente:</span>
                      <p className="text-sm">{selectedEvent.client}</p>
                    </div>
                  )}
                  {selectedEvent.daysSince && (
                    <div>
                      <span className="font-medium">Dias desde abastecimento:</span>
                      <p className="text-sm">{selectedEvent.daysSince} dias</p>
                    </div>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4 bg-transparent"
                  onClick={() => setSelectedEvent(null)}
                >
                  Fechar
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
