import { Link } from "react-router-dom";
import { AppShell } from "@/components/app-shell";
import { usePremium, SubscriptionPlan, UserSubscription } from "@/hooks/use-premium";
import { useState } from "react";
import {
  Check,
  Mic,
  TrendingUp,
  Network,
  Package,
  FileText,
  Bot,
  BarChart3,
  Star,
  Zap,
  Rocket,
  ArrowRight,
  Crown,
  IndianRupee,
  Shield,
  Clock,
  Lightbulb,
  ChevronRight,
  PieChart,
  Boxes,
  DownloadCloud,
  BadgeDollarSign,
  Sparkles,
  Settings,
} from "lucide-react";

/* ─── helpers ─────────────────────────────────────────────────── */
function cn(...classes: (string | false | undefined | null)[]) {
  return classes.filter(Boolean).join(" ");
}

/* ─── constants ────────────────────────────────────────────────── */
const METRICS = [
  {
    icon: Clock,
    value: "50%",
    label: "Time Saved",
    sub: "vs manual workflows",
    col: "#059669",
    bg: "rgba(5,150,105,0.10)",
  },
  {
    icon: Bot,
    value: "24 / 7",
    label: "AI Assistance",
    sub: "Always on, never tired",
    col: "#6366F1",
    bg: "rgba(99,102,241,0.10)",
  },
  {
    icon: TrendingUp,
    value: "3×",
    label: "Faster Growth",
    sub: "For active premium users",
    col: "#0D9488",
    bg: "rgba(13,148,136,0.10)",
  },
  {
    icon: Lightbulb,
    value: "Smart",
    label: "Funding Matches",
    sub: "Personalized to you",
    col: "#F59E0B",
    bg: "rgba(245,158,11,0.10)",
  },
];

const FREE_FEATS = [
  { text: "Unlimited WhatsApp Message Automation", badge: "WhatsApp", badgeCol: "#25D366" },
  { text: "Dashboard & Revenue Analytics" },
  { text: "Customer Management" },
  { text: "AI Insights & Recommendations", badge: "AI", badgeCol: "#6366F1" },
  { text: "Limited Voice Note Processing", dim: true },
  { text: "Basic Business Reports", dim: true },
];

const PREMIUM_FEATS = [
  { text: "Unlimited Voice Intelligence", icon: Mic },
  { text: "Micro Funding Hub", icon: IndianRupee },
  { text: "Business Network", icon: Network },
  { text: "Smart Inventory Management", icon: Package },
  { text: "Advanced Business Reports", icon: FileText },
];

