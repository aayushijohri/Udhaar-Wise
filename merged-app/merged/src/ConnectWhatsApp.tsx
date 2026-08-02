import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";

// ─── Icons ───────────────────────────────────────────────────────────────────

function WhatsAppIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-5 h-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.955 11.955 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
    </svg>
  );
}

function BotIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-5 h-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
    </svg>
  );
}

function ZapIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-5 h-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
    </svg>
  );
}

function CheckIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  );
}

function RefreshIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
    </svg>
  );
}

function PhoneIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-5 h-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18h3" />
    </svg>
  );
}

function QRCodePlaceholder() {
  const cells = Array.from({ length: 21 * 21 }, (_, i) => {
    const row = Math.floor(i / 21);
    const col = i % 21;
    // Finder patterns
    const inTopLeft = row < 7 && col < 7;
    const inTopRight = row < 7 && col > 13;
    const inBottomLeft = row > 13 && col < 7;
    const inFinderBorder = (
      (inTopLeft && (row === 0 || row === 6 || col === 0 || col === 6)) ||
      (inTopRight && (row === 0 || row === 6 || col === 14 || col === 20)) ||
      (inBottomLeft && (row === 14 || row === 20 || col === 0 || col === 6))
    );
    const inFinderCenter = (
      (inTopLeft && row >= 2 && row <= 4 && col >= 2 && col <= 4) ||
      (inTopRight && row >= 2 && row <= 4 && col >= 16 && col <= 18) ||
      (inBottomLeft && row >= 16 && row <= 18 && col >= 2 && col <= 4)
    );
    const dark = inFinderBorder || inFinderCenter || (!inTopLeft && !inTopRight && !inBottomLeft && Math.random() > 0.5);
    return dark;
  });

  return (
    <div className="relative flex items-center justify-center">
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(21, 1fr)",
          width: 168,
          height: 168,
          gap: 1,
        }}
      >
        {cells.map((dark, i) => (
          <div
            key={i}
            style={{
              width: "100%",
              height: "100%",
              backgroundColor: dark ? "#111827" : "white",
              borderRadius: 1,
            }}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ConnectWhatsApp() {
    const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"qr" | "phone">("qr");
  const [connected, setConnected] = useState(false);
  const [qrTimer, setQrTimer] = useState(29);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [sending, setSending] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (activeTab === "qr" && !connected) {
      timerRef.current = setInterval(() => {
        setQrTimer((t) => {
          if (t <= 1) {
            return 29;
          }
          return t - 1;
        });
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [activeTab, connected]);

  const handleSimulateConnect = () => {
  setConnected(true);

  if (timerRef.current) {
    clearInterval(timerRef.current);
  }

  // 1 second baad Dashboard par redirect
  setTimeout(() => {
    navigate("/dashboard");
  }, 1000);
};

  const handleSendCode = () => {
    if (!phoneNumber) return;
    setSending(true);
    setTimeout(() => {
      setSending(false);
      setCodeSent(true);
    }, 1500);
  };

  const handleRefreshQR = () => {
    setQrTimer(29);
  };

  const whyList = [
    "Auto-read customer orders",
    "Generate invoices instantly",
    "Smart inventory updates",
    "AI payment reminders",
    "Voice note processing",
    "Customer CRM sync",
    "Live sales dashboard",
  ];

  const steps = [
    { icon: <WhatsAppIcon className="w-4 h-4" />, label: "Open WhatsApp Business" },
    {
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
      label: "Go to Settings",
    },
    {
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
          <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
        </svg>
      ),
      label: "Tap Linked Devices",
    },
    {
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 6.75h.75v.75h-.75v-.75zM6.75 16.5h.75v.75h-.75V16.5zM16.5 6.75h.75v.75h-.75v-.75zM13.5 13.5h.75v.75h-.75v-.75zM13.5 19.5h.75v.75h-.75v-.75zM19.5 13.5h.75v.75h-.75v-.75zM19.5 19.5h.75v.75h-.75v-.75zM16.5 16.5h.75v.75h-.75v-.75z" />
        </svg>
      ),
      label: "Scan the QR Code",
    },
  ];

  return (
    <div className="relative min-h-screen overflow-hidden" style={{ background: "#fafffe" }}>
      {/* ── Mesh gradient background ── */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="absolute"
          style={{
            width: 800,
            height: 800,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(5,150,105,0.10) 0%, transparent 70%)",
            top: -200,
            right: -200,
            filter: "blur(60px)",
          }}
        />
        <div
          className="absolute"
          style={{
            width: 600,
            height: 600,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(37,211,102,0.07) 0%, transparent 70%)",
            bottom: -100,
            left: -150,
            filter: "blur(80px)",
          }}
        />
        <div
          className="absolute"
          style={{
            width: 400,
            height: 400,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(16,185,129,0.06) 0%, transparent 70%)",
            top: "40%",
            left: "50%",
            filter: "blur(60px)",
          }}
        />
        {/* Subtle grid */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: "radial-gradient(circle, rgba(5,150,105,0.06) 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />
      </div>

      {/* ── Layout ── */}
      <div className="relative z-10 flex min-h-screen">
        {/* Main column */}
        <div className="flex-1 flex flex-col items-center px-4 py-10 xl:pr-0">
          {/* ── Header ── */}
          <motion.div
            className="w-full max-w-2xl text-center mb-10"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            {/* Logo */}
            <div className="flex items-center justify-center gap-2 mb-8">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: "linear-gradient(135deg, #059669, #25D366)" }}
              >
                <WhatsAppIcon className="w-4 h-4 text-white" />
              </div>
              <span className="text-sm font-semibold tracking-wide text-gray-700">BusinessOS AI</span>
            </div>

            {/* Progress badge */}
            <motion.div
              className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 mb-6 text-xs font-medium"
              style={{
                background: "rgba(5,150,105,0.08)",
                border: "1px solid rgba(5,150,105,0.18)",
                color: "#059669",
              }}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1 }}
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              Step 2 of 3 &nbsp;·&nbsp; Engine Activation
            </motion.div>

            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-gray-900 mb-4" style={{ letterSpacing: "-0.02em" }}>
              Connect Your WhatsApp{" "}
              <span
                style={{
                  background: "linear-gradient(135deg, #059669 0%, #25D366 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                Business
              </span>
            </h1>
            <p className="text-base text-gray-500 max-w-lg mx-auto leading-relaxed">
              Link your WhatsApp Business in under 30 seconds to enable automated orders, voice notes, invoices, payment tracking, and AI-powered business automation.
            </p>
          </motion.div>

          {/* ── Main Card ── */}
          <motion.div
            className="w-full max-w-2xl rounded-2xl overflow-hidden"
            style={{
              background: "rgba(255,255,255,0.72)",
              backdropFilter: "blur(24px)",
              WebkitBackdropFilter: "blur(24px)",
              border: "1px solid rgba(5,150,105,0.12)",
              boxShadow: "0 4px 40px rgba(5,150,105,0.08), 0 1px 0 rgba(255,255,255,0.9) inset",
            }}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.15 }}
          >
            {/* Tabs */}
            <div
              className="flex"
              style={{ borderBottom: "1px solid rgba(5,150,105,0.10)" }}
            >
              {(["qr", "phone"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => { setActiveTab(tab); setCodeSent(false); }}
                  className="relative flex-1 flex items-center justify-center gap-2 py-4 text-sm font-medium transition-colors duration-200"
                  style={{
                    color: activeTab === tab ? "#059669" : "#9ca3af",
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  {tab === "qr" ? (
                    <>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-4 h-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5z" />
                      </svg>
                      QR Code
                    </>
                  ) : (
                    <>
                      <PhoneIcon />
                      Phone Number
                    </>
                  )}
                  {activeTab === tab && (
                    <motion.div
                      layoutId="tab-indicator"
                      className="absolute bottom-0 left-0 right-0 h-0.5"
                      style={{ background: "linear-gradient(90deg, #059669, #25D366)" }}
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <AnimatePresence mode="wait">
              {activeTab === "qr" ? (
                <motion.div
                  key="qr"
                  className="p-6 sm:p-8"
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 12 }}
                  transition={{ duration: 0.22 }}
                >
                  <div className="grid sm:grid-cols-2 gap-8">
                    {/* Left: steps */}
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-5">How to Connect</p>
                      <div className="space-y-4">
                        {steps.map((step, i) => (
                          <motion.div
                            key={i}
                            className="flex items-center gap-3"
                            initial={{ opacity: 0, x: -12 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.05 * i + 0.1 }}
                          >
                            <div
                              className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                              style={{
                                background: "linear-gradient(135deg, rgba(5,150,105,0.12), rgba(37,211,102,0.08))",
                                border: "1px solid rgba(5,150,105,0.2)",
                                color: "#059669",
                              }}
                            >
                              {step.icon}
                            </div>
                            <div className="flex items-center gap-2.5">
                              <span
                                className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                                style={{ background: "rgba(5,150,105,0.1)", color: "#059669" }}
                              >
                                {i + 1}
                              </span>
                              <span className="text-sm text-gray-700 font-medium">{step.label}</span>
                            </div>
                          </motion.div>
                        ))}
                      </div>

                      <div
                        className="mt-6 rounded-xl p-3.5 flex items-center gap-3"
                        style={{
                          background: "rgba(5,150,105,0.04)",
                          border: "1px solid rgba(5,150,105,0.1)",
                        }}
                      >
                        <WhatsAppIcon className="w-5 h-5 flex-shrink-0" style={{ color: "#25D366" }} />
                        <p className="text-xs text-gray-500 leading-relaxed">
                          Make sure you have WhatsApp Business App installed on your phone.
                        </p>
                      </div>
                    </div>

                    {/* Right: QR */}
                    <div className="flex flex-col items-center">
                      <AnimatePresence mode="wait">
                        {connected ? (
                          <motion.div
                            key="success"
                            className="flex flex-col items-center gap-4"
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ type: "spring", stiffness: 300, damping: 20 }}
                          >
                            <div
                              className="w-36 h-36 rounded-2xl flex flex-col items-center justify-center gap-2"
                              style={{
                                background: "linear-gradient(135deg, rgba(5,150,105,0.08), rgba(37,211,102,0.12))",
                                border: "2px solid rgba(5,150,105,0.25)",
                              }}
                            >
                              <motion.div
                                className="w-14 h-14 rounded-full flex items-center justify-center"
                                style={{ background: "linear-gradient(135deg, #059669, #25D366)" }}
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ type: "spring", stiffness: 400, damping: 15, delay: 0.1 }}
                              >
                                <CheckIcon size={28} />
                              </motion.div>
                            </div>
                            <div className="text-center">
                              <p className="text-sm font-semibold text-emerald-700">Connected Successfully</p>
                              <p className="text-xs text-gray-400 mt-0.5">Your account is now linked</p>
                            </div>
                          </motion.div>
                        ) : (
                          <motion.div
                            key="qr-display"
                            className="flex flex-col items-center gap-3"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                          >
                            {/* QR card */}
                            <motion.div
                              className="p-4 rounded-2xl"
                              style={{
                                background: "white",
                                boxShadow: "0 2px 20px rgba(5,150,105,0.1), 0 0 0 1px rgba(5,150,105,0.08)",
                              }}
                              animate={{ y: [0, -4, 0] }}
                              transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
                            >
                              <QRCodePlaceholder />
                            </motion.div>

                            {/* Status */}
                            <div className="flex items-center gap-2">
                              <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                              </span>
                              <span className="text-xs text-gray-500">Waiting for scan...</span>
                            </div>

                            {/* Timer + Refresh */}
                            <div className="flex items-center gap-3">
                              <span className="text-xs text-gray-400">
                                Refreshes in{" "}
                                <span className="font-semibold text-gray-600">{qrTimer}s</span>
                              </span>
                              <button
                                onClick={handleRefreshQR}
                                className="flex items-center gap-1 text-xs font-medium transition-colors duration-150"
                                style={{ color: "#059669", background: "none", border: "none", cursor: "pointer" }}
                              >
                                <RefreshIcon /> Refresh
                              </button>
                            </div>

                            <div className="text-xs text-gray-400 flex items-center gap-1.5">
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3.5 h-3.5">
                                <circle cx="12" cy="12" r="10" />
                                <path strokeLinecap="round" d="M12 6v6l4 2" />
                              </svg>
                              Estimated setup: less than 30 seconds
                            </div>

                            {/* Demo trigger */}
                            <button
                              onClick={handleSimulateConnect}
                              className="text-xs underline underline-offset-2 transition-colors duration-150"
                              style={{ color: "#9ca3af", background: "none", border: "none", cursor: "pointer" }}
                            >
                              Simulate successful scan (demo)
                            </button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="phone"
                  className="p-6 sm:p-8"
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -12 }}
                  transition={{ duration: 0.22 }}
                >
                  <div className="max-w-sm mx-auto">
                    <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-5">Enter Your Business Number</p>

                    <div className="flex gap-2 mb-4">
                      {/* Country selector */}
                      <div
                        className="flex items-center gap-1.5 px-3 py-3 rounded-xl text-sm font-medium cursor-pointer select-none"
                        style={{
                          background: "rgba(5,150,105,0.05)",
                          border: "1px solid rgba(5,150,105,0.15)",
                          color: "#374151",
                          minWidth: 90,
                          flexShrink: 0,
                        }}
                      >
                        <span>🇮🇳</span>
                        <span className="text-gray-500">+91</span>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-3 h-3 text-gray-400 ml-auto">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>

                      {/* Phone input */}
                      <input
                        type="tel"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        placeholder="98765 43210"
                        className="flex-1 px-4 py-3 rounded-xl text-sm text-gray-800 placeholder-gray-400 outline-none transition-all duration-200"
                        style={{
                          background: "rgba(255,255,255,0.8)",
                          border: "1px solid rgba(5,150,105,0.15)",
                          fontVariantNumeric: "tabular-nums",
                        }}
                        onFocus={(e) => {
                          e.currentTarget.style.border = "1px solid rgba(5,150,105,0.5)";
                          e.currentTarget.style.boxShadow = "0 0 0 3px rgba(5,150,105,0.08)";
                        }}
                        onBlur={(e) => {
                          e.currentTarget.style.border = "1px solid rgba(5,150,105,0.15)";
                          e.currentTarget.style.boxShadow = "none";
                        }}
                      />
                    </div>

                    <motion.button
                      onClick={handleSendCode}
                      disabled={!phoneNumber || sending || codeSent}
                      className="w-full py-3.5 rounded-xl text-sm font-semibold text-white transition-all duration-200 relative overflow-hidden"
                      style={{
                        background: phoneNumber && !codeSent
                          ? "linear-gradient(135deg, #059669, #25D366)"
                          : "#d1fae5",
                        color: phoneNumber && !codeSent ? "white" : "#6ee7b7",
                        border: "none",
                        cursor: phoneNumber && !codeSent ? "pointer" : "not-allowed",
                        boxShadow: phoneNumber && !codeSent ? "0 4px 15px rgba(5,150,105,0.3)" : "none",
                      }}
                      whileHover={phoneNumber && !codeSent ? { scale: 1.01 } : {}}
                      whileTap={phoneNumber && !codeSent ? { scale: 0.99 } : {}}
                    >
                      {sending ? (
                        <span className="flex items-center justify-center gap-2">
                          <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                          Sending...
                        </span>
                      ) : codeSent ? (
                        <span className="flex items-center justify-center gap-2">
                          <CheckIcon size={16} /> Code Sent!
                        </span>
                      ) : (
                        "Send Pairing Code"
                      )}
                    </motion.button>

                    <AnimatePresence>
                      {codeSent && (
                        <motion.div
                          className="mt-4 rounded-xl p-4"
                          style={{
                            background: "rgba(5,150,105,0.05)",
                            border: "1px solid rgba(5,150,105,0.15)",
                          }}
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                        >
                          <p className="text-xs text-gray-600 text-center leading-relaxed">
                            ✅ A secure pairing code has been sent to your WhatsApp Business account at <strong>+91 {phoneNumber}</strong>. Enter it in your WhatsApp app to complete linking.
                          </p>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {!codeSent && (
                      <p className="text-xs text-gray-400 text-center mt-3 leading-relaxed">
                        We'll send a secure pairing code to your WhatsApp Business account.
                      </p>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* ── Security Cards ── */}
          <motion.div
            className="w-full max-w-2xl grid sm:grid-cols-3 gap-3 mt-5"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            {[
              {
                icon: <ShieldIcon />,
                title: "256-bit End-to-End Encryption",
                desc: "All communication is encrypted.",
              },
              {
                icon: <BotIcon />,
                title: "AI Only Reads Business Orders",
                desc: "Personal conversations remain untouched.",
              },
              {
                icon: <ZapIcon />,
                title: "Disconnect Anytime",
                desc: "Remove access instantly with one click.",
              },
            ].map((card, i) => (
              <motion.div
                key={i}
                className="rounded-xl p-4 cursor-default"
                style={{
                  background: "rgba(255,255,255,0.65)",
                  backdropFilter: "blur(16px)",
                  WebkitBackdropFilter: "blur(16px)",
                  border: "1px solid rgba(5,150,105,0.10)",
                  boxShadow: "0 2px 12px rgba(5,150,105,0.04)",
                }}
                whileHover={{
                  y: -3,
                  boxShadow: "0 8px 24px rgba(5,150,105,0.12)",
                  borderColor: "rgba(5,150,105,0.22)",
                }}
                transition={{ duration: 0.2 }}
              >
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center mb-3"
                  style={{
                    background: "linear-gradient(135deg, rgba(5,150,105,0.1), rgba(37,211,102,0.07))",
                    color: "#059669",
                  }}
                >
                  {card.icon}
                </div>
                <p className="text-xs font-semibold text-gray-800 mb-1 leading-snug">{card.title}</p>
                <p className="text-xs text-gray-400 leading-relaxed">{card.desc}</p>
              </motion.div>
            ))}
          </motion.div>

          {/* ── CTA Button ── */}
          <motion.div
            className="w-full max-w-2xl mt-5"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            <motion.button
              disabled={!connected}
              className="w-full py-4 rounded-2xl text-sm font-semibold tracking-wide transition-all duration-300 relative overflow-hidden"
              style={{
                background: connected
                  ? "linear-gradient(135deg, #059669 0%, #25D366 100%)"
                  : "rgba(229,231,235,0.8)",
                color: connected ? "white" : "#9ca3af",
                border: connected ? "none" : "1px solid rgba(0,0,0,0.06)",
                cursor: connected ? "pointer" : "not-allowed",
                boxShadow: connected ? "0 8px 30px rgba(5,150,105,0.35)" : "none",
              }}
              whileHover={connected ? { scale: 1.01, boxShadow: "0 12px 40px rgba(5,150,105,0.45)" } : {}}
              whileTap={connected ? { scale: 0.99 } : {}}
            >
              {connected && (
                <motion.div
                  className="absolute inset-0"
                  style={{
                    background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)",
                  }}
                  animate={{ x: ["-100%", "100%"] }}
                  transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
                />
              )}
              <span className="relative flex items-center justify-center gap-2">
                {connected ? (
                  <>
                    Continue to AI Dashboard
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-4 h-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                    </svg>
                  </>
                ) : (
                  "Connect WhatsApp to Continue →"
                )}
              </span>
            </motion.button>
          </motion.div>

          {/* ── Footer ── */}
          <motion.p
            className="text-xs text-gray-400 text-center mt-8 leading-relaxed"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            Powered by Meta WhatsApp Business Cloud API
            <br />
            BusinessOS AI never accesses personal chats without your permission.
          </motion.p>
        </div>

        {/* ── Right panel (desktop) ── */}
        <motion.div
          className="hidden xl:flex flex-col justify-center px-12 py-12 w-80 flex-shrink-0"
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.35, duration: 0.5 }}
        >
          <motion.div
            className="rounded-2xl p-6"
            style={{
              background: "rgba(255,255,255,0.65)",
              backdropFilter: "blur(24px)",
              WebkitBackdropFilter: "blur(24px)",
              border: "1px solid rgba(5,150,105,0.12)",
              boxShadow: "0 4px 30px rgba(5,150,105,0.06)",
            }}
            animate={{ y: [0, -6, 0] }}
            transition={{ repeat: Infinity, duration: 5, ease: "easeInOut" }}
          >
            <div className="flex items-center gap-2 mb-5">
              <div
                className="w-6 h-6 rounded-md flex items-center justify-center"
                style={{ background: "linear-gradient(135deg, #059669, #25D366)" }}
              >
                <WhatsAppIcon className="w-3.5 h-3.5 text-white" />
              </div>
              <p className="text-sm font-semibold text-gray-800">Why Connect?</p>
            </div>

            <div className="space-y-3">
              {whyList.map((item, i) => (
                <motion.div
                  key={i}
                  className="flex items-center gap-2.5"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + i * 0.06 }}
                >
                  <div
                    className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ background: "rgba(5,150,105,0.12)", color: "#059669" }}
                  >
                    <CheckIcon size={10} />
                  </div>
                  <span className="text-xs text-gray-600">{item}</span>
                </motion.div>
              ))}
            </div>

            <div
              className="mt-5 pt-4 rounded-xl p-3.5 text-center"
              style={{
                background: "linear-gradient(135deg, rgba(5,150,105,0.06), rgba(37,211,102,0.04))",
                border: "1px solid rgba(5,150,105,0.1)",
                marginTop: 20,
              }}
            >
              <p className="text-xs font-semibold text-emerald-700">🚀 10,000+ businesses</p>
              <p className="text-xs text-gray-400 mt-0.5">already connected</p>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
