import { useEffect, useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const STAGES = [
  "Reading listing",
  "Identifying product",
  "Assessing condition",
  "Checking risk signals",
  "Estimating market value",
  "Calculating profitability",
  "Generating recommendation",
];

export default function PipelineLoader({ running = true }) {
  const [stage, setStage] = useState(0);

  useEffect(() => {
    if (!running) return;
    setStage(0);
    const id = setInterval(() => {
      setStage((s) => (s < STAGES.length - 1 ? s + 1 : s));
    }, 1100);
    return () => clearInterval(id);
  }, [running]);

  return (
    <div className="panel p-8 max-w-xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Loader2 className="h-5 w-5 animate-spin text-emerald-400" />
        <div>
          <div className="font-heading font-semibold text-zinc-100">Running 5-layer analysis</div>
          <div className="text-sm text-zinc-500">This usually takes 10–20 seconds.</div>
        </div>
      </div>
      <div className="space-y-1">
        {STAGES.map((s, i) => {
          const done = i < stage;
          const active = i === stage;
          return (
            <div
              key={s}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors",
                active ? "bg-emerald-500/10" : "transparent"
              )}
            >
              <div className="h-5 w-5 flex items-center justify-center shrink-0">
                {done ? (
                  <Check className="h-4 w-4 text-emerald-400" />
                ) : active ? (
                  <Loader2 className="h-4 w-4 animate-spin text-emerald-400" />
                ) : (
                  <div className="h-1.5 w-1.5 rounded-full bg-zinc-700" />
                )}
              </div>
              <span className={cn("text-sm", done ? "text-zinc-400" : active ? "text-zinc-100 font-medium" : "text-zinc-600")}>
                {s}
              </span>
            </div>
          );
        })}
      </div>
      <div className="mt-6 h-1 w-full rounded-full bg-white/5 overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-emerald-400 to-teal-500 transition-all duration-700"
          style={{ width: `${((stage + 1) / STAGES.length) * 100}%` }}
        />
      </div>
    </div>
  );
}
