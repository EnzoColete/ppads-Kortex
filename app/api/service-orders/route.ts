
import { NextResponse } from "next/server"
import { z } from "zod"
import { getCurrentUser } from "@/lib/auth"
import { requirePermission } from "@/lib/rbac"
import { serviceOrdersRepository } from "@/lib/server/service-orders-repository"

const serviceOrderSchema = z
  .object({
    orderNumber: z.string().trim().min(1, "Numero da OS obrigatorio").optional(),
    clientId: z
      .string({
        required_error: "Cliente obrigatorio",
        invalid_type_error: "Cliente invalido",
      })
      .trim()
      .uuid("Cliente invalido"),
    assignedTo: z.string().trim().uuid().optional().nullable(),
    status: z.enum(["pending", "in_progress", "completed", "cancelled"]).default("pending"),
    title: z
      .string({
        required_error: "Titulo obrigatorio",
        invalid_type_error: "Titulo invalido",
      })
      .trim()
      .min(1, "Informe um titulo para a ordem"),
    description: z.string().trim().optional(),
    priority: z.enum(["low", "medium", "high", "urgent"]).optional().nullable(),
    scheduledDate: z.string().trim().optional().nullable(),
    completedDate: z.string().trim().optional().nullable(),
    totalValue: z.coerce.number().min(0),
    notes: z.string().trim().optional().nullable(),
    items: z
      .array(
        z.object({
          productId: z.string().trim().uuid().optional().nullable(),
          description: z.string().trim().min(1, "Descricao obrigatoria"),
          quantity: z.coerce.number().min(0),
          unitPrice: z.coerce.number().min(0),
          total: z.coerce.number().min(0),
        }),
      )
      .default([]),
  })
  .transform((data) => ({
    ...data,
    orderNumber: data.orderNumber ?? `OS-${Date.now()}`,
  }))

export async function GET(request: Request) {
  try {
    const currentUser = await getCurrentUser()
    const normalizedRole = currentUser?.role?.trim().toLowerCase()

    if (!currentUser || normalizedRole !== "client") {
      await requirePermission("service_orders", "read")
    }

    const orders = await serviceOrdersRepository.getAll()
    return NextResponse.json({ data: orders })
  } catch (error) {
    console.error("GET /api/service-orders failed:", error)
    const message = error instanceof Error ? error.message : "Failed to fetch service orders"
    const status = message.toLowerCase().includes("acesso negado") ? 403 : 500
    return NextResponse.json({ error: message }, { status })
  }
}

export async function POST(request: Request) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json({ error: "Acesso negado: faca login para criar ordens de servico." }, { status: 401 })
    }

    const body = await request.json()
    const parsed = serviceOrderSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Payload invalido.", details: parsed.error.flatten() },
        { status: 400 },
      )
    }

    const order = await serviceOrdersRepository.create(parsed.data)

    return NextResponse.json({ data: order }, { status: 201 })
  } catch (error) {
    console.error("POST /api/service-orders failed:", error)
    const message = error instanceof Error ? error.message : "Failed to create service order"
    const lowered = message.toLowerCase()
    let status = 500
    if (lowered.includes("acesso negado")) {
      status = 403
    } else if (
      lowered.includes("cliente") ||
      lowered.includes("produto") ||
      lowered.includes("numero de os") ||
      lowered.includes("numero da os") ||
      lowered.includes("numero de ordem") ||
      lowered.includes("numero da ordem") ||
      lowered.includes("obrigatorio") ||
      lowered.includes("invalido") ||
      lowered.includes("descricao obrigatoria")
    ) {
      status = 400
    }
    return NextResponse.json({ error: message }, { status })
  }
}
