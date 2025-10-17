"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
<<<<<<< HEAD
import { Download, FileText, Table, Users, Package } from "lucide-react"
import { supplierStorage, clientStorage, productStorage, receiptStorage, alertStorage } from "@/lib/storage"
import type { Supplier, Client, Product, Receipt, Alert } from "@/lib/types"
import { exportToExcel } from "@/lib/excel-export"

type ExportFormat = "excel" | "csv"
type ExportType = "suppliers" | "clients" | "products" | "receipts" | "alerts"
=======
import { Checkbox } from "@/components/ui/checkbox"
import { Download, FileText, Table, Users, Package } from "lucide-react"
import { supplierStorage, clientStorage, productStorage, receiptStorage, alertStorage } from "@/lib/storage"
import type { Supplier, Client, Product, Receipt, Alert } from "@/lib/types"

type ExportFormat = "pdf" | "excel" | "csv"
type ExportType = "suppliers" | "clients" | "products" | "receipts" | "alerts" | "all"
>>>>>>> 3969ce6e07b797e7bc94ebcb0efc8cecfcf4b892

export default function ExportPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [receipts, setReceipts] = useState<Receipt[]>([])
  const [alerts, setAlerts] = useState<Alert[]>([])
<<<<<<< HEAD
  const [loading, setLoading] = useState(true)

  const [exportType, setExportType] = useState<ExportType>("suppliers")
  const [exportFormat, setExportFormat] = useState<ExportFormat>("excel")
  const [isExporting, setIsExporting] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [suppliersData, clientsData, productsData, receiptsData, alertsData] = await Promise.all([
        supplierStorage.getAll(),
        clientStorage.getAll(),
        productStorage.getAll(),
        receiptStorage.getAll(),
        alertStorage.getAll(),
      ])

      setSuppliers(suppliersData)
      setClients(clientsData)
      setProducts(productsData)
      setReceipts(receiptsData)
      setAlerts(alertsData)
    } catch (error) {
      console.error("Erro ao carregar dados:", error)
    } finally {
      setLoading(false)
    }
