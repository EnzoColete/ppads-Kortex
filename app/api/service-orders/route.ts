import { NextResponse } from "next/server"
import { serviceOrderStorage } from "@/lib/storage"
import { logApiRequest, logApiResponse, logApiError } from "@/lib/api-logger"
import { requirePermission } from "@/lib/rbac"
import { logger } from "@/lib/logger"

export async function GET(request: Request) {
  const { startTime } = await logApiRequest(request)

  try {
    await requirePermission("service_orders", "read")

    const orders = await serviceOrderStorage.getAll()

    logger.logBusinessEvent("service_orders_listed", {
      count: orders.length,
    })

    logApiResponse("GET", "/api/service-orders", 200, startTime, {
      count: orders.length,
    })

    return NextResponse.json(orders)
  } catch (error) {
    logApiError("GET", "/api/service-orders", error as Error)
    return NextResponse.json({ error: "Failed to fetch service orders" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const { startTime } = await logApiRequest(request)

  try {
    await requirePermission("service_orders", "create")

    const body = await request.json()
    const order = await serviceOrderStorage.create(body)

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
    return NextResponse.json({ error: "Failed to create service order" }, { status: 500 })
  }
}
