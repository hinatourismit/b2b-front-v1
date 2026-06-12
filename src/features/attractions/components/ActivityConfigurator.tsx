import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CalendarDays,
  Clock3,
  Loader2,
  Minus,
  Plus,
  ShoppingCart,
  TriangleAlert,
} from "lucide-react";
import { toast } from "sonner";
import type {
  Activity,
  AttractionDetails,
  CartItem,
  PricingEntry,
  PrivateTransfer,
  TimeSlot,
} from "../types";
import { usePriceCheck, useTimeSlots } from "../api/attractions.queries";
import { useCartStore } from "../store/cart.store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn, formatPrice, formatTime } from "@/lib/utils";
import { apiErrorMessage } from "@/types/api";

/** Today in the UAE (Asia/Dubai), formatted YYYY-MM-DD for date inputs/API. */
function uaeToday(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Dubai" }).format(new Date());
}


/**
 * Stepper with a typeable value — B2B orders can have 100+ pax, so direct
 * entry matters. Empty input is allowed while typing and resolves to min on
 * blur.
 */
function Counter({
  value,
  onChange,
  min = 0,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
}) {
  const [draft, setDraft] = useState<string | null>(null);

  return (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        onClick={() => {
          setDraft(null);
          onChange(Math.max(min, value - 1));
        }}
        className="flex size-7 shrink-0 items-center justify-center rounded-full border hover:bg-accent"
        aria-label="decrease"
      >
        <Minus className="size-3.5" />
      </button>
      <input
        type="text"
        inputMode="numeric"
        value={draft ?? String(value)}
        onChange={(e) => {
          const raw = e.target.value.replace(/\D/g, "").slice(0, 4);
          setDraft(raw);
          if (raw !== "") onChange(Math.max(min, Number(raw)));
        }}
        onBlur={() => {
          if (draft === "") onChange(min);
          setDraft(null);
        }}
        onFocus={(e) => e.target.select()}
        className="h-7 w-12 rounded-md border bg-card text-center text-sm font-semibold tabular-nums outline-none focus:border-ring"
        aria-label="count"
      />
      <button
        type="button"
        onClick={() => {
          setDraft(null);
          onChange(value + 1);
        }}
        className="flex size-7 shrink-0 items-center justify-center rounded-full border hover:bg-accent"
        aria-label="increase"
      >
        <Plus className="size-3.5" />
      </button>
    </div>
  );
}

/**
 * Per-activity selection mirroring old ActivityComponent semantics:
 * defaults from setAgentExcursion (adult=1 when tickets/booking, hourly→1h),
 * debounced price recheck on every change (infantCount always 0 — contract),
 * transfer type without/shared/private, timeslots for isTimeSlot products.
 */
