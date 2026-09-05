import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

export default function Logo({ className, to = "/dashboard", compact = false }) {
  return (
    <Link to={to} className={cn("flex items-center gap-2 group", className)}>
      <div className="relative h-7 w-7 rounded-md bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
        <span className="text-[13px] font-bold text-emerald-950 font-mono">H</span>
        <div className="absolute inset-0 rounded-md ring-1 ring-white/10" />
      </div>
      {!compact && (
        <span className="font-heading font-semibold tracking-[0.18em] text-zinc-100 text-sm">
          HAKKEN
        </span>
      )}
    </Link>
  );
}
