import { NextResponse } from "next/server"
import { serviceOrderStorage } from "@/lib/storage"
import { logApiRequest, logApiResponse, logApiError } from "@/lib/api-logger"
import { requirePermission } from "@/lib/rbac"
import { logger } from "@/lib/logger"

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const { startTime } = await logApiRequest(request)
  const { id } = params

  try {
    await requirePermission("service_orders", "read")

    const order = await serviceOrderStorage.getById(id)

    if (!order) {
      logApiResponse("GET", `/api/service-orders/${id}`, 404, startTime)
      return NextResponse.json({ error: "Service order not found" }, { status: 404 })
    }

    logApiResponse("GET", `/api/service-orders/${id}`, 200, startTime)
    return NextResponse.json(order)
  } catch (error) {
    logApiError("GET", `/api/service-orders/${id}`, error as Error)
    return NextResponse.json({ error: "Failed to fetch service order" }, { status: 500 })
  }
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const { startTime } = await logApiRequest(request)
  const { id } = params

  try {
    await requirePermission("service_orders", "update")

    const body = await request.json()
    const order = await serviceOrderStorage.update(id, body)

    if (!order) {
      logApiResponse("PATCH", `/api/service-orders/${id}`, 404, startTime)
      return NextResponse.json({ error: "Service order not found" }, { status: 404 })
    }

    logger.logBusinessEvent("service_order_updated", {
      orderId: order.id,
      orderNumber: order.orderNumber,
      changes: Object.keys(body),
    })

    logApiResponse("PATCH", `/api/service-orders/${id}`, 200, startTime)
    return NextResponse.json(order)
  } catch (error) {
    logApiError("PATCH", `/api/service-orders/${id}`, error as Error)
    return NextResponse.json({ error: "Failed to update service order" }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const { startTime } = await logApiRequest(request)
  const { id } = params

  try {
    await requirePermission("service_orders", "delete")

    const success = await serviceOrderStorage.delete(id)

    if (!success) {
      logApiResponse("DELETE", `/api/service-orders/${id}`, 404, startTime)
      return NextResponse.json({ error: "Service order not found" }, { status: 404 })
    }

    logger.logBusinessEvent("service_order_deleted", {
      orderId: id,
    })

    logApiResponse("DELETE", `/api/service-orders/${id}`, 200, startTime)
    return NextResponse.json({ success: true })
  } catch (error) {
    logApiError("DELETE", `/api/service-orders/${id}`, error as Error)
    return NextResponse.json({ error: "Failed to delete service order" }, { status: 500 })
  }
}
