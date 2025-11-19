import { useEffect, useMemo, useState } from "react"
import type { OwnerInfo, User } from "@/lib/types"

type OwnerDirectory = Record<string, OwnerInfo>

export function useOwnerDirectory() {
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [ownerMap, setOwnerMap] = useState<OwnerDirectory>({})
  const [authLoading, setAuthLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    const fetchCurrentUser = async () => {
      try {
        const response = await fetch("/api/auth/me", { credentials: "include" })
        if (!response.ok) {
          setCurrentUser(null)
          return
        }
        const payload = await response.json().catch(() => ({ user: null }))
        if (!cancelled) {
          setCurrentUser(payload?.user ?? null)
        }
      } catch (error) {
        console.error("Failed to load current user:", error)
        if (!cancelled) {
          setCurrentUser(null)
        }
      } finally {
        if (!cancelled) {
          setAuthLoading(false)
        }
      }
    }

    fetchCurrentUser()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!currentUser) return
    setOwnerMap((prev) => ({
      ...prev,
      [currentUser.id]: {
        id: currentUser.id,
        fullName: currentUser.fullName,
        email: currentUser.email,
      },
    }))
  }, [currentUser])

  const isAdmin = (currentUser?.role ?? "").toUpperCase() === "ADMIN"

  useEffect(() => {
    if (!isAdmin) return
    let cancelled = false

    const fetchUsers = async () => {
      try {
        const response = await fetch("/api/users", { credentials: "include" })
        if (!response.ok) return
        const payload = await response.json().catch(() => ({ data: [] }))
        if (cancelled) return
        setOwnerMap((prev) => {
          const next = { ...prev }
          for (const user of payload?.data ?? []) {
            next[user.id] = {
              id: user.id,
              fullName: user.fullName,
              email: user.email,
            }
          }
          return next
        })
      } catch (error) {
        console.error("Failed to load users for owner directory:", error)
      }
    }

    fetchUsers()

    return () => {
      cancelled = true
    }
  }, [isAdmin])

  const getOwnerLabel = (userId?: string | null) => {
    if (!userId) return undefined
    const owner = ownerMap[userId]
    if (!owner) return undefined
    return owner.fullName || owner.email || owner.id
  }

  const owners = useMemo(() => {
    const values = Object.values(ownerMap)
    return values.sort((a, b) => {
      const labelA = (a.fullName || a.email || a.id).toLowerCase()
      const labelB = (b.fullName || b.email || b.id).toLowerCase()
      return labelA.localeCompare(labelB)
    })
  }, [ownerMap])

  return {
    currentUser,
    isAdmin,
    ownerMap,
    loading: authLoading,
    getOwnerLabel,
    owners,
  }
}
