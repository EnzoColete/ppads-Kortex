import { unstable_cache } from "next/cache"
import { getCurrentUser } from "@/lib/auth"
import { runQuery } from "@/lib/server/db"

type DashboardStats = {
  totalSuppliers: number
  totalClients: number
  totalProducts: number
  monthlyReceipts: number
  unreadAlerts: number
  totalRevenue: number
  totalExpenses: number
  netProfit: number
  totalServiceOrders: number
  dbConnected: boolean
}

const buildOwnershipFilter = (isAdmin: boolean, startIndex: number, userId?: string) => {
  if (isAdmin || !userId) {
    return { clause: "", params: [], nextIndex: startIndex }
  }

  return { clause: `user_id = $${startIndex}::uuid`, params: [userId], nextIndex: startIndex + 1 }
}

async function fetchDashboardStats(userId: string, isAdmin: boolean): Promise<DashboardStats> {
  const supplierFilter = buildOwnershipFilter(isAdmin, 1, userId)
  const clientFilter = buildOwnershipFilter(isAdmin, 1, userId)
  const productFilter = buildOwnershipFilter(isAdmin, 1, userId)
  const receiptFilter = buildOwnershipFilter(isAdmin, 1, userId)
  const expenseFilter = buildOwnershipFilter(isAdmin, 1, userId)
  const serviceOrderFilter = buildOwnershipFilter(isAdmin, 1, userId)

  const dashboardPromises = await Promise.allSettled([
    runQuery<{ count: number }>(
      `SELECT COUNT(*)::int AS count FROM public.suppliers ${supplierFilter.clause ? `WHERE ${supplierFilter.clause}` : ""}`,
      supplierFilter.params,
    ),
    runQuery<{ count: number }>(
      `SELECT COUNT(*)::int AS count FROM public.clients ${clientFilter.clause ? `WHERE ${clientFilter.clause}` : ""}`,
      clientFilter.params,
    ),
    runQuery<{ count: number }>(
      `SELECT COUNT(*)::int AS count FROM public.products ${productFilter.clause ? `WHERE ${productFilter.clause}` : ""}`,
      productFilter.params,
    ),
    runQuery<{ count: number }>(
      `
        SELECT COUNT(*)::int AS count
          FROM public.receipts
          ${receiptFilter.clause ? `WHERE ${receiptFilter.clause} AND` : "WHERE"}
                date_trunc('month', created_at) = date_trunc('month', now())
      `,
      receiptFilter.params,
    ),
    runQuery<{ sum: number }>(
      `
        SELECT COALESCE(SUM(total), 0)::float AS sum
          FROM public.receipts
          ${receiptFilter.clause ? `WHERE ${receiptFilter.clause}` : ""}
      `,
      receiptFilter.params,
    ),
    runQuery<{ sum: number }>(
      `
        SELECT COALESCE(SUM(amount), 0)::float AS sum
          FROM public.daily_expenses
          ${expenseFilter.clause ? `WHERE ${expenseFilter.clause}` : ""}
      `,
      expenseFilter.params,
    ),
    runQuery<{ count: number }>(
      `SELECT COUNT(*)::int AS count FROM public.service_orders ${serviceOrderFilter.clause ? `WHERE ${serviceOrderFilter.clause}` : ""}`,
      serviceOrderFilter.params,
    ),
    runQuery<{ count: number }>(`SELECT COUNT(*)::int AS count FROM public.alerts WHERE is_read = false`),
  ])

  const [suppliers, clients, products, monthlyReceipts, revenue, expenses, serviceOrders, unreadAlerts] =
    dashboardPromises.map((result) => {
      if (result.status === "fulfilled") {
        return result.value.rows[0]
      }
      console.error("[dashboard] Failed to resolve stats chunk:", result.reason)
      return undefined
    })

  const normalize = (value?: number | string | null) =>
    typeof value === "string" ? Number(value) : value ?? 0

  const stats: DashboardStats = {
    totalSuppliers: normalize(suppliers?.count),
    totalClients: normalize(clients?.count),
    totalProducts: normalize(products?.count),
    monthlyReceipts: normalize(monthlyReceipts?.count),
    unreadAlerts: normalize(unreadAlerts?.count),
    totalRevenue: normalize(revenue?.sum),
    totalExpenses: normalize(expenses?.sum),
    netProfit: normalize(revenue?.sum) - normalize(expenses?.sum),
    totalServiceOrders: normalize(serviceOrders?.count),
    dbConnected: dashboardPromises.every((result) => result.status === "fulfilled"),
  }

  return stats
}

export async function getDashboardStats(userId: string, isAdmin: boolean) {
  const cached = unstable_cache(
    async () => fetchDashboardStats(userId, isAdmin),
    ["dashboard-stats", userId, isAdmin ? "admin" : "user"],
    { revalidate: 30 },
  )

  return cached()
}

export async function getDashboardStatsForCurrentUser() {
  const user = await getCurrentUser()
  if (!user) {
    throw new Error("Usuário não autenticado")
  }

  const isAdmin = (user.role ?? "").toUpperCase() === "ADMIN"
  return getDashboardStats(user.id, isAdmin)
}
