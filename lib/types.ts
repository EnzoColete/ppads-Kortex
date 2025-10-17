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
<<<<<<< HEAD
  description: string
  price: number
  unit: string
  type?: string // Optional type field for backward compatibility
=======
  type: "nitrogen" | "semen" | "other"
  description: string
  price: number
  unit: string
>>>>>>> 3969ce6e07b797e7bc94ebcb0efc8cecfcf4b892
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
<<<<<<< HEAD
  category: string
=======
  category: "alimentacao" | "combustivel" | "pedagio" | "fornecedor"
>>>>>>> 3969ce6e07b797e7bc94ebcb0efc8cecfcf4b892
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
<<<<<<< HEAD

export interface User {
  id: string
  email: string
  name: string
  role: "admin" | "technician" | "client"
  createdAt: Date
  updatedAt: Date
}

export interface ServiceOrder {
  id: string
  orderNumber: string
  clientId: string
  assignedTo?: string
  status: "pending" | "in_progress" | "completed" | "cancelled"
  title: string
  description?: string
  priority?: "low" | "medium" | "high" | "urgent"
  scheduledDate?: string
  completedDate?: string
  totalValue: number
  notes?: string
  items: ServiceOrderItem[]
  createdAt: Date
  updatedAt: Date
}

export interface ServiceOrderItem {
  id: string
  serviceOrderId: string
  productId?: string
  description: string
  quantity: number
  unitPrice: number
  total: number
  createdAt: Date
}
=======
>>>>>>> 3969ce6e07b797e7bc94ebcb0efc8cecfcf4b892