export function ActivityConfigurator({
  activity,
  attraction,
}: {
  activity: Activity;
  attraction: AttractionDetails;
}) {
  const navigate = useNavigate();
  const addItem = useCartStore((s) => s.addItem);
  const priceCheck = usePriceCheck();
  const timeSlots = useTimeSlots();

  // Defaults (user decision 2026-06-12): adult 1 + today's UAE date, so the
  // price check fires immediately on page load.
  const defaultAdult = 1;

  const [date, setDate] = useState(uaeToday());
  const [adult, setAdult] = useState(defaultAdult);
  const [child, setChild] = useState(0);
  const [infant, setInfant] = useState(0);
  const [hourCount, setHourCount] = useState(activity.base === "hourly" ? 1 : 0);
  // Default transfer per old ActivityComponent.jsx:538-566: non-transfer →
  // "without"; else private if available, else shared.
  const [transfer, setTransfer] = useState<string>(() => {
    if (activity.activityType !== "transfer") return "without";
    if (activity.isPrivateTransferAvailable && activity.privateTransfers) return "private";
    if (activity.isSharedTransferAvailable && activity.sharedTransferPrice) return "shared";
    return "without";
  });
  const [vehicles, setVehicles] = useState<PrivateTransfer[]>([]);
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  // Activities arrive with a pricing[] array; the price recheck replaces it.
  const [pricing, setPricing] = useState<PricingEntry[]>(activity.pricing ?? []);

  const debounce = useRef<number>(0);

  // Debounced price recheck — same trigger set as the old app.
  useEffect(() => {
    if (!date) return;
    window.clearTimeout(debounce.current);
    debounce.current = window.setTimeout(() => {
      priceCheck.mutate(
        {
          activityId: activity._id,
          payload: {
            hourCount: hourCount || 0,
            activityType: activity.activityType,
            base: activity.base,
            adultCount: adult,
            childCount: child,
            infantCount: 0, // old app always sends 0 — contract
            date,
          },
        },
        {
          onSuccess: (data) => setPricing(data.pricing ?? []),
          onError: (err) => {
            setPricing([]);
            toast.error(apiErrorMessage(err, "No availability for the selected date"));
          },
        },
      );
    }, 400);
    return () => window.clearTimeout(debounce.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, adult, child, infant, hourCount, transfer]);

  // Timeslot fetch when the product needs it (Burj-Khalifa-style).
  useEffect(() => {
    if (!activity.isTimeSlot || !date) return;
    setSelectedSlot(null);
    timeSlots.mutate(
      {
        productId: activity.productId,
        productCode: activity.productCode,
        timeSlotDate: date,
        activityId: activity._id,
      },
      {
        onSuccess: (data) => setSlots(Array.isArray(data) ? data : []),
        onError: () => setSlots([]),
      },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, activity._id]);

  // Dropdown options come from pricing[].transferType (old active code,
  // ActivityComponent.jsx:1068-1075 — the hardcoded list is commented out there).
  const transferOptions = [...new Set(pricing.map((p) => p.transferType).filter(Boolean))] as string[];

  // Keep the selection valid for whatever options the pricing actually offers.
  useEffect(() => {
    if (transferOptions.length > 0 && !transferOptions.includes(transfer)) {
      setTransfer(transferOptions[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transferOptions.join("|")]);

  // Vehicles initialize from the pricing response's default counts (old
  // ActivityComponent.jsx:363-380 — backend pre-allocates e.g. 1 vehicle for
  // the pax count) and reset whenever a price recheck replaces the pricing.
  useEffect(() => {
    const priv = pricing.find((p) => p.transferType === "private");
    if (priv?.privateTransfers) {
      setVehicles(priv.privateTransfers.map((r) => ({ ...r, count: r.count ?? 0 })));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pricing]);

  // Old-app render rule (ActivityComponent.jsx:2077): the entry in pricing[]
  // whose transferType matches the current selection.
  const matchedPricing =
    pricing.find((p) => p.transferType === transfer) ?? pricing[0];

  // Private vehicle list comes from the pricing entry when present (it carries
  // marked-up prices); fall back to the activity's static list.
  const vehicleOptions =
    matchedPricing?.privateTransfers ?? activity.privateTransfers ?? [];

  const privateTransferTotal = vehicles.reduce(
    (acc, v) => acc + (v.count ?? 0) * (v.price ?? 0),
    0,
  );

  // Private total = ticket portion + selected vehicles. The backend's private
  // totalPrice includes its default vehicle allocation, so ticket portion =
  // totalPrice − Σ(defaultCount × price); vehicle changes adjust on top.
  const privatePricing = pricing.find((p) => p.transferType === "private");
  const defaultVehicleTotal = (privatePricing?.privateTransfers ?? []).reduce(
    (acc, r) => acc + (r.count ?? 0) * (r.price ?? 0),
    0,
  );
  const ticketPortion = Math.max(0, (privatePricing?.totalPrice ?? 0) - defaultVehicleTotal);

  // Capacity check: selected vehicles must seat all adults + children.
  const paxCount = adult + child;
  const selectedCapacity = vehicles.reduce(
    (acc, v) => acc + (v.count ?? 0) * (v.maxCapacity ?? 0),
    0,
  );
  const capacityShort = transfer === "private" && selectedCapacity < paxCount;

  // Timeslot products price from the selected slot: adult*AdultPrice +
  // child*ChildPrice (old summary table, SlotBookingComponent.jsx:232).
  const slotTotal = selectedSlot
    ? adult * Number(selectedSlot.AdultPrice ?? 0) + child * Number(selectedSlot.ChildPrice ?? 0)
    : null;

  const displayPrice =
    transfer === "private"
      ? ticketPortion + privateTransferTotal
      : (slotTotal ?? matchedPricing?.totalPrice ?? activity.lowPrice ?? 0);

  const addToCart = () => {
    if (!date) {
      toast.error("Select a date first");
      return;
    }
    if (activity.isTimeSlot && !selectedSlot) {
      toast.error("Select a time slot");
      return;
    }
    if (capacityShort) {
      toast.error("Not enough vehicle capacity", {
        description: `Selected vehicles seat ${selectedCapacity}, but you have ${paxCount} travellers. Add more vehicles or a larger one.`,
      });
      return;
    }
    const item: CartItem = {
      ...activity,
      isChecked: true,
      date,
      adult,
      child,
      infant,
      hourCount,
      transfer,
      selectedTimeSlot: selectedSlot,
      selectedVehicle: vehicles.filter((v) => (v.count ?? 0) > 0),
      vehicle: vehicles.filter((v) => (v.count ?? 0) > 0),
      price: displayPrice,
      totalPrice: matchedPricing?.totalPrice,
      isPromoAdded: false,
      attractionTitle: attraction.title,
      attractionImage: attraction.images?.[0],
      attractionId: attraction._id,
    };
    addItem(item);
    toast.success("Added to cart", {
      action: { label: "Checkout", onClick: () => navigate("/attractions/payment") },
    });
  };

  return (
    <div className="rounded-xl border bg-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-sans font-semibold">{activity.name}</h3>
          <p className="text-xs capitalize text-muted-foreground">
            {activity.activityType === "transfer" ? "With transfer options" : "Ticket only"}
            {activity.base === "hourly" ? " · hourly" : ""}
          </p>
        </div>
        <div className="text-right">
          {priceCheck.isPending ? (
            <Loader2 className="ml-auto size-4 animate-spin text-muted-foreground" />
          ) : (
            <p className="text-lg font-bold text-primary">{formatPrice(displayPrice)}</p>
          )}
          <p className="text-[11px] text-muted-foreground">total for selection</p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <label className="mb-1 flex items-center gap-1 text-xs font-medium text-muted-foreground">
            <CalendarDays className="size-3.5" /> Date
          </label>
          <Input
            type="date"
            value={date}
            min={uaeToday()}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>

        {transferOptions.length > 0 && (
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Transfer</label>
            <Select value={transfer} onValueChange={setTransfer}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {transferOptions.map((opt) => (
                  <SelectItem key={opt} value={opt}>
                    {opt === "without"
                      ? "Ticket only"
                      : opt === "shared"
                        ? "Shared transfer"
                        : opt === "private"
                          ? "Private transfer"
                          : opt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {activity.base === "hourly" && (
          <div>
            <label className="mb-1 flex items-center gap-1 text-xs font-medium text-muted-foreground">
              <Clock3 className="size-3.5" /> Hours
            </label>
            <Counter value={hourCount} onChange={setHourCount} min={1} />
          </div>
        )}

        <div className="flex flex-wrap items-end gap-5">
          <div>
            <p className="mb-1 text-xs font-medium text-muted-foreground">Adults</p>
            <Counter value={adult} onChange={setAdult} min={defaultAdult > 0 ? 1 : 0} />
          </div>
          <div>
            <p className="mb-1 text-xs font-medium text-muted-foreground">Children</p>
            <Counter value={child} onChange={setChild} />
          </div>
          <div>
            <p className="mb-1 text-xs font-medium text-muted-foreground">Infants</p>
            <Counter value={infant} onChange={setInfant} />
          </div>
        </div>
      </div>

      {transfer === "private" && vehicleOptions.length > 0 && (
        <div className="mt-4 space-y-2 rounded-lg bg-secondary/60 p-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-muted-foreground">Private vehicles</p>
            <p className="text-[11px] text-muted-foreground">
              Capacity {selectedCapacity} / {paxCount} travellers
            </p>
          </div>
          {capacityShort && (
            <p className="flex items-center gap-1.5 rounded-md bg-warning/15 px-2.5 py-1.5 text-xs font-medium text-amber-700">
              <TriangleAlert className="size-3.5 shrink-0" />
              Selected vehicles seat {selectedCapacity}, but you have {paxCount} travellers — add
              more vehicles or choose a larger one.
            </p>
          )}
          {vehicleOptions.map((v, i) => {
            const vid = v._id ?? v.pvtTransferId ?? v.name;
            const current =
              vehicles.find((x) => (x._id ?? x.pvtTransferId ?? x.name) === vid)?.count ?? 0;
            return (
              <div key={vid ?? i} className="flex items-center justify-between text-sm">
                <span>
                  {v.name} <span className="text-xs text-muted-foreground">(max {v.maxCapacity})</span>
                </span>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-semibold">{formatPrice(v.price)}</span>
                  <Counter
                    value={current}
                    onChange={(count) =>
                      setVehicles((prev) => {
                        const rest = prev.filter(
                          (x) => (x._id ?? x.pvtTransferId ?? x.name) !== vid,
                        );
                        return count > 0 ? [...rest, { ...v, count }] : rest;
                      })
                    }
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {activity.isTimeSlot && date && (
        <div className="mt-4">
          <p className="mb-2 text-xs font-semibold text-muted-foreground">Time slots</p>
          {timeSlots.isPending ? (
            <Loader2 className="size-4 animate-spin text-muted-foreground" />
          ) : slots.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {/* old card shows time range + adult/child prices (SlotBookingComponent.jsx:140-165) */}
              {slots.map((slot, i) => {
                const selected = selectedSlot?.EventID === slot.EventID;
                return (
                  <button
                    key={slot.EventID ?? i}
                    type="button"
                    onClick={() => setSelectedSlot(slot)}
                    className={cn(
                      "rounded-lg border px-3 py-2 text-left transition-colors",
                      selected
                        ? "border-primary bg-primary text-primary-foreground"
                        : "bg-card hover:bg-accent",
                    )}
                  >
                    <span className="block text-xs font-semibold">
                      {formatTime(slot.StartDateTime)} – {formatTime(slot.EndDateTime)}
                    </span>
                    <span
                      className={cn(
                        "mt-0.5 block text-[11px]",
                        selected ? "text-primary-foreground/80" : "text-muted-foreground",
                      )}
                    >
                      Adult {formatPrice(Number(slot.AdultPrice ?? 0))} · Child{" "}
                      {formatPrice(Number(slot.ChildPrice ?? 0))}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">No slots for this date.</p>
          )}
        </div>
      )}

      <div className="mt-5 flex justify-end">
        <Button onClick={addToCart} disabled={priceCheck.isPending}>
          <ShoppingCart className="size-4" /> Add to cart
        </Button>
      </div>
    </div>
  );
}
