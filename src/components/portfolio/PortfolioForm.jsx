import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CATEGORIES, MARKETPLACES } from "@/lib/analysis";
import { AlertCircle, Loader2 } from "lucide-react";

export default function PortfolioForm({ initial, onSubmit, submitting, submitLabel = "Save item" }) {
  const init = initial || {};
  const [form, setForm] = useState({
    title: init.title || "",
    category: init.category || "Other",
    marketplace_bought: init.marketplace_bought || "eBay",
    acquisition_price: init.acquisition_price != null ? String(init.acquisition_price) : "",
    listing_price: init.listing_price != null ? String(init.listing_price) : "",
    fees_paid: init.fees_paid != null ? String(init.fees_paid) : "0",
    shipping_paid: init.shipping_paid != null ? String(init.shipping_paid) : "0",
    status: init.status || "active",
    notes: init.notes || "",
  });
  const [error, setError] = useState("");
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = (e) => {
    e.preventDefault();
    setError("");
    if (!form.title.trim()) return setError("Please enter a title.");
    const acq = Number(form.acquisition_price);
    if (!acq || acq <= 0) return setError("Please enter a valid acquisition price.");
    const listing = form.listing_price === "" ? null : Number(form.listing_price);
    if (listing != null && (isNaN(listing) || listing < 0)) return setError("Listing price must be a valid number.");
    onSubmit({
      analysis_id: init.analysis_id || null,
      image_urls: init.image_urls || [],
      title: form.title.trim(),
      category: form.category,
      marketplace_bought: form.marketplace_bought,
      acquisition_price: acq,
      listing_price: listing,
      fees_paid: Number(form.fees_paid) || 0,
      shipping_paid: Number(form.shipping_paid) || 0,
      status: form.status,
      notes: form.notes,
    });
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <Label htmlFor="pf-title">Title *</Label>
        <Input
          id="pf-title"
          className="mt-1.5 bg-background"
          placeholder="e.g. Rolex Submariner 116610LN"
          value={form.title}
          onChange={(e) => set("title", e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label>Category</Label>
          <Select value={form.category} onValueChange={(v) => set("category", v)}>
            <SelectTrigger className="mt-1.5 bg-background"><SelectValue /></SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Where you bought it</Label>
          <Select value={form.marketplace_bought} onValueChange={(v) => set("marketplace_bought", v)}>
            <SelectTrigger className="mt-1.5 bg-background"><SelectValue /></SelectTrigger>
            <SelectContent>
              {MARKETPLACES.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="pf-acq">Acquisition price (USD) *</Label>
          <Input
            id="pf-acq"
            type="number"
            min="0"
            step="0.01"
            className="mt-1.5 bg-background font-mono"
            placeholder="0.00"
            value={form.acquisition_price}
            onChange={(e) => set("acquisition_price", e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="pf-listing">Listing price (USD, optional)</Label>
          <Input
            id="pf-listing"
            type="number"
            min="0"
            step="0.01"
            className="mt-1.5 bg-background font-mono"
            placeholder="0.00"
            value={form.listing_price}
            onChange={(e) => set("listing_price", e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <Label>Status</Label>
          <Select value={form.status} onValueChange={(v) => set("status", v)}>
            <SelectTrigger className="mt-1.5 bg-background"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active (holding)</SelectItem>
              <SelectItem value="listed">Listed for sale</SelectItem>
              <SelectItem value="sold">Sold</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="pf-fees">Fees paid (USD)</Label>
          <Input
            id="pf-fees"
            type="number"
            min="0"
            step="0.01"
            className="mt-1.5 bg-background font-mono"
            value={form.fees_paid}
            onChange={(e) => set("fees_paid", e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="pf-ship">Shipping paid (USD)</Label>
          <Input
            id="pf-ship"
            type="number"
            min="0"
            step="0.01"
            className="mt-1.5 bg-background font-mono"
            value={form.shipping_paid}
            onChange={(e) => set("shipping_paid", e.target.value)}
          />
        </div>
      </div>

      <div>
        <Label htmlFor="pf-notes">Notes (optional)</Label>
        <Textarea
          id="pf-notes"
          className="mt-1.5 bg-background min-h-[70px]"
          placeholder="Serial numbers, storage location, anything worth remembering..."
          value={form.notes}
          onChange={(e) => set("notes", e.target.value)}
        />
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-rose-400">
          <AlertCircle className="h-4 w-4" /> {error}
        </div>
      )}

      <Button type="submit" disabled={submitting} className="w-full bg-emerald-500 hover:bg-emerald-400 text-emerald-950 font-semibold h-11">
        {submitting ? (
          <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...</>
        ) : (
          submitLabel
        )}
      </Button>
    </form>
  );
}
