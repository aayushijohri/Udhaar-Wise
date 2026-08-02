import { useState, useEffect } from "react";
import { AppShell } from "@/components/app-shell";
import { useCustomers } from "@/hooks/use-customers";
import {
  Users,
  Search,
  Filter,
  MessageCircle,
  Eye,
  Clock,
  Star,
  TrendingUp,
  RefreshCw,
  ChevronRight,
  IndianRupee,
  ShoppingCart,
  BarChart3,
  Crown,
  Target,
  Phone,
  Brain,
  Zap,
  ArrowRight,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

// ─── Data ─────────────────────────────────────────────────────────────────────
// Live data fetched from useCustomers hook - no static mock data

// ─── Static chart data ────────────────────────────────────────────────────────

const spendingData = [
  { month: "Jan", revenue: 42000 },
  { month: "Feb", revenue: 56000 },
  { month: "Mar", revenue: 71000 },
  { month: "Apr", revenue: 63000 },
  { month: "May", revenue: 88000 },
  { month: "Jun", revenue: 94000 },
  { month: "Jul", revenue: 78000 },
];

const retentionData = [
  { name: "VIP", value: 2, color: "#059669" },
  { name: "Loyal", value: 2, color: "#6366F1" },
  { name: "Growing", value: 1, color: "#F59E0B" },
  { name: "New", value: 1, color: "#0D9488" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function badgeStyle(badge: string) {
  switch (badge) {
    case "VIP":
      return "bg-emerald-100 text-emerald-700 border-emerald-200";
    case "Loyal":
      return "bg-indigo-100 text-indigo-700 border-indigo-200";
    case "Growing":
      return "bg-amber-100 text-amber-700 border-amber-200";
    case "New":
      return "bg-teal-100 text-teal-700 border-teal-200";
    default:
      return "bg-gray-100 text-gray-600";
  }
}

function useCountUp(target: number, duration = 1400, started = false) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!started) return;
    let v = 0;
    const step = target / (duration / 16);
    const timer = setInterval(() => {
      v += step;
      if (v >= target) {
        setCount(target);
        clearInterval(timer);
      } else setCount(Math.floor(v));
    }, 16);
    return () => clearInterval(timer);
  }, [target, duration, started]);
  return count;
}

function AnimatedCounter({
  value,
  prefix = "",
  suffix = "",
  started,
}: {
  value: number;
  prefix?: string;
  suffix?: string;
  started: boolean;
}) {
  const count = useCountUp(value, 1400, started);
  return (
    <span>
      {prefix}
      {count.toLocaleString("en-IN")}
      {suffix}
    </span>
  );
}

// ─── Customer List Card ───────────────────────────────────────────────────────

