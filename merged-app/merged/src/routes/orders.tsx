import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { useOrders } from "@/hooks/use-orders";
import { useInventory } from "@/hooks/use-inventory";
import { useDashboard } from "@/hooks/use-dashboard";
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
  const { items: inventory, loading: inventoryLoading, createItem, restock, updateItem, deleteItem, refetch: refetchInventory } = useInventory();
  const { refetch: refetchDashboard } = useDashboard();
  const { tab, setTab, searchQuery, setSearchQuery, filteredOrders, tabs, loading: ordersLoading, sendReminder, acceptOrder, rejectOrder, completeOrder } = useOrders(refetchInventory, refetchDashboard);
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [newItemName, setNewItemName] = useState("");
  const [newItemPrice, setNewItemPrice] = useState("");
  const [newItemStock, setNewItemStock] = useState("");

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
              <button className="btn-glow-emerald inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold">
                <Plus className="h-4 w-4" /> Manual Order
              </button>
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
                        <td className="pl-4 font-mono text-xs font-bold text-slate-700">{o.id}</td>
                        <td>
                          <div className="font-semibold text-slate-900">{o.customer}</div>
                          <div className="text-[11px] text-slate-500">{o.phone}</div>
                        </td>
                        <td className="max-w-[220px] text-slate-700">{o.items}</td>
                        <td>
                          <div className="font-bold text-slate-900">₹{o.amount}</div>
                          {o.paid < o.amount && o.status !== "rejected" && (
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
          {inventoryLoading ? (
            <div className="flex items-center justify-center py-10 text-sm text-slate-400">
              Loading inventory…
            </div>
          ) : inventory.length === 0 ? (
            <div className="flex items-center justify-center py-10 text-sm text-slate-400">
              No inventory items found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="text-left text-[11px] uppercase tracking-widest text-slate-500">
                  <tr>
                    <th className="pb-3">Product</th>
                    <th>Unit Price</th>
                    <th>Stock</th>
                    <th>Low-stock Alert</th>
                    <th className="pr-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {inventory.map((it) => {
                    const pct = Math.min(100, Math.round((it.stock / (it.low * 2 || 1)) * 100));
                    const critical = it.stock <= it.low;
                    return (
                      <tr key={it.id} className="border-t border-slate-100">
                        <td className="py-3 font-semibold text-slate-900">{it.name}</td>
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
                            <span
                              className={`w-8 text-center font-bold ${critical ? "text-rose-700" : "text-slate-800"}`}
                            >
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
                        <td>
                          ≤ {it.low}
                          {it.unit ?? ""}
                        </td>
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
            </div>
          )}
        </div>
      )}

      {/* Add Item Modal */}
      {showAddItemModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="glass-card w-full max-w-md rounded-2xl p-6">
            <h3 className="mb-4 text-lg font-bold text-slate-900">Add New Inventory Item</h3>
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">Item Name</label>
                <input
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  placeholder="e.g., Atta 5kg"
                  className="w-full rounded-lg border border-slate-200 bg-white/70 px-3 py-2 text-sm outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">Unit Price (₹)</label>
                <input
                  type="number"
                  value={newItemPrice}
                  onChange={(e) => setNewItemPrice(e.target.value)}
                  placeholder="0"
                  className="w-full rounded-lg border border-slate-200 bg-white/70 px-3 py-2 text-sm outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">Initial Stock Quantity</label>
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
                      });
                      setShowAddItemModal(false);
                      setNewItemName("");
                      setNewItemPrice("");
                      setNewItemStock("");
                    }
                  }}
                  disabled={!newItemName.trim()}
                  className="flex-1 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-600 disabled:opacity-50"
                >
                  Add Item
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
