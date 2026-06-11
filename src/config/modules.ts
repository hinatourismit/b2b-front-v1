import {
  Building2,
  FerrisWheel,
  StampIcon,
  Plane,
  FileSpreadsheet,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";

/**
 * Module registry — the single source of truth for per-agent module gating.
 * Flag names come from the backend `reseller.configuration` document and must
 * match it exactly (including the `showQuotaion` typo — it is API contract).
 * Fallback priority replicates the old app's redirect order.
 */
export interface ModuleConfig {
  flag:
    | "showHotel"
    | "showAttraction"
    | "showVisa"
    | "showA2a"
    | "showQuotaion"
    | "showInsurance"
    | "showFlight";
  label: string;
  icon: LucideIcon;
  home: string;
  /** lower = preferred fallback when another module is disabled */
  priority: number;
  /** deferred modules stay out of nav even when the flag is on */
  enabled: boolean;
}

export const MODULES = {
  hotels: {
    flag: "showHotel",
    label: "Hotels",
    icon: Building2,
    home: "/",
    priority: 1,
    enabled: true,
  },
  attractions: {
    flag: "showAttraction",
    label: "Attractions",
    icon: FerrisWheel,
    home: "/attraction",
    priority: 2,
    enabled: true,
  },
  visas: {
    flag: "showVisa",
    label: "Visas",
    icon: StampIcon,
    home: "/visa",
    priority: 3,
    enabled: true,
  },
  a2a: {
    flag: "showA2a",
    label: "A2A Tickets",
    icon: Plane,
    home: "/a2a",
    priority: 4,
    enabled: true,
  },
  quotations: {
    flag: "showQuotaion",
    label: "Quotations",
    icon: FileSpreadsheet,
    home: "/quotation",
    priority: 5,
    enabled: true,
  },
  insurance: {
    flag: "showInsurance",
    label: "Insurance",
    icon: ShieldCheck,
    home: "/insurance",
    priority: 6,
    enabled: true,
  },
  // Deferred: not operated currently (decision 2026-06-12). Registered so the
  // nav/guards pick it up the moment it's enabled and pages exist.
  flights: {
    flag: "showFlight",
    label: "Flights",
    icon: Plane,
    home: "/flight",
    priority: 7,
    enabled: false,
  },
} satisfies Record<string, ModuleConfig>;

export type ModuleKey = keyof typeof MODULES;

export type ModuleFlags = Partial<Record<ModuleConfig["flag"], boolean>>;

/** Modules this agent can see, in priority order. */
export function enabledModules(flags: ModuleFlags | null | undefined) {
  return (Object.entries(MODULES) as [ModuleKey, ModuleConfig][])
    .filter(([, m]) => m.enabled && flags?.[m.flag] === true)
    .sort(([, a], [, b]) => a.priority - b.priority);
}

/** Where to send the user when a module they requested is off. */
export function fallbackHome(flags: ModuleFlags | null | undefined): string {
  const [first] = enabledModules(flags);
  return first ? first[1].home : "/entrydenied";
}
