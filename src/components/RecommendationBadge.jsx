import { cn } from "@/lib/utils";

const STYLES = {
  BUY: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  NEGOTIATE: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  WATCH: "bg-sky-500/15 text-sky-300 border-sky-500/30",
  PASS: "bg-rose-500/15 text-rose-300 border-rose-500/30",
};

export default function RecommendationBadge({ decision, size = "md" }) {
  const style = STYLES[decision] || STYLES.WATCH;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border font-heading font-semibold uppercase tracking-wider",
        style,
        size === "lg" ? "px-4 py-1.5 text-sm" : "px-2.5 py-1 text-xs"
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {decision || "WATCH"}
    </span>
  );
}
