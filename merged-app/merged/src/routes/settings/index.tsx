import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useState, useEffect } from "react";
import { AppShell } from "@/components/app-shell";
import { useSettings } from "@/hooks/use-settings";
import {
  Camera,
  Save,
  Sun,
  Moon,
  MessageCircle,
  Zap,
  BarChart3,
  Package,
  Check,
  Globe,
  ArrowRight,
  FileText,
  TrendingUp,
  User,
  MapPin,
  Phone,
  AtSign,
  Tag,
  Building2,
  Shield,
  Cpu,
  Crown,
  Gift,
  AlertCircle,
  RefreshCw,
  CreditCard,
  Settings,
  Bell,
  Mic,
  Bot,
} from "lucide-react";

/* ─── Types ─── */
type Tab = "profile" | "preferences" | "billing";
type ThemeMode = "light" | "dark";

/* ─── Animated Toggle ─── */
function Toggle({
  checked,
  onChange,
  accentClass = "bg-emerald-500",
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  accentClass?: string;
}) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-[26px] w-[48px] shrink-0 cursor-pointer items-center rounded-full transition-colors duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 ${
        checked ? accentClass : "bg-slate-200"
      }`}
    >
      <span
        className={`inline-block h-[20px] w-[20px] transform rounded-full bg-white shadow-md transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
          checked ? "translate-x-[24px] shadow-lg" : "translate-x-[3px]"
        }`}
      />
    </button>
  );
}

/* ─── Glassmorphism Card ─── */
function GlassCard({
  children,
  className = "",
  hover = true,
}: {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
}) {
  return (
    <div
      className={`relative rounded-2xl border border-white/70 bg-white/80 shadow-[0_4px_24px_rgba(0,0,0,0.06)] backdrop-blur-md transition-all duration-300 overflow-hidden ${
        hover ? "hover:shadow-[0_8px_40px_rgba(0,0,0,0.10)] hover:-translate-y-0.5" : ""
      } ${className}`}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-white/60 via-transparent to-transparent pointer-events-none rounded-2xl" />
      {children}
    </div>
  );
}

/* ─── Section Header inside card ─── */
function CardHeader({
  icon: Icon,
  iconBg,
  title,
  subtitle,
  badge,
}: {
  icon: React.ElementType;
  iconBg: string;
  title: string;
  subtitle?: string;
  badge?: { text: string; color: string };
}) {
  return (
    <div className="relative flex items-start gap-4 px-7 py-5 border-b border-slate-100/80">
      <div className={`mt-0.5 p-2.5 rounded-xl ${iconBg} flex-shrink-0`}>
        <Icon size={17} className="text-white" />
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2.5">
          <h3 className="text-[18px] font-bold text-slate-800 tracking-tight">{title}</h3>
          {badge && (
            <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${badge.color}`}>
              {badge.text}
            </span>
          )}
        </div>
        {subtitle && <p className="text-[13px] text-slate-400 mt-0.5 font-medium">{subtitle}</p>}
      </div>
    </div>
  );
}

/* ─── Input Field ─── */
function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  icon: Icon,
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  icon?: React.ElementType;
  required?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <div className="flex flex-col gap-1.5">
      <label className="flex items-center gap-1 text-[12px] font-bold text-slate-500 uppercase tracking-[0.08em]">
        {label}
        {required && <span className="text-rose-400">*</span>}
      </label>
      <div
        className={`relative flex items-center rounded-xl border transition-all duration-200 bg-slate-50/80 ${
          focused
            ? "border-emerald-400 ring-[3px] ring-emerald-500/15 bg-white"
            : "border-slate-200 hover:border-slate-300"
        }`}
      >
        {Icon && (
          <span
            className={`pl-3.5 transition-colors duration-200`}
            style={{ color: focused ? "#059669" : "#94a3b8" }}
          >
            <Icon size={15} />
          </span>
        )}
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={placeholder}
          className={`w-full py-3 text-[15px] text-slate-800 placeholder-slate-300 bg-transparent focus:outline-none ${Icon ? "pl-2.5 pr-4" : "px-4"}`}
        />
      </div>
    </div>
  );
}

