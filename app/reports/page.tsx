"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"
import { CalendarIcon, Download, FileText, TrendingUp, Users, Package } from "lucide-react"
// Simplificando importações do date-fns para evitar erros
import { receiptStorage, supplierStorage, clientStorage, productStorage } from "@/lib/storage"
import type { Receipt, Supplier, Client, Product } from "@/lib/types"
import { ReportChart } from "@/components/report-chart"

type ReportPeriod = "daily" | "weekly" | "monthly" | "custom"

interface ReportData {
  totalReceipts: number
  totalRevenue: number
  supplierReceipts: number
  clientReceipts: number
  topProducts: Array<{ name: string; quantity: number; revenue: number }>
  revenueByDay: Array<{ date: string; revenue: number }>
  receiptsByType: Array<{ type: string; count: number }>
}

// Funções auxiliares para datas sem dependências externas
function formatDate(date: Date): string {
  return date.toLocaleDateString("pt-BR")
}

function getStartOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

function getEndOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59)
}

function getStartOfWeek(date: Date): Date {
  const day = date.getDay()
  const diff = date.getDate() - day
  return new Date(date.setDate(diff))
}

function getEndOfWeek(date: Date): Date {
  const day = date.getDay()
  const diff = date.getDate() - day + 6
  return new Date(date.setDate(diff))
}

function getStartOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function getEndOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59)
}

