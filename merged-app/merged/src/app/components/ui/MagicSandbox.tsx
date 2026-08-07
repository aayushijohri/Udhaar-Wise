import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Sparkles,
  Mic,
  MessageCircle,
  CreditCard,
  ArrowRight,
  User,
  Package,
  CheckCircle2,
} from "lucide-react";

const demos = [
  {
    title: "Voice",
    icon: Mic,
    badge: "Whisper AI",
    message:
      "Mohan ko 2kg sugar aur 5 packet Maggi kal subah bhej dena.",
    customer: "Mohan Kumar",
    payment: "₹540 Pending",
    items: [
      { name: "Sugar", qty: "2kg" },
      { name: "Maggi", qty: "5 Packets" },
    ],
  },
  {
    title: "WhatsApp",
    icon: MessageCircle,
    badge: "Gemini AI",
    message:
      "Rahul: 3kg chawal aur 2L oil udhaar me de dena.",
    customer: "Rahul Verma",
    payment: "₹890 Pending",
    items: [
      { name: "Rice", qty: "3kg" },
      { name: "Oil", qty: "2L" },
    ],
  },
  {
    title: "UPI",
    icon: CreditCard,
    badge: "Payment AI",
    message:
      "₹850 received from Priya Sharma via UPI.",
    customer: "Priya Sharma",
    payment: "Paid",
    items: [{ name: "Ledger Updated", qty: "₹850" }],
  },
];

export default function MagicSandbox() {
  const [active, setActive] = useState(0);

  const current = demos[active];

  return (
    <section className="py-20 bg-gradient-to-b from-white to-emerald-50/40">
      <div className="mx-auto max-w-7xl px-6">

        {/* Heading */}

        <div className="text-center">
          <span className="inline-flex rounded-full bg-violet-100 px-4 py-2 text-xs font-bold text-violet-700">
            ✨ THE MAGIC SANDBOX
          </span>

          <h2 className="mt-4 text-4xl font-extrabold text-slate-900">
            Try it live. No signup.
          </h2>

          <p className="mt-3 text-slate-500">
            Watch AI instantly convert customer conversations into
            structured business records.
          </p>
        </div>

        {/* Main Card */}

        <div className="mt-10 rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">

          <div className="grid gap-6 lg:grid-cols-2">
                        {/* LEFT PANEL */}

            <div>
              {/* Tabs */}
              <div className="flex rounded-2xl bg-slate-100 p-1">
                {demos.map((demo, index) => {
                  const Icon = demo.icon;

                  return (
                    <button
                      key={demo.title}
                      onClick={() => setActive(index)}
                      className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all ${
                        active === index
                          ? "bg-white text-slate-900 shadow"
                          : "text-slate-500 hover:text-slate-900"
                      }`}
                    >
                      <Icon size={16} />
                      {demo.title}
                    </button>
                  );
                })}
              </div>

              <AnimatePresence mode="wait">
                <motion.div
                  key={active}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.25 }}
                  className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-5"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-slate-900">
                        {current.badge}
                      </h3>

                      <p className="mt-1 text-sm text-slate-500">
                        Customer Message
                      </p>
                    </div>

                    <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                      Demo
                    </span>
                  </div>

                  <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
                    <p className="text-sm leading-7 text-slate-700">
                      {current.message}
                    </p>
                  </div>

                  <button className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 py-3 font-semibold text-white transition hover:scale-[1.02]">
                    <Sparkles size={16} />
                    Process with AI
                    <ArrowRight size={15} />
                  </button>

                  <div className="mt-4 flex items-center gap-2 text-xs text-slate-500">
                    <CheckCircle2
                      size={15}
                      className="text-emerald-500"
                    />

                    AI extracts ledger, inventory & payment automatically
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
                        {/* RIGHT PANEL */}

            <div>
              <AnimatePresence mode="wait">
                <motion.div
                  key={active}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.25 }}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
                >
                  {/* Header */}

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-widest text-emerald-600">
                        AI OUTPUT
                      </p>

                      <h3 className="mt-1 text-lg font-bold text-slate-900">
                        Parsed Result
                      </h3>
                    </div>

                    <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">
                      Ready
                    </span>
                  </div>

                  {/* Customer */}

                  <div className="mt-5 rounded-xl border border-slate-200 bg-white p-4">
                    <div className="flex items-center gap-3">
                      <div className="grid h-10 w-10 place-items-center rounded-full bg-emerald-100">
                        <User
                          size={18}
                          className="text-emerald-600"
                        />
                      </div>

                      <div>
                        <p className="text-xs text-slate-500">
                          Customer
                        </p>

                        <h4 className="font-bold text-slate-900">
                          {current.customer}
                        </h4>
                      </div>
                    </div>
                  </div>

                  {/* Items */}

                  <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
                    <div className="mb-3 flex items-center gap-2">
                      <Package
                        size={16}
                        className="text-emerald-600"
                      />

                      <span className="font-semibold text-slate-900">
                        Items
                      </span>
                    </div>

                    <div className="space-y-2">
                      {current.items.map((item) => (
                        <div
                          key={item.name}
                          className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2"
                        >
                          <span className="text-sm text-slate-700">
                            {item.name}
                          </span>

                          <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-bold text-emerald-700">
                            {item.qty}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Payment */}

                  <div className="mt-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 p-4 text-white">
                    <p className="text-xs opacity-80">
                      Payment Status
                    </p>

                    <h3 className="mt-2 text-xl font-bold">
                      {current.payment}
                    </h3>
                  </div>

                  {/* Confidence */}

                  <div className="mt-4 flex items-center justify-between rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Sparkles
                        size={16}
                        className="text-emerald-600"
                      />

                      <span className="text-sm font-medium text-slate-700">
                        AI Confidence
                      </span>
                    </div>

                    <span className="rounded-full bg-emerald-500 px-3 py-1 text-xs font-bold text-white">
                      99.2%
                    </span>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
                      </div> {/* End Grid */}

        </div> {/* End Main Card */}

        {/* Footer */}

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3 text-sm text-slate-500">

          <span className="flex items-center gap-1">
            ⚡ Whisper AI
          </span>

          <span>•</span>

          <span className="flex items-center gap-1">
            🧠 Gemini AI
          </span>

          <span>•</span>

          <span className="flex items-center gap-1">
            📊 AI Ledger Engine
          </span>

        </div>

      </div>
    </section>
  );
}