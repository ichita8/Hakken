import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import type { Analysis, Comp, InspectionItem } from "@/lib/types";
import { formatCurrency, formatPercent, getDecisionColor, getScoreColor, getScoreBgColor, getTierColor, formatDate } from "@/lib/utils";
import {
  ArrowLeft, Package, ShieldCheck, DollarSign, Target, AlertTriangle, ScanLine,
  TrendingUp, TrendingDown, MessageSquare, Copy, Check, Briefcase, ListChecks,
  ExternalLink, Info, Eye, ShieldAlert
} from "lucide-react";

interface AnalysisReportProps {
  analysisId: string;
  onBack: () => void;
  onNavigate: (page: "dashboard" | "analyze" | "portfolio" | "settings") => void;
}

export default function AnalysisReport({ analysisId, onBack, onNavigate }: AnalysisReportProps) {
  const { user } = useAuth();
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [addedToPortfolio, setAddedToPortfolio] = useState(false);

  useEffect(() => {
    async function load() {
      if (!user || !analysisId) return;
      const { data } = await supabase
        .from("analyses")
        .select("*")
        .eq("id", analysisId)
        .eq("user_id", user.id)
        .maybeSingle();
      setAnalysis(data as Analysis | null);
      setLoading(false);
    }
    load();
    const interval = setInterval(load, 3000);
    if (analysis?.status === "complete") clearInterval(interval);
    return () => clearInterval(interval);
  }, [user, analysisId, analysis?.status]);

  function copyNegotiationMessage() {
    if (analysis?.negotiation_message) {
      navigator.clipboard.writeText(analysis.negotiation_message);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  async function addToPortfolio() {
    if (!user || !analysis) return;
    await supabase.from("portfolio_items").insert({
      user_id: user.id,
      analysis_id: analysis.id,
      title: analysis.title,
      category: analysis.category || analysis.item_brand || "General",
      marketplace_bought: analysis.marketplace,
      acquisition_price: analysis.asking_price,
      listing_price: analysis.fair_market_value || null,
      status: "active",
      image_urls: analysis.image_urls || [],
    });
    setAddedToPortfolio(true);
  }

  if (loading) {
    return (
      <div className="p-6 lg:p-10 max-w-5xl mx-auto">
        <div className="space-y-4">
          <div className="h-8 w-48 shimmer-bg rounded-lg" />
          <div className="h-64 shimmer-bg rounded-2xl" />
          <div className="grid grid-cols-2 gap-4">
            <div className="h-48 shimmer-bg rounded-2xl" />
            <div className="h-48 shimmer-bg rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="p-6 lg:p-10 max-w-5xl mx-auto text-center">
        <p className="text-ink-400">Analysis not found.</p>
        <button onClick={onBack} className="btn-secondary mt-4">Go Back</button>
      </div>
    );
  }

  if (analysis.status !== "complete") {
    return (
      <div className="p-6 lg:p-10 max-w-5xl mx-auto text-center">
        <div className="glass-card p-12">
          <div className="w-16 h-16 rounded-2xl bg-brand-500/10 flex items-center justify-center mx-auto mb-4">
            <ScanLine className="w-8 h-8 text-brand-400 animate-pulse" />
          </div>
          <h2 className="text-lg font-medium text-ink-100 mb-2">Analysis in progress...</h2>
          <p className="text-sm text-ink-400">The 5-layer pipeline is evaluating this listing.</p>
        </div>
      </div>
    );
  }

  const layerResults = analysis.layer_results;
  const scores = analysis.condition_scores || {};

  return (
    <div className="p-6 lg:p-10 max-w-5xl mx-auto space-y-6 animate-fade-in">
      {/* Back button */}
      <button onClick={onBack} className="flex items-center gap-2 text-sm text-ink-400 hover:text-ink-100 transition-colors">
        <ArrowLeft className="w-4 h-4" />
        Back to Dashboard
      </button>

      {/* Header */}
      <div className="glass-card p-6 lg:p-8">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              {analysis.decision && (
                <span className={`text-xs px-3 py-1 rounded-full border font-semibold ${getDecisionColor(analysis.decision)}`}>
                  {analysis.decision}
                </span>
              )}
              <span className="text-xs text-ink-500">{analysis.marketplace}</span>
              <span className="text-xs text-ink-500">{formatDate(analysis.created_at)}</span>
            </div>
            <h1 className="font-display text-xl lg:text-2xl font-bold text-white mb-2">{analysis.title}</h1>
            {analysis.item_brand && (
              <p className="text-sm text-ink-400">
                {analysis.item_brand} {analysis.item_model} {analysis.item_year && `· ${analysis.item_year}`}
                {analysis.item_color && ` · ${analysis.item_color}`}
              </p>
            )}
          </div>

          {/* Opportunity score */}
          {analysis.opportunity_score !== null && (
            <div className="flex items-center gap-4">
              <div className="text-center">
                <div className={`text-4xl font-bold font-display ${getScoreColor(analysis.opportunity_score)}`}>
                  {analysis.opportunity_score}
                </div>
                <div className={`text-xs uppercase tracking-wider ${getTierColor(analysis.opportunity_tier)}`}>
                  {analysis.opportunity_tier}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Key metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6 pt-6 border-t border-ink-800/60">
          <Metric label="Asking Price" value={formatCurrency(analysis.asking_price)} />
          <Metric label="Fair Market Value" value={formatCurrency(analysis.fair_market_value)} />
          <Metric
            label="Expected Profit"
            value={formatCurrency(analysis.expected_profit)}
            color={analysis.expected_profit && analysis.expected_profit > 0 ? "text-emerald-400" : "text-rose-400"}
            icon={analysis.expected_profit && analysis.expected_profit > 0 ? TrendingUp : TrendingDown}
          />
          <Metric
            label="Expected ROI"
            value={formatPercent(analysis.expected_roi)}
            color={analysis.expected_roi && analysis.expected_roi > 0 ? "text-emerald-400" : "text-rose-400"}
          />
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-3 mt-6">
          <button onClick={addToPortfolio} disabled={addedToPortfolio} className="btn-primary flex items-center gap-2">
            {addedToPortfolio ? <><Check className="w-4 h-4" /> Added to Portfolio</> : <><Briefcase className="w-4 h-4" /> Add to Portfolio</>}
          </button>
          {analysis.listing_url && (
            <a href={analysis.listing_url} target="_blank" rel="noopener noreferrer" className="btn-secondary flex items-center gap-2">
              <ExternalLink className="w-4 h-4" /> View Listing
            </a>
          )}
        </div>
      </div>

      {/* Layer 1: Product Identification */}
      <Section icon={Package} title="Layer 1 — Product Identification" color="text-brand-400">
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          <Detail label="Brand" value={analysis.item_brand} />
          <Detail label="Model" value={analysis.item_model} />
          <Detail label="Year" value={analysis.item_year} />
          <Detail label="Color" value={analysis.item_color} />
          <Detail label="Variant" value={analysis.item_variant} />
          <Detail label="Accessories" value={analysis.item_accessories} />
        </div>
        <div className="mt-4 p-4 rounded-xl bg-ink-900/50 border border-ink-800/60">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-ink-400 uppercase tracking-wider">Identification Confidence</span>
            <span className={`text-sm font-semibold ${getScoreColor(analysis.identification_confidence)}`}>
              {analysis.identification_confidence}%
            </span>
          </div>
          <div className="h-2 rounded-full bg-ink-800 overflow-hidden">
            <div className={`h-full ${getScoreBgColor(analysis.identification_confidence)} transition-all duration-500`} style={{ width: `${analysis.identification_confidence || 0}%` }} />
          </div>
          <p className="text-xs text-ink-400 mt-3 leading-relaxed">{analysis.identification_reasoning}</p>
        </div>
      </Section>

      {/* Layer 2: Condition Assessment */}
      <Section icon={Eye} title="Layer 2 — Condition Assessment" color="text-blue-400">
        <div className="flex items-center justify-between mb-4">
          <div>
            <span className="text-sm text-ink-400">Overall Condition: </span>
            <span className="text-sm font-semibold text-white">{analysis.item_condition}</span>
          </div>
          <div className="text-right">
            <span className="text-xs text-ink-400">Risk Score: </span>
            <span className={`text-sm font-semibold ${analysis.condition_risk_score && analysis.condition_risk_score > 50 ? "text-rose-400" : "text-emerald-400"}`}>
              {analysis.condition_risk_score}/100
            </span>
          </div>
        </div>

        {Object.keys(scores).length > 0 && (
          <div className="space-y-2.5">
            {Object.entries(scores).map(([key, value]) => (
              <div key={key}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-ink-400 capitalize">{key}</span>
                  <span className={`text-xs font-medium ${getScoreColor(value)}`}>{value}/100</span>
                </div>
                <div className="h-1.5 rounded-full bg-ink-800 overflow-hidden">
                  <div className={`h-full ${getScoreBgColor(value)} transition-all duration-500`} style={{ width: `${value}%` }} />
                </div>
              </div>
            ))}
          </div>
        )}

        {layerResults?.layer2_condition?.issues && layerResults.layer2_condition.issues.length > 0 && (
          <div className="mt-4 p-3 rounded-xl bg-rose-500/5 border border-rose-500/20">
            <p className="text-xs font-medium text-rose-300 mb-1.5">Detected Issues:</p>
            <div className="flex flex-wrap gap-2">
              {layerResults.layer2_condition.issues.map((issue: string) => (
                <span key={issue} className="text-xs px-2 py-1 rounded-lg bg-rose-500/10 text-rose-300">{issue}</span>
              ))}
            </div>
          </div>
        )}

        <p className="text-xs text-ink-400 mt-3 leading-relaxed">{layerResults?.layer2_condition?.reasoning}</p>
      </Section>

      {/* Layer 3: Authenticity Verification */}
      <Section icon={ShieldCheck} title="Layer 3 — Authenticity Verification" color="text-emerald-400">
        <div className="flex items-center gap-4 mb-4">
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${analysis.authenticity_verdict ? "bg-emerald-500/10" : "bg-rose-500/10"}`}>
            {analysis.authenticity_verdict ? (
              <ShieldCheck className="w-7 h-7 text-emerald-400" />
            ) : (
              <ShieldAlert className="w-7 h-7 text-rose-400" />
            )}
          </div>
          <div>
            <p className={`text-lg font-semibold ${analysis.authenticity_verdict ? "text-emerald-400" : "text-rose-400"}`}>
              {analysis.authenticity_verdict ? "Likely Authentic" : "Authenticity Concerns"}
            </p>
            <p className="text-xs text-ink-400">Confidence: {analysis.authenticity_confidence}%</p>
          </div>
        </div>

        {layerResults?.layer3_authenticity && (
          <div className="grid sm:grid-cols-2 gap-4">
            {layerResults.layer3_authenticity.positiveSignals?.length > 0 && (
              <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
                <p className="text-xs font-medium text-emerald-300 mb-2">Positive Signals</p>
                <ul className="space-y-1">
                  {layerResults.layer3_authenticity.positiveSignals.map((s: string) => (
                    <li key={s} className="text-xs text-ink-300 flex items-start gap-1.5">
                      <Check className="w-3 h-3 text-emerald-400 mt-0.5 flex-shrink-0" /> {s}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {layerResults.layer3_authenticity.negativeSignals?.length > 0 && (
              <div className="p-3 rounded-xl bg-rose-500/5 border border-rose-500/20">
                <p className="text-xs font-medium text-rose-300 mb-2">Concerns</p>
                <ul className="space-y-1">
                  {layerResults.layer3_authenticity.negativeSignals.map((s: string) => (
                    <li key={s} className="text-xs text-ink-300 flex items-start gap-1.5">
                      <AlertTriangle className="w-3 h-3 text-rose-400 mt-0.5 flex-shrink-0" /> {s}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </Section>

      {/* Layer 4: Market Valuation */}
      <Section icon={DollarSign} title="Layer 4 — Market Valuation" color="text-amber-400">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <Metric label="Fair Market Value" value={formatCurrency(analysis.fair_market_value)} />
          <Metric label="Resale Low" value={formatCurrency(analysis.resale_low)} />
          <Metric label="Resale High" value={formatCurrency(analysis.resale_high)} />
          <Metric label="Fast Sale Price" value={formatCurrency(analysis.fast_sale_price)} />
        </div>

        {/* Price visualization */}
        <div className="p-4 rounded-xl bg-ink-900/50 border border-ink-800/60">
          <div className="relative h-20 mb-2">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full h-2 rounded-full bg-gradient-to-r from-rose-500/30 via-amber-500/30 to-emerald-500/30" />
            </div>
            {/* Markers */}
            <PriceMarker label="Ask" value={analysis.asking_price} max={analysis.resale_high || analysis.asking_price} color="bg-white" />
            <PriceMarker label="FMV" value={analysis.fair_market_value} max={analysis.resale_high || analysis.asking_price} color="bg-amber-400" />
            <PriceMarker label="Max" value={analysis.max_acquisition_price} max={analysis.resale_high || analysis.asking_price} color="bg-emerald-400" />
          </div>
          <div className="flex justify-between text-xs text-ink-500">
            <span>$0</span>
            <span>{formatCurrency(analysis.resale_high)}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mt-4">
          <Detail label="Max Acquisition Price" value={formatCurrency(analysis.max_acquisition_price)} />
          <Detail label="Days to Sell" value={analysis.expected_days_to_sell_low && analysis.expected_days_to_sell_high ? `${analysis.expected_days_to_sell_low}–${analysis.expected_days_to_sell_high} days` : null} />
        </div>

        <div className="mt-4 flex items-center gap-2">
          <span className="text-xs text-ink-400">Valuation Confidence:</span>
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${
            analysis.valuation_confidence === "High" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" :
            analysis.valuation_confidence === "Medium" ? "bg-amber-500/10 text-amber-400 border-amber-500/30" :
            "bg-rose-500/10 text-rose-400 border-rose-500/30"
          }`}>
            {analysis.valuation_confidence}
          </span>
        </div>

        {/* Comps */}
        {analysis.comps && analysis.comps.length > 0 && (
          <div className="mt-6">
            <h4 className="text-sm font-medium text-ink-200 mb-3">Comparable Sales</h4>
            <div className="space-y-2">
              {analysis.comps.map((comp: Comp, i: number) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-ink-900/50 border border-ink-800/60">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-ink-100 truncate">{comp.title}</p>
                    <div className="flex items-center gap-3 text-xs text-ink-500 mt-0.5">
                      <span>{comp.source}</span>
                      <span>{comp.condition}</span>
                      <span>{formatDate(comp.date)}</span>
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-white ml-3">{formatCurrency(comp.soldPrice)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </Section>

      {/* Layer 5: Opportunity Assessment */}
      <Section icon={Target} title="Layer 5 — Opportunity Assessment" color="text-brand-400">
        <div className="flex items-center gap-6 mb-4">
          <div className="relative w-24 h-24">
            <svg className="w-24 h-24 -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="42" fill="none" stroke="rgb(30, 41, 59)" strokeWidth="8" />
              <circle
                cx="50" cy="50" r="42" fill="none"
                stroke="currentColor"
                strokeWidth="8"
                strokeLinecap="round"
                className={getScoreColor(analysis.opportunity_score)}
                strokeDasharray={`${(analysis.opportunity_score || 0) * 2.64} 264`}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className={`text-xl font-bold font-display ${getScoreColor(analysis.opportunity_score)}`}>
                {analysis.opportunity_score}
              </span>
            </div>
          </div>
          <div>
            <p className={`text-lg font-semibold ${getTierColor(analysis.opportunity_tier)}`}>{analysis.opportunity_tier}</p>
            <p className="text-xs text-ink-400 mt-1 max-w-md">{layerResults?.layer5_opportunity?.reasoning}</p>
          </div>
        </div>
      </Section>

      {/* Fraud Assessment */}
      <Section icon={AlertTriangle} title="Fraud Risk Assessment" color="text-rose-400">
        <div className="flex items-center gap-4 mb-4">
          <div className="text-center">
            <div className={`text-3xl font-bold font-display ${analysis.fraud_risk_score && analysis.fraud_risk_score > 50 ? "text-rose-400" : "text-emerald-400"}`}>
              {analysis.fraud_risk_score}
            </div>
            <div className="text-xs text-ink-500 uppercase tracking-wider">Risk Score</div>
          </div>
          <div className="flex-1 space-y-2">
            <div className="p-3 rounded-xl bg-rose-500/5 border border-rose-500/20">
              <p className="text-xs text-ink-400">Primary Concern</p>
              <p className="text-sm text-rose-300 mt-0.5">{analysis.fraud_primary_concern}</p>
            </div>
            <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/20">
              <p className="text-xs text-ink-400">Secondary Concern</p>
              <p className="text-sm text-amber-300 mt-0.5">{analysis.fraud_secondary_concern}</p>
            </div>
          </div>
        </div>
      </Section>

      {/* Inspection Checklist */}
      {analysis.inspection_checklist && analysis.inspection_checklist.length > 0 && (
        <Section icon={ListChecks} title="Inspection Checklist" color="text-blue-400">
          <div className="space-y-2">
            {analysis.inspection_checklist.map((item: InspectionItem, i: number) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-ink-900/50 border border-ink-800/60">
                <div className={`w-5 h-5 rounded border flex-shrink-0 mt-0.5 ${
                  item.priority === "Critical" ? "border-rose-500/50" :
                  item.priority === "High" ? "border-amber-500/50" : "border-ink-600"
                }`} />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm text-ink-100">{item.item}</p>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border ${
                      item.priority === "Critical" ? "bg-rose-500/10 text-rose-400 border-rose-500/30" :
                      item.priority === "High" ? "bg-amber-500/10 text-amber-400 border-amber-500/30" :
                      "bg-blue-500/10 text-blue-400 border-blue-500/30"
                    }`}>
                      {item.priority}
                    </span>
                  </div>
                  <p className="text-xs text-ink-500 mt-0.5">{item.notes}</p>
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Negotiation Strategy */}
      {analysis.negotiation_recommended_offer !== null && (
        <Section icon={MessageSquare} title="Negotiation Strategy" color="text-brand-400">
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
            <Detail label="Recommended Offer" value={formatCurrency(analysis.negotiation_recommended_offer)} highlight />
            <Detail label="Walk-Away Price" value={formatCurrency(analysis.negotiation_walk_away_price)} />
            <Detail label="Acceptance Probability" value={analysis.negotiation_probability !== null ? `${analysis.negotiation_probability}%` : null} />
          </div>

          {analysis.negotiation_message && (
            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-ink-400 uppercase tracking-wider">Suggested Message</span>
                <button onClick={copyNegotiationMessage} className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1">
                  {copied ? <><Check className="w-3 h-3" /> Copied</> : <><Copy className="w-3 h-3" /> Copy</>}
                </button>
              </div>
              <div className="p-4 rounded-xl bg-ink-900/50 border border-ink-800/60">
                <p className="text-sm text-ink-200 leading-relaxed whitespace-pre-wrap">{analysis.negotiation_message}</p>
              </div>
            </div>
          )}
        </Section>
      )}

      {/* Description (if provided) */}
      {analysis.description && (
        <Section icon={Info} title="Original Listing Description" color="text-ink-400">
          <p className="text-sm text-ink-300 leading-relaxed whitespace-pre-wrap">{analysis.description}</p>
        </Section>
      )}
    </div>
  );
}

function Section({ icon: Icon, title, color, children }: { icon: typeof Package; title: string; color: string; children: React.ReactNode }) {
  return (
    <div className="glass-card p-6 animate-slide-up">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-white mb-4">
        <Icon className={`w-4 h-4 ${color}`} />
        {title}
      </h2>
      {children}
    </div>
  );
}

function Metric({ label, value, color, icon: Icon }: { label: string; value: string; color?: string; icon?: typeof TrendingUp }) {
  return (
    <div>
      <p className="text-xs text-ink-400 uppercase tracking-wider">{label}</p>
      <p className={`text-lg font-semibold font-display mt-1 flex items-center gap-1.5 ${color || "text-white"}`}>
        {Icon && <Icon className="w-4 h-4" />}
        {value}
      </p>
    </div>
  );
}

function Detail({ label, value, highlight }: { label: string; value: string | null; highlight?: boolean }) {
  return (
    <div className="p-3 rounded-xl bg-ink-900/50 border border-ink-800/60">
      <p className="text-xs text-ink-400 uppercase tracking-wider">{label}</p>
      <p className={`text-sm mt-1 ${highlight ? "text-brand-400 font-semibold" : "text-ink-100"}`}>{value || "—"}</p>
    </div>
  );
}

function PriceMarker({ label, value, max, color }: { label: string; value: number | null; max: number; color: string }) {
  if (value === null || max === 0) return null;
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div className="absolute top-0 flex flex-col items-center" style={{ left: `${pct}%`, transform: "translateX(-50%)" }}>
      <div className={`w-3 h-3 rounded-full ${color} -translate-y-1.5`} />
      <span className="text-[9px] text-ink-500 mt-1 whitespace-nowrap">{label}</span>
    </div>
  );
}
