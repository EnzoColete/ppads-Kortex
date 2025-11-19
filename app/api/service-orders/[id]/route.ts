import { NextResponse } from "next/server"
import { logApiRequest, logApiResponse, logApiError } from "@/lib/api-logger"
import { getCurrentUser } from "@/lib/auth"
import { logger } from "@/lib/logger"
import { serviceOrdersRepository } from "@/lib/server/service-orders-repository"

function isAdmin(role?: string | null) {
  return (role ?? "").toUpperCase() === "ADMIN"
}

function unauthorized() {
  return NextResponse.json({ error: "Acesso negado: faca login para acessar ordens de servico." }, { status: 401 })
}

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const { startTime } = await logApiRequest(request)
  const { id } = params

  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      logApiResponse("GET", `/api/service-orders/${id}`, 401, startTime)
      return unauthorized()
    }

    const order = await serviceOrdersRepository.getById(id, {
      userId: currentUser.id,
      isAdmin: isAdmin(currentUser.role),
    })

    if (!order) {
      logApiResponse("GET", `/api/service-orders/${id}`, 404, startTime)
      return NextResponse.json({ error: "Service order not found" }, { status: 404 })
    }

    logApiResponse("GET", `/api/service-orders/${id}`, 200, startTime)
    return NextResponse.json(order)
  } catch (error) {
    logApiError("GET", `/api/service-orders/${id}`, error as Error)
    const message = error instanceof Error ? error.message : "Failed to fetch service order"
    const status = message.toLowerCase().includes("acesso negado") ? 403 : 500
    return NextResponse.json({ error: message }, { status })
  }
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const { startTime } = await logApiRequest(request)
  const { id } = params

  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      logApiResponse("PATCH", `/api/service-orders/${id}`, 401, startTime)
      return unauthorized()
    }

    const body = await request.json()
    const order = await serviceOrdersRepository.update(id, body, {
      userId: currentUser.id,
      isAdmin: isAdmin(currentUser.role),
    })

    if (!order) {
      logApiResponse("PATCH", `/api/service-orders/${id}`, 404, startTime)
      return NextResponse.json({ error: "Service order not found" }, { status: 404 })
    }

    logger.logBusinessEvent("service_order_updated", {
      orderId: order.id,
      orderNumber: order.orderNumber,
      changes: Object.keys(body || {}),
    })

    logApiResponse("PATCH", `/api/service-orders/${id}`, 200, startTime)
    return NextResponse.json(order)
  } catch (error) {
    logApiError("PATCH", `/api/service-orders/${id}`, error as Error)
    const message = error instanceof Error ? error.message : "Failed to update service order"
    const status = message.toLowerCase().includes("acesso negado") ? 403 : 500
    return NextResponse.json({ error: message }, { status })
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const { startTime } = await logApiRequest(request)
  const { id } = params

  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      logApiResponse("DELETE", `/api/service-orders/${id}`, 401, startTime)
      return unauthorized()
    }

    const success = await serviceOrdersRepository.delete(id, {
      userId: currentUser.id,
      isAdmin: isAdmin(currentUser.role),
    })

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
    const message = error instanceof Error ? error.message : "Failed to delete service order"
    const status = message.toLowerCase().includes("acesso negado") ? 403 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
