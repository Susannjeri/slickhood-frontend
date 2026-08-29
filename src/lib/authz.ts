import { Role } from "@/types/auth";

/**
 * GLOBAL RBAC
 */

export function hasPermission(
  roles: Role[],
  permission: string
): boolean {
  return roles.some(role =>
    role.permissions.includes(permission)
  );
}

export function hasAnyPermission(
  roles: Role[],
  permissions: string[]
): boolean {
  if (permissions.length === 0) return true;
  return permissions.some(p => hasPermission(roles, p));
}

/**
 * ABAC (resource ownership / association)
 */

export function hasPropertyAccess(
  roles: Role[],
  propertyId: number
): boolean {
  return roles.some(role =>
    role.properties.includes(propertyId)
  );
}

/**
 * RBAC + ABAC combined
 */

export function hasPropertyPermission(
  roles: Role[],
  propertyId: number,
  permissions: string[]
): boolean {
  if (permissions.length === 0) {
    return hasPropertyAccess(roles, propertyId);
  }

  return roles.some(role =>
    role.properties.includes(propertyId) &&
    permissions.some(p => role.permissions.includes(p))
  );
}
