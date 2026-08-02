/**
 * use-customers.ts
 * Fetches customers from /api/customers.
 */

import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/apiClient";

export interface Customer {
  id: string | number;
  name: string;
  phone: string;
  orders: number;
  spending: number;
  lastPurchase: string;
  badge: "VIP" | "Loyal" | "Growing" | "New";
  avatar: string;
  color: string;
  tags: string[];
  aiMemory: string; // AI-generated memory summary
  aiInsights: {
    paymentBehaviour: string;
    favouriteProducts: string;
    riskLevel: string;
    suggestedFollowUp: string;
  } | null;
  timeline: { date: string; title: string; amount: string; status: string }[];
  suggestions?: Array<{
    icon: any;
    color: string;
    bg: string;
    message: string;
    action: string;
    urgency: "high" | "medium" | "low";
  }>;
}

function inferBadge(orders: number, spending: number): Customer["badge"] {
  if (spending >= 50000 || orders >= 25) return "VIP";
  if (orders >= 10) return "Loyal";
  if (orders >= 4) return "Growing";
  return "New";
}

const COLORS = ["#059669", "#6366F1", "#F59E0B", "#F43F5E", "#0D9488", "#8B5CF6"];

function mapBackendCustomer(raw: Record<string, unknown>, index: number): Customer {
  const orders = Number(raw.total_orders ?? raw.orders ?? 0);
  const spending = Number(raw.total_spending ?? raw.spending ?? raw.total_amount ?? 0);
  const name = String(raw.name ?? raw.customer_name ?? "Customer");
  const initials = name.split(" ").map((w: string) => w[0] ?? "").join("").slice(0, 2).toUpperCase();

  return {
    id: String(raw.id ?? raw._id ?? index),
    name,
    phone: String(raw.phone_number ?? raw.phone ?? raw.whatsapp_number ?? ""),
    orders,
    spending,
    lastPurchase: raw.last_purchase_date
      ? new Date(String(raw.last_purchase_date)).toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })
      : "—",
    badge: (raw.tag as Customer["badge"]) ?? (raw.badge as Customer["badge"]) ?? inferBadge(orders, spending),
    avatar: initials || "??",
    color: COLORS[index % COLORS.length],
    tags: Array.isArray(raw.tags) ? (raw.tags as string[]) : (raw.tag ? [String(raw.tag)] : []),
    aiMemory: typeof raw.ai_memory === "string" ? raw.ai_memory : "",
    aiInsights: raw.ai_insights as Customer["aiInsights"] || null,
    timeline: Array.isArray(raw.timeline)
      ? (raw.timeline as Customer["timeline"])
      : [],
  };
}

export function useCustomers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCustomers = useCallback(async (isInitial = false) => {
    if (isInitial) setLoading(true);
    setError(null);
    try {
      const res = await api.get<Record<string, unknown>>("/api/customers");
      if (res.success && res.data) {
        // Backend returns { customers: [...], pagination: {...} }
        const raw = res.data as Record<string, unknown>;
        const list = Array.isArray(raw.customers)
          ? raw.customers
          : Array.isArray(raw)
          ? raw
          : [];
        setCustomers((list as Record<string, unknown>[]).map((raw, index) => mapBackendCustomer(raw, index)));
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load customers");
    } finally {
      if (isInitial) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCustomers(true);
    const interval = setInterval(() => fetchCustomers(false), 5000);
    return () => clearInterval(interval);
  }, [fetchCustomers]);

  return { customers, loading, error, refetch: fetchCustomers };
}
