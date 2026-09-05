import { cn } from "@/lib/utils";

const COLORS = {
  BUY: "#34d399",
  NEGOTIATE: "#fbbf24",
  WATCH: "#38bdf8",
  PASS: "#fb7185",
};

export default function ScoreRing({ score, decision = "WATCH", size = 132, stroke = 10 }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, score || 0));
  const offset = c - (pct / 100) * c;
  const color = COLORS[decision] || COLORS.WATCH;
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.8s ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={cn("font-mono font-semibold tnum leading-none", size > 100 ? "text-4xl" : "text-2xl")} style={{ color }}>
          {Math.round(pct)}
        </span>
        <span className="text-[10px] uppercase tracking-widest text-zinc-500 mt-1">/ 100</span>
      </div>
    </div>
