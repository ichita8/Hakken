import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { CATEGORIES, CONDITIONS, MARKETPLACES } from "@/lib/analysis";
import { ImagePlus, Loader2, X, AlertCircle } from "lucide-react";

export default function AnalysisForm({ onSubmit, submitting, defaultCategory = "Other", defaultMarketplace = "eBay" }) {
  const [form, setForm] = useState({
    title: "",
    description: "",
    asking_price: "",
    marketplace: defaultMarketplace,
    condition: "Unknown",
    listing_url: "",
    category: defaultCategory,
  });
  const [images, setImages] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleFiles = async (files) => {
    setError("");
    const list = Array.from(files).slice(0, 4 - images.length);
    if (!list.length) return;
    setUploading(true);
    try {
      const next = [];
      for (const file of list) {
        if (!file.type.startsWith("image/")) {
          setError("Only image files are allowed.");
          continue;
        }
        if (file.size > 5 * 1024 * 1024) {
          setError("Each image must be under 5MB.");
          continue;
        }
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        next.push({ url: file_url, name: file.name });
      }
      setImages((im) => [...im, ...next].slice(0, 4));
    } catch (e) {
      setError("Image upload failed. You can still analyze without images.");
    }
    setUploading(false);
  };

  const removeImage = (i) => setImages((im) => im.filter((_, idx) => idx !== i));

  const submit = (e) => {
    e.preventDefault();
    setError("");
    if (!form.title.trim()) return setError("Please enter a product title.");
    const price = Number(form.asking_price);
    if (!price || price <= 0) return setError("Please enter a valid asking price.");
    onSubmit({ ...form, asking_price: price, image_urls: images.map((i) => i.url) });
  };

  return (
    <form onSubmit={submit} className="panel p-6 max-w-2xl">
      <div className="space-y-5">
        <div>
          <Label htmlFor="title">Product title *</Label>
          <Input
            id="title"
            className="mt-1.5 bg-background"
            placeholder="e.g. Rolex Submariner 116610LN"
            value={form.title}
            onChange={(e) => set("title", e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="price">Asking price (USD) *</Label>
            <Input
              id="price"
              type="number"
              min="0"
              step="0.01"
              className="mt-1.5 bg-background font-mono"
              placeholder="0.00"
              value={form.asking_price}
              onChange={(e) => set("asking_price", e.target.value)}
            />
          </div>
          <div>
            <Label>Marketplace</Label>
            <Select value={form.marketplace} onValueChange={(v) => set("marketplace", v)}>
              <SelectTrigger className="mt-1.5 bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MARKETPLACES.map((m) => (
                  <SelectItem key={m} value={m}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label>Category</Label>
            <Select value={form.category} onValueChange={(v) => set("category", v)}>
              <SelectTrigger className="mt-1.5 bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Condition (seller-claimed)</Label>
            <Select value={form.condition} onValueChange={(v) => set("condition", v)}>
              <SelectTrigger className="mt-1.5 bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CONDITIONS.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <Label htmlFor="url">Listing URL (optional)</Label>
          <Input
            id="url"
            className="mt-1.5 bg-background"
            placeholder="https://..."
            value={form.listing_url}
            onChange={(e) => set("listing_url", e.target.value)}
          />
        </div>

        <div>
          <Label htmlFor="desc">Description (optional)</Label>
          <Textarea
            id="desc"
            className="mt-1.5 bg-background min-h-[90px]"
            placeholder="Paste the listing description, specs, or any details..."
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
          />
        </div>

        <div>
          <Label>Listing photos (optional, up to 4)</Label>
          <div className="mt-1.5 flex flex-wrap gap-3">
            {images.map((img, i) => (
              <div key={i} className="relative h-20 w-20 rounded-lg overflow-hidden border border-border">
                <img src={img.url} alt={img.name} className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={() => removeImage(i)}
                  className="absolute top-1 right-1 h-5 w-5 rounded-full bg-black/70 flex items-center justify-center text-white hover:bg-black"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
            {images.length < 4 && (
              <label className="h-20 w-20 rounded-lg border border-dashed border-border flex flex-col items-center justify-center gap-1 cursor-pointer hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-colors">
                {uploading ? (
                  <Loader2 className="h-4 w-4 animate-spin text-zinc-500" />
                ) : (
                  <>
                    <ImagePlus className="h-4 w-4 text-zinc-500" />
                    <span className="text-[10px] text-zinc-500">Add</span>
                  </>
                )}
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => e.target.files && handleFiles(e.target.files)}
                />
              </label>
            )}
          </div>
          <p className="mt-2 text-xs text-zinc-600">Photos help Hakken identify the product and assess condition & authenticity.</p>
        </div>

        {error && (
          <div className="flex items-center gap-2 text-sm text-rose-400">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        )}

        <Button
          type="submit"
          disabled={submitting || uploading}
          className="w-full bg-emerald-500 hover:bg-emerald-400 text-emerald-950 font-semibold h-11"
        >
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Analyzing...
            </>
          ) : (
            "Analyze listing"
          )}
        </Button>
      </div>
    </form>
  );
}
