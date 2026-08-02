import { AppShell } from "@/components/app-shell";
import {
  QrCode,
  TrendingUp,
  ShieldCheck,
  Landmark,
  Send,
  Award,
  BadgeCheck,
  ArrowUpRight,
} from "lucide-react";

const CHART = [
  22, 28, 25, 34, 30, 42, 38, 48, 44, 55, 52, 60, 58, 65, 62, 70, 68, 75, 72, 82, 78, 85, 80, 88,
  84, 92, 90, 96, 94, 100,
];

const SCHEME_STYLES: Record<string, { tagBg: string; text: string; gradient: string }> = {
  emerald: {
    tagBg: "bg-emerald-100",
    text: "text-emerald-700",
    gradient: "from-emerald-400 to-emerald-600",
  },
  rose: { tagBg: "bg-rose-100", text: "text-rose-700", gradient: "from-rose-400 to-rose-600" },
  amber: { tagBg: "bg-amber-100", text: "text-amber-700", gradient: "from-amber-400 to-amber-600" },
  indigo: {
    tagBg: "bg-indigo-100",
    text: "text-indigo-700",
    gradient: "from-indigo-400 to-indigo-600",
  },
};

const SCHEMES = [
  {
    name: "PM Mudra Yojana (Kishor)",
    max: "₹5,00,000",
    rate: "8.5% p.a.",
    eligibility: 92,
    tag: "Best Match",
    tint: "emerald",
  },
  {
    name: "SIDBI Mahila Samriddhi",
    max: "₹1,00,000",
    rate: "7.0% p.a.",
    eligibility: 88,
    tag: "Women-Owned",
    tint: "rose",
  },
  {
    name: "PM SVANidhi (Street Vendor)",
    max: "₹50,000",
    rate: "7.5% p.a.",
    eligibility: 79,
    tag: "Working Capital",
    tint: "amber",
  },
  {
    name: "Stand-Up India",
    max: "₹10,00,000",
    rate: "8.85% p.a.",
    eligibility: 71,
    tag: "Growth",
    tint: "indigo",
  },
];

const PEERS = [
  {
    name: "Kavita R.",
    biz: "Kavita's Pickles · Ajmer",
    tag: "Supplier · Chilli Powder",
    score: 82,
    avatar: "🥭",
  },
  {
    name: "Rashmi V.",
    biz: "Handloom by Rashmi · Jaipur",
    tag: "Mentor · Boutique Scaling",
    score: 91,
    avatar: "🧵",
  },
  {
    name: "Fatima S.",
    biz: "Fatima's Kitchen · Udaipur",
    tag: "Peer · Home Catering",
    score: 76,
    avatar: "🍛",
  },
];