=======

  const [exportType, setExportType] = useState<ExportType>("all")
  const [exportFormat, setExportFormat] = useState<ExportFormat>("csv")
  const [includeHeaders, setIncludeHeaders] = useState(true)
  const [isExporting, setIsExporting] = useState(false)

  useEffect(() => {
    setSuppliers(supplierStorage.getAll())
    setClients(clientStorage.getAll())
    setProducts(productStorage.getAll())
    setReceipts(receiptStorage.getAll())
    setAlerts(alertStorage.getAll())
  }, [])

  const exportToCSV = (data: any[], filename: string) => {
    if (data.length === 0) return

    const headers = Object.keys(data[0])
    const csvContent = [
      includeHeaders ? headers.join(",") : "",
      ...data.map((row) =>
        headers
          .map((header) => {
            const value = row[header]
            // Escapar aspas e vírgulas
            if (typeof value === "string" && (value.includes(",") || value.includes('"'))) {
              return `"${value.replace(/"/g, '""')}"`
            }
            return value
          })
          .join(","),
      ),
    ]
      .filter(Boolean)
      .join("\n")

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    link.href = URL.createObjectURL(blob)
    link.download = `${filename}.csv`
    link.click()
    URL.revokeObjectURL(link.href)
  }

  const exportToPDF = (data: any[], filename: string, title: string) => {
    // Simulação de exportação PDF
    const content = `
${title}
Gerado em: ${new Date().toLocaleString("pt-BR")}

${data
  .map((item, index) => {
    return `${index + 1}. ${Object.entries(item)
      .map(([key, value]) => `${key}: ${value}`)
      .join(" | ")}`
  })
  .join("\n")}

Total de registros: ${data.length}
    `

    const blob = new Blob([content], { type: "text/plain" })
    const link = document.createElement("a")
    link.href = URL.createObjectURL(blob)
    link.download = `${filename}.txt`
    link.click()
    URL.revokeObjectURL(link.href)
  }

  const exportToExcel = (data: any[], filename: string) => {
    // Simulação de exportação Excel (formato CSV com extensão .xls)
    exportToCSV(data, filename)
>>>>>>> 3969ce6e07b797e7bc94ebcb0efc8cecfcf4b892
  }

  const handleExport = async () => {
    setIsExporting(true)

    try {
      const timestamp = new Date().toISOString().split("T")[0]

      switch (exportType) {
        case "suppliers":
<<<<<<< HEAD
          exportToExcel({
            filename: `fornecedores-${timestamp}`,
            sheetName: "Fornecedores",
            columns: [
              { header: "Nome", key: "name", width: 30 },
              { header: "Email", key: "email", width: 30 },
              { header: "Telefone", key: "phone", width: 20 },
              { header: "CNPJ", key: "cnpj", width: 20 },
              { header: "Endereço", key: "address", width: 40 },
              { header: "Data Cadastro", key: "createdAt", width: 15 },
            ],
            data: suppliers.map((s) => ({
              name: s.name,
              email: s.email,
              phone: s.phone,
              cnpj: s.cnpj,
              address: s.address,
              createdAt: new Date(s.createdAt).toLocaleDateString("pt-BR"),
            })),
          })
          break

        case "clients":
          exportToExcel({
            filename: `clientes-${timestamp}`,
            sheetName: "Clientes",
            columns: [
              { header: "Nome", key: "name", width: 30 },
              { header: "Email", key: "email", width: 30 },
              { header: "Telefone", key: "phone", width: 20 },
              { header: "CPF/CNPJ", key: "cpfCnpj", width: 20 },
              { header: "Endereço", key: "address", width: 40 },
              { header: "Data Cadastro", key: "createdAt", width: 15 },
            ],
            data: clients.map((c) => ({
              name: c.name,
              email: c.email,
              phone: c.phone,
              cpfCnpj: c.cpfCnpj,
              address: c.address,
              createdAt: new Date(c.createdAt).toLocaleDateString("pt-BR"),
            })),
          })
          break

        case "products":
          exportToExcel({
            filename: `produtos-${timestamp}`,
            sheetName: "Produtos",
            columns: [
              { header: "Nome", key: "name", width: 30 },
              { header: "Descrição", key: "description", width: 40 },
              { header: "Preço", key: "price", width: 15 },
              { header: "Unidade", key: "unit", width: 15 },
              { header: "Tipo", key: "type", width: 20 },
              { header: "Data Cadastro", key: "createdAt", width: 15 },
            ],
            data: products.map((p) => ({
              name: p.name,
              description: p.description || "",
              price: `R$ ${p.price.toFixed(2)}`,
              unit: p.unit,
              type: p.type || "Geral",
              createdAt: new Date(p.createdAt).toLocaleDateString("pt-BR"),
            })),
          })
          break

        case "receipts":
          exportToExcel({
            filename: `recibos-${timestamp}`,
            sheetName: "Recibos",
            columns: [
              { header: "ID", key: "id", width: 15 },
              { header: "Tipo", key: "type", width: 15 },
              { header: "Cliente", key: "entityName", width: 30 },
              { header: "Total", key: "total", width: 15 },
              { header: "Possui NF", key: "hasInvoice", width: 12 },
              { header: "Observações", key: "observations", width: 40 },
              { header: "Data", key: "date", width: 15 },
            ],
            data: receipts.map((r) => {
              const entity = clients.find((c) => c.id === r.clientId)
              return {
                id: r.id.slice(0, 8),
                type: "Cliente",
                entityName: entity?.name || "N/A",
                total: `R$ ${r.total.toFixed(2)}`,
                hasInvoice: r.hasInvoice ? "Sim" : "Não",
                observations: r.observations || "",
                date: new Date(r.date).toLocaleDateString("pt-BR"),
              }
            }),
          })
          break

        case "alerts":
          exportToExcel({
            filename: `alertas-${timestamp}`,
            sheetName: "Alertas",
            columns: [
              { header: "Cliente", key: "clientName", width: 30 },
              { header: "Tipo", key: "type", width: 20 },
              { header: "Mensagem", key: "message", width: 50 },
              { header: "Status", key: "status", width: 15 },
              { header: "Data", key: "createdAt", width: 15 },
            ],
            data: alerts.map((a) => {
              const client = clients.find((c) => c.id === a.clientId)
              return {
                clientName: client?.name || "N/A",
                type: a.type.replace("days", " dias"),
                message: a.message,
                status: a.isRead ? "Lido" : "Não lido",
                createdAt: new Date(a.createdAt).toLocaleDateString("pt-BR"),
              }
            }),
          })
=======
          const suppliersData = suppliers.map((s) => ({
            Nome: s.name,
            Email: s.email,
            Telefone: s.phone,
            CNPJ: s.cnpj,
            Endereço: s.address,
            "Data Cadastro": new Date(s.createdAt).toLocaleDateString("pt-BR"),
          }))

          if (exportFormat === "csv") exportToCSV(suppliersData, `fornecedores-${timestamp}`)
          else if (exportFormat === "pdf")
            exportToPDF(suppliersData, `fornecedores-${timestamp}`, "RELATÓRIO DE FORNECEDORES")
          else exportToExcel(suppliersData, `fornecedores-${timestamp}`)
          break

        case "clients":
          const clientsData = clients.map((c) => ({
            Nome: c.name,
            Email: c.email,
            Telefone: c.phone,
            "CPF/CNPJ": c.cpfCnpj,
            Endereço: c.address,
            "Data Cadastro": new Date(c.createdAt).toLocaleDateString("pt-BR"),
          }))

          if (exportFormat === "csv") exportToCSV(clientsData, `clientes-${timestamp}`)
          else if (exportFormat === "pdf") exportToPDF(clientsData, `clientes-${timestamp}`, "RELATÓRIO DE CLIENTES")
          else exportToExcel(clientsData, `clientes-${timestamp}`)
          break

        case "products":
          const productsData = products.map((p) => ({
            Nome: p.name,
            Tipo: p.type === "nitrogen" ? "Nitrogênio" : p.type === "semen" ? "Sêmen" : "Outro",
            Descrição: p.description,
            Preço: `R$ ${p.price.toFixed(2)}`,
            Unidade: p.unit,
            "Data Cadastro": new Date(p.createdAt).toLocaleDateString("pt-BR"),
          }))

          if (exportFormat === "csv") exportToCSV(productsData, `produtos-${timestamp}`)
          else if (exportFormat === "pdf") exportToPDF(productsData, `produtos-${timestamp}`, "RELATÓRIO DE PRODUTOS")
          else exportToExcel(productsData, `produtos-${timestamp}`)
          break

        case "receipts":
          const receiptsData = receipts.map((r) => {
            const entity =
              r.type === "supplier"
                ? suppliers.find((s) => s.id === r.supplierId)
                : clients.find((c) => c.id === r.clientId)

            return {
              ID: r.id.slice(0, 8),
              Tipo: r.type === "supplier" ? "Fornecedor" : "Cliente",
              "Nome Entidade": entity?.name || "N/A",
              Total: `R$ ${r.total.toFixed(2)}`,
              "Possui NF": r.hasInvoice ? "Sim" : "Não",
              Observações: r.observations || "",
              "Data Emissão": new Date(r.createdAt).toLocaleDateString("pt-BR"),
            }
          })

          if (exportFormat === "csv") exportToCSV(receiptsData, `recibos-${timestamp}`)
          else if (exportFormat === "pdf") exportToPDF(receiptsData, `recibos-${timestamp}`, "RELATÓRIO DE RECIBOS")
          else exportToExcel(receiptsData, `recibos-${timestamp}`)
          break

        case "alerts":
          const alertsData = alerts.map((a) => {
            const client = clients.find((c) => c.id === a.clientId)
            return {
              Cliente: client?.name || "N/A",
              Tipo: a.type.replace("days", " dias"),
              Mensagem: a.message,
              Status: a.isRead ? "Lido" : "Não lido",
              "Data Criação": new Date(a.createdAt).toLocaleDateString("pt-BR"),
            }
          })

          if (exportFormat === "csv") exportToCSV(alertsData, `alertas-${timestamp}`)
          else if (exportFormat === "pdf") exportToPDF(alertsData, `alertas-${timestamp}`, "RELATÓRIO DE ALERTAS")
          else exportToExcel(alertsData, `alertas-${timestamp}`)
          break

        case "all":
          // Exportar todos os dados em um arquivo
          const allData = {
            fornecedores: suppliers.length,
            clientes: clients.length,
            produtos: products.length,
            recibos: receipts.length,
            alertas: alerts.length,
          }

          const summaryContent = `
RELATÓRIO COMPLETO DO SISTEMA
Gerado em: ${new Date().toLocaleString("pt-BR")}

RESUMO GERAL:
- Total de Fornecedores: ${suppliers.length}
- Total de Clientes: ${clients.length}
- Total de Produtos: ${products.length}
- Total de Recibos: ${receipts.length}
- Total de Alertas: ${alerts.length}

FORNECEDORES:
${suppliers.map((s, i) => `${i + 1}. ${s.name} - ${s.email} - ${s.phone}`).join("\n")}

CLIENTES:
${clients.map((c, i) => `${i + 1}. ${c.name} - ${c.email} - ${c.phone}`).join("\n")}

PRODUTOS:
${products.map((p, i) => `${i + 1}. ${p.name} - ${p.type} - R$ ${p.price.toFixed(2)}`).join("\n")}
          `

          const blob = new Blob([summaryContent], { type: "text/plain" })
          const link = document.createElement("a")
          link.href = URL.createObjectURL(blob)
          link.download = `relatorio-completo-${timestamp}.txt`
          link.click()
          URL.revokeObjectURL(link.href)
>>>>>>> 3969ce6e07b797e7bc94ebcb0efc8cecfcf4b892
          break
      }

      alert("Exportação concluída com sucesso!")
    } catch (error) {
<<<<<<< HEAD
      console.error("Erro ao exportar:", error)
=======
>>>>>>> 3969ce6e07b797e7bc94ebcb0efc8cecfcf4b892
      alert("Erro ao exportar dados. Tente novamente.")
    } finally {
      setIsExporting(false)
    }
  }

  const getDataCount = () => {
    switch (exportType) {
      case "suppliers":
        return suppliers.length
      case "clients":
        return clients.length
      case "products":
        return products.length
      case "receipts":
        return receipts.length
      case "alerts":
        return alerts.length
<<<<<<< HEAD
=======
      case "all":
        return suppliers.length + clients.length + products.length + receipts.length + alerts.length
>>>>>>> 3969ce6e07b797e7bc94ebcb0efc8cecfcf4b892
      default:
        return 0
    }
  }

