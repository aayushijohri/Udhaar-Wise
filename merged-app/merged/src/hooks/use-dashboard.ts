/**
 * use-dashboard.ts
 * Fetches the dashboard overview + recent activities from the backend.
 * Falls back gracefully to empty data if not authenticated.
 */

import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/apiClient";

export interface DashboardOverview {
  monthly_revenue?: number;
  pending_udhaar?: number;
  unpaid_orders?: number;
  orders_this_month?: number;
  loan_eligibility_score?: number;
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

  const load = useCallback(async (isInitial = false) => {
    if (isInitial) setLoading(true);
    setError(null);
    try {
      const [overviewRes, activitiesRes, inventoryRes] = await Promise.all([
        api.get<DashboardOverview>("/api/dashboard/overview"),
        api.get<RecentActivity[]>("/api/dashboard/recent-activities?limit=4"),
        api.get<LowStockItem[]>("/api/inventory"),
      ]);

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
      setError(err instanceof Error ? err.message : "Failed to load dashboard");
    } finally {
      if (isInitial) setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadWithCancel(isInitial = false) {
      if (isInitial) setLoading(true);
      setError(null);
      try {
        const [overviewRes, activitiesRes, inventoryRes] = await Promise.all([
          api.get<DashboardOverview>("/api/dashboard/overview"),
          api.get<RecentActivity[]>("/api/dashboard/recent-activities?limit=4"),
          api.get<LowStockItem[]>("/api/inventory"),
        ]);

        if (cancelled) return;

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
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load dashboard");
        }
      } finally {
        if (!cancelled && isInitial) setLoading(false);
      }
    }

    loadWithCancel(true);
    const interval = setInterval(() => loadWithCancel(false), 5000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [load]);

  return { overview, activities, lowStock, loading, error, refetch: load };
}
