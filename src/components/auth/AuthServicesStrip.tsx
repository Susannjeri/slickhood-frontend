import type { ServiceItem } from "@/lib/auth-slider.config";

interface AuthServicesStripProps {
  items: ServiceItem[];
}

export function AuthServicesStrip({ items }: AuthServicesStripProps) {
  return (
    <div className="flex items-start justify-between w-full">
      {items.map(({ id, label, description }) => (
        <div key={id} className="flex flex-col gap-0.5 min-w-0">
          <span className="text-sm font-bold text-white leading-snug">{label}</span>
          <span className="text-xs text-white/55 leading-snug">{description}</span>
        </div>
      ))}
    </div>
  );
}
