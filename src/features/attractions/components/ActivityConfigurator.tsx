import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CalendarDays, Clock3, Loader2, Minus, Plus, ShoppingCart } from "lucide-react";
import { toast } from "sonner";
import type { Activity, AttractionDetails, CartItem, PrivateTransfer, TimeSlot } from "../types";
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
import { cn, formatPrice } from "@/lib/utils";
import { apiErrorMessage } from "@/types/api";

/** Today in the UAE (Asia/Dubai), formatted YYYY-MM-DD for date inputs/API. */
function uaeToday(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Dubai" }).format(new Date());
}

function Counter({
  value,
  onChange,
  min = 0,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
}) {
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - 1))}
        className="flex size-7 items-center justify-center rounded-full border hover:bg-accent"
        aria-label="decrease"
      >
        <Minus className="size-3.5" />
      </button>
      <span className="w-6 text-center text-sm font-semibold tabular-nums">{value}</span>
      <button
        type="button"
        onClick={() => onChange(value + 1)}
        className="flex size-7 items-center justify-center rounded-full border hover:bg-accent"
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
  const [transfer, setTransfer] = useState<string>(
    activity.activityType === "transfer" ? "shared" : "without",
  );
  const [vehicles, setVehicles] = useState<PrivateTransfer[]>([]);
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [checkedPrice, setCheckedPrice] = useState<number | null>(null);

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
          onSuccess: (data) => {
            if (typeof data.totalPrice === "number") setCheckedPrice(data.totalPrice);
          },
          onError: (err) => {
            setCheckedPrice(null);
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

  const privateTransferTotal = vehicles.reduce(
    (acc, v) => acc + (v.count ?? 0) * (v.price ?? 0),
    0,
  );

  const displayPrice =
    transfer === "private" && privateTransferTotal > 0
      ? privateTransferTotal
      : (checkedPrice ?? activity.lowPrice ?? 0);

  const addToCart = () => {
    if (!date) {
      toast.error("Select a date first");
      return;
    }
    if (activity.isTimeSlot && !selectedSlot) {
      toast.error("Select a time slot");
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
      totalPrice: checkedPrice ?? undefined,
      isPromoAdded: false,
      attractionTitle: attraction.title,
      attractionImage: attraction.images?.[0],
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

        {activity.activityType === "transfer" && (
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Transfer</label>
            <Select value={transfer} onValueChange={setTransfer}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="without">Without transfer</SelectItem>
                <SelectItem value="shared">Shared transfer</SelectItem>
                {(activity.privateTransfers?.length ?? 0) > 0 && (
                  <SelectItem value="private">Private transfer</SelectItem>
                )}
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

      {transfer === "private" && (activity.privateTransfers?.length ?? 0) > 0 && (
        <div className="mt-4 space-y-2 rounded-lg bg-secondary/60 p-3">
          <p className="text-xs font-semibold text-muted-foreground">Private vehicles</p>
          {activity.privateTransfers!.map((v, i) => {
            const current = vehicles.find((x) => x._id === v._id)?.count ?? 0;
            return (
              <div key={v._id ?? i} className="flex items-center justify-between text-sm">
                <span>
                  {v.name} <span className="text-xs text-muted-foreground">(max {v.maxCapacity})</span>
                </span>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-semibold">{formatPrice(v.price)}</span>
                  <Counter
                    value={current}
                    onChange={(count) =>
                      setVehicles((prev) => {
                        const rest = prev.filter((x) => x._id !== v._id);
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
              {slots.map((slot, i) => (
                <button
                  key={slot.EventID ?? i}
                  type="button"
                  onClick={() => setSelectedSlot(slot)}
                  className={cn(
                    "rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
                    selectedSlot?.EventID === slot.EventID
                      ? "border-primary bg-primary text-primary-foreground"
                      : "bg-card hover:bg-accent",
                  )}
                >
                  {slot.EventName ?? slot.StartDateTime}
                </button>
              ))}
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
