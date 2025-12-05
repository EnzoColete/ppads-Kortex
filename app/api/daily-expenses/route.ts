import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { runQuery } from "@/lib/server/db"

const CATEGORY_LABELS: Record<string, string> = {
  alimentacao: "Alimentação",
  combustivel: "Combustível",
  pedagio: "Pedágio",
  fornecedor: "Fornecedor",
}

function normalizeCategory(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .trim()
}

function mapCategoryForDisplay(value: string) {
  const normalized = normalizeCategory(value)
  return CATEGORY_LABELS[normalized] ?? value
}

function unauthorized() {
  return NextResponse.json({ error: "Não autenticado." }, { status: 401 })
}

function isAdmin(role?: string | null) {
  return (role ?? "").toUpperCase() === "ADMIN"
}

let categorySchemaRelaxed = false

async function ensureCategoryIsFlexible() {
  if (categorySchemaRelaxed) return

  try {
    await runQuery(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM information_schema.table_constraints
          WHERE constraint_name = 'daily_expenses_category_check'
            AND table_name = 'daily_expenses'
            AND table_schema = 'public'
        ) THEN
          ALTER TABLE public.daily_expenses DROP CONSTRAINT daily_expenses_category_check;
        END IF;

        IF EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'daily_expenses'
            AND column_name = 'category'
            AND data_type <> 'character varying'
        ) THEN
          ALTER TABLE public.daily_expenses ALTER COLUMN category TYPE varchar(100) USING category::text;
        END IF;

        IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'daily_expense_category') THEN
          DROP TYPE daily_expense_category;
        END IF;
      END
      $$;
    `)
    categorySchemaRelaxed = true
  } catch (error) {
    console.error("Failed to relax daily_expenses.category constraint:", error)
  }
}

export async function GET() {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return unauthorized()
    }

    const admin = isAdmin(currentUser.role)
    const params: any[] = []
    let whereClause = ""

    if (!admin) {
      whereClause = "WHERE user_id = $1::uuid"
      params.push(currentUser.id)
    }

    const { rows } = await runQuery(
      `
        SELECT id,
               date,
               category,
               amount,
               observations,
               supplier_id,
               supplier_name,
               created_at,
               updated_at,
               user_id
          FROM public.daily_expenses
          ${whereClause}
         ORDER BY date DESC
      `,
      params,
    )

    const data = rows.map((row) => ({
      id: row.id,
      date: row.date,
      category: mapCategoryForDisplay(row.category),
      amount: Number(row.amount ?? 0),
      observations: row.observations ?? undefined,
      supplierId: row.supplier_id ?? undefined,
      supplierName: row.supplier_name ?? undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      userId: row.user_id ?? null,
    }))

    return NextResponse.json({ data })
  } catch (error) {
    console.error("GET /api/daily-expenses failed:", error)
    return NextResponse.json({ error: "Erro inesperado ao listar despesas." }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return unauthorized()
    }

    const payload = await request.json()

    if (!payload || typeof payload !== "object") {
      return NextResponse.json({ error: "Payload invalido." }, { status: 400 })
    }

    if (!payload.date || !payload.category || payload.amount === undefined) {
      return NextResponse.json({ error: "Data, categoria e valor sao obrigatorios." }, { status: 400 })
    }

    await ensureCategoryIsFlexible()

    const rawCategory = String(payload.category ?? "").trim()
    if (!rawCategory) {
      return NextResponse.json({ error: "Categoria invalida." }, { status: 400 })
    }

    const category = rawCategory
    const amount = Number(payload.amount)
    if (Number.isNaN(amount) || amount <= 0) {
      return NextResponse.json({ error: "Valor invalido." }, { status: 400 })
    }

    if (payload.supplierId) {
      const { rows } = await runQuery<{ user_id: string }>(
        "SELECT user_id FROM public.suppliers WHERE id = $1::uuid LIMIT 1",
        [payload.supplierId],
      )

      if (rows.length === 0) {
        return NextResponse.json({ error: "Fornecedor nao encontrado." }, { status: 404 })
      }

      if (rows[0].user_id !== currentUser.id && !isAdmin(currentUser.role)) {
        return NextResponse.json({ error: "Fornecedor nao pertence ao usuario atual." }, { status: 403 })
      }
    }

    const { rows } = await runQuery(
      `
        INSERT INTO public.daily_expenses (
          user_id,
          date,
          category,
          amount,
          observations,
          supplier_id,
          supplier_name
        )
        VALUES ($1::uuid, $2::date, $3, $4, $5, $6::uuid, $7)
        RETURNING *
      `,
      [
        currentUser.id,
        payload.date,
        category,
        amount,
        payload.observations ?? null,
        payload.supplierId || null,
        payload.supplierName ?? null,
      ],
    )

    const expense = rows[0]

    return NextResponse.json({
      data: {
        id: expense.id,
        date: expense.date,
        category: mapCategoryForDisplay(expense.category),
        amount: Number(expense.amount ?? 0),
        observations: expense.observations ?? undefined,
        supplierId: expense.supplier_id ?? undefined,
        supplierName: expense.supplier_name ?? undefined,
        createdAt: expense.created_at,
        updatedAt: expense.updated_at,
        userId: expense.user_id ?? null,
      },
    })
  } catch (error) {
    console.error("POST /api/daily-expenses failed:", error)
    const message = error instanceof Error ? error.message : "Erro inesperado ao salvar despesa."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
