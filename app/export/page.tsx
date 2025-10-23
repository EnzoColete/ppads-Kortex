"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Download, Table, Users, Package } from "lucide-react"
import { supplierStorage, clientStorage, productStorage, receiptStorage } from "@/lib/storage"
import type { Supplier, Client, Product, Receipt } from "@/lib/types"
import { exportToExcel } from "@/lib/excel-export"

type ExportType = "suppliers" | "clients" | "products" | "receipts"

export default function ExportPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [receipts, setReceipts] = useState<Receipt[]>([])
  const [loading, setLoading] = useState(true)

  const [exportType, setExportType] = useState<ExportType>("suppliers")
  const [isExporting, setIsExporting] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [suppliersData, clientsData, productsData, receiptsData] = await Promise.all([
        supplierStorage.getAll(),
        clientStorage.getAll(),
        productStorage.getAll(),
        receiptStorage.getAll(),
      ])

      setSuppliers(suppliersData)
      setClients(clientsData)
      setProducts(productsData)
      setReceipts(receiptsData)
    } catch (error) {
      console.error("Erro ao carregar dados:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleExport = async () => {
    setIsExporting(true)

    try {
      const timestamp = new Date().toISOString().split("T")[0]

      switch (exportType) {
        case "suppliers":
          exportToExcel({
            filename: `fornecedores-${timestamp}`,
            sheetName: "Fornecedores",
            columns: [
              { header: "Nome", key: "name", width: 30 },
              { header: "Email", key: "email", width: 30 },
              { header: "Telefone", key: "phone", width: 20 },
              { header: "CNPJ", key: "cnpj", width: 20 },
              { header: "Endere�o", key: "address", width: 40 },
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
              { header: "Endere�o", key: "address", width: 40 },
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
              { header: "Descri��o", key: "description", width: 40 },
              { header: "Pre�o", key: "price", width: 15 },
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
              { header: "Cliente/Fornecedor", key: "entityName", width: 30 },
              { header: "Total", key: "total", width: 15 },
              { header: "Data", key: "date", width: 15 },
            ],
            data: receipts.map((r) => ({
              id: r.id.slice(0, 8),
              type: r.type === "supplier" ? "Fornecedor" : "Cliente",
              entityName: r.entityName || "N/A",
              total: `R$ ${r.total.toFixed(2)}`,
              date: new Date(r.date).toLocaleDateString("pt-BR"),
            })),
          })
          break
      }

      alert("Exporta��o conclu�da com sucesso!")
    } catch (error) {
      console.error("Erro ao exportar:", error)
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
      default:
        return 0
    }
  }

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Exportar Dados</h1>
        <p className="text-gray-600 mt-2">Exporte seus dados em formato Excel</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Configura��es de Exporta��o</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
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
              </SelectContent>
            </Select>
          </div>

          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <h3 className="font-medium text-blue-900 mb-2">Resumo da Exporta��o:</h3>
            <p className="text-sm text-blue-800">
              Ser� exportado: <strong>{getDataCount()} registro(s)</strong> em formato <strong>Excel (.csv)</strong>
            </p>
            <p className="text-xs text-blue-600 mt-2">
              O arquivo ser� compat�vel com Microsoft Excel, Google Sheets e LibreOffice Calc
            </p>
          </div>

          <Button onClick={handleExport} disabled={isExporting || getDataCount() === 0} className="w-full" size="lg">
            <Download className="h-4 w-4 mr-2" />
            {isExporting ? "Exportando..." : "Exportar para Excel"}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
