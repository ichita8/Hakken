import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import type { Analysis } from "@/lib/types";
import {
  formatCurrency,
  formatPercent,
  getDecisionColor,
  getScoreColor,
  getTierColor,
  formatDate,
} from "@/lib/utils";
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Info,
  BarChart3,
  Zap,
  Target,
  Clock,
  DollarSign,
  Archive,
  Trash2,
} from "lucide-react";

interface AnalysisReportV3Props {
  analysisId: string;
  onBack: () => void;
}

export default function AnalysisReportV3({ analysisId, onBack }: AnalysisReportV3Props) {
  const { user } = useAuth();
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [trendData, setTrendData] = useState<any>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    async function load() {
      if (!user || !analysisId) return;

      const { data } = await supabase
        .from("analyses")
        .select("*")
        .eq("id", analysisId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (data) {
        setAnalysis(data as Analysis);
        // Extract trend analysis from layer_results if available
        const layerResults = data.layer_results || {};
        setTrendData(data.trend_analysis || layerResults.trend_analysis);
      }

      setLoading(false);
    }

    load();
  }, [user, analysisId]);

  async function handleArchive() {
    if (!user || !analysis) return;
    setActionLoading(true);
    const { error } = await supabase
      .from("analyses")
      .update({ deleted_at: new Date().toISOString(), status: "archived" })
      .eq("id", analysis.id)
      .eq("user_id", user.id);
    setActionLoading(false);
    if (!error) onBack();
  }

  async function handleDelete() {
    if (!user || !analysis) return;
    setActionLoading(true);
    const { error } = await supabase
      .from("analyses")
      .delete()
      .eq("id", analysis.id)
      .eq("user_id", user.id);
    setActionLoading(false);
    if (!error) onBack();
  }

  async function handleAddToPortfolio() {
    if (!user || !analysis) return;
    const { error } = await supabase.from("portfolio_items").insert({
      user_id: user.id,
      analysis_id: analysis.id,
      title: analysis.title,
      category: analysis.category,
      acquisition_price: analysis.asking_price,
      listing_price: analysis.fair_market_value,
      status: "active",
      image_urls: [],
    });
    if (!error) onBack();
  }

  if (loading) {
    return (
      <div className="p-6 lg:p-10 max-w-6xl mx-auto">
        <div className="space-y-4">
          <div className="h-8 w-48 shimmer-bg rounded-lg" />
          <div className="h-96 shimmer-bg rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="p-6 lg:p-10 max-w-6xl mx-auto text-center">
        <p className="text-ink-400">Analysis not found.</p>
        <button onClick={onBack} className="btn-secondary mt-4">
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-10 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={onBack}
          className="p-2 rounded-lg hover:bg-ink-800/50 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-ink-400" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-white">{analysis.title}</h1>
          <p className="text-sm text-ink-400 mt-1">
            {formatDate(analysis.created_at)} • {analysis.marketplace}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleArchive}
            disabled={actionLoading}
            title="Archive this analysis"
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-ink-400 hover:text-ink-200 hover:bg-ink-800/50 transition-colors disabled:opacity-50"
          >
            <Archive className="w-4 h-4" />
            <span className="hidden sm:inline">Archive</span>
          </button>
          {showDeleteConfirm ? (
            <div className="flex items-center gap-2 bg-rose-500/10 border border-rose-500/30 rounded-lg p-1">
              <span className="text-xs text-rose-300 px-2">Delete forever?</span>
              <button
                onClick={handleDelete}
                disabled={actionLoading}
                className="px-2 py-1 text-xs font-semibold text-rose-400 hover:bg-rose-500/20 rounded transition-colors"
              >
                Yes, delete
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-2 py-1 text-xs font-semibold text-ink-400 hover:bg-ink-700 rounded transition-colors"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              title="Delete permanently"
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-ink-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
          <div
            className={`px-4 py-2 rounded-xl border font-semibold text-sm ${getDecisionColor(
              analysis.decision
            )}`}
          >
            {analysis.decision}
          </div>
        </div>
      </div>

      {/* Main Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-ink-400 uppercase">Opportunity Score</p>
            <Target className="w-4 h-4 text-brand-400" />
          </div>
          <p className={`text-3xl font-bold ${getScoreColor(analysis.opportunity_score)}`}>
            {analysis.opportunity_score}
          </p>
          <p className={`text-xs mt-2 ${getTierColor(analysis.opportunity_tier)}`}>
            {analysis.opportunity_tier}
          </p>
        </div>

        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-ink-400 uppercase">Expected Profit</p>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-3xl font-bold text-emerald-400">
            {formatCurrency(analysis.expected_profit)}
          </p>
          <p className="text-xs text-ink-500 mt-2">
            {formatPercent(analysis.expected_roi)} ROI
          </p>
        </div>

        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-ink-400 uppercase">Fair Market Value</p>
            <BarChart3 className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-3xl font-bold text-amber-400">
            {formatCurrency(analysis.fair_market_value)}
          </p>
          <p className="text-xs text-ink-500 mt-2">
            Asking: {formatCurrency(analysis.asking_price)}
          </p>
        </div>

        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-ink-400 uppercase">Days to Sell</p>
            <Clock className="w-4 h-4 text-blue-400" />
          </div>
          <p className="text-3xl font-bold text-blue-400">
            {analysis.expected_days_to_sell_low}-{analysis.expected_days_to_sell_high}
          </p>
          <p className="text-xs text-ink-500 mt-2">days</p>
        </div>
      </div>

      {/* Trend Analysis Section (Phase 3) */}
      {trendData && (
        <div className="glass-card p-8 mb-8">
          <div className="flex items-center gap-2 mb-6">
            <TrendingUp className="w-5 h-5 text-brand-400" />
            <h2 className="text-lg font-semibold text-white">Market Trend Analysis</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Price Direction */}
            <div className="p-4 rounded-lg bg-ink-900/50 border border-ink-700">
              <p className="text-xs font-semibold text-ink-400 uppercase mb-3">Price Direction</p>
              <div className="flex items-center gap-3">
                {trendData.priceDirection === "up" ? (
                  <TrendingUp className="w-6 h-6 text-emerald-400" />
                ) : trendData.priceDirection === "down" ? (
                  <TrendingDown className="w-6 h-6 text-rose-400" />
                ) : (
                  <div className="w-6 h-6 text-amber-400">→</div>
                )}
                <div>
                  <p className="font-semibold text-white capitalize">{trendData.priceDirection}</p>
                  <p className="text-sm text-ink-400">
                    {trendData.percentChange > 0 ? "+" : ""}
                    {trendData.percentChange}% (90d)
                  </p>
                </div>
              </div>
            </div>

            {/* Demand Trend */}
            <div className="p-4 rounded-lg bg-ink-900/50 border border-ink-700">
              <p className="text-xs font-semibold text-ink-400 uppercase mb-3">Demand</p>
              <div className="flex items-center gap-3">
                <Zap className="w-6 h-6 text-amber-400" />
                <div>
                  <p className="font-semibold text-white capitalize">
                    {trendData.demandTrend || "Stable"}
                  </p>
                  <p className="text-sm text-ink-400">
                    {(trendData.sellThroughRate * 100).toFixed(0)}% sell-through
                  </p>
                </div>
              </div>
            </div>

            {/* Recommendation */}
            <div className="p-4 rounded-lg bg-ink-900/50 border border-ink-700">
              <p className="text-xs font-semibold text-ink-400 uppercase mb-3">Insight</p>
              <div className="flex items-center gap-3">
                <Info className="w-6 h-6 text-brand-400" />
                <div>
                  <p className="font-semibold text-white capitalize">
                    {trendData.recommendation || "Stable Market"}
                  </p>
                  <p className="text-sm text-ink-400">
                    {trendData.listingVelocity} listings/day
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Condition Assessment */}
      <div className="glass-card p-8 mb-8">
        <h2 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-blue-400" />
          Condition Assessment
        </h2>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {analysis.condition_scores &&
            Object.entries(analysis.condition_scores).map(([key, value]: [string, any]) => (
              <div key={key} className="p-4 rounded-lg bg-ink-900/50 border border-ink-700">
                <p className="text-xs font-semibold text-ink-400 uppercase mb-2 capitalize">
                  {key}
                </p>
                <p className="text-2xl font-bold text-white">{value}</p>
                <div className="w-full h-1 bg-ink-800 rounded-full mt-3">
                  <div
                    className="h-full bg-brand-500 rounded-full"
                    style={{ width: `${value}%` }}
                  />
                </div>
              </div>
            ))}
        </div>

        {analysis.condition_risk_score && (
          <div className="p-4 rounded-lg bg-rose-500/10 border border-rose-500/30">
            <p className="text-sm text-rose-300">
              <AlertTriangle className="w-4 h-4 inline mr-2" />
              Condition Risk Score: {analysis.condition_risk_score}/100
            </p>
          </div>
        )}
      </div>

      {/* Authenticity Verification */}
      <div className="glass-card p-8 mb-8">
        <h2 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-emerald-400" />
          Authenticity Verification
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <p className="text-sm font-semibold text-ink-400 mb-3">Verdict</p>
            <div
              className={`p-4 rounded-lg border ${
                analysis.authenticity_verdict
                  ? "bg-emerald-500/10 border-emerald-500/30"
                  : "bg-rose-500/10 border-rose-500/30"
              }`}
            >
              <p
                className={`font-semibold ${
                  analysis.authenticity_verdict ? "text-emerald-400" : "text-rose-400"
                }`}
              >
                {analysis.authenticity_verdict ? "Authentic" : "Not Verified"}
              </p>
              <p className="text-xs text-ink-400 mt-1">
                Confidence: {analysis.authenticity_confidence}%
              </p>
            </div>
          </div>

          <div>
            <p className="text-sm font-semibold text-ink-400 mb-3">Fraud Risk</p>
            <div className="p-4 rounded-lg bg-ink-900/50 border border-ink-700">
              <p className="text-2xl font-bold text-white">{analysis.fraud_risk_score}/100</p>
              <p className="text-xs text-ink-400 mt-1">{analysis.fraud_primary_concern}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Valuation Details */}
      <div className="glass-card p-8 mb-8">
        <h2 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-amber-400" />
          Valuation Details
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-lg bg-ink-900/50 border border-ink-700">
            <p className="text-xs font-semibold text-ink-400 uppercase mb-2">Resale Range</p>
            <p className="text-sm text-ink-200">
              {formatCurrency(analysis.resale_low)} - {formatCurrency(analysis.resale_high)}
            </p>
          </div>

          <div className="p-4 rounded-lg bg-ink-900/50 border border-ink-700">
            <p className="text-xs font-semibold text-ink-400 uppercase mb-2">Fast Sale Price</p>
            <p className="text-sm text-ink-200">{formatCurrency(analysis.fast_sale_price)}</p>
          </div>

          <div className="p-4 rounded-lg bg-ink-900/50 border border-ink-700">
            <p className="text-xs font-semibold text-ink-400 uppercase mb-2">Max Acquisition</p>
            <p className="text-sm text-ink-200">
              {formatCurrency(analysis.max_acquisition_price)}
            </p>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 justify-center">
        <button onClick={onBack} className="btn-secondary">
          Back to Dashboard
        </button>
        <button onClick={handleAddToPortfolio} className="btn-primary">
          Add to Portfolio
        </button>
      </div>
    </div>
  );
}
