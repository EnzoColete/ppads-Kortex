import { NextResponse } from "next/server"
import { logApiRequest, logApiResponse, logApiError } from "@/lib/api-logger"
import { requirePermission } from "@/lib/rbac"
import { getCurrentUser } from "@/lib/auth"
import { logger } from "@/lib/logger"
import { serviceOrdersRepository } from "@/lib/server/service-orders-repository"

export async function GET(request: Request) {
  const { startTime } = await logApiRequest(request)

  try {
    await requirePermission("service_orders", "read")

    const orders = await serviceOrdersRepository.getAll()

    logger.logBusinessEvent("service_orders_listed", {
      count: orders.length,
    })

    logApiResponse("GET", "/api/service-orders", 200, startTime, {
      count: orders.length,
    })

    return NextResponse.json(orders)
  } catch (error) {
    logApiError("GET", "/api/service-orders", error as Error)
    const message = error instanceof Error ? error.message : "Failed to fetch service orders"
    const status = message.toLowerCase().includes("acesso negado") ? 403 : 500
    return NextResponse.json({ error: message }, { status })
  }
}

export async function POST(request: Request) {
  const { startTime } = await logApiRequest(request)

  try {
    const currentUser = await getCurrentUser()
    const normalizedRole = currentUser?.role?.trim().toLowerCase()

    if (normalizedRole !== "client") {
      await requirePermission("service_orders", "create")
    }

    const body = await request.json()
    const order = await serviceOrdersRepository.create(body)

    logger.logBusinessEvent("service_order_created", {
      orderId: order.id,
      orderNumber: order.orderNumber,
      clientId: order.clientId,
      totalValue: order.totalValue,
    })

    logApiResponse("POST", "/api/service-orders", 201, startTime, {
      orderId: order.id,
    })

    return NextResponse.json(order, { status: 201 })
  } catch (error) {
    logApiError("POST", "/api/service-orders", error as Error)
    const message = error instanceof Error ? error.message : "Failed to create service order"
    const status = message.toLowerCase().includes("acesso negado") ? 403 : 500
    return NextResponse.json({ error: message }, { status })
  }
}

