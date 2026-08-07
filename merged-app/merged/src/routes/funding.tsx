import { useState, useEffect } from "react";
import { AppShell } from "@/components/app-shell";
import { api } from "@/lib/apiClient";
import { useDashboard } from "@/hooks/use-dashboard";
import { useCustomers } from "@/hooks/use-customers";
import { useInventory } from "@/hooks/use-inventory";
import { useAuth } from "@/contexts/AuthContext";
import { exportCreditPassportPDF } from "@/lib/creditPassport";
import {
  TrendingUp,
  ShieldCheck,
  Landmark,
  Send,
  Award,
  BadgeCheck,
  Briefcase,
  Building2,
  type LucideIcon,
} from "lucide-react";


const SCHEME_STYLES: Record<string, { tagBg: string; text: string; gradient: string }> = {
  emerald: { tagBg: "bg-emerald-100", text: "text-emerald-700", gradient: "from-emerald-400 to-emerald-600" },
  rose: { tagBg: "bg-rose-100", text: "text-rose-700", gradient: "from-rose-400 to-rose-600" },
  amber: { tagBg: "bg-amber-100", text: "text-amber-700", gradient: "from-amber-400 to-amber-600" },
  indigo: { tagBg: "bg-indigo-100", text: "text-indigo-700", gradient: "from-indigo-400 to-indigo-600" },
};

// Schemes and peers are provided dynamically by the AI funding insights API

function getScoreLabel(score: number) {
  if (score >= 80) return { label: "Excellent", color: "text-emerald-600", bg: "bg-emerald-50" };
  if (score >= 60) return { label: "Good", color: "text-teal-600", bg: "bg-teal-50" };
  if (score >= 40) return { label: "Fair", color: "text-amber-600", bg: "bg-amber-50" };
  return { label: "Needs Work", color: "text-rose-600", bg: "bg-rose-50" };
}

function formatCurrency(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? `₹${Math.round(number).toLocaleString("en-IN")}` : "—";
}

function formatPercent(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? `${Math.round(number)}%` : "—";
}

function safeText(value: unknown, fallback = "") {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }
  if (typeof value === "number" && Number.isNaN(value)) {
    return fallback;
  }
  return String(value);
}

// Maps scheme titles to Lucide icons so we never need broken image URLs
const SCHEME_ICON_MAP: Record<string, LucideIcon> = {
  "mudra":       Landmark,
  "stand-up":    Briefcase,
  "standup":     Briefcase,
  "cgtmse":      ShieldCheck,
  "pmegp":       Building2,
  "msme":        Building2,
  "credit":      ShieldCheck,
  "working":     Landmark,
  "default":     Landmark,
};

function schemeIcon(title: string): LucideIcon {
  const key = title.toLowerCase();
  for (const [k, icon] of Object.entries(SCHEME_ICON_MAP)) {
    if (key.includes(k)) return icon;
  }
  return SCHEME_ICON_MAP["default"];
}

function normalizeScheme(s: any, scoreNum: number | null = null) {
  const minScore = Number(s.minScore ?? s.threshold ?? s.required_score ?? 50);
  const title = s.title || s.name || s.scheme || "MSME Funding Scheme";
  const providerName = s.providerName || s.provider || s.lender || title;
  const maximumLoan = s.maximumLoan || s.amount || s.max || s.loan_amount || s.recommended_amount || "Up to ₹50,000";
  const interestRate = s.interestRate || s.interest || s.rate || s.interest_rate || "9.5% p.a.";
  const whyRecommended = s.whyRecommended || s.reason || s.rationale || s.match_reason || "Based on your business transaction consistency and repayment profile.";
  const missingRequirements = s.missingRequirements || s.missing_requirements || s.requirements || s.requirement || "Business registration proof and PAN matching details.";

  const minVal = Math.max(1, Number.isFinite(minScore) ? minScore : 50);
  const calculatedMatch = scoreNum != null ? Math.max(0, Math.min(100, Math.round((scoreNum / minVal) * 100))) : 80;
  const matchPercentage = Number.isFinite(Number(s.matchPercentage ?? s.match_percent)) ? Number(s.matchPercentage ?? s.match_percent) : calculatedMatch;

  let status = s.status || "";
  if (!status) {
    if (scoreNum != null) {
      status = scoreNum >= minVal ? "Ready to Apply" : `Needs ${Math.max(1, minVal - scoreNum)} more points`;
    } else {
      status = "Ready to Apply";
    }
  }

  const applyUrl = s.applyUrl || s.apply_link || s.url || s.official_url || "https://www.mudra.org.in/";
  const tint = s.tint || "emerald";

  return {
    title,
    providerName,
    icon: schemeIcon(title),
    maximumLoan,
    interestRate,
    whyRecommended,
    missingRequirements,
    matchPercentage,
    status,
    applyUrl,
    minScore,
    tint,
  };
}