function CustomerCard({
  customer,
  onClick,
  selected,
}: {
  customer: import("@/hooks/use-customers").Customer;
  onClick: () => void;
  selected: boolean;
}) {
  return (
    <div
      onClick={onClick}
      className={`group relative rounded-xl p-4 cursor-pointer transition-all duration-200 border ${
        selected
          ? "bg-white border-emerald-300 shadow-md shadow-emerald-100"
          : "bg-white/70 border-white/60 hover:bg-white hover:border-emerald-200 hover:shadow-sm"
      }`}
      style={{ backdropFilter: "blur(12px)" }}
    >
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-xs flex-shrink-0 shadow-sm"
          style={{ background: `linear-gradient(135deg, ${customer.color}, ${customer.color}cc)` }}
        >
          {customer.avatar}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-0.5">
            <span className="font-semibold text-gray-900 text-sm truncate">{customer.name}</span>
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded-full border font-semibold flex-shrink-0 ml-2 ${badgeStyle(customer.badge)}`}
            >
              {customer.badge}
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <Phone size={9} />
              {customer.phone}
            </span>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-gray-100">
        <div className="text-center">
          <div className="text-[10px] text-gray-400">Orders</div>
          <div className="font-bold text-gray-900 text-sm">{customer.orders}</div>
        </div>
        <div className="text-center border-x border-gray-100">
          <div className="text-[10px] text-gray-400">Spent</div>
          <div className="font-bold text-emerald-600 text-sm">
            ₹{(customer.spending / 1000).toFixed(1)}k
          </div>
        </div>
        <div className="text-center">
          <div className="text-[10px] text-gray-400">Last</div>
          <div className="font-bold text-gray-700 text-xs">
            {customer.lastPurchase.split(" ").slice(0, 2).join(" ")}
          </div>
        </div>
      </div>
    </div>
  );
}


// ─── Timeline Item ────────────────────────────────────────────────────────────

function TimelineItem({
  event,
  isLast,
}: {
  event: import("@/hooks/use-customers").Customer["timeline"][0];
  isLast: boolean;
}) {
  const statusConfig = {
    pending: "bg-amber-100 text-amber-700",
    accepted: "bg-blue-100 text-blue-700",
    completed: "bg-emerald-100 text-emerald-700",
    rejected: "bg-rose-100 text-rose-700",
  };
  return (
    <div className="relative pl-6 pb-4">
      {!isLast && (
        <div className="absolute left-[7px] top-2 bottom-0 w-0.5 bg-gray-200" />
      )}
      <div className="absolute left-0 top-2 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white shadow-sm" />
      <div className="text-[11px] text-gray-500 mb-0.5">{event.date}</div>
      <div className="text-xs font-semibold text-gray-900">{event.title}</div>
      <div className="text-[11px] text-gray-600">{event.amount}</div>
      <div className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${statusConfig[event.status as keyof typeof statusConfig] || "bg-gray-100 text-gray-600"}`}>
        {event.status}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function CustomersPage() {
  const { customers, loading } = useCustomers();
  const [selectedCustomer, setSelectedCustomer] = useState<import("@/hooks/use-customers").Customer | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterBadge, setFilterBadge] = useState("All");
  const [countersStarted, setCountersStarted] = useState(false);

  // Auto-select first customer once loaded
  useEffect(() => {
    if (!selectedCustomer && customers.length > 0) {
      setSelectedCustomer(customers[0]);
    }
  }, [customers, selectedCustomer]);

  useEffect(() => {
    const timer = setTimeout(() => setCountersStarted(true), 300);
    return () => clearTimeout(timer);
  }, []);

  const filtered = customers.filter((c) => {
    const matchSearch =
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) || c.phone.includes(searchQuery);
    const matchBadge = filterBadge === "All" || c.badge === filterBadge;
    return matchSearch && matchBadge;
  });

  const kpis = [
    { label: "Total Customers", value: customers.length, icon: Users, color: "#059669" },
    { label: "Repeat Customers", value: customers.filter((c) => c.orders >= 2).length, icon: RefreshCw, color: "#6366F1" },
    { label: "VIP + Loyal", value: customers.filter((c) => c.badge === "VIP" || c.badge === "Loyal").length, icon: Crown, color: "#F59E0B" },
    { label: "Total Spending", value: customers.reduce((sum, c) => sum + c.spending, 0), icon: IndianRupee, color: "#0D9488" },
  ];

  return (
    <AppShell>
      <div className="space-y-8">
        {/* ── Hero ─────────────────────────────────────────────── */}
        <div
          className="relative overflow-hidden rounded-2xl px-6 py-5 text-white"
          style={{
            background: "linear-gradient(135deg, #059669 0%, #0D9488 40%, #6366F1 100%)",
          }}
        >
          <div
            className="absolute top-0 right-0 w-48 h-48 rounded-full opacity-10"
            style={{
              background: "radial-gradient(circle, #25D366, transparent)",
              transform: "translate(30%, -30%)",
            }}
          />
          <div
            className="absolute bottom-0 left-1/2 w-36 h-36 rounded-full opacity-10"
            style={{
              background: "radial-gradient(circle, #F59E0B, transparent)",
              transform: "translate(-50%, 40%)",
            }}
          />
          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <div className="w-6 h-6 rounded-md bg-white/20 flex items-center justify-center">
                  <Brain size={12} className="text-white" />
                </div>
                <span className="text-xs font-semibold text-white/80 uppercase tracking-wider">
                  AI Customer Intelligence
                </span>
              </div>
              <h1 className="text-2xl font-bold text-white leading-tight">
                Customer Intelligence Hub
              </h1>
              <p className="text-white/70 text-xs mt-1 max-w-md leading-relaxed">
                Intelligent reminders, personalized insights, and AI-powered recommendations for
                your business.
              </p>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
              {kpis.map((m) => {
                const Icon = m.icon;
                return (
                  <div
                    key={m.label}
                    className="bg-white/15 backdrop-blur-sm rounded-xl p-3 border border-white/20 hover:bg-white/20 transition-colors min-w-[100px]"
                  >
                    <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center mb-1.5">
                      <Icon size={13} className="text-white" />
                    </div>
                    <div className="text-xl font-bold text-white">
                      <AnimatedCounter value={m.value} started={countersStarted} />
                    </div>
                    <div className="text-[10px] text-white/70 mt-0.5 leading-tight">{m.label}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── Customer List (40%) + Detail Panel (60%) ─────────── */}
        <div className="grid grid-cols-1 xl:grid-cols-5 gap-5">
          {/* Customer List — 40% (2 of 5 cols) */}
          <div className="xl:col-span-2 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900">Customers</h2>
              <span className="text-xs text-slate-400">
                {filtered.length} of {customers.length}
              </span>
            </div>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search
                  size={12}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-xl outline-none focus:border-emerald-300 transition-all"
                  placeholder="Search customers..."
                />
              </div>
              <div className="relative">
                <select
                  value={filterBadge}
                  onChange={(e) => setFilterBadge(e.target.value)}
                  className="appearance-none bg-white border border-slate-200 rounded-xl px-3 py-2 pr-7 text-xs text-slate-700 outline-none focus:border-emerald-300 cursor-pointer"
                >
                  {["All", "VIP", "Loyal", "Growing", "New"].map((v) => (
                    <option key={v}>{v}</option>
                  ))}
                </select>
                <Filter
                  size={11}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                />
              </div>
            </div>
            <div
              className="space-y-2 max-h-[580px] overflow-y-auto pr-0.5"
              style={{ scrollbarWidth: "none" }}
            >
              {filtered.map((c) => (
                <CustomerCard
                  key={c.id}
                  customer={c}
                  onClick={() => setSelectedCustomer(c)}
                  selected={selectedCustomer?.id === c.id}
                />
              ))}
              {filtered.length === 0 && (
                <div className="text-center py-10 text-slate-400 text-sm">
                  No customers match your search.
                </div>
              )}
            </div>
          </div>

          {/* Detail Panel — 60% (3 of 5 cols) */}
          <div className="xl:col-span-3">
            {selectedCustomer ? (
              <div className="space-y-4">
                {/* Profile Header */}
                <div
                  className="relative overflow-hidden rounded-2xl p-5 bg-white/80 border border-white/60 shadow-sm"
                  style={{ backdropFilter: "blur(12px)" }}
                >
                  <div
                    className="absolute inset-0 opacity-5"
                    style={{
                      background: `radial-gradient(circle at top right, ${selectedCustomer.color}, transparent)`,
                    }}
                  />
                  <div className="relative flex items-start gap-4">
                    <div
                      className="w-14 h-14 rounded-2xl flex items-center justify-center text-white font-bold text-base shadow-lg flex-shrink-0"
                      style={{
                        background: `linear-gradient(135deg, ${selectedCustomer.color}, ${selectedCustomer.color}aa)`,
                      }}
                    >
                      {selectedCustomer.avatar}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="text-base font-bold text-slate-900">
                            {selectedCustomer.name}
                          </h3>
                          <div className="flex items-center gap-2 mt-0.5">
                            <Phone size={11} className="text-slate-400" />
                            <span className="text-xs text-slate-500">{selectedCustomer.phone}</span>
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold ${badgeStyle(selectedCustomer.badge)}`}
                            >
                              {selectedCustomer.badge}
                            </span>
                          </div>
                        </div>
                        <div className="flex gap-2 flex-shrink-0">
                          <button className="flex items-center gap-1.5 text-xs bg-emerald-600 text-white rounded-lg px-3 py-1.5 font-semibold hover:bg-emerald-700 transition-colors">
                            <MessageCircle size={11} /> Message
                          </button>
                          <button className="flex items-center gap-1.5 text-xs bg-white border border-slate-200 text-slate-700 rounded-lg px-3 py-1.5 font-semibold hover:bg-slate-50 transition-colors">
                            <Eye size={11} /> View All
                          </button>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-2 mt-3">
                        {[
                          {
                            label: "Orders",
                            value: String(selectedCustomer.orders),
                            color: "text-slate-900",
                          },
                          {
                            label: "Total Spent",
                            value: `₹${selectedCustomer.spending.toLocaleString("en-IN")}`,
                            color: "text-emerald-600",
                          },
                          {
                            label: "Last Purchase",
                            value: selectedCustomer.lastPurchase,
                            color: "text-slate-700",
                          },
                        ].map((s) => (
                          <div key={s.label} className="bg-slate-50 rounded-xl p-2.5">
                            <div className="text-[10px] text-slate-400 mb-0.5">{s.label}</div>
                            <div className={`font-bold text-xs ${s.color}`}>{s.value}</div>
                          </div>
                        ))}
                      </div>
                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {selectedCustomer.tags.map((tag) => (
                          <span
                            key={tag}
                            className="text-[10px] bg-white border border-emerald-200 text-emerald-700 px-2 py-1 rounded-full font-medium"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* AI Memory */}
                <div className="rounded-xl p-4 bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-100">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-6 h-6 rounded-md bg-indigo-100 flex items-center justify-center">
                      <Brain size={12} className="text-indigo-600" />
                    </div>
                    <h3 className="text-sm font-bold text-indigo-900">AI Customer Memory</h3>
                    <span className="ml-auto text-[10px] bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full font-semibold">
                      Auto-detected
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div className="flex items-start gap-2 bg-white/70 rounded-lg p-2.5 border border-indigo-100/60">
                      <span className="text-sm flex-shrink-0">💭</span>
                      <span className="text-xs text-slate-700 leading-relaxed">{selectedCustomer.aiMemory || "AI memory not available"}</span>
                    </div>
                  </div>
                </div>

                {/* Timeline */}
                <div
                  className="rounded-xl p-4 bg-white/80 border border-white/60 shadow-sm"
                  style={{ backdropFilter: "blur(12px)" }}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-6 h-6 rounded-md bg-emerald-100 flex items-center justify-center">
                      <Clock size={12} className="text-emerald-600" />
                    </div>
                    <h3 className="text-sm font-bold text-slate-900">Customer Timeline</h3>
                  </div>
                  <div className="space-y-0">
                    {selectedCustomer.timeline.map((event, i) => (
                      <TimelineItem
                        key={i}
                        event={event}
                        isLast={i === selectedCustomer.timeline.length - 1}
                      />
                    ))}
                  </div>
                </div>

                {/* Smart AI Suggestions — scoped to selected customer */}
                {selectedCustomer.suggestions && selectedCustomer.suggestions.length > 0 && (
                  <div
                    className="rounded-xl p-4 bg-white/80 border border-white/60 shadow-sm"
                    style={{ backdropFilter: "blur(12px)" }}
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-6 h-6 rounded-md bg-amber-100 flex items-center justify-center">
                        <Zap size={12} className="text-amber-500" />
                      </div>
                      <h3 className="text-sm font-bold text-slate-900">Smart AI Suggestions</h3>
                    </div>
                    <div className="space-y-2">
                      {selectedCustomer.suggestions.map((s: any, idx: number) => {
                        const Icon = s.icon;
                        const urgencyBadge =
                          s.urgency === "high"
                            ? "bg-rose-100 text-rose-600"
                            : s.urgency === "medium"
                              ? "bg-amber-100 text-amber-600"
                              : "bg-emerald-100 text-emerald-600";
                        return (
                          <div
                            key={idx}
                            className="flex items-center gap-3 rounded-lg p-3 border"
                            style={{ background: s.bg, borderColor: s.color + "22" }}
                          >
                            <div
                              className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                              style={{ background: s.bg }}
                            >
                              <Icon size={14} style={{ color: s.color }} />
                            </div>
                            <p className="text-xs text-slate-600 flex-1 leading-relaxed">
                              {s.message}
                            </p>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <span
                                className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${urgencyBadge}`}
                              >
                                {s.urgency}
                              </span>
                              <button
                                className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg border transition-colors"
                                style={{
                                  color: s.color,
                                  borderColor: s.color + "44",
                                  background: "white",
                                }}
                              >
                                {s.action} <ArrowRight size={10} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-2xl p-12 bg-white/50 border border-white/60 text-center text-slate-400 text-sm h-full flex items-center justify-center">
                Select a customer to view their profile, AI memory, timeline, and suggestions.
              </div>
            )}
          </div>
        </div>

        {/* ── Customer Analytics (bottom) ──────────────────────── */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center">
              <BarChart3 size={13} className="text-emerald-600" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Customer Analytics</h2>
              <p className="text-xs text-slate-500">Revenue trends and customer distribution</p>
            </div>
          </div>

          {/* Stat Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
            {[
              { label: "Total Customers", value: customers.length, icon: Users, color: "#059669", bg: "#ECFDF5" },
              {
                label: "Repeat Customers",
                value: customers.filter((c) => c.orders >= 2).length,
                icon: RefreshCw,
                color: "#6366F1",
                bg: "#EEF2FF",
              },
              { label: "VIP Customers", value: customers.filter((c) => c.badge === "VIP").length, icon: Crown, color: "#F59E0B", bg: "#FFFBEB" },
              {
                label: "Retention Rate",
                value: customers.length > 0 ? Math.round((customers.filter((c) => c.orders >= 2).length / customers.length) * 100) : 0,
                icon: Target,
                color: "#0D9488",
                bg: "#F0FDFA",
                suffix: "%",
              },
              {
                label: "Avg. Spend",
                value: customers.length > 0 ? Math.round(customers.reduce((sum, c) => sum + c.spending, 0) / customers.length / 1000) : 0,
                icon: IndianRupee,
                color: "#F43F5E",
                bg: "#FFF1F2",
                prefix: "₹",
                suffix: "k",
              },
            ].map((m) => {
              const Icon = m.icon;
              return (
                <div
                  key={m.label}
                  className="rounded-xl p-3.5 bg-white/80 border border-white/60 shadow-sm hover:shadow-md transition-all"
                  style={{ backdropFilter: "blur(12px)" }}
                >
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center mb-2"
                    style={{ background: m.bg }}
                  >
                    <Icon size={13} style={{ color: m.color }} />
                  </div>
                  <div className="text-lg font-bold text-slate-900">
                    <AnimatedCounter
                      value={m.value}
                      prefix={(m as { prefix?: string }).prefix || ""}
                      suffix={(m as { suffix?: string }).suffix || ""}
                      started={countersStarted}
                    />
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">{m.label}</div>
                </div>
              );
            })}
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div
              className="lg:col-span-2 rounded-xl p-5 bg-white/80 border border-white/60 shadow-sm"
              style={{ backdropFilter: "blur(12px)" }}
            >
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="text-sm font-bold text-slate-900">Revenue from Customers</div>
                  <div className="text-xs text-slate-400">Monthly trend, Jan–Jul 2026</div>
                </div>
                <div className="text-xs bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full font-semibold border border-emerald-100">
                  +18% MoM
                </div>
              </div>
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={spendingData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="greenGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#059669" stopOpacity={0.25} />
                      <stop offset="100%" stopColor="#059669" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 11, fill: "#9CA3AF" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "#9CA3AF" }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `₹${v / 1000}k`}
                  />
                  <Tooltip
                    contentStyle={{ borderRadius: 10, border: "1px solid #E5E7EB", fontSize: 12 }}
                    formatter={(v) => [`₹${Number(v).toLocaleString("en-IN")}`, "Revenue"]}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#059669"
                    strokeWidth={2.5}
                    fill="url(#greenGrad)"
                    dot={{ fill: "#059669", r: 3, strokeWidth: 0 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div
              className="rounded-xl p-5 bg-white/80 border border-white/60 shadow-sm"
              style={{ backdropFilter: "blur(12px)" }}
            >
              <div className="text-sm font-bold text-slate-900 mb-0.5">Customer Segments</div>
              <div className="text-xs text-slate-400 mb-3">By loyalty tier</div>
              <ResponsiveContainer width="100%" height={150}>
                <PieChart>
                  <Pie
                    data={retentionData}
                    cx="50%"
                    cy="50%"
                    innerRadius={42}
                    outerRadius={65}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {retentionData.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ borderRadius: 10, border: "1px solid #E5E7EB", fontSize: 12 }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="grid grid-cols-2 gap-1.5 mt-1">
                {retentionData.map((d: any) => (
                  <div key={d.name} className="flex items-center gap-1.5">
                    <div
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ background: d.color }}
                    />
                    <span className="text-xs text-slate-600">
                      {d.name} ({d.value})
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <div className="h-4" />
      </div>
    </AppShell>
  );
}
