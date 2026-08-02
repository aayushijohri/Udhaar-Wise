/**
 * use-inventory.ts
 * Fetches inventory items from /api/inventory with restock capability.
 */

import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/apiClient";

export interface InventoryItem {
  id: string;
  name: string;
  price: number;
  stock: number;
  low: number;
  auto: boolean;
  unit?: string;
}

function mapBackendItem(raw: Record<string, unknown>): InventoryItem {
  return {
    id: String(raw.id ?? raw._id ?? ""),
    name: String(raw.item_name ?? raw.product_name ?? raw.name ?? "Unknown"),
    price: Number(raw.unit_price ?? raw.price ?? 0),
    stock: Number(raw.quantity_in_stock ?? raw.stock ?? 0),
    low: Number(raw.min_stock_threshold ?? raw.low_stock_threshold ?? raw.low ?? 0),
    auto: Boolean(raw.auto_deduct ?? raw.auto ?? false),
    unit: raw.unit ? String(raw.unit) : undefined,
  };
}

export function useInventory() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchInventory = useCallback(async (isInitial = false) => {
    if (isInitial) setLoading(true);
    setError(null);
    try {
      const res = await api.get<Record<string, unknown>>("/api/inventory");
      if (res.success && res.data) {
        const raw = res.data as Record<string, unknown>;
        const list = Array.isArray(raw.items)
          ? raw.items
          : Array.isArray(raw)
          ? raw
          : [];
        setItems((list as Record<string, unknown>[]).map(mapBackendItem));
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load inventory");
    } finally {
      if (isInitial) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInventory(true);
    const interval = setInterval(() => fetchInventory(false), 5000);
    return () => clearInterval(interval);
  }, [fetchInventory]);

  const restock = useCallback(async (id: string, quantity: number) => {
    await api.patch(`/api/inventory/${id}/restock`, { quantity });
    await fetchInventory();
  }, [fetchInventory]);

  const updateItem = useCallback(async (id: string, updates: Partial<InventoryItem>) => {
    // Map frontend field names to backend field names
    const backendUpdates: Record<string, unknown> = {};
    if (updates.name !== undefined) backendUpdates.item_name = updates.name;
    if (updates.price !== undefined) backendUpdates.unit_price = updates.price;
    if (updates.low !== undefined) backendUpdates.min_stock_threshold = updates.low;
    await api.patch(`/api/inventory/${id}`, backendUpdates);
    await fetchInventory();
  }, [fetchInventory]);

  const createItem = useCallback(async (payload: Omit<InventoryItem, "id" | "auto">) => {
    // Map frontend field names to backend field names
    const backendPayload = {
      item_name: payload.name,
      unit_price: payload.price,
      quantity_in_stock: payload.stock,
      min_stock_threshold: payload.low,
    };
    await api.post("/api/inventory", backendPayload);
    await fetchInventory();
  }, [fetchInventory]);

  const deleteItem = useCallback(async (id: string) => {
    await api.delete(`/api/inventory/${id}`);
    await fetchInventory();
  }, [fetchInventory]);

  return { items, loading, error, refetch: fetchInventory, restock, updateItem, createItem, deleteItem };
}
