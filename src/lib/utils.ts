import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const AED = new Intl.NumberFormat("en-AE", {
  style: "currency",
  currency: "AED",
  minimumFractionDigits: 2,
});

export function formatPrice(amount: number | null | undefined): string {
  return AED.format(amount ?? 0);
}

/** "h:mm AM/PM" — same as old app's moment .format("LT"). */
export function formatTime(value: string | Date | null | undefined): string {
  if (!value) return "";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

/** App-wide display format: DD/MM/YYYY (user decision 2026-06-13). */
export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString("en-GB"); // dd/mm/yyyy
}
