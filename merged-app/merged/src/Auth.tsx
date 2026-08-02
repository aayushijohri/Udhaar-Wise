import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./contexts/AuthContext";
import {
  Eye,
  EyeOff,
  Mail,
  Lock,
  User,
  Building2,
  Phone,
  ChevronDown,
  Check,
  ArrowRight,
  Sparkles,
  TrendingUp,
  Package,
  FileText,
  MessageCircle,
  X,
} from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────────────────
type Tab = "login" | "signup";

// ─── Business Categories ─────────────────────────────────────────────────────
const CATEGORIES = [
  "Home Baker",
  "Boutique",
  "Tailor",
  "Beautician",
  "Tutor",
  "Artisan",
  "Instagram Seller",
  "Other",
];

// ─── Password Strength ───────────────────────────────────────────────────────
function getPasswordStrength(pw: string): { score: number; label: string; color: string } {
  if (!pw) return { score: 0, label: "", color: "" };
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  const labels = ["Weak", "Fair", "Good", "Strong"];
  const colors = ["#ef4444", "#f59e0b", "#10b981", "#059669"];
  return { score, label: labels[score - 1] ?? "", color: colors[score - 1] ?? "#ef4444" };
}

// ─── Left Panel — Dashboard Mockup ───────────────────────────────────────────
function DashboardMockup() {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 2500);
    return () => clearInterval(id);
  }, []);

  const revenues = ["₹12,400", "₹18,750", "₹21,320", "₹15,900"];
  const revenueLabel = revenues[tick % revenues.length];

  return (
    <div className="relative w-full max-w-[420px] mx-auto">
      {/* Main dashboard card */}
      <motion.div
        className="glass-dark rounded-2xl p-5 shadow-2xl"
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center">
              <Sparkles className="w-3 h-3 text-white" />
            </div>
            <span className="text-white text-xs font-semibold tracking-wide">BusinessOS AI</span>
          </div>
          <div className="flex gap-1">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-emerald-400 text-[10px] font-medium">Live</span>
          </div>
        </div>

        {/* Revenue card */}
        <div className="rounded-xl p-4 mb-3" style={{ background: "rgba(5,150,105,0.2)", border: "1px solid rgba(16,185,129,0.25)" }}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-emerald-300 text-[11px] font-medium flex items-center gap-1">
              <TrendingUp className="w-3 h-3" /> Monthly Revenue
            </span>
            <span className="text-emerald-400 text-[10px]">+23.4%</span>
          </div>
          <AnimatePresence mode="wait">
            <motion.div
              key={revenueLabel}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="text-white text-2xl font-bold"
            >
              {revenueLabel}
            </motion.div>
          </AnimatePresence>
          {/* Mini bar chart */}
          <div className="flex items-end gap-1 mt-3 h-10">
            {[40, 65, 45, 80, 55, 90, 70, 85, 60, 95, 75, 100].map((h, i) => (
              <motion.div
                key={i}
                className="flex-1 rounded-sm"
                style={{
                  height: `${h}%`,
                  background: i === 11 ? "rgba(16,185,129,0.9)" : "rgba(16,185,129,0.35)",
                }}
                initial={{ scaleY: 0 }}
                animate={{ scaleY: 1 }}
                transition={{ delay: i * 0.04, duration: 0.4 }}
              />
            ))}
          </div>
        </div>

        {/* Row of mini cards */}
        <div className="grid grid-cols-3 gap-2 mb-3">
          {[
            { icon: FileText, label: "Invoices", value: "47", color: "#0D9488" },
            { icon: Package, label: "Stock", value: "312", color: "#6366f1" },
            { icon: MessageCircle, label: "WhatsApp", value: "89", color: "#25D366" },
          ].map(({ icon: Icon, label, value, color }) => (
            <div
              key={label}
              className="rounded-lg p-2.5 text-center"
              style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)" }}
            >
              <Icon className="w-3.5 h-3.5 mx-auto mb-1" style={{ color }} />
              <div className="text-white text-sm font-bold">{value}</div>
              <div className="text-white/40 text-[9px]">{label}</div>
            </div>
          ))}
        </div>

        {/* AI insight row */}
        <div
          className="rounded-lg p-3 flex items-center gap-2"
          style={{ background: "rgba(37,211,102,0.1)", border: "1px solid rgba(37,211,102,0.2)" }}
        >
          <div className="w-5 h-5 rounded-full bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-2.5 h-2.5 text-white" />
          </div>
          <div>
            <div className="text-white/90 text-[10px] font-medium">AI Insight</div>
            <div className="text-white/50 text-[9px]">Reorder masala dosa mix — runs out in 3 days</div>
          </div>
        </div>
      </motion.div>

      {/* Floating WhatsApp bubble 1 */}
      <motion.div
        className="absolute -left-6 top-10 glass-dark rounded-2xl px-3 py-2 shadow-lg"
        animate={{ y: [0, -6, 0], x: [0, 2, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
      >
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: "#25D366" }}>
            <MessageCircle className="w-3.5 h-3.5 text-white" />
          </div>
          <div>
            <div className="text-white text-[10px] font-semibold">New Order!</div>
            <div className="text-white/50 text-[9px]">Priya: 2 kg cake 🎂</div>
          </div>
        </div>
      </motion.div>

      {/* Floating invoice card */}
      <motion.div
        className="absolute -right-4 top-16 glass-dark rounded-xl px-3 py-2 shadow-lg"
        animate={{ y: [0, -10, 0] }}
        transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
      >
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-full bg-teal-500 flex items-center justify-center">
            <FileText className="w-2.5 h-2.5 text-white" />
          </div>
          <div>
            <div className="text-white text-[10px] font-semibold">INV-0892</div>
            <div className="text-emerald-400 text-[9px]">₹3,250 • Paid ✓</div>
          </div>
        </div>
      </motion.div>

      {/* Floating inventory */}
      <motion.div
        className="absolute -left-4 bottom-8 glass-dark rounded-xl px-3 py-2 shadow-lg"
        animate={{ y: [0, -7, 0] }}
        transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut", delay: 1.5 }}
      >
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-full bg-indigo-500 flex items-center justify-center">
            <Package className="w-2.5 h-2.5 text-white" />
          </div>
          <div>
            <div className="text-white text-[10px] font-semibold">Low Stock</div>
            <div className="text-amber-400 text-[9px]">Flour — 2 kg left</div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Stats Row ───────────────────────────────────────────────────────────────
function StatsRow() {
  const stats = [
    { value: "100M+", label: "Women Entrepreneurs" },
    { value: "95%", label: "Manual Work Reduced" },
    { value: "99%", label: "AI Extraction Accuracy" },
  ];
  return (
    <div className="flex gap-6 mt-8">
      {stats.map(({ value, label }, i) => (
        <motion.div
          key={label}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 + i * 0.1 }}
        >
          <div className="text-xl font-bold text-white">{value}</div>
          <div className="text-white/50 text-xs mt-0.5 leading-tight">{label}</div>
        </motion.div>
      ))}
    </div>
  );
}

