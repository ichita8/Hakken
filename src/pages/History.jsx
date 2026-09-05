import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import RecommendationBadge from "@/components/RecommendationBadge";
import { Input } from "@/components/ui/input";
import { formatCurrency, timeAgo } from "@/lib/format";
import { Search, Inbox } from "lucide-react";

export default function History() {
  const [analyses, setAnalyses] = useState(null);
  const [q, setQ] = useState("");

  useEffect(() => {
    base44.entities.Analysis.list("-created_date", 200)
      .then(setAnalyses)
      .catch(() => setAnalyses([]));
  }, []);

  const list = (analyses || []).filter((a) => {
    if (!q.trim()) return true;
    const s = q.toLowerCase();
    return (
      (a.title || "").toLowerCase().includes(s) ||
      (a.brand || "").toLowerCase().includes(s) ||
      (a.model || "").toLowerCase().includes(s)
    );
  });

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">Analysis history</h1>
          <p className="text-zinc-500 mt-1 text-sm">Every listing you've analyzed.</p>
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-600" />
          <Input
            className="pl-9 bg-background"
            placeholder="Search title, brand, model..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
      </div>

      {analyses === null ? (
        <div className="panel p-12 text-center text-zinc-500">Loading...</div>
      ) : list.length === 0 ? (
        <div className="panel p-12 text-center">
          <Inbox className="h-8 w-8 text-zinc-600 mx-auto mb-3" />
          <h3 className="font-heading font-semibold text-zinc-200">
            {q ? "No matches found" : "No analyses yet"}
          </h3>
          <p className="text-sm text-zinc-500 mt-1">
            {q ? "Try a different search." : "Analyze a listing to build your history."}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {list.map((a) => (
            <Link
              key={a.id}
              to={`/analysis/${a.id}`}
              className="panel p-4 flex items-center gap-4 hover:border-emerald-500/30 transition-colors"
            >
              <div className="h-11 w-11 rounded-md bg-white/5 flex items-center justify-center font-mono text-base font-semibold text-emerald-400 shrink-0">
                {a.opportunity_score || 0}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm text-zinc-100 truncate">{a.title}</div>
                <div className="text-xs text-zinc-600 flex items-center gap-2 mt-0.5">
                  <span>{formatCurrency(a.asking_price)}</span>
                  <span>·</span>
                  <span>est. profit {formatCurrency(a.net_profit)}</span>
                  <span>·</span>
                  <span>{timeAgo(a.created_date)}</span>
                </div>
              </div>
              <RecommendationBadge decision={a.decision} />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
