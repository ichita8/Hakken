import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import type { Profile } from "@/lib/types";
import { DEFAULT_CATEGORIES, MARKETPLACES } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";
import { Settings as SettingsIcon, User, Target, AlertTriangle, Check, Loader2, Shield, Plus, X } from "lucide-react";

export default function Settings() {
  const { user, profile, refreshProfile } = useAuth();
  const [displayName, setDisplayName] = useState(profile?.display_name || "");
  const [budget, setBudget] = useState(profile?.budget?.toString() || "500");
  const [riskTolerance, setRiskTolerance] = useState<"conservative" | "moderate" | "aggressive">(profile?.risk_tolerance || "moderate");
  const [targetRoiMin, setTargetRoiMin] = useState(profile?.target_roi_min?.toString() || "20");
  const [targetDaysToSellMax, setTargetDaysToSellMax] = useState(profile?.target_days_to_sell_max?.toString() || "30");
  const [preferredCategories, setPreferredCategories] = useState<string[]>(profile?.preferred_categories || []);
  const [customCategories, setCustomCategories] = useState<string[]>([]);
  const [newCategory, setNewCategory] = useState("");
  const [preferredMarketplaces, setPreferredMarketplaces] = useState<string[]>(profile?.preferred_marketplaces || []);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name || "");
      setBudget(profile.budget?.toString() || "500");
      setRiskTolerance(profile.risk_tolerance || "moderate");
      setTargetRoiMin(profile.target_roi_min?.toString() || "20");
      setTargetDaysToSellMax(profile.target_days_to_sell_max?.toString() || "30");
      setPreferredCategories(profile.preferred_categories || []);
      const builtIn = new Set(DEFAULT_CATEGORIES);
      const custom = (profile.preferred_categories || []).filter((c) => !builtIn.has(c));
      setCustomCategories(custom);
      setPreferredMarketplaces(profile.preferred_marketplaces || []);
    }
  }, [profile]);

  function toggleCategory(cat: string) {
    setPreferredCategories((prev) => prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]);
  }

  function addCustomCategory() {
    const trimmed = newCategory.trim();
    if (!trimmed) return;
    if (preferredCategories.includes(trimmed)) return;
    setPreferredCategories((prev) => [...prev, trimmed]);
    setCustomCategories((prev) => [...prev, trimmed]);
    setNewCategory("");
  }

  function removeCustomCategory(cat: string) {
    setPreferredCategories((prev) => prev.filter((c) => c !== cat));
    setCustomCategories((prev) => prev.filter((c) => c !== cat));
  }

  function toggleMarketplace(m: string) {
    setPreferredMarketplaces((prev) => prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    setSaved(false);

    const updates: Partial<Profile> = {
      display_name: displayName,
      budget: parseFloat(budget) || 500,
      risk_tolerance: riskTolerance as "conservative" | "moderate" | "aggressive",
      target_roi_min: parseFloat(targetRoiMin) || 20,
      target_days_to_sell_max: parseInt(targetDaysToSellMax) || 30,
      preferred_categories: preferredCategories,
      preferred_marketplaces: preferredMarketplaces,
      updated_at: new Date().toISOString(),
    };

    await supabase.from("profiles").update(updates).eq("id", user.id);
    await refreshProfile();
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  const riskOptions: { value: "conservative" | "moderate" | "aggressive"; label: string; description: string }[] = [
    { value: "conservative", label: "Conservative", description: "Lower risk, steady returns" },
    { value: "moderate", label: "Moderate", description: "Balanced risk and reward" },
    { value: "aggressive", label: "Aggressive", description: "Higher risk, higher potential" },
  ];

  return (
    <div className="p-6 lg:p-10 max-w-3xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h1 className="font-display text-2xl lg:text-3xl font-bold text-white">Settings</h1>
        <p className="text-sm text-ink-400 mt-1">Configure your trading preferences and risk profile.</p>
      </div>

      {/* Profile section */}
      <form onSubmit={handleSave} className="glass-card p-6 space-y-5">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-white">
          <User className="w-4 h-4 text-brand-400" />
          Profile
        </h2>

        <div>
          <label className="label-text">Display Name</label>
          <input type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Your name" className="input-field" />
        </div>

        <div>
          <label className="label-text">Email</label>
          <input type="email" disabled value={user?.email || ""} className="input-field opacity-50 cursor-not-allowed" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label-text">Capital Budget ($)</label>
            <input type="number" value={budget} onChange={(e) => setBudget(e.target.value)} className="input-field" />
          </div>
          <div>
            <label className="label-text">Min Target ROI (%)</label>
            <input type="number" value={targetRoiMin} onChange={(e) => setTargetRoiMin(e.target.value)} className="input-field" />
          </div>
        </div>

        <div>
          <label className="label-text">Max Days to Sell</label>
          <input type="number" value={targetDaysToSellMax} onChange={(e) => setTargetDaysToSellMax(e.target.value)} className="input-field" />
        </div>

        {/* Risk tolerance */}
        <div>
          <label className="label-text">Risk Tolerance</label>
          <div className="grid grid-cols-3 gap-2">
            {riskOptions.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setRiskTolerance(opt.value)}
                className={`p-3 rounded-xl border text-sm transition-all ${
                  riskTolerance === opt.value
                    ? "border-brand-500/50 bg-brand-500/10 text-brand-400"
                    : "border-ink-700 bg-ink-900/50 text-ink-400 hover:border-ink-600"
                }`}
              >
                <p className="font-medium">{opt.label}</p>
                <p className="text-[10px] text-ink-500 mt-0.5">{opt.description}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Preferred categories */}
        <div>
          <label className="label-text">Preferred Categories</label>
          <div className="flex flex-wrap gap-2">
            {DEFAULT_CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => toggleCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-sm border transition-all ${
                  preferredCategories.includes(cat)
                    ? "border-brand-500/50 bg-brand-500/10 text-brand-400"
                    : "border-ink-700 bg-ink-900/50 text-ink-400 hover:border-ink-600"
                }`}
              >
                {cat}
              </button>
            ))}
            {customCategories.map((cat) => (
              <span
                key={cat}
                className="px-3 py-1.5 rounded-lg text-sm border border-brand-500/50 bg-brand-500/10 text-brand-400 flex items-center gap-1.5"
              >
                {cat}
                <button
                  type="button"
                  onClick={() => removeCustomCategory(cat)}
                  className="text-brand-400/60 hover:text-rose-400"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2 mt-3">
            <input
              type="text"
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCustomCategory(); } }}
              placeholder="Add custom category (e.g. Technology, Automobiles)"
              className="input-field flex-1"
            />
            <button
              type="button"
              onClick={addCustomCategory}
              disabled={!newCategory.trim()}
              className="btn-secondary flex items-center gap-1.5 disabled:opacity-40"
            >
              <Plus className="w-4 h-4" /> Add
            </button>
          </div>
          <p className="text-xs text-ink-500 mt-2">Custom categories will appear in the category dropdown when analyzing listings.</p>
        </div>

        {/* Preferred marketplaces */}
        <div>
          <label className="label-text">Preferred Marketplaces</label>
          <div className="flex flex-wrap gap-2">
            {MARKETPLACES.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => toggleMarketplace(m)}
                className={`px-3 py-1.5 rounded-lg text-sm border transition-all ${
                  preferredMarketplaces.includes(m)
                    ? "border-brand-500/50 bg-brand-500/10 text-brand-400"
                    : "border-ink-700 bg-ink-900/50 text-ink-400 hover:border-ink-600"
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        <button type="submit" disabled={saving} className="btn-primary w-full flex items-center justify-center gap-2">
          {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> :
           saved ? <><Check className="w-4 h-4" /> Saved!</> :
           "Save Settings"}
        </button>
      </form>

      {/* Account info */}
      <div className="glass-card p-6">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-white mb-4">
          <Shield className="w-4 h-4 text-brand-400" />
          Account
        </h2>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-ink-400">Member since</span>
            <span className="text-ink-200">{profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : "—"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-ink-400">Current budget</span>
            <span className="text-ink-200">{formatCurrency(profile?.budget)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-ink-400">Risk profile</span>
            <span className="text-ink-200 capitalize">{profile?.risk_tolerance}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
