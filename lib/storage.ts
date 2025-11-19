import type {
  Supplier,
  Client,
  Product,
  Receipt,
  Alert,
  DailyExpense,
  ReceiptProduct,
  Report,
  CalendarEvent,
  ServiceOrder,
  ServiceOrderItem,
  PaginatedResult,
  PaginationMeta,
} from "./types"
import { supabase } from "./supabase/client"
import { logger } from "./logger"


const apiFetch = (input: RequestInfo | URL, init?: RequestInit) => {
  return fetch(input, { credentials: "include", ...init })
}

type ListRequestParams = {
  page?: number
  pageSize?: number
  search?: string
  ownerId?: string
}

const buildQueryString = (params: Record<string, string | number | undefined>) => {
  const searchParams = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return
    searchParams.append(key, String(value))
  })

  const query = searchParams.toString()
  return query.length ? `?${query}` : ""
}

const parsePaginationMeta = (payload: any): PaginationMeta => {
  const fallbackSize = Array.isArray(payload?.data) ? payload.data.length : 0
  return {
    page: Number(payload?.meta?.page ?? 1),
    pageSize: Number(payload?.meta?.pageSize ?? fallbackSize),
    total: Number(payload?.meta?.total ?? fallbackSize),
  }
}

const mapClientToDb = (client: any) => {
  const { cpfCnpj, ...rest } = client
  return {
    ...rest,
    cpf_cnpj: cpfCnpj,
  }
}

const mapClientFromDb = (client: any) => {
  const { cpf_cnpj, user_id, userId, owner, ...rest } = client
  return {
    ...rest,
    cpfCnpj: cpf_cnpj,
    userId: userId ?? user_id ?? "",
    owner,
  }
}

const DAILY_EXPENSE_CATEGORY_LABELS: Record<string, string> = {
  alimentacao: "Alimentação",
  combustivel: "Combustível",
  pedagio: "Pedágio",
  fornecedor: "Fornecedor",
}

const normalizeDailyExpenseCategory = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .trim()

const mapDailyExpenseCategoryForDb = (value: string) => {
  const slug = normalizeDailyExpenseCategory(value)
  if (!DAILY_EXPENSE_CATEGORY_LABELS[slug]) {
    const allowed = Object.values(DAILY_EXPENSE_CATEGORY_LABELS).join(", ")
    throw new Error(`Categoria '${value}' não é aceita. Utilize uma das opções: ${allowed}.`)
  }
  return slug
}

const mapDailyExpenseCategoryForDisplay = (value: string) => DAILY_EXPENSE_CATEGORY_LABELS[value] ?? value

const mapProductFromApi = (product: any): Product => ({
  id: product.id,
  name: product.name,
  description: product.description ?? "",
  price: typeof product.price === "number" ? product.price : Number(product.price ?? 0),
  unit: product.unit ?? "",
  type: product.type ?? undefined,
  userId: product.userId ?? product.user_id ?? "",
  owner: product.owner,
  createdAt: product.createdAt ? new Date(product.createdAt) : product.created_at ? new Date(product.created_at) : new Date(),
  updatedAt: product.updatedAt ? new Date(product.updatedAt) : product.updated_at ? new Date(product.updated_at) : new Date(),
})

// Suppliers
const listSuppliers = async (options: ListRequestParams = {}): Promise<PaginatedResult<Supplier>> => {
  try {
    const query = buildQueryString({
      page: options.page,
      pageSize: options.pageSize,
      search: options.search,
      ownerId: options.ownerId,
    })
    const response = await apiFetch(`/api/suppliers${query}`)
    const payload = await safeParseJson(response)

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        return { data: [], meta: { page: 1, pageSize: options.pageSize ?? 0, total: 0 } }
      }
      const message = payload?.error || "Erro ao listar fornecedores."
      throw new Error(message)
    }

    const rows = Array.isArray(payload?.data) ? payload.data : []
    return { data: rows as Supplier[], meta: parsePaginationMeta(payload) }
  } catch (error) {
    console.error("Error fetching suppliers:", error)
    return { data: [], meta: { page: 1, pageSize: options.pageSize ?? 0, total: 0 } }
  }
}

