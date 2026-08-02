/**
 * use-settings.ts
 * Fetches and updates user profile, preferences, and billing information from/to settings endpoints.
 */

import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/apiClient";

export interface ProfileData {
  businessName: string;
  phone: string;
  email: string;
  address: string;
  currency: string;
}

export interface PreferencesData {
  language: string;
  theme: string;
  notificationsEnabled: boolean;
  voiceAutoParse: boolean;
  screenshotAutoParse: boolean;
  autoCreateOrders: boolean;
  humanReviewRequired: boolean;
  confidenceThreshold: number;
}

export interface BillingData {
  status: string;
  planName: string;
  monthlyPrice: number;
  expiryDate: string;
  autoRenew: boolean;
}

export function useSettings() {
  const [profile, setProfile] = useState<ProfileData>({
    businessName: "",
    phone: "",
    email: "",
    address: "",
    currency: "INR",
  });

  const [preferences, setPreferences] = useState<PreferencesData>({
    language: "English",
    theme: "light",
    notificationsEnabled: true,
    voiceAutoParse: true,
    screenshotAutoParse: true,
    autoCreateOrders: false,
    humanReviewRequired: true,
    confidenceThreshold: 0.8,
  });

  const [billing, setBilling] = useState<BillingData>({
    status: "none",
    planName: "Free Plan",
    monthlyPrice: 0,
    expiryDate: "",
    autoRenew: true,
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch Profile
      const profileRes = await api.get<Record<string, unknown>>("/api/settings/profile");
      if (profileRes.success && profileRes.data) {
        setProfile({
          businessName: String(profileRes.data.business_name ?? ""),
          phone: String(profileRes.data.phone_number ?? ""),
          email: String(profileRes.data.email ?? ""),
          address: String(profileRes.data.address ?? ""),
          currency: String(profileRes.data.currency ?? "INR"),
        });
      }

      // 2. Fetch Preferences
      const prefRes = await api.get<Record<string, unknown>>("/api/settings/preferences");
      if (prefRes.success && prefRes.data) {
        setPreferences({
          language: String(prefRes.data.language ?? "English"),
          theme: String(prefRes.data.theme ?? "light"),
          notificationsEnabled: Boolean(prefRes.data.notifications_enabled ?? true),
          voiceAutoParse: Boolean(prefRes.data.voice_auto_parse ?? true),
          screenshotAutoParse: Boolean(prefRes.data.screenshot_auto_parse ?? true),
          autoCreateOrders: Boolean(prefRes.data.auto_create_orders ?? false),
          humanReviewRequired: Boolean(prefRes.data.human_review_required ?? true),
          confidenceThreshold: Number(prefRes.data.confidence_threshold ?? 0.8),
        });
      }

      // 3. Fetch Billing
      const billingRes = await api.get<Record<string, any>>("/api/settings/billing");
      if (billingRes.success && billingRes.data) {
        const item = billingRes.data;
        const plan = item.subscription_plans;
        setBilling({
          status: String(item.status ?? "none"),
          planName: plan ? String(plan.name ?? "Premium Plan") : "Free Plan",
          monthlyPrice: plan ? Number(plan.monthly_price ?? 0) : 0,
          expiryDate: item.expiry_date ? new Date(item.expiry_date).toLocaleDateString() : "",
          autoRenew: Boolean(item.auto_renew ?? true),
        });
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load settings data");
    } finally {
      setLoading(false);
    }
  }, []);

  const saveProfile = async (updatedProfile: Partial<ProfileData>) => {
    setSaving(true);
    setError(null);
    try {
      const payload = {
        business_name: updatedProfile.businessName,
        phone_number: updatedProfile.phone,
        email: updatedProfile.email,
        address: updatedProfile.address,
        currency: updatedProfile.currency,
      };
      const res = await api.put("/api/settings/profile", payload);
      if (res.success) {
        setProfile((prev) => ({ ...prev, ...updatedProfile }));
        return true;
      }
      return false;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save profile changes");
      return false;
    } finally {
      setSaving(false);
    }
  };

  const savePreferences = async (updatedPrefs: Partial<PreferencesData>) => {
    setSaving(true);
    setError(null);
    try {
      const payload = {
        language: updatedPrefs.language,
        theme: updatedPrefs.theme,
        notifications_enabled: updatedPrefs.notificationsEnabled,
        voice_auto_parse: updatedPrefs.voiceAutoParse,
        screenshot_auto_parse: updatedPrefs.screenshotAutoParse,
        auto_create_orders: updatedPrefs.autoCreateOrders,
        human_review_required: updatedPrefs.humanReviewRequired,
        confidence_threshold: updatedPrefs.confidenceThreshold,
      };
      const res = await api.put("/api/settings/preferences", payload);
      if (res.success) {
        setPreferences((prev) => ({ ...prev, ...updatedPrefs }));
        return true;
      }
      return false;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save preferences");
      return false;
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  return {
    profile,
    preferences,
    billing,
    loading,
    saving,
    error,
    saveProfile,
    savePreferences,
    refetch: fetchSettings,
  };
}
