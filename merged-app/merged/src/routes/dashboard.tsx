import { Link } from "react-router-dom";
import { AppShell } from "@/components/app-shell";
import {
  BadgeCheck,
  MessageCircle,
  Mic,
  ScanLine,
  TrendingUp,
  AlertTriangle,
  Zap,
  FileText,
  ArrowUpRight,
  Package,
} from "lucide-react";
import { useDashboard } from "@/hooks/use-dashboard";
import { useAuth } from "@/contexts/AuthContext";

const TINT_STYLES: Record<string, { iconBg: string; text: string; trendBg: string }> = {
  emerald: { iconBg: "bg-emerald-100", text: "text-emerald-700", trendBg: "bg-emerald-50" },
  amber: { iconBg: "bg-amber-100", text: "text-amber-700", trendBg: "bg-amber-50" },
  indigo: { iconBg: "bg-indigo-100", text: "text-indigo-700", trendBg: "bg-indigo-50" },
  rose: { iconBg: "bg-rose-100", text: "text-rose-700", trendBg: "bg-rose-50" },
};

const STOCK_TONE_STYLES: Record<"rose" | "amber" | "emerald", string> = {
  rose: "bg-rose-50 text-rose-700",
  amber: "bg-amber-50 text-amber-700",
  emerald: "bg-emerald-50 text-emerald-700",
};

