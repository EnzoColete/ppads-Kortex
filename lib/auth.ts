import { cookies } from "next/headers"
import { getUserBySessionToken } from "@/lib/server/auth/session"
import type { User } from "@/lib/types"

export async function getCurrentUser(): Promise<User | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get("auth_token")?.value
  if (!token) return null

  const session = await getUserBySessionToken(token)
  if (!session) return null

  return session.user
}

export async function hasRole(roles: string[]): Promise<boolean> {
  const user = await getCurrentUser()
  if (!user) return false
  return roles.includes((user.role || "").toUpperCase())
}
