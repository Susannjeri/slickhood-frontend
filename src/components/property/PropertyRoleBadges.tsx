"use client";

import { usePropertyPermissions } from "@/components/auth/CanProperty";

interface PropertyRoleBadgesProps {
  propertyId: number;
}

export default function PropertyRoleBadges({ propertyId }: PropertyRoleBadgesProps) {
  const { getPropertyRoles } = usePropertyPermissions(propertyId);
  const roles = getPropertyRoles();

  if (roles.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5">
      {roles.map((role, index) => (
        <span
          key={index}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-medium text-xs"
          style={{
            backgroundColor: role === "Landlord" ? "#141130" : "#FEE2E2",
            color: role === "Landlord" ? "#FFFFFF" : "#EF4217"
          }}
        >
          {role === "Landlord" && "  "}
          {role.replace(/([A-Z])/g, ' $1').trim()}
        </span>
      ))}
    </div>
  );
}