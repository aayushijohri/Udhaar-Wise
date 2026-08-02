import { Link, useLocation, useNavigate } from "react-router-dom";
import type { ReactNode } from "react";
import {
  LayoutDashboard,
  Package,
  Landmark,
  LogOut,
  Bell,
  Search,
  Users,
  Settings,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/dashboard/orders", label: "Orders & Inventory", icon: Package },
  { to: "/dashboard/funding", label: "Funding & Schemes", icon: Landmark },
  { to: "/dashboard/customers", label: "Customers", icon: Users },
  { to: "/dashboard/settings", label: "Settings", icon: Settings },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  // Derive display initials / name from user data or fallback to defaults
  const displayName = user?.email?.split("@")[0] ?? "User";
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <div className="min-h-screen dashboard-scope">
      <div className="mx-auto flex max-w-[1400px] gap-6 px-4 py-6 lg:px-6">
        {/* Sidebar */}
        <aside className="hidden w-64 shrink-0 lg:block">
          <div className="glass-card sticky top-6 rounded-3xl p-5">
            <Link to="/" className="flex items-center gap-2">
              <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/30 font-black">
                ₹
              </div>
              <div>
                <div className="text-sm font-extrabold leading-tight">Informal</div>
                <div className="text-sm font-extrabold leading-tight -mt-0.5">Business OS</div>
              </div>
            </Link>
            <div className="mt-6 space-y-1">
              {NAV.map((n) => {
                const active =
                  n.to === "/dashboard/settings"
                    ? pathname.startsWith("/dashboard/settings")
                    : pathname === n.to;
                return (
                  <Link
                    key={n.to}
                    to={n.to}
                    className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${active ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-md shadow-emerald-500/30" : "text-slate-600 hover:bg-emerald-50 hover:text-emerald-800"}`}
                  >
                    <n.icon className="h-4 w-4" /> {n.label}
                  </Link>
                );
              })}
            </div>
            <button
              onClick={handleLogout}
              className="mt-6 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100"
            >
              <LogOut className="h-4 w-4" /> Sign out
            </button>
          </div>
        </aside>

        {/* Main */}
        <main className="min-w-0 flex-1">
          <div className="glass-card mb-6 flex items-center gap-3 rounded-2xl px-4 py-3">
            <div className="flex flex-1 items-center gap-2 text-slate-500">
              <Search className="h-4 w-4" />
              <input
                placeholder="Search orders, customers, items…"
                className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
              />
            </div>
            <span className="hidden md:inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1.5 text-[11px] font-bold text-emerald-800">
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500 pulse-dot text-emerald-500" />
              Meta Cloud API Connected
            </span>
            <button className="relative rounded-xl p-2 text-slate-600 hover:bg-slate-100">
              <Bell className="h-5 w-5" />
              <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-white" />
            </button>
            <div className="flex items-center gap-2 rounded-full bg-white/70 py-1 pl-1 pr-3 shadow-sm">
              <div className="grid h-7 w-7 place-items-center rounded-full bg-gradient-to-br from-rose-400 to-amber-400 text-xs font-bold text-white">
                {initial}
              </div>
              <div className="hidden text-xs leading-tight sm:block">
                <div className="font-bold text-slate-900 capitalize">{displayName}</div>
                <div className="text-slate-500">Business</div>
              </div>
            </div>
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}
