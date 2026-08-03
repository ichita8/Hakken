import { useState } from "react";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import AuthPage from "@/pages/AuthPage";
import Nav from "@/components/Nav";
import Dashboard from "@/pages/Dashboard";
import Analyze from "@/pages/Analyze";
import AnalysisReport from "@/pages/AnalysisReport";
import Portfolio from "@/pages/Portfolio";
import Settings from "@/pages/Settings";
import { Radar } from "lucide-react";

type Page = "dashboard" | "analyze" | "portfolio" | "settings";

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
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