export default function FundingPage() {
  return (
    <AppShell>
      <div className="mb-6">
        <span className="rounded-full bg-indigo-100 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-indigo-700">
          PS22 · Financial Empowerment
        </span>
        <h1 className="mt-3 text-3xl font-extrabold text-slate-900 sm:text-4xl">
          Micro-Funding &amp; Financial Empowerment Hub
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Your verified financial identity — ready to unlock capital, schemes, and community.
        </p>
      </div>

      {/* Credit Passport */}
      <section className="glass-card mb-12 rounded-3xl p-8 sm:p-10">
        <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-emerald-600" />
              <h2 className="text-lg font-extrabold text-slate-900">Interactive Credit Passport</h2>
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                VERIFIED
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              30-day verified sales · repayment reliability · profit margin
            </p>

            {/* Chart */}
            <div className="mt-5 rounded-2xl bg-gradient-to-br from-slate-900 to-emerald-950 p-5 text-white">
              <div className="flex items-end justify-between">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-emerald-300">
                    30-Day Revenue
                  </div>
                  <div className="mt-1 text-3xl font-black">₹42,500</div>
                  <div className="text-xs text-emerald-300">▲ 18% vs previous 30 days</div>
                </div>
                <div className="rounded-full bg-emerald-500/20 px-3 py-1 text-[10px] font-bold text-emerald-300">
                  Score 88/100
                </div>
              </div>
              <svg viewBox="0 0 300 90" className="mt-4 h-24 w-full">
                <defs>
                  <linearGradient id="g" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#34d399" stopOpacity="0.6" />
                    <stop offset="100%" stopColor="#34d399" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <polyline
                  fill="url(#g)"
                  stroke="none"
                  points={`0,90 ${CHART.map((v, i) => `${(i / (CHART.length - 1)) * 300},${90 - v * 0.8}`).join(" ")} 300,90`}
                />
                <polyline
                  fill="none"
                  stroke="#34d399"
                  strokeWidth="2"
                  points={CHART.map(
                    (v, i) => `${(i / (CHART.length - 1)) * 300},${90 - v * 0.8}`,
                  ).join(" ")}
                />
              </svg>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-3">
              <Metric
                label="Repayment Reliability"
                value="97%"
                sub="0 defaults"
                icon={BadgeCheck}
                tint="emerald"
              />
              <Metric
                label="Profit Margin"
                value="38%"
                sub="above sector avg"
                icon={TrendingUp}
                tint="indigo"
              />
              <Metric label="Active Customers" value="42" sub="12 VIPs" icon={Award} tint="amber" />
            </div>
          </div>

          {/* QR + PDF */}
          <div className="flex flex-col justify-between rounded-2xl bg-gradient-to-br from-emerald-500 via-teal-500 to-indigo-600 p-5 text-white">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-widest opacity-80">
                Bank Verification
              </div>
              <div className="mt-1 text-xl font-extrabold">Scan to verify</div>
              <p className="mt-1 text-xs opacity-90">
                Loan officers can scan this QR to instantly verify all Credit Passport metrics.
              </p>
            </div>
            <div className="mx-auto my-4 grid h-40 w-40 place-items-center rounded-2xl bg-white p-2">
              <QrCode className="h-32 w-32 text-slate-900" />
            </div>
            <button className="w-full rounded-full bg-white px-4 py-2.5 text-sm font-bold text-emerald-700 shadow-lg">
              Download Bank-Ready PDF
            </button>
          </div>
        </div>
      </section>

      {/* Schemes */}
      <section className="mb-12">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-extrabold text-slate-900">Matched Government Schemes</h2>
            <p className="text-xs text-slate-500">
              Ranked by your verified revenue and Credit Passport score
            </p>
          </div>
          <Landmark className="h-5 w-5 text-indigo-600" />
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          {SCHEMES.map((s) => {
            const style = SCHEME_STYLES[s.tint] ?? SCHEME_STYLES.emerald;
            return (
              <div key={s.name} className="glass-card card-lift rounded-3xl p-7">
                <div className="flex items-center justify-between">
                  <span
                    className={`rounded-full ${style.tagBg} px-2.5 py-1 text-[10px] font-bold ${style.text}`}
                  >
                    {s.tag}
                  </span>
                  <span className="text-xs font-bold text-slate-500">
                    Eligibility {s.eligibility}%
                  </span>
                </div>
                <h3 className="mt-3 text-lg font-extrabold text-slate-900">{s.name}</h3>
                <div className="mt-2 flex gap-4 text-xs text-slate-600">
                  <span>
                    Max loan: <b className="text-slate-900">{s.max}</b>
                  </span>
                  <span>
                    Interest: <b className="text-slate-900">{s.rate}</b>
                  </span>
                </div>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={`h-full bg-gradient-to-r ${style.gradient}`}
                    style={{ width: `${s.eligibility}%` }}
                  />
                </div>
                <button className="btn-glow-emerald mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full py-2.5 text-xs font-bold">
                  1-Click Apply with Credit Passport <ArrowUpRight className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {/* Peer Circle */}
      <section className="glass-card rounded-3xl p-8">
        <div className="mb-4">
          <h2 className="text-lg font-extrabold text-slate-900">Peer Growth Circle</h2>
          <p className="text-xs text-slate-500">
            Local women entrepreneurs for mentorship &amp; supply chain scaling
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {PEERS.map((p) => (
            <div
              key={p.name}
              className="rounded-3xl border border-emerald-100 bg-white/70 p-5 transition hover:border-emerald-300 hover:shadow-lg"
            >
              <div className="flex items-center gap-3">
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-rose-400 via-amber-400 to-emerald-400 text-2xl">
                  {p.avatar}
                </div>
                <div className="min-w-0">
                  <div className="truncate font-bold text-slate-900">{p.name}</div>
                  <div className="truncate text-[11px] text-slate-500">{p.biz}</div>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-bold text-indigo-700">
                  {p.tag}
                </span>
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                  Score {p.score}
                </span>
              </div>
              <button className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full bg-emerald-500 py-2 text-xs font-bold text-white hover:bg-emerald-600">
                <Send className="h-3.5 w-3.5" /> Connect on WhatsApp
              </button>
            </div>
          ))}
        </div>
      </section>
    </AppShell>
  );
}

function Metric({
  label,
  value,
  sub,
  icon: Icon,
  tint,
}: {
  label: string;
  value: string;
  sub: string;
  icon: React.ComponentType<{ className?: string }>;
  tint: string;
}) {
  const style = SCHEME_STYLES[tint] ?? SCHEME_STYLES.emerald;
  return (
    <div className="rounded-2xl border border-emerald-100 bg-white/70 p-3">
      <div className={`grid h-8 w-8 place-items-center rounded-lg ${style.tagBg} ${style.text}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="mt-2 text-lg font-black text-slate-900">{value}</div>
      <div className="text-[10px] font-semibold text-slate-500">{label}</div>
      <div className="text-[10px] text-slate-400">{sub}</div>
    </div>
  );
}
