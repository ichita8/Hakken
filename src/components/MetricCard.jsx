import { cn } from "@/lib/utils";

export default function MetricCard({ label, value, sub, accent, className }) {
  return (
    <div className={cn("panel p-4", className)}>
      <div className="text-[11px] uppercase tracking-wider text-zinc-500 font-medium">{label}</div>
      <div className={cn("mt-1.5 font-mono tnum font-semibold text-2xl", accent || "text-zinc-100")}>
        {value}
      </div>
      {sub && <div className="mt-0.5 text-xs text-zinc-500">{sub}</div>}
    </div>
  );
}
