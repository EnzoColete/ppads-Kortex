export interface Supplier {
  id: string
  name: string
  email: string
  phone: string
  address: string
  cnpj: string
  createdAt: Date
  updatedAt: Date
}

export interface Client {
  id: string
  name: string
  email: string
  phone: string
  address: string
  cpfCnpj: string
  createdAt: Date
  updatedAt: Date
}

export interface Product {
  id: string
  name: string
  type: "nitrogen" | "semen" | "other"
  description: string
  price: number
  unit: string
  createdAt: Date
  updatedAt: Date
}

export interface Receipt {
  id: string
  type: "supplier" | "client"
  supplierId?: string
  clientId?: string
  entityName?: string
  description?: string
  date: string
  products: ReceiptProduct[]
  total: number
  hasInvoice?: boolean // Para recibos de cliente
  observations?: string
  createdAt: Date
  updatedAt: Date
}

export interface ReceiptProduct {
  productId: string
  quantity: number
  unitPrice: number
  total: number
}

export interface Alert {
  id: string
  clientId: string
  type: "30days" | "40days" | "50days" | "60days"
  message: string
  isRead: boolean
  createdAt: Date
}

export interface Report {
  id: string
  type: "daily" | "weekly" | "monthly" | "custom"
  startDate: Date
  endDate: Date
  data: any
  createdAt: Date
}

export interface DailyExpense {
  id: string
  date: string
  category: "alimentacao" | "combustivel" | "pedagio" | "fornecedor"
  amount: number
  observations?: string
  supplierId?: string
  supplierName?: string
  createdAt?: string
}

export interface CalendarEvent {
  id: string
  date: string
  type: "fuel" | "expense" | "receipt"
  title: string
  description?: string
  value?: number
  supplier?: string
  client?: string
  daysSince?: number
  alertLevel?: "green" | "yellow" | "orange" | "red"
}
