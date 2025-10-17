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

export function ExpenseReportView({ expenses, startDate, endDate, onClose }: ExpenseReportViewProps) {
  const handlePrint = () => {
    window.print()
  }

  const handleExportExcel = () => {
    const headers = ["Data", "Categoria", "Valor", "Fornecedor", "Observações"]
    const rows = expenses.flatMap((expense) => {
      const expenseRows = []

      if (expense.food > 0) {
        expenseRows.push([
          new Date(expense.date).toLocaleDateString("pt-BR"),
          "Alimentação",
          `R$ ${expense.food.toFixed(2)}`,
          expense.supplierName || "-",
          expense.notes || "-",
        ])
      }

      if (expense.fuel > 0) {
        expenseRows.push([
          new Date(expense.date).toLocaleDateString("pt-BR"),
          "Combustível",
          `R$ ${expense.fuel.toFixed(2)}`,
          expense.supplierName || "-",
          expense.notes || "-",
        ])
      }

      if (expense.toll && expense.toll > 0) {
        expenseRows.push([
          new Date(expense.date).toLocaleDateString("pt-BR"),
          "Pedágio",
          `R$ ${expense.toll.toFixed(2)}`,
          expense.supplierName || "-",
          expense.notes || "-",
        ])
      }

      if (expense.supplier > 0) {
        expenseRows.push([
          new Date(expense.date).toLocaleDateString("pt-BR"),
          "Gasto com Fornecedor",
          `R$ ${expense.supplier.toFixed(2)}`,
          expense.supplierName || "-",
          expense.notes || "-",
        ])
      }

      return expenseRows
    })

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

  const totalExpenses = expenses.reduce(
    (sum, expense) => sum + expense.food + expense.fuel + (expense.toll || 0) + expense.supplier,
    0,
  )

  const categoryTotals = expenses.reduce(
    (totals, expense) => ({
      food: totals.food + expense.food,
      fuel: totals.fuel + expense.fuel,
      toll: totals.toll + (expense.toll || 0),
      supplier: totals.supplier + expense.supplier,
    }),
    { food: 0, fuel: 0, toll: 0, supplier: 0 },
  )

  const periodText =
    startDate && endDate
      ? `${new Date(startDate).toLocaleDateString("pt-BR")} a ${new Date(endDate).toLocaleDateString("pt-BR")}`
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
          {/* Cabeçalho do relatório */}
          <div className="text-center border-b pb-4">
            <h1 className="text-2xl font-bold">RELATÓRIO DE GASTOS DIÁRIOS</h1>
            <p className="text-gray-600">Período: {periodText}</p>
            <p className="text-sm text-gray-500">
              Gerado em: {new Date().toLocaleDateString("pt-BR")} às {new Date().toLocaleTimeString("pt-BR")}
            </p>
          </div>

          {/* Resumo por categoria */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Resumo por Categoria</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg text-center">
                <p className="text-sm text-gray-600">Alimentação</p>
                <p className="text-xl font-bold text-blue-600">R$ {categoryTotals.food.toFixed(2)}</p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg text-center">
                <p className="text-sm text-gray-600">Combustível</p>
                <p className="text-xl font-bold text-green-600">R$ {categoryTotals.fuel.toFixed(2)}</p>
              </div>
              <div className="bg-orange-50 p-4 rounded-lg text-center">
                <p className="text-sm text-gray-600">Pedágio</p>
                <p className="text-xl font-bold text-orange-600">R$ {categoryTotals.toll.toFixed(2)}</p>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg text-center">
                <p className="text-sm text-gray-600">Fornecedores</p>
                <p className="text-xl font-bold text-purple-600">R$ {categoryTotals.supplier.toFixed(2)}</p>
              </div>
            </div>
          </div>

          {/* Detalhamento dos gastos */}
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
                  {expenses.map((expense) => {
                    const rows = []

                    if (expense.food > 0) {
                      rows.push(
                        <tr key={`${expense.id}-food`}>
                          <td className="border border-gray-300 p-2">
                            {new Date(expense.date).toLocaleDateString("pt-BR")}
                          </td>
                          <td className="border border-gray-300 p-2">
                            <Badge variant="secondary">Alimentação</Badge>
                          </td>
                          <td className="border border-gray-300 p-2 text-right">R$ {expense.food.toFixed(2)}</td>
                          <td className="border border-gray-300 p-2">{expense.supplierName || "-"}</td>
                          <td className="border border-gray-300 p-2">{expense.notes || "-"}</td>
                        </tr>,
                      )
                    }

                    if (expense.fuel > 0) {
                      rows.push(
                        <tr key={`${expense.id}-fuel`}>
                          <td className="border border-gray-300 p-2">
                            {new Date(expense.date).toLocaleDateString("pt-BR")}
                          </td>
                          <td className="border border-gray-300 p-2">
                            <Badge variant="default">Combustível</Badge>
                          </td>
                          <td className="border border-gray-300 p-2 text-right">R$ {expense.fuel.toFixed(2)}</td>
                          <td className="border border-gray-300 p-2">{expense.supplierName || "-"}</td>
                          <td className="border border-gray-300 p-2">{expense.notes || "-"}</td>
                        </tr>,
                      )
                    }

                    if (expense.toll && expense.toll > 0) {
                      rows.push(
                        <tr key={`${expense.id}-toll`}>
                          <td className="border border-gray-300 p-2">
                            {new Date(expense.date).toLocaleDateString("pt-BR")}
                          </td>
                          <td className="border border-gray-300 p-2">
                            <Badge variant="outline">Pedágio</Badge>
                          </td>
                          <td className="border border-gray-300 p-2 text-right">R$ {expense.toll.toFixed(2)}</td>
                          <td className="border border-gray-300 p-2">{expense.supplierName || "-"}</td>
                          <td className="border border-gray-300 p-2">{expense.notes || "-"}</td>
                        </tr>,
                      )
                    }

                    if (expense.supplier > 0) {
                      rows.push(
                        <tr key={`${expense.id}-supplier`}>
                          <td className="border border-gray-300 p-2">
                            {new Date(expense.date).toLocaleDateString("pt-BR")}
                          </td>
                          <td className="border border-gray-300 p-2">
                            <Badge variant="destructive">Gasto com Fornecedor</Badge>
                          </td>
                          <td className="border border-gray-300 p-2 text-right">R$ {expense.supplier.toFixed(2)}</td>
                          <td className="border border-gray-300 p-2">{expense.supplierName || "-"}</td>
                          <td className="border border-gray-300 p-2">{expense.notes || "-"}</td>
                        </tr>,
                      )
                    }

                    return rows
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Total geral */}
          <div className="border-t pt-4">
            <div className="flex justify-between items-center text-xl font-bold">
              <span>Total Geral:</span>
              <span>R$ {totalExpenses.toFixed(2)}</span>
            </div>
            <div className="text-sm text-gray-600 mt-2">
              <p>Total de registros: {expenses.length}</p>
              <p>
                Média por registro: R$ {expenses.length > 0 ? (totalExpenses / expenses.length).toFixed(2) : "0.00"}
              </p>
            </div>
          </div>

          {/* Rodapé */}
          <div className="text-center text-sm text-gray-500 border-t pt-4">
            <p>Este relatório foi gerado automaticamente pelo Sistema de Gestão</p>
            <p>Relatório de Gastos Diários - {new Date().toLocaleString("pt-BR")}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
