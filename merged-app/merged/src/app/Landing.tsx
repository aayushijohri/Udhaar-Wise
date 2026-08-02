import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

import { motion, useInView } from "motion/react";
import {
  MessageCircle, Mic, Camera, Image as ImageIcon, Zap, FileText, Package,
  Users, BarChart2, DollarSign, TrendingUp, Bell, CreditCard, Star, Check,
  Play, Menu, X, AlertTriangle, ArrowRight, Twitter, Linkedin, Instagram,
  Mail, Brain, Sparkles, ChevronRight, Phone, Globe, BookOpen, Clock,
  ShieldCheck, Wallet, PiggyBank, Network, RefreshCw, Eye
} from "lucide-react";

// ─── Globals ──────────────────────────────────────────────────────────────────

const jakarta = { fontFamily: "'Plus Jakarta Sans', sans-serif" };
const inter = { fontFamily: "'Inter', sans-serif" };

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } },
};
const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};
const fadeIn = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.5 } },
};

function useAnimatedCounter(target: number, active: boolean, suffix = "") {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!active) return;
    const steps = 70;
    let step = 0;
    const id = setInterval(() => {
      step++;
      setVal(Math.round((target / steps) * step));
      if (step >= steps) clearInterval(id);
    }, 2000 / steps);
    return () => clearInterval(id);
  }, [active, target]);
  return val;
}

// ─── Gradient Orbs ────────────────────────────────────────────────────────────

function GradientOrbs() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
      <div
        className="absolute w-[600px] h-[600px] rounded-full opacity-20 blur-3xl"
        style={{ background: "radial-gradient(circle, #059669, transparent)", top: "-10%", left: "-15%" }}
      />
      <div
        className="absolute w-[500px] h-[500px] rounded-full opacity-15 blur-3xl"
        style={{ background: "radial-gradient(circle, #0d9488, transparent)", bottom: "0%", right: "-10%" }}
      />
      <div
        className="absolute w-[300px] h-[300px] rounded-full opacity-10 blur-2xl"
        style={{ background: "radial-gradient(circle, #25d366, transparent)", top: "50%", right: "30%" }}
      />
    </div>
  );
}

// ─── Navbar ───────────────────────────────────────────────────────────────────

function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 24);
    window.addEventListener("scroll", h, { passive: true });
    return () => window.removeEventListener("scroll", h);
  }, []);

  const links = [
    { name: "Features", href: "#features" },
    { name: "How It Works", href: "#how-it-works" },
    { name: "Testimonials", href: "#testimonials" },
    { name: "", href: "#" },
  ];

  return (
    <nav
      className={`fixed top-0 inset-x-0 z-50 transition-all duration-500 ${
        scrolled
          ? "bg-white/80 backdrop-blur-2xl border-b border-emerald-100 shadow-sm shadow-emerald-50"
          : ""
      }`}
    >
      <div className="max-w-7xl mx-auto px-5 sm:px-8 flex items-center justify-between h-16">
        <a href="#" className="flex items-center gap-2.5" style={jakarta}>
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-200">
            <Zap className="w-4 h-4 text-white" />
          </div>

          <span className="font-bold text-[#0a1628] text-[17px]">
            BusinessOS<span className="text-emerald-600"> AI</span>
          </span>
        </a>

        <div className="hidden md:flex items-center gap-7">
          {links.map((link) => (
            <a
              key={link.name}
              href={link.href}
              className="text-sm text-gray-500 hover:text-emerald-600 transition-colors font-medium"
              style={inter}
            >
              {link.name}
            </a>
          ))}
        </div>

        <div className="hidden md:flex items-center gap-3">
          <button
            onClick={() => navigate("/login")}
            className="text-sm text-gray-500 hover:text-gray-800 font-medium transition-colors"
            style={inter}
          >
            Login
          </button>

          <button
            onClick={() => navigate("/signup")}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-sm font-semibold rounded-xl transition-all shadow-md shadow-emerald-200/50"
            style={jakarta}
          >
            Get Started
          </button>
        </div>

        <button
          className="md:hidden p-2 text-gray-600"
          onClick={() => setOpen(!open)}
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {open && (
        <div
          className="md:hidden bg-white/95 backdrop-blur-xl border-t border-emerald-50 px-5 pb-5 pt-3"
          style={inter}
        >
          {[{ name: "Home", href: "#" }, ...links].map((link) => (
            <a
              key={link.name}
              href={link.href}
              className="block py-2.5 text-gray-600 hover:text-emerald-600 font-medium text-sm border-b border-gray-50 last:border-0"
              onClick={() => setOpen(false)}
            >
              {link.name}
            </a>
          ))}

          <button
            onClick={() => navigate("/signup")}
            className="mt-4 w-full px-4 py-2.5 bg-emerald-600 text-white text-sm font-semibold rounded-xl"
            style={jakarta}
          >
            Get Started Free
          </button>
        </div>
      )}
    </nav>
  );
}
// ─── Hero ─────────────────────────────────────────────────────────────────────

