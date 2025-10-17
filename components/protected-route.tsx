"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase/client"
import type { Role } from "@/lib/rbac"

interface ProtectedRouteProps {
  children: React.ReactNode
  allowedRoles?: Role[]
  fallback?: React.ReactNode
}

export function ProtectedRoute({ children, allowedRoles, fallback }: ProtectedRouteProps) {
  const router = useRouter()
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null)
  const [userRole, setUserRole] = useState<Role | null>(null)

  useEffect(() => {
    checkAuthorization()
  }, [])

  const checkAuthorization = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push("/auth/login")
        return
      }

      // Fetch user role from users table
      const { data: userData, error } = await supabase.from("users").select("role").eq("id", user.id).single()

      if (error || !userData) {
        console.error("Error fetching user role:", error)
        setIsAuthorized(false)
        return
      }

      const role = userData.role as Role
      setUserRole(role)

      // Check if user has required role
      if (allowedRoles && !allowedRoles.includes(role)) {
        setIsAuthorized(false)
        return
      }

      setIsAuthorized(true)
    } catch (error) {
      console.error("Authorization error:", error)
      setIsAuthorized(false)
    }
  }

  if (isAuthorized === null) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Verificando permissões...</p>
        </div>
      </div>
    )
  }

  if (!isAuthorized) {
    return (
      fallback || (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-red-600 mb-2">Acesso Negado</h1>
            <p className="text-gray-600">Você não tem permissão para acessar esta página.</p>
            <p className="text-sm text-gray-500 mt-2">Seu nível de acesso: {userRole}</p>
          </div>
        </div>
      )
    )
  }

  return <>{children}</>
}
