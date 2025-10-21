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
} from "./types"
import { supabase } from "./supabase/client"
import { logger } from "./logger"

const mapClientToDb = (client: any) => {
  const { cpfCnpj, ...rest } = client
  return {
    ...rest,
    cpf_cnpj: cpfCnpj,
  }
}

const mapClientFromDb = (client: any) => {
  const { cpf_cnpj, ...rest } = client
  return {
    ...rest,
    cpfCnpj: cpf_cnpj,
  }
}

// Suppliers
export const supplierStorage = {
  getAll: async (): Promise<Supplier[]> => {
    const startTime = Date.now()
    try {
      const { data, error } = await supabase.from("suppliers").select("*").order("created_at", { ascending: false })

      logger.logDatabaseQuery("SELECT", "suppliers", Date.now() - startTime, {
        count: data?.length || 0,
      })

      if (error) {
        logger.error("Error fetching suppliers", error)
        return []
      }

      return data || []
    } catch (error) {
      logger.error("Error connecting to database", error as Error, { table: "suppliers" })
      return []
    }
  },

  getById: async (id: string): Promise<Supplier | undefined> => {
    const startTime = Date.now()
    const { data, error } = await supabase.from("suppliers").select("*").eq("id", id).single()

    logger.logDatabaseQuery("SELECT", "suppliers", Date.now() - startTime, { id })

    if (error) {
      logger.error("Error fetching supplier", error, { id })
      return undefined
    }

    return data
  },

  create: async (supplier: Omit<Supplier, "id" | "createdAt" | "updatedAt">): Promise<Supplier> => {
    const startTime = Date.now()
    try {
      const { data, error } = await supabase.from("suppliers").insert([supplier]).select().single()

      logger.logDatabaseQuery("INSERT", "suppliers", Date.now() - startTime)

      if (error) {
        logger.error("Error creating supplier", error)
        throw new Error("NÃ£o foi possÃ­vel criar o fornecedor. Verifique se o Supabase estÃ¡ configurado.")
      }

      logger.logBusinessEvent("supplier_created", {
        supplierId: data.id,
        name: data.name,
      })

      return data
    } catch (error) {
      logger.error("Error creating supplier", error as Error)
      throw new Error("Erro de conexÃ£o com o banco de dados.")
    }
  },

  update: async (id: string, updates: Partial<Supplier>): Promise<Supplier | null> => {
    const startTime = Date.now()
    const { data, error } = await supabase.from("suppliers").update(updates).eq("id", id).select().single()

    logger.logDatabaseQuery("UPDATE", "suppliers", Date.now() - startTime, { id })

    if (error) {
      logger.error("Error updating supplier", error, { id })
      return null
    }

    logger.logBusinessEvent("supplier_updated", {
      supplierId: id,
      changes: Object.keys(updates),
    })

    return data
  },

  delete: async (id: string): Promise<boolean> => {
    const startTime = Date.now()
    const { error } = await supabase.from("suppliers").delete().eq("id", id)

    logger.logDatabaseQuery("DELETE", "suppliers", Date.now() - startTime, { id })

    if (error) {
      logger.error("Error deleting supplier", error, { id })
      return false
    }

    logger.logBusinessEvent("supplier_deleted", { supplierId: id })

    return true
  },
}