const FEATURES = [
  {
    id: "voice",
    icon: Mic,
    emoji: "🎙️",
    title: "Unlimited Voice Intelligence",
    tagline: "Speak it. AI captures it.",
    accent: "#059669",
    grad: "linear-gradient(135deg,#059669,#0D9488)",
    softBg: "rgba(5,150,105,0.06)",
    border: "rgba(5,150,105,0.18)",
    bullets: [
      "Hindi, English & Hinglish voice notes — unlimited",
      "Auto-extract customers, products, payments & orders",
      "Zero manual entry — record and it's done",
    ],
    stats: [
      { label: "Languages", val: "3" },
      { label: "Accuracy", val: "98%" },
      { label: "Entry time", val: "0 min" },
    ],
  },
  {
    id: "funding",
    icon: BadgeDollarSign,
    emoji: "💰",
    title: "Micro Funding Hub",
    tagline: "Money that fits your business.",
    accent: "#F59E0B",
    grad: "linear-gradient(135deg,#F59E0B,#F97316)",
    softBg: "rgba(245,158,11,0.06)",
    border: "rgba(245,158,11,0.18)",
    bullets: [
      "Government schemes, MSME & women entrepreneur grants",
      "Startup loans, bank opportunities & subsidy alerts",
      "Matched to your business type, revenue & growth stage",
    ],
    stats: [
      { label: "Schemes", val: "200+" },
      { label: "Banks", val: "40+" },
      { label: "Avg. match", val: "12 / mo" },
    ],
  },
  {
    id: "network",
    icon: Network,
    emoji: "🤝",
    title: "Business Network",
    tagline: "The right partner, at the right time.",
    accent: "#6366F1",
    grad: "linear-gradient(135deg,#6366F1,#8B5CF6)",
    softBg: "rgba(99,102,241,0.06)",
    border: "rgba(99,102,241,0.18)",
    bullets: [
      "AI-matched suppliers, retailers & transport providers",
      "Packaging, wholesalers & local service providers",
      "Smart connections based on your actual requirements",
    ],
    stats: [
      { label: "Businesses", val: "5 000+" },
      { label: "Categories", val: "30+" },
      { label: "Avg. match", val: "3 days" },
    ],
  },
  {
    id: "inventory",
    icon: Boxes,
    emoji: "📦",
    title: "Smart Inventory Management",
    tagline: "Stock yourself before you wreck yourself.",
    accent: "#0D9488",
    grad: "linear-gradient(135deg,#0D9488,#0891B2)",
    softBg: "rgba(13,148,136,0.06)",
    border: "rgba(13,148,136,0.18)",
    bullets: [
      "Automatic stock deduction on every order",
      "Low-stock alerts & restocking reminders",
      "Real-time product availability across your catalogue",
    ],
    stats: [
      { label: "Products", val: "∞" },
      { label: "Alert lag", val: "< 1 s" },
      { label: "Manual work", val: "0" },
    ],
  },
  {
    id: "reports",
    icon: PieChart,
    emoji: "📊",
    title: "Advanced Business Reports",
    tagline: "Data you can actually act on.",
    accent: "#F43F5E",
    grad: "linear-gradient(135deg,#F43F5E,#EC4899)",
    softBg: "rgba(244,63,94,0.06)",
    border: "rgba(244,63,94,0.18)",
    bullets: [
      "Export as PDF or Excel — scheduled weekly or monthly",
      "AI-powered sales forecasting & demand predictions",
      "Advanced trend analysis with visual breakdowns",
    ],
    stats: [
      { label: "Formats", val: "PDF + XLS" },
      { label: "Forecast", val: "AI" },
      { label: "Schedule", val: "Auto" },
    ],
  },
];

const WHY = [
  {
    icon: Clock,
    title: "Save Valuable Time",
    desc: "Automate repetitive tasks and reclaim hours every single day.",
    col: "#059669",
  },
  {
    icon: IndianRupee,
    title: "Discover Funding",
    desc: "Get matched to government grants and MSME schemes you qualify for.",
    col: "#F59E0B",
  },
  {
    icon: Network,
    title: "Build Connections",
    desc: "Partner with suppliers, retailers and service providers that fit your business.",
    col: "#6366F1",
  },
  {
    icon: Package,
    title: "Automate Inventory",
    desc: "Track stock automatically and never miss a restock reminder.",
    col: "#0D9488",
  },
  {
    icon: BarChart3,
    title: "Predict Future Trends",
    desc: "AI forecasting tells you what to stock and when to scale.",
    col: "#F43F5E",
  },
  {
    icon: Rocket,
    title: "Scale Your Business Faster",
    desc: "Focus on growth while AI handles operations end to end.",
    col: "#8B5CF6",
  },
];