<<<<<<< HEAD
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Carregando dados...</p>
        </div>
      </div>
    )
  }

=======
>>>>>>> 3969ce6e07b797e7bc94ebcb0efc8cecfcf4b892
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Exportar Dados</h1>
<<<<<<< HEAD
        <p className="text-gray-600 mt-2">Exporte seus dados em formato Excel</p>
=======
        <p className="text-gray-600 mt-2">Exporte seus dados em PDF, Excel ou CSV</p>
>>>>>>> 3969ce6e07b797e7bc94ebcb0efc8cecfcf4b892
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <Users className="h-8 w-8 text-blue-600 mx-auto mb-2" />
              <div className="text-2xl font-bold">{suppliers.length}</div>
              <p className="text-sm text-gray-600">Fornecedores</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <Users className="h-8 w-8 text-green-600 mx-auto mb-2" />
              <div className="text-2xl font-bold">{clients.length}</div>
              <p className="text-sm text-gray-600">Clientes</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <Package className="h-8 w-8 text-purple-600 mx-auto mb-2" />
              <div className="text-2xl font-bold">{products.length}</div>
              <p className="text-sm text-gray-600">Produtos</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <Table className="h-8 w-8 text-orange-600 mx-auto mb-2" />
              <div className="text-2xl font-bold">{receipts.length}</div>
              <p className="text-sm text-gray-600">Recibos</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <FileText className="h-8 w-8 text-red-600 mx-auto mb-2" />
              <div className="text-2xl font-bold">{alerts.length}</div>
              <p className="text-sm text-gray-600">Alertas</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Configurações de exportação */}
      <Card>
        <CardHeader>
          <CardTitle>Configurações de Exportação</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