// Clients
export const clientStorage = {
  getAll: async (): Promise<Client[]> => {
    try {
      const { data, error } = await supabase.from("clients").select("*").order("created_at", { ascending: false })

      if (error) {
        console.error("Error fetching clients:", error)
        return []
      }

      return (data || []).map(mapClientFromDb)
    } catch (error) {
      console.error("Error connecting to database:", error)
      return []
    }
  },

  getById: async (id: string): Promise<Client | undefined> => {
    const { data, error } = await supabase.from("clients").select("*").eq("id", id).single()

    if (error) {
      console.error("Error fetching client:", error)
      return undefined
    }

    return data ? mapClientFromDb(data) : undefined
  },

  create: async (client: Omit<Client, "id" | "createdAt" | "updatedAt">): Promise<Client> => {
    const { data: existingEmailClient, error: emailCheckError } = await supabase
      .from("clients")
      .select("id, email, name")
      .eq("email", client.email)
      .maybeSingle()

    if (emailCheckError && emailCheckError.code !== "PGRST116") {
      console.error("Error checking existing client email:", emailCheckError)
      throw new Error("Erro ao verificar email existente")
    }

    if (existingEmailClient) {
      throw new Error(`JÃ¡ existe um cliente cadastrado com este email: ${existingEmailClient.name}`)
    }

    const { data: existingCpfClient, error: cpfCheckError } = await supabase
      .from("clients")
      .select("id, cpf_cnpj, name")
      .eq("cpf_cnpj", client.cpfCnpj)
      .maybeSingle()

    if (cpfCheckError && cpfCheckError.code !== "PGRST116") {
      console.error("Error checking existing client CPF/CNPJ:", cpfCheckError)
      throw new Error("Erro ao verificar CPF/CNPJ existente")
    }

    if (existingCpfClient) {
      throw new Error(`JÃ¡ existe um cliente cadastrado com este CPF/CNPJ: ${existingCpfClient.name}`)
    }

    const dbClient = mapClientToDb(client)
    const { data, error } = await supabase.from("clients").insert([dbClient]).select().single()

    if (error) {
      console.error("Error creating client:", error)
      if (error.code === "23505") {
        if (error.message.includes("clients_email_key")) {
          throw new Error("JÃ¡ existe um cliente cadastrado com este email")
        }
        if (error.message.includes("clients_cpf_cnpj_key")) {
          throw new Error("JÃ¡ existe um cliente cadastrado com este CPF/CNPJ")
        }
        throw new Error("JÃ¡ existe um cliente cadastrado com estes dados")
      }
      throw error
    }

    return mapClientFromDb(data)
  },

  update: async (id: string, updates: Partial<Client>): Promise<Client | null> => {
    const dbUpdates = mapClientToDb(updates)
    const { data, error } = await supabase.from("clients").update(dbUpdates).eq("id", id).select().single()

    if (error) {
      console.error("Error updating client:", error)
      return null
    }

    return data ? mapClientFromDb(data) : null
  },

  delete: async (id: string): Promise<boolean> => {
    const { error } = await supabase.from("clients").delete().eq("id", id)

    if (error) {
      console.error("Error deleting client:", error)
      return false
    }

    return true
  },
}

// Products
export const productStorage = {
  getAll: async (): Promise<Product[]> => {
    try {
      const { data, error } = await supabase.from("products").select("*").order("created_at", { ascending: false })

      if (error) {
        console.error("Error fetching products:", error)
        return []
      }

      return data || []
    } catch (error) {
      console.error("Error connecting to database:", error)
      return []
    }
  },

  getById: async (id: string): Promise<Product | undefined> => {
    const { data, error } = await supabase.from("products").select("*").eq("id", id).single()

    if (error) {
      console.error("Error fetching product:", error)
      return undefined
    }

    return data
  },

  create: async (product: Omit<Product, "id" | "createdAt" | "updatedAt">): Promise<Product> => {
    const productData = {
      name: product.name,
      description: product.description || "",
      price: product.price,
      unit: product.unit,
      // Type is now optional - only include if provided
      ...(product.type && { type: product.type }),
    }

    const { data, error } = await supabase.from("products").insert([productData]).select().single()

    if (error) {
      console.error("Error creating product:", error)
      throw error
    }

    return data
  },

  update: async (id: string, updates: Partial<Product>): Promise<Product | null> => {
    const { data, error } = await supabase.from("products").update(updates).eq("id", id).select().single()

    if (error) {
      console.error("Error updating product:", error)
      return null
    }

    return data
  },

  delete: async (id: string): Promise<boolean> => {
    const { error } = await supabase.from("products").delete().eq("id", id)

    if (error) {
      console.error("Error deleting product:", error)
      return false
    }

    return true
  },
}

