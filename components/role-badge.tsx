import { Badge } from "@/components/ui/badge"
import type { Role } from "@/lib/rbac"

interface RoleBadgeProps {
  role: Role
}

export function RoleBadge({ role }: RoleBadgeProps) {
  const roleConfig: Record<Role, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    admin: { label: "Administrador", variant: "destructive" },
    technician: { label: "Técnico", variant: "default" },
    client: { label: "Cliente", variant: "secondary" },
  }

  const config = roleConfig[role]

  return <Badge variant={config.variant}>{config.label}</Badge>
}
