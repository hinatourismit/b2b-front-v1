import { create } from "zustand";
import type { CartItem } from "../types";

/**
 * Same localStorage key and dedupe-by-activity-id semantics as the old app's
 * agentExcursionSlice — existing carts survive the migration.
 */
const CART_KEY = "agentExcursionCart";

function readCart(): CartItem[] {
  try {
    return JSON.parse(localStorage.getItem(CART_KEY) ?? "[]") as CartItem[];
  } catch {
    return [];
  }
}

function writeCart(items: CartItem[]) {
  localStorage.setItem(CART_KEY, JSON.stringify(items));
}

interface CartState {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (activityId: string) => void;
  updateItem: (activityId: string, patch: Partial<CartItem>) => void;
  emptyCart: () => void;
  /** total incl. VAT — same reduce as the old checkout */
  total: () => number;
}

export const useCartStore = create<CartState>((set, get) => ({
  items: readCart(),

  addItem: (item) => {
    const map = new Map(get().items.map((i) => [i._id, i]));
    map.set(item._id, item); // dedupe by activity _id, last write wins
    const items = [...map.values()];
    writeCart(items);
    set({ items });
  },

  removeItem: (activityId) => {
    const items = get().items.filter((i) => i._id !== activityId);
    writeCart(items);
    set({ items });
  },

  updateItem: (activityId, patch) => {
    const items = get().items.map((i) => (i._id === activityId ? { ...i, ...patch } : i));
    writeCart(items);
    set({ items });
  },

  emptyCart: () => {
    writeCart([]);
    set({ items: [] });
  },

  total: () =>
    get().items.reduce((acc, item) => {
      if (item.isVat && item.vat) return acc + item.price + (item.price * item.vat) / 100;
      return acc + item.price;
    }, 0),
}));
