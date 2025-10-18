"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Trash2, Plus, FileText, Calendar, Edit2, X } from "lucide-react"
import type { DailyExpense, Supplier } from "@/lib/types"
import { getSuppliers, getDailyExpenses, saveDailyExpense, deleteDailyExpense } from "@/lib/storage"
import { ExpenseReportView } from "@/components/expense-report-view"

const DEFAULT_CATEGORIES = ["Alimentação", "Combustível", "Pedágio", "Fornecedor", "Manutenção", "Hospedagem"]

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<DailyExpense[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [categories, setCategories] = useState<string[]>(DEFAULT_CATEGORIES)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [showReport, setShowReport] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterType, setFilterType] = useState<"all" | "today" | "week" | "month" | "custom">("all")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [loading, setLoading] = useState(true)
  const [showCategoryManager, setShowCategoryManager] = useState(false)
  const [newCategory, setNewCategory] = useState("")
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split("T")[0],
    category: "",
    amount: "",
    supplier: "",
    supplierName: "",
    notes: "",
  })

  useEffect(() => {
    const savedCategories = localStorage.getItem("expenseCategories")
    if (savedCategories) {
      setCategories(JSON.parse(savedCategories))
    }
  }, [])

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        const [expensesData, suppliersData] = await Promise.all([getDailyExpenses(), getSuppliers()])
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

  const handleAddCategory = () => {
    if (newCategory.trim() && !categories.includes(newCategory.trim())) {
      const updatedCategories = [...categories, newCategory.trim()]
      setCategories(updatedCategories)
      localStorage.setItem("expenseCategories", JSON.stringify(updatedCategories))
      setNewCategory("")
    }
  }

  const handleRemoveCategory = (category: string) => {
    if (DEFAULT_CATEGORIES.includes(category)) {
      alert("Não é possível remover categorias padrão")
      return
    }
    const updatedCategories = categories.filter((c) => c !== category)
    setCategories(updatedCategories)
    localStorage.setItem("expenseCategories", JSON.stringify(updatedCategories))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.category || !formData.amount || Number.parseFloat(formData.amount) <= 0) {
      alert("Por favor, preencha a categoria e o valor do gasto.")
      return
    }

    try {
      const selectedSupplier = formData.supplierName ? suppliers.find((s) => s.name === formData.supplierName) : null

      const expense: Omit<DailyExpense, "id" | "createdAt"> = {
        date: formData.date,
        category: formData.category,
        amount: Number.parseFloat(formData.amount),
        observations: formData.notes || undefined,
        supplierId: selectedSupplier?.id || undefined,
        supplierName: selectedSupplier?.name || undefined,
      }

      await saveDailyExpense(expense)

      const updatedExpenses = await getDailyExpenses()
      setExpenses(updatedExpenses || [])

      setFormData({
        date: new Date().toISOString().split("T")[0],
        category: "",
        amount: "",
        supplier: "",
        supplierName: "",
        notes: "",
      })
      setIsFormOpen(false)

      alert("Gasto salvo com sucesso!")
    } catch (error) {
      console.error("Erro ao salvar gasto:", error)
      alert(`Erro ao salvar gasto: ${error instanceof Error ? error.message : "Erro desconhecido"}`)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este gasto?")) return

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
      expense.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
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

  const expensesByCategory = filteredExpenses.reduce(
    (acc, expense) => {
      acc[expense.category] = (acc[expense.category] || 0) + expense.amount
      return acc
    },
    {} as Record<string, number>,
  )

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
          <Button variant="outline" onClick={() => setShowCategoryManager(true)}>
            <Edit2 className="h-4 w-4 mr-2" />
            Categorias
          </Button>
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
            <p className="text-sm text-gray-600">Média por Registro</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-purple-600">{Object.keys(expensesByCategory).length}</div>
            <p className="text-sm text-gray-600">Categorias Usadas</p>
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
                placeholder="Categoria, fornecedor ou observações..."
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

      {showCategoryManager && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Gerenciar Categorias</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setShowCategoryManager(false)}>
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Nova categoria..."
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleAddCategory()}
                />
                <Button onClick={handleAddCategory}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {categories.map((category) => (
                  <div key={category} className="flex items-center justify-between p-2 border rounded">
                    <span>{category}</span>
                    {!DEFAULT_CATEGORIES.includes(category) && (
                      <Button variant="ghost" size="sm" onClick={() => handleRemoveCategory(category)}>
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {isFormOpen && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Novo Registro de Gasto</CardTitle>
            <CardDescription>Preencha os dados do gasto</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="date">Data *</Label>
                  <Input
                    id="date"
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="category">Categoria *</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData({ ...formData, category: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="amount">Valor (R$) *</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    placeholder="0.00"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="supplierName">Fornecedor (Opcional)</Label>
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
                <Button type="submit">Salvar Gasto</Button>
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
        {filteredExpenses.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum registro encontrado</h3>
              <p className="text-gray-600">Comece adicionando um novo registro de gastos.</p>
            </CardContent>
          </Card>
        ) : (
          filteredExpenses.map((expense) => (
            <Card key={expense.id}>
              <CardContent className="p-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-4 mb-2">
                      <span className="font-semibold">{new Date(expense.date).toLocaleDateString("pt-BR")}</span>
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm">{expense.category}</span>
                    </div>
                    <div className="text-sm space-y-1">
                      <div>
                        <span className="text-gray-600">Valor:</span>
                        <span className="ml-2 font-bold text-lg">R$ {expense.amount.toFixed(2)}</span>
                      </div>
                      {expense.supplierName && (
                        <div>
                          <span className="text-gray-600">Fornecedor:</span>
                          <span className="ml-2 font-medium">{expense.supplierName}</span>
                        </div>
                      )}
                      {expense.observations && (
                        <div>
                          <span className="text-gray-600">Observações:</span>
                          <span className="ml-2">{expense.observations}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(expense.id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
