/**
 * use-dashboard.ts
 * Fetches the dashboard overview + recent activities from the backend.
 * Falls back gracefully to empty data if not authenticated.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { api } from "@/lib/apiClient";

export interface LoanScoreFactor {
  factor: string;
  score: number;
  max: number;
  description: string;
  isPositive?: boolean;
}

export interface DashboardOverview {
  monthly_revenue?: number;
  pending_udhaar?: number;
  unpaid_orders?: number;
  orders_this_month?: number;
  loan_eligibility_score?: number;
  loan_score_breakdown?: LoanScoreFactor[];
  [key: string]: unknown;
}

export interface RecentActivity {
  customer?: string;
  phone?: string;
  message?: string;
  amount?: number;
  status?: string;
  source?: "voice" | "text" | "image";
  created_at?: string;
  [key: string]: unknown;
}

export interface LowStockItem {
  name: string;
  quantity_in_stock: number;
  min_stock_threshold: number;
  [key: string]: unknown;
}

export function useDashboard() {
  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [activities, setActivities] = useState<RecentActivity[]>([]);
  const [lowStock, setLowStock] = useState<LowStockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Use a ref to track if the component is still mounted / effect is active
  const cancelledRef = useRef(false);

  const load = useCallback(async (isInitial = false) => {
    if (isInitial) setLoading(true);
    setError(null);
    try {
      const [overviewRes, activitiesRes, inventoryRes] = await Promise.all([
        api.get<DashboardOverview>("/api/dashboard/overview"),
        api.get<RecentActivity[]>("/api/dashboard/recent-activities?limit=4"),
        api.get<LowStockItem[]>("/api/inventory"),
      ]);

      if (cancelledRef.current) return;

      if (overviewRes.success && overviewRes.data) {
        setOverview(overviewRes.data);
      }
      if (activitiesRes.success && activitiesRes.data) {
        setActivities(Array.isArray(activitiesRes.data) ? activitiesRes.data : []);
      }
      if (inventoryRes.success && inventoryRes.data) {
        const raw = inventoryRes.data as { items?: LowStockItem[] } | LowStockItem[];
        const items: LowStockItem[] = Array.isArray(raw)
          ? raw
          : (raw as { items?: LowStockItem[] }).items ?? [];
        setLowStock(
          items.filter(
            (i) =>
              typeof i.quantity_in_stock === "number" &&
              typeof i.min_stock_threshold === "number" &&
              i.quantity_in_stock <= i.min_stock_threshold
          )
        );
      }
    } catch (err: unknown) {
      if (!cancelledRef.current) {
        setError(err instanceof Error ? err.message : "Failed to load dashboard");
      }
    } finally {
      if (!cancelledRef.current && isInitial) setLoading(false);
    }
  }, []);

  useEffect(() => {
    cancelledRef.current = false;
    load(true);
    const interval = setInterval(() => load(false), 30000);

    return () => {
      cancelledRef.current = true;
      clearInterval(interval);
    };
  }, [load]);

  return { overview, activities, lowStock, loading, error, refetch: load };
}