function isValidScheme(s: any) {
  return Boolean(
    s &&
    (s.title || s.name || s.scheme) &&
    (s.maximumLoan || s.amount || s.max || s.loan_amount || s.recommended_amount) &&
    (s.interestRate || s.interest || s.rate || s.interest_rate) &&
    (s.whyRecommended || s.reason || s.rationale || s.match_reason) &&
    (s.applyUrl || s.apply_link || s.url || s.official_url)
  );
}

function normalizePeer(p: any) {
  const business = p.business || p.name || "SME Retailer";
  const founder = p.founder || p.owner || "Indian Founder";
  const city = p.city || p.location || p.region || p.city || "Mumbai";
  const category = p.category || p.type || "Retailer";
  const similarity = typeof p.similarity === "number" ? p.similarity : (typeof p.score === "number" ? p.score : 0.85);
  const reason = p.reason || p.match_reason || "Collaborating on inventory distribution and supply chain.";
  const phone = p.phone || "919810000100";
  return {
    business,
    founder,
    city,
    category,
    similarity,
    reason,
    phone
  };
}


function buildFallbackSchemes({ score, totalRevenue, pendingUdhaar, totalCustomers, repeatCustomers }: { score?: number; totalRevenue?: number; pendingUdhaar?: number; totalCustomers: number; repeatCustomers: number; }) {
  return [
    {
      name: "PM Mudra Yojana",
      category: "Working Capital",
      amount: "₹10 Lakhs",
      interest: "8% onwards",
      reason: "Suitable for micro businesses with stable sales and working capital needs.",
      missing_requirements: "Business has active transactions and repayment history.",
      apply_link: "https://www.mudra.org.in/",
      minScore: 45,
      tint: "emerald",
      status: "Ready to Apply",
      buttonLabel: "Apply Now",
    },
    {
      name: "Stand-Up India Scheme",
      category: "Women Entrepreneur",
      amount: "₹10 Lakhs – ₹1 Crore",
      interest: "As per bank guidelines",
      reason: "Designed specifically for women entrepreneurs starting or expanding businesses.",
      missing_requirements: "Improve repayment consistency to strengthen eligibility.",
      apply_link: "https://www.standupmitra.in/",
      minScore: 75,
      tint: "rose",
      status: "Needs 5 more points",
      buttonLabel: "View Details",
    },
    {
      name: "CGTMSE",
      category: "Credit Guarantee",
      amount: "Up to ₹5 Crore",
      interest: "Bank dependent",
      reason: "Provides collateral-free credit support for MSMEs.",
      missing_requirements: "Business requires stronger repayment profile.",
      apply_link: "https://www.cgtmse.in/",
      minScore: 80,
      tint: "indigo",
      status: "Needs 10 more points",
      buttonLabel: "View Details",
    },
    {
      name: "PMEGP",
      category: "MSME Financing",
      amount: "₹50 Lakhs",
      interest: "Bank dependent",
      reason: "Supports new enterprises through subsidy-based financing.",
      missing_requirements: "Increase business history and monthly revenue.",
      apply_link: "https://www.kviconline.gov.in/pmegpeportal/",
      minScore: 85,
      tint: "amber",
      status: "Needs 15 more points",
      buttonLabel: "View Details",
    },
  ];
}

