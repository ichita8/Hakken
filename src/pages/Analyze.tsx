import { useState, useRef, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { MARKETPLACES, DEFAULT_CATEGORIES } from "@/lib/types";
import {
  ScanLine, Link2, ImagePlus, Sparkles, X, Loader2, CheckCircle2, AlertCircle,
  Upload, Camera, Trash2, FileWarning, Tag
} from "lucide-react";

interface AnalyzeProps {
  onAnalysisComplete: (id: string) => void;
}

interface UploadedImage {
  url: string;
  path: string;
  preview: string;
}

const PIPELINE_LAYERS = [
  { id: 1, name: "Product Identification", description: "AI identifies brand, model, year, and variant" },
  { id: 2, name: "Condition Assessment", description: "Multi-point condition scoring and risk evaluation" },
  { id: 3, name: "Authenticity Verification", description: "Counterfeit detection with confidence scoring" },
  { id: 4, name: "Market Valuation", description: "Fair market value, resale range, and profit projection" },
  { id: 5, name: "Opportunity Assessment", description: "Final scoring, decision, and negotiation strategy" },
];

const MAX_IMAGES = 6;
const MAX_FILE_SIZE = 8 * 1024 * 1024; // 8MB

export default function Analyze({ onAnalysisComplete }: AnalyzeProps) {
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [askingPrice, setAskingPrice] = useState("");
  const [marketplace, setMarketplace] = useState(MARKETPLACES[0]);
  const [category, setCategory] = useState("General");
  const [listingUrl, setListingUrl] = useState("");
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentLayer, setCurrentLayer] = useState(-1);
  const [completedLayers, setCompletedLayers] = useState<number[]>([]);
  const [dragActive, setDragActive] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(async (files: FileList | File[]) => {
    if (!user) return;
    const fileArray = Array.from(files);
    if (images.length + fileArray.length > MAX_IMAGES) {
      setUploadError(`Maximum ${MAX_IMAGES} images allowed.`);
      return;
    }

    setUploadError(null);
    setUploading(true);

    for (const file of fileArray) {
      if (!file.type.startsWith("image/")) {
        setUploadError("Only image files are accepted.");
        continue;
      }
      if (file.size > MAX_FILE_SIZE) {
        setUploadError("Each image must be under 8MB.");
        continue;
      }

      const ext = file.name.split(".").pop() || "jpg";
      const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

      const { error: upErr } = await supabase.storage
        .from("listing-images")
        .upload(fileName, file, { contentType: file.type });

      if (upErr) {
        setUploadError("Failed to upload image. Please try again.");
        continue;
      }

      const { data: urlData } = supabase.storage
        .from("listing-images")
        .getPublicUrl(fileName);

      const preview = URL.createObjectURL(file);
      setImages((prev) => [...prev, { url: urlData.publicUrl, path: fileName, preview }]);
    }

    setUploading(false);
  }, [user, images.length]);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setDragActive(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    setDragActive(false);
  }

  async function removeImage(img: UploadedImage) {
    await supabase.storage.from("listing-images").remove([img.path]);
    setImages((prev) => prev.filter((i) => i.path !== img.path));
  }

  const canSubmit = title.trim() && askingPrice && listingUrl.trim() && images.length > 0 && !uploading;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    if (!canSubmit) {
      setError("Please fill in all required fields and upload at least one image.");
      return;
    }

    setLoading(true);
    setError(null);
    setCurrentLayer(-1);
    setCompletedLayers([]);

    const imageUrls = images.map((i) => i.url);

    const { data, error: insertError } = await supabase
      .from("analyses")
      .insert({
        user_id: user.id,
        title: title.trim(),
        description: description.trim() || null,
        asking_price: parseFloat(askingPrice),
        marketplace,
        category,
        image_urls: imageUrls,
        listing_url: listingUrl.trim(),
        status: "pending",
      })
      .select()
      .single();

    if (insertError || !data) {
      setError("Failed to create analysis. Please try again.");
      setLoading(false);
      return;
    }

    const analysisId = data.id;

    for (let i = 0; i < PIPELINE_LAYERS.length; i++) {
      setCurrentLayer(i);
      await new Promise((r) => setTimeout(r, 800));
      setCompletedLayers((prev) => [...prev, i]);
    }

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-listing-v3`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            analysisId,
            title: title.trim(),
            description: description.trim(),
            askingPrice: parseFloat(askingPrice),
            marketplace,
            category,
            imageUrls,
            listingUrl: listingUrl.trim(),
          }),
        }
      );

      if (!response.ok) {
        const errBody = await response.json().catch(() => ({}));
        throw new Error(errBody.error || `Analysis failed (${response.status})`);
      }

      const result = await response.json();
      if (result.error) throw new Error(result.error);

      await new Promise((r) => setTimeout(r, 500));
      onAnalysisComplete(analysisId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed. Please try again.");
      setLoading(false);
      setCurrentLayer(-1);
      setCompletedLayers([]);
    }
  }

  return (
    <div className="p-6 lg:p-10 max-w-5xl mx-auto animate-fade-in">
      <div className="mb-8">
        <h1 className="font-display text-2xl lg:text-3xl font-bold text-white">Analyze a Listing</h1>
        <p className="text-sm text-ink-400 mt-1">Upload photos and paste listing details for the most accurate AI-powered analysis.</p>
      </div>

      <div className="grid lg:grid-cols-5 gap-6">
        {/* Form */}
        <div className="lg:col-span-3">
          <form onSubmit={handleSubmit} className="glass-card p-6 space-y-5">
            {/* Image upload */}
            <div>
              <label className="label-text flex items-center gap-1">
                Listing Photos <span className="text-rose-400">*</span>
                <span className="text-ink-600 normal-case font-normal ml-1">({images.length}/{MAX_IMAGES})</span>
              </label>

              {images.length > 0 && (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mb-3">
                  {images.map((img) => (
                    <div key={img.path} className="relative group aspect-square rounded-xl overflow-hidden border border-ink-700/60">
                      <img src={img.preview} alt="listing" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removeImage(img)}
                        className="absolute top-1 right-1 w-6 h-6 rounded-lg bg-ink-950/80 text-ink-300 hover:text-rose-400 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                className={`relative border-2 border-dashed rounded-xl p-6 text-center transition-all ${
                  dragActive ? "border-brand-500 bg-brand-500/5" : "border-ink-700 hover:border-ink-600"
                }`}
              >
                <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => e.target.files && handleFiles(e.target.files)} />
                <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => e.target.files && handleFiles(e.target.files)} />

                {uploading ? (
                  <div className="flex flex-col items-center gap-2 py-2">
                    <Loader2 className="w-6 h-6 text-brand-400 animate-spin" />
                    <p className="text-xs text-ink-400">Uploading...</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-brand-500/10 flex items-center justify-center">
                      <Upload className="w-5 h-5 text-brand-400" />
                    </div>
                    <p className="text-sm text-ink-300">Drag & drop photos here</p>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => fileInputRef.current?.click()} className="btn-secondary text-xs flex items-center gap-1.5">
                        <ImagePlus className="w-3.5 h-3.5" /> Choose Files
                      </button>
                      <button type="button" onClick={() => cameraInputRef.current?.click()} className="btn-secondary text-xs flex items-center gap-1.5">
                        <Camera className="w-3.5 h-3.5" /> Take Photo
                      </button>
                    </div>
                  </div>
                )}
              </div>
              {uploadError && (
                <p className="text-xs text-rose-400 mt-2 flex items-center gap-1.5">
                  <FileWarning className="w-3 h-3" /> {uploadError}
                </p>
              )}
              <p className="text-xs text-ink-500 mt-2">Upload clear photos of the item from multiple angles. Include close-ups of details, serial numbers, and any damage.</p>
            </div>

            <div>
              <label className="label-text flex items-center gap-1">
                Listing Title <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Rolex Submariner 14060M Excellent Condition"
                className="input-field"
              />
            </div>

            <div>
              <label className="label-text">Listing Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Paste the full listing description here. The more detail you provide, the more accurate the analysis."
                rows={5}
                className="input-field resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label-text flex items-center gap-1">
                  Asking Price ($) <span className="text-rose-400">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={askingPrice}
                  onChange={(e) => setAskingPrice(e.target.value)}
                  placeholder="4500"
                  className="input-field"
                />
              </div>
              <div>
                <label className="label-text">Marketplace</label>
                <select
                  value={marketplace}
                  onChange={(e) => setMarketplace(e.target.value)}
                  className="input-field cursor-pointer"
                >
                  {MARKETPLACES.map((m) => (
                    <option key={m} value={m} className="bg-ink-900">{m}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="label-text flex items-center gap-1">
                <Tag className="w-3 h-3" /> Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="input-field cursor-pointer"
              >
                {DEFAULT_CATEGORIES.map((c) => (
                  <option key={c} value={c} className="bg-ink-900">{c}</option>
                ))}
              </select>
              <p className="text-xs text-ink-500 mt-2">Select the category that best fits this listing. You can add custom categories in Settings.</p>
            </div>

            <div>
              <label className="label-text flex items-center gap-1">
                Listing URL <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-500" />
                <input
                  type="url"
                  required
                  value={listingUrl}
                  onChange={(e) => setListingUrl(e.target.value)}
                  placeholder="https://www.ebay.com/itm/..."
                  className="input-field pl-10"
                />
              </div>
              <p className="text-xs text-ink-500 mt-2">Paste the direct link to the listing page.</p>
            </div>

            {error && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <button type="submit" disabled={loading || !canSubmit} className="btn-primary w-full flex items-center justify-center gap-2">
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Run 5-Layer AI Analysis
                  </>
                )}
              </button>
              {!canSubmit && !loading && (
                <p className="text-xs text-ink-500 mt-2 text-center">All fields with * are required to run the analysis.</p>
              )}
            </div>
          </form>
        </div>

        {/* Pipeline visualization */}
        <div className="lg:col-span-2">
          <div className="glass-card p-6 sticky top-6">
            <h3 className="text-sm font-semibold text-white mb-1 flex items-center gap-2">
              <ScanLine className="w-4 h-4 text-brand-400" />
              AI Analysis Pipeline
            </h3>
            <p className="text-xs text-ink-500 mb-5">5-layer evaluation engine powered by GPT-4o Vision</p>

            <div className="space-y-3">
              {PIPELINE_LAYERS.map((layer, i) => {
                const isActive = currentLayer === i;
                const isCompleted = completedLayers.includes(i);
                const isPending = loading && !isCompleted && currentLayer < i;

                return (
                  <div
                    key={layer.id}
                    className={`p-3 rounded-xl border transition-all duration-500 ${
                      isActive
                        ? "border-brand-500/50 bg-brand-500/10 scale-[1.02]"
                        : isCompleted
                        ? "border-emerald-500/30 bg-emerald-500/5"
                        : isPending
                        ? "border-ink-800 bg-ink-900/30 opacity-50"
                        : "border-ink-800 bg-ink-900/30"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold transition-all ${
                        isActive ? "bg-brand-500 text-ink-950 animate-pulse" :
                        isCompleted ? "bg-emerald-500/20 text-emerald-400" :
                        "bg-ink-800 text-ink-500"
                      }`}>
                        {isCompleted ? <CheckCircle2 className="w-4 h-4" /> : isActive ? <Loader2 className="w-4 h-4 animate-spin" /> : layer.id}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium ${isActive ? "text-brand-300" : isCompleted ? "text-ink-100" : "text-ink-400"}`}>
                          {layer.name}
                        </p>
                        <p className="text-xs text-ink-500 mt-0.5">{layer.description}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {loading && completedLayers.length === PIPELINE_LAYERS.length && (
              <div className="mt-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-2 text-emerald-300 text-sm animate-fade-in">
                <CheckCircle2 className="w-4 h-4" />
                Generating report...
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {loading && completedLayers.length === PIPELINE_LAYERS.length && (
              <div className="mt-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-2 text-emerald-300 text-sm animate-fade-in">
                <CheckCircle2 className="w-4 h-4" />
                Generating report...
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
