import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/apiClient";

export type PaymentClaim = {
  id: string;
  amount: number;
  payment_mode: string;
  raw_message: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  customers: {
    id: string;
    name: string;
    phone_number: string;
  };
  candidate_orders?: Array<{
    order_id: string;
    order_number: string;
    total_amount: number;
    paid_amount: number;
    remaining: number;
    items_summary: string;
  }>;
};

export function usePaymentClaims(onDashboardRefresh?: () => void) {
  const [claims, setClaims] = useState<PaymentClaim[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchClaims = useCallback(async (isInitial = false) => {
    if (isInitial) setLoading(true);
    try {
      const res = await api.get<PaymentClaim[] | { data: PaymentClaim[] }>("/api/payment-claims?status=pending");
      if (res.success && res.data) {
        const list = Array.isArray(res.data) ? res.data : (res.data as { data: PaymentClaim[] }).data ?? [];
        setClaims(list as PaymentClaim[]);
      }
    } catch {
      // silently handle
    } finally {
      if (isInitial) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchClaims(true);
    const interval = setInterval(() => fetchClaims(false), 8000);
    return () => clearInterval(interval);
  }, [fetchClaims]);

  const approveClaim = useCallback(async (claimId: string) => {
    try {
      await api.post(`/api/payment-claims/${claimId}/approve`, {});
      await fetchClaims();
      if (onDashboardRefresh) onDashboardRefresh();
    } catch {
      // silently handle
    }
  }, [fetchClaims, onDashboardRefresh]);

  const rejectClaim = useCallback(async (claimId: string) => {
    try {
      await api.post(`/api/payment-claims/${claimId}/reject`, {});
      await fetchClaims();
      if (onDashboardRefresh) onDashboardRefresh();
    } catch {
      // silently handle
    }
  }, [fetchClaims, onDashboardRefresh]);

  return { claims, loading, approveClaim, rejectClaim, refetch: fetchClaims };
}