const waBubbles = [
  { text: "Order: 2 kg dark chocolate cake 🎂", delay: 0, x: -20, y: 0 },
  { text: "Sent ₹500 via GPay ✅", delay: 0.4, x: 10, y: 60 },
  { text: "Hi, 3 suits ready by Saturday?", delay: 0.8, x: -30, y: 120 },
];

function DashboardMockup() {
  return (
    <div className="relative w-full max-w-md mx-auto">
      <div className="absolute -inset-4 bg-gradient-to-br from-emerald-400/20 to-teal-400/10 rounded-3xl blur-2xl" />
      <div className="relative bg-white/90 backdrop-blur-xl rounded-2xl border border-emerald-100 shadow-2xl shadow-emerald-100/50 p-5 space-y-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest" style={inter}>Live Dashboard</span>
          <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Live
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {[
            { label: "Pending Payments", value: "₹12,400", icon: Wallet, color: "text-amber-600", bg: "bg-amber-50", trend: "+8%" },
            { label: "Orders Today", value: "24", icon: Package, color: "text-blue-600", bg: "bg-blue-50", trend: "+12%" },
            { label: "Inventory Items", value: "148", icon: RefreshCw, color: "text-purple-600", bg: "bg-purple-50", trend: "Low: 3" },
            { label: "Monthly Profit", value: "₹34,800", icon: TrendingUp, color: "text-emerald-600", bg: "bg-emerald-50", trend: "+23%" },
          ].map((m) => (
            <div key={m.label} className="bg-white rounded-xl border border-gray-100 p-3 hover:border-emerald-200 transition-colors">
              <div className={`w-7 h-7 rounded-lg ${m.bg} flex items-center justify-center mb-2`}>
                <m.icon className={`w-3.5 h-3.5 ${m.color}`} />
              </div>
              <p className="text-[10px] text-gray-400 font-medium mb-0.5" style={inter}>{m.label}</p>
              <p className="text-base font-bold text-gray-900" style={jakarta}>{m.value}</p>
              <p className="text-[10px] text-emerald-600 font-semibold" style={inter}>{m.trend}</p>
            </div>
          ))}
        </div>

        <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl p-3 border border-emerald-100">
          <p className="text-[10px] text-gray-400 font-medium mb-1" style={inter}>Customer Growth</p>
          <div className="flex items-end gap-1 h-10">
            {[40, 55, 48, 70, 62, 85, 90].map((h, i) => (
              <div key={i} className="flex-1 bg-emerald-400/60 rounded-sm" style={{ height: `${h}%` }} />
            ))}
          </div>
        </div>
      </div>

      {waBubbles.map((b, i) => (
        <motion.div
          key={i}
          className="absolute -left-32 bg-white/95 backdrop-blur rounded-2xl border border-emerald-100 shadow-lg px-3 py-2 max-w-[180px]"
          style={{ top: b.y, ...inter }}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0, y: [0, -6, 0] }}
          transition={{ delay: b.delay + 0.6, duration: 0.5, y: { duration: 3, repeat: Infinity, ease: "easeInOut", delay: b.delay } }}
        >
          <div className="flex items-center gap-1.5 mb-0.5">
            <div className="w-4 h-4 rounded-full bg-[#25d366] flex items-center justify-center">
              <MessageCircle className="w-2.5 h-2.5 text-white" />
            </div>
            <span className="text-[9px] font-bold text-[#25d366]">WhatsApp</span>
          </div>
          <p className="text-[10px] text-gray-700 font-medium leading-snug">{b.text}</p>
          <motion.div
            className="mt-1.5 h-0.5 bg-gradient-to-r from-emerald-400 to-teal-400 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: "100%" }}
            transition={{ delay: b.delay + 1.2, duration: 0.6 }}
          />
          <p className="text-[9px] text-emerald-600 font-semibold mt-0.5">→ Auto-processed</p>
        </motion.div>
      ))}
    </div>
  );
}

