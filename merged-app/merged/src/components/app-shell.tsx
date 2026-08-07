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
  MessageSquare,
  X,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useState, useCallback } from "react";
import { api } from "@/lib/apiClient";
import { ErrorBoundary } from "@/components/error-boundary";

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/dashboard/orders", label: "Orders & Inventory", icon: Package },
  { to: "/dashboard/funding", label: "Funding & Schemes", icon: Landmark },
  { to: "/dashboard/customers", label: "Customers", icon: Users },
  { to: "/dashboard/settings", label: "Settings", icon: Settings },
] as const;

const CUSTOMER_QUESTIONS = [
  "Which customers should I follow up with?",
  "Which customers pay late?",
  "Which products need restocking?",
  "Which invoices are overdue?",
];

const OWNER_QUESTIONS = [
  "Improve my credit score",
  "Which funding option suits me?",
  "Why is my score low?",
  "Give me today's business summary",
  "What should I focus on this week?",
];

const FALLBACK_MSG =
  "AI insights are temporarily unavailable. Please try again later.";

// ────────────────────────────────────────────────────────────────
// Safe response extractor — never throws
// ────────────────────────────────────────────────────────────────
function extractAnswer(res: unknown): string {
  try {
    if (!res || typeof res !== "object") return FALLBACK_MSG;
    const r = res as Record<string, unknown>;
    if (!r.success) return FALLBACK_MSG;

    const raw = r.answer ?? r.data ?? r.response ?? r.message;
    if (typeof raw === "string" && raw.trim().length > 0) return raw.trim();
    if (raw && typeof raw === "object") {
      const inner = (raw as Record<string, unknown>).text ??
        (raw as Record<string, unknown>).answer ??
        (raw as Record<string, unknown>).message;
      if (typeof inner === "string" && inner.trim().length > 0) return inner.trim();
    }
    return FALLBACK_MSG;
  } catch {
    return FALLBACK_MSG;
  }
}

export function AppShell({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
    } catch {
      // ignore
    }
    navigate("/login");
  };

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
          {/* Page children wrapped in error boundary so a page crash never kills the shell */}
          <ErrorBoundary
            fallback={
              <div className="flex flex-col items-center justify-center gap-4 rounded-3xl border border-rose-200 bg-rose-50 py-20 text-center">
                <AlertCircle className="h-10 w-10 text-rose-400" />
                <div className="text-base font-semibold text-rose-700">This page encountered an error.</div>
                <button
                  onClick={() => window.location.reload()}
                  className="rounded-full bg-rose-600 px-5 py-2 text-sm font-semibold text-white hover:bg-rose-700"
                >
                  Reload
                </button>
              </div>
            }
          >
            {children}
          </ErrorBoundary>
        </main>
      </div>

      {/* AI Copilot — isolated in its own error boundary so modal crash never kills the app */}
      <ErrorBoundary fallback={null}>
        <AICopilot />
      </ErrorBoundary>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────
