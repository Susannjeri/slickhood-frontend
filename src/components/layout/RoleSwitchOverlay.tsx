"use client";

import { useAuthStore } from "@/store/authStore";
import { cn } from "@/lib/utils";

export default function RoleSwitchOverlay() {
  const switching = useAuthStore((s) => s.switching);

  return (
    <div
      className={cn(
        "absolute inset-0 z-40",
        "bg-white/50 backdrop-blur-sm",
        "flex items-center justify-center",
        "transition-opacity duration-300 pointer-events-none",
        switching ? "opacity-100" : "opacity-0"
      )}
    >
      <div className="flex items-center gap-2">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="block w-2 h-2 rounded-full animate-bounce"
            style={{
              backgroundColor: "#EF4217",
              animationDelay: `${i * 120}ms`,
            }}
          />
        ))}
      </div>
    </div>
  );
}