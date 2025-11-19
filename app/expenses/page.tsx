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
import { useOwnerDirectory } from "@/hooks/use-owner-directory"
import { showErrorToast, showSuccessToast, showWarningToast } from "@/lib/toast"

const DEFAULT_CATEGORIES = ["Alimentação", "Combustível", "Pedágio", "Fornecedor"]

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

  const { isAdmin, getOwnerLabel, owners } = useOwnerDirectory()
  const [ownerFilter, setOwnerFilter] = useState("all")

  // Auxiliar tradicional para moeda
  const formatBRL = (n: number) =>
    n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2 })

  useEffect(() => {
    const savedCategories = typeof window !== "undefined" ? localStorage.getItem("expenseCategories") : null
    if (savedCategories) {
      try {
        setCategories(JSON.parse(savedCategories))
      } catch {
        // se der erro, mantém as categorias padrão
      }
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
        showErrorToast("Erro ao carregar despesas do dia.")
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  useEffect(() => {
    if (!isAdmin) {
      setOwnerFilter("all")
    }
  }, [isAdmin])

  const handleAddCategory = () => {
    const value = newCategory.trim()
    if (value && !categories.includes(value)) {
      const updated = [...categories, value]
      setCategories(updated)
      if (typeof window !== "undefined") {
        localStorage.setItem("expenseCategories", JSON.stringify(updated))
      }
      setNewCategory("")
    }
  }

  const handleRemoveCategory = (category: string) => {
    if (DEFAULT_CATEGORIES.includes(category)) {
      showWarningToast("Não é possível remover categorias padrão.")
      return
    }
    const updated = categories.filter((c) => c !== category)
    setCategories(updated)
    if (typeof window !== "undefined") {
      localStorage.setItem("expenseCategories", JSON.stringify(updated))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.category || !formData.amount || Number.parseFloat(formData.amount) <= 0) {
      showWarningToast("Informe categoria e valor do gasto.")
      return
    }

    try {
      const selectedSupplier = formData.supplierName
        ? suppliers.find((s) => s.name === formData.supplierName)
        : null

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

      showSuccessToast("Gasto salvo com sucesso.")
    } catch (error) {
      console.error("Erro ao salvar gasto:", error)
      showErrorToast(`Erro ao salvar gasto: ${error instanceof Error ? error.message : "Erro desconhecido"}`)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteDailyExpense(id)
      const updatedExpenses = await getDailyExpenses()
      setExpenses(updatedExpenses || [])
      showSuccessToast("Gasto excluído com sucesso.")
    } catch (error) {
      console.error("Erro ao deletar gasto:", error)
      showErrorToast("Erro ao excluir gasto diário.")
    }
  }

  const getDateRange = () => {
    const today = new Date()
    const todayStr = today.toISOString().split("T")[0]

    switch (filterType) {
      case "today": {
        return { start: todayStr, end: todayStr }
      }
      case "week": {
        const weekStart = new Date(today)
        // domingo como início da semana: tradição simples
        weekStart.setDate(today.getDate() - today.getDay())
        const weekEnd = new Date(weekStart)
        weekEnd.setDate(weekStart.getDate() + 6)
        return {
          start: weekStart.toISOString().split("T")[0],
          end: weekEnd.toISOString().split("T")[0],
        }
      }
      case "month": {
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
        const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0)
        return {
          start: monthStart.toISOString().split("T")[0],
          end: monthEnd.toISOString().split("T")[0],
        }
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

    const matchesOwner = !isAdmin || ownerFilter === "all" || expense.userId === ownerFilter

    return matchesSearch && matchesDate && matchesOwner
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

  const dateRange = getDateRange()

  return (
    <div className="p-6">
      {/* Cabeçalho */}
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

      {/* Filtros simples */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-3 items-start md:items-end">
            <div className="flex-1">
              <Label htmlFor="search">Busca</Label>
              <Input
                id="search"
                placeholder="Categoria, fornecedor ou observações"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="w-full md:w-56">
              <Label>Período</Label>
              <Select
                value={filterType}
                onValueChange={(v) => setFilterType(v as typeof filterType)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Período" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="today">Hoje</SelectItem>
                  <SelectItem value="week">Esta semana</SelectItem>
                  <SelectItem value="month">Este mês</SelectItem>
                  <SelectItem value="custom">Personalizado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {filterType === "custom" && (
              <>
                <div>
                  <Label htmlFor="startDate">Início</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="endDate">Fim</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </>
            )}
            {isAdmin && (
              <div className="w-full md:w-60">
                <Label>Usuário</Label>
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
          </div>
        </CardContent>
      </Card>

      {/* Estatísticas resumidas, sem firulas */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-gray-900">{formatBRL(totalExpenses)}</div>
            <p className="text-sm text-gray-600">Total no período</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-orange-600">
              {filteredExpenses.length > 0
                ? formatBRL(totalExpenses / filteredExpenses.length)
                : formatBRL(0)}
            </div>
            <p className="text-sm text-gray-600">Média por registro</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-purple-600">
              {Object.keys(expensesByCategory).length}
            </div>
            <p className="text-sm text-gray-600">Categorias usadas</p>
          </CardContent>
        </Card>
      </div>

      {/* Lista de registros */}
      <p className="text-sm text-gray-600 mb-2">Registros</p>

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
                      <span className="font-semibold">
                        {new Date(expense.date).toLocaleDateString("pt-BR")}
                      </span>
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm">
                        {expense.category}
                      </span>
                    </div>
                    <div className="text-sm space-y-1">
                      <div>
                        <span className="text-gray-600">Valor:</span>
                        <span className="ml-2 font-bold text-lg">
                          {formatBRL(expense.amount)}
                        </span>
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
                      {isAdmin && (
                        <p className="text-xs text-gray-500">
                          Criado por: {getOwnerLabel(expense.userId) ?? "Desconhecido"}
                        </p>
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

      {/* Formulário de novo gasto (simples e direto) */}
      {isFormOpen && (
        <Card className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <Card className="w-full max-w-xl">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Novo Gasto</CardTitle>
                <CardDescription>Cadastre um novo lançamento</CardDescription>
              </div>
              <Button variant="ghost" onClick={() => setIsFormOpen(false)} aria-label="Fechar">
                <X className="h-5 w-5" />
              </Button>
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
                    />
                  </div>

                  <div>
                    <Label>Categoria</Label>
                    <Select
                      value={formData.category}
                      onValueChange={(v) => setFormData({ ...formData, category: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((cat) => (
                          <SelectItem key={cat} value={cat}>
                            {cat}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="amount">Valor</Label>
                    <Input
                      id="amount"
                      type="number"
                      step="0.01"
                      inputMode="decimal"
                      placeholder="0,00"
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    />
                  </div>

                  <div>
                    <Label>Fornecedor</Label>
                    <Select
                      value={formData.supplierName}
                      onValueChange={(v) => setFormData({ ...formData, supplierName: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Opcional" />
                      </SelectTrigger>
                      <SelectContent>
                        {suppliers.map((s) => (
                          <SelectItem key={s.id} value={s.name}>
                            {s.name}
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
                    value={formData.notes ?? ""}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Observações adicionais..."
                    rows={3}
                  />
                </div>

                <div className="flex gap-2 justify-end">
                  <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit">Salvar Gasto</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </Card>
      )}

      {/* Gerenciador de categorias (simples) */}
      {showCategoryManager && (
        <Card className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <Card className="w-full max-w-lg">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Categorias</CardTitle>
              <Button variant="ghost" onClick={() => setShowCategoryManager(false)} aria-label="Fechar">
                <X className="h-5 w-5" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Nova categoria"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault()
                      handleAddCategory()
                    }
                  }}
                />
                <Button onClick={handleAddCategory}>
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar
                </Button>
              </div>

              <div className="space-y-2 max-h-64 overflow-auto">
                {categories.map((cat) => (
                  <div key={cat} className="flex items-center justify-between border rounded px-3 py-2">
                    <span>{cat}</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRemoveCategory(cat)}
                      disabled={DEFAULT_CATEGORIES.includes(cat)}
                    >
                      Remover
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </Card>
      )}

      {/* Relatório */}
      {showReport && (
        <ExpenseReportView
          expenses={filteredExpenses}
          startDate={dateRange.start}
          endDate={dateRange.end}
          onClose={() => setShowReport(false)}
        />
      )}
    </div>
  )
}