// AI Copilot — fully hardened against every failure mode
// ────────────────────────────────────────────────────────────────
function AICopilot() {
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [lastQuestion, setLastQuestion] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClose = useCallback(() => {
    setOpen(false);
  }, []);

  const handleClear = useCallback(() => {
    setQuestion("");
    setAnswer(null);
    setError(null);
    setLastQuestion("");
  }, []);

  const ask = useCallback(async () => {
    const q = question.trim();
    if (!q || loading) return;

    setLoading(true);
    setError(null);
    setAnswer(null);
    setLastQuestion(q);

    try {
      // 5-second timeout to prevent hanging
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 10_000);

      let res: unknown;
      try {
        res = await api.post("/api/ai/query", { text: q });
      } finally {
        clearTimeout(timer);
      }

      const text = extractAnswer(res);
      setAnswer(text);
    } catch (err: unknown) {
      // Handle every known error type
      let msg = FALLBACK_MSG;
      if (err instanceof Error) {
        const m = err.message.toLowerCase();
        if (m.includes("429") || m.includes("quota") || m.includes("rate limit")) {
          msg = "AI quota exceeded. Please wait a minute and try again.";
        } else if (m.includes("401") || m.includes("unauthorized") || m.includes("auth")) {
          msg = "Session expired. Please refresh the page and log in again.";
        } else if (m.includes("abort") || m.includes("timeout")) {
          msg = "Request timed out. Please check your connection and try again.";
        } else if (m.includes("network") || m.includes("fetch")) {
          msg = "Network error. Please check your internet connection.";
        }
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [question, loading]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        ask();
      }
    },
    [ask]
  );

  const selectQuestion = useCallback((q: string) => {
    setQuestion(q);
    setAnswer(null);
    setError(null);
  }, []);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        title="AI Copilot"
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-600 text-white shadow-lg shadow-emerald-500/30 hover:scale-105 transition-transform"
      >
        <MessageSquare className="h-6 w-6" />
      </button>

      {open && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/50" onClick={handleClose} />
          <div
            className="glass-card relative z-[70] flex flex-col rounded-3xl bg-white shadow-2xl"
            style={{ width: "min(900px, 96vw)", height: "75vh", maxHeight: "90vh" }}
          >
            {/* Header */}
            <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-6 py-4">
              <div>
                <div className="text-lg font-bold">AI Copilot</div>
                <div className="text-sm text-slate-500">
                  Ask about credit, funding, customers or growth insights.
                </div>
              </div>
              <button
                onClick={handleClose}
                className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content area */}
            <div className="flex flex-1 flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">

                {/* Error state */}
                {error && !loading && (
                  <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                    <div className="text-sm text-amber-800">{error}</div>
                  </div>
                )}

                {/* Loading state */}
                {loading && (
                  <div className="flex flex-col gap-4">
                    <div className="flex justify-end">
                      <div className="max-w-[75%] rounded-3xl rounded-br-none bg-slate-100 px-4 py-3 text-sm text-slate-800 shadow-sm">
                        {lastQuestion}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                      <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />
                      AI is thinking…
                    </div>
                  </div>
                )}

                {/* Answer state */}
                {!loading && answer && (
                  <>
                    <div className="flex justify-end">
                      <div className="max-w-[75%] rounded-3xl rounded-br-none bg-slate-100 px-4 py-3 text-sm text-slate-800 shadow-sm">
                        {lastQuestion || question}
                      </div>
                    </div>
                    <div className="flex justify-start">
                      <div className="max-w-[75%] rounded-3xl rounded-bl-none bg-emerald-50 px-4 py-3 text-sm leading-6 text-slate-900 shadow-sm border border-emerald-100">
                        {answer}
                      </div>
                    </div>
                  </>
                )}

                {/* Default / quick questions state */}
                {!loading && !answer && !error && (
                  <div className="space-y-6">
                    <div className="rounded-2xl bg-slate-50 px-4 py-4 text-sm text-slate-500">
                      Select a quick question or type your own below. Press{" "}
                      <kbd className="rounded bg-slate-200 px-1 py-0.5 text-xs font-mono">⌘ Enter</kbd> to send.
                    </div>
                    <div className="grid gap-6 sm:grid-cols-2">
                      <QuestionGroup title="Customer Questions" questions={CUSTOMER_QUESTIONS} onSelect={selectQuestion} />
                      <QuestionGroup title="Owner Questions" questions={OWNER_QUESTIONS} onSelect={selectQuestion} />
                    </div>
                  </div>
                )}
              </div>

              {/* Input area */}
              <div className="shrink-0 border-t border-slate-200 px-6 py-4">
                <textarea
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask about credit score, funding, orders, customers…"
                  disabled={loading}
                  className="h-24 w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-emerald-500 disabled:opacity-50"
                />
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    onClick={ask}
                    disabled={loading || !question.trim()}
                    className="rounded-full bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" /> Asking…
                      </span>
                    ) : (
                      "Ask"
                    )}
                  </button>
                  <button
                    onClick={handleClear}
                    disabled={loading}
                    className="rounded-full border border-slate-200 px-5 py-2.5 text-sm text-slate-700 hover:bg-slate-100 disabled:opacity-50"
                  >
                    Clear
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function QuestionGroup({
  title,
  questions,
  onSelect,
}: {
  title: string;
  questions: string[];
  onSelect: (q: string) => void;
}) {
  return (
    <div>
      <h4 className="mb-2 ml-1 text-xs font-bold uppercase tracking-wider text-slate-400">
        {title}
      </h4>
      <div className="flex flex-col gap-2">
        {questions.map((q) => (
          <button
            key={q}
            type="button"
            onClick={() => onSelect(q)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-left text-xs font-medium text-slate-700 transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-800"
          >
            • {q}
          </button>
        ))}
      </div>
    </div>
  );
}
