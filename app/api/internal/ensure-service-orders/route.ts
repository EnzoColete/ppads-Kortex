import { NextResponse } from "next/server"
import { ensureServiceOrdersSchema } from "@/lib/server/ensure-service-orders"

export const runtime = "nodejs"

export async function POST() {
  try {
    await ensureServiceOrdersSchema()
    return NextResponse.json({ status: "ok" })
  } catch (error) {
    console.error("Failed to ensure service orders schema:", error)
    const detail = error instanceof Error ? error.message : String(error)
    return NextResponse.json(
      { status: "error", message: "Failed to ensure service orders schema", detail },
      { status: 500 },
    )
  }
}
