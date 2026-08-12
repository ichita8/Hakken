import { useState } from "react";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import AuthPage from "@/pages/AuthPage";
import Nav from "@/components/Nav";
import Dashboard from "@/pages/Dashboard";
import Analyze from "@/pages/Analyze";
import AnalysisReport from "@/pages/AnalysisReportV3";
import Portfolio from "@/pages/PortfolioV2";
import Marketplace from "@/pages/Marketplace";
import Settings from "@/pages/Settings";
import { isSupabaseConfigured } from "@/lib/supabase";
import { Radar } from "lucide-react";

type Page = "dashboard" | "analyze" | "portfolio" | "marketplace" | "settings";

function AppContent() {
  const { user, loading } = useAuth();
  const [page, setPage] = useState<Page>("dashboard");
  const [viewingAnalysis, setViewingAnalysis] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-brand-500/10 border border-brand-500/30 mb-4 animate-pulse">
            <Radar className="w-8 h-8 text-brand-400" />
          </div>
          <p className="text-sm text-ink-400">Loading HAKKEN...</p>
        </div>
      </div>
    );
  }

  if (!user) return <AuthPage />;

  function handleNavigate(p: Page) {
    setViewingAnalysis(null);
    setPage(p);
  }

  function handleViewAnalysis(id: string) {
    setViewingAnalysis(id);
    setPage("dashboard");
  }

  function handleAnalysisComplete(id: string) {
    setViewingAnalysis(id);
  }

  return (
    <div className="flex min-h-screen">
      <Nav currentPage={page} onNavigate={handleNavigate} />
      <main className="flex-1 min-w-0">
        {viewingAnalysis ? (
          <AnalysisReport
            analysisId={viewingAnalysis}
            onBack={() => { setViewingAnalysis(null); setPage("dashboard"); }}
            onNavigate={handleNavigate}
          />
        ) : page === "dashboard" ? (
          <Dashboard onNavigate={handleNavigate} onViewAnalysis={handleViewAnalysis} />
        ) : page === "analyze" ? (
          <Analyze onAnalysisComplete={handleAnalysisComplete} />
        ) : page === "marketplace" ? (
          <Marketplace onNavigate={handleNavigate} onViewAnalysis={handleViewAnalysis} />
        ) : page === "portfolio" ? (
          <Portfolio />
        ) : (
          <Settings />
        )}
      </main>
    </div>
  );
}

export default function App() {
  if (!isSupabaseConfigured) {
    return(
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="glass-card max-w-xl w-full p-6 space-y-3">
          <h1 className="font-display text-xl font-bold text-white">Missing environment variables</h1>
          <p className="text-sm text-ink-300">
            Set <code className="text-brand-300">VITE_SUPABASE_URL</code> and {" "}
            <code className="text-brand-300>VITE_SUPABASE_ANON_KEY</code> in your deployment environment.
          </p>
         <p className="text-xs text-ink-500">
            For local development, copy <code className="text-brand-300">.env.example</code> to{" "}
            <code className="text-brand-300">.env</code> and fill in your Supabase values.
          </p>
        </div>
      </div>
    );
  }
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