export const supplierStorage = {
  list: listSuppliers,

  getAll: async (options?: { limit?: number }): Promise<Supplier[]> => {
    const limit = options?.limit ?? 1000
    const result = await listSuppliers({ page: 1, pageSize: limit })
    return result.data
  },

  getById: async (id: string): Promise<Supplier | undefined> => {
    try {
      const response = await apiFetch(`/api/suppliers/${id}`)
      const payload = await safeParseJson(response)

      if (!response.ok) {
        if (response.status === 401 || response.status === 403 || response.status === 404) {
          if (response.status !== 404) {
            console.error("Error fetching supplier:", payload?.error)
          }
          return undefined
        }
        if (response.status !== 404) {
          console.error("Error fetching supplier:", payload?.error)
        }
        return undefined
      }

      return payload?.data as Supplier
    } catch (error) {
      console.error("Error fetching supplier:", error)
      return undefined
    }
  },

  create: async (supplier: Omit<Supplier, "id" | "createdAt" | "updatedAt">): Promise<Supplier> => {
    const response = await apiFetch("/api/suppliers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(supplier),
    })

    const payload = await safeParseJson(response)
    if (!response.ok) {
      const message = payload?.error || "Erro ao criar fornecedor."
      throw new Error(message)
    }

    return payload?.data as Supplier
  },

  update: async (id: string, updates: Partial<Supplier>): Promise<Supplier | null> => {
    try {
      const response = await apiFetch(`/api/suppliers/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      })

      const payload = await safeParseJson(response)

      if (!response.ok) {
        const message = payload?.error || "Erro ao atualizar fornecedor."
        throw new Error(message)
      }

      return payload?.data as Supplier
    } catch (error) {
      console.error("Error updating supplier:", error)
      return null
    }
  },

  delete: async (id: string): Promise<boolean> => {
    try {
      const response = await apiFetch(`/api/suppliers/${id}`, { method: "DELETE" })
      if (!response.ok) {
        const payload = await safeParseJson(response)
        const message = payload?.error || "Erro ao excluir fornecedor."
        throw new Error(message)
      }
      return true
    } catch (error) {
      console.error("Error deleting supplier:", error)
      return false
    }
  },
}

// Clients
const listClients = async (options: ListRequestParams = {}): Promise<PaginatedResult<Client>> => {
  try {
    const query = buildQueryString({
      page: options.page,
      pageSize: options.pageSize,
      search: options.search,
      ownerId: options.ownerId,
    })
    const response = await apiFetch(`/api/clients${query}`, { method: "GET" })
    const payload = await safeParseJson(response)

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        return { data: [], meta: { page: 1, pageSize: options.pageSize ?? 0, total: 0 } }
      }
      const message = payload?.error || "Erro ao listar clientes."
      throw new Error(message)
    }

    const rows = Array.isArray(payload?.data) ? payload.data : []
    return { data: rows.map(mapClientFromDb), meta: parsePaginationMeta(payload) }
  } catch (error) {
    console.error("Error fetching clients:", error)
    return { data: [], meta: { page: 1, pageSize: options.pageSize ?? 0, total: 0 } }
  }
}

export const clientStorage = {
  list: listClients,

  getAll: async (options?: { limit?: number }): Promise<Client[]> => {
    const limit = options?.limit ?? 1000
    const result = await listClients({ page: 1, pageSize: limit })
    return result.data
  },

  getById: async (id: string): Promise<Client | undefined> => {
    try {
      const response = await apiFetch(`/api/clients/${id}`, { method: "GET" })
      const payload = await safeParseJson(response)

      if (!response.ok) {
        if (response.status === 401 || response.status === 403 || response.status === 404) {
          if (response.status !== 404) {
            console.error("Error fetching client:", payload?.error)
          }
          return undefined
        }

        const message = payload?.error
        return undefined
      }

      return payload?.data ? mapClientFromDb(payload.data) : undefined
    } catch (error) {
      console.error("Error fetching client:", error)
      return undefined
    }
  },

  create: async (client: Omit<Client, "id" | "createdAt" | "updatedAt">): Promise<Client> => {
    const response = await apiFetch("/api/clients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(client),
    })

    const payload = await safeParseJson(response)
    if (!response.ok) {
      const message = payload?.error || "Erro ao criar cliente."
      throw new Error(message)
    }

    return mapClientFromDb(payload.data)
  },

  update: async (id: string, updates: Partial<Client>): Promise<Client | null> => {
    try {
      const response = await apiFetch(`/api/clients/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      })

      const payload = await safeParseJson(response)

      if (!response.ok) {
        const message = payload?.error || "Erro ao atualizar cliente."
        throw new Error(message)
      }

      return payload?.data ? mapClientFromDb(payload.data) : null
    } catch (error) {
      console.error("Error updating client:", error)
      return null
    }
  },

  delete: async (id: string): Promise<boolean> => {
    try {
      const response = await apiFetch(`/api/clients/${id}`, { method: "DELETE" })
      if (!response.ok) {
        const payload = await safeParseJson(response)
        const message = payload?.error || "Erro ao excluir cliente."
        throw new Error(message)
      }

      return true
    } catch (error) {
      console.error("Error deleting client:", error)
      return false
    }
  },
}

