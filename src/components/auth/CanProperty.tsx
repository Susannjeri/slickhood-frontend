// // components/auth/CanProperty.tsx
// "use client";

// import { ReactNode } from "react";
// import { useAuthStore } from "@/store/authStore";

// interface CanPropertyProps {
//   propertyId: number;
//   permissions?: string[];
//   children: ReactNode;
//   fallback?: ReactNode;
// }

// export default function CanProperty({
//   propertyId,
//   permissions = [],
//   children,
//   fallback = null,
// }: CanPropertyProps) {
//   const activeRole = useAuthStore((state) => state.activeRole);

//   // Does the active role have access to this property?
//   if (!activeRole || !activeRole.properties.includes(propertyId)) {
//     return <>{fallback}</>;
//   }

//   // No specific permissions required — having access is enough
//   if (permissions.length === 0) {
//     return <>{children}</>;
//   }

//   const hasPermission = permissions.some(perm =>
//     activeRole.permissions.includes(perm)
//   );

//   return hasPermission ? <>{children}</> : <>{fallback}</>;
// }

// export function usePropertyPermissions(propertyId: number) {
//   const activeRole = useAuthStore((state) => state.activeRole);
//   // Keep roles in scope for getPropertyRoles — explained below
//   const roles = useAuthStore((state) => state.roles);

//   /**
//    * Checks if the ACTIVE role has access to this property
//    * AND has any of the required permissions.
//    */
//   const checkPermissions = (permissions: string[]): boolean => {
//     if (!activeRole || !activeRole.properties.includes(propertyId)) return false;
//     if (permissions.length === 0) return true;
//     return permissions.some(perm => activeRole.permissions.includes(perm));
//   };

//   /**
//    * Does the active role have access to this property at all?
//    */
//   const hasPropertyAccess = (): boolean => {
//     if (!activeRole) return false;
//     return activeRole.properties.includes(propertyId);
//   };

//   /**
//    * Returns role titles for this property scoped to the active role only.
//    * A single-element array when the active role covers this property,
//    * empty when it doesn't.
//    *
//    * We intentionally do NOT return all roles for the property here —
//    * that was the source of the bug. The badge should only show what
//    * the currently active role means for this property.
//    */
//   const getPropertyRoles = (): string[] => {
//     if (!activeRole || !activeRole.properties.includes(propertyId)) return [];
//     return [activeRole.title];
//   };

//   /**
//    * Returns the active role's permissions for this property.
//    */
//   const getPropertyPermissions = (): string[] => {
//     if (!activeRole || !activeRole.properties.includes(propertyId)) return [];
//     return [...new Set(activeRole.permissions)];
//   };

//   return {
//     checkPermissions,
//     hasPropertyAccess,
//     getPropertyRoles,
//     getPropertyPermissions,
//   };
// }

// components/auth/CanProperty.tsx
"use client";

import { ReactNode } from "react";
import { useAuthStore } from "@/store/authStore";

interface CanPropertyProps {
  propertyId: number;
  permissions?: string[];
  children: ReactNode;
  fallback?: ReactNode;
}

export default function CanProperty({
  propertyId,
  permissions = [],
  children,
  fallback = null,
}: CanPropertyProps) {
  const activeRole = useAuthStore((state) => state.activeRole);

  // Does the active role have access to this property?
  const hasProperty =
    activeRole?.propertyIds?.includes(propertyId) ?? false;

  if (!hasProperty) {
    return <>{fallback}</>;
  }

  // No specific permissions required — having access is enough
  if (permissions.length === 0) {
    return <>{children}</>;
  }

  const hasPermission = permissions.some((permission) =>
    activeRole?.permissions.includes(permission)
  );

  return hasPermission ? <>{children}</> : <>{fallback}</>;
}

export function usePropertyPermissions(propertyId: number) {
  const activeRole = useAuthStore((state) => state.activeRole);

  /**
   * Checks whether the active role has access to this property.
   */
  const hasPropertyAccess = (): boolean => {
    if (!activeRole) return false;
    return activeRole.propertyIds?.includes(propertyId) ?? false;
  };

  /**
   * Checks whether the active role has at least one of the supplied permissions.
   */
  const checkPermissions = (permissions: string[]): boolean => {
    if (!hasPropertyAccess()) return false;

    if (permissions.length === 0) return true;

    return permissions.some((permission) =>
      activeRole!.permissions.includes(permission)
    );
  };

  /**
   * Returns the active role title for this property.
   */
  const getPropertyRoles = (): string[] => {
    if (!hasPropertyAccess()) return [];
    return [activeRole!.title];
  };

  /**
   * Returns the permissions available to the active role for this property.
   */
  const getPropertyPermissions = (): string[] => {
    if (!hasPropertyAccess()) return [];
    return [...new Set(activeRole!.permissions)];
  };

  /**
   * Returns the property name for the current property, if available.
   */
  const getPropertyName = (): string | undefined => {
    if (!activeRole || !hasPropertyAccess()) return undefined;

    const index = activeRole.propertyIds?.indexOf(propertyId);

    return index !== undefined && index >= 0
      ? activeRole.propertyNames?.[index]
      : undefined;
  };

  return {
    checkPermissions,
    hasPropertyAccess,
    getPropertyRoles,
    getPropertyPermissions,
    getPropertyName,
  };
}