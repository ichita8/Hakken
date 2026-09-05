import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";
import { AlertCircle, Loader2 } from "lucide-react";

export default function SellForm({ item, onSubmit, submitting }) {
  const [form, setForm] = useState({
    sold_price: "",
    fees_paid: item.fees_paid != null ? String(item.fees_paid) : "0",
    shipping_paid: item.shipping_paid != null ? String(item.shipping_paid) : "0",
    sold_date: new Date().toISOString().slice(0, 10),
  });
  const [error, setError] = useState("");
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const sold = Number(form.sold_price);
  const valid = sold > 0;
  const profit = valid
    ? sold - (item.acquisition_price || 0) - (Number(form.fees_paid) || 0) - (Number(form.shipping_paid) || 0)
    : null;

  const submit = (e) => {
    e.preventDefault();
    setError("");
    if (!valid) return setError("Please enter a valid sold price.");
    onSubmit({
      sold_price: sold,
      fees_paid: Number(form.fees_paid) || 0,
      shipping_paid: Number(form.shipping_paid) || 0,
      sold_date: form.sold_date,
      status: "sold",
    });
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="sf-price">Sold price (USD) *</Label>
          <Input
            id="sf-price"
            type="number"
            min="0"
            step="0.01"
            className="mt-1.5 bg-background font-mono"
            placeholder="0.00"
            value={form.sold_price}
            onChange={(e) => set("sold_price", e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="sf-date">Sale date</Label>
          <Input
            id="sf-date"
            type="date"
            className="mt-1.5 bg-background font-mono"
            value={form.sold_date}
            onChange={(e) => set("sold_date", e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="sf-fees">Total fees paid (USD)</Label>
          <Input
            id="sf-fees"
            type="number"
            min="0"
            step="0.01"
            className="mt-1.5 bg-background font-mono"
            value={form.fees_paid}
            onChange={(e) => set("fees_paid", e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="sf-ship">Total shipping paid (USD)</Label>
          <Input
            id="sf-ship"
            type="number"
            min="0"
            step="0.01"
            className="mt-1.5 bg-background font-mono"
            value={form.shipping_paid}
            onChange={(e) => set("shipping_paid", e.target.value)}
          />
        </div>
      </div>

      {valid && (
        <div className="rounded-lg border border-border bg-white/[0.03] px-4 py-3 flex items-center justify-between">
          <span className="text-sm text-zinc-400">Net profit on this sale</span>
          <span className={cn("font-mono font-semibold tnum", profit >= 0 ? "text-emerald-400" : "text-rose-400")}>
            {profit >= 0 ? "+" : ""}{formatMoney(profit)}
          </span>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 text-sm text-rose-400">
          <AlertCircle className="h-4 w-4" /> {error}
        </div>
      )}

      <Button type="submit" disabled={submitting} className="w-full bg-emerald-500 hover:bg-emerald-400 text-emerald-950 font-semibold h-11">
        {submitting ? (
          <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...</>
        ) : (
          "Mark as sold"
        )}
      </Button>
    </form>
  );
}
