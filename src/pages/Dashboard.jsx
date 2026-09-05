import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import MetricCard from "@/components/MetricCard";
import RecommendationBadge from "@/components/RecommendationBadge";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatPct, timeAgo } from "@/lib/format";
import { Sparkles, TrendingUp, Target, Wallet, ArrowRight, Inbox } from "lucide-react";

export default function Dashboard() {
  const { user } = useAuth();
  const [analyses, setAnalyses] = useState(null);

  useEffect(() => {
    base44.entities.Analysis.list("-created_date", 100)
      .then(setAnalyses)
      .catch(() => setAnalyses([]));
  }, []);

  const loading = analyses === null;
  const list = analyses || [];
  const total = list.length;
  const buyCount = list.filter((a) => a.decision === "BUY").length;
  const avgScore = total ? Math.round(list.reduce((s, a) => s + (a.opportunity_score || 0), 0) / total) : 0;
  const potentialProfit = list
    .filter((a) => (a.net_profit || 0) > 0)
    .reduce((s, a) => s + a.net_profit, 0);
  const recent = list.slice(0, 5);
  const top = [...list].sort((a, b) => (b.opportunity_score || 0) - (a.opportunity_score || 0)).slice(0, 5);

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">
            Welcome back{user?.full_name ? `, ${user.full_name.split(" ")[0]}` : ""}.
          </h1>
          <p className="text-zinc-500 mt-1 text-sm">Your resale intelligence terminal.</p>
        </div>
        <Button asChild className="bg-emerald-500 hover:bg-emerald-400 text-emerald-950 font-semibold h-11 px-5">
          <Link to="/analyze">
            <Sparkles className="h-4 w-4 mr-2" /> Analyze a listing
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
        <MetricCard label="Total analyses" value={loading ? "—" : total} sub="all-time" />
        <MetricCard label="BUY opportunities" value={loading ? "—" : buyCount} sub="strong calls" accent="text-emerald-400" />
        <MetricCard label="Avg opportunity score" value={loading ? "—" : avgScore} sub="/ 100" />
        <MetricCard label="Potential profit" value={loading ? "—" : formatCurrency(potentialProfit)} sub="identified" accent="text-emerald-400" />
      </div>

      {loading ? (
        <div className="panel p-12 text-center text-zinc-500">Loading...</div>
      ) : total === 0 ? (
        <div className="panel p-12 text-center">
          <Inbox className="h-8 w-8 text-zinc-600 mx-auto mb-3" />
          <h3 className="font-heading font-semibold text-zinc-200">No analyses yet</h3>
          <p className="text-sm text-zinc-500 mt-1 mb-5">Run your first listing analysis to see it here.</p>
          <Button asChild className="bg-emerald-500 hover:bg-emerald-400 text-emerald-950 font-semibold">
            <Link to="/analyze">
              <Sparkles className="h-4 w-4 mr-2" /> Analyze a listing
            </Link>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="panel p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-heading font-semibold text-zinc-100 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-emerald-400" /> Recent analyses
              </h2>
              <Link to="/history" className="text-xs text-zinc-500 hover:text-zinc-300 flex items-center gap-1">
                View all <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            <div className="space-y-1">
              {recent.map((a) => (
                <AnalysisRow key={a.id} a={a} />
              ))}
            </div>
          </div>

          <div className="panel p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-heading font-semibold text-zinc-100 flex items-center gap-2">
                <Target className="h-4 w-4 text-emerald-400" /> Top opportunities
              </h2>
            </div>
            <div className="space-y-1">
              {top.map((a) => (
                <AnalysisRow key={a.id} a={a} />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AnalysisRow({ a }) {
  return (
    <Link
      to={`/analysis/${a.id}`}
      className="flex items-center gap-3 rounded-lg px-2 py-2.5 hover:bg-white/5 transition-colors"
    >
      <div className="h-9 w-9 rounded-md bg-white/5 flex items-center justify-center font-mono text-sm font-semibold text-emerald-400 shrink-0">
        {a.opportunity_score || 0}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm text-zinc-200 truncate">{a.title}</div>
        <div className="text-xs text-zinc-600 flex items-center gap-2">
          <span>{formatCurrency(a.asking_price)}</span>
          <span>·</span>
          <span>{timeAgo(a.created_date)}</span>
        </div>
      </div>
      <RecommendationBadge decision={a.decision} />
    </Link>
  );
}
