"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { X, Download } from "lucide-react"
import type { Receipt, Supplier, Client, Product } from "@/lib/types"

interface ReceiptViewProps {
  receipt: Receipt
  suppliers: Supplier[]
  clients: Client[]
  products: Product[]
  onClose: () => void
}

export function ReceiptView({ receipt, suppliers, clients, products, onClose }: ReceiptViewProps) {
  const formatCurrency = (value: number | undefined | null): string => {
    if (value === undefined || value === null || isNaN(value)) {
      return "0,00"
    }
    return value.toFixed(2)
  }

  const formatDate = (dateValue: any): string => {
    try {
      // Try to parse the date from various formats
      let date: Date

      if (!dateValue) {
        date = new Date()
      } else if (dateValue instanceof Date) {
        date = dateValue
      } else if (typeof dateValue === "string") {
        date = new Date(dateValue)
      } else {
        date = new Date()
      }

      // Check if date is valid
      if (isNaN(date.getTime())) {
        date = new Date()
      }

      return date.toLocaleDateString("pt-BR")
    } catch (error) {
      console.error("[v0] Error formatting date:", error)
      return new Date().toLocaleDateString("pt-BR")
    }
  }

  const getEntity = () => {
    if (receipt.type === "supplier" && receipt.supplierId) {
      return suppliers.find((s) => s.id === receipt.supplierId)
    }
    if (receipt.type === "client" && receipt.clientId) {
      return clients.find((c) => c.id === receipt.clientId)
    }
    return null
  }

  const getProduct = (productId: string) => {
    return products.find((p) => p.id === productId)
  }

  const entity = getEntity()

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <Card className="w-full max-w-2xl my-8">
        <CardHeader className="flex flex-row items-center justify-between print:hidden">
          <CardTitle>Visualizar Recibo</CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handlePrint}>
              <Download className="h-4 w-4 mr-1" />
              Imprimir
            </Button>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Cabeçalho do recibo */}
          <div className="text-center border-b pb-4">
            <h1 className="text-2xl font-bold">RECIBO</h1>
            <p className="text-gray-600">#{receipt.id}</p>
            <p className="text-sm text-gray-500">Emitido em: {formatDate(receipt.date || receipt.createdAt)}</p>
          </div>

          {/* Informações da entidade */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold">{receipt.type === "supplier" ? "Fornecedor" : "Cliente"}:</h3>
              <Badge variant={receipt.type === "supplier" ? "default" : "secondary"}>
                {receipt.type === "supplier" ? "Fornecedor" : "Cliente"}
              </Badge>
              {receipt.type === "client" && (
                <Badge variant={receipt.hasInvoice ? "default" : "destructive"}>
                  {receipt.hasInvoice ? "Com NF" : "Sem NF"}
                </Badge>
              )}
            </div>
            {entity && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="font-medium">{entity.name}</p>
                <p className="text-sm text-gray-600">{entity.email}</p>
                <p className="text-sm text-gray-600">{entity.phone}</p>
                <p className="text-sm text-gray-600">{entity.address}</p>
                <p className="text-sm text-gray-600">
                  {"cnpj" in entity ? `CNPJ: ${entity.cnpj}` : `CPF/CNPJ: ${entity.cpfCnpj}`}
                </p>
              </div>
            )}
          </div>

          {/* Produtos */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Produtos/Serviços:</h3>
            <div className="space-y-2">
              {(receipt.products || []).map((receiptProduct, index) => {
                const product = getProduct(receiptProduct.productId)
                return (
                  <div key={index} className="flex justify-between items-center border-b pb-2">
                    <div className="flex-1">
                      <p className="font-medium">{product?.name || "Produto não encontrado"}</p>
                      <p className="text-sm text-gray-600">
                        {receiptProduct.quantity || 0} x R$ {formatCurrency(receiptProduct.unitPrice)}
                        {product && ` (${product.unit})`}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">R$ {formatCurrency(receiptProduct.total)}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Total */}
          <div className="border-t pt-4">
            <div className="flex justify-between items-center text-xl font-bold">
              <span>Total:</span>
              <span>R$ {formatCurrency(receipt.total)}</span>
            </div>
          </div>

          {/* Observações */}
          {receipt.observations && (
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">Observações:</h3>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm">{receipt.observations}</p>
              </div>
            </div>
          )}

          {/* Rodapé */}
          <div className="text-center text-sm text-gray-500 border-t pt-4">
            <p>Este recibo foi gerado automaticamente pelo Sistema de Gestão</p>
            <p>Data de emissão: {formatDate(receipt.date || receipt.createdAt)}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
