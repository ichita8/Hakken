import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import type { PortfolioItem } from "@/lib/types";
import { formatCurrency, formatPercent, formatDate } from "@/lib/utils";
import { Briefcase, Plus, TrendingUp, TrendingDown, Package, X, Edit3, Trash2, DollarSign, ShoppingCart, Tag, Download, BarChart3, PieChart } from "lucide-react";

export default function Portfolio() {
  const { user } = useAuth();
  const [items, setItems] = useState<PortfolioItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editingItem, setEditingItem] = useState<PortfolioItem | null>(null);
  const [filter, setFilter] = useState<"all" | "active" | "listed" | "sold">("all");

  useEffect(() => {
    async function load() {
      if (!user) return;
      const { data } = await supabase
        .from("portfolio_items")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      setItems((data as PortfolioItem[]) || []);
      setLoading(false);
    }
    load();
  }, [user]);

  const filtered = filter === "all" ? items : items.filter((i) => i.status === filter);

  const stats = useMemo(() => {
    const sold = items.filter((i) => i.status === "sold" && i.actual_profit !== null);
    const totalProfit = sold.reduce((s, i) => s + (i.actual_profit || 0), 0);
    const totalRevenue = sold.reduce((s, i) => s + (i.sold_price || 0), 0);
    const totalCost = sold.reduce((s, i) => s + i.acquisition_price, 0);
    const avgROI = totalCost > 0 ? (totalProfit / totalCost) * 100 : 0;
    const winCount = sold.filter((i) => (i.actual_profit || 0) > 0).length;
    const winRate = sold.length > 0 ? (winCount / sold.length) * 100 : 0;

    return {
      totalItems: items.length,
      activeCount: items.filter((i) => i.status === "active").length,
      soldCount: sold.length,
      totalInvested: items.reduce((s, i) => s + i.acquisition_price, 0),
      totalRevenue,
      totalProfit,
      avgROI,
      winRate,
    };
  }, [items]);

  function exportCSV() {
    if (items.length === 0) return;
    const rows = items.map((i) => ({
      Title: i.title,
      Category: i.category || "",
      Status: i.status,
      AcquisitionPrice: i.acquisition_price || "",
      ListingPrice: i.listing_price ?? "",
      SoldPrice: i.sold_price ?? "",
      ActualProfit: i.actual_profit ?? "",
      ActualROI: i.actual_roi ?? "",
      MarketplaceBought: i.marketplace_bought || "",
      MarketplaceSelling: i.marketplace_selling || "",
      DateAdded: i.created_at ? new Date(i.created_at).toISOString() : "",
    }));
    const headers = Object.keys(rows[0]);
    const csv = [
      headers.join(","),
      ...rows.map((r) => headers.map((h) => `"${String((r as any)[h]).replace(/"/g, '""')}"`).join(",")),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `hakken-portfolio-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function deleteItem(id: string) {
    await supabase.from("portfolio_items").delete().eq("id", id);
    setItems((prev) => prev.filter((i) => i.id !== id));
  }

  async function saveItem(item: Partial<PortfolioItem> & { id?: string }) {
    if (!user) return;
    if (item.id) {
      const { data } = await supabase.from("portfolio_items").update({
        title: item.title,
        acquisition_price: item.acquisition_price,
        listing_price: item.listing_price,
        sold_price: item.sold_price,
        status: item.status,
        fees_paid: item.fees_paid,
        shipping_paid: item.shipping_paid,
        notes: item.notes,
        marketplace_bought: item.marketplace_bought,
        marketplace_selling: item.marketplace_selling,
        sold_date: item.sold_date,
      }).eq("id", item.id).select().single();
      if (data) {
        setItems((prev) => prev.map((i) => (i.id === data.id ? data as PortfolioItem : i)));
      }
    } else {
      const { data } = await supabase.from("portfolio_items").insert({
        user_id: user.id,
        title: item.title,
        acquisition_price: item.acquisition_price,
        listing_price: item.listing_price,
        marketplace_bought: item.marketplace_bought,
        marketplace_selling: item.marketplace_selling,
        status: item.status || "active",
        notes: item.notes,
      }).select().single();
      if (data) {
        setItems((prev) => [data as PortfolioItem, ...prev]);
      }
    }
    setEditingItem(null);
    setShowAdd(false);
  }

  return (
    <div className="p-6 lg:p-10 max-w-7xl mx-auto space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl lg:text-3xl font-bold text-white">Portfolio</h1>
          <p className="text-sm text-ink-400 mt-1">Track your inventory, sales, and profits.</p>
        </div>
        <div className="flex items-center gap-2">
          {items.length > 0 && (
            <button onClick={exportCSV} className="btn-secondary flex items-center gap-2">
              <Download className="w-4 h-4" /> Export CSV
            </button>
          )}
          <button onClick={() => setShowAdd(true)} className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Add Item
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Items" value={stats.totalItems.toString()} icon={Package} color="text-brand-400" bg="bg-brand-500/10" />
        <StatCard label="Capital Invested" value={formatCurrency(stats.totalInvested)} icon={ShoppingCart} color="text-amber-400" bg="bg-amber-500/10" />
        <StatCard label="Revenue (Sold)" value={formatCurrency(stats.totalRevenue)} icon={DollarSign} color="text-emerald-400" bg="bg-emerald-500/10" />
        <StatCard label="Realized Profit" value={formatCurrency(stats.totalProfit)} icon={stats.totalProfit >= 0 ? TrendingUp : TrendingDown} color={stats.totalProfit >= 0 ? "text-emerald-400" : "text-rose-400"} bg={stats.totalProfit >= 0 ? "bg-emerald-500/10" : "bg-rose-500/10"} />
      </div>

      {/* Analytics summary */}
      {stats.soldCount > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="glass-card p-5">
            <div className="flex items-center gap-2 mb-2">
              <BarChart3 className="w-4 h-4 text-brand-400" />
              <span className="text-xs text-ink-400">Average ROI</span>
            </div>
            <p className={`text-xl font-bold font-display ${stats.avgROI >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
              {formatPercent(stats.avgROI)}
            </p>
          </div>
          <div className="glass-card p-5">
            <div className="flex items-center gap-2 mb-2">
              <PieChart className="w-4 h-4 text-amber-400" />
              <span className="text-xs text-ink-400">Win Rate</span>
            </div>
            <p className="text-xl font-bold font-display text-white">{stats.winRate.toFixed(0)}%</p>
          </div>
          <div className="glass-card p-5">
            <div className="flex items-center gap-2 mb-2">
              <Package className="w-4 h-4 text-brand-400" />
              <span className="text-xs text-ink-400">Items Sold</span>
            </div>
            <p className="text-xl font-bold font-display text-white">{stats.soldCount} / {stats.totalItems}</p>
          </div>
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-1 p-1 bg-ink-900/60 rounded-xl w-fit">
        {(["all", "active", "listed", "sold"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-all ${
              filter === f ? "bg-brand-500 text-ink-950" : "text-ink-400 hover:text-ink-100"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Items */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => <div key={i} className="h-28 rounded-2xl shimmer-bg" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-ink-800/50 flex items-center justify-center mx-auto mb-4">
            <Briefcase className="w-8 h-8 text-ink-500" />
          </div>
          <h3 className="text-lg font-medium text-ink-200 mb-2">No items in your portfolio</h3>
          <p className="text-sm text-ink-400 mb-6">Add items you've purchased to track your inventory and profits.</p>
          <button onClick={() => setShowAdd(true)} className="btn-primary inline-flex items-center gap-2">
            <Plus className="w-4 h-4" /> Add Your First Item
          </button>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((item) => (
            <PortfolioCard key={item.id} item={item} onEdit={() => setEditingItem(item)} onDelete={() => deleteItem(item.id)} />
          ))}
        </div>
      )}

      {/* Add/Edit modal */}
      {(showAdd || editingItem) && (
        <PortfolioModal
          item={editingItem}
          onClose={() => { setShowAdd(false); setEditingItem(null); }}
          onSave={saveItem}
        />
      )}
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color, bg }: { label: string; value: string; icon: typeof Package; color: string; bg: string }) {
  return (
    <div className="glass-card p-5">
      <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center mb-3`}>
        <Icon className={`w-5 h-5 ${color}`} />
      </div>
      <p className="text-xl font-bold text-white font-display">{value}</p>
      <p className="text-xs text-ink-400 mt-1">{label}</p>
    </div>
  );
}

function PortfolioCard({ item, onEdit, onDelete }: { item: PortfolioItem; onEdit: () => void; onDelete: () => void }) {
  const statusColors: Record<string, string> = {
    active: "bg-blue-500/10 text-blue-400 border-blue-500/30",
    listed: "bg-amber-500/10 text-amber-400 border-amber-500/30",
    sold: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
  };

  return (
    <div className="glass-card p-5 glass-hover group">
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <span className={`text-[10px] px-2 py-0.5 rounded-full border ${statusColors[item.status]}`}>
            {item.status}
          </span>
          {item.category && (
            <span className="text-[10px] px-2 py-0.5 rounded-full border bg-brand-500/10 text-brand-400 border-brand-500/20">
              {item.category}
            </span>
          )}
        </div>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={onEdit} className="p-1.5 rounded-lg text-ink-500 hover:text-brand-400 hover:bg-ink-800/50">
            <Edit3 className="w-3.5 h-3.5" />
          </button>
          <button onClick={onDelete} className="p-1.5 rounded-lg text-ink-500 hover:text-rose-400 hover:bg-rose-500/5">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <h3 className="text-sm font-medium text-ink-100 mb-3 line-clamp-2">{item.title}</h3>

      <div className="space-y-1.5 text-xs">
        <div className="flex justify-between">
          <span className="text-ink-500">Acquired:</span>
          <span className="text-ink-200">{formatCurrency(item.acquisition_price)}</span>
        </div>
        {item.listing_price !== null && (
          <div className="flex justify-between">
            <span className="text-ink-500">Listed at:</span>
            <span className="text-ink-200">{formatCurrency(item.listing_price)}</span>
          </div>
        )}
        {item.sold_price !== null && (
          <div className="flex justify-between">
            <span className="text-ink-500">Sold for:</span>
            <span className="text-emerald-400 font-medium">{formatCurrency(item.sold_price)}</span>
          </div>
        )}
        {item.actual_profit !== null && (
          <div className="flex justify-between pt-1.5 border-t border-ink-800/60">
            <span className="text-ink-500">Profit:</span>
            <span className={`font-medium ${item.actual_profit >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
              {formatCurrency(item.actual_profit)}
            </span>
          </div>
        )}
      </div>

      {item.marketplace_bought && (
        <div className="flex items-center gap-1 mt-3 text-xs text-ink-500">
          <Tag className="w-3 h-3" />
          {item.marketplace_bought}
        </div>
      )}
    </div>
  );
}

function PortfolioModal({ item, onClose, onSave }: {
  item: PortfolioItem | null;
  onClose: () => void;
  onSave: (item: Partial<PortfolioItem> & { id?: string }) => void;
}) {
  const [title, setTitle] = useState(item?.title || "");
  const [acquisitionPrice, setAcquisitionPrice] = useState(item?.acquisition_price?.toString() || "");
  const [listingPrice, setListingPrice] = useState(item?.listing_price?.toString() || "");
  const [soldPrice, setSoldPrice] = useState(item?.sold_price?.toString() || "");
  const [status, setStatus] = useState(item?.status || "active");
  const [marketplaceBought, setMarketplaceBought] = useState(item?.marketplace_bought || "");
  const [notes, setNotes] = useState(item?.notes || "");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSave({
      id: item?.id,
      title,
      acquisition_price: parseFloat(acquisitionPrice) || 0,
      listing_price: listingPrice ? parseFloat(listingPrice) : null,
      sold_price: soldPrice ? parseFloat(soldPrice) : null,
      status: status as "active" | "listed" | "sold",
      marketplace_bought: marketplaceBought || null,
      notes: notes || null,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-950/80 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div className="glass-card p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto scrollbar-thin" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-white">{item ? "Edit Item" : "Add Portfolio Item"}</h2>
          <button onClick={onClose} className="text-ink-500 hover:text-ink-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label-text">Title *</label>
            <input type="text" required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Rolex Submariner" className="input-field" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label-text">Acquisition Price ($) *</label>
              <input type="number" step="0.01" required value={acquisitionPrice} onChange={(e) => setAcquisitionPrice(e.target.value)} placeholder="4500" className="input-field" />
            </div>
            <div>
              <label className="label-text">Status</label>
              <select value={status} onChange={(e) => setStatus(e.target.value as any)} className="input-field cursor-pointer">
                <option value="active" className="bg-ink-900">Active (Holding)</option>
                <option value="listed" className="bg-ink-900">Listed for Sale</option>
                <option value="sold" className="bg-ink-900">Sold</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label-text">Listing Price ($)</label>
              <input type="number" step="0.01" value={listingPrice} onChange={(e) => setListingPrice(e.target.value)} placeholder="6500" className="input-field" />
            </div>
            <div>
              <label className="label-text">Sold Price ($)</label>
              <input type="number" step="0.01" value={soldPrice} onChange={(e) => setSoldPrice(e.target.value)} placeholder="6200" className="input-field" />
            </div>
          </div>

          <div>
            <label className="label-text">Marketplace Bought From</label>
            <input type="text" value={marketplaceBought} onChange={(e) => setMarketplaceBought(e.target.value)} placeholder="eBay" className="input-field" />
          </div>

          <div>
            <label className="label-text">Notes</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Any notes about this item..." className="input-field resize-none" />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="submit" className="btn-primary flex-1">{item ? "Save Changes" : "Add Item"}</button>
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}

