export function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatPercent(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  return `${value > 0 ? "+" : ""}${value.toFixed(1)}%`;
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function timeAgo(value: string | null | undefined): string {
  if (!value) return "—";
  const now = Date.now();
  const then = new Date(value).getTime();
  const diff = Math.floor((now - then) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 2592000) return `${Math.floor(diff / 86400)}d ago`;
  return formatDate(value);
}

export function getDecisionColor(decision: string | null | undefined): string {
  switch (decision) {
    case "BUY": return "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
    case "NEGOTIATE": return "bg-amber-500/10 text-amber-400 border-amber-500/30";
    case "WATCH": return "bg-blue-500/10 text-blue-400 border-blue-500/30";
    case "AVOID": return "bg-rose-500/10 text-rose-400 border-rose-500/30";
    default: return "bg-slate-500/10 text-slate-400 border-slate-500/30";
  }
}

export function getTierColor(tier: string | null | undefined): string {
  switch (tier) {
    case "Exceptional": return "text-emerald-400";
    case "Strong": return "text-emerald-400";
    case "Interesting": return "text-amber-400";
    case "Weak": return "text-orange-400";
    case "Avoid": return "text-rose-400";
    default: return "text-slate-400";
  }
}

export function getScoreColor(score: number | null | undefined): string {
  if (score === null || score === undefined) return "text-slate-400";
  if (score >= 85) return "text-emerald-400";
  if (score >= 70) return "text-emerald-400";
  if (score >= 55) return "text-amber-400";
  if (score >= 40) return "text-orange-400";
  return "text-rose-400";
}

export function getScoreBgColor(score: number | null | undefined): string {
  if (score === null || score === undefined) return "bg-slate-600";
  if (score >= 70) return "bg-emerald-500";
  if (score >= 55) return "bg-amber-500";
  if (score >= 40) return "bg-orange-500";
  return "bg-rose-500";
}
