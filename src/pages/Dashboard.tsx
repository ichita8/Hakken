import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import type { Analysis, DealAlert } from "@/lib/types";
import { DEFAULT_CATEGORIES } from "@/lib/types";
import { formatCurrency, formatPercent, timeAgo, getDecisionColor, getScoreColor, getTierColor } from "@/lib/utils";
import { TrendingUp, TrendingDown, ScanLine, Briefcase, Target, Zap, ArrowRight, Activity, Eye, Search, Download, Filter, Archive, Trash2, ArchiveRestore } from "lucide-react";

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
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [decisionFilter, setDecisionFilter] = useState<string>("all");
  const [showArchived, setShowArchived] = useState(false);
  const [archivingId, setArchivingId] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      if (!user) return;

      let query = supabase.from("analyses").select("*").eq("user_id", user.id);
      if (!showArchived) {
        query = query.is("deleted_at", null);
      } else {
        query = query.not("deleted_at", "is", null);
      }

      const [analysesRes, alertsRes] = await Promise.all([
        query.order("created_at", { ascending: false }).limit(50),
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
  }, [user, showArchived]);

  const filteredAnalyses = useMemo(() => {
    let result = recentAnalyses;
    if (categoryFilter !== "all") {
      result = result.filter((a) => a.category === categoryFilter);
    }
    if (decisionFilter !== "all") {
      result = result.filter((a) => a.decision === decisionFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((a) =>
        a.title.toLowerCase().includes(q) ||
        (a.item_brand || "").toLowerCase().includes(q) ||
        (a.item_model || "").toLowerCase().includes(q) ||
        (a.marketplace || "").toLowerCase().includes(q)
      );
    }
    return result;
  }, [recentAnalyses, categoryFilter, decisionFilter, searchQuery]);

  const availableCategories = useMemo(() => {
    const cats = new Set(DEFAULT_CATEGORIES);
    recentAnalyses.forEach((a) => { if (a.category) cats.add(a.category); });
    return Array.from(cats).sort();
  }, [recentAnalyses]);

  function exportCSV() {
    const rows = filteredAnalyses.map((a) => ({
      Title: a.title,
      Category: a.category || "",
      Marketplace: a.marketplace,
      AskingPrice: a.asking_price || "",
      Brand: a.item_brand || "",
      Model: a.item_model || "",
      Decision: a.decision || "",
      OpportunityScore: a.opportunity_score ?? "",
      ExpectedProfit: a.expected_profit ?? "",
      ExpectedROI: a.expected_roi ?? "",
      FairMarketValue: a.fair_market_value ?? "",
      Status: a.status,
      Date: a.created_at ? new Date(a.created_at).toISOString() : "",
    }));
    if (rows.length === 0) return;
    const headers = Object.keys(rows[0]);
    const csv = [
      headers.join(","),
      ...rows.map((r) => headers.map((h) => `"${String((r as any)[h]).replace(/"/g, '""')}"`).join(",")),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `hakken-analyses-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleArchive(id: string) {
    setArchivingId(id);
    const { error } = await supabase
      .from("analyses")
      .update({ deleted_at: new Date().toISOString(), status: "archived" })
      .eq("id", id)
      .eq("user_id", user!.id);

    if (!error) {
      setRecentAnalyses((prev) => prev.filter((a) => a.id !== id));
      setArchivingId(null);
    } else {
      setArchivingId(null);
    }
  }

  async function handleRestore(id: string) {
    setArchivingId(id);
    const { data, error } = await supabase
      .from("analyses")
      .update({ deleted_at: null, status: "complete" })
      .eq("id", id)
      .eq("user_id", user!.id)
      .select()
      .single();

    if (!error && data) {
      setRecentAnalyses((prev) => [data as Analysis, ...prev.filter((a) => a.id !== id)]);
      setArchivingId(null);
    } else {
      setArchivingId(null);
    }
  }

  async function handlePermanentDelete(id: string) {
    setArchivingId(id);
    const { error } = await supabase
      .from("analyses")
      .delete()
      .eq("id", id)
      .eq("user_id", user!.id);

    if (!error) {
      setRecentAnalyses((prev) => prev.filter((a) => a.id !== id));
      setArchivingId(null);
    } else {
      setArchivingId(null);
    }
  }

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
              {showArchived ? "Archived Analyses" : "Recent Analyses"}
            </h2>
            <div className="flex items-center gap-2">
              {recentAnalyses.length > 0 && !showArchived && (
                <button onClick={exportCSV} className="text-sm text-ink-400 hover:text-brand-400 flex items-center gap-1 transition-colors">
                  <Download className="w-3.5 h-3.5" /> Export CSV
                </button>
              )}
              <button
                onClick={() => setShowArchived(!showArchived)}
                className={`text-sm flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors ${
                  showArchived
                    ? "bg-brand-500/20 text-brand-300 border border-brand-500/30"
                    : "text-ink-400 hover:text-ink-200 border border-transparent"
                }`}
              >
                <Archive className="w-3.5 h-3.5" />
                {showArchived ? "Showing Archived" : "Archived"}
              </button>
            </div>
          </div>

          {/* Search & filters */}
          {recentAnalyses.length > 0 && (
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-ink-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by title, brand, model..."
                  className="input-field pl-9"
                />
              </div>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="input-field cursor-pointer sm:w-44"
              >
                <option value="all" className="bg-ink-900">All Categories</option>
                {availableCategories.map((c) => (
                  <option key={c} value={c} className="bg-ink-900">{c}</option>
                ))}
              </select>
              <select
                value={decisionFilter}
                onChange={(e) => setDecisionFilter(e.target.value)}
                className="input-field cursor-pointer sm:w-36"
              >
                <option value="all" className="bg-ink-900">All Decisions</option>
                <option value="BUY" className="bg-ink-900">BUY</option>
                <option value="NEGOTIATE" className="bg-ink-900">NEGOTIATE</option>
                <option value="WATCH" className="bg-ink-900">WATCH</option>
                <option value="AVOID" className="bg-ink-900">AVOID</option>
              </select>
            </div>
          )}

          {loading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-24 rounded-2xl shimmer-bg" />
              ))}
            </div>
          ) : filteredAnalyses.length === 0 ? (
            <div className="glass-card p-12 text-center">
              <div className="w-16 h-16 rounded-2xl bg-ink-800/50 flex items-center justify-center mx-auto mb-4">
                {showArchived ? <Archive className="w-8 h-8 text-ink-500" /> : recentAnalyses.length === 0 ? <ScanLine className="w-8 h-8 text-ink-500" /> : <Filter className="w-8 h-8 text-ink-500" />}
              </div>
              <h3 className="text-lg font-medium text-ink-200 mb-2">
                {showArchived ? "No archived analyses" : recentAnalyses.length === 0 ? "No analyses yet" : "No matching analyses"}
              </h3>
              <p className="text-sm text-ink-400 mb-6">
                {showArchived
                  ? "Archived analyses will appear here. Archive items from your dashboard to declutter without losing data."
                  : recentAnalyses.length === 0
                  ? "Start by analyzing your first listing to discover profitable resale opportunities."
                  : "Try adjusting your search or filters."}
              </p>
              {showArchived ? (
                <button onClick={() => setShowArchived(false)} className="btn-secondary">
                  Back to Active Analyses
                </button>
              ) : recentAnalyses.length === 0 ? (
                <button onClick={() => onNavigate("analyze")} className="btn-primary inline-flex items-center gap-2">
                  <ScanLine className="w-4 h-4" />
                  Analyze a Listing
                </button>
              ) : (
                <button
                  onClick={() => { setSearchQuery(""); setCategoryFilter("all"); setDecisionFilter("all"); }}
                  className="btn-secondary"
                >
                  Clear Filters
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredAnalyses.map((analysis) => (
                <AnalysisCard
                  key={analysis.id}
                  analysis={analysis}
                  onClick={() => onViewAnalysis(analysis.id)}
                  onArchive={handleArchive}
                  onRestore={handleRestore}
                  onDelete={handlePermanentDelete}
                  isArchived={showArchived}
                  isArchiving={archivingId === analysis.id}
                />
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

function AnalysisCard({
  analysis,
  onClick,
  onArchive,
  onRestore,
  onDelete,
  isArchived,
  isArchiving,
}: {
  analysis: Analysis;
  onClick: () => void;
  onArchive: (id: string) => void;
  onRestore: (id: string) => void;
  onDelete: (id: string) => void;
  isArchived: boolean;
  isArchiving: boolean;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const isComplete = analysis.status === "complete";
  const isAnalyzing = analysis.status === "analyzing" || analysis.status === "pending";

  function handleActionClick(e: React.MouseEvent, action: () => void) {
    e.stopPropagation();
    action();
  }

  return (
    <div onClick={onClick} className="glass-card p-5 glass-hover cursor-pointer group">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
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
            {analysis.category && (
              <span className="text-[10px] px-2 py-0.5 rounded-full border bg-brand-500/10 text-brand-400 border-brand-500/20">
                {analysis.category}
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

        <div className="flex items-start gap-2 flex-shrink-0">
          {isComplete && analysis.opportunity_score !== null && (
            <div className="text-right">
              <div className={`text-2xl font-bold font-display ${getScoreColor(analysis.opportunity_score)}`}>
                {analysis.opportunity_score}
              </div>
              <div className={`text-[10px] uppercase tracking-wider ${getTierColor(analysis.opportunity_tier)}`}>
                {analysis.opportunity_tier}
              </div>
            </div>
          )}

          {/* Action buttons */}
          {isArchiving ? (
            <div className="flex items-center justify-center w-8 h-8">
              <div className="w-4 h-4 border-2 border-ink-500 border-t-brand-400 rounded-full animate-spin" />
            </div>
          ) : confirmDelete ? (
            <div className="flex items-center gap-1 bg-ink-800/80 rounded-lg p-1">
              <button
                onClick={(e) => handleActionClick(e, () => { onDelete(analysis.id); setConfirmDelete(false); })}
                className="px-2 py-1 text-[10px] font-semibold text-rose-400 hover:bg-rose-500/20 rounded transition-colors"
              >
                Delete
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setConfirmDelete(false); }}
                className="px-2 py-1 text-[10px] font-semibold text-ink-400 hover:bg-ink-700 rounded transition-colors"
              >
                Cancel
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {isArchived ? (
                <>
                  <button
                    onClick={(e) => handleActionClick(e, () => onRestore(analysis.id))}
                    title="Restore"
                    className="p-1.5 rounded-lg hover:bg-emerald-500/20 text-ink-500 hover:text-emerald-400 transition-colors"
                  >
                    <ArchiveRestore className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setConfirmDelete(true); }}
                    title="Delete permanently"
                    className="p-1.5 rounded-lg hover:bg-rose-500/20 text-ink-500 hover:text-rose-400 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </>
              ) : (
                <button
                  onClick={(e) => handleActionClick(e, () => onArchive(analysis.id))}
                  title="Archive"
                  className="p-1.5 rounded-lg hover:bg-ink-700 text-ink-500 hover:text-ink-200 transition-colors"
                >
                  <Archive className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}
        </div>
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
