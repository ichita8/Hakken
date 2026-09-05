import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import {
  LayoutDashboard, Sparkles, History as HistoryIcon, Briefcase,
  Settings, LogOut, ChevronRight,
} from "lucide-react";
import Logo from "@/components/Logo";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/analyze", label: "Analyze", icon: Sparkles },
  { to: "/history", label: "History", icon: HistoryIcon },
  { to: "/portfolio", label: "Portfolio", icon: Briefcase },
  { to: "/settings", label: "Settings", icon: Settings },
];

export default function AppShell() {
  const { user, logout } = useAuth();
  const loc = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout(false);
    navigate("/login", { replace: true });
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col md:flex-row">
      <aside className="md:w-60 shrink-0 border-b md:border-b-0 md:border-r border-border bg-[#0b0e13] flex md:flex-col">
        <div className="hidden md:flex px-5 h-16 items-center border-b border-border">
          <Logo />
        </div>
        <div className="md:hidden px-4 h-14 flex items-center justify-between border-b border-border">
          <Logo to="/dashboard" />
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" asChild className="h-9 w-9 p-0 text-zinc-400 hover:text-zinc-100">
              <Link to="/settings"><Settings className="h-4 w-4" /></Link>
            </Button>
            <Button variant="ghost" size="sm" onClick={handleLogout} className="h-9 w-9 p-0 text-zinc-400 hover:text-zinc-100">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <nav className="flex md:flex-col gap-1 px-2 md:px-3 py-2 md:py-4 overflow-x-auto md:overflow-visible flex-1">
          {NAV.map((item) => {
            const active = loc.pathname === item.to;
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors whitespace-nowrap",
                  active
                    ? "bg-emerald-500/10 text-emerald-300"
                    : "text-zinc-400 hover:text-zinc-100 hover:bg-white/5"
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="hidden md:block px-3 py-3 border-t border-border">
          <Link
            to="/settings"
            className="group flex items-center gap-2.5 rounded-lg px-2 py-2 hover:bg-white/5 transition-colors"
            title="Open profile & settings"
          >
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center text-emerald-950 font-semibold text-sm shrink-0">
              {(user?.full_name || user?.email || "U").charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm text-zinc-200 truncate">{user?.full_name || "Reseller"}</div>
              <div className="text-xs text-zinc-600 truncate">{user?.email}</div>
            </div>
            <ChevronRight className="h-4 w-4 text-zinc-600 group-hover:text-zinc-300" />
          </Link>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="mt-1 w-full justify-start text-zinc-500 hover:text-zinc-100"
          >
            <LogOut className="h-4 w-4 mr-2" /> Sign out
          </Button>
        </div>
      </aside>
      <main className="flex-1 min-w-0">
        <Outlet />
      </main>
    </div>
  );
}
