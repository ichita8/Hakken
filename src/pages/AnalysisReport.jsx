import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import ScoreRing from "@/components/ScoreRing";
import RecommendationBadge from "@/components/RecommendationBadge";
import { Button } from "@/components/ui/button";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import PortfolioForm from "@/components/portfolio/PortfolioForm";
import { Image } from "@/components/ui/image";
import { formatCurrency, formatMoney, formatPct, formatPctSigned, timeAgo } from "@/lib/format";
import {
  ArrowLeft, Trash2, AlertTriangle, ShieldAlert, CheckCircle2, XCircle,
  Package, Briefcase, Gauge, DollarSign, MessageSquareQuote, ExternalLink,
} from "lucide-react";

export default function AnalysisReport() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [portfolioOpen, setPortfolioOpen] = useState(false);
  const [portfolioSaving, setPortfolioSaving] = useState(false);
  const [addedToPortfolio, setAddedToPortfolio] = useState(false);

  useEffect(() => {
    base44.entities.Analysis.get(id)
      .then((a) => {
        if (!a) setNotFound(true);
        else setAnalysis(a);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [id]);

  const handleDelete = async () => {
    if (!confirm("Delete this analysis? This cannot be undone.")) return;
    await base44.entities.Analysis.delete(id);
    navigate("/history");
  };

  const handleAddToPortfolio = async (values) => {
    setPortfolioSaving(true);
    try {
      await base44.entities.PortfolioItem.create(values);
      setAddedToPortfolio(true);
      setPortfolioOpen(false);
    } catch (e) {
      // keep the dialog open so the user can retry
    }
    setPortfolioSaving(false);
  };

  if (loading) return <div className="p-8 text-center text-zinc-500">Loading report...</div>;
  if (notFound) return (
    <div className="p-8 max-w-md mx-auto text-center">
      <h2 className="font-heading text-xl font-semibold">Analysis not found</h2>
      <p className="text-zinc-500 mt-1 mb-5">It may have been deleted or doesn't belong to your account.</p>
      <Button asChild variant="outline"><Link to="/history">Back to history</Link></Button>
    </div>
  );

  const a = analysis;
  const layers = a.layers || {};
  const pi = layers.product_identification || {};
  const cond = layers.condition || {};
  const auth = layers.authenticity || {};
  const mv = layers.market_valuation || {};
  const risk = layers.risk || {};
  const showNegotiation = a.decision !== "BUY" && a.negotiation_max_price > 0;

  return (
    <div className="p-6 md:p-8 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <Button variant="ghost" size="sm" asChild className="text-zinc-400 hover:text-zinc-100">
          <Link to="/history"><ArrowLeft className="h-4 w-4 mr-1.5" /> History</Link>
        </Button>
        <Button variant="ghost" size="sm" onClick={handleDelete} className="text-zinc-500 hover:text-rose-400">
          <Trash2 className="h-4 w-4 mr-1.5" /> Delete
        </Button>
      </div>

      {a.is_fallback && (
        <div className="mb-5 flex items-start gap-2.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>
            <strong className="font-semibold">Limited analysis.</strong> Advanced AI analysis was unavailable,
            so these results are based on a heuristic estimate only. Re-run later for a full analysis.
          </span>
        </div>
      )}

      {/* Summary */}
      <div className="panel p-6 mb-4">
        <div className="flex flex-col sm:flex-row items-center gap-6">
          <ScoreRing score={a.opportunity_score} decision={a.decision} />
          <div className="flex-1 text-center sm:text-left">
            <RecommendationBadge decision={a.decision} size="lg" />
            <h1 className="font-heading text-xl font-semibold mt-3 text-zinc-100">{a.title}</h1>
            <div className="text-sm text-zinc-500 mt-1 flex flex-wrap items-center justify-center sm:justify-start gap-x-2 gap-y-1">
              {a.brand && <span>{a.brand}{a.model ? ` ${a.model}` : ""}</span>}
              {a.marketplace && <><span>·</span><span>{a.marketplace}</span></>}
              <span>·</span><span>{timeAgo(a.created_date)}</span>
            </div>
            <p className="text-sm text-zinc-400 mt-3 leading-relaxed">{a.score_explanation}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-6 pt-6 border-t border-border">
          <SummaryStat label="Est. market value" value={formatCurrency(a.fair_market_value)} />
          <SummaryStat label="Asking price" value={formatCurrency(a.asking_price)} />
          <SummaryStat
            label="Est. profit"
            value={formatMoney(a.net_profit)}
            accent={a.net_profit >= 0 ? "text-emerald-400" : "text-rose-400"}
          />
          <SummaryStat
            label="Est. ROI"
            value={formatPctSigned(a.roi)}
            accent={a.roi >= 0 ? "text-emerald-400" : "text-rose-400"}
          />
          <SummaryStat label="Risk" value={a.risk_level || "—"} accent={riskColor(a.risk_level)} />
          <SummaryStat label="Confidence" value={formatPct(a.data_confidence)} />
        </div>
      </div>

      {a.image_urls && a.image_urls.length > 0 && (
        <div className="panel p-4 mb-4">
          <div className="text-xs uppercase tracking-wider text-zinc-500 mb-3">Listing photos</div>
          <div className="flex flex-wrap gap-3">
            {a.image_urls.map((url, i) => (
              <div key={i} className="h-28 w-28 rounded-lg overflow-hidden border border-border">
                <Image src={url} alt={`photo ${i + 1}`} className="h-full w-full" fittingType="fill" />
              </div>
            ))}
          </div>
        </div>
      )}

      <Accordion type="multiple" defaultValue={["valuation"]} className="space-y-2">
        <Section value="valuation" icon={DollarSign} title="Market valuation">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Fair market value" value={formatMoney(a.fair_market_value)} />
            <Field label="Expected resale range" value={`${formatCurrency(a.resale_low)} – ${formatCurrency(a.resale_high)}`} />
            <Field label="Fast-sale estimate" value={formatMoney(a.fast_sale_price)} />
            <Field label="Max recommended acquisition" value={formatMoney(a.max_acquisition_price)} accent="text-emerald-400" />
          </div>
          <div className="mt-3 text-sm text-zinc-400">
            <span className="text-zinc-500">Basis: </span>{mv.basis || "Estimate based on general market knowledge."}
          </div>
          {mv.has_sufficient_data === false && (
            <div className="mt-3 flex items-start gap-2 text-sm text-amber-300/90">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
              Insufficient comparable data to make a high-confidence valuation.
            </div>
          )}
          {mv.comps && mv.comps.length > 0 && (
            <div className="mt-4">
              <div className="text-xs uppercase tracking-wider text-zinc-500 mb-2">Comparable sales</div>
              <div className="space-y-1.5">
                {mv.comps.map((c, i) => (
                  <div key={i} className="flex items-center justify-between text-sm rounded-lg bg-white/[0.03] px-3 py-2">
                    <div className="min-w-0">
                      <div className="text-zinc-200 truncate">{c.title || c.source}</div>
                      <div className="text-xs text-zinc-600">{c.source}{c.condition ? ` · ${c.condition}` : ""}{c.date ? ` · ${c.date}` : ""}</div>
                    </div>
                    <div className="font-mono text-zinc-300 ml-3">{formatCurrency(c.price)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Section>

        <Section value="profit" icon={Gauge} title="Profit breakdown">
          <div className="space-y-2 font-mono text-sm">
            <Row label="Expected sale price" value={formatMoney(a.expected_sale_price)} />
            <Row label="Asking (acquisition) price" value={`- ${formatMoney(a.asking_price)}`} />
            <Row label="Marketplace fees" value={`- ${formatMoney(a.marketplace_fees)}`} sub={`${(mv.estimated_marketplace_fee_pct || 0).toFixed(0)}%`} />
            <Row label="Shipping" value={`- ${formatMoney(a.shipping_cost)}`} />
            <Row label="Other costs" value={`- ${formatMoney(a.other_costs)}`} />
            <div className="border-t border-border my-1" />
            <Row label="Gross profit" value={formatSignedMoney(a.gross_profit)} accent={a.gross_profit >= 0 ? "text-zinc-200" : "text-rose-400"} />
            <Row label="Net profit" value={formatSignedMoney(a.net_profit)} accent={a.net_profit >= 0 ? "text-emerald-400" : "text-rose-400"} bold />
            <Row label="ROI" value={formatPctSigned(a.roi)} accent={a.roi >= 0 ? "text-emerald-400" : "text-rose-400"} bold />
          </div>
          <p className="mt-3 text-xs text-zinc-600">
            All figures are computed deterministically from the inputs above — never generated by the AI model directly.
          </p>
        </Section>

        <Section value="product" icon={Package} title="Product identification">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Brand" value={pi.brand || "Unknown"} />
            <Field label="Model" value={pi.model || "Unknown"} />
            <Field label="Variant" value={pi.variant || "—"} />
            <Field label="Year" value={pi.year || "—"} />
            <Field label="Category" value={a.category || pi.category || "—"} />
            <Field label="Identification confidence" value={formatPct((pi.confidence || 0) * 100)} />
          </div>
          {pi.attributes && pi.attributes.length > 0 && (
            <div className="mt-3">
              <div className="text-xs uppercase tracking-wider text-zinc-500 mb-2">Identified attributes</div>
              <div className="flex flex-wrap gap-1.5">
                {pi.attributes.map((at, i) => (
                  <span key={i} className="text-xs rounded-md bg-white/5 border border-border px-2 py-1 text-zinc-300">{at}</span>
                ))}
              </div>
            </div>
          )}
          {pi.uncertain && (
            <div className="mt-3 flex items-start gap-2 text-sm text-amber-300/90">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
              Some product information is uncertain.
            </div>
          )}
          {pi.reasoning && <p className="mt-3 text-sm text-zinc-400">{pi.reasoning}</p>}
        </Section>

        <Section value="condition" icon={Gauge} title="Condition assessment">
          <Field label="Overall condition" value={a.condition_overall || a.condition || "Unknown"} />
          <div className="grid grid-cols-2 gap-3 mt-3">
            <Field label="Condition confidence" value={formatPct((a.condition_confidence || 0) * 100)} />
            <Field label="Value impact" value={cond.value_impact || "—"} />
          </div>
          <ListBlock title="Observed defects" items={cond.defects} empty="None noted" negative />
          <ListBlock title="Missing components" items={cond.missing_components} empty="None noted" negative />
          <p className="mt-3 text-xs text-zinc-600">
            Condition is assessed from the supplied text and photos only. Hakken does not claim to visually verify
            anything that cannot be determined from what was provided.
          </p>
        </Section>

        <Section value="authenticity" icon={ShieldAlert} title="Authenticity / risk assessment">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Counterfeit risk" value={a.authenticity_risk || "Unknown"} accent={riskColor(a.authenticity_risk)} />
            <Field label="Authenticity confidence" value={formatPct((a.authenticity_confidence || 0) * 100)} />
          </div>
          <ListBlock title="Positive signals" items={auth.positive_signals} empty="None identified" positive />
          <ListBlock title="Warning signals" items={auth.warning_signals} empty="None detected" negative />
          <ListBlock title="Missing information" items={auth.missing_info} empty="None" />
          <div className="mt-3 flex items-start gap-2 text-xs text-zinc-600">
            <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            This is a risk assessment, not a guarantee of authenticity. Hakken never certifies an item as authentic
            solely on the basis of an AI model's opinion.
          </div>
        </Section>

        {showNegotiation && (
          <Section value="negotiation" icon={MessageSquareQuote} title="Negotiation engine">
            <div className="grid grid-cols-2 gap-3 mb-4">
              <Field label="Recommended max price" value={formatMoney(a.negotiation_max_price)} accent="text-emerald-400" />
              <Field
                label="Suggested offer range"
                value={`${formatCurrency(Math.round((a.negotiation_max_price || 0) * 0.88))} – ${formatCurrency(a.negotiation_max_price || 0)}`}
              />
            </div>
            <div className="rounded-lg border border-border bg-white/[0.03] p-4">
              <div className="text-xs uppercase tracking-wider text-zinc-500 mb-2 flex items-center gap-1.5">
                <MessageSquareQuote className="h-3.5 w-3.5" /> Suggested message
              </div>
              <p className="text-sm text-zinc-300 leading-relaxed">{a.negotiation_message}</p>
            </div>
          </Section>
        )}
      </Accordion>

      <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
        {addedToPortfolio ? (
          <span className="flex items-center gap-1.5 text-sm text-emerald-400">
            <CheckCircle2 className="h-4 w-4" /> Added to portfolio
          </span>
        ) : (
          <Button
            variant="outline"
            onClick={() => setPortfolioOpen(true)}
            className="border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/10"
          >
            <Briefcase className="h-4 w-4 mr-1.5" /> Add to portfolio
          </Button>
        )}
        {a.listing_url && (
          <Button variant="outline" asChild className="border-border text-zinc-300">
            <a href={a.listing_url} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4 mr-1.5" /> View original listing
            </a>
          </Button>
        )}
      </div>

      <Dialog open={portfolioOpen} onOpenChange={setPortfolioOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-heading">Add to portfolio</DialogTitle>
          </DialogHeader>
          <PortfolioForm
            initial={{
              title: a.title,
              category: a.category,
              marketplace_bought: a.marketplace,
              acquisition_price: a.asking_price,
              analysis_id: a.id,
              image_urls: a.image_urls,
            }}
            onSubmit={handleAddToPortfolio}
            submitting={portfolioSaving}
            submitLabel="Add to portfolio"
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function riskColor(level) {
  return level === "Low" ? "text-emerald-400" : level === "Medium" ? "text-amber-400" : level === "High" ? "text-rose-400" : "text-zinc-400";
}
function formatSignedMoney(n) {
  return (n >= 0 ? "+" : "") + formatMoney(n);
}

function SummaryStat({ label, value, accent }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wider text-zinc-500">{label}</div>
      <div className={`font-mono tnum font-semibold text-lg mt-0.5 ${accent || "text-zinc-100"}`}>{value}</div>
    </div>
  );
}

function Field({ label, value, accent }) {
  return (
    <div className="rounded-lg bg-white/[0.03] px-3 py-2">
      <div className="text-[11px] uppercase tracking-wider text-zinc-500">{label}</div>
      <div className={`text-sm font-medium mt-0.5 ${accent || "text-zinc-200"}`}>{value}</div>
    </div>
  );
}

function Row({ label, value, sub, accent, bold }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-zinc-500">{label}{sub && <span className="text-zinc-700 ml-1">({sub})</span>}</span>
      <span className={`${accent || "text-zinc-200"} ${bold ? "font-semibold" : ""} tnum`}>{value}</span>
    </div>
  );
}

function ListBlock({ title, items, empty, positive, negative }) {
  const list = items || [];
  return (
    <div className="mt-3">
      <div className="text-xs uppercase tracking-wider text-zinc-500 mb-2">{title}</div>
      {list.length === 0 ? (
        <div className="text-sm text-zinc-600">{empty}</div>
      ) : (
        <ul className="space-y-1.5">
          {list.map((it, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-zinc-300">
              {positive ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" />
              ) : negative ? (
                <XCircle className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
              ) : (
                <span className="h-1.5 w-1.5 rounded-full bg-zinc-600 mt-1.5 shrink-0" />
              )}
              <span>{it}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Section({ value, icon: Icon, title, children }) {
  return (
    <AccordionItem value={value} className="panel px-4">
      <AccordionTrigger className="hover:no-underline py-4">
        <div className="flex items-center gap-2.5 font-heading font-semibold text-zinc-100">
          <Icon className="h-4 w-4 text-emerald-400" />
          {title}
        </div>
      </AccordionTrigger>
      <AccordionContent className="pb-4 pt-1 text-zinc-300">{children}</AccordionContent>
    </AccordionItem>
  );
}
