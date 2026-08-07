import { useEffect, useRef, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { useOrders } from "@/hooks/use-orders";
import { useInventory } from "@/hooks/use-inventory";
import { useDashboard } from "@/hooks/use-dashboard";
import { api } from "@/lib/apiClient";
import {
  Search,
  Send,
  Mic,
  MessageCircle,
  ScanLine,
  Package,
  Plus,
  ShoppingCart,
  Tag,
} from "lucide-react";

export default function OrdersPage() {
  const [view, setView] = useState<"orders" | "inventory">("orders");
  const [invSubTab, setInvSubTab] = useState<"products" | "raw_materials">("products");
  const { items: inventory, loading: inventoryLoading, createItem, restock, updateItem, deleteItem, refetch: refetchInventory } = useInventory();
  const { refetch: refetchDashboard } = useDashboard();
  const { tab, setTab, searchQuery, setSearchQuery, filteredOrders, tabs, loading: ordersLoading, sendReminder, acceptOrder, rejectOrder, completeOrder, productionPrompt, confirmProduction, dismissProduction, refetch, createOrder } = useOrders(refetchInventory, refetchDashboard);
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [showManualModal, setShowManualModal] = useState(false);
  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const [newItemType, setNewItemType] = useState<"product" | "raw_material">("product");
  const [newItemName, setNewItemName] = useState("");
  const [newItemPrice, setNewItemPrice] = useState("");
  const [newItemStock, setNewItemStock] = useState("");
  const [manualCustomerName, setManualCustomerName] = useState("");
  const [manualPhone, setManualPhone] = useState("");
  const [manualProducts, setManualProducts] = useState([{ name: "", quantity: "1", price: "" }]);
  const [manualPaymentStatus, setManualPaymentStatus] = useState("unpaid");
  const [manualNotes, setManualNotes] = useState("");
  const [manualError, setManualError] = useState<string | null>(null);
  const [manualSaving, setManualSaving] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState<"idle" | "listening" | "preview" | "processing">("idle");
  const [voiceTranscript, setVoiceTranscript] = useState("");
  const [voicePreviewText, setVoicePreviewText] = useState("");
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [voiceConfirmDisabled, setVoiceConfirmDisabled] = useState(false);
  const [voiceSeconds, setVoiceSeconds] = useState(0);
  const recognitionRef = useRef<any>(null);
  const voiceFinalRef = useRef("");

  useEffect(() => {
    if (!showVoiceModal || voiceStatus !== "listening") return;
    const interval = window.setInterval(() => setVoiceSeconds((s) => s + 1), 1000);
    return () => window.clearInterval(interval);
  }, [showVoiceModal, voiceStatus]);

  const resetVoiceState = () => {
    setVoiceError(null);
    setVoiceTranscript("");
    setVoicePreviewText("");
    setVoiceSeconds(0);
    voiceFinalRef.current = "";
    setVoiceConfirmDisabled(false);
  };

  const stopVoiceCapture = () => {
    recognitionRef.current?.stop();
    setVoiceStatus("preview");
  };

  const startRecognition = () => {
    const SpeechRecognitionCtor = (window as Window & typeof globalThis & { webkitSpeechRecognition?: new () => any; SpeechRecognition?: new () => any }).webkitSpeechRecognition
      || (window as Window & typeof globalThis & { webkitSpeechRecognition?: new () => any; SpeechRecognition?: new () => any }).SpeechRecognition;

    if (!SpeechRecognitionCtor) {
      setVoiceError("Speech recognition is not supported in this browser.");
      setVoiceStatus("idle");
      return;
    }

    const recognition = new SpeechRecognitionCtor();
    recognitionRef.current = recognition;
    recognition.lang = "en-IN";
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 3;

    recognition.onresult = (event: any) => {
      let interimText = "";
      let finalText = "";
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        const piece = result[0]?.transcript || "";
        if (result.isFinal) {
          finalText += ` ${piece}`.trim();
        } else {
          interimText += ` ${piece}`.trim();
        }
      }
      if (finalText) {
        voiceFinalRef.current = `${voiceFinalRef.current} ${finalText}`.trim();
      }
      const combined = voiceFinalRef.current || interimText;
      setVoiceTranscript(combined.trim());
      setVoicePreviewText(combined.trim());
    };

    recognition.onerror = (event: any) => {
      const detail = event?.error || "speech_error";
      setVoiceError(detail === "not-allowed" ? "Microphone access was blocked. Please allow it and try again." : "Unable to capture speech right now.");
      setVoiceStatus("idle");
    };

    recognition.onend = () => {
      const finalText = voiceFinalRef.current.trim();
      if (finalText) {
        setVoiceTranscript(finalText);
        setVoicePreviewText(finalText);
        setVoiceStatus("preview");
      } else {
        setVoiceError("No speech detected. Please try again.");
        setVoiceStatus("idle");
      }
    };

    recognition.start();
  };

  const handleVoiceOrder = () => {
    resetVoiceState();
    setShowVoiceModal(true);
    setVoiceStatus("listening");
    startRecognition();
  };

  const handleRecordAgain = () => {
    setVoiceError(null);
    setVoiceTranscript("");
    setVoicePreviewText("");
    voiceFinalRef.current = "";
    setVoiceStatus("listening");
    startRecognition();
  };

  const handleCreateVoiceOrder = async () => {
    const text = voicePreviewText.trim();
    if (!text) {
      setVoiceError("Please capture a voice order first.");
      return;
    }
    setVoiceStatus("processing");
    setVoiceError(null);
    try {
      // First classify intent to ensure this is an order
      const cls = await api.post('/api/ai/classify', { text });
      console.log('[VOICE] classify response:', cls);
      const raw = cls?.data ?? cls;
      let intent: string | null = raw?.intent ?? raw?.data?.intent ?? raw?.result ?? cls?.intent ?? null;
      if (typeof intent === 'string') intent = intent.toUpperCase();
      console.log('[VOICE] parsed intent:', intent);
      if (!intent || intent !== 'NEW_ORDER') {
        setVoiceError("This voice shortcut is for creating orders only. Payments and customer interactions are handled through WhatsApp.");
        setVoiceConfirmDisabled(true);
        setVoiceStatus('preview');
        return;
      }

      const parseRes = await api.post<{ data?: any }>('/api/ai/parse', { text });
      const parsed = parseRes.data?.data ?? parseRes.data ?? null;

      if (!parsed || !Array.isArray(parsed.items) || parsed.items.length === 0) {
        setVoiceError("Could not parse an order from the transcript. Please edit the transcript and try again.");
        setVoiceStatus("preview");
        return;
      }

      const wordToNumber: Record<string, number> = { one:1,two:2,three:3,four:4,five:5,six:6,seven:7,eight:8,nine:9,ten:10, aadha:0.5, half:0.5, ek:1, do:2, teen:3 };
      const parseQuantity = (q: any) => {
        if (q === undefined || q === null) return null;
        if (typeof q === 'number') return q;
        const s = String(q).trim().toLowerCase();
        if (!Number.isNaN(Number(s))) return Number(s);
        const alpha = s.replace(/[^a-z]/g, '');
        if (alpha && wordToNumber[alpha] !== undefined) return wordToNumber[alpha];
        const parsedInt = Number.parseInt(s, 10);
        return Number.isNaN(parsedInt) ? null : parsedInt;
      };

      const parsedItems = parsed.items.map((item: any) => ({
        item_name: item.product || item.name || item.item || "",
        quantity: parseQuantity(item.quantity),
        unit: item.unit || "pcs",
        unit_price: 0,
      }));

      // If any item is missing name or quantity, abort and ask user to edit transcript
      const invalid = parsedItems.some((it: any) => !it.item_name || it.quantity === null || it.quantity === undefined);
      if (invalid) {
        setVoiceError("Parsed items were incomplete. Please edit the transcript to be clearer.");
        setVoiceStatus("preview");
        return;
      }

      await createOrder({
        customer_name: parsed.customer_name || undefined,
        customer_phone: "",
        items: parsedItems,
        total_amount: 0,
        source: "voice",
        input_type: "voice",
        owner_initiated: true,
        payment_status: "unpaid",
        notes: text,
        transcript: text,
      });
      setShowVoiceModal(false);
      resetVoiceState();
    } catch (err) {
      setVoiceError(err instanceof Error ? err.message : "Could not create the order.");
      setVoiceStatus("preview");
    }
  };

  const addManualProduct = () => {
    setManualProducts([...manualProducts, { name: "", quantity: "1", price: "" }]);
  };

  const updateManualProduct = (index: number, field: "name" | "quantity" | "price", value: string) => {
    const next = [...manualProducts];
    next[index][field] = value;
    setManualProducts(next);
  };

  const removeManualProduct = (index: number) => {
    if (manualProducts.length === 1) {
      setManualProducts([{ name: "", quantity: "1", price: "" }]);
      return;
    }
    setManualProducts(manualProducts.filter((_, itemIndex) => itemIndex !== index));
  };

  const handleCreateManualOrder = async () => {
    if (!manualCustomerName.trim()) {
      setManualError("Customer name is required.");
      return;
    }
    const validProducts = manualProducts.filter((p) => p.name.trim());
    if (validProducts.length === 0) {
      setManualError("Add at least one product.");
      return;
    }

    setManualSaving(true);
    setManualError(null);
    try {
      const payload = {
        customer_name: manualCustomerName.trim(),
        customer_phone: manualPhone.trim(),
        items: validProducts.map((product) => ({
          item_name: product.name.trim(),
          quantity: Number(product.quantity) || 1,
          unit: "pcs",
          unit_price: Number(product.price) || 0,
        })),
        total_amount: validProducts.reduce((sum, product) => sum + (Number(product.price) || 0) * (Number(product.quantity) || 1), 0),
        source: "manual",
        input_type: "text",
        payment_status: manualPaymentStatus,
        notes: manualNotes.trim(),
      };
      await createOrder(payload);
      setShowManualModal(false);
      setManualCustomerName("");
      setManualPhone("");
      setManualProducts([{ name: "", quantity: "1", price: "" }]);
      setManualPaymentStatus("unpaid");
      setManualNotes("");
    } catch (err) {
      setManualError(err instanceof Error ? err.message : "Could not create the order.");
    } finally {
      setManualSaving(false);
    }
  };

  return (
    <AppShell>
      {/* Top view switcher */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="glass-card inline-flex rounded-full p-1">
          <button
            onClick={() => setView("orders")}
            className={`inline-flex items-center gap-2 rounded-full px-5 py-2 text-sm font-bold transition ${view === "orders" ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-md shadow-emerald-500/30" : "text-slate-600 hover:text-emerald-700"}`}
          >
            <ShoppingCart className="h-4 w-4" /> Live Orders Feed
          </button>
          <button
            onClick={() => setView("inventory")}
            className={`inline-flex items-center gap-2 rounded-full px-5 py-2 text-sm font-bold transition ${view === "inventory" ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-md shadow-emerald-500/30" : "text-slate-600 hover:text-emerald-700"}`}
          >
            <Tag className="h-4 w-4" /> Stock &amp; Inventory Control
          </button>
        </div>
      </div>

      {view === "orders" && (
        <div className="animate-fade-in">
          <div className="glass-card mb-6 rounded-3xl p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h1 className="text-2xl font-extrabold text-slate-900">Orders &amp; Inventory</h1>
                <p className="text-sm text-slate-500">
                  {ordersLoading
                    ? "Loading orders…"
                    : `${filteredOrders.length} orders · AI-automated`}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleVoiceOrder}
                  className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white/80 px-4 py-2.5 text-sm font-semibold text-emerald-800 hover:bg-emerald-50"
                >
                  <Mic className="h-4 w-4" /> Voice Order
                </button>
                <button
                  onClick={() => setShowManualModal(true)}
                  className="btn-glow-emerald inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold"
                >
                  <Plus className="h-4 w-4" /> Manual Order
                </button>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              {tabs.map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`rounded-full px-4 py-1.5 text-xs font-bold transition ${tab === t ? "bg-slate-900 text-white shadow-md" : "bg-white/70 text-slate-600 hover:bg-white"}`}
                >
                  {t}
                </button>
              ))}
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <div className="flex flex-1 items-center gap-2 rounded-full border border-emerald-100 bg-white/70 px-3 py-2">
                <Search className="h-4 w-4 text-slate-500" />
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by customer name or phone…"
                  className="flex-1 bg-transparent text-sm outline-none"
                />
              </div>
              <select className="rounded-full border border-emerald-100 bg-white/70 px-3 py-2 text-xs font-semibold text-slate-700">
                <option>Last 30 days</option>
                <option>Last 7 days</option>
                <option>Today</option>
              </select>
              <select className="rounded-full border border-emerald-100 bg-white/70 px-3 py-2 text-xs font-semibold text-slate-700">
                <option>All input types</option>
                <option>Voice notes</option>
                <option>Text</option>
                <option>Screenshots</option>
              </select>
            </div>
          </div>

          {/* Orders table */}
          <div className="glass-card overflow-hidden rounded-3xl">
            {ordersLoading ? (
              <div className="flex items-center justify-center py-16 text-sm text-slate-400">
                Loading orders…
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="flex items-center justify-center py-16 text-sm text-slate-400">
                No orders found.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50/70 text-left text-[11px] uppercase tracking-widest text-slate-500">
                    <tr>
                      <th className="p-4">Order</th>
                      <th>Customer</th>
                      <th>Items</th>
                      <th>Amount</th>
                      <th>Mode</th>
                      <th>Source</th>
                      <th>Status</th>
                      <th className="pr-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOrders.map((o) => (
                      <tr
                        key={o.id}
                        className="border-t border-slate-100 hover:bg-emerald-50/40 [&>td]:py-4 [&>td]:pr-4"
                      >
                        <td className="pl-4 font-mono text-xs font-bold text-slate-700">{o.order_number}</td>
                        <td>
                          <div className="font-semibold text-slate-900">{o.customer}</div>
                          <div className="text-[11px] text-slate-500">{o.phone}</div>
                        </td>
                        <td className="max-w-[220px] text-slate-700">{o.items}</td>
                        <td>
                          <div className="font-bold text-slate-900">{o.amount != null ? `₹${o.amount}` : <span className="text-xs text-slate-400">—</span>}</div>
                          {o.amount != null && o.paid < o.amount && o.status !== "rejected" && (
                            <div className="text-[11px] text-amber-700">₹{o.amount - o.paid} due</div>
                          )}
                        </td>
                        <td>
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-700">
                            {o.mode}
                          </span>
                        </td>
                        <td>
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-600">
                            {o.src === "voice" && (
                              <>
                                <Mic className="h-3 w-3" /> Voice
                              </>
                            )}
                            {o.src === "text" && (
                              <>
                                <MessageCircle className="h-3 w-3" /> Text
                              </>
                            )}
                            {o.src === "image" && (
                              <>
                                <ScanLine className="h-3 w-3" /> Screenshot
                              </>
                            )}
                          </span>
                        </td>
                        <td>
                          <span
                            className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${
                              o.status === "completed"
                                ? "bg-emerald-100 text-emerald-800"
                                : o.status === "pending"
                                  ? "bg-amber-100 text-amber-800"
                                  : o.status === "accepted"
                                    ? "bg-blue-100 text-blue-800"
                                    : "bg-rose-100 text-rose-800"
                            }`}
                          >
                            {o.status.charAt(0).toUpperCase() + o.status.slice(1)}
                          </span>
                        </td>
                        <td className="pr-4 text-right">
                          {o.status === "pending" ? (
                            <div className="flex gap-2 justify-end">
                              <button
                                onClick={() => acceptOrder(o.id)}
                                className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[11px] font-semibold text-emerald-800 hover:bg-emerald-100"
                              >
                                Accept
                              </button>
                              <button
                                onClick={() => rejectOrder(o.id)}
                                className="inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-3 py-1.5 text-[11px] font-semibold text-rose-800 hover:bg-rose-100"
                              >
                                Reject
                              </button>
                            </div>
                          ) : o.status === "accepted" ? (
                            <button
                              onClick={() => completeOrder(o.id)}
                              className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-[11px] font-semibold text-blue-800 hover:bg-blue-100"
                            >
                              Complete
                            </button>
                          ) : (
                            <button
                              onClick={() => sendReminder(o.id)}
                              className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-white/70 px-3 py-1.5 text-[11px] font-semibold text-emerald-800 hover:bg-emerald-50"
                            >
                              <Send className="h-3 w-3" /> Remind
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {view === "inventory" && (
        <div className="animate-fade-in glass-card rounded-3xl p-6">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-amber-400 to-rose-500 text-white">
                <Package className="h-4 w-4" />
              </div>
              <h2 className="text-lg font-extrabold text-slate-900">Inventory Control</h2>
            </div>
            <button
              onClick={() => setShowAddItemModal(true)}
              className="rounded-full border border-emerald-200 px-4 py-1.5 text-xs font-bold text-emerald-800 hover:bg-emerald-50"
            >
              + Add Item
            </button>
          </div>

          {/* Sub-tabs: Products / Raw Materials */}
          <div className="mb-4 flex gap-2">
            <button
              onClick={() => setInvSubTab("products")}
              className={`rounded-full px-4 py-1.5 text-xs font-bold transition ${
                invSubTab === "products"
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "bg-white/70 text-slate-600 hover:bg-white border border-slate-200"
              }`}
            >
              🛍️ Sellable Products
            </button>
            <button
              onClick={() => setInvSubTab("raw_materials")}
              className={`rounded-full px-4 py-1.5 text-xs font-bold transition ${
                invSubTab === "raw_materials"
                  ? "bg-amber-500 text-white shadow-sm"
                  : "bg-white/70 text-slate-600 hover:bg-white border border-slate-200"
              }`}
            >
              🌾 Raw Materials / Ingredients
            </button>
          </div>

          {invSubTab === "raw_materials" && (
            <div className="mb-4 rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-xs text-amber-800">
              <b>Raw Materials</b> are ingredients consumed when orders are accepted. Set <code>sku = raw_material</code> to mark an item.
              Sellable products can reference these in their BOM (Bill of Materials) stored in the description field as JSON.
            </div>
          )}

          {inventoryLoading ? (
            <div className="flex items-center justify-center py-10 text-sm text-slate-400">
              Loading inventory…
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="text-left text-[11px] uppercase tracking-widest text-slate-500">
                  <tr>
                    <th className="pb-3">{invSubTab === "products" ? "Product" : "Ingredient"}</th>
                    <th>Unit Price</th>
                    <th>Stock</th>
                    <th>Low-stock Alert</th>
                    <th className="pr-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {inventory
                    .filter(it => {
                      const isRaw = (it as { sku?: string }).sku === "raw_material";
                      return invSubTab === "raw_materials" ? isRaw : !isRaw;
                    })
                    .map((it) => {
                      const pct = Math.min(100, Math.round((it.stock / (it.low * 2 || 1)) * 100));
                      const critical = it.stock <= it.low;
                      const raw = it as { sku?: string; description?: string };
                      let bomCount = 0;
                      try {
                        if (raw.description) {
                          const d = JSON.parse(raw.description);
                          if (d?.bom) bomCount = Object.keys(d.bom).length;
                        }
                      } catch {}
                      return (
                        <tr key={it.id} className="border-t border-slate-100">
                          <td className="py-3">
                            <div className="font-semibold text-slate-900">{it.name}</div>
                            {bomCount > 0 && (
                              <div className="text-[10px] text-amber-600 mt-0.5">🌾 {bomCount} ingredient{bomCount > 1 ? "s" : ""} in BOM</div>
                            )}
                          </td>
                          <td>
                            <input
                              type="number"
                              value={it.price}
                              onChange={(e) => updateItem(it.id, { price: Number(e.target.value) })}
                              className="w-20 rounded border border-slate-200 bg-white/70 px-2 py-1 text-sm outline-none focus:border-emerald-500"
                            />
                          </td>
                          <td>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => restock(it.id, -1)}
                                disabled={it.stock <= 0}
                                className="h-6 w-6 rounded-full border border-slate-200 bg-white/70 text-slate-600 hover:bg-slate-100 disabled:opacity-30"
                              >
                                -
                              </button>
                              <span className={`w-8 text-center font-bold ${critical ? "text-rose-700" : "text-slate-800"}`}>
                                {it.stock}
                              </span>
                              <button
                                onClick={() => restock(it.id, 1)}
                                className="h-6 w-6 rounded-full border border-slate-200 bg-white/70 text-slate-600 hover:bg-slate-100"
                              >
                                +
                              </button>
                            </div>
                          </td>
                          <td>≤ {it.low}{it.unit ?? ""}</td>
                          <td className="pr-4 text-right">
                            <button
                              onClick={() => deleteItem(it.id)}
                              className="text-[11px] font-semibold text-rose-700 hover:text-rose-900"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
              {inventory.filter(it => {
                const isRaw = (it as { sku?: string }).sku === "raw_material";
                return invSubTab === "raw_materials" ? isRaw : !isRaw;
              }).length === 0 && (
                <div className="flex items-center justify-center py-10 text-sm text-slate-400">
                  {invSubTab === "raw_materials"
                    ? "No raw materials yet. Add ingredients used to make your products."
                    : "No products found. Add your first sellable product."}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Voice Order Modal */}
      {showVoiceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="glass-card w-full max-w-md rounded-2xl p-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Voice Order</h3>
                <p className="text-sm text-slate-500">Speak naturally and confirm the draft below.</p>
              </div>
              <button onClick={() => { setShowVoiceModal(false); resetVoiceState(); }} className="text-sm text-slate-500">Close</button>
            </div>
            <div className="mt-4 rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4">
              {voiceStatus === "listening" ? (
                <>
                  <div className="flex items-center justify-between gap-4 text-sm font-semibold text-emerald-800">
                    <div className="flex items-center gap-3">
                      <div className="grid h-12 w-12 place-items-center rounded-2xl bg-emerald-500/10 text-emerald-700">
                        <Mic className="h-6 w-6" />
                      </div>
                      <div>
                        <div className="text-sm font-bold">Listening</div>
                        <div className="text-xs text-emerald-700/80">Speak your order clearly</div>
                      </div>
                    </div>
                    <span className="text-sm">{voiceSeconds}s</span>
                  </div>
                  <div className="mt-4 flex h-16 items-end gap-1">
                    {Array.from({ length: 18 }).map((_, idx) => {
                      const height = 16 + Math.round((Math.sin((idx * 0.45) + voiceSeconds * 0.4) * 0.5 + 0.5) * 42);
                      return <div key={idx} className="flex-1 rounded-full bg-emerald-500/70 transition-all duration-200" style={{ height: `${height}px` }} />;
                    })}
                  </div>
                  <button
                    onClick={stopVoiceCapture}
                    className="mt-4 w-full rounded-full bg-rose-500 px-4 py-3 text-sm font-semibold text-white"
                  >
                    Stop Recording
                  </button>
                </>
              ) : voiceStatus === "processing" ? (
                <div className="text-sm font-semibold text-emerald-800">Confirming order…</div>
              ) : (
                <>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">Transcript Preview</label>
                  <textarea
                    value={voicePreviewText}
                    onChange={(e) => setVoicePreviewText(e.target.value)}
                    rows={6}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500"
                    placeholder="Edit the transcript before confirming the order"
                  />
                  {voiceError && <div className="mt-2 text-sm text-rose-600">{voiceError}</div>}
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={handleRecordAgain}
                      className="flex-1 rounded-full border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600"
                    >
                      Record Again
                    </button>
                    <button
                      onClick={handleCreateVoiceOrder}
                      disabled={voiceConfirmDisabled}
                      className={`flex-1 rounded-full px-3 py-2 text-sm font-semibold ${voiceConfirmDisabled ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-emerald-600 text-white'}`}
                    >
                      Confirm Order
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Manual Order Modal */}
      {showManualModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="glass-card w-full max-w-2xl rounded-2xl p-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Create Manual Order</h3>
                <p className="text-sm text-slate-500">Capture a quick order for the customer.</p>
              </div>
              <button onClick={() => setShowManualModal(false)} className="text-sm text-slate-500">Close</button>
            </div>
            <div className="mt-4 space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600">Customer Name</label>
                  <input value={manualCustomerName} onChange={(e) => setManualCustomerName(e.target.value)} className="w-full rounded-lg border border-slate-200 bg-white/70 px-3 py-2 text-sm outline-none focus:border-emerald-500" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600">Phone</label>
                  <input value={manualPhone} onChange={(e) => setManualPhone(e.target.value)} className="w-full rounded-lg border border-slate-200 bg-white/70 px-3 py-2 text-sm outline-none focus:border-emerald-500" placeholder="98765xxxxx" />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">Products</label>
                <div className="space-y-2">
                  {manualProducts.map((product, index) => (
                    <div key={index} className="grid gap-2 md:grid-cols-[1.8fr_0.8fr_0.8fr_auto]">
                      <input value={product.name} onChange={(e) => updateManualProduct(index, "name", e.target.value)} placeholder="Product name" className="rounded-lg border border-slate-200 bg-white/70 px-3 py-2 text-sm outline-none focus:border-emerald-500" />
                      <input type="number" value={product.quantity} onChange={(e) => updateManualProduct(index, "quantity", e.target.value)} placeholder="Qty" className="rounded-lg border border-slate-200 bg-white/70 px-3 py-2 text-sm outline-none focus:border-emerald-500" />
                      <input type="number" value={product.price} onChange={(e) => updateManualProduct(index, "price", e.target.value)} placeholder="Price" className="rounded-lg border border-slate-200 bg-white/70 px-3 py-2 text-sm outline-none focus:border-emerald-500" />
                      <button onClick={() => removeManualProduct(index)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600">Remove</button>
                    </div>
                  ))}
                </div>
                <button onClick={addManualProduct} className="mt-2 text-sm font-semibold text-emerald-700">+ Add Product</button>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600">Payment Status</label>
                  <select value={manualPaymentStatus} onChange={(e) => setManualPaymentStatus(e.target.value)} className="w-full rounded-lg border border-slate-200 bg-white/70 px-3 py-2 text-sm outline-none focus:border-emerald-500">
                    <option value="unpaid">Unpaid</option>
                    <option value="partially_paid">Partially Paid</option>
                    <option value="fully_paid">Fully Paid</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600">Notes</label>
                  <input value={manualNotes} onChange={(e) => setManualNotes(e.target.value)} placeholder="Delivery time, special request" className="w-full rounded-lg border border-slate-200 bg-white/70 px-3 py-2 text-sm outline-none focus:border-emerald-500" />
                </div>
              </div>
              {manualError && <div className="text-sm text-rose-600">{manualError}</div>}
              <div className="flex gap-2">
                <button onClick={() => setShowManualModal(false)} className="flex-1 rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600">Cancel</button>
                <button onClick={handleCreateManualOrder} disabled={manualSaving} className="flex-1 rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{manualSaving ? "Saving..." : "Create Order"}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Item Modal */}
      {showAddItemModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="glass-card w-full max-w-md rounded-2xl p-6">
            <h3 className="mb-4 text-lg font-bold text-slate-900">Add New Inventory Item</h3>
            <div className="space-y-4">
              {/* Type selector */}
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">Item Type</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setNewItemType("product")}
                    className={`flex-1 rounded-lg px-3 py-2 text-xs font-semibold transition ${
                      newItemType === "product"
                        ? "bg-emerald-500 text-white"
                        : "border border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    🛍️ Sellable Product
                  </button>
                  <button
                    onClick={() => setNewItemType("raw_material")}
                    className={`flex-1 rounded-lg px-3 py-2 text-xs font-semibold transition ${
                      newItemType === "raw_material"
                        ? "bg-amber-500 text-white"
                        : "border border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    🌾 Raw Material
                  </button>
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">Item Name</label>
                <input
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  placeholder={newItemType === "product" ? "e.g., Chocolate Cake" : "e.g., Flour 1kg"}
                  className="w-full rounded-lg border border-slate-200 bg-white/70 px-3 py-2 text-sm outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">
                  {newItemType === "product" ? "Selling Price (₹)" : "Cost Price (₹)"}
                </label>
                <input
                  type="number"
                  value={newItemPrice}
                  onChange={(e) => setNewItemPrice(e.target.value)}
                  placeholder="0"
                  className="w-full rounded-lg border border-slate-200 bg-white/70 px-3 py-2 text-sm outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">
                  {newItemType === "product" ? "Stock Quantity" : "Current Stock (kg/units)"}
                </label>
                <input
                  type="number"
                  value={newItemStock}
                  onChange={(e) => setNewItemStock(e.target.value)}
                  placeholder="0"
                  className="w-full rounded-lg border border-slate-200 bg-white/70 px-3 py-2 text-sm outline-none focus:border-emerald-500"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setShowAddItemModal(false);
                    setNewItemName("");
                    setNewItemPrice("");
                    setNewItemStock("");
                    setNewItemType("product");
                  }}
                  className="flex-1 rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    if (newItemName.trim()) {
                      await createItem({
                        name: newItemName,
                        price: Number(newItemPrice) || 0,
                        stock: Number(newItemStock) || 0,
                        low: 5,
                        unit: undefined,
                        sku: newItemType,
                      } as { name: string; price: number; stock: number; low: number; unit?: string; sku?: string });
                      setShowAddItemModal(false);
                      setNewItemName("");
                      setNewItemPrice("");
                      setNewItemStock("");
                      setNewItemType("product");
                    }
                  }}
                  disabled={!newItemName.trim()}
                  className={`flex-1 rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 ${
                    newItemType === "product" ? "bg-emerald-500 hover:bg-emerald-600" : "bg-amber-500 hover:bg-amber-600"
                  }`}
                >
                  Add {newItemType === "product" ? "Product" : "Raw Material"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Production Confirmation Dialog */}
      {productionPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="glass-card w-full max-w-sm rounded-2xl p-6 shadow-2xl">
            <div className="mb-3 grid h-10 w-10 place-items-center rounded-xl bg-amber-100">
              <Package className="h-5 w-5 text-amber-700" />
            </div>
            <h3 className="text-base font-extrabold text-slate-900">Stock Shortage</h3>
            <p className="mt-1 text-sm text-slate-600">
              Only <b>{productionPrompt.available}</b> finished <b>{productionPrompt.item_name}</b>s are in stock.
              You need <b>{productionPrompt.required}</b>.
            </p>
            <p className="mt-2 text-sm font-semibold text-amber-800">
              Produce the remaining <b>{productionPrompt.need}</b> unit{productionPrompt.need > 1 ? "s" : ""} now?
              (Ingredients will be deducted from raw material stock.)
            </p>
            <div className="mt-5 flex gap-3">
              <button
                onClick={dismissProduction}
                className="flex-1 rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmProduction}
                className="flex-1 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-2 text-sm font-bold text-white shadow-md hover:opacity-90"
              >
                Produce &amp; Accept
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