// Products
const listProducts = async (options: ListRequestParams = {}): Promise<PaginatedResult<Product>> => {
  try {
    const query = buildQueryString({
      page: options.page,
      pageSize: options.pageSize,
      search: options.search,
      ownerId: options.ownerId,
    })
    const response = await apiFetch(`/api/products${query}`)
    const payload = await safeParseJson(response)

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        return { data: [], meta: { page: 1, pageSize: options.pageSize ?? 0, total: 0 } }
      }
      const message = payload?.error || "Erro ao listar produtos."
      throw new Error(message)
    }

    const rows = Array.isArray(payload?.data) ? payload.data : []
    return { data: rows.map(mapProductFromApi), meta: parsePaginationMeta(payload) }
  } catch (error) {
    console.error("Error connecting to database:", error)
    return { data: [], meta: { page: 1, pageSize: options.pageSize ?? 0, total: 0 } }
  }
}

export const productStorage = {
  list: listProducts,

  getAll: async (options?: { limit?: number }): Promise<Product[]> => {
    const limit = options?.limit ?? 1000
    const result = await listProducts({ page: 1, pageSize: limit })
    return result.data
  },

  getById: async (id: string): Promise<Product | undefined> => {
    try {
      const response = await apiFetch(`/api/products/${id}`)
      const payload = await safeParseJson(response)

      if (!response.ok) {
        if (response.status === 401 || response.status === 403 || response.status === 404) {
          if (response.status !== 404) {
            console.error("Error fetching product:", payload?.error)
          }
          return undefined
        }
        if (response.status !== 404) {
          console.error("Error fetching product:", payload?.error)
        }
        return undefined
      }

      return payload?.data ? mapProductFromApi(payload.data) : undefined
    } catch (error) {
      console.error("Error fetching product:", error)
      return undefined
    }
  },

  create: async (product: Omit<Product, "id" | "createdAt" | "updatedAt">): Promise<Product> => {
    try {
      const response = await apiFetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: product.name,
          description: product.description,
          price: product.price,
          unit: product.unit,
          type: product.type,
        }),
      })

      const payload = await safeParseJson(response)

      if (!response.ok) {
        const message = payload?.error || "Erro ao criar produto."
        throw new Error(message)
      }

      return mapProductFromApi(payload.data)
    } catch (error) {
      console.error("Error creating product:", error)
      throw error
    }
  },

  update: async (id: string, updates: Partial<Product>): Promise<Product | null> => {
    try {
      const response = await apiFetch(`/api/products/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      })

      const payload = await safeParseJson(response)

      if (!response.ok) {
        const message = payload?.error || "Erro ao atualizar produto."
        throw new Error(message)
      }

      return payload?.data ? mapProductFromApi(payload.data) : null
    } catch (error) {
      console.error("Error updating product:", error)
      return null
    }
  },

  delete: async (id: string): Promise<boolean> => {
    try {
      const response = await apiFetch(`/api/products/${id}`, { method: "DELETE" })
      if (!response.ok) {
        const payload = await safeParseJson(response)
        const message = payload?.error || "Erro ao excluir produto."
        throw new Error(message)
      }

      return true
    } catch (error) {
      console.error("Error deleting product:", error)
      return false
    }
  },
}

// Receipts
const listReceipts = async (options: ListRequestParams = {}): Promise<PaginatedResult<Receipt>> => {
  try {
    const query = buildQueryString({
      page: options.page,
      pageSize: options.pageSize,
      search: options.search,
      ownerId: options.ownerId,
    })
    const response = await apiFetch(`/api/receipts${query}`)
    const payload = await safeParseJson(response)

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        return { data: [], meta: { page: 1, pageSize: options.pageSize ?? 0, total: 0 } }
      }
      const message = payload?.error || "Erro ao listar recibos."
      throw new Error(message)
    }

    const rows = Array.isArray(payload?.data) ? payload.data : []
    return { data: rows.map(mapReceiptFromDb), meta: parsePaginationMeta(payload) }
  } catch (error) {
    console.error("Error fetching receipts:", error)
    return { data: [], meta: { page: 1, pageSize: options.pageSize ?? 0, total: 0 } }
  }
}

export const receiptStorage = {
  list: listReceipts,

  getAll: async (options?: { limit?: number }): Promise<Receipt[]> => {
    const limit = options?.limit ?? 1000
    const result = await listReceipts({ page: 1, pageSize: limit })
    return result.data
  },

  getById: async (id: string): Promise<Receipt | undefined> => {
    try {
      const response = await apiFetch(`/api/receipts/${id}`)
      const payload = await safeParseJson(response)

      if (!response.ok) {
        if (response.status === 401 || response.status === 403 || response.status === 404) {
          if (response.status !== 404) {
            console.error("Error fetching receipt:", payload?.error)
          }
          return undefined
        }
        if (response.status !== 404) {
          console.error("Error fetching receipt:", payload?.error)
        }
        return undefined
      }

      return payload?.data ? mapReceiptFromDb(payload.data) : undefined
    } catch (error) {
      console.error("Error fetching receipt:", error)
      return undefined
    }
  },

  create: async (receipt: Omit<Receipt, "id" | "createdAt" | "updatedAt">): Promise<Receipt> => {
    const response = await apiFetch("/api/receipts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(receipt),
    })

    const payload = await safeParseJson(response)
    if (!response.ok) {
      const message = payload?.error || "Erro ao criar recibo."
      throw new Error(message)
    }

    return mapReceiptFromDb(payload.data)
  },

  delete: async (id: string): Promise<boolean> => {
    try {
      const response = await apiFetch(`/api/receipts/${id}`, { method: "DELETE" })
      if (!response.ok) {
        const payload = await safeParseJson(response)
        const message = payload?.error || "Erro ao excluir recibo."
        throw new Error(message)
      }

      return true
    } catch (error) {
      console.error("Error deleting receipt:", error)
      return false
    }
  },
}
// Daily Expenses
export const dailyExpenseStorage = {
  getAll: async (): Promise<DailyExpense[]> => {
    try {
      const response = await apiFetch("/api/daily-expenses")
      const payload = await safeParseJson(response)

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          return []
        }
        const message = payload?.error || "Erro ao listar despesas."
        console.error(message)
        return []
      }

      return Array.isArray(payload?.data) ? payload.data : []
    } catch (error) {
      console.error("Error fetching daily expenses:", error)
      return []
    }
  },

  getById: async (id: string): Promise<DailyExpense | undefined> => {
    try {
      const response = await apiFetch(`/api/daily-expenses/${id}`)
      const payload = await safeParseJson(response)

      if (!response.ok) {
        if (response.status === 401 || response.status === 403 || response.status === 404) {
          if (response.status !== 404) {
            console.error("Error fetching daily expense:", payload?.error)
          }
          return undefined
        }
        return undefined
      }

      return payload?.data as DailyExpense
    } catch (error) {
      console.error("Error fetching daily expense:", error)
      return undefined
    }
  },

  create: async (expense: Omit<DailyExpense, "id" | "createdAt">): Promise<DailyExpense> => {
    const response = await apiFetch("/api/daily-expenses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(expense),
    })

    const payload = await safeParseJson(response)
    if (!response.ok) {
      const message = payload?.error || "Erro ao salvar despesa."
      throw new Error(message)
    }

    return payload?.data as DailyExpense
  },

  delete: async (id: string): Promise<boolean> => {
    try {
      const response = await apiFetch(`/api/daily-expenses/${id}`, { method: "DELETE" })
      if (!response.ok) {
        const payload = await safeParseJson(response)
        const message = payload?.error || "Erro ao excluir despesa."
        throw new Error(message)
      }

      return true
    } catch (error) {
      console.error("Error deleting daily expense:", error)
      return false
    }
  },
}

// Alerts
export const alertStorage = {
  getAll: async (): Promise<Alert[]> => {
    try {
      const { data, error } = await supabase
        .from("alerts")
        .select("*")
        .eq("is_read", false)
        .order("created_at", { ascending: false })

      if (error) {
        console.error("Error fetching alerts:", error)
        return []
      }

      return data || []
    } catch (error) {
      console.error("Error connecting to database:", error)
      return []
    }
  },

  create: async (alert: Omit<Alert, "id" | "createdAt">): Promise<Alert> => {
    const { data, error } = await supabase.from("alerts").insert([alert]).select().single()

    if (error) {
      console.error("Error creating alert:", error)
      throw error
    }

    return data
  },

  markAsRead: async (id: string): Promise<boolean> => {
    const { error } = await supabase.from("alerts").update({ is_read: true }).eq("id", id)

    if (error) {
      console.error("Error marking alert as read:", error)
      return false
    }

    return true
  },
}

export const reportStorage = {
  getAll: async (): Promise<Report[]> => {
    const { data, error } = await supabase.from("reports").select("*").order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching reports:", error)
      return []
    }

    return data || []
  },

  create: async (report: Omit<Report, "id" | "createdAt">): Promise<Report> => {
    const { data, error } = await supabase.from("reports").insert([report]).select().single()

    if (error) {
      console.error("Error creating report:", error)
      throw error
    }

    return data
  },

  delete: async (id: string): Promise<boolean> => {
    const { error } = await supabase.from("reports").delete().eq("id", id)

    if (error) {
      console.error("Error deleting report:", error)
      return false
    }

    return true
  },
}

export const calendarEventStorage = {
  getAll: async (): Promise<CalendarEvent[]> => {
    const { data, error } = await supabase.from("calendar_events").select("*").order("date", { ascending: false })

    if (error) {
      console.error("Error fetching calendar events:", error)
      return []
    }

    return data || []
  },

  create: async (event: Omit<CalendarEvent, "id" | "createdAt">): Promise<CalendarEvent> => {
    const { data, error } = await supabase.from("calendar_events").insert([event]).select().single()

    if (error) {
      console.error("Error creating calendar event:", error)
      throw error
    }

    return data
  },

  delete: async (id: string): Promise<boolean> => {
    const { error } = await supabase.from("calendar_events").delete().eq("id", id)

    if (error) {
      console.error("Error deleting calendar event:", error)
      return false
    }

    return true
  },
}

// Service Orders
const isBrowser = typeof window !== "undefined"

const safeParseJson = async (response: Response) => {
  try {
    return await response.json()
  } catch {
    return null
  }
}

const resolveApiUrl = (path: string) => {
  if (isBrowser) return path

  const base =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.VERCEL_URL ||
    `http://localhost:${process.env.PORT || 3000}`

  const normalized = base.startsWith("http") ? base : `https://${base}`
  return new URL(path, normalized).toString()
}

const deserializeServiceOrderItem = (item: any): ServiceOrderItem => ({
  id: item.id,
  serviceOrderId: item.serviceOrderId ?? item.service_order_id,
  productId: item.productId ?? item.product_id ?? undefined,
  description: item.description ?? "",
  quantity: typeof item.quantity === "number" ? item.quantity : Number(item.quantity ?? 0),
  unitPrice: typeof item.unitPrice === "number" ? item.unitPrice : Number(item.unit_price ?? 0),
  total: typeof item.total === "number" ? item.total : Number(item.total ?? 0),
  createdAt: new Date(item.createdAt ?? item.created_at),
})

const deserializeServiceOrder = (order: any): ServiceOrder => {
  const rawOrderNumber = (order.orderNumber ?? order.order_number ?? "").toString().trim()
  const orderNumber = rawOrderNumber.length > 0
    ? rawOrderNumber
    : "OS-" + (order.id || "TEMP").toString().slice(0, 8)

  const rawCreatedAt = order.createdAt ?? order.created_at
  const rawUpdatedAt = order.updatedAt ?? order.updated_at

  const rawItems = Array.isArray(order.items)
    ? order.items
    : Array.isArray(order.items?.data)
      ? order.items.data
      : []

  return {
    id: order.id,
    orderNumber,
    clientId: order.clientId ?? order.client_id ?? "",
    assignedTo: order.assignedTo ?? order.assigned_to ?? undefined,
    status: order.status ?? "pending",
    title: order.title ?? "",
    description: order.description ?? "",
    priority: order.priority ?? undefined,
    scheduledDate: order.scheduledDate ?? order.scheduled_date ?? undefined,
    completedDate: order.completedDate ?? order.completed_date ?? undefined,
    totalValue: typeof order.totalValue === "number" ? order.totalValue : Number(order.total_value ?? 0),
    notes: order.notes ?? undefined,
    userId: order.userId ?? order.user_id ?? "",
    owner: order.owner,
    items: rawItems.map(deserializeServiceOrderItem),
    createdAt: rawCreatedAt ? new Date(rawCreatedAt) : new Date(),
    updatedAt: rawUpdatedAt ? new Date(rawUpdatedAt) : new Date(),
  }
}


export const serviceOrderStorage = {
  getAll: async (): Promise<ServiceOrder[]> => {
    try {
      const response = await fetch(resolveApiUrl("/api/service-orders"), {
        headers: { Accept: "application/json" },
      })

      if (response.status === 403 || response.status === 401) {
        console.warn("Sem permisso para listar ordens de servio; retornando lista vazia.")
        return []
      }

      if (!response.ok) {
        const payload = await safeParseJson(response)
        const message =
          typeof payload?.error === "string" && payload.error.length > 0
            ? payload.error
            : "Erro ao carregar ordens de servico."
        throw new Error(message)
      }

      const payload = await response.json()
      const data = Array.isArray(payload)
        ? payload
        : Array.isArray(payload?.data)
          ? payload.data
          : []

      return data.map(deserializeServiceOrder)
    } catch (error) {
      console.error("Falha ao carregar ordens de servio:", error)
      return []
    }
  },

  getById: async (id: string): Promise<ServiceOrder | undefined> => {
    const response = await fetch(resolveApiUrl(`/api/service-orders/${id}`), {
      headers: { Accept: "application/json" },
    })
    if (response.status === 404) return undefined
    if (response.status === 403 || response.status === 401) {
      console.warn("Sem permisso para acessar esta ordem de servio; retornando indefinido.")
      return undefined
    }
    if (!response.ok) {
      throw new Error("Erro ao carregar ordem de servico.")
    }
    const payload = await response.json()
    const record = payload?.data ?? payload
    return record ? deserializeServiceOrder(record) : undefined
  },

  create: async (order: Omit<ServiceOrder, "id" | "createdAt" | "updatedAt">): Promise<ServiceOrder> => {
    try {
      const response = await fetch(resolveApiUrl("/api/service-orders"), {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(order),
      })

      const payload = await safeParseJson(response)

      if (!response.ok) {
        throw new Error(payload?.error ?? "Erro ao criar ordem de servico.")
      }

      const record = payload?.data ?? payload
      return deserializeServiceOrder(record)
    } catch (error) {
      console.error("Falha ao criar ordem de servio:", error)
      throw error instanceof Error ? error : new Error("Erro ao criar ordem de servico.")
    }
  },

  update: async (id: string, updates: Partial<ServiceOrder>): Promise<ServiceOrder | null> => {
    const response = await fetch(resolveApiUrl(`/api/service-orders/${id}`), {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(updates),
    })

    if (response.status === 404) return null
    if (!response.ok) {
      const payload = await safeParseJson(response)
      throw new Error(payload?.error ?? "Erro ao atualizar ordem de servico.")
    }

    const payload = await safeParseJson(response)
    const record = payload?.data ?? payload
    return deserializeServiceOrder(record)
  },

  delete: async (id: string): Promise<boolean> => {
    const response = await fetch(resolveApiUrl(`/api/service-orders/${id}`), {
      method: "DELETE",
      headers: { Accept: "application/json" },
    })

    if (response.status === 404) return false
    if (!response.ok) {
      const payload = await safeParseJson(response)
      throw new Error(payload?.error ?? "Erro ao excluir ordem de servico.")
    }

    return true
  },
}
export const getSuppliers = async (): Promise<Supplier[]> => await supplierStorage.getAll()
export const getClients = async (): Promise<Client[]> => await clientStorage.getAll()
export const getProducts = async (): Promise<Product[]> => await productStorage.getAll()
export const getReceipts = async (): Promise<Receipt[]> => await receiptStorage.getAll()
export const getAlerts = async (): Promise<Alert[]> => await alertStorage.getAll()
export const getDailyExpenses = async (): Promise<DailyExpense[]> => await dailyExpenseStorage.getAll()
export const getReports = async (): Promise<Report[]> => await reportStorage.getAll()
export const getCalendarEvents = async (): Promise<CalendarEvent[]> => await calendarEventStorage.getAll()
export const getServiceOrders = async (): Promise<ServiceOrder[]> => await serviceOrderStorage.getAll()

export const saveDailyExpense = async (expense: Omit<DailyExpense, "id" | "createdAt">): Promise<DailyExpense> =>
  await dailyExpenseStorage.create(expense)
export const deleteDailyExpense = async (id: string): Promise<boolean> => await dailyExpenseStorage.delete(id)

export const setupRealtimeSubscription = (callback: () => void) => {
  const channels = [
    supabase
      .channel("suppliers")
      .on("postgres_changes", { event: "*", schema: "public", table: "suppliers" }, callback),
    supabase.channel("clients").on("postgres_changes", { event: "*", schema: "public", table: "clients" }, callback),
    supabase.channel("products").on("postgres_changes", { event: "*", schema: "public", table: "products" }, callback),
    supabase.channel("receipts").on("postgres_changes", { event: "*", schema: "public", table: "receipts" }, callback),
    supabase
      .channel("receipt_products")
      .on("postgres_changes", { event: "*", schema: "public", table: "receipt_products" }, callback),
    supabase
      .channel("daily_expenses")
      .on("postgres_changes", { event: "*", schema: "public", table: "daily_expenses" }, callback),
    supabase.channel("alerts").on("postgres_changes", { event: "*", schema: "public", table: "alerts" }, callback),
    supabase.channel("reports").on("postgres_changes", { event: "*", schema: "public", table: "reports" }, callback),
    supabase
      .channel("calendar_events")
      .on("postgres_changes", { event: "*", schema: "public", table: "calendar_events" }, callback),
    supabase
      .channel("service_orders")
      .on("postgres_changes", { event: "*", schema: "public", table: "service_orders" }, callback),
    supabase
      .channel("service_order_items")
      .on("postgres_changes", { event: "*", schema: "public", table: "service_order_items" }, callback),
  ]

  channels.forEach((channel) => channel.subscribe())

  return () => {
    channels.forEach((channel) => supabase.removeChannel(channel))
  }
}

// Legacy sync functions for backward compatibility
export const startDataSync = (callback: () => void) => {
  return setupRealtimeSubscription(callback)
}

export const stopDataSync = () => {
  // Cleanup handled by the unsubscribe function returned by setupRealtimeSubscription
}

export const notifyDataChange = () => {
  // Not needed with Supabase real-time subscriptions
}

const mapReceiptToDb = (receipt: any) => {
  const { clientId, supplierId, hasInvoice, ...rest } = receipt
  return {
    ...rest,
    date: receipt.date || new Date().toISOString().split("T")[0],
    ...(clientId && { client_id: clientId }),
    ...(supplierId && { supplier_id: supplierId }),
    ...(hasInvoice !== undefined && { has_invoice: hasInvoice }),
  }
}

const mapReceiptFromDb = (receipt: any) => {
  if (!receipt) return receipt

  const clientId = receipt.client_id ?? receipt.clientId ?? null
  const supplierId = receipt.supplier_id ?? receipt.supplierId ?? null
  const hasInvoiceField = receipt.has_invoice ?? receipt.hasInvoice
  const entityName = receipt.entity_name ?? receipt.entityName
  const description = receipt.description ?? undefined
  const observations = receipt.observations ?? undefined
  const createdAt = receipt.created_at ?? receipt.createdAt
  const updatedAt = receipt.updated_at ?? receipt.updatedAt

  const products = Array.isArray(receipt.products)
    ? receipt.products.map((product: any) => ({
        productId: product.product_id ?? product.productId,
        quantity: Number(product.quantity ?? 0),
        unitPrice: Number(product.unit_price ?? product.unitPrice ?? 0),
        total: Number(product.total ?? 0),
      }))
    : []

  return {
    id: receipt.id,
    type: receipt.type,
    supplierId: supplierId ?? undefined,
    clientId: clientId ?? undefined,
    entityName: entityName ?? undefined,
    description,
    date: receipt.date,
    total: typeof receipt.total === "number" ? receipt.total : Number(receipt.total ?? 0),
    hasInvoice: hasInvoiceField !== undefined ? Boolean(hasInvoiceField) : undefined,
    observations,
    createdAt: createdAt ? new Date(createdAt) : undefined,
    updatedAt: updatedAt ? new Date(updatedAt) : undefined,
    userId: receipt.userId ?? receipt.user_id ?? "",
    owner: receipt.owner,
    products,
  }
}





