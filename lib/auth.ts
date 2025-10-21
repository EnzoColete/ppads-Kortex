import { createClient } from "@/lib/supabase/server"
import type { User } from "@/lib/types"

export async function getCurrentUser(): Promise<User | null> {
  const supabase = await createClient()

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()

  if (!authUser) return null

  // Fetch user details from users table
  const { data: userData, error } = await supabase
    .from("users")
    .select("id, email, full_name, role, email_verified, created_at, updated_at")
    .eq("email", authUser.email?.toLowerCase())
    .single()

  if (error || !userData) return null

  return {
    id: userData.id,
    email: userData.email,
    fullName: userData.full_name,
    role: userData.role,
    emailVerified: userData.email_verified,
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
