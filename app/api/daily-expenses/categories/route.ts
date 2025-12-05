import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { runQuery } from "@/lib/server/db"

const CATEGORY_LABELS: Record<string, string> = {
  alimentacao: "Alimentação",
  combustivel: "Combustível",
  pedagio: "Pedágio",
  fornecedor: "Fornecedor",
}

const normalizeCategory = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .trim()

const mapCategoryForDisplay = (value: string) => CATEGORY_LABELS[normalizeCategory(value)] ?? value

const unauthorized = () => NextResponse.json({ error: "Não autenticado." }, { status: 401 })

const isAdmin = (role?: string | null) => (role ?? "").toUpperCase() === "ADMIN"

export async function GET() {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) return unauthorized()

    const admin = isAdmin(currentUser.role)
    const params: any[] = []
    let whereClause = ""

    if (!admin) {
      whereClause = "WHERE user_id = $1::uuid"
      params.push(currentUser.id)
    }

    const { rows } = await runQuery(
      `
        SELECT DISTINCT category
          FROM public.daily_expenses
          ${whereClause}
         ORDER BY category ASC
      `,
      params,
    )

    const data = rows.map((row) => mapCategoryForDisplay(row.category))
    return NextResponse.json({ data })
  } catch (error) {
    console.error("GET /api/daily-expenses/categories failed:", error)
    return NextResponse.json({ error: "Erro ao listar categorias." }, { status: 500 })
  }
}