// ─── Input Component ─────────────────────────────────────────────────────────
interface InputProps {
  label: string;
  type?: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  icon?: React.ReactNode;
  error?: string;
  rightElement?: React.ReactNode;
  valid?: boolean;
}

function Input({ label, type = "text", placeholder, value, onChange, icon, error, rightElement, valid }: InputProps) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-gray-600">{label}</label>
      <div className="relative">
        {icon && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">{icon}</span>
        )}
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`
            input-glow w-full rounded-xl px-4 py-2.5 text-sm bg-white/80 text-gray-800
            border transition-all duration-200 placeholder:text-gray-400
            ${icon ? "pl-9" : ""}
            ${rightElement ? "pr-10" : ""}
            ${error ? "border-red-300 bg-red-50/30" : valid ? "border-emerald-400" : "border-gray-200/80"}
          `}
        />
        {valid && !error && value && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2">
            <Check className="w-4 h-4 text-emerald-500" />
          </span>
        )}
        {rightElement && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2">{rightElement}</span>
        )}
      </div>
      <AnimatePresence>
        {error && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="text-xs text-red-500 flex items-center gap-1"
          >
            <X className="w-3 h-3" /> {error}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Social Button ───────────────────────────────────────────────────────────
function SocialButton({ children, icon, onClick }: { children: React.ReactNode; icon: React.ReactNode; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 hover:border-gray-300 text-gray-700 text-sm font-medium transition-all duration-200 hover:shadow-sm active:scale-[0.98]"
    >
      {icon}
      {children}
    </button>
  );
}

// ─── Login Form ───────────────────────────────────────────────────────────────
function LoginForm({ onSwitch }: { onSwitch: () => void }) {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!email.includes("@")) e.email = "Enter a valid email";
    if (password.length < 6) e.password = "Password must be 6+ characters";
    return e;
  };

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();

    const e = validate();
    if (Object.keys(e).length) {
      setErrors(e);
      return;
    }

    setErrors({});
    setLoading(true);

    const result = await login(email, password);

    setLoading(false);

    if (!result.success) {
      setErrors({ form: result.message ?? "Login failed. Please try again." });
      return;
    }

    // Temporarily redirect directly to Dashboard instead of WhatsApp setup page
    // navigate("/whatsapp");
    navigate("/dashboard");
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {errors.form && (
        <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
          {errors.form}
        </div>
      )}
      <Input
        label="Email Address"
        type="email"
        placeholder="you@example.com"
        value={email}
        onChange={setEmail}
        icon={<Mail className="w-4 h-4" />}
        error={errors.email}
        valid={email.includes("@")}
      />

      <div className="space-y-1">
        <Input
          label="Password"
          type={showPw ? "text" : "password"}
          placeholder="••••••••"
          value={password}
          onChange={setPassword}
          icon={<Lock className="w-4 h-4" />}
          error={errors.password}
          rightElement={
            <button
              type="button"
              onClick={() => setShowPw(!showPw)}
              className="text-gray-400 hover:text-gray-600"
            >
              {showPw ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          }
        />
      </div>

      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 cursor-pointer">
          <div
            onClick={() => setRemember(!remember)}
            className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all cursor-pointer ${
              remember
                ? "bg-emerald-500 border-emerald-500"
                : "border-gray-300"
            }`}
          >
            {remember && <Check className="w-2.5 h-2.5 text-white" />}
          </div>

          <span className="text-xs text-gray-600">Remember Me</span>
        </label>

        <button
          type="button"
          className="text-xs text-emerald-600 hover:text-emerald-700 font-medium hover:underline"
        >
          Forgot Password?
        </button>
      </div>

      <motion.button
        type="submit"
        disabled={loading}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.98 }}
        className="w-full py-3 rounded-xl font-semibold text-white text-sm flex items-center justify-center gap-2 transition-all duration-200 shadow-lg disabled:opacity-80"
        style={{
          background: loading
            ? "#059669"
            : "linear-gradient(135deg, #059669, #0D9488)",
        }}
      >
        {loading ? (
          <motion.div
            className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
            animate={{ rotate: 360 }}
            transition={{
              duration: 0.8,
              repeat: Infinity,
              ease: "linear",
            }}
          />
        ) : (
          <>
            Login <ArrowRight className="w-4 h-4" />
          </>
        )}
      </motion.button>

      <div className="relative flex items-center gap-3 py-1">
        <div className="flex-1 h-px bg-gray-200" />
        <span className="text-xs text-gray-400 font-medium">OR</span>
        <div className="flex-1 h-px bg-gray-200" />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <SocialButton icon={<GoogleIcon />}>Google</SocialButton>
        <SocialButton icon={<WhatsAppIcon />}>WhatsApp</SocialButton>
      </div>

      <p className="text-center text-xs text-gray-500">
        Don't have an account?{" "}
        <button
          type="button"
          onClick={onSwitch}
          className="text-emerald-600 font-semibold hover:underline"
        >
          Create Account
        </button>
      </p>
    </form>
  );
}

// ─── Signup Form ─────────────────────────────────────────────────────────────
function SignupForm({ onSwitch }: { onSwitch: () => void }) {
  const navigate = useNavigate();
  const { signup } = useAuth();
  const [fields, setFields] = useState({
    name: "", business: "", category: "", phone: "", email: "", password: "", confirm: "",
  });
  const [showPw, setShowPw] = useState(false);
  const [agree, setAgree] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [catOpen, setCatOpen] = useState(false);

  const set = (k: string) => (v: string) => setFields((f) => ({ ...f, [k]: v }));

  const strength = getPasswordStrength(fields.password);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!fields.name.trim()) e.name = "Name is required";
    if (!fields.business.trim()) e.business = "Business name is required";
    if (!fields.category) e.category = "Select a category";
    if (!/^\+?\d{10,}$/.test(fields.phone.replace(/\s/g, ""))) e.phone = "Valid phone required";
    if (!fields.email.includes("@")) e.email = "Valid email required";
    if (fields.password.length < 8) e.password = "Min 8 characters";
    if (fields.password !== fields.confirm) e.confirm = "Passwords don't match";
    if (!agree) e.agree = "Please agree to the Privacy Policy";
    return e;
  };

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setErrors({});
    setLoading(true);
    const result = await signup({
      name: fields.name,
      business: fields.business,
      category: fields.category,
      phone: fields.phone,
      email: fields.email,
      password: fields.password,
    });
    setLoading(false);
    if (!result.success) {
      setErrors({ form: result.message ?? "Signup failed. Please try again." });
      return;
    }
    // Temporarily redirect directly to Dashboard instead of WhatsApp setup page
    // navigate("/whatsapp");
    navigate("/dashboard");
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {errors.form && (
        <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
          {errors.form}
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        <Input label="Full Name" placeholder="Priya Sharma" value={fields.name} onChange={set("name")} icon={<User className="w-4 h-4" />} error={errors.name} valid={!!fields.name.trim()} />
        <Input label="Business Name" placeholder="Priya's Bakery" value={fields.business} onChange={set("business")} icon={<Building2 className="w-4 h-4" />} error={errors.business} valid={!!fields.business.trim()} />
      </div>

      {/* Category dropdown */}
      <div className="space-y-1 relative">
        <label className="text-xs font-medium text-gray-600">Business Category</label>
        <button
          type="button"
          onClick={() => setCatOpen(!catOpen)}
          className={`input-glow w-full rounded-xl px-4 py-2.5 text-sm bg-white/80 border flex items-center justify-between transition-all duration-200 ${errors.category ? "border-red-300" : fields.category ? "border-emerald-400" : "border-gray-200/80"} text-${fields.category ? "gray-800" : "gray-400"}`}
        >
          <span className={fields.category ? "text-gray-800" : "text-gray-400"}>{fields.category || "Select category"}</span>
          <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${catOpen ? "rotate-180" : ""}`} />
        </button>
        <AnimatePresence>
          {catOpen && (
            <motion.div
              initial={{ opacity: 0, y: -6, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.97 }}
              className="absolute z-50 w-full mt-1 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden"
            >
              {CATEGORIES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => { set("category")(c); setCatOpen(false); }}
                  className={`w-full text-left px-4 py-2.5 text-sm hover:bg-emerald-50 hover:text-emerald-700 transition-colors ${fields.category === c ? "bg-emerald-50 text-emerald-700 font-medium" : "text-gray-700"}`}
                >
                  {c}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
        {errors.category && <p className="text-xs text-red-500">{errors.category}</p>}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Input label="Phone Number" placeholder="+91 98765 43210" value={fields.phone} onChange={set("phone")} icon={<Phone className="w-4 h-4" />} error={errors.phone} valid={fields.phone.length > 9} />
        <Input label="Email" type="email" placeholder="you@email.com" value={fields.email} onChange={set("email")} icon={<Mail className="w-4 h-4" />} error={errors.email} valid={fields.email.includes("@")} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Input
            label="Password"
            type={showPw ? "text" : "password"}
            placeholder="Min 8 characters"
            value={fields.password}
            onChange={set("password")}
            icon={<Lock className="w-4 h-4" />}
            error={errors.password}
            rightElement={
              <button type="button" onClick={() => setShowPw(!showPw)} className="text-gray-400 hover:text-gray-600">
                {showPw ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            }
          />
          {fields.password && (
            <div className="flex items-center gap-1.5 pt-0.5">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="strength-bar flex-1"
                  style={{ background: i <= strength.score ? strength.color : "#e5e7eb" }}
                />
              ))}
              <span className="text-[10px] font-medium ml-1" style={{ color: strength.color }}>
                {strength.label}
              </span>
            </div>
          )}
        </div>
        <Input
          label="Confirm Password"
          type={showPw ? "text" : "password"}
          placeholder="Repeat password"
          value={fields.confirm}
          onChange={set("confirm")}
          icon={<Lock className="w-4 h-4" />}
          error={errors.confirm}
          valid={!!fields.confirm && fields.confirm === fields.password}
        />
      </div>

      <div>
        <label className="flex items-start gap-2 cursor-pointer">
          <div
            onClick={() => setAgree(!agree)}
            className={`w-4 h-4 rounded border-2 flex-shrink-0 mt-0.5 flex items-center justify-center transition-all cursor-pointer ${agree ? "bg-emerald-500 border-emerald-500" : "border-gray-300"}`}
          >
            {agree && <Check className="w-2.5 h-2.5 text-white" />}
          </div>
          <span className="text-xs text-gray-600">
            I agree to the{" "}
            <button type="button" className="text-emerald-600 font-semibold hover:underline">Privacy Policy</button>{" "}
            and{" "}
            <button type="button" className="text-emerald-600 font-semibold hover:underline">Terms of Service</button>
          </span>
        </label>
        {errors.agree && <p className="text-xs text-red-500 mt-1">{errors.agree}</p>}
      </div>

      <motion.button
        type="submit"
        disabled={loading}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.98 }}
        className="w-full py-3 rounded-xl font-semibold text-white text-sm flex items-center justify-center gap-2 transition-all duration-200 shadow-lg disabled:opacity-80"
        style={{ background: "linear-gradient(135deg, #059669, #0D9488)" }}
      >
        {loading ? (
          <motion.div
            className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
            animate={{ rotate: 360 }}
            transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
          />
        ) : (
          <>Create Account <ArrowRight className="w-4 h-4" /></>
        )}
      </motion.button>

      <div className="relative flex items-center gap-3">
        <div className="flex-1 h-px bg-gray-200" />
        <span className="text-xs text-gray-400 font-medium">OR</span>
        <div className="flex-1 h-px bg-gray-200" />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <SocialButton icon={<GoogleIcon />}>Google</SocialButton>
        <SocialButton icon={<WhatsAppIcon />}>WhatsApp</SocialButton>
      </div>

      <p className="text-center text-xs text-gray-500">
        Already have an account?{" "}
        <button type="button" onClick={onSwitch} className="text-emerald-600 font-semibold hover:underline">
          Login
        </button>
      </p>
    </form>
  );
} 
      
    
// ─── SVG Icons ────────────────────────────────────────────────────────────────
function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}

function WhatsAppIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="#25D366">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

// ─── Particles ───────────────────────────────────────────────────────────────
function Particles() {
  const particles = Array.from({ length: 12 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 3 + 1,
    delay: Math.random() * 4,
    duration: Math.random() * 3 + 3,
  }));

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            background: "rgba(16, 185, 129, 0.6)",
          }}
          animate={{ y: [-20, -80], opacity: [0.6, 0], scale: [1, 0] }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            repeat: Infinity,
            ease: "easeOut",
          }}
        />
      ))}
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function Auth({ initialTab = "login" }: { initialTab?: Tab }) {
  const [tab, setTab] = useState<Tab>(initialTab);

  return (
    <div className="min-h-screen w-full flex relative overflow-hidden" style={{ background: "#f0fdf8" }}>
      {/* Background mesh gradient */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `
            radial-gradient(ellipse at 20% 20%, rgba(5,150,105,0.12) 0%, transparent 50%),
            radial-gradient(ellipse at 80% 80%, rgba(13,148,136,0.1) 0%, transparent 50%),
            radial-gradient(ellipse at 50% 50%, rgba(37,211,102,0.06) 0%, transparent 60%)
          `,
        }}
      />

      {/* Floating blurred circles */}
      <motion.div
        className="absolute w-96 h-96 rounded-full pointer-events-none"
        style={{ background: "rgba(5,150,105,0.08)", filter: "blur(80px)", top: "-10%", left: "-5%" }}
        animate={{ scale: [1, 1.1, 1], opacity: [0.4, 0.7, 0.4] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute w-80 h-80 rounded-full pointer-events-none"
        style={{ background: "rgba(13,148,136,0.08)", filter: "blur(60px)", bottom: "5%", right: "10%" }}
        animate={{ scale: [1.1, 1, 1.1], opacity: [0.5, 0.3, 0.5] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
      />

      <Particles />

      {/* ── LEFT PANEL ── */}
      <motion.div
        initial={{ opacity: 0, x: -30 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.7, ease: "easeOut" }}
        className="hidden lg:flex flex-col justify-center px-12 xl:px-16 relative"
        style={{ width: "45%", minWidth: 480 }}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 mb-10">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg"
            style={{ background: "linear-gradient(135deg, #059669, #0D9488)" }}
          >
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="text-gray-900 font-bold text-lg leading-none">BusinessOS</div>
            <div className="text-emerald-600 text-xs font-semibold tracking-widest uppercase leading-none mt-0.5">AI</div>
          </div>
        </div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-4xl xl:text-5xl font-extrabold text-gray-900 leading-tight mb-4"
          style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}
        >
          Grow Your Business,<br />
          <span
            className="bg-clip-text text-transparent"
            style={{ backgroundImage: "linear-gradient(135deg, #059669, #0D9488)" }}
          >
            Not Your Paperwork.
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-gray-500 text-base leading-relaxed mb-10 max-w-md"
        >
          Connect your WhatsApp Business, automate bookkeeping, manage inventory,
          generate invoices and track payments — all with AI that works while you sleep.
        </motion.p>

        {/* Dashboard mockup */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="relative"
        >
          <DashboardMockup />
        </motion.div>

        <StatsRow />
      </motion.div>

      {/* ── RIGHT PANEL ── */}
      <div className="flex-1 flex items-center justify-center px-4 py-12 lg:py-8">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="w-full max-w-md"
        >
          {/* Glass card */}
          <div
            className="rounded-3xl shadow-2xl overflow-hidden"
            style={{
              background: "rgba(255,255,255,0.82)",
              backdropFilter: "blur(24px)",
              WebkitBackdropFilter: "blur(24px)",
              border: "1px solid rgba(255,255,255,0.7)",
              boxShadow: "0 32px 80px rgba(5,150,105,0.12), 0 8px 24px rgba(0,0,0,0.06)",
            }}
          >
            {/* Tab header */}
            <div
              className="flex p-2 gap-1 m-5 rounded-2xl"
              style={{ background: "rgba(5,150,105,0.06)", border: "1px solid rgba(5,150,105,0.1)" }}
            >
              {(["login", "signup"] as Tab[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className="flex-1 relative py-2.5 text-sm font-semibold rounded-xl transition-colors duration-200"
                  style={{ color: tab === t ? "white" : "#6b7280" }}
                >
                  {tab === t && (
                    <motion.div
                      layoutId="tab-pill"
                      className="absolute inset-0 rounded-xl"
                      style={{ background: "linear-gradient(135deg, #059669, #0D9488)" }}
                      transition={{ type: "spring", stiffness: 400, damping: 35 }}
                    />
                  )}
                  <span className="relative z-10">
                    {t === "login" ? "Login" : "Sign Up"}
                  </span>
                </button>
              ))}
            </div>

            {/* Form area */}
            <div className="px-6 pb-6">
              <AnimatePresence mode="wait">
                {tab === "login" ? (
                  <motion.div
                    key="login"
                    initial={{ opacity: 0, x: -16 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 16 }}
                    transition={{ duration: 0.25, ease: "easeInOut" }}
                  >
                    <div className="mb-5">
                      <h2 className="text-xl font-bold text-gray-900" style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>
                        Welcome Back 👋
                      </h2>
                      <p className="text-gray-500 text-sm mt-1">Continue managing your business with AI.</p>
                    </div>
                    <LoginForm onSwitch={() => setTab("signup")} />
                  </motion.div>
                ) : (
                  <motion.div
                    key="signup"
                    initial={{ opacity: 0, x: 16 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -16 }}
                    transition={{ duration: 0.25, ease: "easeInOut" }}
                  >
                    <div className="mb-4">
                      <h2 className="text-xl font-bold text-gray-900" style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>
                        Create Your Account
                      </h2>
                      <p className="text-gray-500 text-sm mt-1">Get started in under one minute.</p>
                    </div>
                    <SignupForm onSwitch={() => setTab("login")} />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Trust badges */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="flex items-center justify-center gap-4 mt-5"
          >
            {["SOC2 Compliant", "256-bit Encryption", "GDPR Ready"].map((label) => (
              <div key={label} className="flex items-center gap-1 text-gray-400 text-[10px]">
                <Check className="w-3 h-3 text-emerald-500" />
                {label}
              </div>
            ))}
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
