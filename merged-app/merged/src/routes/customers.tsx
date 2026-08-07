import { useState, useEffect } from "react";
import { AppShell } from "@/components/app-shell";
import { useCustomers, Customer } from "@/hooks/use-customers";
import { api } from "@/lib/apiClient";
import {
  Users,
  Search,
  Filter,
  MessageCircle,
  Clock,
  Phone,
  Brain,
  Zap,
  ArrowRight,
  X,
  Eye,
  EyeOff,
  CreditCard,
  ShoppingBag,
  TrendingUp,
  BarChart3,
  Calendar,
  Sparkles,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

function maskPhone(phone: string) {
  const digits = (phone || "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.length <= 6) return `${digits.slice(0, 3)}•••${digits.slice(-2)}`;
  return `${digits.slice(0, 5)}•••${digits.slice(-2)}`;
}

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
      return "bg-gray-100 text-gray-600 border-gray-200";
  }
}

// ─── Compact Customer Card ───────────────────────────────────────────────────

function CompactCustomerCard({
  customer,
  onClick,
}: {
  customer: Customer;
  onClick: () => void;
}) {
  const [showPhone, setShowPhone] = useState(false);

  return (
    <div
      onClick={onClick}
      className="group relative rounded-2xl p-4 cursor-pointer transition-all duration-200 bg-white/80 border border-slate-200/80 hover:border-emerald-300 hover:shadow-md hover:bg-white flex flex-col justify-between"
      style={{ backdropFilter: "blur(8px)" }}
    >
      <div>
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-3">
            <div
              className="w-11 h-11 rounded-2xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0 shadow-sm"
              style={{
                background: `linear-gradient(135deg, ${customer.color}, ${customer.color}cc)`,
              }}
            >
              {customer.avatar}
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm group-hover:text-emerald-700 transition-colors">
                {customer.name}
              </h3>
              <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                <Phone size={10} /> {showPhone ? customer.phone : maskPhone(customer.phone)}
                <button type="button" onClick={(e) => { e.stopPropagation(); setShowPhone((v) => !v); }} className="ml-1 text-slate-400 hover:text-slate-600">
                  {showPhone ? <EyeOff size={10} /> : <Eye size={10} />}
                </button>
              </p>
            </div>
          </div>
          <span
            className={`text-[10px] px-2 py-0.5 rounded-full border font-bold flex-shrink-0 ${badgeStyle(
              customer.badge
            )}`}
          >
            {customer.badge}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-100 text-center">
        <div>
          <div className="text-[10px] uppercase font-semibold text-slate-400">Orders</div>
          <div className="font-bold text-slate-800 text-sm">{customer.orders}</div>
        </div>
        <div className="border-x border-slate-100">
          <div className="text-[10px] uppercase font-semibold text-slate-400">Total Spent</div>
          <div className="font-bold text-emerald-600 text-sm">
            ₹{customer.spending.toLocaleString("en-IN")}
          </div>
        </div>
        <div>
          <div className="text-[10px] uppercase font-semibold text-slate-400">Last Active</div>
          <div className="font-medium text-slate-700 text-xs truncate">
            {customer.lastPurchase.split(" ").slice(0, 2).join(" ")}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Customer Profile Modal / Drawer ──────────────────────────────────────────

function CustomerProfileDrawer({
  customer,
  onClose,
}: {
  customer: Customer;
  onClose: () => void;
}) {
  const [profile, setProfile] = useState<Customer>(customer);
  const [showPhone, setShowPhone] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "overview" | "orders" | "payments" | "timeline" | "ai_insights" | "analytics"
  >("overview");
  const [rawMemory, setRawMemory] = useState<Record<string, string> | null>(null);
  const [promoMessage, setPromoMessage] = useState<string | null>(null);
  const [promoLoading, setPromoLoading] = useState(false);

  useEffect(() => {
    let active = true;
    const fetchDetail = async () => {
      try {
        const res = await api.get<any>(`/api/customers/${customer.id}`);
        if (res.success && res.data && active) {
          const raw = res.data;
          const mem = raw.ai_memory;
          if (mem && typeof mem === "object") {
            setRawMemory(mem);
          }
          setProfile((prev) => ({
            ...prev,
            timeline: Array.isArray(raw.timeline) ? raw.timeline : prev.timeline || [],
          }));
        }
      } catch (err) {
        console.error("Error fetching detailed customer profile:", err);
      }
    };
    fetchDetail();
    return () => { active = false; };
  }, [customer.id]);

  const handleGeneratePromo = async () => {
    setPromoLoading(true);
    setPromoMessage(null);
    try {
      const res = await api.post<any>(`/api/customers/${customer.id}/generate-promo`, {});
      if (res.success && res.data?.message) {
        setPromoMessage(res.data.message);
      }
    } catch (err) {
      console.error("Promo generation failed:", err);
    } finally {
      setPromoLoading(false);
    }
  };

  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "orders", label: "Orders" },
    { id: "payments", label: "Payments" },
    { id: "timeline", label: "Timeline" },
    { id: "ai_insights", label: "AI Insights" },
    { id: "analytics", label: "Analytics" },
  ] as const;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col border-l border-slate-200 overflow-hidden">
        {/* Profile Header */}
        <div className="p-5 bg-gradient-to-r from-slate-900 to-slate-800 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/20 transition-all"
          >
            <X size={16} />
          </button>

          <div className="flex items-center gap-4">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center text-white font-bold text-lg shadow-md flex-shrink-0"
              style={{
                background: `linear-gradient(135deg, ${profile.color}, ${profile.color}bb)`,
              }}
            >
              {profile.avatar}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-white">{profile.name}</h2>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full border font-bold ${badgeStyle(
                    profile.badge
                  )}`}
                >
                  {profile.badge}
                </span>
              </div>
              <p className="text-xs text-white/70 flex items-center gap-1.5 mt-1">
                <Phone size={12} /> {showPhone ? profile.phone : maskPhone(profile.phone)}
                <button type="button" onClick={() => setShowPhone((v) => !v)} className="ml-1 text-white/70 hover:text-white">
                  {showPhone ? <EyeOff size={12} /> : <Eye size={12} />}
                </button>
              </p>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-3 gap-3 mt-6 pt-4 border-t border-white/10">
            <div>
              <div className="text-[10px] text-white/60 uppercase font-semibold">Total Orders</div>
              <div className="text-base font-bold text-white">{profile.orders}</div>
            </div>
            <div>
              <div className="text-[10px] text-white/60 uppercase font-semibold">Total Spent</div>
              <div className="text-base font-bold text-emerald-400">
                ₹{profile.spending.toLocaleString("en-IN")}
              </div>
            </div>
            <div>
              <div className="text-[10px] text-white/60 uppercase font-semibold">Last Purchase</div>
              <div className="text-xs font-semibold text-white/90 truncate">{profile.lastPurchase}</div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-4 overflow-x-auto">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`px-4 py-3 text-xs font-bold transition-all border-b-2 whitespace-nowrap ${
                activeTab === t.id
                  ? "border-emerald-600 text-emerald-700 bg-white"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* TAB 1: OVERVIEW */}
          {activeTab === "overview" && (
            <div className="space-y-5">
              <div className="rounded-2xl p-5 bg-slate-50 border border-slate-200">
                <h3 className="text-sm font-bold text-slate-900 mb-3">Customer Summary</h3>
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-slate-400 block">Phone Number</span>
                    <span className="font-semibold text-slate-800">{profile.phone}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Customer Tier</span>
                    <span className="font-semibold text-emerald-700">{profile.badge} Customer</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Lifetime Orders</span>
                    <span className="font-semibold text-slate-800">{profile.orders} orders</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Total Revenue</span>
                    <span className="font-bold text-emerald-600">
                      ₹{profile.spending.toLocaleString("en-IN")}
                    </span>
                  </div>
                </div>
              </div>

              {profile.tags && profile.tags.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-slate-700 mb-2">Customer Tags</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {profile.tags.map((tag) => (
                      <span
                        key={tag}
                        className="text-xs bg-emerald-50 border border-emerald-200 text-emerald-700 px-3 py-1 rounded-full font-medium"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {rawMemory && (
                <div className="rounded-2xl p-4 bg-indigo-50/70 border border-indigo-100">
                  <div className="flex items-center gap-2 mb-3 text-indigo-900 font-bold text-xs">
                    <Brain size={14} className="text-indigo-600" /> AI Customer Profile
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {[
                      { label: "Favourite Product", value: rawMemory.favorite_products },
                      { label: "Avg Bill", value: rawMemory.average_bill },
                      { label: "Buying Frequency", value: rawMemory.buy_frequency },
                      { label: "Preferred Payment", value: rawMemory.preferred_payment_method },
                      { label: "Special Events", value: rawMemory.special_events || rawMemory.birthdays },
                      { label: "Preferences", value: rawMemory.preferences || rawMemory.customizations },
                    ].filter(r => r.value).map(({ label, value }) => (
                      <div key={label}>
                        <span className="text-slate-400 block">{label}</span>
                        <span className="font-semibold text-slate-800">{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: ORDERS */}
          {activeTab === "orders" && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-900">Order History</h3>
              {profile.timeline && profile.timeline.filter((e) => e.amount).length > 0 ? (
                <div className="space-y-3">
                  {profile.timeline
                    .filter((e) => e.amount)
                    .map((item, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between rounded-xl p-3.5 bg-slate-50 border border-slate-200"
                      >
                        <div>
                          <div className="text-xs font-bold text-slate-900">{item.title}</div>
                          <div className="text-[11px] text-slate-500 mt-0.5">{item.date}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs font-bold text-emerald-600">{item.amount}</div>
                          <span className="text-[10px] font-semibold text-slate-400 uppercase">
                            {item.status}
                          </span>
                        </div>
                      </div>
                    ))}
                </div>
              ) : (
                <div className="text-center py-10 text-slate-400 text-xs">
                  No detailed orders recorded for this customer.
                </div>
              )}
            </div>
          )}

          {/* TAB 3: PAYMENTS */}
          {activeTab === "payments" && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-900">Payment Profile & History</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl p-4 bg-emerald-50 border border-emerald-200">
                  <div className="text-[10px] uppercase font-bold text-emerald-800">
                    Preferred Payment Method
                  </div>
                  <div className="text-sm font-bold text-emerald-900 mt-1">
                    {(profile.aiInsights as any)?.paymentBehaviour || "UPI / Cash"}
                  </div>
                </div>
                <div className="rounded-xl p-4 bg-slate-50 border border-slate-200">
                  <div className="text-[10px] uppercase font-bold text-slate-500">Total Spent</div>
                  <div className="text-sm font-bold text-slate-900 mt-1">
                    ₹{profile.spending.toLocaleString("en-IN")}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: TIMELINE */}
          {activeTab === "timeline" && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-900">Activity Timeline</h3>
              {profile.timeline && profile.timeline.length > 0 ? (
                <div className="relative pl-6 space-y-4">
                  <div className="absolute left-2 top-2 bottom-2 w-0.5 bg-slate-200" />
                  {profile.timeline.map((event, idx) => (
                    <div key={idx} className="relative pl-4">
                      <div className="absolute -left-[18px] top-1 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white" />
                      <div className="text-[11px] text-slate-400">{event.date}</div>
                      <div className="text-xs font-bold text-slate-900">{event.title}</div>
                      {event.amount && (
                        <div className="text-xs font-semibold text-emerald-600 mt-0.5">
                          {event.amount}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-10 text-slate-400 text-xs">No timeline events recorded.</div>
              )}
            </div>
          )}

          {activeTab === "ai_insights" && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Brain className="text-indigo-600" size={16} />
                  <h3 className="text-sm font-bold text-slate-900">Structured AI Customer Profile</h3>
                </div>
                <button
                  onClick={handleGeneratePromo}
                  disabled={promoLoading}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold bg-emerald-600 text-white hover:bg-emerald-700 transition-all disabled:opacity-60 whitespace-nowrap"
                >
                  <MessageCircle size={12} />
                  {promoLoading ? "Generating…" : "Generate Personalized WhatsApp"}
                </button>
              </div>

              {promoMessage && (
                <div className="rounded-2xl p-4 bg-emerald-50 border border-emerald-200">
                  <div className="text-[10px] font-bold text-emerald-800 uppercase mb-2">📱 Generated WhatsApp Message</div>
                  <p className="text-xs text-emerald-900 leading-relaxed whitespace-pre-wrap">{promoMessage}</p>
                  <button
                    onClick={() => navigator.clipboard?.writeText(promoMessage)}
                    className="mt-2 text-[11px] text-emerald-700 font-semibold hover:underline"
                  >
                    Copy to Clipboard
                  </button>
                </div>
              )}

              {rawMemory ? (
                <div className="grid grid-cols-1 gap-2.5">
                  {[
                    { icon: "⭐", label: "Favourite Product", key: "favorite_products" },
                    { icon: "💰", label: "Average Bill", key: "average_bill" },
                    { icon: "📅", label: "Buying Frequency", key: "buy_frequency" },
                    { icon: "💳", label: "Preferred Payment", key: "preferred_payment_method" },
                    { icon: "🕐", label: "Preferred Time", key: "preferred_time" },
                    { icon: "📊", label: "Lifetime Spend", key: "lifetime_spend" },
                    { icon: "⚠️", label: "Outstanding", value: (() => { const b = profile.currentBalance ?? 0; return b < 0 ? `₹${Math.abs(b).toLocaleString("en-IN")} due` : b > 0 ? `₹${b.toLocaleString("en-IN")} advance` : "Clear"; })() },
                    { icon: "🎉", label: "Special Events", key: "special_events" },
                    { icon: "✨", label: "Preferences", key: "preferences" },
                    { icon: "💬", label: "Credit Behaviour", key: "credit_behaviour" },
                    { icon: "🔁", label: "Repeat Score", key: "repeat_score" },
                    { icon: "🔮", label: "Next Purchase Prediction", key: "predicted_next_purchase" },
                    { icon: "💡", label: "AI Recommendation", key: "ai_suggestions" },
                  ].map(({ icon, label, key, value: staticVal }) => {
                    const val = staticVal ?? (key ? rawMemory[key] : null);
                    if (!val) return null;
                    return (
                      <div
                        key={label}
                        className="flex items-start gap-3 rounded-xl p-3 bg-slate-50 border border-slate-200 hover:border-indigo-200 transition-colors"
                      >
                        <span className="text-base flex-shrink-0">{icon}</span>
                        <div>
                          <div className="text-[10px] font-bold text-slate-400 uppercase">{label}</div>
                          <p className="text-xs font-semibold text-slate-900 leading-snug mt-0.5">{val}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-10 text-slate-400 text-xs">
                  <Brain size={28} className="mx-auto mb-2 text-slate-300" />
                  AI memory is being compiled for this customer.
                </div>
              )}
            </div>
          )}

          {/* TAB 6: ANALYTICS */}
          {activeTab === "analytics" && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-900">Customer Spend Analytics</h3>
              <div className="rounded-2xl p-4 bg-slate-50 border border-slate-200">
                <div className="text-xs font-bold text-slate-700 mb-3">Lifetime Spend Summary</div>
                <div className="h-44 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={[
                        { month: "Jan", spend: profile.spending * 0.15 },
                        { month: "Feb", spend: profile.spending * 0.35 },
                        { month: "Mar", spend: profile.spending * 0.65 },
                        { month: "Current", spend: profile.spending },
                      ]}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `₹${v}`} />
                      <Tooltip formatter={(v) => [`₹${Number(v).toFixed(0)}`, "Spend"]} />
                      <Area
                        type="monotone"
                        dataKey="spend"
                        stroke="#059669"
                        fill="#10b98122"
                        strokeWidth={2}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Customer Listing Page ───────────────────────────────────────────────

export default function CustomersPage() {
  const { customers, loading } = useCustomers();
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterBadge, setFilterBadge] = useState("All");

  const filtered = customers.filter((c) => {
    const matchSearch =
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) || c.phone.includes(searchQuery);
    const matchBadge = filterBadge === "All" || c.badge === filterBadge;
    return matchSearch && matchBadge;
  });

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Clean Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              Customer Directory
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Manage shop customers, view detailed profiles, timeline, and AI insights.
            </p>
          </div>

          {/* Search & Filter */}
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <Search
                size={14}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs bg-white border border-slate-200 rounded-xl outline-none focus:border-emerald-500 shadow-sm transition-all"
                placeholder="Search by customer name or phone…"
              />
            </div>

            <div className="relative">
              <select
                value={filterBadge}
                onChange={(e) => setFilterBadge(e.target.value)}
                className="appearance-none bg-white border border-slate-200 rounded-xl px-3.5 py-2 pr-8 text-xs font-semibold text-slate-700 outline-none focus:border-emerald-500 shadow-sm cursor-pointer"
              >
                {["All", "VIP", "Loyal", "Growing", "New"].map((b) => (
                  <option key={b}>{b}</option>
                ))}
              </select>
              <Filter
                size={12}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              />
            </div>
          </div>
        </div>

        {/* Customer Cards Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-20 text-sm text-slate-400">
            Loading customer profiles…
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl p-12 bg-white/60 border border-slate-200 text-center text-slate-400 text-sm">
            No customers match your search criteria.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((customer) => (
              <CompactCustomerCard
                key={customer.id}
                customer={customer}
                onClick={() => setSelectedCustomer(customer)}
              />
            ))}
          </div>
        )}

        {/* Customer Profile Dedicated Drawer */}
        {selectedCustomer && (
          <CustomerProfileDrawer
            customer={selectedCustomer}
            onClose={() => setSelectedCustomer(null)}
          />
        )}
      </div>
    </AppShell>
  );
}