<<<<<<< HEAD
          <div>
            <label className="block text-sm font-medium mb-2">Tipo de Dados</label>
            <Select value={exportType} onValueChange={(value: ExportType) => setExportType(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o tipo de dados" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="suppliers">Fornecedores ({suppliers.length})</SelectItem>
                <SelectItem value="clients">Clientes ({clients.length})</SelectItem>
                <SelectItem value="products">Produtos ({products.length})</SelectItem>
                <SelectItem value="receipts">Recibos ({receipts.length})</SelectItem>
                <SelectItem value="alerts">Alertas ({alerts.length})</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <h3 className="font-medium text-blue-900 mb-2">Resumo da Exportação:</h3>
            <p className="text-sm text-blue-800">
              Será exportado: <strong>{getDataCount()} registro(s)</strong> em formato <strong>Excel (.csv)</strong>
            </p>
            <p className="text-xs text-blue-600 mt-2">
              O arquivo será compatível com Microsoft Excel, Google Sheets e LibreOffice Calc
=======
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium mb-2">Tipo de Dados</label>
              <Select value={exportType} onValueChange={(value: ExportType) => setExportType(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo de dados" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="suppliers">Fornecedores ({suppliers.length})</SelectItem>
                  <SelectItem value="clients">Clientes ({clients.length})</SelectItem>
                  <SelectItem value="products">Produtos ({products.length})</SelectItem>
                  <SelectItem value="receipts">Recibos ({receipts.length})</SelectItem>
                  <SelectItem value="alerts">Alertas ({alerts.length})</SelectItem>
                  <SelectItem value="all">Todos os Dados (Resumo)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Formato</label>
              <Select value={exportFormat} onValueChange={(value: ExportFormat) => setExportFormat(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o formato" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="csv">CSV (Comma Separated Values)</SelectItem>
                  <SelectItem value="excel">Excel (XLS)</SelectItem>
                  <SelectItem value="pdf">PDF (Texto)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="includeHeaders"
              checked={includeHeaders}
              onCheckedChange={(checked) => setIncludeHeaders(checked as boolean)}
            />
            <label htmlFor="includeHeaders" className="text-sm">
              Incluir cabeçalhos (recomendado para CSV e Excel)
            </label>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-medium mb-2">Resumo da Exportação:</h3>
            <p className="text-sm text-gray-600">
              Será exportado: <strong>{getDataCount()} registro(s)</strong> no formato{" "}
              <strong>{exportFormat.toUpperCase()}</strong>
>>>>>>> 3969ce6e07b797e7bc94ebcb0efc8cecfcf4b892
            </p>
          </div>

          <Button onClick={handleExport} disabled={isExporting || getDataCount() === 0} className="w-full" size="lg">
            <Download className="h-4 w-4 mr-2" />
<<<<<<< HEAD
            {isExporting ? "Exportando..." : "Exportar para Excel"}
=======
            {isExporting ? "Exportando..." : "Exportar Dados"}
>>>>>>> 3969ce6e07b797e7bc94ebcb0efc8cecfcf4b892
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