function HeroSection() {
  return (
    <section
      className="relative rounded-2xl overflow-hidden mb-7"
      style={{ background: "linear-gradient(135deg,#071A10 0%,#0A2218 45%,#0E0E2E 100%)" }}
    >
      {/* animated mesh blobs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute -top-24 -left-16 w-[420px] h-[420px] rounded-full opacity-25 animate-pulse"
          style={{
            background: "radial-gradient(circle,#059669 0%,transparent 65%)",
            animationDuration: "4s",
          }}
        />
        <div
          className="absolute top-8 right-0 w-[320px] h-[320px] rounded-full opacity-20"
          style={{ background: "radial-gradient(circle,#6366F1 0%,transparent 65%)" }}
        />
        <div
          className="absolute -bottom-20 left-1/2 -translate-x-1/2 w-[280px] h-[280px] rounded-full opacity-15 animate-pulse"
          style={{
            background: "radial-gradient(circle,#0D9488 0%,transparent 65%)",
            animationDuration: "6s",
          }}
        />
      </div>

      {/* subtle dot grid */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.04]"
        style={{
          backgroundImage: "radial-gradient(circle,#fff 1px,transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      />

      <div className="relative z-10 px-7 pt-9 pb-8 lg:px-10 lg:pt-11">
        {/* top row */}
        <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/8 px-3.5 py-1.5 mb-5 backdrop-blur-sm">
              <Crown size={11} className="text-amber-400" />
              <span className="text-[11px] font-bold tracking-widest uppercase text-amber-300">
                Premium Plan
              </span>
            </div>
            <h1 className="text-[2rem] lg:text-[2.4rem] font-extrabold text-white leading-[1.15] mb-3 max-w-xl">
              Unlock the{" "}
              <span
                className="bg-clip-text text-transparent"
                style={{ backgroundImage: "linear-gradient(90deg,#34D399,#2DD4BF)" }}
              >
                AI Growth Suite
              </span>
            </h1>
            <p className="text-slate-300 text-[14px] leading-relaxed max-w-lg">
              Grow smarter and scale faster with AI-powered tools designed to automate operations,
              discover opportunities, and accelerate business growth.
            </p>
          </div>

          {/* price callout */}
          <div className="shrink-0 bg-white/8 backdrop-blur-sm border border-white/12 rounded-2xl px-5 py-4 text-center hidden md:block">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
              Starting at
            </p>
            <p className="text-3xl font-extrabold text-white">₹99</p>
            <p className="text-[12px] text-slate-400">per month</p>
          </div>
        </div>

        {/* metric cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
          {METRICS.map(({ icon: Icon, value, label, sub, col, bg }) => (
            <div
              key={label}
              className="group relative rounded-xl p-4 border border-white/10 bg-white/6 backdrop-blur-sm hover:bg-white/10 hover:border-white/20 hover:-translate-y-0.5 transition-all duration-300 cursor-default overflow-hidden"
            >
              <div
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                style={{
                  background: `radial-gradient(circle at 30% 50%,${col}18,transparent 70%)`,
                }}
              />
              <div className="relative">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center mb-3"
                  style={{ backgroundColor: bg }}
                >
                  <Icon size={15} style={{ color: col }} />
                </div>
                <p className="text-xl font-extrabold text-white leading-none mb-1">{value}</p>
                <p className="text-[12px] font-semibold text-slate-300 mb-0.5">{label}</p>
                <p className="text-[10px] text-slate-500">{sub}</p>
              </div>
            </div>
          ))}
        </div>

        {/* CTAs */}
        <div className="flex flex-wrap gap-3">
          <a
            href="#pricing"
            className="flex items-center gap-2 px-6 py-3 rounded-xl text-[13px] font-bold text-white transition-all duration-200 hover:scale-105 hover:brightness-110 active:scale-95"
            style={{
              background: "linear-gradient(135deg,#059669,#0D9488)",
              boxShadow: "0 6px 24px rgba(5,150,105,0.40)",
            }}
          >
            <Sparkles size={14} />
            Upgrade to Premium
            <ArrowRight size={13} />
          </a>
          <Link
            to="/dashboard/settings?tab=billing"
            className="flex items-center gap-2 px-6 py-3 rounded-xl text-[13px] font-medium text-slate-300 border border-white/18 bg-white/6 hover:bg-white/12 hover:text-white transition-all duration-200"
          >
            Continue with Free Plan
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ── helpers ── */
function getPlanFeatures(plan: SubscriptionPlan): string[] {
  const feats: string[] = [];
  feats.push(
    plan.max_orders === 0
      ? "Unlimited orders per month"
      : `Up to ${plan.max_orders} orders per month`,
  );
  feats.push(
    plan.max_ai_requests === 0
      ? "Unlimited AI assistant messages"
      : `Up to ${plan.max_ai_requests} AI messages per month`,
  );
  feats.push(
    plan.max_voice_notes === 0
      ? "Unlimited voice note processing"
      : `Up to ${plan.max_voice_notes} voice notes per month`,
  );
  if (plan.analytics_enabled) feats.push("Advanced analytics & business reports");
  if (plan.inventory_predictions) feats.push("Smart inventory & demand forecasting");
  if (plan.custom_branding) feats.push("Custom branding & priority support");
  return feats;
}

interface PricingSectionProps {
  plans: SubscriptionPlan[];
  subscription: UserSubscription | null;
  onUpgrade: (planId: string) => Promise<boolean>;
  loading: boolean;
}

function PricingSection({ plans, subscription, onUpgrade, loading }: PricingSectionProps) {
  const [upgrading, setUpgrading] = useState<string | null>(null);
  const activePlanName = subscription?.subscription_plans?.name ?? "Free";

  async function handleUpgrade(planId: string) {
    setUpgrading(planId);
    await onUpgrade(planId);
    setUpgrading(null);
  }

  const freePlan = plans.find((p) => p.monthly_price === 0);
  const paidPlans = plans.filter((p) => p.monthly_price > 0);

  return (
    <section id="pricing" className="mb-7">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Choose your plan</h2>
          <p className="text-[13px] text-slate-500 mt-0.5">
            No lock-ins. Cancel or switch anytime.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 max-w-3xl">
        {/* Free plan card */}
        {(loading ? [
          { id: "free-skeleton", name: "Free", monthly_price: 0, description: "Basic access", yearly_price: 0, max_orders: 50, max_customers: 50, max_ai_requests: 20, max_voice_notes: 10, analytics_enabled: false, priority_support: false, inventory_predictions: false, custom_branding: false }
        ] : freePlan ? [freePlan] : []).map((plan) => (
          <div key={plan.id} className="bg-white border border-slate-200 rounded-2xl p-6 hover:border-slate-300 hover:shadow-sm transition-all duration-300">
            <div className="flex items-start justify-between mb-5">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
                  {plan.name} Plan
                </span>
                <div className="flex items-end gap-1.5 mt-2">
                  <span className="text-3xl font-extrabold text-slate-800">₹{plan.monthly_price}</span>
                  <span className="text-slate-400 text-[13px] mb-1">/ forever</span>
                </div>
                <p className="text-[12px] text-slate-400 mt-1">{plan.description}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
                <Boxes size={18} className="text-slate-400" />
              </div>
            </div>
            <ul className="space-y-2.5 mb-6">
              {FREE_FEATS.map(({ text, badge, badgeCol, dim }) => (
                <li key={text} className="flex items-start gap-2.5">
                  <div
                    className="w-[18px] h-[18px] rounded-full flex items-center justify-center shrink-0 mt-px"
                    style={{ backgroundColor: dim ? "rgba(100,116,139,0.12)" : "rgba(5,150,105,0.12)" }}
                  >
                    <Check size={10} style={{ color: dim ? "#94A3B8" : "#059669" }} />
                  </div>
                  <span className={cn("text-[13px] leading-snug", dim ? "text-slate-400" : "text-slate-600")}>
                    {text}
                    {badge && (
                      <span className="ml-1.5 inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-semibold" style={{ backgroundColor: badgeCol + "18", color: badgeCol }}>
                        {badge}
                      </span>
                    )}
                    {dim && (
                      <span className="ml-1.5 inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-amber-50 text-amber-500">Limited</span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
            <button className="w-full py-2.5 rounded-xl text-[13px] font-semibold text-slate-400 bg-slate-100 cursor-default">
              {activePlanName === plan.name || activePlanName === "Free" ? "✓ Current Plan" : "Select Free"}
            </button>
          </div>
        ))}

        {/* Paid plan cards rendered dynamically from DB */}
        {(loading ? [] : paidPlans).map((plan, idx) => {
          const isActive = activePlanName === plan.name;
          const isUpgrading = upgrading === plan.id;
          const isPopular = idx === 0; // first paid plan = most popular
          return (
            <div
              key={plan.id}
              className="relative rounded-2xl p-6 overflow-hidden border transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl"
              style={{
                background: "linear-gradient(145deg,#061910 0%,#0B2B1C 55%,#12103A 100%)",
                borderColor: isActive ? "rgba(52,211,153,0.55)" : "rgba(52,211,153,0.30)",
                boxShadow: isActive
                  ? "0 0 0 2px rgba(52,211,153,0.40), 0 12px 48px rgba(5,150,105,0.30)"
                  : "0 0 0 1px rgba(52,211,153,0.12), 0 12px 48px rgba(5,150,105,0.20)",
              }}
            >
              {/* inner glow */}
              <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl">
                <div className="absolute -top-16 -right-12 w-56 h-56 rounded-full opacity-30" style={{ background: "radial-gradient(circle,#059669,transparent 70%)" }} />
                <div className="absolute -bottom-12 -left-8 w-40 h-40 rounded-full opacity-20" style={{ background: "radial-gradient(circle,#6366F1,transparent 70%)" }} />
              </div>

              {isPopular && !isActive && (
                <div className="absolute top-4 right-4 flex items-center gap-1 rounded-full px-2.5 py-1 border border-amber-400/30" style={{ background: "rgba(245,158,11,0.15)" }}>
                  <Star size={9} fill="#FCD34D" className="text-amber-300" />
                  <span className="text-[10px] font-bold tracking-widest uppercase text-amber-300">Most Popular</span>
                </div>
              )}
              {isActive && (
                <div className="absolute top-4 right-4 flex items-center gap-1 rounded-full px-2.5 py-1 border border-emerald-400/40" style={{ background: "rgba(5,150,105,0.20)" }}>
                  <Check size={9} className="text-emerald-300" />
                  <span className="text-[10px] font-bold tracking-widest uppercase text-emerald-300">Active</span>
                </div>
              )}

              <div className="relative flex items-start justify-between mb-5">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-widest text-emerald-400">{plan.name} Plan</span>
                  <div className="flex items-end gap-1.5 mt-2">
                    <span className="text-3xl font-extrabold text-white">₹{plan.monthly_price}</span>
                    <span className="text-slate-400 text-[13px] mb-1">/ month</span>
                  </div>
                  <p className="text-[12px] text-slate-400 mt-1">{plan.description}</p>
                </div>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: "linear-gradient(135deg,#059669,#0D9488)" }}>
                  <Crown size={18} className="text-white" />
                </div>
              </div>

              <ul className="relative space-y-2.5 mb-6">
                {getPlanFeatures(plan).map((feat) => (
                  <li key={feat} className="flex items-center gap-2.5">
                    <div className="w-[18px] h-[18px] rounded-full flex items-center justify-center shrink-0" style={{ background: "rgba(52,211,153,0.20)" }}>
                      <Check size={10} className="text-emerald-400" />
                    </div>
                    <span className="text-[13px] text-slate-200">{feat}</span>
                  </li>
                ))}
              </ul>

              <button
                disabled={isActive || isUpgrading}
                onClick={() => handleUpgrade(plan.id)}
                className="relative w-full py-3 rounded-xl text-[13px] font-bold text-white flex items-center justify-center gap-2 transition-all duration-200 hover:brightness-110 active:scale-[0.98] disabled:opacity-60 disabled:cursor-default"
                style={{ background: isActive ? "rgba(5,150,105,0.4)" : "linear-gradient(135deg,#059669,#0D9488)", boxShadow: isActive ? "none" : "0 4px 20px rgba(5,150,105,0.45)" }}
              >
                {isActive ? (
                  <><Check size={13} /> Current Plan</>
                ) : isUpgrading ? (
                  <span className="animate-pulse">Upgrading…</span>
                ) : (
                  <><Sparkles size={13} /> Upgrade to {plan.name} — ₹{plan.monthly_price}/mo</>
                )}
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function FeatureRow({ feat, idx }: { feat: (typeof FEATURES)[0]; idx: number }) {
  const { icon: Icon, emoji, title, tagline, accent, grad, softBg, border, bullets, stats } = feat;
  const flip = idx % 2 !== 0;

  return (
    <div
      className={cn(
        "flex flex-col gap-5 p-5 rounded-2xl border transition-all duration-300 hover:shadow-md group",
        flip ? "lg:flex-row-reverse" : "lg:flex-row",
      )}
      style={{ background: softBg, borderColor: border }}
    >
      {/* visual panel */}
      <div
        className="lg:w-64 shrink-0 rounded-xl overflow-hidden flex flex-col items-center justify-center py-8 px-6 gap-5"
        style={{ background: "rgba(255,255,255,0.7)", border: `1px solid ${border}` }}
      >
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300"
          style={{ background: grad }}
        >
          <Icon size={26} className="text-white" />
        </div>
        <p className="text-[13px] font-bold text-center" style={{ color: accent }}>
          {tagline}
        </p>

        {/* mini stats */}
        <div className="grid grid-cols-3 gap-2 w-full mt-1">
          {stats.map(({ label, val }) => (
            <div key={label} className="text-center">
              <p className="text-[13px] font-extrabold" style={{ color: accent }}>
                {val}
              </p>
              <p className="text-[10px] text-slate-500 mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* content */}
      <div className="flex-1 flex flex-col justify-center gap-3 py-1">
        <div className="flex items-center gap-2.5">
          <span className="text-xl">{emoji}</span>
          <h3 className="text-[17px] font-bold text-slate-800">{title}</h3>
        </div>
        <ul className="space-y-2.5">
          {bullets.map((b) => (
            <li key={b} className="flex items-start gap-2.5">
              <div
                className="w-[18px] h-[18px] rounded-full flex items-center justify-center shrink-0 mt-px"
                style={{ backgroundColor: accent + "18" }}
              >
                <Check size={10} style={{ color: accent }} />
              </div>
              <span className="text-[13px] text-slate-600 leading-snug">{b}</span>
            </li>
          ))}
        </ul>
        <div className="mt-2">
          <span
            className="inline-flex items-center gap-1.5 text-[12px] font-semibold px-3 py-1.5 rounded-lg"
            style={{ background: accent + "14", color: accent }}
          >
            <Sparkles size={11} />
            Premium Feature
          </span>
        </div>
      </div>
    </div>
  );
}

function WhyUpgradeSection() {
  return (
    <section className="mb-7">
      <div className="mb-5">
        <h2 className="text-xl font-bold text-slate-800">Why Upgrade?</h2>
        <p className="text-[13px] text-slate-500 mt-0.5">
          AI handles operations. You focus on what matters.
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {WHY.map(({ icon: Icon, title, desc, col }) => (
          <div
            key={title}
            className="bg-white border border-slate-100 rounded-2xl p-5 hover:border-slate-200 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 cursor-default group"
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300"
              style={{ backgroundColor: col + "14" }}
            >
              <Icon size={18} style={{ color: col }} />
            </div>
            <p className="text-[14px] font-bold text-slate-800 mb-1.5">{title}</p>
            <p className="text-[12px] text-slate-500 leading-relaxed">{desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function FinalCTA({ onUpgrade, firstPaidPlan }: { onUpgrade: (planId: string) => Promise<boolean>; firstPaidPlan?: SubscriptionPlan }) {
  return (
    <section
      className="relative rounded-2xl overflow-hidden"
      style={{ background: "linear-gradient(135deg,#071A10 0%,#0A2218 50%,#0E0E2E 100%)" }}
    >
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute -top-20 -left-10 w-72 h-72 rounded-full opacity-25 animate-pulse"
          style={{
            background: "radial-gradient(circle,#059669,transparent 65%)",
            animationDuration: "5s",
          }}
        />
        <div
          className="absolute -bottom-16 right-0 w-60 h-60 rounded-full opacity-20"
          style={{ background: "radial-gradient(circle,#6366F1,transparent 65%)" }}
        />
        <div
          className="absolute top-1/2 -translate-y-1/2 left-1/2 -translate-x-1/2 w-80 h-80 rounded-full opacity-10"
          style={{ background: "radial-gradient(circle,#F59E0B,transparent 65%)" }}
        />
      </div>

      {/* decorative icons */}
      <div className="absolute right-10 top-8 opacity-[0.07] pointer-events-none">
        <BarChart3 size={72} className="text-emerald-300" />
      </div>
      <div className="absolute right-32 bottom-6 opacity-[0.06] pointer-events-none">
        <Bot size={52} className="text-indigo-300" />
      </div>
      <div className="absolute left-1/2 top-6 opacity-[0.05] pointer-events-none">
        <TrendingUp size={44} className="text-teal-300" />
      </div>

      <div className="relative z-10 px-7 py-12 lg:px-12 text-center max-w-2xl mx-auto">
        <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/25 bg-amber-400/10 px-3.5 py-1.5 mb-6">
          <Zap size={11} className="text-amber-400" />
          <span className="text-[11px] font-bold tracking-widest uppercase text-amber-300">
            Start Growing Today
          </span>
        </div>

        <h2 className="text-[2rem] font-extrabold text-white mb-3 leading-tight">
          Grow Smarter.{" "}
          <span
            className="bg-clip-text text-transparent"
            style={{ backgroundImage: "linear-gradient(90deg,#34D399,#2DD4BF)" }}
          >
            Scale Faster.
          </span>
        </h2>
        <p className="text-slate-300 text-[14px] mb-7 leading-relaxed">
          Let AI handle the operations while you focus on growing your business.
        </p>

        {/* feature pills */}
        <div className="flex flex-wrap justify-center gap-2 mb-8">
          {["🎙️ Voice AI", "💰 Funding Hub", "🤝 Network", "📦 Inventory", "📊 Reports"].map(
            (f) => (
              <span
                key={f}
                className="text-[12px] font-medium text-slate-300 border border-white/12 bg-white/8 rounded-full px-3 py-1"
              >
                {f}
              </span>
            ),
          )}
        </div>

        <div className="flex flex-wrap gap-3 justify-center mb-8">
          <button
            onClick={() => firstPaidPlan && onUpgrade(firstPaidPlan.id)}
            disabled={!firstPaidPlan}
            className="flex items-center gap-2 px-7 py-3 rounded-xl text-[13px] font-bold text-white transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-50"
            style={{
              background: "linear-gradient(135deg,#059669,#0D9488)",
              boxShadow: "0 6px 28px rgba(5,150,105,0.45)",
            }}
          >
            <Crown size={14} />
            Upgrade Now{firstPaidPlan ? ` — ₹${firstPaidPlan.monthly_price}/mo` : ""}
            <ArrowRight size={13} />
          </button>
          <Link
            to="/dashboard/settings?tab=billing"
            className="flex items-center gap-2 px-7 py-3 rounded-xl text-[13px] font-medium text-slate-300 border border-white/15 bg-white/6 hover:bg-white/12 hover:text-white transition-all duration-200"
          >
            Continue with Free Plan
          </Link>
        </div>

        <div className="flex items-center justify-center gap-6 text-[11px] text-slate-500">
          <span className="flex items-center gap-1.5">
            <Shield size={11} /> Secure Payment
          </span>
          <span className="flex items-center gap-1.5">
            <Check size={11} /> Cancel Anytime
          </span>
          <span className="flex items-center gap-1.5">
            <Zap size={11} /> Instant Access
          </span>
          <span className="flex items-center gap-1.5">
            <DownloadCloud size={11} /> Data Yours
          </span>
        </div>
      </div>
    </section>
  );
}

/* ─── root ─────────────────────────────────────────────────────── */

export default function PremiumPage() {
  const { plans, subscription, loading, upgrade } = usePremium();
  const firstPaidPlan = plans.find((p) => p.monthly_price > 0);

  return (
    <AppShell>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-[12px] text-slate-400 mb-5">
        <Link
          to="/dashboard/settings"
          className="hover:text-emerald-600 flex items-center gap-1 transition-colors"
        >
          <Settings size={12} />
          Settings
        </Link>
        <ChevronRight size={12} />
        <Link
          to="/dashboard/settings?tab=billing"
          className="hover:text-emerald-600 transition-colors"
        >
          Billing &amp; Plans
        </Link>
        <ChevronRight size={12} />
        <span className="text-emerald-600 font-semibold">Premium Plans</span>
      </div>

      {/* main scroll area */}
      <div className="max-w-[900px] mx-auto space-y-0">
        <HeroSection />
        <PricingSection
          plans={plans}
          subscription={subscription}
          onUpgrade={upgrade}
          loading={loading}
        />

        {/* premium features */}
        <section className="mb-7">
          <div className="mb-5">
            <h2 className="text-xl font-bold text-slate-800">Premium Features, in Depth</h2>
            <p className="text-[13px] text-slate-500 mt-0.5">
              Built specifically for Indian small businesses and women entrepreneurs.
            </p>
          </div>
          <div className="space-y-4">
            {FEATURES.map((f, i) => (
              <FeatureRow key={f.id} feat={f} idx={i} />
            ))}
          </div>
        </section>

        <WhyUpgradeSection />
        <FinalCTA onUpgrade={upgrade} firstPaidPlan={firstPaidPlan} />

        <div className="h-10" />
      </div>
    </AppShell>
  );
}
