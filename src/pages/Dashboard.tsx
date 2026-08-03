import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import type { Analysis, DealAlert } from "@/lib/types";
import { formatCurrency, formatPercent, timeAgo, getDecisionColor, getScoreColor, getTierColor } from "@/lib/utils";
import { TrendingUp, TrendingDown, ScanLine, Briefcase, Target, Zap, ArrowRight, Activity, Eye } from "lucide-react";

interface DashboardProps {
  onNavigate: (page: "dashboard" | "analyze" | "portfolio" | "settings") => void;
  onViewAnalysis: (id: string) => void;
}

export default function Dashboard({ onNavigate, onViewAnalysis }: DashboardProps) {
  const { user, profile } = useAuth();
  const [recentAnalyses, setRecentAnalyses] = useState<Analysis[]>([]);
  const [alerts, setAlerts] = useState<DealAlert[]>([]);
  const [stats, setStats] = useState({ total: 0, buyCount: 0, avgScore: 0, totalProfit: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      if (!user) return;
      const [analysesRes, alertsRes] = await Promise.all([
        supabase.from("analyses").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(10),
        supabase.from("deal_alerts").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(5),
      ]);

      const analyses = (analysesRes.data as Analysis[]) || [];
      const allAlerts = (alertsRes.data as DealAlert[]) || [];
      setRecentAnalyses(analyses);
      setAlerts(allAlerts);

      const completed = analyses.filter((a) => a.status === "complete");
      const buyCount = completed.filter((a) => a.decision === "BUY").length;
      const avgScore = completed.length > 0 ? Math.round(completed.reduce((s, a) => s + (a.opportunity_score || 0), 0) / completed.length) : 0;
      const totalProfit = completed.reduce((s, a) => s + (a.expected_profit || 0), 0);
      setStats({ total: analyses.length, buyCount, avgScore, totalProfit });

      setLoading(false);
    }
    loadData();
  }, [user]);

  const statCards = [
    { label: "Total Analyses", value: stats.total.toString(), icon: ScanLine, color: "text-brand-400", bg: "bg-brand-500/10" },
    { label: "BUY Signals", value: stats.buyCount.toString(), icon: Zap, color: "text-emerald-400", bg: "bg-emerald-500/10" },
    { label: "Avg Opportunity", value: `${stats.avgScore}/100`, icon: Target, color: "text-amber-400", bg: "bg-amber-500/10" },
    { label: "Projected Profit", value: formatCurrency(stats.totalProfit), icon: TrendingUp, color: "text-emerald-400", bg: "bg-emerald-500/10" },
  ];

  return (
    <div className="p-6 lg:p-10 max-w-7xl mx-auto space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl lg:text-3xl font-bold text-white">
            Welcome back, {profile?.display_name || "Trader"}
          </h1>
          <p className="text-sm text-ink-400 mt-1">Here's your resale intelligence overview.</p>
        </div>
        <button onClick={() => onNavigate("analyze")} className="btn-primary flex items-center gap-2 self-start">
          <ScanLine className="w-4 h-4" />
          Analyze New Listing
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="glass-card p-5">
              <div className={`w-10 h-10 rounded-xl ${stat.bg} flex items-center justify-center mb-3`}>
                <Icon className={`w-5 h-5 ${stat.color}`} />
              </div>
              <p className="text-2xl font-bold text-white font-display">{stat.value}</p>
              <p className="text-xs text-ink-400 mt-1">{stat.label}</p>
            </div>
          );
        })}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Recent analyses */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Activity className="w-5 h-5 text-brand-400" />
              Recent Analyses
            </h2>
            {recentAnalyses.length > 0 && (
              <button onClick={() => onNavigate("portfolio")} className="text-sm text-brand-400 hover:text-brand-300 flex items-center gap-1">
                View all <ArrowRight className="w-3 h-3" />
              </button>
            )}
          </div>

          {loading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-24 rounded-2xl shimmer-bg" />
              ))}
            </div>
          ) : recentAnalyses.length === 0 ? (
            <div className="glass-card p-12 text-center">
              <div className="w-16 h-16 rounded-2xl bg-ink-800/50 flex items-center justify-center mx-auto mb-4">
                <ScanLine className="w-8 h-8 text-ink-500" />
              </div>
              <h3 className="text-lg font-medium text-ink-200 mb-2">No analyses yet</h3>
              <p className="text-sm text-ink-400 mb-6">Start by analyzing your first listing to discover profitable resale opportunities.</p>
              <button onClick={() => onNavigate("analyze")} className="btn-primary inline-flex items-center gap-2">
                <ScanLine className="w-4 h-4" />
                Analyze a Listing
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {recentAnalyses.map((analysis) => (
                <AnalysisCard key={analysis.id} analysis={analysis} onClick={() => onViewAnalysis(analysis.id)} />
              ))}
            </div>
          )}
        </div>

        {/* Deal alerts sidebar */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-400" />
            Top Opportunities
          </h2>
          {alerts.length === 0 ? (
            <div className="glass-card p-6 text-center">
              <p className="text-sm text-ink-400">No alerts yet. High-scoring analyses will appear here.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {alerts.map((alert) => (
                <div key={alert.id} className="glass-card p-4 glass-hover cursor-pointer" onClick={() => onViewAnalysis(alert.analysis_id || "")}>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <p className="text-sm font-medium text-ink-100 line-clamp-2">{alert.title}</p>
                    {alert.decision && (
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border whitespace-nowrap ${getDecisionColor(alert.decision)}`}>
                        {alert.decision}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-ink-500">
                    {alert.opportunity_score !== null && (
                      <span className={getScoreColor(alert.opportunity_score)}>Score: {alert.opportunity_score}</span>
                    )}
                    {alert.expected_profit !== null && (
                      <span className="text-emerald-400">{formatCurrency(alert.expected_profit)}</span>
                    )}
                    <span>{timeAgo(alert.created_at)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Quick tip card */}
          <div className="glass-card p-5 border-brand-500/20">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-brand-500/10 flex items-center justify-center flex-shrink-0">
                <Eye className="w-4 h-4 text-brand-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-ink-100 mb-1">Pro Tip</p>
                <p className="text-xs text-ink-400 leading-relaxed">
                  Paste the full listing description for the most accurate AI analysis. More detail means better product identification and valuation.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function AnalysisCard({ analysis, onClick }: { analysis: Analysis; onClick: () => void }) {
  const isComplete = analysis.status === "complete";
  const isAnalyzing = analysis.status === "analyzing" || analysis.status === "pending";

  return (
    <div onClick={onClick} className="glass-card p-5 glass-hover cursor-pointer group">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {isComplete && analysis.decision && (
              <span className={`text-[10px] px-2 py-0.5 rounded-full border ${getDecisionColor(analysis.decision)}`}>
                {analysis.decision}
              </span>
            )}
            {isAnalyzing && (
              <span className="text-[10px] px-2 py-0.5 rounded-full border bg-amber-500/10 text-amber-400 border-amber-500/30">
                Analyzing...
              </span>
            )}
            {analysis.status === "failed" && (
              <span className="text-[10px] px-2 py-0.5 rounded-full border bg-rose-500/10 text-rose-400 border-rose-500/30">
                Failed
              </span>
            )}
            <span className="text-xs text-ink-500">{analysis.marketplace}</span>
          </div>
          <h3 className="text-sm font-medium text-ink-100 truncate group-hover:text-white transition-colors">
            {analysis.title}
          </h3>
          {isComplete && analysis.item_brand && (
            <p className="text-xs text-ink-400 mt-0.5">
              {analysis.item_brand} {analysis.item_model} — {formatCurrency(analysis.asking_price)}
            </p>
          )}
        </div>

        {isComplete && analysis.opportunity_score !== null && (
          <div className="text-right flex-shrink-0">
            <div className={`text-2xl font-bold font-display ${getScoreColor(analysis.opportunity_score)}`}>
              {analysis.opportunity_score}
            </div>
            <div className={`text-[10px] uppercase tracking-wider ${getTierColor(analysis.opportunity_tier)}`}>
              {analysis.opportunity_tier}
            </div>
          </div>
        )}
      </div>

      {isComplete && analysis.expected_profit !== null && (
        <div className="flex items-center gap-4 mt-3 pt-3 border-t border-ink-800/60">
          <div className="flex items-center gap-1.5">
            {analysis.expected_profit > 0 ? (
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <TrendingDown className="w-3.5 h-3.5 text-rose-400" />
            )}
            <span className={`text-xs font-medium ${analysis.expected_profit > 0 ? "text-emerald-400" : "text-rose-400"}`}>
              {formatCurrency(analysis.expected_profit)} profit
            </span>
          </div>
          {analysis.expected_roi !== null && (
            <span className="text-xs text-ink-400">{formatPercent(analysis.expected_roi)} ROI</span>
          )}
          <span className="text-xs text-ink-500 ml-auto">{timeAgo(analysis.created_at)}</span>
        </div>
      )}
    </div>
  );
}