function buildFallbackPeers({ category, revenue, location }: { category?: string; revenue?: number; location?: string; }) {
  return [
    {
      business: 'Geetika Crafts',
      founder: 'Geetika Sharma',
      city: 'Delhi',
      location: 'Delhi',
      category: 'Handicrafts',
      similarity: 0.94,
      reason: 'Scaled from Instagram orders to an MSME brand.',
      phone: '919810000100',
    },
    {
      business: 'FreshKart Organics',
      founder: 'Mohit Verma',
      city: 'Noida',
      location: 'Noida',
      category: 'Food & Grocery',
      similarity: 0.91,
      reason: 'Improved working capital through timely repayments.',
      phone: '919810000200',
    },
    {
      business: 'Urban Threads',
      founder: 'Sneha Kapoor',
      city: 'Gurugram',
      location: 'Gurugram',
      category: 'Fashion',
      similarity: 0.89,
      reason: 'Women entrepreneur successfully funded under Stand-Up India.',
      phone: '919810000300',
    },
    {
      business: 'TechFix Solutions',
      founder: 'Farhan Ali',
      city: 'Lucknow',
      location: 'Lucknow',
      category: 'Electronics Repair',
      similarity: 0.90,
      reason: 'Maintains excellent repayment discipline and repeat customers.',
      phone: '919810000400',
    },
    {
      business: 'OP Agro Supplies',
      founder: 'Om Prakash',
      city: 'Jaipur',
      location: 'Jaipur',
      category: 'Agriculture',
      similarity: 0.87,
      reason: 'Expanded inventory using Mudra financing.',
      phone: '919810000500',
    },
    {
      business: 'Bloom Beauty Studio',
      founder: 'Riya Mehta',
      city: 'Mumbai',
      location: 'Mumbai',
      category: 'Beauty & Wellness',
      similarity: 0.93,
      reason: 'Built strong customer loyalty through repeat bookings.',
      phone: '919810000600',
    },
  ];
}

interface CacheEntry {
  data: any;
  timestamp: number;
}
let insightsCache: CacheEntry | null = null;
let activeFetchPromise: Promise<any> | null = null;

async function fetchFundingInsights() {
  if (insightsCache && Date.now() - insightsCache.timestamp < 5 * 60 * 1000) {
    return insightsCache.data;
  }
  if (activeFetchPromise) {
    return activeFetchPromise;
  }

  activeFetchPromise = api.get<any>("/api/ai/funding-insights")
    .then((json) => {
      activeFetchPromise = null;
      if (json && json.success) {
        insightsCache = { data: json.data, timestamp: Date.now() };
        return json.data;
      }
      return null;
    })
    .catch((err) => {
      activeFetchPromise = null;
      throw err;
    });

  return activeFetchPromise;
}

