import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import MetricCard from "@/components/MetricCard";
import PortfolioForm from "@/components/portfolio/PortfolioForm";
import SellForm from "@/components/portfolio/SellForm";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Image } from "@/components/ui/image";
import { formatCurrency, formatMoney, formatPctSigned } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Plus, Pencil, Banknote, Trash2, FileSearch, Briefcase, Wallet } from "lucide-react";

const STATUS_STYLES = {
  active: "bg-zinc-500/15 text-zinc-300 border-zinc-500/30",
  listed: "bg-sky-500/15 text-sky-300 border-sky-500/30",
  sold: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
};

const itemProfit = (it) =>
  it.status === "sold" && it.sold_price != null
    ? it.sold_price - (it.acquisition_price || 0) - (it.fees_paid || 0) - (it.shipping_paid || 0)
    : null;

export default function Portfolio() {
  const { user } = useAuth();
  const [items, setItems] = useState(null);
  const [dialog, setDialog] = useState(null);
  const [saving, setSaving] = useState(false);
  const budget = Number(user && user.data && user.data.budget) || 0;

  const load = () =>
    base44.entities.PortfolioItem.list("-created_date", 200).then(setItems).catch(() => setItems([]));

  useEffect(() => {
    load();
  }, []);

  const list = items || [];
  const inInventory = list.filter((i) => i.status !== "sold");
  const sold = list.filter((i) => i.status === "sold");
  const deployed = inInventory.reduce((s, i) => s + (i.acquisition_price || 0), 0);
  const realized = sold.reduce((s, i) => s + (itemProfit(i) || 0), 0);
  const soldCost = sold.reduce((s, i) => s + (i.acquisition_price || 0), 0);
  const realizedRoi = soldCost > 0 ? (realized / soldCost) * 100 : 0;

  const handleSave = async (values) => {
    setSaving(true);
    try {
      if (dialog.mode === "edit") await base44.entities.PortfolioItem.update(dialog.item.id, values);
      else await base44.entities.PortfolioItem.create(values);
      await load();
      setDialog(null);
    } finally {
      setSaving(false);
    }
  };

  const handleSell = async (values) => {
    setSaving(true);
    try {
      await base44.entities.PortfolioItem.update(dialog.item.id, values);
      await load();
      setDialog(null);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item) => {
    if (!confirm(`Delete "${item.title}" from your portfolio? This cannot be undone.`)) return;
    await base44.entities.PortfolioItem.delete(item.id);
    await load();
  };

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">Portfolio</h1>
          <p className="text-zinc-500 mt-1 text-sm">Track what you've bought, listed, and sold.</p>
        </div>
        <Button onClick={() => setDialog({ mode: "add" })} className="bg-emerald-500 hover:bg-emerald-400 text-emerald-950 font-semibold h-11 px-5">
          <Plus className="h-4 w-4 mr-2" /> Add item
        </Button>
      </div>

      {budget > 0 && (
        <div className="panel p-5 mb-5">
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-sm text-zinc-300 flex items-center gap-2">
              <Wallet className="h-4 w-4 text-emerald-400" /> Capital deployed
            </span>
            <span className="font-mono text-sm text-zinc-200 tnum">
              {formatCurrency(deployed)} <span className="text-zinc-600">/ {formatCurrency(budget)}</span>
            </span>
          </div>
          <div className="h-2 w-full rounded-full bg-white/5 overflow-hidden">
            <div
              className={cn("h-full rounded-full transition-all", deployed > budget ? "bg-rose-400" : "bg-gradient-to-r from-emerald-400 to-teal-500")}
              style={{ width: `${budget > 0 ? Math.min(100, (deployed / budget) * 100) : 0}%` }}
            />
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
        <MetricCard label="Portfolio items" value={items === null ? "—" : list.length} sub="all-time" />
        <MetricCard label="In inventory" value={items === null ? "—" : inInventory.length} sub="active or listed" />
        <MetricCard label="Sold" value={items === null ? "—" : sold.length} sub="closed flips" />
        <MetricCard label="Capital deployed" value={items === null ? "—" : formatCurrency(deployed)} sub="in unsold inventory" />
        <MetricCard
          label="Realized profit"
          value={items === null ? "—" : formatMoney(realized)}
          sub="after fees & shipping"
          accent={realized >= 0 ? "text-emerald-400" : "text-rose-400"}
        />
        <MetricCard
          label="Realized ROI"
          value={items === null ? "—" : formatPctSigned(realizedRoi)}
          sub="across sold items"
          accent={realizedRoi >= 0 ? "text-emerald-400" : "text-rose-400"}
        />
      </div>

      {items === null ? (
        <div className="panel p-12 text-center text-zinc-500">Loading...</div>
      ) : list.length === 0 ? (
        <div className="panel p-12 text-center">
          <Briefcase className="h-8 w-8 text-zinc-600 mx-auto mb-3" />
          <h3 className="font-heading font-semibold text-zinc-200">No portfolio items yet</h3>
          <p className="text-sm text-zinc-500 mt-1 mb-5">
            Add something you've bought — or add it straight from an analysis report.
          </p>
          <Button onClick={() => setDialog({ mode: "add" })} className="bg-emerald-500 hover:bg-emerald-400 text-emerald-950 font-semibold">
            <Plus className="h-4 w-4 mr-2" /> Add your first item
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {list.map((it) => {
            const profit = itemProfit(it);
            const roi = profit != null && it.acquisition_price > 0 ? (profit / it.acquisition_price) * 100 : null;
            return (
              <div key={it.id} className="panel p-4">
                <div className="flex flex-wrap items-start gap-4">
                  {it.image_urls && it.image_urls.length > 0 ? (
                    <div className="h-14 w-14 rounded-lg overflow-hidden border border-border shrink-0">
                      <Image src={it.image_urls[0]} alt={it.title} className="h-full w-full" fittingType="fill" />
                    </div>
                  ) : (
                    <div className="h-14 w-14 rounded-lg border border-border bg-white/[0.03] flex items-center justify-center shrink-0">
                      <Briefcase className="h-5 w-5 text-zinc-600" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-zinc-100">{it.title}</span>
                      <span className={cn("inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider", STATUS_STYLES[it.status] || STATUS_STYLES.active)}>
                        {it.status}
                      </span>
                    </div>
                    <div className="text-xs text-zinc-500 mt-1 flex flex-wrap items-center gap-x-2">
                      <span>Bought: {formatCurrency(it.acquisition_price)}</span>
                      {it.listing_price != null && <><span>·</span><span>Listed: {formatCurrency(it.listing_price)}</span></>}
                      {it.status === "sold" && it.sold_price != null && (
                        <><span>·</span><span>Sold: {formatCurrency(it.sold_price)}{it.sold_date ? ` on ${new Date(it.sold_date).toLocaleDateString()}` : ""}</span></>
                      )}
                      {it.marketplace_bought && <><span>·</span><span>{it.marketplace_bought}</span></>}
                    </div>
                    {it.notes && <div className="text-xs text-zinc-600 mt-1 line-clamp-2">{it.notes}</div>}
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    {profit != null ? (
                      <div className="text-right">
                        <div className={cn("font-mono font-semibold tnum text-sm", profit >= 0 ? "text-emerald-400" : "text-rose-400")}>
                          {profit >= 0 ? "+" : ""}{formatMoney(profit)}
                        </div>
                        {roi != null && (
                          <div className="text-[11px] text-zinc-500">{roi >= 0 ? "+" : ""}{roi.toFixed(0)}% ROI</div>
                        )}
                      </div>
                    ) : (
                      <div className="text-xs text-zinc-600">
                        {it.status === "sold" ? "Awaiting sale details" : "In inventory"}
                      </div>
                    )}
                    <div className="flex items-center gap-1">
                      {it.analysis_id && (
                        <Button variant="ghost" size="icon" asChild className="h-8 w-8 text-zinc-500 hover:text-zinc-100" title="View linked analysis">
                          <Link to={`/analysis/${it.analysis_id}`}><FileSearch className="h-4 w-4" /></Link>
                        </Button>
                      )}
                      {it.status !== "sold" && (
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-500 hover:text-emerald-300" title="Mark as sold" onClick={() => setDialog({ mode: "sell", item: it })}>
                          <Banknote className="h-4 w-4" />
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-500 hover:text-zinc-100" title="Edit" onClick={() => setDialog({ mode: "edit", item: it })}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-500 hover:text-rose-400" title="Delete" onClick={() => handleDelete(it)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={!!dialog} onOpenChange={(o) => !o && setDialog(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-heading">
              {dialog && dialog.mode === "edit"
                ? "Edit item"
                : dialog && dialog.mode === "sell"
                  ? `Mark "${dialog.item.title}" as sold`
                  : "Add portfolio item"}
            </DialogTitle>
          </DialogHeader>
          {dialog && dialog.mode === "sell" ? (
            <SellForm item={dialog.item} onSubmit={handleSell} submitting={saving} />
          ) : (
            <PortfolioForm
              initial={dialog && dialog.mode === "edit" ? dialog.item : null}
              onSubmit={handleSave}
              submitting={saving}
              submitLabel={dialog && dialog.mode === "edit" ? "Save changes" : "Add item"}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