export default function ReportsPage() {
  const [receipts, setReceipts] = useState<Receipt[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [period, setPeriod] = useState<ReportPeriod>("monthly")
  const [startDate, setStartDate] = useState<Date>(getStartOfMonth(new Date()))
  const [endDate, setEndDate] = useState<Date>(getEndOfMonth(new Date()))
  const [reportData, setReportData] = useState<ReportData | null>(null)
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

  useEffect(() => {
    generateReport()
  }, [receipts, period, startDate, endDate])

  const handlePeriodChange = (newPeriod: ReportPeriod) => {
    setPeriod(newPeriod)
    const now = new Date()

    switch (newPeriod) {
      case "daily":
        setStartDate(getStartOfDay(now))
        setEndDate(getEndOfDay(now))
        break
      case "weekly":
        setStartDate(getStartOfWeek(new Date(now)))
        setEndDate(getEndOfWeek(new Date(now)))
        break
      case "monthly":
        setStartDate(getStartOfMonth(now))
        setEndDate(getEndOfMonth(now))
        break
      case "custom":
        // Manter datas atuais para custom
        break
    }
  }

  const generateReport = () => {
    const filteredReceipts = receipts.filter((receipt) => {
      const receiptDate = new Date(receipt.createdAt)
      return receiptDate >= startDate && receiptDate <= endDate
    })

    const totalReceipts = filteredReceipts.length
    const totalRevenue = filteredReceipts.reduce((sum, receipt) => sum + receipt.total, 0)
    const supplierReceipts = filteredReceipts.filter((r) => r.type === "supplier").length
    const clientReceipts = filteredReceipts.filter((r) => r.type === "client").length

    // Top produtos
    const productStats = new Map<string, { quantity: number; revenue: number }>()
    filteredReceipts.forEach((receipt) => {
      receipt.products.forEach((receiptProduct) => {
        const current = productStats.get(receiptProduct.productId) || { quantity: 0, revenue: 0 }
        productStats.set(receiptProduct.productId, {
          quantity: current.quantity + receiptProduct.quantity,
          revenue: current.revenue + receiptProduct.total,
        })
      })
    })

    const topProducts = Array.from(productStats.entries())
      .map(([productId, stats]) => {
        const product = products.find((p) => p.id === productId)
        return {
          name: product?.name || "Produto não encontrado",
          quantity: stats.quantity,
          revenue: stats.revenue,
        }
      })
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5)

    // Receita por dia
    const revenueByDay = new Map<string, number>()
    filteredReceipts.forEach((receipt) => {
      const dateKey = new Date(receipt.createdAt).toISOString().split("T")[0]
      revenueByDay.set(dateKey, (revenueByDay.get(dateKey) || 0) + receipt.total)
    })

    const revenueByDayArray = Array.from(revenueByDay.entries())
      .map(([date, revenue]) => ({ date, revenue }))
      .sort((a, b) => a.date.localeCompare(b.date))

    // Recibos por tipo
    const receiptsByType = [
      { type: "Fornecedores", count: supplierReceipts },
      { type: "Clientes", count: clientReceipts },
    ]

    setReportData({
      totalReceipts,
      totalRevenue,
      supplierReceipts,
      clientReceipts,
      topProducts,
      revenueByDay: revenueByDayArray,
      receiptsByType,
    })
  }

  const exportReport = () => {
    if (!reportData) return

    const reportContent = `
RELATÓRIO DE GESTÃO
Período: ${formatDate(startDate)} - ${formatDate(endDate)}

RESUMO GERAL:
- Total de Recibos: ${reportData.totalReceipts}
- Receita Total: R$ ${reportData.totalRevenue.toFixed(2)}
- Recibos de Fornecedores: ${reportData.supplierReceipts}
- Recibos de Clientes: ${reportData.clientReceipts}

TOP PRODUTOS:
${reportData.topProducts.map((p, i) => `${i + 1}. ${p.name} - Qtd: ${p.quantity} - Receita: R$ ${p.revenue.toFixed(2)}`).join("\n")}

RECEITA POR DIA:
${reportData.revenueByDay.map((d) => `${formatDate(new Date(d.date))}: R$ ${d.revenue.toFixed(2)}`).join("\n")}
    `

    const blob = new Blob([reportContent], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `relatorio-${startDate.toISOString().split("T")[0]}-${endDate.toISOString().split("T")[0]}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return <div className="flex justify-center items-center h-64">Carregando dados para relatório...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Relatórios</h1>
          <p className="text-gray-600 mt-2">Análise de dados por período</p>
        </div>
        <Button onClick={exportReport} disabled={!reportData} className="flex items-center gap-2">
          <Download className="h-4 w-4" />
          Exportar Relatório
        </Button>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros de Período</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="period">Período</Label>
              <Select value={period} onValueChange={handlePeriodChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o período" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Diário</SelectItem>
                  <SelectItem value="weekly">Semanal</SelectItem>
                  <SelectItem value="monthly">Mensal</SelectItem>
                  <SelectItem value="custom">Personalizado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Data Inicial</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal bg-transparent">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formatDate(startDate)}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={(date) => date && setStartDate(date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div>
              <Label>Data Final</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal bg-transparent">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formatDate(endDate)}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={(date) => date && setEndDate(date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="flex items-end">
              <Button onClick={generateReport} className="w-full">
                <FileText className="mr-2 h-4 w-4" />
                Gerar Relatório
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {reportData && (
        <>
          {/* Cards de resumo */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total de Recibos</p>
                    <p className="text-2xl font-bold">{reportData.totalReceipts}</p>
                  </div>
                  <FileText className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Receita Total</p>
                    <p className="text-2xl font-bold">R$ {reportData.totalRevenue.toFixed(2)}</p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Recibos Fornecedores</p>
                    <p className="text-2xl font-bold">{reportData.supplierReceipts}</p>
                  </div>
                  <Users className="h-8 w-8 text-purple-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Recibos Clientes</p>
                    <p className="text-2xl font-bold">{reportData.clientReceipts}</p>
                  </div>
                  <Users className="h-8 w-8 text-orange-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Gráficos */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Receita por Dia</CardTitle>
              </CardHeader>
              <CardContent>
                <ReportChart data={reportData.revenueByDay} type="line" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recibos por Tipo</CardTitle>
              </CardHeader>
              <CardContent>
                <ReportChart data={reportData.receiptsByType} type="pie" />
              </CardContent>
            </Card>
          </div>

          {/* Top produtos */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Top 5 Produtos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {reportData.topProducts.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">Nenhum produto vendido no período</p>
                ) : (
                  reportData.topProducts.map((product, index) => (
                    <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Badge variant="outline">{index + 1}º</Badge>
                        <div>
                          <p className="font-medium">{product.name}</p>
                          <p className="text-sm text-gray-600">Quantidade: {product.quantity}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-green-600">R$ {product.revenue.toFixed(2)}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
