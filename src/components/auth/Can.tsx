// Can.tsx: Component for checking user permissions and roles
"use client"

import { ReactNode } from "react"
import { useAuthStore } from "@/store/authStore"

interface CanProps {
  permissions?: string[]
  roles?: string[]
  children: ReactNode
  fallback?: ReactNode // what to render if not authorized
}

export default function Can({ permissions = [], roles = [], children, fallback = null }: CanProps) {
  const userPermissions = useAuthStore((s) => s.permissions)
  const activeRole = useAuthStore((s) => s.activeRole)
  const userRoles = activeRole ? [activeRole.title] : []

  // Permission check
  const hasPermission =
    permissions.length === 0 || permissions.some((p) => userPermissions.includes(p))

  // Role check
  const hasRole =
    roles.length === 0 || roles.some((r) => userRoles.includes(r))

  // if (hasPermission && hasRole)

  const isAllowed = hasPermission && hasRole
  return <>{isAllowed ? children : fallback}</>
}

// Export hook for programmatic permission checking
export function usePermissions() {
  const userPermissions = useAuthStore((s) => s.permissions)
  const activeRole = useAuthStore((s) => s.activeRole)
  const userRoles = activeRole ? [activeRole.title] : []

  const hasPermission = (permissions: string[] = []) => {
    if (permissions.length === 0) return true
    return permissions.some((p) => userPermissions.includes(p))
  }

  const hasRole = (roles: string[] = []) => {
    if (roles.length === 0) return true
    return roles.some((r) => userRoles.includes(r))
  }
  return { hasPermission, hasRole, userPermissions, userRoles }
}
