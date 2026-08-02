/**
 * use-premium.ts
 * Integrates with Premium subscriptions routes (HTTP/REST endpoints).
 */

import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/apiClient";

export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  monthly_price: number;
  yearly_price: number;
  max_orders: number;
  max_customers: number;
  max_ai_requests: number;
  max_voice_notes: number;
  analytics_enabled: boolean;
  priority_support: boolean;
  inventory_predictions: boolean;
  custom_branding: boolean;
}

export interface UserSubscription {
  id: string;
  plan_id: string;
  status: string;
  billing_cycle: string;
  start_date: string;
  expiry_date: string;
  auto_renew: boolean;
  subscription_plans: SubscriptionPlan;
}

export function usePremium() {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPremiumData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const plansRes = await api.get<SubscriptionPlan[]>("/api/premium/plans");
      const subRes = await api.get<UserSubscription | null>("/api/premium/subscription");

      if (plansRes.success && plansRes.data) {
        setPlans(plansRes.data);
      }
      if (subRes.success) {
        setSubscription(subRes.data ?? null);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to fetch premium information");
    } finally {
      setLoading(false);
    }
  }, []);

  const upgrade = async (planId: string, billingCycle: "monthly" | "yearly" = "monthly") => {
    setError(null);
    try {
      const res = await api.post<UserSubscription>(
        "/api/premium/subscription/upgrade",
        { planId, billingCycle }
      );
      if (res.success && res.data) {
        setSubscription(res.data);
        return true;
      }
      return false;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to upgrade subscription");
      return false;
    }
  };

  const cancel = async () => {
    setError(null);
    try {
      const res = await api.post<UserSubscription>("/api/premium/subscription/cancel", {});
      if (res.success && res.data) {
        setSubscription(res.data);
        return true;
      }
      return false;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to cancel subscription");
      return false;
    }
  };

  useEffect(() => {
    fetchPremiumData();
  }, [fetchPremiumData]);

  return {
    plans,
    subscription,
    loading,
    error,
    upgrade,
    cancel,
    refetch: fetchPremiumData,
  };
}
