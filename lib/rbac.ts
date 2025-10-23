import { getCurrentUser } from "./auth"

export type Role = "admin" | "technician" | "client"

export interface Permission {
  resource: string
  action: "create" | "read" | "update" | "delete"
}

// Define permissions for each role
const rolePermissions: Record<Role, Permission[]> = {
  admin: [
    // Admins have full access to everything
    { resource: "users", action: "create" },
    { resource: "users", action: "read" },
    { resource: "users", action: "update" },
    { resource: "users", action: "delete" },
    { resource: "service_orders", action: "create" },
    { resource: "service_orders", action: "read" },
    { resource: "service_orders", action: "update" },
    { resource: "service_orders", action: "delete" },
    { resource: "clients", action: "create" },
    { resource: "clients", action: "read" },
    { resource: "clients", action: "update" },
    { resource: "clients", action: "delete" },
    { resource: "suppliers", action: "create" },
    { resource: "suppliers", action: "read" },
    { resource: "suppliers", action: "update" },
    { resource: "suppliers", action: "delete" },
    { resource: "products", action: "create" },
    { resource: "products", action: "read" },
    { resource: "products", action: "update" },
    { resource: "products", action: "delete" },
    { resource: "receipts", action: "create" },
    { resource: "receipts", action: "read" },
    { resource: "receipts", action: "update" },
    { resource: "receipts", action: "delete" },
    { resource: "expenses", action: "create" },
    { resource: "expenses", action: "read" },
    { resource: "expenses", action: "update" },
    { resource: "expenses", action: "delete" },
    { resource: "reports", action: "create" },
    { resource: "reports", action: "read" },
  ],
  technician: [
    // Technicians can manage service orders and view clients/products
    { resource: "service_orders", action: "create" },
    { resource: "service_orders", action: "read" },
    { resource: "service_orders", action: "update" },
    { resource: "service_orders", action: "delete" },
    { resource: "clients", action: "read" },
    { resource: "products", action: "read" },
    { resource: "receipts", action: "create" },
    { resource: "receipts", action: "read" },
    { resource: "expenses", action: "create" },
    { resource: "expenses", action: "read" },
    { resource: "reports", action: "read" },
  ],
  client: [
    // Clients can only view their own service orders
    { resource: "service_orders", action: "create" },
    { resource: "service_orders", action: "read" },
    { resource: "service_orders", action: "delete" },
    { resource: "receipts", action: "read" },
  ],
}

export async function checkPermission(resource: string, action: Permission["action"]): Promise<boolean> {
  const user = await getCurrentUser()
  if (!user) return false

  let normalizedRole = (user.role || "").trim().toLowerCase() as Role
  if (!rolePermissions[normalizedRole]) {
    normalizedRole = "client"
  }

  const permissions = rolePermissions[normalizedRole]
  if (process.env.NODE_ENV !== "production") {
    console.debug("[RBAC] user", { email: user.email, role: user.role, normalizedRole, resource, action })
  }

  return permissions.some((p) => p.resource === resource && p.action === action)
}

export async function requirePermission(resource: string, action: Permission["action"]): Promise<void> {
  const hasPermission = await checkPermission(resource, action)
  if (!hasPermission) {
    throw new Error("Acesso negado: você não tem permissão para realizar esta ação")
  }
}

export async function hasRole(roles: Role[]): Promise<boolean> {
  const user = await getCurrentUser()
  if (!user) return false
  return roles.includes(user.role)
}

export async function requireRole(roles: Role[]): Promise<void> {
  const hasRequiredRole = await hasRole(roles)
  if (!hasRequiredRole) {
    throw new Error("Acesso negado: você não tem o nível de acesso necessário")
  }
}

// Helper to check if user is admin
export async function isAdmin(): Promise<boolean> {
  return hasRole(["admin"])
}

// Helper to check if user is technician or admin
export async function isTechnicianOrAdmin(): Promise<boolean> {
  return hasRole(["admin", "technician"])
}
