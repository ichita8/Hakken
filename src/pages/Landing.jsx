import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import Logo from "@/components/Logo";
import { Button } from "@/components/ui/button";
import {
  Search, ShieldCheck, TrendingUp, ArrowRight, Layers,
  LineChart, Target, AlertTriangle, Sparkles,
} from "lucide-react";

const LAYERS = [
  { n: "01", title: "Product Identification", desc: "Brand, model, variant, year and attributes from the listing text and photos." },
  { n: "02", title: "Condition Assessment", desc: "Overall condition, defects, missing parts, and how they hit resale value." },
  { n: "03", title: "Authenticity / Risk", desc: "Positive and warning signals — a risk assessment, never a guarantee." },
  { n: "04", title: "Market Valuation", desc: "Fair market value, resale range, fast-sale price and max buy price." },
  { n: "05", title: "Opportunity", desc: "A transparent 0–100 score and a clear BUY / NEGOTIATE / WATCH / PASS call." },
];

const DECISIONS = [
  { label: "BUY", color: "text-emerald-400", desc: "Strong opportunity." },
  { label: "NEGOTIATE", color: "text-amber-400", desc: "Profitable at a lower price." },
  { label: "WATCH", color: "text-sky-400", desc: "Interesting, but wait." },
  { label: "PASS", color: "text-rose-400", desc: "Risk/reward isn't there." },
];

export default function Landing() {
  const { isAuthenticated, authChecked } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (authChecked && isAuthenticated) navigate("/dashboard", { replace: true });
  }, [authChecked, isAuthenticated, navigate]);

  return (
    <div className="min-h-screen bg-background text-foreground grid-bg">
      <header className="border-b border-border">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Logo to="/" />
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild className="text-zinc-300 hover:text-white">
              <Link to="/login">Sign in</Link>
            </Button>
            <Button size="sm" asChild className="bg-emerald-500 hover:bg-emerald-400 text-emerald-950 font-semibold">
              <Link to="/register">Get started</Link>
            </Button>
          </div>
        </div>
      </header>

      <section className="max-w-6xl mx-auto px-6 pt-20 pb-24">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-white/[0.03] px-3 py-1 text-xs text-zinc-400 mb-6">
            <Sparkles className="h-3 w-3 text-emerald-400" />
            AI-powered resale intelligence
          </div>
          <h1 className="font-heading text-5xl sm:text-6xl font-semibold tracking-tight leading-[1.05]">
            Find the deals<br />
            <span className="text-emerald-400">worth buying.</span>
          </h1>
          <p className="mt-6 text-lg text-zinc-400 max-w-xl leading-relaxed">
            Hakken analyzes any secondhand listing and tells you what it's worth, what you could
            make, what could go wrong — and whether you should buy it. In seconds.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button size="lg" asChild className="bg-emerald-500 hover:bg-emerald-400 text-emerald-950 font-semibold h-12 px-6">
              <Link to="/register">
                Start analyzing <ArrowRight className="h-4 w-4 ml-2" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild className="h-12 px-6 border-border text-zinc-200 hover:bg-white/5">
              <Link to="/login">I have an account</Link>
            </Button>
          </div>
        </div>

        <div className="mt-16 grid grid-cols-2 sm:grid-cols-4 gap-3">
          {DECISIONS.map((d) => (
            <div key={d.label} className="panel p-4">
              <div className={`font-heading font-semibold text-lg ${d.color}`}>{d.label}</div>
              <div className="text-sm text-zinc-500 mt-1">{d.desc}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="border-t border-border bg-card/30">
        <div className="max-w-6xl mx-auto px-6 py-20">
          <div className="max-w-2xl mb-12">
            <div className="text-xs uppercase tracking-widest text-emerald-400 font-medium mb-3">The core question</div>
            <h2 className="font-heading text-3xl sm:text-4xl font-semibold tracking-tight">
              "Is this listing worth buying?"
            </h2>
            <p className="mt-4 text-zinc-400 text-lg">
              Every analysis answers five things — what it is, what it's worth, what you could make,
              what could go wrong, and what to do next.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {[
              { icon: Search, title: "What is it?", desc: "Identifies the product from text and photos." },
              { icon: TrendingUp, title: "What is it worth?", desc: "Fair market value and resale range." },
              { icon: LineChart, title: "What could I make?", desc: "Profit, ROI and max buy price." },
              { icon: AlertTriangle, title: "What could go wrong?", desc: "Authenticity and condition risk." },
              { icon: Target, title: "Should I buy it?", desc: "A clear verdict and negotiation plan." },
              { icon: ShieldCheck, title: "Can I trust it?", desc: "Transparent, confidence-scored, no fabricated data." },
            ].map((f) => {
              const Icon = f.icon;
              return (
                <div key={f.title} className="panel p-5">
                  <Icon className="h-5 w-5 text-emerald-400 mb-3" />
                  <div className="font-heading font-semibold text-zinc-100">{f.title}</div>
                  <div className="text-sm text-zinc-500 mt-1">{f.desc}</div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="border-t border-border">
        <div className="max-w-6xl mx-auto px-6 py-20">
          <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-emerald-400 font-medium mb-3">
            <Layers className="h-3.5 w-3.5" /> The 5-layer pipeline
          </div>
          <h2 className="font-heading text-3xl sm:text-4xl font-semibold tracking-tight mb-10">
            How Hakken thinks
          </h2>
          <div className="space-y-2">
            {LAYERS.map((l) => (
              <div key={l.n} className="panel p-5 flex items-start gap-5">
                <div className="font-mono text-emerald-400/70 text-sm pt-0.5">{l.n}</div>
                <div className="flex-1">
                  <div className="font-heading font-semibold text-zinc-100">{l.title}</div>
                  <div className="text-sm text-zinc-500 mt-1">{l.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-border bg-emerald-500/[0.03]">
        <div className="max-w-6xl mx-auto px-6 py-20 text-center">
          <h2 className="font-heading text-3xl sm:text-4xl font-semibold tracking-tight">
            Stop guessing. Start finding hidden value.
          </h2>
          <p className="mt-4 text-zinc-400 max-w-lg mx-auto">
            Create a free account and run your first analysis in under a minute.
          </p>
          <Button size="lg" asChild className="mt-8 bg-emerald-500 hover:bg-emerald-400 text-emerald-950 font-semibold h-12 px-8">
            <Link to="/register">
              Get started free <ArrowRight className="h-4 w-4 ml-2" />
            </Link>
          </Button>
        </div>
      </section>

      <footer className="border-t border-border">
        <div className="max-w-6xl mx-auto px-6 py-8 flex items-center justify-between">
          <Logo to="/" />
          <p className="text-xs text-zinc-600">発見 — finding hidden value. © {new Date().getFullYear()} Hakken</p>
        </div>
      </footer>
    </div>
  );
}
