import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CATEGORIES, MARKETPLACES } from "@/lib/analysis";
import { cn } from "@/lib/utils";
import { Check, Loader2, AlertCircle, ShieldCheck, Wallet, Target, ListChecks } from "lucide-react";

const RISK_OPTIONS = [
  { value: "conservative", label: "Conservative", desc: "25% ROI floor — fewer, safer deals" },
  { value: "moderate", label: "Moderate", desc: "15% ROI floor (default)" },
  { value: "aggressive", label: "Aggressive", desc: "8% ROI floor — more deals qualify" },
];

function Chip({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-md border px-2.5 py-1 text-xs transition-colors",
        active
          ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-300"
          : "border-border text-zinc-400 hover:text-zinc-200 hover:bg-white/5"
      )}
    >
      {children}
    </button>
  );
}

export default function Settings() {
  const { user, checkUserAuth } = useAuth();
  const [budget, setBudget] = useState("");
  const [targetRoi, setTargetRoi] = useState("");
  const [risk, setRisk] = useState("moderate");
  const [cats, setCats] = useState([]);
  const [mkts, setMkts] = useState([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const p = (user && user.data) || {};
    setBudget(p.budget != null ? String(p.budget) : "");
    setTargetRoi(p.target_roi_min != null ? String(p.target_roi_min) : "");
    setRisk(p.risk_tolerance || "moderate");
    setCats(p.preferred_categories || []);
    setMkts(p.preferred_marketplaces || []);
  }, [user && user.id]);

  const toggle = (list, setList, v) =>
    setList(list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  const save = async () => {
    setError("");
    setSaved(false);
    const b = budget === "" ? null : Number(budget);
    const t = targetRoi === "" ? null : Number(targetRoi);
    if (b != null && (isNaN(b) || b < 0)) return setError("Budget must be a positive number.");
    if (t != null && (isNaN(t) || t <= 0 || t >= 100)) return setError("Target ROI must be between 1 and 99.");
    setSaving(true);
    try {
      await base44.auth.updateMe({
        budget: b,
        target_roi_min: t,
        risk_tolerance: risk,
        preferred_categories: cats,
        preferred_marketplaces: mkts,
      });
      await checkUserAuth();
      setSaved(true);
    } catch (e) {
      setError((e && e.message) || "Could not save your settings. Please try again.");
    }
    setSaving(false);
  };

  return (
    <div className="p-6 md:p-8 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-zinc-500 mt-1 text-sm">Your profile and deal criteria.</p>
      </div>

      {/* Profile */}
      <div className="panel p-5 mb-4 flex items-center gap-4">
        <div className="h-12 w-12 rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center text-emerald-950 font-semibold text-lg shrink-0">
          {(user?.full_name || user?.email || "U").charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-heading font-semibold text-zinc-100">{user?.full_name || "Reseller"}</div>
          <div className="text-sm text-zinc-500 truncate">{user?.email}</div>
        </div>
        {user?.role && (
          <span className="text-[10px] uppercase tracking-wider rounded-md border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 px-2 py-1">
            {user.role}
          </span>
        )}
      </div>

      {/* Deal criteria */}
      <div className="panel p-5 mb-4">
        <div className="flex items-center gap-2 mb-1">
          <ShieldCheck className="h-4 w-4 text-emerald-400" />
          <h2 className="font-heading font-semibold text-zinc-100">Deal criteria</h2>
        </div>
        <p className="text-xs text-zinc-500 mb-4">
          These directly affect your analyses: the ROI floor sets the maximum recommended buy price in every new report.
        </p>

        <Label>Risk tolerance</Label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-2 mb-5">
          {RISK_OPTIONS.map((o) => (
            <button
              type="button"
              key={o.value}
              onClick={() => setRisk(o.value)}
              className={cn(
                "rounded-lg border p-3 text-left transition-colors",
                risk === o.value ? "border-emerald-500/40 bg-emerald-500/10" : "border-border hover:bg-white/5"
              )}
            >
              <div className="text-sm font-medium text-zinc-100">{o.label}</div>
              <div className="text-xs text-zinc-500 mt-0.5">{o.desc}</div>
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="set-roi" className="flex items-center gap-1.5">
              <Target className="h-3.5 w-3.5 text-emerald-400" /> Target min ROI (%) — optional
            </Label>
            <Input
              id="set-roi"
              type="number"
              min="1"
              max="99"
              className="mt-1.5 bg-background font-mono"
              placeholder="e.g. 20"
              value={targetRoi}
              onChange={(e) => setTargetRoi(e.target.value)}
            />
            <p className="mt-1.5 text-xs text-zinc-600">If set, this overrides the risk tolerance floor.</p>
          </div>
          <div>
            <Label htmlFor="set-budget" className="flex items-center gap-1.5">
              <Wallet className="h-3.5 w-3.5 text-emerald-400" /> Buying budget (USD) — optional
            </Label>
            <Input
              id="set-budget"
              type="number"
              min="0"
              className="mt-1.5 bg-background font-mono"
              placeholder="e.g. 5000"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
            />
            <p className="mt-1.5 text-xs text-zinc-600">Tracked against deployed capital in your Portfolio.</p>
          </div>
        </div>
      </div>

      {/* Preferences */}
      <div className="panel p-5 mb-5">
        <div className="flex items-center gap-2 mb-1">
          <ListChecks className="h-4 w-4 text-emerald-400" />
          <h2 className="font-heading font-semibold text-zinc-100">Preferences</h2>
        </div>
        <p className="text-xs text-zinc-500 mb-4">
          Your first preferred category and marketplace are preselected in the Analyze form.
        </p>

        <Label>Preferred categories</Label>
        <div className="flex flex-wrap gap-1.5 mt-2 mb-4">
          {CATEGORIES.map((c) => (
            <Chip key={c} active={cats.includes(c)} onClick={() => toggle(cats, setCats, c)}>
              {c}
            </Chip>
          ))}
        </div>

        <Label>Preferred marketplaces</Label>
        <div className="flex flex-wrap gap-1.5 mt-2">
          {MARKETPLACES.map((m) => (
            <Chip key={m} active={mkts.includes(m)} onClick={() => toggle(mkts, setMkts, m)}>
              {m}
            </Chip>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button onClick={save} disabled={saving} className="bg-emerald-500 hover:bg-emerald-400 text-emerald-950 font-semibold h-11 px-6">
          {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...</> : "Save settings"}
        </Button>
        {saved && (
          <span className="flex items-center gap-1.5 text-sm text-emerald-400">
            <Check className="h-4 w-4" /> Saved
          </span>
        )}
        {error && (
          <span className="flex items-center gap-1.5 text-sm text-rose-400">
            <AlertCircle className="h-4 w-4" /> {error}
          </span>
        )}
      </div>
    </div>
  );
}
