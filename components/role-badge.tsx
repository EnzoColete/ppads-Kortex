import { Badge } from "@/components/ui/badge"
import type { Role } from "@/lib/rbac"

interface RoleBadgeProps {
  role: Role
}

export function RoleBadge({ role }: RoleBadgeProps) {
  const roleConfig: Record<Role, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    ADMIN: { label: "Administrador", variant: "destructive" },
    USER: { label: "Usuário", variant: "default" },
  }

  const config = roleConfig[role]

  return <Badge variant={config.variant}>{config.label}</Badge>
}
