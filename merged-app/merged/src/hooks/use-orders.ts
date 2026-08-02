import { useState, useMemo, useEffect, useCallback } from "react";
import { api } from "@/lib/apiClient";

export type Order = {
  id: string;
  customer: string;
  phone: string;
  items: string;
  amount: number;
  paid: number;
  mode: string;
  src: "voice" | "text" | "image";
  status: "pending" | "accepted" | "rejected" | "completed";
};

export const TABS = ["All Orders", "🟡 Pending", "🟢 Accepted", "🟢 Completed", "🔴 Rejected"] as const;
export type TabOption = (typeof TABS)[number];

function mapBackendOrder(raw: Record<string, unknown>): Order {
  // Map backend field names to the frontend shape
  const statusRaw = String(raw.order_status ?? raw.status ?? "").toLowerCase();
  let status: Order["status"] = "completed";
  if (statusRaw.includes("pending")) {
    status = "pending";
  } else if (statusRaw.includes("accepted")) {
    status = "accepted";
  } else if (statusRaw.includes("reject")) {
    status = "rejected";
  }

  const srcRaw = String(raw.source ?? raw.src ?? "text").toLowerCase();
  const src: Order["src"] =
    srcRaw === "voice" ? "voice" : srcRaw === "image" ? "image" : "text";

  return {
    id: String(raw.id ?? raw._id ?? ""),
    customer: String(raw.customer_name ?? raw.customer ?? ""),
    phone: String(raw.phone ?? raw.customer_phone ?? ""),
    items: String(raw.items ?? raw.item_description ?? raw.items_summary ?? ""),
    amount: Number(raw.total_amount ?? raw.amount ?? 0),
    paid: Number(raw.paid_amount ?? raw.paid ?? 0),
    mode: String(raw.payment_mode ?? raw.mode ?? "—"),
    src,
    status,
  };
}

export function useOrders(onInventoryRefresh?: () => void, onDashboardRefresh?: () => void) {
  const [tab, setTab] = useState<TabOption>("All Orders");
  const [searchQuery, setSearchQuery] = useState("");
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOrders = useCallback(async (isInitial = false) => {
    if (isInitial) setLoading(true);
    setError(null);
    try {
      const res = await api.get<Record<string, unknown>>("/api/orders");
      if (res.success && res.data) {
        const raw = res.data as Record<string, unknown>;
        const list = Array.isArray(raw.orders)
          ? raw.orders
          : Array.isArray(raw)
          ? raw
          : [];
        setOrders((list as Record<string, unknown>[]).map(mapBackendOrder));
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load orders");
    } finally {
      if (isInitial) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders(true);
    const interval = setInterval(() => fetchOrders(false), 5000);
    return () => clearInterval(interval);
  }, [fetchOrders]);

  const sendReminder = useCallback(async (orderId: string) => {
    try {
      await api.post(`/api/orders/${orderId}/reminder`, {});
    } catch {
      // silently ignore; toast can be added later
    }
  }, []);

  const acceptOrder = useCallback(async (orderId: string) => {
    try {
      await api.post(`/api/orders/${orderId}/accept`, {});
      await fetchOrders();
      if (onInventoryRefresh) onInventoryRefresh();
      if (onDashboardRefresh) onDashboardRefresh();
    } catch {
      // silently ignore; toast can be added later
    }
  }, [fetchOrders, onInventoryRefresh, onDashboardRefresh]);

  const rejectOrder = useCallback(async (orderId: string) => {
    try {
      await api.post(`/api/orders/${orderId}/reject`, {});
      await fetchOrders();
      if (onDashboardRefresh) onDashboardRefresh();
    } catch {
      // silently ignore; toast can be added later
    }
  }, [fetchOrders, onDashboardRefresh]);

  const completeOrder = useCallback(async (orderId: string) => {
    try {
      await api.post(`/api/orders/${orderId}/complete`, {});
      await fetchOrders();
      if (onDashboardRefresh) onDashboardRefresh();
    } catch {
      // silently ignore; toast can be added later
    }
  }, [fetchOrders, onDashboardRefresh]);

  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      const matchesTab =
        tab === "All Orders"
          ? true
          : tab.includes("Pending")
            ? o.status === "pending"
            : tab.includes("Accepted")
              ? o.status === "accepted"
              : tab.includes("Completed")
                ? o.status === "completed"
                : o.status === "rejected";

      const query = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !query ||
        o.customer.toLowerCase().includes(query) ||
        o.phone.toLowerCase().includes(query) ||
        o.id.toLowerCase().includes(query);

      return matchesTab && matchesSearch;
    });
  }, [orders, tab, searchQuery]);

  return {
    tab,
    setTab,
    searchQuery,
    setSearchQuery,
    filteredOrders,
    tabs: TABS,
    loading,
    error,
    refetch: fetchOrders,
    sendReminder,
    acceptOrder,
    rejectOrder,
    completeOrder,
  };
}
