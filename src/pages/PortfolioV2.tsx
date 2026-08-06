import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import type { PortfolioItem } from "@/lib/types";
import {
  formatCurrency,
  formatPercent,
  formatDate,
  timeAgo,
} from "@/lib/utils";
import {
  TrendingUp,
  TrendingDown,
  Package,
  DollarSign,
  BarChart3,
  Target,
  Plus,
  Edit2,
  Trash2,
  Eye,
  Filter,
  Download,
  AlertCircle,
} from "lucide-react";

export default function PortfolioV2() {
  const { user } = useAuth();
  const [items, setItems] = useState<PortfolioItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "active" | "listed" | "sold">("all");
  const [sortBy, setSortBy] = useState<"recent" | "profit" | "roi" | "value">("recent");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  useEffect(() => {
    async function loadPortfolio() {
      if (!user) return;

      const { data } = await supabase
        .from("portfolio_items")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      setItems((data as PortfolioItem[]) || []);
      setLoading(false);
    }

    loadPortfolio();
  }, [user]);

  async function handleDelete(id: string) {
    if (!user) return;
    setDeletingId(id);
    const { error } = await supabase
      .from("portfolio_items")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (!error) {
      setItems((prev) => prev.filter((i) => i.id !== id));
    }
    setDeletingId(null);
    setConfirmDeleteId(null);
  }

  // Calculate portfolio metrics
  const metrics = useMemo(() => {
    const active = items.filter((i) => i.status === "active");
    const sold = items.filter((i) => i.status === "sold");

    const totalValue = active.reduce((sum, i) => sum + (i.listing_price || 0), 0);
    const totalInvested = items.reduce((sum, i) => sum + i.acquisition_price, 0);
    const totalRealized = sold.reduce((sum, i) => sum + (i.actual_profit || 0), 0);
    const unrealizedProfit = active.reduce((sum, i) => {
      const profit = (i.listing_price || i.acquisition_price * 1.5) - i.acquisition_price;
      return sum + profit;
    }, 0);

    const totalProfit = totalRealized + unrealizedProfit;
    const overallRoi = totalInvested > 0 ? (totalProfit / totalInvested) * 100 : 0;

    const avgHoldingDays =
      sold.length > 0
        ? sold.reduce((sum, i) => {
            if (i.sold_date && i.created_at) {
              const days = Math.floor(
                (new Date(i.sold_date).getTime() - new Date(i.created_at).getTime()) /
                  (1000 * 60 * 60 * 24)
              );
              return sum + days;
            }
            return sum;
          }, 0) / sold.length
        : 0;

    const winRate = items.length > 0 ? (sold.filter((i) => (i.actual_profit || 0) > 0).length / items.length) * 100 : 0;

    return {
      totalValue,
      totalInvested,
      totalRealized,
      unrealizedProfit,
      totalProfit,
      overallRoi,
      avgHoldingDays,
      winRate,
      activeCount: active.length,
      soldCount: sold.length,
    };
  }, [items]);

  // Filter and sort items
  const filteredItems = useMemo(() => {
    let result = items;

    if (filter !== "all") {
      result = result.filter((i) => i.status === filter);
    }

    result.sort((a, b) => {
      switch (sortBy) {
        case "profit":
          return (b.actual_profit || 0) - (a.actual_profit || 0);
        case "roi":
          return (b.actual_roi || 0) - (a.actual_roi || 0);
        case "value":
          return (b.listing_price || 0) - (a.listing_price || 0);
        default:
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });

    return result;
  }, [items, filter, sortBy]);

  // Profit by category
  const profitByCategory = useMemo(() => {
    const categories: Record<string, { profit: number; count: number }> = {};

    items.forEach((item) => {
      const cat = item.category || "Other";
      if (!categories[cat]) {
        categories[cat] = { profit: 0, count: 0 };
      }
      categories[cat].profit += item.actual_profit || 0;
      categories[cat].count += 1;
    });

    return Object.entries(categories)
      .map(([name, data]) => ({
        name,
        profit: data.profit,
        count: data.count,
        avgProfit: data.count > 0 ? data.profit / data.count : 0,
      }))
      .sort((a, b) => b.profit - a.profit);
  }, [items]);

  if (loading) {
    return (
      <div className="p-6 lg:p-10 max-w-7xl mx-auto">
        <div className="space-y-4">
          <div className="h-8 w-48 shimmer-bg rounded-lg" />
          <div className="grid grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 shimmer-bg rounded-2xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-10 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white">Portfolio</h1>
          <p className="text-sm text-ink-400 mt-1">
            Track your inventory, profits, and performance
          </p>
        </div>
        <button className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Add Item
        </button>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-ink-400 uppercase">Portfolio Value</p>
            <Package className="w-4 h-4 text-brand-400" />
          </div>
          <p className="text-3xl font-bold text-white">{formatCurrency(metrics.totalValue)}</p>
          <p className="text-xs text-ink-500 mt-2">{metrics.activeCount} active items</p>
        </div>

        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-ink-400 uppercase">Total Profit</p>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <p className={`text-3xl font-bold ${metrics.totalProfit >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
            {formatCurrency(metrics.totalProfit)}
          </p>
          <p className="text-xs text-ink-500 mt-2">
            {formatPercent(metrics.overallRoi)} overall ROI
          </p>
        </div>

        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-ink-400 uppercase">Win Rate</p>
            <Target className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-3xl font-bold text-amber-400">{metrics.winRate.toFixed(0)}%</p>
          <p className="text-xs text-ink-500 mt-2">{metrics.soldCount} items sold</p>
        </div>

        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-ink-400 uppercase">Avg Hold Time</p>
            <BarChart3 className="w-4 h-4 text-blue-400" />
          </div>
          <p className="text-3xl font-bold text-blue-400">
            {metrics.avgHoldingDays.toFixed(0)}
          </p>
          <p className="text-xs text-ink-500 mt-2">days</p>
        </div>
      </div>

      {/* Profit by Category */}
      {profitByCategory.length > 0 && (
        <div className="glass-card p-8 mb-8">
          <h2 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-brand-400" />
            Performance by Category
          </h2>

          <div className="space-y-3">
            {profitByCategory.map((cat) => (
              <div key={cat.name} className="p-4 rounded-lg bg-ink-900/50 border border-ink-700">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-semibold text-white">{cat.name}</p>
                  <p className={`font-bold ${cat.profit >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                    {formatCurrency(cat.profit)}
                  </p>
                </div>
                <div className="flex items-center justify-between text-xs text-ink-400">
                  <span>{cat.count} items</span>
                  <span>Avg: {formatCurrency(cat.avgProfit)}</span>
                </div>
                <div className="w-full h-2 bg-ink-800 rounded-full mt-3">
                  <div
                    className={`h-full rounded-full ${cat.profit >= 0 ? "bg-emerald-500" : "bg-rose-500"}`}
                    style={{ width: `${Math.min(100, (Math.abs(cat.profit) / metrics.totalProfit) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters & Controls */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="flex gap-2">
          {(["all", "active", "listed", "sold"] as const).map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                filter === status
                  ? "bg-brand-500 text-ink-950"
                  : "bg-ink-800 text-ink-400 hover:bg-ink-700"
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>

        <div className="flex gap-2 ml-auto">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-4 py-2 rounded-lg bg-ink-800 border border-ink-700 text-ink-100 text-sm"
          >
            <option value="recent">Recent</option>
            <option value="profit">Highest Profit</option>
            <option value="roi">Highest ROI</option>
            <option value="value">Highest Value</option>
          </select>

          <button className="px-4 py-2 rounded-lg bg-ink-800 border border-ink-700 text-ink-100 text-sm hover:bg-ink-700">
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Portfolio Items Table */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-ink-700">
                <th className="px-6 py-4 text-left text-xs font-semibold text-ink-400 uppercase">
                  Item
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-ink-400 uppercase">
                  Category
                </th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-ink-400 uppercase">
                  Acquisition
                </th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-ink-400 uppercase">
                  Current Value
                </th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-ink-400 uppercase">
                  Profit
                </th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-ink-400 uppercase">
                  ROI
                </th>
                <th className="px-6 py-4 text-center text-xs font-semibold text-ink-400 uppercase">
                  Status
                </th>
                <th className="px-6 py-4 text-center text-xs font-semibold text-ink-400 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center">
                    <AlertCircle className="w-8 h-8 text-ink-600 mx-auto mb-3" />
                    <p className="text-ink-400">No items in this category</p>
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => {
                  const currentValue = item.sold_price || item.listing_price || item.acquisition_price * 1.5;
                  const profit = currentValue - item.acquisition_price;
                  const roi = (profit / item.acquisition_price) * 100;

                  return (
                    <tr key={item.id} className="border-b border-ink-700 hover:bg-ink-800/30 transition-colors">
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium text-white line-clamp-1">{item.title}</p>
                          <p className="text-xs text-ink-500 mt-1">
                            {formatDate(item.created_at)}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-ink-300">{item.category}</td>
                      <td className="px-6 py-4 text-right text-sm font-medium text-ink-200">
                        {formatCurrency(item.acquisition_price)}
                      </td>
                      <td className="px-6 py-4 text-right text-sm font-medium text-ink-200">
                        {formatCurrency(currentValue)}
                      </td>
                      <td className={`px-6 py-4 text-right text-sm font-bold ${profit >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                        {profit >= 0 ? "+" : ""}
                        {formatCurrency(profit)}
                      </td>
                      <td className={`px-6 py-4 text-right text-sm font-bold ${roi >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                        {roi >= 0 ? "+" : ""}
                        {roi.toFixed(1)}%
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            item.status === "sold"
                              ? "bg-emerald-500/20 text-emerald-400"
                              : item.status === "listed"
                              ? "bg-amber-500/20 text-amber-400"
                              : "bg-blue-500/20 text-blue-400"
                          }`}
                        >
                          {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button className="p-1 hover:bg-ink-700 rounded transition-colors">
                            <Eye className="w-4 h-4 text-ink-400" />
                          </button>
                          <button className="p-1 hover:bg-ink-700 rounded transition-colors">
                            <Edit2 className="w-4 h-4 text-ink-400" />
                          </button>
                          {confirmDeleteId === item.id ? (
                            <div className="flex items-center gap-1 bg-rose-500/10 border border-rose-500/30 rounded-lg p-0.5">
                              <button
                                onClick={() => handleDelete(item.id)}
                                disabled={deletingId === item.id}
                                className="px-2 py-0.5 text-[10px] font-semibold text-rose-400 hover:bg-rose-500/20 rounded transition-colors"
                              >
                                {deletingId === item.id ? "..." : "Delete"}
                              </button>
                              <button
                                onClick={() => setConfirmDeleteId(null)}
                                className="px-2 py-0.5 text-[10px] font-semibold text-ink-400 hover:bg-ink-700 rounded transition-colors"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setConfirmDeleteId(item.id)}
                              className="p-1 hover:bg-rose-500/20 rounded transition-colors"
                            >
                              <Trash2 className="w-4 h-4 text-ink-400 hover:text-rose-400 transition-colors" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
