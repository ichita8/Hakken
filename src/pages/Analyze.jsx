import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import AnalysisForm from "@/components/AnalysisForm";
import PipelineLoader from "@/components/PipelineLoader";
import { analyzeListing, targetRoiFromPrefs } from "@/lib/analysis";
import { useAuth } from "@/lib/AuthContext";
import { AlertCircle } from "lucide-react";

export default function Analyze() {
  const [submitting, setSubmitting] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { user } = useAuth();
  const prefs = (user && user.data) || {};

  const handleSubmit = async (input) => {
    setError("");
    setSubmitting(true);
    setAnalyzing(true);
    try {
      const record = await analyzeListing(input, { target_roi: targetRoiFromPrefs(prefs) });
      const saved = await base44.entities.Analysis.create(record);
      setAnalyzing(false);
      setSubmitting(false);
      navigate(`/analysis/${saved.id}`);
    } catch (e) {
      setAnalyzing(false);
      setSubmitting(false);
      setError(e.message || "Analysis failed. Please try again.");
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">Analyze a listing</h1>
        <p className="text-zinc-500 mt-1 text-sm">
          Enter what you know. Photos are optional but improve accuracy.
        </p>
      </div>

      {error && (
        <div className="mb-5 flex items-start gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {analyzing ? (
        <PipelineLoader running={analyzing} />
      ) : (
        <AnalysisForm
          onSubmit={handleSubmit}
          submitting={submitting}
          defaultCategory={(prefs.preferred_categories || [])[0] || "Other"}
          defaultMarketplace={(prefs.preferred_marketplaces || [])[0] || "eBay"}
        />
      )}
    </div>
  );
}