function HeroSection() {
  return (
    <section id="home" className="relative min-h-screen flex items-center pt-16 overflow-hidden bg-[#f8fffc]">
      <GradientOrbs />
      <div className="relative max-w-7xl mx-auto px-5 sm:px-8 w-full py-20">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <motion.div initial="hidden" animate="visible" variants={stagger}>
            <motion.div variants={fadeUp}>
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold mb-6" style={inter}>
                <Sparkles className="w-3 h-3" />
                AI-Powered Business OS for India
              </span>
            </motion.div>

            <motion.h1
              variants={fadeUp}
              className="text-4xl sm:text-5xl lg:text-[3.5rem] font-extrabold leading-[1.12] text-[#0a1628] mb-6"
              style={jakarta}
            >
              Run Your Entire{" "}
              <span className="relative">
                <span className="relative z-10 text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-500">
                  Business From
                </span>
              </span>{" "}
              WhatsApp.{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-500 to-emerald-600">
                AI Handles
              </span>{" "}
              Everything Else.
            </motion.h1>

            <motion.p variants={fadeUp} className="text-gray-500 text-lg leading-relaxed mb-8 max-w-xl" style={inter}>
              BusinessOS AI automatically converts WhatsApp chats, voice notes, payment screenshots and product photos into invoices, inventory, customer records and sales analytics — with almost zero manual data entry.
            </motion.p>

            <motion.div variants={fadeUp} className="flex flex-wrap gap-3">
              <button className="px-6 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg shadow-emerald-200/60 transition-all hover:-translate-y-0.5 active:scale-95 flex items-center gap-2" style={jakarta}>
                Start Free
                <ArrowRight className="w-4 h-4" />
              </button>
              <button className="px-6 py-3.5 bg-white hover:bg-emerald-50 border border-emerald-200 text-gray-700 font-semibold rounded-xl transition-all hover:-translate-y-0.5 flex items-center gap-2" style={jakarta}>
                <Play className="w-4 h-4 text-emerald-600" />
                Watch 
              </button>
            </motion.div>

            <motion.div variants={fadeUp} className="flex items-center gap-4 mt-8">
              <div className="flex -space-x-2">
                {["bg-amber-400", "bg-pink-400", "bg-violet-400", "bg-teal-400"].map((c, i) => (
                  <div key={i} className={`w-8 h-8 rounded-full ${c} border-2 border-white flex items-center justify-center`}>
                    <span className="text-white text-[10px] font-bold">{["P", "N", "A", "R"][i]}</span>
                  </div>
                ))}
              </div>
              <div style={inter}>
                <div className="flex items-center gap-0.5">
                  {[...Array(5)].map((_, i) => <Star key={i} className="w-3 h-3 fill-amber-400 text-amber-400" />)}
                </div>
                <p className="text-[11px] text-gray-400 font-medium">Trusted by 5,000+ entrepreneurs</p>
              </div>
            </motion.div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
            className="hidden lg:flex justify-center pl-12"
          >
            <DashboardMockup />
          </motion.div>
        </div>
      </div>
    </section>
  );
}

// ─── Stats ────────────────────────────────────────────────────────────────────

function StatCard({ label, target, suffix, decimals = 0, active }: { label: string; target: number; suffix: string; decimals?: number; active: boolean }) {
  const val = useAnimatedCounter(target, active);
  return (
    <div className="text-center p-6 rounded-2xl bg-white border border-emerald-100 shadow-sm hover:shadow-md hover:border-emerald-200 transition-all">
      <div className="text-4xl font-extrabold text-[#0a1628] mb-1" style={jakarta}>
        {val.toLocaleString("en-IN")}{suffix}
      </div>
      <p className="text-sm text-gray-500 font-medium" style={inter}>{label}</p>
    </div>
  );
}

function StatsSection() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });

  const stats = [
    { label: "Women Entrepreneurs", target: 100, suffix: "M+" },
    { label: "Manual Work Reduced", target: 95, suffix: "%" },
    { label: "Orders Processed", target: 5000, suffix: "+" },
    { label: "AI Extraction Accuracy", target: 99, suffix: "%" },
  ];

  return (
    <section ref={ref} className="py-16 bg-gradient-to-b from-[#f8fffc] to-white">
      <div className="max-w-7xl mx-auto px-5 sm:px-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((s) => (
            <StatCard key={s.label} {...s} active={inView} />
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Problem ──────────────────────────────────────────────────────────────────

const problems = [
  { icon: MessageCircle, title: "WhatsApp Orders", desc: "Lost in chat threads, no records" },
  { icon: Wallet, title: "UPI Payments", desc: "No automatic reconciliation" },
  { icon: BookOpen, title: "Paper Notebooks", desc: "Illegible, easy to lose data" },
  
  { icon: Package, title: "No Inventory Tracking", desc: "Stockouts hurt daily sales" },
  
];

function ProblemSection() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section id="features" ref={ref} className="py-16 bg-white">
      <div className="max-w-7xl mx-auto px-5 sm:px-8">
        <motion.div initial="hidden" animate={inView ? "visible" : "hidden"} variants={stagger} className="text-center mb-14">
          <motion.div variants={fadeUp}>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-50 border border-red-100 text-red-600 text-xs font-semibold mb-4" style={inter}>
              <AlertTriangle className="w-3 h-3" /> The Problem
            </span>
          </motion.div>
          <motion.h2 variants={fadeUp} className="text-3xl sm:text-4xl font-extrabold text-[#0a1628] max-w-2xl mx-auto leading-tight" style={jakarta}>
            Running a Small Business Shouldn't Mean Managing Everything Manually.
          </motion.h2>
        </motion.div>

        <motion.div
          initial="hidden"
          animate={inView ? "visible" : "hidden"}
          variants={stagger}
          className="grid grid-cols-2 md:grid-cols-4 gap-4"
        >
          {problems.map((p) => (
            <motion.div
              key={p.title}
              variants={fadeUp}
              className="group p-5 rounded-2xl bg-red-50/60 border border-red-100 hover:border-red-200 hover:bg-red-50 transition-all hover:-translate-y-1"
            >
              <div className="w-9 h-9 rounded-xl bg-red-100 flex items-center justify-center mb-3">
                <p.icon className="w-4.5 h-4.5 text-red-500 w-[18px] h-[18px]" />
              </div>
              <h3 className="text-sm font-bold text-gray-800 mb-1" style={jakarta}>{p.title}</h3>
              <p className="text-xs text-gray-400 leading-relaxed" style={inter}>{p.desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

// ─── Solution ─────────────────────────────────────────────────────────────────

const inputs = [
  { icon: MessageCircle, label: "WhatsApp Chat", color: "#25d366" },
  { icon: Mic, label: "Voice Note", color: "#6366f1" },
  { icon: Camera, label: "Payment Screenshot", color: "#f59e0b" },
  { icon: ImageIcon, label: "Product Photo", color: "#0d9488" },
];

const outputs = [
  { icon: FileText, label: "Invoice" },
  { icon: Package, label: "Inventory" },
  { icon: Users, label: "Customer DB" },
  { icon: BarChart2, label: "Analytics" },
  { icon: DollarSign, label: "Cash Flow" },
  { icon: TrendingUp, label: "Profit Report" },
  { icon: Bell, label: "Reminders" },
];

function SolutionSection() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section id="solution" ref={ref} className="py- bg-gradient-to-b from-white to-[#f0fdf9] overflow-hidden">
      <div className="max-w-7xl mx-auto px-5 sm:px-8">
        <motion.div initial="hidden" animate={inView ? "visible" : "hidden"} variants={stagger} className="text-center mb-16">
          <motion.div variants={fadeUp}>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold mb-4" style={inter}>
              <Brain className="w-3 h-3" /> The Solution
            </span>
          </motion.div>
          <motion.h2 variants={fadeUp} className="text-3xl sm:text-4xl font-extrabold text-[#0a1628]" style={jakarta}>
            Meet Your AI Business Operating System
          </motion.h2>
          <motion.p variants={fadeUp} className="text-gray-500 mt-3 max-w-lg mx-auto text-base" style={inter}>
            Everything flows in, structured business data flows out — automatically.
          </motion.p>
        </motion.div>

        <div className="relative flex flex-col items-center gap-6 md:flex-row md:justify-center md:items-center md:gap-4 lg:gap-8">
          {/* Inputs */}
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6 }}
            className="flex flex-col gap-3 w-full max-w-[160px]"
          >
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest text-center mb-1" style={inter}>Inputs</p>
            {inputs.map((inp, i) => (
              <motion.div
                key={inp.label}
                initial={{ opacity: 0, x: -20 }}
                animate={inView ? { opacity: 1, x: 0 } : {}}
                transition={{ delay: 0.1 * i + 0.3 }}
                className="flex items-center gap-2.5 px-4 py-3 bg-white rounded-xl border border-emerald-100 shadow-sm"
              >
                <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: inp.color + "20" }}>
                  <inp.icon className="w-3.5 h-3.5" style={{ color: inp.color }} />
                </div>
                <span className="text-xs font-semibold text-gray-700" style={inter}>{inp.label}</span>
              </motion.div>
            ))}
          </motion.div>

          {/* Arrow Left */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={inView ? { opacity: 1 } : {}}
            transition={{ delay: 0.7 }}
            className="flex flex-col items-center gap-1 hidden md:flex"
          >
            {[...Array(5)].map((_, i) => (
              <motion.div
                key={i}
                className="w-1.5 h-1.5 rounded-full bg-emerald-400"
                animate={{ opacity: [0.3, 1, 0.3], x: [0, 4, 0] }}
                transition={{ duration: 1, repeat: Infinity, delay: i * 0.15 }}
              />
            ))}
          </motion.div>

          {/* Brain */}
          <motion.div
            initial={{ opacity: 0, scale: 0.7 }}
            animate={inView ? { opacity: 1, scale: 1 } : {}}
            transition={{ duration: 0.7, delay: 0.5 }}
            className="relative flex-shrink-0"
          >
            <div className="w-36 h-36 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-2xl shadow-emerald-300/40">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                className="absolute inset-2 rounded-full border-2 border-white/20 border-dashed"
              />
              <div className="text-center">
                <Brain className="w-10 h-10 text-white mx-auto mb-1" />
                <span className="text-white text-[10px] font-bold uppercase tracking-widest" style={inter}>AI Brain</span>
              </div>
            </div>
            <div className="absolute -inset-4 rounded-full bg-emerald-400/15 blur-xl" />
          </motion.div>

          {/* Arrow Right */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={inView ? { opacity: 1 } : {}}
            transition={{ delay: 0.9 }}
            className="flex flex-col items-center gap-1 hidden md:flex"
          >
            {[...Array(5)].map((_, i) => (
              <motion.div
                key={i}
                className="w-1.5 h-1.5 rounded-full bg-teal-400"
                animate={{ opacity: [0.3, 1, 0.3], x: [0, 4, 0] }}
                transition={{ duration: 1, repeat: Infinity, delay: i * 0.15 + 0.5 }}
              />
            ))}
          </motion.div>

          {/* Outputs */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="grid grid-cols-2 gap-2.5 w-full max-w-[200px]"
          >
            <p className="col-span-2 text-xs font-bold text-gray-400 uppercase tracking-widest text-center mb-1" style={inter}>Outputs</p>
            {outputs.map((out, i) => (
              <motion.div
                key={out.label}
                initial={{ opacity: 0, x: 20 }}
                animate={inView ? { opacity: 1, x: 0 } : {}}
                transition={{ delay: 0.1 * i + 0.5 }}
                className="flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl border border-emerald-100"
              >
                <out.icon className="w-3 h-3 text-emerald-600 flex-shrink-0" />
                <span className="text-[10px] font-semibold text-gray-700" style={inter}>{out.label}</span>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}

// ─── How It Works ─────────────────────────────────────────────────────────────

const steps = [
  {
    n: "01", title: "Receive Order", color: "from-emerald-500 to-emerald-600",
    desc: "Customer sends a WhatsApp message with their order details in any language.",
    items: [],
  },
  {
    n: "02", title: "AI Understands", color: "from-teal-500 to-emerald-500",
    desc: "GPT extracts customer name, products, quantity, amount and payment status instantly.",
    items: [],
  },
  {
    n: "03", title: "Business Updates Automatically", color: "from-violet-500 to-teal-500",
    desc: "Your business records update in real-time without any manual input from you.",
    items: ["Inventory updated", "Invoice generated", "Customer saved", "Analytics updated"],
  },
  {
    n: "04", title: "Merchant Confirms", color: "from-amber-500 to-emerald-500",
    desc: "You get a WhatsApp summary — just reply YES to confirm or EDIT to modify.",
    items: [],
  },
];

function HowItWorksSection() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section id="how-it-works" ref={ref} className="py-16 bg-white">
      <div className="max-w-5xl mx-auto px-5 sm:px-8">
        <motion.div initial="hidden" animate={inView ? "visible" : "hidden"} variants={stagger} className="text-center mb-16">
          <motion.div variants={fadeUp}>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold mb-4" style={inter}>
              <ChevronRight className="w-3 h-3" /> How It Works
            </span>
          </motion.div>
          <motion.h2 variants={fadeUp} className="text-3xl sm:text-4xl font-extrabold text-[#0a1628]" style={jakarta}>
            Four Steps. Zero Effort.
          </motion.h2>
        </motion.div>

        <div className="relative">
          <div className="absolute left-6 md:left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-emerald-200 via-teal-200 to-emerald-100 md:-translate-x-px" />

          <div className="space-y-12">
            {steps.map((s, i) => (
              <motion.div
                key={s.n}
                initial={{ opacity: 0, x: i % 2 === 0 ? -30 : 30 }}
                animate={inView ? { opacity: 1, x: 0 } : {}}
                transition={{ duration: 0.6, delay: i * 0.15 }}
                className={`flex gap-6 md:gap-0 ${i % 2 === 0 ? "md:flex-row" : "md:flex-row-reverse"}`}
              >
                <div className={`flex-1 ${i % 2 === 0 ? "md:pr-12 md:text-right" : "md:pl-12"}`}>
                  <div className={`inline-block p-5 rounded-2xl bg-white border border-emerald-100 shadow-sm hover:shadow-md transition-shadow ${i % 2 === 0 ? "" : ""}`}>
                    <p className={`text-xs font-extrabold mb-1 text-transparent bg-clip-text bg-gradient-to-r ${s.color}`} style={inter}>Step {s.n}</p>
                    <h3 className="text-lg font-bold text-[#0a1628] mb-2" style={jakarta}>{s.title}</h3>
                    <p className="text-sm text-gray-500 leading-relaxed" style={inter}>{s.desc}</p>
                    {s.items.length > 0 && (
                      <ul className={`mt-3 space-y-1 ${i % 2 === 0 ? "md:items-end" : ""}`}>
                        {s.items.map((item) => (
                          <li key={item} className="flex items-center gap-2 text-xs text-gray-600" style={inter}>
                            <Check className="w-3 h-3 text-emerald-500 flex-shrink-0" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>

                <div className="flex-shrink-0 relative z-10">
                  <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${s.color} flex items-center justify-center shadow-lg`}>
                    <span className="text-white font-extrabold text-sm" style={jakarta}>{s.n}</span>
                  </div>
                </div>

                <div className="flex-1 hidden md:block" />
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Features ─────────────────────────────────────────────────────────────────

const features = [
  { icon: MessageCircle, title: "AI WhatsApp Assistant", desc: "Automatically converts chats into structured orders.", color: "#25d366" },
  { icon: Mic, title: "Voice Note Intelligence", desc: "Supports Hindi, Hinglish and English voice notes.", color: "#6366f1" },
 
  { icon: FileText, title: "Auto Invoice Generator", desc: "Creates professional PDF invoices instantly.", color: "#059669" },
  { icon: Package, title: "Live Inventory Tracking", desc: "Automatically updates stock after every order.", color: "#0d9488" },
  { icon: Users, title: "Customer CRM", desc: "Tracks repeat buyers and complete purchase history.", color: "#8b5cf6" },
  { icon: BarChart2, title: "Sales Analytics", desc: "Revenue, profit, repeat customers and trends.", color: "#059669" },
  
  
  
  { icon: PiggyBank, title: "Funding Recommendations", desc: "Suggests government schemes and micro-loans.", color: "#6366f1" },
  { icon: Network, title: "Peer Network", desc: "Connects women entrepreneurs with mentors and suppliers.", color: "#25d366" },
];

function FeaturesSection() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });

  return (
    <section id="features-list" ref={ref} className="py-16 bg-gradient-to-b from-[#f0fdf9] to-white">
      <div className="max-w-7xl mx-auto px-5 sm:px-8">
        <motion.div initial="hidden" animate={inView ? "visible" : "hidden"} variants={stagger} className="text-center mb-14">
          <motion.div variants={fadeUp}>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold mb-4" style={inter}>
              <Zap className="w-3 h-3" /> 12 Powerful Features
            </span>
          </motion.div>
          <motion.h2 variants={fadeUp} className="text-3xl sm:text-4xl font-extrabold text-[#0a1628]" style={jakarta}>
            Everything Your Business Needs
          </motion.h2>
          <motion.p variants={fadeUp} className="text-gray-500 mt-3 max-w-md mx-auto text-base" style={inter}>
            One platform. Every tool your small business needs to run on autopilot.
          </motion.p>
        </motion.div>

        <motion.div
          initial="hidden"
          animate={inView ? "visible" : "hidden"}
          variants={stagger}
          className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
        >
          {features.map((f) => (
            <motion.div
              key={f.title}
              variants={fadeUp}
              className="group p-5 bg-white rounded-2xl border border-emerald-50 shadow-sm hover:shadow-lg hover:border-emerald-200 transition-all hover:-translate-y-1 cursor-pointer"
              style={{ boxShadow: "0 1px 3px rgba(5,150,105,0.05)" }}
              whileHover={{ boxShadow: `0 8px 30px ${f.color}20` }}
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110"
                style={{ background: f.color + "15" }}
              >
                <f.icon className="w-5 h-5" style={{ color: f.color }} />
              </div>
              <h3 className="text-sm font-bold text-[#0a1628] mb-1.5 leading-snug" style={jakarta}>{f.title}</h3>
              <p className="text-xs text-gray-400 leading-relaxed" style={inter}>{f.desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

// ─── Premium ──────────────────────────────────────────────────────────────────

const premiumFeats = [
  "Unlimited AI Parsing",
  "Unlimited Voice Notes",
  "Advanced Analytics",
  "Loan Passport",
  "Funding Recommendations",
  "Inventory Intelligence",
  "Priority Support",
];

function PremiumSection() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section id="pricing" ref={ref} className="py-24 bg-[#0a1628] relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none" aria-hidden>
        <div className="absolute w-[500px] h-[500px] rounded-full opacity-20 blur-3xl top-0 right-0" style={{ background: "radial-gradient(circle, #059669, transparent)" }} />
        <div className="absolute w-[400px] h-[400px] rounded-full opacity-10 blur-3xl bottom-0 left-0" style={{ background: "radial-gradient(circle, #0d9488, transparent)" }} />
      </div>

      <div className="relative max-w-3xl mx-auto px-5 sm:px-8 text-center">
        <motion.div initial="hidden" animate={inView ? "visible" : "hidden"} variants={stagger}>
          <motion.div variants={fadeUp}>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-semibold mb-6" style={inter}>
              <Sparkles className="w-3 h-3" /> Premium Plan
            </span>
          </motion.div>
          <motion.h2 variants={fadeUp} className="text-3xl sm:text-4xl font-extrabold text-white mb-4" style={jakarta}>
            Unlock BusinessOS AI{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300">Premium</span>
          </motion.h2>
          <motion.p variants={fadeUp} className="text-gray-400 text-base mb-10" style={inter}>
            Everything you need to grow your business with full AI power.
          </motion.p>

          <motion.div
            variants={fadeUp}
            className="relative bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 p-8 sm:p-10 text-left"
          >
            <div className="absolute -top-px inset-x-8 h-px bg-gradient-to-r from-transparent via-emerald-400/50 to-transparent" />

            <div className="flex flex-col sm:flex-row sm:items-end gap-4 mb-8">
              <div>
                <div className="flex items-baseline gap-1">
                  <span className="text-5xl font-extrabold text-white" style={jakarta}>₹299</span>
                  <span className="text-gray-400 text-sm" style={inter}>/month</span>
                </div>
                <p className="text-gray-500 text-xs mt-1" style={inter}>Save 40% vs. annual billing · Cancel anytime</p>
              </div>
              <div className="sm:ml-auto">
                <span className="px-3 py-1 bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-bold rounded-full" style={inter}>
                  Most Popular
                </span>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-3 mb-8">
              {premiumFeats.map((f) => (
                <div key={f} className="flex items-center gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                    <Check className="w-3 h-3 text-emerald-400" />
                  </div>
                  <span className="text-gray-300 text-sm font-medium" style={inter}>{f}</span>
                </div>
              ))}
            </div>

            <button className="w-full py-4 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-bold rounded-xl text-base transition-all hover:-translate-y-0.5 active:scale-98 shadow-lg shadow-emerald-500/25" style={jakarta}>
              Upgrade to Premium →
            </button>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

// ─── Testimonials ─────────────────────────────────────────────────────────────

const testimonials = [
  { name: "Priya Sharma", role: "Home Baker, Jaipur", quote: "My bookkeeping now happens automatically. I used to spend 2 hours every night updating orders — now it's done before I even check my phone.", avatar: "PS", color: "bg-amber-400" },
  { name: "Neha Gupta", role: "Boutique Owner, Delhi", quote: "I save hours every week and never lose track of pending payments. BusinessOS AI is the best thing that happened to my boutique.", avatar: "NG", color: "bg-pink-400" },
  { name: "Ayesha Khan", role: "Beautician, Mumbai", quote: "I never forget pending payments anymore. The reminders go out automatically and my clients actually pay faster now.", avatar: "AK", color: "bg-violet-400" },
  { name: "Ritu Verma", role: "Tailor, Pune", quote: "Voice notes in Hindi work perfectly. My entire order book is now digital without me having to type a single word.", avatar: "RV", color: "bg-teal-400" },
  { name: "Sunita Patel", role: "Instagram Seller, Ahmedabad", quote: "The invoice generator alone is worth it. My customers trust me more now because I send professional bills instantly.", avatar: "SP", color: "bg-emerald-400" },
  { name: "Kavya Reddy", role: "Tutor, Hyderabad", quote: "I can now see which students have paid and who hasn't at a glance. My cash flow has improved dramatically.", avatar: "KR", color: "bg-blue-400" },
];

function TestimonialsSection() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const doubledTestimonials = [...testimonials, ...testimonials];

  return (
    <section id="testimonials" ref={ref} className="py-16 bg-white overflow-hidden">
      <style>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .marquee-track { animation: marquee 28s linear infinite; }
        .marquee-track:hover { animation-play-state: paused; }
      `}</style>

      <div className="max-w-7xl mx-auto px-5 sm:px-8 mb-12">
        <motion.div initial="hidden" animate={inView ? "visible" : "hidden"} variants={stagger} className="text-center">
          <motion.div variants={fadeUp}>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-xs font-semibold mb-4" style={inter}>
              <Star className="w-3 h-3 fill-amber-500 text-amber-500" /> 5-Star Reviews
            </span>
          </motion.div>
          <motion.h2 variants={fadeUp} className="text-3xl sm:text-4xl font-extrabold text-[#0a1628]" style={jakarta}>
            Loved by Entrepreneurs Across India
          </motion.h2>
        </motion.div>
      </div>

      <div className="relative">
        <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-white to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-white to-transparent z-10 pointer-events-none" />
        <div className="flex">
          <div className="marquee-track flex gap-5 w-max">
            {doubledTestimonials.map((t, i) => (
              <div key={i} className="flex-shrink-0 w-72 p-5 bg-white rounded-2xl border border-emerald-100 shadow-sm hover:shadow-md hover:border-emerald-200 transition-all">
                <div className="flex items-center gap-0.5 mb-3">
                  {[...Array(5)].map((_, j) => <Star key={j} className="w-3 h-3 fill-amber-400 text-amber-400" />)}
                </div>
                <p className="text-sm text-gray-600 leading-relaxed mb-4 italic" style={inter}>"{t.quote}"</p>
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-full ${t.color} flex items-center justify-center`}>
                    <span className="text-white text-xs font-bold" style={jakarta}>{t.avatar}</span>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-[#0a1628]" style={jakarta}>{t.name}</p>
                    <p className="text-xs text-gray-400" style={inter}>{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ───  ─────────────────────────────────────────────────────────────────────

function Section() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section id="" ref={ref} className="py-16 bg-gradient-to-b from-white to-[#f0fdf9]">
      <div className="max-w-4xl mx-auto px-5 sm:px-8">
        <motion.div initial="hidden" animate={inView ? "visible" : "hidden"} variants={stagger} className="text-center mb-10">
          <motion.div variants={fadeUp}>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold mb-4" style={inter}>
              <Play className="w-3 h-3" /> Live 
            </span>
          </motion.div>
          <motion.h2 variants={fadeUp} className="text-3xl sm:text-4xl font-extrabold text-[#0a1628]" style={jakarta}>
            See It In Action
          </motion.h2>
          <motion.p variants={fadeUp} className="text-gray-500 mt-3 max-w-md mx-auto text-base" style={inter}>
            Watch how a WhatsApp message becomes a complete business record in under 3 seconds.
          </motion.p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7 }}
          className="relative rounded-3xl overflow-hidden bg-[#0a1628] aspect-video flex items-center justify-center group cursor-pointer shadow-2xl shadow-emerald-100/50 border border-emerald-100"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-900/40 to-teal-900/40" />
          <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "radial-gradient(circle at 20% 50%, #059669 0%, transparent 50%), radial-gradient(circle at 80% 20%, #0d9488 0%, transparent 50%)" }} />

          <div className="relative flex flex-col items-center gap-4">
            <div className="w-20 h-20 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center group-hover:scale-110 transition-transform shadow-xl">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-emerald-500 to-teal-400 flex items-center justify-center">
                <Play className="w-7 h-7 text-white fill-white translate-x-0.5" />
              </div>
            </div>
            <p className="text-white/70 text-sm font-medium" style={inter}>Click to watch 2-minute </p>
          </div>

          <div className="absolute bottom-6 left-6 flex items-center gap-2">
            <div className="flex -space-x-1">
              {["bg-amber-400", "bg-pink-400", "bg-teal-400"].map((c, i) => (
                <div key={i} className={`w-6 h-6 rounded-full ${c} border-2 border-white/20`} />
              ))}
            </div>
            <span className="text-white/60 text-xs" style={inter}>5,000+ entrepreneurs watched this</span>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

// ─── CTA ──────────────────────────────────────────────────────────────────────

function CTASection() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section ref={ref} className="py-16 bg-white">
      <div className="max-w-4xl mx-auto px-5 sm:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7 }}
          className="relative rounded-3xl bg-gradient-to-br from-emerald-600 via-emerald-500 to-teal-500 p-12 sm:p-16 text-center overflow-hidden"
        >
          <div className="absolute inset-0 pointer-events-none" aria-hidden>
            <div className="absolute w-64 h-64 rounded-full bg-white/10 blur-3xl -top-16 -left-16" />
            <div className="absolute w-64 h-64 rounded-full bg-teal-300/20 blur-3xl -bottom-16 -right-16" />
          </div>
          <div className="relative">
            <Sparkles className="w-8 h-8 text-white/60 mx-auto mb-4" />
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-4 leading-tight" style={jakarta}>
              Ready to Let AI Run Your Business?
            </h2>
            <p className="text-emerald-100 text-base mb-8 max-w-lg mx-auto" style={inter}>
              Join 5,000+ women entrepreneurs who have already automated their business operations with BusinessOS AI.
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <button className="px-8 py-4 bg-white hover:bg-emerald-50 text-emerald-700 font-bold rounded-xl text-base shadow-lg transition-all hover:-translate-y-0.5 active:scale-95" style={jakarta}>
                Get Started Free
              </button>
              <button className="px-8 py-4 bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/30 text-white font-bold rounded-xl text-base transition-all hover:-translate-y-0.5" style={jakarta}>
                Book a 
              </button>
            </div>
            <p className="text-emerald-200 text-xs mt-5" style={inter}>No credit card required · Free 14-day trial · Cancel anytime</p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

// ─── Footer ───────────────────────────────────────────────────────────────────

function Footer() {
  return (
    <footer className="bg-[#0a1628] text-gray-400 py-16">
      <div className="max-w-7xl mx-auto px-5 sm:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
                <Zap className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-white text-[17px]" style={jakarta}>
                BusinessOS<span className="text-emerald-400"> AI</span>
              </span>
            </div>
            <p className="text-sm leading-relaxed max-w-xs" style={inter}>
              The AI-powered business operating system built for India's 100 million informal entrepreneurs.
            </p>
            <div className="flex gap-3 mt-5">
              {[Twitter, Linkedin, Instagram, Mail].map((Icon, i) => (
                <button key={i} className="w-9 h-9 rounded-lg bg-white/5 hover:bg-emerald-500/20 border border-white/10 hover:border-emerald-500/30 flex items-center justify-center transition-all">
                  <Icon className="w-4 h-4" />
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-bold text-white uppercase tracking-widest mb-4" style={inter}>Quick Links</p>
            <ul className="space-y-2.5" style={inter}>
              {["Features", "Testimonials", "", ].map((l) => (
                <li key={l}>
                  <a href={`#${l.toLowerCase()}`} className="text-sm hover:text-emerald-400 transition-colors">
                    {l}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-xs font-bold text-white uppercase tracking-widest mb-4" style={inter}>Legal</p>
            <ul className="space-y-2.5" style={inter}>
              {["Privacy Policy", "Terms of Service", "Contact Us"].map((l) => (
                <li key={l}>
                  <a href="#" className="text-sm hover:text-emerald-400 transition-colors">{l}</a>
                </li>
              ))}
            </ul>
            <div className="mt-6 space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Mail className="w-3.5 h-3.5 text-emerald-500" />
                <span style={inter}>hello@businessos.ai</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Phone className="w-3.5 h-3.5 text-emerald-500" />
                <span style={inter}>+91 98765 43210</span>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-white/5 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs" style={inter}>© 2025 BusinessOS AI. All rights reserved. Made with ❤️ for Indian entrepreneurs.</p>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs text-emerald-400 font-medium" style={inter}>All systems operational</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────

export default function App() {
  return (
    <div className="bg-[#f8fffc]" style={inter}>
      <Navbar />
      <main>
        <HeroSection />
        <StatsSection />
        <ProblemSection />
        <SolutionSection />
        <HowItWorksSection />
        <FeaturesSection />
       
        <TestimonialsSection />
        <Section />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
}
