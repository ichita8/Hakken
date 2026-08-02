import { useAuth } from "@/context/AuthContext";
import { Radar, LayoutDashboard, ScanLine, Briefcase, Settings, LogOut, Bell } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import type { DealAlert } from "@/lib/types";
import { timeAgo, getDecisionColor } from "@/lib/utils";

type Page = "dashboard" | "analyze" | "portfolio" | "settings";

interface NavProps {
  currentPage: Page;
  onNavigate: (page: Page) => void;
}

export default function Nav({ currentPage, onNavigate }: NavProps) {
  const { user, profile, signOut } = useAuth();
  const [alerts, setAlerts] = useState<DealAlert[]>([]);
  const [showAlerts, setShowAlerts] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);

  useEffect(() => {
    async function loadAlerts() {
      if (!user) return;
      const { data } = await supabase
        .from("deal_alerts")
        .select("*")
        .eq("is_read", false)
        .order("created_at", { ascending: false })
        .limit(10);
      setAlerts((data as DealAlert[]) || []);
    }
    loadAlerts();
    const interval = setInterval(loadAlerts, 30000);
    return () => clearInterval(interval);
  }, [user, currentPage]);

  async function markAlertRead(id: string) {
    await supabase.from("deal_alerts").update({ is_read: true }).eq("id", id);
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  }

  const navItems: { id: Page; label: string; icon: typeof LayoutDashboard }[] = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "analyze", label: "Analyze", icon: ScanLine },
    { id: "portfolio", label: "Portfolio", icon: Briefcase },
    { id: "settings", label: "Settings", icon: Settings },
  ];

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-64 h-screen sticky top-0 border-r border-ink-800/60 bg-ink-950/50 backdrop-blur-xl">
        <div className="p-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-500/10 border border-brand-500/30 flex items-center justify-center">
              <Radar className="w-5 h-5 text-brand-400" />
            </div>
            <div>
              <h1 className="font-display text-lg font-bold text-white tracking-tight">HAKKEN</h1>
              <p className="text-[10px] text-ink-500 uppercase tracking-widest">Resale Intelligence</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = currentPage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  active
                    ? "bg-brand-500/10 text-brand-400 border border-brand-500/20"
                    : "text-ink-400 hover:text-ink-100 hover:bg-ink-800/50 border border-transparent"
                }`}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="p-3 border-t border-ink-800/60">
          <div className="flex items-center gap-3 px-3 py-2 mb-1">
            <div className="w-8 h-8 rounded-full bg-brand-500/20 flex items-center justify-center text-brand-400 text-sm font-semibold">
              {(profile?.display_name || user?.email || "?").charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-ink-100 truncate">{profile?.display_name || user?.email}</p>
              <p className="text-xs text-ink-500 truncate">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={signOut}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-ink-400 hover:text-rose-400 hover:bg-rose-500/5 transition-all"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="lg:hidden sticky top-0 z-50 glass px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Radar className="w-5 h-5 text-brand-400" />
          <span className="font-display font-bold text-white">HAKKEN</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAlerts(!showAlerts)}
            className="relative p-2 rounded-lg text-ink-400 hover:text-ink-100 hover:bg-ink-800/50"
          >
            <Bell className="w-5 h-5" />
            {alerts.length > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-brand-400" />
            )}
          </button>
          <button
            onClick={() => setMobileMenu(!mobileMenu)}
            className="p-2 rounded-lg text-ink-400 hover:text-ink-100 hover:bg-ink-800/50"
          >
            <div className="w-5 h-4 flex flex-col justify-between">
              <span className="block h-0.5 bg-current rounded"></span>
              <span className="block h-0.5 bg-current rounded"></span>
              <span className="block h-0.5 bg-current rounded"></span>
            </div>
          </button>
        </div>

        {mobileMenu && (
          <div className="absolute top-full left-0 right-0 glass border-t border-ink-800 p-3 space-y-1 animate-slide-up">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = currentPage === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => { onNavigate(item.id); setMobileMenu(false); }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    active ? "bg-brand-500/10 text-brand-400" : "text-ink-400 hover:text-ink-100 hover:bg-ink-800/50"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </button>
              );
            })}
            <button
              onClick={signOut}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-rose-400 hover:bg-rose-500/5"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        )}
      </header>

      {/* Alerts dropdown (desktop) */}
      {showAlerts && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowAlerts(false)} />
          <div className="fixed top-20 right-6 z-50 w-96 glass-card p-4 max-h-96 overflow-y-auto scrollbar-thin animate-slide-up hidden lg:block">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-ink-100">Deal Alerts</h3>
              <button onClick={() => setShowAlerts(false)} className="text-ink-500 hover:text-ink-300 text-xs">Close</button>
            </div>
            {alerts.length === 0 ? (
              <p className="text-sm text-ink-500 text-center py-8">No new alerts. Analyze listings to discover deals.</p>
            ) : (
              <div className="space-y-2">
                {alerts.map((alert) => (
                  <div
                    key={alert.id}
                    onClick={() => markAlertRead(alert.id)}
                    className="p-3 rounded-xl bg-ink-800/50 border border-ink-700/50 hover:border-brand-500/30 cursor-pointer transition-all"
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <p className="text-sm font-medium text-ink-100 truncate">{alert.title}</p>
                      {alert.decision && (
                        <span className={`text-[10px] px-2 py-0.5 rounded-full border ${getDecisionColor(alert.decision)}`}>
                          {alert.decision}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-ink-500">
                      <span>Score: {alert.opportunity_score}</span>
                      {alert.expected_profit !== null && <span>Profit: ${alert.expected_profit}</span>}
                      <span>{timeAgo(alert.created_at)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* Alerts bell button (desktop) */}
      <button
        onClick={() => setShowAlerts(!showAlerts)}
        className="hidden lg:flex fixed top-6 right-6 z-30 w-10 h-10 rounded-xl glass items-center justify-center text-ink-400 hover:text-brand-400 transition-colors"
      >
        <Bell className="w-4 h-4" />
        {alerts.length > 0 && (
          <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-brand-400 animate-pulse" />
        )}
      </button>
    </>
  );
}
