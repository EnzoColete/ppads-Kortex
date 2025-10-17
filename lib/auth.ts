import { createClient } from "@/lib/supabase/server"
import type { User } from "@/lib/types"

export async function getCurrentUser(): Promise<User | null> {
  const supabase = await createClient()

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()

  if (!authUser) return null

  // Fetch user details from users table
  const { data: userData, error } = await supabase.from("users").select("*").eq("id", authUser.id).single()

  if (error || !userData) return null

  return {
    id: userData.id,
    email: userData.email,
    name: userData.name,
    role: userData.role,
    createdAt: new Date(userData.created_at),
    updatedAt: new Date(userData.updated_at),
  }
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
}

export async function hasRole(roles: string[]): Promise<boolean> {
  const user = await getCurrentUser()
  if (!user) return false
  return roles.includes(user.role)
}