function formatCurrency(value: number | undefined): string {
  if (value === undefined || value === null) return "—";
  return `₹${value.toLocaleString("en-IN")}`;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const { overview, activities, lowStock, loading } = useDashboard();

  const metrics = [
    {
      label: "Monthly Revenue",
      value: loading ? "…" : formatCurrency(overview?.monthly_revenue),
      trend: loading ? "…" : "+0%",
      sub: "this month",
      tint: "emerald",
      icon: TrendingUp,
    },
    {
      label: "Pending Udhaar",
      value: loading ? "…" : formatCurrency(overview?.pending_udhaar),
      trend: loading ? "…" : `${overview?.unpaid_orders ?? 0} unpaid`,
      sub: "reminders due",
      tint: "amber",
      icon: AlertTriangle,
    },
    {
      label: "Orders Processed",
      value: loading ? "…" : String(overview?.orders_this_month ?? "0"),
      trend: "100%",
      sub: "automated",
      tint: "indigo",
      icon: Zap,
    },
    {
      label: "Loan Eligibility",
      value: loading ? "…" : `${overview?.loan_eligibility_score ?? 0}/100`,
      trend: (overview?.loan_eligibility_score ?? 0) >= 70 ? "High" : "Medium",
      sub: "readiness",
      tint: "rose",
      icon: BadgeCheck,
    },
  ];

  // Map backend recent-activities to display format; fallback to empty while loading
  const feed = activities.map((a) => ({
    source: (a.source as "voice" | "text" | "image") ?? "text",
    customer: a.customer ?? "Customer",
    phone: a.phone ?? "",
    msg: a.message ?? "",
    amount: a.amount ? formatCurrency(a.amount) : "—",
    status: a.status ?? "",
    tone: a.status?.toLowerCase().includes("paid") ? "emerald" : "amber",
    time: a.created_at ? new Date(a.created_at).toLocaleTimeString() : "",
  }));

  const businessName = user?.email?.split("@")[0] ?? "Business";

  return (
    <AppShell>
      {/* Profile header */}
      <section className="glass-card mb-6 rounded-3xl p-6">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 sm:flex sm:flex-wrap sm:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-rose-400 via-amber-400 to-emerald-400 text-2xl">
              🎂
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="truncate text-2xl font-extrabold text-slate-900 capitalize">
                  {businessName}
                </h1>
                <BadgeCheck className="h-5 w-5 shrink-0 text-emerald-600" />
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-1 font-semibold text-emerald-800">
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500 pulse-dot text-emerald-500" />
                  Meta WhatsApp Cloud API · Connected
                </span>
                <span className="rounded-full bg-slate-100 px-2.5 py-1 font-medium text-slate-600">
                  Business · Dashboard
                </span>
              </div>
            </div>
          </div>
          <button className="btn-glow-indigo inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold">
            <FileText className="h-4 w-4" /> Export 1-Click Credit Passport (PDF)
          </button>
        </div>
      </section>

      {/* Metric cards */}
      <section className="mb-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((m) => {
          const style = TINT_STYLES[m.tint] ?? TINT_STYLES.emerald;
          return (
            <div key={m.label} className="glass-card card-lift rounded-3xl p-6">
              <div className="flex items-center justify-between">
                <div
                  className={`grid h-10 w-10 place-items-center rounded-xl ${style.iconBg} ${style.text}`}
                >
                  <m.icon className="h-5 w-5" />
                </div>
                <span
                  className={`rounded-full ${style.trendBg} px-2 py-1 text-[11px] font-bold ${style.text}`}
                >
                  {m.trend}
                </span>
              </div>
              <div className="mt-4 text-3xl font-black tracking-tight text-slate-900">
                {m.value}
              </div>
              <div className="mt-1 text-xs font-medium text-slate-500">
                {m.label} · <span className="text-slate-400">{m.sub}</span>
              </div>
            </div>
          );
        })}
      </section>

      {/* Main grid */}
      <section className="grid gap-8 xl:grid-cols-[1.6fr_1fr]">
        {/* Feed */}
        <div className="glass-card rounded-3xl p-6">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-extrabold text-slate-900">Live WhatsApp Order Feed</h2>
              <p className="text-xs text-slate-500">AI-parsed in real time from Meta Cloud API</p>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-bold text-emerald-700">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 pulse-dot text-emerald-500" />{" "}
              Live
            </span>
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-12 text-sm text-slate-400">
              Loading…
            </div>
          ) : feed.length === 0 ? (
            <div className="flex items-center justify-center py-12 text-sm text-slate-400">
              No recent activity yet.
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {feed.slice(0, 4).map((f, i) => (
                <li
                  key={i}
                  className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 py-4"
                >
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 text-xs font-bold text-white">
                    {f.customer[0]}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-bold text-slate-900">{f.customer}</span>
                      <span
                        className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                          f.source === "voice"
                            ? "bg-indigo-100 text-indigo-700"
                            : f.source === "image"
                              ? "bg-amber-100 text-amber-700"
                              : "bg-emerald-100 text-emerald-700"
                        }`}
                      >
                        {f.source === "voice" && <Mic className="h-3 w-3" />}
                        {f.source === "image" && <ScanLine className="h-3 w-3" />}
                        {f.source === "text" && <MessageCircle className="h-3 w-3" />}
                        {f.source}
                      </span>
                    </div>
                    <p className="mt-0.5 truncate text-xs text-slate-500">{f.msg}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-black text-slate-900">{f.amount}</span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        f.tone === "emerald"
                          ? "bg-emerald-100 text-emerald-800"
                          : f.tone === "amber"
                            ? "bg-amber-100 text-amber-800"
                            : "bg-indigo-100 text-indigo-800"
                      }`}
                    >
                      {f.status}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <Link
            to="/dashboard/orders"
            className="mt-5 flex items-center justify-center gap-1.5 rounded-full border border-emerald-200 bg-white/60 py-2.5 text-xs font-bold text-emerald-800 hover:bg-emerald-50"
          >
            View All Orders in Order Hub <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {/* Right widgets */}
        <div className="space-y-6">
          {/* Low stock */}
          <div className="glass-card rounded-3xl p-6">
            <div className="mb-4 flex items-center gap-2">
              <div className="grid h-8 w-8 place-items-center rounded-xl bg-gradient-to-br from-amber-400 to-rose-500 text-white">
                <Package className="h-4 w-4" />
              </div>
              <h3 className="text-sm font-extrabold text-slate-900">Low-Stock Alerts</h3>
            </div>
            {loading ? (
              <div className="py-4 text-center text-xs text-slate-400">Loading…</div>
            ) : lowStock.length === 0 ? (
              <div className="py-4 text-center text-xs text-slate-400">
                All items are well-stocked ✓
              </div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {lowStock.slice(0, 3).map((s) => {
                  const ratio =
                    s.min_stock_threshold > 0
                      ? s.quantity_in_stock / s.min_stock_threshold
                      : 1;
                  const tone: "rose" | "amber" | "emerald" =
                    ratio <= 0.5 ? "rose" : ratio <= 1 ? "amber" : "emerald";
                  return (
                    <li key={(s.item_name as string) ?? s.name} className="flex items-center justify-between py-2.5 text-xs">
                      <span className="font-semibold text-slate-800">{(s.item_name as string) ?? s.name}</span>
                      <span
                        className={`rounded-full ${STOCK_TONE_STYLES[tone]} px-2 py-0.5 font-bold`}
                      >
                        {s.quantity_in_stock} left
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
            <Link to="/dashboard/orders">
              <button className="mt-3 w-full rounded-full border border-emerald-200 py-2 text-xs font-semibold text-emerald-800 hover:bg-emerald-50">
                Restock Now →
              </button>
            </Link>
          </div>

          {/* Micro loan widget */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-600 via-teal-600 to-indigo-700 p-6 text-white shadow-2xl shadow-emerald-500/30">
            <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest backdrop-blur">
              PS22 Micro-Loan
            </span>
            <h3 className="mt-3 text-xl font-extrabold leading-tight">
              You qualify for{" "}
              <span className="text-amber-300">
                ₹{((overview?.loan_eligibility_score ?? 0) >= 70 ? 50000 : 25000).toLocaleString("en-IN")}
              </span>{" "}
              via PM Mudra Scheme!
            </h3>
            <p className="mt-2 text-xs text-white/80">
              Based on your 30-day verified revenue, repayment reliability, and Credit Passport
              score of {overview?.loan_eligibility_score ?? 0}.
            </p>
            <Link to="/dashboard/funding">
              <button className="mt-4 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-bold text-emerald-700">
                Explore Schemes <ArrowUpRight className="h-3.5 w-3.5" />
              </button>
            </Link>
          </div>
        </div>
      </section>
    </AppShell>
  );
}
