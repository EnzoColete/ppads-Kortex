"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { X, Download, FileSpreadsheet } from "lucide-react"
import type { DailyExpense } from "@/lib/types"

interface ExpenseReportViewProps {
  expenses: DailyExpense[]
  startDate?: string
  endDate?: string
  onClose: () => void
}

const CATEGORY_SUMMARIES = [
  { key: "alimentacao", label: "Alimentação", badge: "secondary", bg: "bg-blue-50", text: "text-blue-600" },
  { key: "combustivel", label: "Combustível", badge: "default", bg: "bg-green-50", text: "text-green-600" },
  { key: "pedagio", label: "Pedágio", badge: "outline", bg: "bg-orange-50", text: "text-orange-600" },
  { key: "fornecedor", label: "Fornecedor", badge: "destructive", bg: "bg-purple-50", text: "text-purple-600" },
]

const normalizeCategory = (value?: string | null) =>
  (value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")

const formatCurrency = (value: number) => `R$ ${value.toFixed(2)}`

const formatDate = (value?: string | Date | null) => {
  if (!value) return "-"
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleDateString("pt-BR")
}

export function ExpenseReportView({ expenses, startDate, endDate, onClose }: ExpenseReportViewProps) {
  const handlePrint = () => {
    window.print()
  }

  const handleExportExcel = () => {
    const headers = ["Data", "Categoria", "Valor", "Fornecedor", "Observações"]
    const rows = expenses.map((expense) => [
      formatDate(expense.date),
      expense.category || "-",
      formatCurrency(Number(expense.amount) || 0),
      expense.supplierName || "-",
      expense.observations || "-",
    ])

    const csvContent = [headers, ...rows].map((row) => row.map((cell) => `"${cell}"`).join(",")).join("\n")

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)
    link.setAttribute("href", url)
    link.setAttribute("download", `relatorio-gastos-${new Date().toISOString().split("T")[0]}.csv`)
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const totalExpenses = expenses.reduce((sum, expense) => sum + (Number(expense.amount) || 0), 0)

  const categoryTotals = expenses.reduce((totals, expense) => {
    const key = normalizeCategory(expense.category)
    const amount = Number(expense.amount) || 0
    if (key && Object.prototype.hasOwnProperty.call(totals, key)) {
      totals[key] += amount
    }
    return totals
  }, CATEGORY_SUMMARIES.reduce((acc, category) => ({ ...acc, [category.key]: 0 }), {} as Record<string, number>))

  const periodText =
    startDate && endDate
      ? `${formatDate(startDate)} a ${formatDate(endDate)}`
      : "Todos os períodos"

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <Card className="w-full max-w-4xl my-8">
        <CardHeader className="flex flex-row items-center justify-between print:hidden">
          <CardTitle>Relatório de Gastos Diários</CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handlePrint}>
              <Download className="h-4 w-4 mr-1" />
              PDF
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportExcel}>
              <FileSpreadsheet className="h-4 w-4 mr-1" />
              Excel
            </Button>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center border-b pb-4">
            <h1 className="text-2xl font-bold">RELATÓRIO DE GASTOS DIÁRIOS</h1>
            <p className="text-gray-600">Período: {periodText}</p>
            <p className="text-sm text-gray-500">
              Gerado em: {new Date().toLocaleDateString("pt-BR")} às {new Date().toLocaleTimeString("pt-BR")}
            </p>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Resumo por Categoria</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {CATEGORY_SUMMARIES.map((category) => (
                <div key={category.key} className={`${category.bg} p-4 rounded-lg text-center`}>
                  <p className="text-sm text-gray-600">{category.label}</p>
                  <p className={`text-xl font-bold ${category.text}`}>{formatCurrency(categoryTotals[category.key])}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Detalhamento dos Gastos</h3>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-300">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="border border-gray-300 p-2 text-left">Data</th>
                    <th className="border border-gray-300 p-2 text-left">Categoria</th>
                    <th className="border border-gray-300 p-2 text-right">Valor</th>
                    <th className="border border-gray-300 p-2 text-left">Fornecedor</th>
                    <th className="border border-gray-300 p-2 text-left">Observações</th>
                  </tr>
                </thead>
                <tbody>
                  {expenses.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="border border-gray-300 p-4 text-center text-gray-500">
                        Nenhum gasto registrado para o período selecionado.
                      </td>
                    </tr>
                  ) : (
                    expenses.map((expense) => {
                      const normalized = normalizeCategory(expense.category)
                      const summary = CATEGORY_SUMMARIES.find((cat) => cat.key === normalized)
                      const amount = Number(expense.amount) || 0

                      return (
                        <tr key={expense.id}>
                          <td className="border border-gray-300 p-2">{formatDate(expense.date)}</td>
                          <td className="border border-gray-300 p-2">
                            <Badge variant={summary?.badge ?? "outline"}>{expense.category || "N/A"}</Badge>
                          </td>
                          <td className="border border-gray-300 p-2 text-right">{formatCurrency(amount)}</td>
                          <td className="border border-gray-300 p-2">{expense.supplierName || "-"}</td>
                          <td className="border border-gray-300 p-2">{expense.observations || "-"}</td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="border-t pt-4">
            <div className="flex justify-between items-center text-xl font-bold">
              <span>Total Geral:</span>
              <span>{formatCurrency(totalExpenses)}</span>
            </div>
            <div className="text-sm text-gray-600 mt-2">
              <p>Total de registros: {expenses.length}</p>
              <p>
                Média por registro:{" "}
                {expenses.length > 0 ? formatCurrency(totalExpenses / expenses.length) : formatCurrency(0)}
              </p>
            </div>
          </div>

          <div className="text-center text-sm text-gray-500 border-t pt-4">
            <p>Este relatório foi gerado automaticamente pelo Sistema de Gestão</p>
            <p>Relatório de Gastos Diários - {new Date().toLocaleString("pt-BR")}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
