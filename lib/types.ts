export interface OwnerInfo {
  id: string
  fullName?: string
  email?: string
}

export interface Supplier {
  id: string
  name: string
  email: string
  phone: string
  address: string
  cnpj: string
  createdAt: Date
  updatedAt: Date
  userId?: string
  owner?: OwnerInfo
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
  userId?: string
  owner?: OwnerInfo
}

export interface Product {
  id: string
  name: string
  description: string
  price: number
  unit: string
  /**
   * Optional product type. When present it should be one of the predefined values,
   * but we keep it as string to maintain backward compatibility with existing data.
   */
  type?: "nitrogen" | "semen" | "other" | string
  createdAt: Date
  updatedAt: Date
  userId?: string
  owner?: OwnerInfo
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
  hasInvoice?: boolean
  observations?: string
  createdAt: Date
  updatedAt: Date
  userId?: string
  owner?: OwnerInfo
}

export interface ReceiptProduct {
  productId: string
  quantity: number
  unitPrice: number
  total: number
}

export interface DailyExpense {
  id: string
  date: string
  category: string
  amount: number
  observations?: string
  supplierId?: string
  supplierName?: string
  createdAt?: string
  userId?: string
  owner?: OwnerInfo
}

export interface User {
  id: string
  email: string
  fullName: string
  role: "ADMIN" | "USER"
  emailVerified: boolean
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
  userId?: string
  owner?: OwnerInfo
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