export const receiptProductStorage = {
  getByReceiptId: async (receiptId: string): Promise<ReceiptProduct[]> => {
    const { data, error } = await supabase.from("receipt_products").select("*").eq("receipt_id", receiptId)

    if (error) {
      console.error("Error fetching receipt products:", error)
      return []
    }

    return data || []
  },

  create: async (receiptProduct: Omit<ReceiptProduct, "id">): Promise<ReceiptProduct> => {
    const { data, error } = await supabase.from("receipt_products").insert([receiptProduct]).select().single()

    if (error) {
      console.error("Error creating receipt product:", error)
      throw error
    }

    return data
  },

  deleteByReceiptId: async (receiptId: string): Promise<boolean> => {
    const { error } = await supabase.from("receipt_products").delete().eq("receipt_id", receiptId)

    if (error) {
      console.error("Error deleting receipt products:", error)
      return false
    }

    return true
  },
}

// Receipts
export const receiptStorage = {
  getAll: async (): Promise<Receipt[]> => {
    try {
      const { data: receiptsData, error: receiptsError } = await supabase
        .from("receipts")
        .select("*")
        .order("created_at", { ascending: false })

      if (receiptsError) {
        console.error("Error fetching receipts:", receiptsError)
        return []
      }

      if (!receiptsData || receiptsData.length === 0) {
        return []
      }

      // Buscar produtos para cada recibo
      const receiptsWithProducts = await Promise.all(
        receiptsData.map(async (receipt) => {
          const products = await receiptProductStorage.getByReceiptId(receipt.id)
          return {
            ...mapReceiptFromDb(receipt),
            products: products || [],
          }
        }),
      )

      return receiptsWithProducts
    } catch (error) {
      console.error("Error connecting to database:", error)
      return []
    }
  },

  getById: async (id: string): Promise<Receipt | undefined> => {
    const { data, error } = await supabase
      .from("receipts")
      .select(`
        *,
        receipt_products (
          id,
          product_id,
          quantity,
          unit_price,
          total
        )
      `)
      .eq("id", id)
      .single()

    if (error) {
      console.error("Error fetching receipt:", error)
      return undefined
    }

    return data
      ? {
          ...mapReceiptFromDb(data),
          products: data.receipt_products || [],
        }
      : undefined
  },

  create: async (receipt: Omit<Receipt, "id" | "createdAt" | "updatedAt">): Promise<Receipt> => {
    const { products, ...receiptData } = receipt

    const dbReceiptData = mapReceiptToDb(receiptData)

    const { data: receiptResult, error: receiptError } = await supabase
      .from("receipts")
      .insert([dbReceiptData])
      .select()
      .single()

    if (receiptError) {
      console.error("Error creating receipt:", receiptError)
      throw new Error("NÃ£o foi possÃ­vel criar o recibo. Verifique se o Supabase estÃ¡ configurado.")
    }

    // Criar produtos do recibo se existirem
    if (products && products.length > 0) {
      const receiptProducts = products.map((product) => ({
        receipt_id: receiptResult.id,
        product_id: product.productId,
        quantity: product.quantity,
        unit_price: product.unitPrice,
        total: product.total,
      }))

      const { error: productsError } = await supabase.from("receipt_products").insert(receiptProducts)

      if (productsError) {
        console.error("Error creating receipt products:", productsError)
        // Rollback: deletar o recibo criado
        await supabase.from("receipts").delete().eq("id", receiptResult.id)
        throw new Error("Erro ao criar produtos do recibo.")
      }
    }

    return {
      ...mapReceiptFromDb(receiptResult),
      products: products || [],
    }
  },

  delete: async (id: string): Promise<boolean> => {
    const { error } = await supabase.from("receipts").delete().eq("id", id)

    if (error) {
      console.error("Error deleting receipt:", error)
      return false
    }

    return true
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

// Daily Expenses
export const dailyExpenseStorage = {
  getAll: async (): Promise<DailyExpense[]> => {
    try {
      const { data, error } = await supabase.from("daily_expenses").select("*").order("date", { ascending: false })

      if (error) {
        console.error("Error fetching daily expenses:", error)
        return []
      }

      return (data || []).map((item) => ({
        id: item.id,
        date: item.date,
        category: item.category,
        amount: item.amount,
        observations: item.observations,
        supplierId: item.supplier_id,
        createdAt: item.created_at,
      }))
    } catch (error) {
      console.error("Error connecting to database:", error)
      return []
    }
  },

  getById: async (id: string): Promise<DailyExpense | undefined> => {
    const { data, error } = await supabase.from("daily_expenses").select("*").eq("id", id).single()

    if (error) {
      console.error("Error fetching daily expense:", error)
      return undefined
    }

    return data
      ? {
          id: data.id,
          date: data.date,
          category: data.category,
          amount: data.amount,
          observations: data.observations,
          supplierId: data.supplier_id,
          createdAt: data.created_at,
        }
      : undefined
  },

  create: async (expense: Omit<DailyExpense, "id" | "createdAt">): Promise<DailyExpense> => {
    // ValidaÃ§Ã£o bÃ¡sica
    if (!expense.date || !expense.category || expense.amount === undefined || expense.amount <= 0) {
      throw new Error("Dados invÃ¡lidos: data, categoria e valor sÃ£o obrigatÃ³rios")
    }

    const dbExpense = {
      date: expense.date,
      category: expense.category,
      amount: Number(expense.amount),
      observations: expense.observations || null,
      supplier_id: expense.supplierId || null,
    }

    const { data, error } = await supabase.from("daily_expenses").insert([dbExpense]).select().single()

    if (error) {
      console.error("Erro ao salvar gasto:", error)
      throw new Error(`Erro ao salvar gasto: ${error.message}`)
    }

    if (!data) {
      throw new Error("Nenhum dado retornado apÃ³s inserÃ§Ã£o")
    }

    return {
      id: data.id,
      date: data.date,
      category: data.category,
      amount: data.amount,
      observations: data.observations,
      supplierId: data.supplier_id,
      createdAt: data.created_at,
    }
  },

  delete: async (id: string): Promise<boolean> => {
    const { error } = await supabase.from("daily_expenses").delete().eq("id", id)

    if (error) {
      console.error("Error deleting daily expense:", error)
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

const deserializeServiceOrder = (order: any): ServiceOrder => ({
  id: order.id,
  orderNumber: order.orderNumber ?? order.order_number,
  clientId: order.clientId ?? order.client_id,
  assignedTo: order.assignedTo ?? order.assigned_to ?? undefined,
  status: order.status,
  title: order.title,
  description: order.description ?? "",
  priority: order.priority ?? undefined,
  scheduledDate: order.scheduledDate ?? order.scheduled_date ?? undefined,
  completedDate: order.completedDate ?? order.completed_date ?? undefined,
  totalValue: typeof order.totalValue === "number" ? order.totalValue : Number(order.total_value ?? 0),
  notes: order.notes ?? undefined,
  items: Array.isArray(order.items) ? order.items.map(deserializeServiceOrderItem) : [],
  createdAt: new Date(order.createdAt ?? order.created_at),
  updatedAt: new Date(order.updatedAt ?? order.updated_at),
})

export const serviceOrderStorage = {
  getAll: async (): Promise<ServiceOrder[]> => {
    try {
      const response = await fetch(resolveApiUrl("/api/service-orders"), {
        headers: { Accept: "application/json" },
      })

      if (response.status === 403 || response.status === 401) {
        console.warn("Sem permissão para listar ordens de serviço; retornando lista vazia.")
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

      const payload = (await response.json()) as any[]
      return payload.map(deserializeServiceOrder)
    } catch (error) {
      console.error("Falha ao carregar ordens de serviço:", error)
      return []
    }
  },

  getById: async (id: string): Promise<ServiceOrder | undefined> => {
    const response = await fetch(resolveApiUrl(`/api/service-orders/${id}`), {
      headers: { Accept: "application/json" },
    })
    if (response.status === 404) return undefined
    if (response.status === 403 || response.status === 401) {
      console.warn("Sem permissão para acessar esta ordem de serviço; retornando indefinido.")
      return undefined
    }
    if (!response.ok) {
      throw new Error("Erro ao carregar ordem de servico.")
    }
    const payload = await response.json()
    return deserializeServiceOrder(payload)
  },

  create: async (order: Omit<ServiceOrder, "id" | "createdAt" | "updatedAt">): Promise<ServiceOrder> => {
    const response = await fetch(resolveApiUrl("/api/service-orders"), {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(order),
    })

    try {
      const response = await fetch(resolveApiUrl("/api/service-orders"), {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(order),
      })

      if (!response.ok) {
        const payload = await safeParseJson(response)
        throw new Error(payload?.error ?? "Erro ao criar ordem de servico.")
      }

      const payload = await response.json()
      return deserializeServiceOrder(payload)
    } catch (error) {
      console.error("Falha ao criar ordem de serviço:", error)
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

    const payload = await response.json()
    return deserializeServiceOrder(payload)
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

export const getDashboardStats = async () => {
  try {
    console.log("[v0] Starting getDashboardStats")

    const [suppliers, clients, products, receipts, alerts, expenses, serviceOrders] = await Promise.all([
      supplierStorage.getAll(),
      clientStorage.getAll(),
      productStorage.getAll(),
      receiptStorage.getAll(),
      alertStorage.getAll(),
      dailyExpenseStorage.getAll(),
      serviceOrderStorage.getAll(),
    ])

    console.log("[v0] Data fetched successfully:", {
      suppliers: suppliers.length,
      clients: clients.length,
      products: products.length,
      receipts: receipts.length,
      alerts: alerts.length,
      expenses: expenses.length,
      serviceOrders: serviceOrders.length,
    })

    const currentMonth = new Date().getMonth()
    const currentYear = new Date().getFullYear()

    const monthlyReceipts = receipts.filter((receipt) => {
      if (!receipt || !receipt.createdAt) return false

      try {
        const receiptDate = new Date(receipt.createdAt)
        if (isNaN(receiptDate.getTime())) return false

        return receiptDate.getMonth() === currentMonth && receiptDate.getFullYear() === currentYear
      } catch (error) {
        return false
      }
    })

    const totalRevenue = receipts.reduce((sum, receipt) => sum + (receipt.total || 0), 0)
    const totalExpenses = expenses.reduce((sum, expense) => {
      return sum + (expense.amount || 0)
    }, 0)
    const netProfit = totalRevenue - totalExpenses

    const stats = {
      totalSuppliers: suppliers.length || 0,
      totalClients: clients.length || 0,
      totalProducts: products.length || 0,
      monthlyReceipts: monthlyReceipts.length || 0,
      unreadAlerts: alerts.filter((alert) => alert && !alert.isRead).length || 0,
      totalRevenue,
      totalExpenses,
      netProfit,
      totalServiceOrders: serviceOrders.length || 0,
    }

    console.log("[v0] Dashboard stats calculated:", stats)
    return stats
  } catch (error) {
    console.error("[v0] Error getting dashboard stats:", error)
    return {
      totalSuppliers: 0,
      totalClients: 0,
      totalProducts: 0,
      monthlyReceipts: 0,
      unreadAlerts: 0,
      totalRevenue: 0,
      totalExpenses: 0,
      netProfit: 0,
      totalServiceOrders: 0,
    }
  }
}

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
  const { client_id, supplier_id, has_invoice, ...rest } = receipt
  return {
    ...rest,
    ...(client_id && { clientId: client_id }),
    ...(supplier_id && { supplierId: supplier_id }),
    ...(has_invoice !== undefined && { hasInvoice: has_invoice }),
  }
}











