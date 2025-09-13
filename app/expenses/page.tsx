"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Trash2, Plus, FileText, Calendar } from "lucide-react"
import type { DailyExpense, Supplier } from "@/lib/types"
import { getSuppliers, getDailyExpenses, saveDailyExpense, deleteDailyExpense } from "@/lib/storage"
import { ExpenseReportView } from "@/components/expense-report-view"

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<DailyExpense[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [showReport, setShowReport] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterType, setFilterType] = useState<"all" | "today" | "week" | "month" | "custom">("all")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [loading, setLoading] = useState(true)
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split("T")[0],
    food: "",
    fuel: "",
    toll: "",
    supplier: "",
    supplierName: "",
    notes: "",
  })

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        console.log("=== LOADING INITIAL DATA ===")
        const [expensesData, suppliersData] = await Promise.all([getDailyExpenses(), getSuppliers()])
        console.log("Loaded expenses:", expensesData)
        console.log("Loaded suppliers:", suppliersData)
        setExpenses(expensesData || [])
        setSuppliers(suppliersData || [])
      } catch (error) {
        console.error("Erro ao carregar dados:", error)
        setExpenses([])
        setSuppliers([])
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const expenses: Array<Omit<DailyExpense, "id" | "createdAt">> = []
      const selectedSupplier = formData.supplierName ? suppliers.find((s) => s.name === formData.supplierName) : null

      // Criar gastos para cada categoria preenchida
      if (formData.food && Number.parseFloat(formData.food) > 0) {
        expenses.push({
          date: formData.date,
          category: "alimentacao",
          amount: Number.parseFloat(formData.food),
          observations: formData.notes || null,
          supplierId: selectedSupplier?.id || null,
        })
      }

      if (formData.fuel && Number.parseFloat(formData.fuel) > 0) {
        expenses.push({
          date: formData.date,
          category: "combustivel",
          amount: Number.parseFloat(formData.fuel),
          observations: formData.notes || null,
          supplierId: selectedSupplier?.id || null,
        })
      }

      if (formData.toll && Number.parseFloat(formData.toll) > 0) {
        expenses.push({
          date: formData.date,
          category: "pedagio",
          amount: Number.parseFloat(formData.toll),
          observations: formData.notes || null,
          supplierId: selectedSupplier?.id || null,
        })
      }

      if (formData.supplier && Number.parseFloat(formData.supplier) > 0) {
        expenses.push({
          date: formData.date,
          category: "fornecedor",
          amount: Number.parseFloat(formData.supplier),
          observations: formData.notes || null,
          supplierId: selectedSupplier?.id || null,
        })
      }

      if (expenses.length === 0) {
        alert("Por favor, preencha pelo menos um valor de gasto.")
        return
      }

      // Salvar todos os gastos
      let savedCount = 0
      for (const expense of expenses) {
        try {
          await saveDailyExpense(expense)
          savedCount++
        } catch (error) {
          console.error("Erro ao salvar gasto:", error)
          alert(`Erro ao salvar gasto: ${error instanceof Error ? error.message : "Erro desconhecido"}`)
          return
        }
      }

      // Recarregar dados e limpar formulário
      const updatedExpenses = await getDailyExpenses()
      setExpenses(updatedExpenses || [])

      setFormData({
        date: new Date().toISOString().split("T")[0],
        food: "",
        fuel: "",
        toll: "",
        supplier: "",
        supplierName: "",
        notes: "",
      })
      setIsFormOpen(false)

      alert(`${savedCount} gastos salvos com sucesso!`)
    } catch (error) {
      console.error("Erro geral:", error)
      alert(`Erro ao salvar gastos: ${error instanceof Error ? error.message : "Erro desconhecido"}`)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteDailyExpense(id)
      const updatedExpenses = await getDailyExpenses()
      setExpenses(updatedExpenses || [])
    } catch (error) {
      console.error("Erro ao deletar gasto:", error)
    }
  }

  const getDateRange = () => {
    const today = new Date()
    const todayStr = today.toISOString().split("T")[0]

    switch (filterType) {
      case "today":
        return { start: todayStr, end: todayStr }
      case "week":
        const weekStart = new Date(today)
        weekStart.setDate(today.getDate() - today.getDay())
        const weekEnd = new Date(weekStart)
        weekEnd.setDate(weekStart.getDate() + 6)
        return {
          start: weekStart.toISOString().split("T")[0],
          end: weekEnd.toISOString().split("T")[0],
        }
      case "month":
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
        const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0)
        return {
          start: monthStart.toISOString().split("T")[0],
          end: monthEnd.toISOString().split("T")[0],
        }
      case "custom":
        return { start: startDate, end: endDate }
      default:
        return { start: "", end: "" }
    }
  }

  const filteredExpenses = expenses.filter((expense) => {
    const matchesSearch =
      expense.supplierName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      expense.observations?.toLowerCase().includes(searchTerm.toLowerCase())

    const dateRange = getDateRange()
    let matchesDate = true

    if (dateRange.start && dateRange.end) {
      const expenseDate = expense.date
      matchesDate = expenseDate >= dateRange.start && expenseDate <= dateRange.end
    }

    return matchesSearch && matchesDate
  })

  const totalExpenses = filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0)

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex justify-center items-center h-64">
          <div className="text-lg">Carregando gastos...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gastos Diários</h1>
          <p className="text-gray-600">Registre e acompanhe seus gastos diários</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowReport(true)}>
            <FileText className="h-4 w-4 mr-2" />
            Relatório
          </Button>
          <Button onClick={() => setIsFormOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Gasto
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-600">R$ {totalExpenses.toFixed(2)}</div>
            <p className="text-sm text-gray-600">Total do Período</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">{filteredExpenses.length}</div>
            <p className="text-sm text-gray-600">Registros</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-orange-600">
              R$ {filteredExpenses.length > 0 ? (totalExpenses / filteredExpenses.length).toFixed(2) : "0.00"}
            </div>
            <p className="text-sm text-gray-600">Média Diária</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-purple-600">
              R${" "}
              {filteredExpenses
                .filter((e) => e.category === "combustivel")
                .reduce((sum, expense) => sum + expense.amount, 0)
                .toFixed(2)}
            </div>
            <p className="text-sm text-gray-600">Total Combustível</p>
          </CardContent>
        </Card>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="search">Buscar</Label>
              <Input
                id="search"
                placeholder="Fornecedor ou observações..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="period">Período</Label>
              <Select value={filterType} onValueChange={(value: any) => setFilterType(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o período" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os registros</SelectItem>
                  <SelectItem value="today">Hoje</SelectItem>
                  <SelectItem value="week">Esta semana</SelectItem>
                  <SelectItem value="month">Este mês</SelectItem>
                  <SelectItem value="custom">Período personalizado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {filterType === "custom" && (
              <>
                <div>
                  <Label htmlFor="startDate">Data Inicial</Label>
                  <Input id="startDate" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="endDate">Data Final</Label>
                  <Input id="endDate" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {isFormOpen && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Novo Registro de Gastos</CardTitle>
            <CardDescription>Preencha os gastos do dia</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="date">Data</Label>
                  <Input
                    id="date"
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="food">Alimentação (R$)</Label>
                  <Input
                    id="food"
                    type="number"
                    step="0.01"
                    value={formData.food}
                    onChange={(e) => setFormData({ ...formData, food: e.target.value })}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <Label htmlFor="fuel">Combustível (R$)</Label>
                  <Input
                    id="fuel"
                    type="number"
                    step="0.01"
                    value={formData.fuel}
                    onChange={(e) => setFormData({ ...formData, fuel: e.target.value })}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <Label htmlFor="toll">Pedágio (R$) - Opcional</Label>
                  <Input
                    id="toll"
                    type="number"
                    step="0.01"
                    value={formData.toll}
                    onChange={(e) => setFormData({ ...formData, toll: e.target.value })}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <Label htmlFor="supplier">Gasto com Fornecedor (R$)</Label>
                  <Input
                    id="supplier"
                    type="number"
                    step="0.01"
                    value={formData.supplier}
                    onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <Label htmlFor="supplierName">Nome do Fornecedor</Label>
                  <Select
                    value={formData.supplierName}
                    onValueChange={(value) => setFormData({ ...formData, supplierName: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um fornecedor" />
                    </SelectTrigger>
                    <SelectContent>
                      {suppliers.map((supplier) => (
                        <SelectItem key={supplier.id} value={supplier.name}>
                          {supplier.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label htmlFor="notes">Observações</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Observações adicionais..."
                  rows={3}
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit">Salvar Registro</Button>
                <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>
                  Cancelar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {showReport && (
        <ExpenseReportView
          expenses={filteredExpenses}
          startDate={getDateRange().start}
          endDate={getDateRange().end}
          onClose={() => setShowReport(false)}
        />
      )}

      <div className="space-y-4">
        {Object.entries(
          filteredExpenses.reduce(
            (acc, expense) => {
              const dateKey = expense.date
              if (!acc[dateKey]) {
                acc[dateKey] = []
              }
              acc[dateKey].push(expense)
              return acc
            },
            {} as Record<string, DailyExpense[]>,
          ),
        ).map(([date, dayExpenses]) => (
          <Card key={date}>
            <CardContent className="p-4">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-4 mb-2">
                    <span className="font-semibold">{new Date(date).toLocaleDateString("pt-BR")}</span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    {dayExpenses.map((expense) => (
                      <div key={expense.id}>
                        <span className="text-gray-600 capitalize">{expense.category}:</span>
                        <span className="ml-2 font-medium">R$ {expense.amount.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-2">
                    <span className="text-gray-600">Total do dia:</span>
                    <span className="ml-2 font-bold text-lg">
                      R$ {dayExpenses.reduce((sum, exp) => sum + exp.amount, 0).toFixed(2)}
                    </span>
                  </div>
                  {dayExpenses[0]?.observations && (
                    <div className="mt-2 text-sm text-gray-600">
                      <span className="font-medium">Observações:</span> {dayExpenses[0].observations}
                    </div>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => dayExpenses.forEach((exp) => handleDelete(exp.id))}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredExpenses.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum registro encontrado</h3>
            <p className="text-gray-600">Comece adicionando um novo registro de gastos.</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
