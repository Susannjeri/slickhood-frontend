"use client";

import { useAuthStore } from "@/store/authStore";
import type { Role } from "@/store/authStore";
import { roleDisplayName } from "@/config/businessAreas";

export default function RoleSwitcher() {
  const roles = useAuthStore((s) => s.roles);
  const activeRole = useAuthStore((s) => s.activeRole);
  const setActiveRole = useAuthStore((s) => s.setActiveRole);

  if (!roles || roles.length <= 1) {
    // Single role — just show it statically, no switcher needed
    return (
      <span className="text-xs text-muted-foreground truncate">
        {roleDisplayName(activeRole?.title) || "Account"}
      </span>
    );
  }

  return (
    <select
      value={activeRole?.title ?? ""}
      onChange={(e) => {
        const selected = roles.find((r: Role) => r.title === e.target.value);
        if (selected) setActiveRole(selected);
      }}
      onClick={(e) => e.stopPropagation()} // prevent collapsible from toggling
      className="text-xs bg-transparent text-muted-foreground border-none outline-none cursor-pointer w-full truncate"
    >
      {roles.map((role: Role) => (
        <option key={role.title} value={role.title}>
          {roleDisplayName(role.title)}
        </option>
      ))}
    </select>
  );
}