export default function FundingPage() {
  const { isAuthenticated } = useAuth();
  const { overview } = useDashboard();
  const { customers } = useCustomers();
  const { items: inventory } = useInventory();

  // Prefer live metrics from `overview` (backend). Avoid hardcoded fallbacks.
  const score = Number.isFinite(Number(overview?.loan_eligibility_score)) ? Number(overview?.loan_eligibility_score) : undefined;
  const breakdown = (overview?.loan_score_breakdown ?? []) as { factor: string; score: number; max: number; description: string; isPositive?: boolean }[];
  const totalRevenue = Number.isFinite(Number(overview?.total_revenue)) ? Number(overview?.total_revenue) : undefined;
  const monthlyRevenue = Number.isFinite(Number(overview?.monthly_revenue)) ? Number(overview?.monthly_revenue) : undefined;
  const pendingUdhaar = Number.isFinite(Number(overview?.pending_udhaar)) ? Number(overview?.pending_udhaar) : undefined;
  const totalCustomers = customers?.length || 0;
  const vipCount = customers.filter(c => c.badge === "VIP").length;
  const repeatCustomers = customers.filter(c => c.orders >= 2).length;

  // Derive repayment reliability and margin when available from overview; otherwise leave undefined so UI shows empty state
  const repaymentReliability = Number.isFinite(Number(overview?.repayment_reliability_percent)) ? Number(overview?.repayment_reliability_percent) : undefined;
  const margin = Number.isFinite(Number(overview?.profit_margin_percent)) ? Number(overview?.profit_margin_percent) : undefined;
  const scoreLabel = Number.isFinite(score) ? getScoreLabel(score) : { label: "Business profile", color: "text-slate-500", bg: "bg-slate-100" };

  const FUNDING_TABS = [
    "Credit Passport",
    "Funding Options",
    "Growth & Trust",
    "Peer Network",
  ] as const;
  const [activeTab, setActiveTab] = useState<(typeof FUNDING_TABS)[number]>("Credit Passport");
  const [insights, setInsights] = useState<any | null>(null);
  const [insightsLoading, setInsightsLoading] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) return;
    let mounted = true;
    async function load() {
      setInsightsLoading(true);
      try {
        const data = await fetchFundingInsights();
        if (!mounted) return;
        setInsights(data);
      } catch (e) {
        if (!mounted) return;
        setInsights(null);
      } finally {
        if (mounted) setInsightsLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, [overview, isAuthenticated]);


  const fundingSchemes = (() => {
    const fallbackSchemes = buildFallbackSchemes({ score, totalRevenue, pendingUdhaar, totalCustomers, repeatCustomers });
    const aiSchemes = insights?.recommendations ?? insights?.schemes ?? insights?.recommended_schemes;
    const scoreNum = typeof score === 'number' ? score : null;
    const normalizedFallbacks = fallbackSchemes.map(f => normalizeScheme(f, scoreNum));

    if (!Array.isArray(aiSchemes) || aiSchemes.length === 0) {
      return normalizedFallbacks;
    }

    const normalized = aiSchemes.map(s => normalizeScheme(s, scoreNum));
    const merged = normalizedFallbacks.map((fallback, index) => {
      const aiScheme = normalized[index];
      return isValidScheme(aiScheme) ? aiScheme : fallback;
    });

    const validExtraSchemes = normalized.slice(normalizedFallbacks.length).filter(isValidScheme);
    return [...merged, ...validExtraSchemes];
  })();

  const peerRecommendations = (() => {
    const aiPeers = Array.isArray(insights?.peers) ? insights.peers : [];
    const fallbackPeers = buildFallbackPeers({ category: overview?.business_category, revenue: totalRevenue, location: overview?.location });
    const sourcePeers = aiPeers.length > 0 ? aiPeers : fallbackPeers;
    return sourcePeers.map(normalizePeer);
  })();


  const lowStockItems = inventory.filter(i => i.stock <= i.low);
  const repeatRate = totalCustomers > 0 ? Math.round((repeatCustomers / totalCustomers) * 100) : 0;
  const growthRecommendations = Array.isArray(insights?.growth_recommendations)
    ? insights.growth_recommendations.filter((item: any) => typeof item === "string" && item.trim().length > 0)
    : [];
  const fallbackGrowthRecommendations = [
    pendingUdhaar != null && pendingUdhaar > 0 ? `Reduce outstanding dues by ₹${Math.round(pendingUdhaar)} within 7 days.` : null,
    repeatRate < 50 ? `Improve repeat customers by ${50 - repeatRate}% to strengthen your funding profile.` : null,
    lowStockItems.length > 0 ? `Restock ${lowStockItems.length} low inventory products before stock constraints pose a risk.` : null,
    pendingUdhaar != null && pendingUdhaar > 0 ? `Collect pending payments from top customers within 7 days.` : null,
  ].filter(Boolean) as string[];
  const growthList = growthRecommendations.length > 0 ? growthRecommendations.slice(0, 4) : fallbackGrowthRecommendations.slice(0, 4);
  const creditSummaryFallback = 'Consistent sales and repayments can unlock better funding.';
  const nextActionFallback = pendingUdhaar != null && pendingUdhaar > 0
    ? `Collect outstanding dues of ₹${Math.round(pendingUdhaar)} within 7 days to improve financing readiness.`
    : repeatRate < 50
      ? `Collect pending dues`
      : `Maintain consistent collections and inventory flow to support your credit score.`;

  function handleDownloadPDF() {
    exportCreditPassportPDF({ overview, customers, inventory });
  }



  return (
    <AppShell>
      <div className="mb-6">
        
        <h1 className="mt-3 text-3xl font-extrabold text-slate-900 sm:text-4xl">
          Micro-Funding &amp; Financial Empowerment Hub
        </h1>
        
      </div>

      {/* Onboarding Notice */}

      <div className="mb-8">
        <div className="grid gap-4 md:grid-cols-[1fr_auto] items-center">
          <div>
            <h2 className="text-xl font-extrabold text-slate-900">Explore your credit & funding journey</h2>
            
          </div>
          <div className="flex flex-wrap gap-2">
            {FUNDING_TABS.map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${activeTab === tab ? "bg-emerald-600 text-white shadow-lg shadow-emerald-500/20" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
      </div>

      {activeTab === "Credit Passport" && (
        <section className="glass-card mb-8 rounded-3xl p-6">
          <div className="grid gap-4 lg:grid-cols-[1.3fr_0.9fr]">
            <div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-emerald-600" />
                  <h2 className="text-lg font-extrabold text-slate-900">Credit Passport</h2>
                </div>
                
              </div>

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl bg-gradient-to-br from-slate-900 to-emerald-800 p-4 text-white">
                  <div className="text-xs font-bold uppercase">Business Credit Score</div>
                  <div className="mt-2 text-4xl font-black">{score ?? (insightsLoading ? <span className="animate-pulse">—</span> : '—')}</div>
                  <div className="mt-2 text-sm text-white/80">
Business Health Score
</div>

                  <div className="mt-3 h-2 rounded-full bg-white/10 overflow-hidden">
                    <div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-400" style={{ width: `${Math.min(100, Math.max(0, Number(score || 0)))}%` }} />
                  </div>
                </div>

                <div className="rounded-2xl border bg-white p-4">
                  <div className="text-xs font-bold text-slate-700">Key Metrics</div>
                  <div className="mt-3 grid gap-2">
                    <div className="flex items-center justify-between text-sm text-slate-700">
                      <div>Monthly Revenue</div>
                      <div className="font-semibold">{monthlyRevenue != null ? `₹${Math.round(Number(monthlyRevenue)).toLocaleString('en-IN')}` : (insightsLoading ? <span className="animate-pulse">—</span> : '—')}</div>
                    </div>
                    <div className="flex items-center justify-between text-sm text-slate-700">
                      <div>Total Revenue</div>
                      <div className="font-semibold">{totalRevenue != null ? `₹${Math.round(Number(totalRevenue)).toLocaleString('en-IN')}` : (insightsLoading ? <span className="animate-pulse">—</span> : '—')}</div>
                    </div>
                    <div className="flex items-center justify-between text-sm text-slate-700">
                      <div>Outstanding Dues</div>
                      <div className="font-semibold">{pendingUdhaar != null ? `₹${Math.round(Number(pendingUdhaar)).toLocaleString('en-IN')}` : (insightsLoading ? <span className="animate-pulse">—</span> : '—')}</div>
                    </div>
                    <div className="flex items-center justify-between text-sm text-slate-700">
                      <div>Repayment %</div>
                      <div className="font-semibold">{repaymentReliability != null ? `${repaymentReliability}%` : (insightsLoading ? <span className="animate-pulse">—</span> : '—')}</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4 rounded-2xl border p-4 bg-white">
                <div className="text-sm font-bold text-slate-800">Health Snapshot</div>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <Metric label="Repeat buyers" value={repeatCustomers != null ? String(repeatCustomers) : '—'} sub="Customer loyalty" icon={Award} tint="amber" />
                  <Metric label="VIP patrons" value={vipCount != null ? String(vipCount) : '—'} sub="High-value customers" icon={Landmark} tint="rose" />
                </div>
              </div>
            </div>

            <AIInsightsCard
        insights={insights}
        overview={overview}
        fallbackSummary={creditSummaryFallback}
        fallbackNextAction={nextActionFallback}
        onExport={handleDownloadPDF}
      />
          </div>
        </section>
      )}

      {activeTab === "Funding Options" && (
        <section className="glass-card mb-12 rounded-3xl p-8 sm:p-10">
          <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)] lg:items-start">
            <div className="max-w-[280px]">
              <div className="flex items-center gap-2">
                <Landmark className="h-5 w-5 text-indigo-600" />
                <h2 className="text-lg font-extrabold text-slate-900">Funding options built for your score</h2>
              </div>
              <p className="mt-2 text-sm text-slate-500">
                {insights?.funding_overview || 'Funding matches are generated from your latest revenue, dues and customer behavior.'}
              </p>
            </div>
            <div className="rounded-3xl border border-emerald-100 bg-emerald-50 p-5 text-emerald-900">
              <p className="text-xs font-semibold uppercase tracking-wider">Quick insight</p>
              <p className="mt-3 text-sm leading-6">
                Your business demonstrates strong repayment reliability and repeat customer trust. These are the most persuasive data points for working capital approvals.
              </p>
            </div>
          </div>

          <div className="mt-8 grid gap-6 md:grid-cols-2 auto-rows-fr">
            {insightsLoading ? (
              [1, 2, 3, 4].map(idx => (
                <div key={idx} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col animate-pulse">
                  <div className="flex items-center justify-between">
                    <div className="h-6 w-24 bg-slate-200 rounded-full" />
                    <div className="h-4 w-20 bg-slate-200 rounded-full" />
                  </div>
                  <div className="mt-4 h-8 bg-slate-200 rounded-2xl w-3/4" />
                  <div className="mt-6 space-y-3 flex-1">
                    <div className="h-4 bg-slate-200 rounded w-5/6" />
                    <div className="h-4 bg-slate-200 rounded w-2/3" />
                    <div className="h-4 bg-slate-200 rounded w-3/4" />
                  </div>
                  <div className="mt-6 h-10 bg-slate-200 rounded-full w-full" />
                </div>
              ))
            ) : fundingSchemes.length === 0 ? (
              <div className="col-span-2 rounded-3xl border p-6 bg-slate-50 text-slate-600">No matched funding options were found for your current profile. Update your business score and try again.</div>
            ) : (
              fundingSchemes.map((s: any) => {
                const style = SCHEME_STYLES[s.tint] ?? SCHEME_STYLES.emerald;
                const minScore = Number(s.minScore ?? 50);
                const scoreNum = typeof score === 'number' ? score : null;
                const isEligible = scoreNum != null && scoreNum >= minScore;
                const eligibility = Number.isFinite(s.matchPercentage) ? s.matchPercentage : 0;
                const eligibilityLabel = `${eligibility}%`;
                
                const SchemeIcon = s.icon ?? Landmark;
                return (
                  <div key={s.title || JSON.stringify(s).slice(0,40)} className={`rounded-3xl border p-6 shadow-sm flex h-full flex-col ${isEligible ? "border-emerald-200 bg-white" : "border-slate-200 bg-slate-50"}`}>
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <div className={`grid h-7 w-7 shrink-0 place-items-center rounded-full ${style.tagBg}`}>
                          <SchemeIcon className={`h-3.5 w-3.5 ${style.text}`} />
                        </div>
                        <span className={`rounded-full ${style.tagBg} px-3 py-1 text-xs font-bold ${style.text}`}>{s.providerName}</span>
                      </div>
                      <span className={`text-xs font-bold ${isEligible ? "text-emerald-600" : "text-slate-500"}`}>
                        {s.status}
                      </span>
                    </div>
                    <h3 className="mt-4 text-xl font-bold text-slate-900">{safeText(s.title)}</h3>
                    <div className="mt-3 grid gap-3 text-sm text-slate-600 flex-1">
                      <div>Maximum loan: <span className="font-semibold text-slate-900">{safeText(s.maximumLoan)}</span></div>
                      <div>Interest rate: <span className="font-semibold text-slate-900">{safeText(s.interestRate)}</span></div>
                      <div>Why recommended: <span className="font-semibold text-slate-900">{safeText(s.whyRecommended)}</span></div>
                      <div>Missing requirements: <span className="font-semibold text-slate-900">{safeText(s.missingRequirements)}</span></div>
                    </div>
                    <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-400" style={{ width: `${eligibility}%` }} />
                    </div>
                    <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                      <span>{eligibilityLabel} match</span>
                      <span>{isEligible ? "Eligible" : "Awaiting stronger score"}</span>
                    </div>
                    {s.applyUrl ? (
                      <a href={s.applyUrl} target="_blank" rel="noreferrer" className={`mt-6 block w-full text-center rounded-full py-2 text-sm font-bold transition bg-emerald-600 text-white hover:bg-emerald-700`}>
                        Apply to {s.providerName}
                      </a>
                    ) : (
                      <button disabled className="mt-6 block w-full rounded-full bg-slate-200 py-2 text-sm font-bold text-slate-500">Contact support for next steps</button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </section>
      )}

      {activeTab === "Growth & Trust" && (
        <section className="glass-card mb-12 rounded-3xl p-8 sm:p-10">
          <div className="grid gap-6 lg:grid-cols-[1fr_0.95fr]">
            <div className="space-y-4">
              <div className="rounded-3xl border border-emerald-100 bg-emerald-50 p-6">
                <div className="flex items-center gap-2 text-emerald-800">
                  <TrendingUp className="h-5 w-5" />
                  <h3 className="text-base font-bold">Strengthen your trust story</h3>
                </div>
                <p className="mt-3 text-sm text-emerald-900">
                  Banks and suppliers care about repeat customers, clean payment history, and how quickly you turn invoices into revenue.
                </p>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-white p-6">
                <div className="flex items-center gap-2 text-slate-800">
                  <ShieldCheck className="h-5 w-5 text-emerald-600" />
                  <h3 className="text-base font-bold">AI-backed trust cues</h3>
                </div>
                <ul className="mt-4 space-y-3 text-sm text-slate-600">
                  {growthList.length === 0 ? (
                    <li className="rounded-2xl bg-slate-50 p-3">Awaiting additional business history</li>
                  ) : (
                    growthList.map((item, index) => (
                      <li key={index} className="rounded-2xl bg-slate-50 p-3 text-sm">• {item}</li>
                    ))
                  )}
                </ul>
              </div>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white p-6">
              <div className="flex items-center gap-2">
                <BadgeCheck className="h-5 w-5 text-emerald-600" />
                <h3 className="text-base font-bold text-slate-900">Your current business health</h3>
              </div>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <Metric label="Customers Paying On Time" value={repaymentReliability != null ? `${repaymentReliability}%` : 'Awaiting additional business history'} sub="Collections reliability" icon={BadgeCheck} tint="emerald" />
                <Metric label="Monthly Revenue Trend" value={monthlyRevenue != null ? `₹${Math.round(monthlyRevenue).toLocaleString('en-IN')}` : 'Awaiting additional business history'} sub="Monthly sales performance" icon={TrendingUp} tint="indigo" />
                <Metric label="Repeat buyer base" value={repeatCustomers > 0 ? String(repeatCustomers) : 'Awaiting additional business history'} sub="Strong loyalty" icon={Award} tint="amber" />
                <Metric label="VIP patrons" value={vipCount > 0 ? String(vipCount) : 'Awaiting additional business history'} sub="High-value customers" icon={Landmark} tint="rose" />
              </div>
            </div>
          </div>
        </section>
      )}

      {activeTab === "Peer Network" && (
        <section className="glass-card rounded-3xl p-8">
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Landmark className="h-5 w-5 text-indigo-600" />
                <h2 className="text-lg font-extrabold text-slate-900">Peer Growth Circle</h2>
              </div>
              <p className="mt-1 text-sm text-slate-500">
                Collaborate with local businesses, suppliers and mentors who are also scaling through Udhaar Wise.
              </p>
            </div>
            <button className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-emerald-500/20 hover:bg-emerald-700">
              Share your profile
            </button>
          </div>
          <div className="grid gap-4 md:grid-cols-3 auto-rows-fr">
            {peerRecommendations.length === 0 ? (
              <div className="col-span-3 rounded-3xl border p-6 bg-slate-50 text-slate-600">No local business matches are available right now. Continue building your customer and credit profile to unlock stronger peer recommendations.</div>
            ) : (
              peerRecommendations.map((p: any) => (
                <div key={p.business || p.name} className="rounded-3xl border border-emerald-100 bg-white/80 p-5 shadow-sm flex flex-col">
                  <div className="flex items-center gap-3">
                    <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-rose-400 via-amber-400 to-emerald-400 text-2xl text-white">
                      {String(p.business || p.name || 'B').charAt(0)}
                    </div>
                    <div>
                      <div className="font-bold text-slate-900">{safeText(p.business || p.name)}</div>
                      <div className="text-[11px] text-slate-500">{p.founder ? `${p.founder} • Founder` : safeText(p.owner ? `${p.owner} • Founder` : '')}</div>
                    </div>
                  </div>
                  <div className="mt-4 flex-1">
                    <div className="text-sm text-slate-600">Category: <span className="font-semibold text-slate-900">{safeText(p.category)}</span></div>
                    <div className="mt-2 text-sm text-slate-600">Similarity: <span className="font-semibold text-emerald-700">{safeText((typeof p.similarity === 'number' ? `${Math.round(Number(p.similarity) * 100)}%` : (typeof p.score === 'number' ? `${Math.round(Number(p.score) * 100)}%` : undefined)))}</span></div>
                    <div className="mt-3 text-xs text-slate-500">{safeText(p.reason || p.match_reason, 'Matched based on revenue, customer mix and inventory profile.')}</div>
                  </div>
                  <div className="mt-4">
                    {p.phone ? (
                      <a href={`https://wa.me/${p.phone}`} rel="noreferrer" target="_blank" className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-emerald-500 py-2 text-xs font-bold text-white hover:bg-emerald-600">
                        <Send className="h-3.5 w-3.5" /> Message
                      </a>
                    ) : (
                      <div className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-slate-100 py-2 text-xs font-bold text-slate-500">No contact available</div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      )}
    </AppShell>
  );
}

function AIInsightsCard({ insights, overview, fallbackSummary, fallbackNextAction, onExport }: { insights?: any; overview?: any; fallbackSummary: string; fallbackNextAction: string; onExport?: () => void }) {
  const score = Number.isFinite(Number(insights?.approval_score ?? overview?.loan_eligibility_score)) ? Number(insights?.approval_score ?? overview?.loan_eligibility_score) : 0;
  const approvalProb = insights?.approval_probability ?? (score >= 70 ? 'high' : score >= 45 ? 'medium' : 'low');
  const creditSummary = insights?.credit_summary || fallbackSummary;
  const strengths = insights?.business_strengths || insights?.strengths || [];
  const weakAreas = insights?.weak_areas || insights?.weaknesses || [];
  const nextAction = insights?.next_best_action || insights?.recommendation || fallbackNextAction;

  return (
    <div className="rounded-2xl border border-emerald-100 bg-white p-6 text-slate-900 h-full flex flex-col">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="text-[10px] font-bold uppercase tracking-widest text-emerald-600">AI Business Insights</div>
          <div className="mt-3 text-lg font-extrabold">Approval Probability: <span className="ml-2 text-emerald-700">{String(approvalProb).toUpperCase()}</span></div>
          <div className="text-sm text-slate-500 mt-2">Credit Score: <b>{Math.round(score)}</b></div>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 text-right text-sm">
          <div className="text-xs text-slate-400">Recommended action</div>
          <div className="mt-2 font-semibold text-slate-800">{nextAction}</div>
        </div>
      </div>
      <div className="mt-6 text-sm text-slate-600 flex flex-1 flex-col gap-4">
        <div>{creditSummary}</div>
        {strengths.length > 0 && (
          <div>
            <div className="text-xs font-bold text-slate-700 uppercase tracking-wide">Strengths</div>
            <div className="mt-2 flex flex-wrap gap-2">{strengths.map((s: string, i:number)=>(<span key={i} className="rounded-full bg-emerald-50 px-2 py-1 text-xs text-emerald-700">{s}</span>))}</div>
          </div>
        )}
        {weakAreas.length > 0 && (
          <div>
            <div className="text-xs font-bold text-slate-700 uppercase tracking-wide">Improvements</div>
            <div className="mt-2 flex flex-wrap gap-2">{weakAreas.map((s: string, i:number)=>(<span key={i} className="rounded-full bg-rose-50 px-2 py-1 text-xs text-rose-700">{s}</span>))}</div>
          </div>
        )}
      </div>
      <div className="mt-6 flex flex-wrap gap-3">
        <button onClick={onExport} className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white">Export Passport</button>
        <button onClick={() => window.location.reload()} className="rounded-full border px-4 py-2 text-sm">Refresh Insights</button>
      </div>
    </div>
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
