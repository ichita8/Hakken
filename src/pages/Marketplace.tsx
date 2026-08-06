import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { DEFAULT_CATEGORIES } from "@/lib/types";
import { formatCurrency, timeAgo, getScoreColor } from "@/lib/utils";
import {
  Store, Search, RefreshCw, Loader2, ExternalLink, Package, TrendingUp,
  Zap, ChevronRight, Sliders,
} from "lucide-react";

interface MarketplaceProps {
  onNavigate: (page: "dashboard" | "analyze" | "portfolio" | "marketplace" | "settings") => void;
  onViewAnalysis: (id: string) => void;
}

interface RawListing {
  id: string;
  marketplace: string;
  marketplace_listing_id: string;
  title: string;
  description: string | null;
  price: number;
  seller_name: string | null;
  images: string[];
  url: string;
  category: string | null;
  condition: string | null;
  location: string | null;
  shipping_cost: number;
  time_listed: string | null;
  engagement_metrics: any;
  status: string;
  analysis_id: string | null;
  scraped_at: string;
  created_at: string;
}

export default function Marketplace({ onNavigate, onViewAnalysis }: MarketplaceProps) {
  const { user } = useAuth();
  const [listings, setListings] = useState<RawListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [scraping, setScraping] = useState(false);
  const [scrapeResult, setScrapeResult] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [showScrapePanel, setShowScrapePanel] = useState(false);

  // Scrape form state
  const [scrapeCategory, setScrapeCategory] = useState("watches");
  const [scrapeKeywords, setScrapeKeywords] = useState("");
  const [scrapeLimit, setScrapeLimit] = useState("20");
  const [autoAnalyze, setAutoAnalyze] = useState(true);

  useEffect(() => {
    loadListings();
  }, [user]);

  async function loadListings() {
    if (!user) return;
    const { data } = await supabase
      .from("listings_raw")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
    setListings((data as RawListing[]) || []);
    setLoading(false);
  }

  async function handleScrape() {
    if (!user) return;
    setScraping(true);
    setScrapeResult(null);

    try {
      const { data: session } = await supabase.auth.getSession();
      const accessToken = session.session?.access_token;

      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/scrape-ebay`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          category: scrapeCategory,
          keywords: scrapeKeywords,
          limit: parseInt(scrapeLimit) || 20,
          autoAnalyze,
          priceMin: priceMin ? parseFloat(priceMin) : undefined,
          priceMax: priceMax ? parseFloat(priceMax) : undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setScrapeResult(`Error: ${data.error || "Scraping failed"}`);
      } else {
        setScrapeResult(
          `Found ${data.scraped} listings, stored ${data.stored} new${data.duplicates_skipped ? `, skipped ${data.duplicates_skipped} duplicates` : ""}${data.analyzed ? `, auto-analyzed ${data.analyzed}` : ""}`
        );
        await loadListings();
      }
    } catch (err: any) {
      setScrapeResult(`Error: ${err.message}`);
    } finally {
      setScraping(false);
    }
  }

  const filteredListings = useMemo(() => {
    let result = listings;
    if (categoryFilter !== "all") {
      result = result.filter((l) => l.category?.toLowerCase() === categoryFilter.toLowerCase());
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (l) =>
          l.title.toLowerCase().includes(q) ||
          (l.seller_name || "").toLowerCase().includes(q)
      );
    }
    if (priceMin) {
      result = result.filter((l) => l.price >= parseFloat(priceMin));
    }
    if (priceMax) {
      result = result.filter((l) => l.price <= parseFloat(priceMax));
    }
    return result;
  }, [listings, categoryFilter, searchQuery, priceMin, priceMax]);

  const stats = useMemo(() => {
    return {
      total: listings.length,
      pending: listings.filter((l) => l.status === "pending").length,
      analyzing: listings.filter((l) => l.status === "analyzing").length,
      analyzed: listings.filter((l) => l.status === "analyzed").length,
    };
  }, [listings]);

  return (
    <div className="p-6 lg:p-10 max-w-7xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl lg:text-3xl font-bold text-white">Marketplace Monitor</h1>
          <p className="text-sm text-ink-400 mt-1">Live eBay listings feed with auto-analysis</p>
        </div>
        <button
          onClick={() => setShowScrapePanel(!showScrapePanel)}
          className="btn-primary flex items-center gap-2 self-start"
        >
          <RefreshCw className="w-4 h-4" />
          Scrape New Listings
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card p-4">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-semibold text-ink-400 uppercase">Total Listings</p>
            <Package className="w-4 h-4 text-brand-400" />
          </div>
          <p className="text-2xl font-bold text-white">{stats.total}</p>
        </div>
        <div className="glass-card p-4">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-semibold text-ink-400 uppercase">Pending</p>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-2xl font-bold text-amber-400">{stats.pending}</p>
        </div>
        <div className="glass-card p-4">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-semibold text-ink-400 uppercase">Analyzing</p>
            <Loader2 className="w-4 h-4 text-blue-400" />
          </div>
          <p className="text-2xl font-bold text-blue-400">{stats.analyzing}</p>
        </div>
        <div className="glass-card p-4">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-semibold text-ink-400 uppercase">Analyzed</p>
            <Zap className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-emerald-400">{stats.analyzed}</p>
        </div>
      </div>

      {/* Scrape Panel */}
      {showScrapePanel && (
        <div className="glass-card p-6 space-y-4 animate-slide-up">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Store className="w-5 h-5 text-brand-400" />
            eBay Scraper
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-ink-400 uppercase mb-2 block">Category</label>
              <select
                value={scrapeCategory}
                onChange={(e) => setScrapeCategory(e.target.value)}
                className="input-field cursor-pointer"
              >
                <option value="watches" className="bg-ink-900">Watches</option>
                <option value="cameras" className="bg-ink-900">Cameras</option>
                <option value="sneakers" className="bg-ink-900">Sneakers</option>
                <option value="bags" className="bg-ink-900">Bags</option>
                <option value="guitars" className="bg-ink-900">Guitars</option>
                <option value="jewelry" className="bg-ink-900">Jewelry</option>
                <option value="electronics" className="bg-ink-900">Electronics</option>
                <option value="collectibles" className="bg-ink-900">Collectibles</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-ink-400 uppercase mb-2 block">Keywords (optional)</label>
              <input
                type="text"
                value={scrapeKeywords}
                onChange={(e) => setScrapeKeywords(e.target.value)}
                placeholder="e.g. Rolex Submariner"
                className="input-field"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-ink-400 uppercase mb-2 block">Max Listings</label>
              <input
                type="number"
                value={scrapeLimit}
                onChange={(e) => setScrapeLimit(e.target.value)}
                min="1"
                max="200"
                className="input-field"
              />
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoAnalyze}
                  onChange={(e) => setAutoAnalyze(e.target.checked)}
                  className="w-4 h-4 rounded border-ink-600 bg-ink-800 text-brand-500 focus:ring-brand-500"
                />
                <span className="text-sm text-ink-200">Auto-analyze new listings</span>
              </label>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleScrape}
              disabled={scraping}
              className="btn-primary flex items-center gap-2 disabled:opacity-50"
            >
              {scraping ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Scraping...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4" />
                  Start Scrape
                </>
              )}
            </button>
            <button onClick={() => setShowScrapePanel(false)} className="btn-secondary">
              Cancel
            </button>
          </div>

          {scrapeResult && (
            <div className={`p-3 rounded-lg text-sm ${
              scrapeResult.startsWith("Error")
                ? "bg-rose-500/10 border border-rose-500/30 text-rose-300"
                : "bg-emerald-500/10 border border-emerald-500/30 text-emerald-300"
            }`}>
              {scrapeResult}
            </div>
          )}

          <div className="p-3 rounded-lg bg-ink-900/50 border border-ink-700 text-xs text-ink-400">
            <strong className="text-ink-300">Setup required:</strong> Set <code className="text-brand-300">EBAY_CLIENT_ID</code> and{" "}
            <code className="text-brand-300">EBAY_CLIENT_SECRET</code> in Supabase Edge Function secrets.
            Get credentials at{" "}
            <a href="https://developer.ebay.com" target="_blank" rel="noopener" className="text-brand-400 hover:underline">
              developer.ebay.com
            </a>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-ink-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search listings..."
            className="input-field pl-9"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="input-field cursor-pointer sm:w-44"
        >
          <option value="all" className="bg-ink-900">All Categories</option>
          {DEFAULT_CATEGORIES.map((c) => (
            <option key={c} value={c.toLowerCase()} className="bg-ink-900">{c}</option>
          ))}
        </select>
        <input
          type="number"
          value={priceMin}
          onChange={(e) => setPriceMin(e.target.value)}
          placeholder="Min $"
          className="input-field sm:w-28"
        />
        <input
          type="number"
          value={priceMax}
          onChange={(e) => setPriceMax(e.target.value)}
          placeholder="Max $"
          className="input-field sm:w-28"
        />
      </div>

      {/* Listings */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-28 rounded-2xl shimmer-bg" />
          ))}
        </div>
      ) : filteredListings.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-ink-800/50 flex items-center justify-center mx-auto mb-4">
            <Store className="w-8 h-8 text-ink-500" />
          </div>
          <h3 className="text-lg font-medium text-ink-200 mb-2">No listings yet</h3>
          <p className="text-sm text-ink-400 mb-6">
            Click "Scrape New Listings" to pull live eBay data into your pipeline.
          </p>
          <button onClick={() => setShowScrapePanel(true)} className="btn-primary inline-flex items-center gap-2">
            <RefreshCw className="w-4 h-4" />
            Scrape Now
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredListings.map((listing) => (
            <ListingCard
              key={listing.id}
              listing={listing}
              onViewAnalysis={() => listing.analysis_id && onViewAnalysis(listing.analysis_id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function Clock({ className }: { className: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function ListingCard({ listing, onViewAnalysis }: { listing: RawListing; onViewAnalysis: () => void }) {
  const image = listing.images?.[0];
  const metrics = listing.engagement_metrics || {};
  const hasAnalysis = !!listing.analysis_id;

  const statusConfig: Record<string, { label: string; color: string }> = {
    pending: { label: "Pending", color: "bg-amber-500/10 text-amber-400 border-amber-500/30" },
    analyzing: { label: "Analyzing", color: "bg-blue-500/10 text-blue-400 border-blue-500/30" },
    analyzed: { label: "Analyzed", color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" },
    archived: { label: "Archived", color: "bg-slate-500/10 text-slate-400 border-slate-500/30" },
  };

  const status = statusConfig[listing.status] || statusConfig.pending;

  return (
    <div
      onClick={hasAnalysis ? onViewAnalysis : undefined}
      className={`glass-card p-4 flex gap-4 group transition-all ${
        hasAnalysis ? "glass-hover cursor-pointer" : ""
      }`}
    >
      {/* Image */}
      <div className="w-20 h-20 rounded-lg bg-ink-800/50 flex-shrink-0 overflow-hidden">
        {image ? (
          <img src={image} alt={listing.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package className="w-6 h-6 text-ink-600" />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-sm font-medium text-ink-100 line-clamp-1 group-hover:text-white transition-colors">
            {listing.title}
          </h3>
          <span className={`text-[10px] px-2 py-0.5 rounded-full border whitespace-nowrap ${status.color}`}>
            {status.label}
          </span>
        </div>

        <div className="flex items-center gap-3 mt-1 text-xs text-ink-500">
          <span className="font-medium text-ink-300">{formatCurrency(listing.price)}</span>
          {listing.shipping_cost > 0 && (
            <span>+ {formatCurrency(listing.shipping_cost)} ship</span>
          )}
          {listing.condition && <span>• {listing.condition}</span>}
          {listing.category && <span>• {listing.category}</span>}
        </div>

        <div className="flex items-center gap-3 mt-2 text-xs text-ink-500">
          {listing.seller_name && <span>Seller: {listing.seller_name}</span>}
          {metrics.seller_feedback_pct > 0 && (
            <span>{metrics.seller_feedback_pct}% feedback</span>
          )}
          {metrics.watchers > 0 && <span>{metrics.watchers} watching</span>}
          <span className="ml-auto">{timeAgo(listing.scraped_at)}</span>
          <a
            href={listing.url}
            target="_blank"
            rel="noopener"
            onClick={(e) => e.stopPropagation()}
            className="text-brand-400 hover:text-brand-300 flex items-center gap-0.5"
          >
            <ExternalLink className="w-3 h-3" />
          </a>
          {hasAnalysis && (
            <ChevronRight className="w-4 h-4 text-ink-500 group-hover:text-brand-400 transition-colors" />
          )}
        </div>
      </div>
    </div>
  );
}