/* ─── Toggle Row ─── */
function ToggleRow({
  label,
  description,
  checked,
  onChange,
  accentClass,
  statusDot,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  accentClass?: string;
  statusDot?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-4 border-b border-slate-100/80 last:border-0 group transition-colors duration-150 hover:bg-slate-50/50 -mx-7 px-7">
      <div className="flex-1 pr-6">
        <div className="flex items-center gap-2">
          <span className="text-[15px] font-semibold text-slate-700">{label}</span>
          {statusDot && checked && (
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
          )}
        </div>
        {description && (
          <p className="text-[13px] text-slate-400 mt-0.5 leading-relaxed">{description}</p>
        )}
      </div>
      <Toggle checked={checked} onChange={onChange} accentClass={accentClass} />
    </div>
  );
}

/* ─── Progress bar ─── */
function UsageBar({
  label,
  used,
  total,
  color,
  unit = "",
  warn,
}: {
  label: string;
  used: number;
  total: number;
  color: string;
  unit?: string;
  warn?: boolean;
}) {
  const pct = Math.min((used / total) * 100, 100);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setWidth(pct), 200);
    return () => clearTimeout(t);
  }, [pct]);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[14px] font-semibold text-slate-600">{label}</span>
        <div className="flex items-center gap-1.5">
          {warn && pct > 80 && <AlertCircle size={13} className="text-amber-500" />}
          <span
            className={`text-[13px] font-bold ${pct > 80 ? "text-amber-600" : "text-slate-500"}`}
          >
            {used.toLocaleString("en-IN")}
            {unit} / {total.toLocaleString("en-IN")}
            {unit}
          </span>
        </div>
      </div>
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-[900ms] ease-out ${color}`}
          style={{ width: `${width}%` }}
        />
      </div>
      <div className="flex justify-between text-[11px] font-medium text-slate-400">
        <span>0</span>
        <span className={pct > 80 ? "text-amber-500 font-semibold" : ""}>
          {pct.toFixed(0)}% used
        </span>
        <span>
          {total.toLocaleString("en-IN")}
          {unit}
        </span>
      </div>
    </div>
  );
}

/* ─── Main Settings Page ─── */
export default function SettingsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const tabParam = searchParams.get("tab") as Tab | null;
  const [activeTab, setActiveTab] = useState<Tab>(tabParam || "profile");

  const {
    profile: dbProfile,
    preferences: dbPrefs,
    billing: dbBilling,
    loading,
    saveProfile,
    savePreferences,
  } = useSettings();

  useEffect(() => {
    if (tabParam) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  const [mode, setMode] = useState<ThemeMode>("light");
  const [language, setLanguage] = useState("English");
  const [savePulse, setSavePulse] = useState(false);

  const [profile, setProfile] = useState({
    businessName: "Priya's Boutique",
    ownerName: "Priya Sharma",
    phone: "+91 98765 43210",
    email: "priya@priyasboutique.in",
    category: "Fashion & Apparel",
    address: "Shop 12, Lajpat Nagar Market, New Delhi – 110024",
  });

  const [wa, setWa] = useState({
    autoReply: true,
    autoOrderDetection: true,
    autoPaymentReminders: false,
    voiceNoteProcessing: true,
  });

  const [notifs, setNotifs] = useState({
    whatsapp: true,
    email: false,
    push: true,
  });

  // Sync settings when loaded
  useEffect(() => {
    if (!loading) {
      setProfile({
        businessName: dbProfile.businessName || "",
        ownerName: "Priya Sharma",
        phone: dbProfile.phone || "",
        email: dbProfile.email || "",
        category: "Fashion & Apparel",
        address: dbProfile.address || "",
      });
      setMode((dbPrefs.theme as ThemeMode) || "light");
      setLanguage(dbPrefs.language || "English");
      setWa({
        autoReply: dbPrefs.screenshotAutoParse,
        autoOrderDetection: dbPrefs.autoCreateOrders,
        autoPaymentReminders: false,
        voiceNoteProcessing: dbPrefs.voiceAutoParse,
      });
      setNotifs({
        whatsapp: dbPrefs.notificationsEnabled,
        email: false,
        push: dbPrefs.notificationsEnabled,
      });
    }
  }, [loading, dbProfile, dbPrefs]);

  const handleSave = async () => {
    setSavePulse(true);
    await saveProfile({
      businessName: profile.businessName,
      phone: profile.phone,
      email: profile.email,
      address: profile.address,
    });
    setTimeout(() => setSavePulse(false), 1800);
  };

  const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: "profile", label: "Profile", icon: User },
    { id: "preferences", label: "Preferences", icon: Settings },
    { id: "billing", label: "Billing & Plans", icon: CreditCard },
  ];

  const categories = [
    "Fashion & Apparel",
    "Food & Beverages",
    "Beauty & Wellness",
    "Home Décor",
    "Handicrafts & Artisan Goods",
    "Electronics & Accessories",
    "Healthcare & Wellness",
    "Education & Coaching",
    "Agriculture & Farm Produce",
    "Retail & General Trade",
  ];

  return (
    <AppShell>
      {/* ── Page Content ── */}
      <div className="max-w-[1100px]">
        {/* Page title */}
        <div className="mb-8 flex items-end justify-between">
          <div>
            <h1 className="text-[42px] font-extrabold text-slate-900 leading-none tracking-tight">
              Settings
            </h1>
            <p className="text-[16px] text-slate-400 font-medium mt-2">
              Manage your business profile, preferences, and subscription
            </p>
          </div>
          {activeTab === "profile" && (
            <button
              onClick={handleSave}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl text-[14px] font-bold text-white shadow-lg transition-all duration-200 ${
                savePulse ? "scale-95 opacity-80" : "hover:-translate-y-0.5 hover:shadow-xl"
              }`}
              style={{
                background: "linear-gradient(135deg,#059669,#0d9488)",
                boxShadow: "0 4px 20px rgba(5,150,105,0.35)",
              }}
            >
              {savePulse ? <Check size={15} /> : <Save size={15} />}
              {savePulse ? "Saved!" : "Save Changes"}
            </button>
          )}
        </div>

        {/* Tab Bar */}
        <div
          className="flex gap-1 mb-8 p-1.5 rounded-2xl w-fit"
          style={{
            background: "rgba(255,255,255,0.8)",
            border: "1px solid rgba(15,23,42,0.07)",
            boxShadow: "0 2px 12px rgba(0,0,0,0.05)",
            backdropFilter: "blur(12px)",
          }}
        >
          {tabs.map(({ id, label, icon: Icon }) => {
            const active = activeTab === id;
            return (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-[14px] font-bold transition-all duration-250 ${
                  active
                    ? "text-white shadow-md"
                    : "text-slate-500 hover:text-slate-700 hover:bg-slate-100/70"
                }`}
                style={
                  active
                    ? {
                        background: "linear-gradient(135deg,#059669,#0d9488)",
                        boxShadow: "0 4px 16px rgba(5,150,105,0.28)",
                      }
                    : {}
                }
              >
                <Icon size={15} />
                {label}
              </button>
            );
          })}
        </div>

        {/* ══ PROFILE TAB ══ */}
        {activeTab === "profile" && (
          <div
            className="space-y-6"
            style={{ animation: "slideUp 0.35s cubic-bezier(0.34,1.2,0.64,1) both" }}
          >
            <GlassCard>
              <CardHeader
                icon={Building2}
                iconBg="bg-gradient-to-br from-emerald-500 to-teal-600"
                title="Business Profile"
                subtitle="Your business identity and contact information"
              />

              <div className="px-7 py-6">
                {/* Logo section */}
                <div className="flex items-center gap-6 mb-8 pb-8 border-b border-slate-100">
                  <div className="relative group/logo cursor-pointer flex-shrink-0">
                    <div
                      className="w-[88px] h-[88px] rounded-2xl flex items-center justify-center text-white text-3xl font-extrabold shadow-xl overflow-hidden"
                      style={{
                        background: "linear-gradient(135deg,#059669,#0d9488)",
                        boxShadow: "0 8px 24px rgba(5,150,105,0.35)",
                      }}
                    >
                      P
                    </div>
                    <div className="absolute inset-0 rounded-2xl bg-black/50 opacity-0 group-hover/logo:opacity-100 transition-opacity flex items-center justify-center">
                      <Camera size={20} className="text-white" />
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-white rounded-full border-2 border-slate-200 flex items-center justify-center shadow-sm">
                      <Camera size={12} className="text-slate-500" />
                    </div>
                  </div>
                  <div>
                    <p className="text-[16px] font-bold text-slate-800">Business Logo</p>
                    <p className="text-[13px] text-slate-400 mt-1 leading-relaxed">
                      Upload your logo in PNG or JPG format.
                      <br />
                      Recommended size: 400 × 400 px, max 2 MB.
                    </p>
                    <div className="flex items-center gap-2 mt-3">
                      <button className="text-[13px] font-bold text-emerald-600 border border-emerald-200 hover:border-emerald-400 hover:bg-emerald-50 px-4 py-1.5 rounded-lg transition-all duration-150">
                        Upload Logo
                      </button>
                      <button className="text-[13px] font-semibold text-slate-400 hover:text-rose-500 px-3 py-1.5 rounded-lg hover:bg-rose-50 transition-all duration-150">
                        Remove
                      </button>
                    </div>
                  </div>
                </div>

                {/* Form grid */}
                <div className="grid grid-cols-2 gap-5">
                  <Field
                    label="Business Name"
                    value={profile.businessName}
                    onChange={(v) => setProfile({ ...profile, businessName: v })}
                    icon={Building2}
                    placeholder="e.g. Priya's Boutique"
                    required
                  />
                  <Field
                    label="Owner Name"
                    value={profile.ownerName}
                    onChange={(v) => setProfile({ ...profile, ownerName: v })}
                    icon={User}
                    placeholder="Full legal name"
                    required
                  />
                  <Field
                    label="Phone Number"
                    value={profile.phone}
                    onChange={(v) => setProfile({ ...profile, phone: v })}
                    type="tel"
                    icon={Phone}
                    placeholder="+91 XXXXX XXXXX"
                    required
                  />
                  <Field
                    label="Email Address"
                    value={profile.email}
                    onChange={(v) => setProfile({ ...profile, email: v })}
                    type="email"
                    icon={AtSign}
                    placeholder="business@example.com"
                  />

                  {/* Category dropdown */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[12px] font-bold text-slate-500 uppercase tracking-[0.08em]">
                      Business Category
                    </label>
                    <div className="relative">
                      <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                        <Tag size={14} />
                      </div>
                      <select
                        value={profile.category}
                        onChange={(e) => setProfile({ ...profile, category: e.target.value })}
                        className="w-full appearance-none pl-10 pr-10 py-3 rounded-xl border border-slate-200 bg-slate-50/80 text-[15px] text-slate-800 font-medium focus:outline-none focus:ring-[3px] focus:ring-emerald-500/15 focus:border-emerald-400 hover:border-slate-300 transition-all cursor-pointer"
                      >
                        {categories.map((c) => (
                          <option key={c}>{c}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <Field
                    label="Business Address"
                    value={profile.address}
                    onChange={(v) => setProfile({ ...profile, address: v })}
                    icon={MapPin}
                    placeholder="Full address with pin code"
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="px-7 py-4 bg-slate-50/60 border-t border-slate-100 flex items-center justify-between rounded-b-2xl">
                <p className="text-[12px] text-slate-400 font-medium flex items-center gap-1.5">
                  <Shield size={12} className="text-emerald-500" />
                  Your data is encrypted and stored securely
                </p>
                <div className="flex items-center gap-2.5">
                  <button className="px-5 py-2.5 rounded-xl text-[14px] font-semibold text-slate-500 hover:bg-slate-200/70 hover:text-slate-700 transition-all duration-150">
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-[14px] font-bold text-white transition-all duration-200 ${savePulse ? "opacity-75" : "hover:-translate-y-px"}`}
                    style={{
                      background: "linear-gradient(135deg,#059669,#0d9488)",
                      boxShadow: "0 4px 16px rgba(5,150,105,0.30)",
                    }}
                  >
                    {savePulse ? (
                      <>
                        <Check size={15} /> Saved!
                      </>
                    ) : (
                      <>
                        <Save size={15} /> Save Changes
                      </>
                    )}
                  </button>
                </div>
              </div>
            </GlassCard>
          </div>
        )}

        {/* ══ PREFERENCES TAB ══ */}
        {activeTab === "preferences" && (
          <div
            className="space-y-6"
            style={{ animation: "slideUp 0.35s cubic-bezier(0.34,1.2,0.64,1) both" }}
          >
            {/* Language + Appearance row */}
            <div className="grid grid-cols-2 gap-6">
              {/* Language */}
              <GlassCard>
                <CardHeader
                  icon={Globe}
                  iconBg="bg-gradient-to-br from-indigo-500 to-purple-600"
                  title="Language"
                  subtitle="Interface display language"
                />
                <div className="px-7 py-5 space-y-2">
                  {[
                    { val: "English", desc: "International English" },
                    { val: "Hindi", desc: "हिन्दी – Standard Hindi" },
                    { val: "Hinglish", desc: "Hindi + English mix" },
                  ].map(({ val, desc }) => {
                    const active = language === val;
                    return (
                      <button
                        key={val}
                        onClick={() => {
                          setLanguage(val);
                          savePreferences({ language: val });
                        }}
                        className={`w-full flex items-center justify-between px-4 py-3.5 rounded-xl border text-[14px] font-semibold transition-all duration-200 ${
                          active
                            ? "border-emerald-300 bg-gradient-to-r from-emerald-50 to-teal-50 text-emerald-800"
                            : "border-slate-200 bg-white/60 text-slate-600 hover:border-slate-300 hover:bg-white/90"
                        }`}
                      >
                        <div>
                          <p>{val}</p>
                          <p
                            className={`text-[12px] font-medium mt-0.5 ${active ? "text-emerald-600" : "text-slate-400"}`}
                          >
                            {desc}
                          </p>
                        </div>
                        {active ? (
                          <div
                            className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                            style={{ background: "linear-gradient(135deg,#059669,#0d9488)" }}
                          >
                            <Check size={12} className="text-white" />
                          </div>
                        ) : (
                          <div className="w-6 h-6 rounded-full border-2 border-slate-200 flex-shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </GlassCard>

              {/* Appearance */}
              <GlassCard>
                <CardHeader
                  icon={Sun}
                  iconBg="bg-gradient-to-br from-amber-400 to-orange-500"
                  title="Appearance"
                  subtitle="Choose your visual theme"
                />
                <div className="px-7 py-5">
                  <div className="grid grid-cols-2 gap-3">
                    {(
                      [
                        {
                          val: "light" as ThemeMode,
                          label: "Light Mode",
                          icon: Sun,
                          preview: "bg-white",
                          dot: "bg-slate-200",
                        },
                        {
                          val: "dark" as ThemeMode,
                          label: "Dark Mode",
                          icon: Moon,
                          preview: "bg-slate-800",
                          dot: "bg-slate-600",
                        },
                      ] as const
                    ).map(({ val, label, icon: Icon, preview, dot }) => {
                      const active = mode === val;
                      return (
                        <button
                          key={val}
                          onClick={() => {
                            setMode(val);
                            savePreferences({ theme: val });
                          }}
                          className={`flex flex-col items-center gap-3 p-5 rounded-xl border-2 transition-all duration-250 ${
                            active
                              ? "border-emerald-400"
                              : "border-slate-200 hover:border-slate-300 bg-white/50"
                          }`}
                          style={
                            active
                              ? {
                                  background:
                                    "linear-gradient(135deg,rgba(5,150,105,0.08),rgba(13,148,136,0.08))",
                                }
                              : {}
                          }
                        >
                          <div
                            className={`w-full h-12 rounded-lg ${preview} shadow-inner flex gap-1 items-end p-2`}
                          >
                            <div className={`h-5 w-2 rounded-sm ${dot}`} />
                            <div className={`h-3 flex-1 rounded-sm ${dot}`} />
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Icon
                              size={14}
                              className={active ? "text-emerald-600" : "text-slate-400"}
                            />
                            <span
                              className={`text-[13px] font-bold ${active ? "text-emerald-700" : "text-slate-500"}`}
                            >
                              {label}
                            </span>
                          </div>
                          {active && (
                            <div
                              className="w-5 h-5 rounded-full flex items-center justify-center"
                              style={{ background: "linear-gradient(135deg,#059669,#0d9488)" }}
                            >
                              <Check size={10} className="text-white" />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-[12px] text-slate-400 text-center mt-4 font-medium">
                    System sync coming soon
                  </p>
                </div>
              </GlassCard>
            </div>

            {/* WhatsApp Automation */}
            <GlassCard>
              <CardHeader
                icon={MessageCircle}
                iconBg="bg-[#25D366]"
                title="WhatsApp Automation"
                subtitle="AI-powered messaging automations for your business"
                badge={{ text: "AI Powered", color: "bg-indigo-100 text-indigo-700" }}
              />
              <div className="px-7 pb-2 pt-1">
                <ToggleRow
                  label="Auto Reply"
                  description="Instantly respond to incoming customer messages around the clock, even when you're offline"
                  checked={wa.autoReply}
                  onChange={(v) => {
                    setWa({ ...wa, autoReply: v });
                    savePreferences({ screenshotAutoParse: v });
                  }}
                  accentClass="bg-[#25D366]"
                  statusDot
                />
                <ToggleRow
                  label="Auto Order Detection"
                  description="Automatically identify, capture, and log new orders from WhatsApp conversations"
                  checked={wa.autoOrderDetection}
                  onChange={(v) => {
                    setWa({ ...wa, autoOrderDetection: v });
                    savePreferences({ autoCreateOrders: v });
                  }}
                  accentClass="bg-[#25D366]"
                  statusDot
                />
                <ToggleRow
                  label="Auto Payment Reminders"
                  description="Send friendly follow-up messages to customers with pending or overdue payments"
                  checked={wa.autoPaymentReminders}
                  onChange={(v) => {
                    setWa({ ...wa, autoPaymentReminders: v });
                  }}
                  accentClass="bg-amber-500"
                />
                <ToggleRow
                  label="Voice Note Processing"
                  description="Transcribe voice messages and extract customer requests, orders, or feedback automatically"
                  checked={wa.voiceNoteProcessing}
                  onChange={(v) => {
                    setWa({ ...wa, voiceNoteProcessing: v });
                    savePreferences({ voiceAutoParse: v });
                  }}
                  accentClass="bg-indigo-500"
                  statusDot
                />
              </div>
            </GlassCard>

            {/* Notifications */}
            <GlassCard>
              <CardHeader
                icon={Bell}
                iconBg="bg-gradient-to-br from-rose-500 to-pink-600"
                title="Notifications"
                subtitle="Control how and where you receive alerts"
              />
              <div className="px-7 pb-2 pt-1">
                <ToggleRow
                  label="WhatsApp Notifications"
                  description="Receive important business alerts, order updates, and summaries on WhatsApp"
                  checked={notifs.whatsapp}
                  onChange={(v) => {
                    setNotifs({ ...notifs, whatsapp: v });
                    savePreferences({ notificationsEnabled: v });
                  }}
                  accentClass="bg-[#25D366]"
                  statusDot
                />
                <ToggleRow
                  label="Email Notifications"
                  description="Get detailed daily business reports and weekly performance summaries by email"
                  checked={notifs.email}
                  onChange={(v) => {
                    setNotifs({ ...notifs, email: v });
                  }}
                  accentClass="bg-indigo-500"
                />
                <ToggleRow
                  label="Push Notifications"
                  description="Real-time alerts for new orders, payments, and urgent actions on your device"
                  checked={notifs.push}
                  onChange={(v) => {
                    setNotifs({ ...notifs, push: v });
                    savePreferences({ notificationsEnabled: v });
                  }}
                  accentClass="bg-emerald-500"
                  statusDot
                />
              </div>
            </GlassCard>
          </div>
        )}

        {/* ══ BILLING TAB ══ */}
        {activeTab === "billing" && (
          <div
            className="space-y-6"
            style={{ animation: "slideUp 0.35s cubic-bezier(0.34,1.2,0.64,1) both" }}
          >
            {/* Current plan */}
            <GlassCard>
              <CardHeader
                icon={CreditCard}
                iconBg="bg-gradient-to-br from-slate-400 to-slate-500"
                title="Current Plan"
                subtitle="Your active subscription details"
              />
              <div className="px-7 py-6">
                {/* Plan badge row */}
                <div className="flex items-center justify-between mb-7 pb-6 border-b border-slate-100">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-slate-100 border-2 border-dashed border-slate-300 flex items-center justify-center">
                      <Gift size={22} className="text-slate-400" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2.5">
                        <h3 className="text-[22px] font-extrabold text-slate-800">{dbBilling.planName}</h3>
                        <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-500 border border-slate-200">
                          {dbBilling.status === "active" ? "Active" : "Trial / None"}
                        </span>
                      </div>
                      <p className="text-[13px] text-slate-400 font-medium mt-0.5">
                        {dbBilling.planName === "Free Plan" ? "Basic features to get you started" : `Expires on ${dbBilling.expiryDate}`}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[36px] font-extrabold text-slate-800 leading-none">₹{dbBilling.monthlyPrice}</p>
                    <p className="text-[13px] text-slate-400 font-medium mt-1">per month</p>
                  </div>
                </div>

                {/* Usage */}
                <div>
                  <div className="flex items-center justify-between mb-5">
                    <h4 className="text-[13px] font-bold text-slate-500 uppercase tracking-[0.08em]">
                      This Month's Usage
                    </h4>
                    <button className="flex items-center gap-1 text-[12px] font-semibold text-slate-400 hover:text-emerald-600 transition-colors">
                      <RefreshCw size={11} />
                      Refresh
                    </button>
                  </div>
                  <div className="space-y-6">
                    <UsageBar
                      label="Voice Notes Processed"
                      used={12}
                      total={20}
                      color="bg-gradient-to-r from-indigo-400 to-indigo-600"
                      warn
                    />
                    <UsageBar
                      label="AI Messages Processed"
                      used={847}
                      total={1000}
                      color="bg-gradient-to-r from-emerald-400 to-teal-500"
                      warn
                    />
                    <UsageBar
                      label="AI Reports Generated"
                      used={3}
                      total={5}
                      color="bg-gradient-to-r from-amber-400 to-orange-500"
                      warn
                    />
                  </div>
                </div>
              </div>
            </GlassCard>

            {/* Premium Card */}
            <div
              className="relative overflow-hidden rounded-2xl shadow-2xl"
              style={{
                background:
                  "linear-gradient(135deg,#047857 0%,#059669 30%,#0d9488 65%,#6366f1 100%)",
              }}
            >
              {/* decorative orbs */}
              <div
                className="absolute -top-24 -right-24 w-72 h-72 rounded-full blur-3xl opacity-30"
                style={{ background: "radial-gradient(circle,#34d399,transparent)" }}
              />
              <div
                className="absolute -bottom-16 left-1/3 w-64 h-64 rounded-full blur-3xl opacity-20"
                style={{ background: "radial-gradient(circle,#a5b4fc,transparent)" }}
              />
              {/* subtle dot grid */}
              <div
                className="absolute inset-0 opacity-[0.07]"
                style={{
                  backgroundImage: "radial-gradient(circle,white 1px,transparent 1px)",
                  backgroundSize: "24px 24px",
                }}
              />

              <div className="relative px-8 py-8">
                {/* Header */}
                <div className="flex items-start justify-between mb-7">
                  <div>
                    <div className="flex items-center gap-2 mb-2.5">
                      <div className="flex items-center gap-1.5 bg-white/20 backdrop-blur-sm border border-white/30 px-3 py-1 rounded-full">
                        <Crown size={13} className="text-yellow-300" />
                        <span className="text-[12px] font-extrabold text-white tracking-widest uppercase">
                          Premium Plan
                        </span>
                      </div>
                    </div>
                    <h2 className="text-[32px] font-extrabold text-white leading-tight">
                      Unlock your
                      <br />
                      <span className="text-emerald-200">full potential</span>
                    </h2>
                    <p className="text-[15px] text-emerald-100 mt-2 font-medium">
                      Everything you need to scale with confidence
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0 ml-6">
                    <div className="bg-white/15 backdrop-blur-sm border border-white/25 rounded-2xl px-5 py-4">
                      <p className="text-[11px] font-bold text-emerald-200 uppercase tracking-widest">
                        Starting at
                      </p>
                      <p className="text-[40px] font-extrabold text-white leading-none mt-1">
                        ₹499
                      </p>
                      <p className="text-[13px] text-emerald-200 font-medium mt-0.5">/ month</p>
                    </div>
                  </div>
                </div>

                {/* Features grid */}
                <div className="grid grid-cols-2 gap-3 mb-8">
                  {[
                    { icon: Mic, text: "Unlimited Voice Note Processing", hot: false },
                    { icon: Bot, text: "AI Funding & Govt Scheme Recommendations", hot: true },
                    { icon: Package, text: "Inventory Management", hot: false },
                    { icon: BarChart3, text: "Advanced Business Analytics", hot: false },
                    { icon: TrendingUp, text: "Revenue Forecasting & Insights", hot: true },
                    { icon: FileText, text: "Automated GST & Tax Reports", hot: false },
                  ].map(({ icon: Icon, text, hot }) => (
                    <div
                      key={text}
                      className="flex items-start gap-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl px-4 py-3"
                    >
                      <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Icon size={14} className="text-white" />
                      </div>
                      <div>
                        <p className="text-[13px] font-semibold text-white leading-snug">{text}</p>
                        {hot && (
                          <span className="text-[10px] font-bold text-amber-300 bg-amber-400/20 px-1.5 py-0.5 rounded mt-1 inline-block">
                            Popular
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* CTA — navigates to /dashboard/settings/premium */}
                <div className="flex items-center gap-4">
                  <Link
                    to="/dashboard/settings/premium"
                    onClick={(e) => {
                      e.preventDefault();
                      navigate("/dashboard/settings/premium");
                    }}
                    className="group inline-flex items-center gap-2.5 px-8 py-4 bg-white rounded-xl text-[15px] font-extrabold text-emerald-700 shadow-xl hover:shadow-2xl hover:-translate-y-0.5 transition-all duration-200"
                  >
                    <Zap size={17} className="text-emerald-600" />
                    Upgrade to Premium
                    <ArrowRight
                      size={16}
                      className="ml-0.5 group-hover:translate-x-1 transition-transform duration-200"
                    />
                  </Link>
                  <div>
                    <p className="text-[13px] text-emerald-100 font-semibold">
                      No commitment · Cancel anytime
                    </p>
                    <p className="text-[12px] text-emerald-200 font-medium mt-0.5">
                      Instant activation · 7-day free trial
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Billing FAQ teaser */}
            <GlassCard hover={false}>
              <div className="px-7 py-5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-indigo-100">
                    <Cpu size={17} className="text-indigo-600" />
                  </div>
                  <div>
                    <p className="text-[15px] font-bold text-slate-700">
                      Need help choosing a plan?
                    </p>
                    <p className="text-[13px] text-slate-400 font-medium">
                      Our team is happy to walk you through what works for your business
                    </p>
                  </div>
                </div>
                <button className="flex items-center gap-1.5 text-[14px] font-bold text-emerald-600 hover:text-emerald-700 border border-emerald-200 hover:border-emerald-300 px-4 py-2 rounded-xl hover:bg-emerald-50 transition-all duration-150 flex-shrink-0 ml-4">
                  Talk to Us
                  <ArrowRight size={14} />
                </button>
              </div>
            </GlassCard>
          </div>
        )}
      </div>

      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </AppShell>
  );
}
