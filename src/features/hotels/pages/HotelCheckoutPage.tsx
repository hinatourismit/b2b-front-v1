import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Clock, Loader2, MapPin, Star, Utensils } from "lucide-react";
import { toast } from "sonner";
import { ModuleGuard } from "@/app/guards";
import {
  useCompleteHotelPayLater,
  useCompleteHotelWallet,
  useCreateHotelOrder,
  useRoomRate,
} from "../api/hotels.queries";
import { useBalance } from "@/features/wallet/api/wallet.queries";
import { useInitialData } from "@/features/home/api/home.queries";
import type { ContactDetails, RoomRateResponse, TravellerDetail } from "../types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn, formatDate, formatPrice } from "@/lib/utils";
import { apiErrorMessage } from "@/types/api";

const HOTEL_CARD_FLAT_FEE = 1; // backend: (netPrice/100)*3 + 1

function Countdown({ expiresAt }: { expiresAt: number }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const left = Math.max(0, Math.floor((expiresAt - now) / 1000));
  const m = String(Math.floor(left / 60)).padStart(2, "0");
  const s = String(left % 60).padStart(2, "0");
  return (
    <span className={cn("font-semibold tabular-nums", left < 60 && "text-destructive")}>
      {m}:{s}
    </span>
  );
}

export default function HotelCheckoutPage() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const roomRate = useRoomRate();
  const createOrder = useCreateHotelOrder();
  const completeWallet = useCompleteHotelWallet();
  const completePayLater = useCompleteHotelPayLater();
  const { data: balance } = useBalance();
  const { data: initialData } = useInitialData();

  const [rate, setRate] = useState<RoomRateResponse | null>(null);
  const [loadError, setLoadError] = useState("");
  const [travellers, setTravellers] = useState<TravellerDetail[]>([]);
  const [contact, setContact] = useState<ContactDetails>({ country: "", email: "", phoneNumber: "" });
  const [specialRequest, setSpecialRequest] = useState("");
  const [payBy, setPayBy] = useState<"wallet" | "ccavenue" | "pay-later">("wallet");
  const [otpOpen, setOtpOpen] = useState(false);
  const [otp, setOtp] = useState("");
  const [orderId, setOrderId] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState(0);

  const rateKey = searchParams.get("rateKey") ?? "";
  const searchId = searchParams.get("searchId") ?? "";
  const hotelId = searchParams.get("hotelId") ?? id ?? "";

  useEffect(() => {
    if (!rateKey || !searchId) {
      setLoadError("Missing rate information. Please reselect the room.");
      return;
    }
    roomRate.mutate(
      { hotelId, rateKey: decodeURIComponent(rateKey), searchId },
      {
        onSuccess: (data) => {
          setRate(data);
          setTravellers(
            (data.travellerDetails ?? []).map((t) => ({
              ...t,
              title: t.title ?? "",
              firstName: t.firstName ?? "",
              lastName: t.lastName ?? "",
            })),
          );
          if (data.allowedPaymentMethods?.length) {
            const first = data.allowedPaymentMethods.find((m) =>
              ["wallet", "ccavenue", "pay-later"].includes(m),
            );
            if (first) setPayBy(first as typeof payBy);
          }
          setExpiresAt(Date.now() + (data.expiresIn ?? 0) * 1000);
        },
        onError: (err) => setLoadError(apiErrorMessage(err, "This rate is no longer available.")),
      },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rateKey, searchId]);

  const allowed = rate?.allowedPaymentMethods ?? [];
  const netPrice = rate?.rate?.netPrice ?? 0;
  const cardFee = payBy === "ccavenue" ? (netPrice / 100) * 3 + HOTEL_CARD_FLAT_FEE : 0;
  const payable = netPrice + cardFee;

  const spendable =
    (balance?.balance ?? 0) + ((balance?.creditAmount ?? 0) - (balance?.creditUsed ?? 0));

  const setTraveller = (i: number, patch: Partial<TravellerDetail>) =>
    setTravellers((prev) => prev.map((t, idx) => (idx === i ? { ...t, ...patch } : t)));

  const countries = initialData?.countries ?? [];

  const validate = (): string | null => {
    if (!contact.country || !contact.email || !contact.phoneNumber) return "Fill contact details";
    const bad = travellers.some((t) => !t.title || !t.firstName || !t.lastName);
    if (bad) return "Fill all traveller details";
    return null;
  };

  const buildBody = () => ({
    rateKey: rate!.rate.rateKey,
    hotelId,
    searchId: rate!.searchId ?? searchId,
    travellerDetails: travellers.map((t) => ({
      roomId: t.roomId,
      title: t.title,
      firstName: t.firstName,
      lastName: t.lastName,
      age: t.age,
      gender: t.gender,
      type: t.type?.split(" ")[0]?.toLowerCase(),
    })),
    contactDetails: contact,
    specialRequest,
  });

  const submit = () => {
    const err = validate();
    if (err) {
      toast.error(err);
      return;
    }
    if (payBy === "wallet" && spendable < payable) {
      toast.error("Not enough wallet balance or credit");
      return;
    }

    if (payBy === "pay-later") {
      completePayLater.mutate(buildBody(), {
        onSuccess: (data) => {
          toast.success("Booking held — complete payment before the deadline");
          navigate(`/hotel/invoice/${data._id}`);
        },
        onError: (e) => toast.error(apiErrorMessage(e)),
      });
      return;
    }

    createOrder.mutate(
      { ...buildBody(), paymentMethod: payBy },
      {
        onSuccess: (data) => {
          if (payBy === "wallet") {
            setOrderId((data as { _id: string })._id);
            setOtpOpen(true);
          } else if (payBy === "ccavenue") {
            const url = URL.createObjectURL(new Blob([data as string], { type: "text/html" }));
            window.location.replace(url);
          }
        },
        onError: (e) => toast.error(apiErrorMessage(e)),
      },
    );
  };

  const confirmWallet = () => {
    if (!orderId) return;
    completeWallet.mutate(
      { orderId, otp },
      {
        onSuccess: (data) => {
          setOtpOpen(false);
          toast.success("Booking confirmed");
          navigate(`/hotel/invoice/${data._id}`);
        },
        onError: (e) => toast.error(apiErrorMessage(e)),
      },
    );
  };

  const stars = useMemo(() => Number(rate?.hotel?.starCategory) || 0, [rate]);

  if (loadError) {
    return (
      <ModuleGuard module="hotels">
        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
          <p className="text-sm text-muted-foreground">{loadError}</p>
          <Button variant="outline" onClick={() => navigate(`/hotel/details/${hotelId}`)}>
            Back to hotel
          </Button>
        </div>
      </ModuleGuard>
    );
  }

  if (!rate) {
    return (
      <ModuleGuard module="hotels">
        <div className="flex min-h-[60vh] items-center justify-center">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      </ModuleGuard>
    );
  }

  return (
    <ModuleGuard module="hotels">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-3xl font-semibold tracking-tight">Complete your booking</h1>
          {expiresAt > 0 && (
            <p className="flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5 text-sm">
              <Clock className="size-4" /> Rate held for <Countdown expiresAt={expiresAt} />
            </p>
          )}
        </div>

        <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
          <div className="space-y-6">
            {/* Travellers */}
            <section className="space-y-4">
              <h2 className="text-lg font-semibold">Guest details</h2>
              {travellers.map((t, i) => (
                <div key={i} className="space-y-3 rounded-xl border bg-card p-4">
                  <p className="text-sm font-semibold capitalize text-muted-foreground">
                    {t.type ?? `Guest ${i + 1}`}
                  </p>
                  <div className="grid gap-3 sm:grid-cols-4">
                    <div className="space-y-1.5">
                      <Label>Title</Label>
                      <Select value={t.title} onValueChange={(v) => setTraveller(i, { title: v })}>
                        <SelectTrigger>
                          <SelectValue placeholder="—" />
                        </SelectTrigger>
                        <SelectContent>
                          {["Mr", "Mrs", "Ms", "Mstr", "Miss"].map((x) => (
                            <SelectItem key={x} value={x}>
                              {x}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5 sm:col-span-2">
                      <Label>First name</Label>
                      <Input
                        value={t.firstName}
                        onChange={(e) => setTraveller(i, { firstName: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Last name</Label>
                      <Input
                        value={t.lastName}
                        onChange={(e) => setTraveller(i, { lastName: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </section>

            {/* Contact */}
            <section className="space-y-3">
              <h2 className="text-lg font-semibold">Contact details</h2>
              <div className="grid gap-3 rounded-xl border bg-card p-4 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <Label>Country</Label>
                  <Select
                    value={contact.country}
                    onValueChange={(v) => setContact((c) => ({ ...c, country: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      {countries.map((c) => (
                        <SelectItem key={c._id} value={c._id}>
                          {c.countryName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={contact.email}
                    onChange={(e) => setContact((c) => ({ ...c, email: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Phone</Label>
                  <Input
                    value={contact.phoneNumber}
                    onChange={(e) => setContact((c) => ({ ...c, phoneNumber: e.target.value }))}
                  />
                </div>
              </div>
            </section>

            <section className="space-y-2">
              <h2 className="text-lg font-semibold">Special requests</h2>
              <Textarea
                value={specialRequest}
                onChange={(e) => setSpecialRequest(e.target.value)}
                placeholder="Optional — early check-in, high floor, etc. (not guaranteed)"
              />
            </section>
          </div>

          {/* Summary */}
          <aside className="h-fit space-y-4 lg:sticky lg:top-20">
            <div className="overflow-hidden rounded-xl border bg-card">
              <div className="border-b p-4">
                {stars > 0 && (
                  <div className="mb-1 flex items-center gap-0.5 text-gold">
                    {Array.from({ length: stars }).map((_, i) => (
                      <Star key={i} className="size-3.5 fill-current" />
                    ))}
                  </div>
                )}
                <p className="font-semibold">{rate.hotel?.hotelName}</p>
                {rate.hotel?.address && (
                  <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="size-3" /> {rate.hotel.address}
                  </p>
                )}
              </div>
              <div className="space-y-2 p-4 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>Check-in</span>
                  <span>{formatDate(rate.fromDate)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Check-out</span>
                  <span>{formatDate(rate.toDate)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Nights</span>
                  <span>{rate.noOfNights}</span>
                </div>
                {rate.rate?.boardName && (
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Utensils className="size-3.5" /> {rate.rate.boardName}
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-xl border bg-card p-4">
              <h3 className="mb-3 font-semibold">Payment</h3>
              <div className="space-y-2">
                {allowed.includes("wallet") && (
                  <PayOption
                    active={payBy === "wallet"}
                    onClick={() => setPayBy("wallet")}
                    title="Wallet"
                    note={`${formatPrice(spendable)} available`}
                  />
                )}
                {allowed.includes("ccavenue") && (
                  <PayOption
                    active={payBy === "ccavenue"}
                    onClick={() => setPayBy("ccavenue")}
                    title="Card (CCAvenue)"
                    note="+3% + AED 1"
                  />
                )}
                {allowed.includes("pay-later") && (
                  <PayOption
                    active={payBy === "pay-later"}
                    onClick={() => setPayBy("pay-later")}
                    title="Pay later"
                    note="hold now, pay before deadline"
                  />
                )}
              </div>

              <div className="mt-4 space-y-1.5 border-t pt-4 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>Room total</span>
                  <span className="tabular-nums">{formatPrice(netPrice)}</span>
                </div>
                {cardFee > 0 && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>Card charge</span>
                    <span className="tabular-nums">{formatPrice(cardFee)}</span>
                  </div>
                )}
                <div className="flex justify-between border-t pt-1.5 font-semibold">
                  <span>{payBy === "pay-later" ? "Due later" : "Total"}</span>
                  <span className="text-lg text-primary">{formatPrice(payable)}</span>
                </div>
              </div>

              <Button
                className="mt-4 w-full"
                size="lg"
                onClick={submit}
                disabled={createOrder.isPending || completePayLater.isPending}
              >
                {(createOrder.isPending || completePayLater.isPending) && (
                  <Loader2 className="size-4 animate-spin" />
                )}
                {payBy === "wallet"
                  ? "Pay from wallet"
                  : payBy === "pay-later"
                    ? "Hold booking"
                    : "Continue to payment"}
              </Button>
            </div>
          </aside>
        </div>
      </div>

      <Dialog open={otpOpen} onOpenChange={setOtpOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">Confirm booking</DialogTitle>
            <DialogDescription>
              Enter the OTP to confirm. {formatPrice(payable)} will be deducted from your wallet.
            </DialogDescription>
          </DialogHeader>
          <Input
            inputMode="numeric"
            placeholder="OTP"
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOtpOpen(false)}>
              Cancel
            </Button>
            <Button onClick={confirmWallet} disabled={completeWallet.isPending}>
              {completeWallet.isPending && <Loader2 className="size-4 animate-spin" />}
              Confirm & pay
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </ModuleGuard>
  );
}

function PayOption({
  active,
  onClick,
  title,
  note,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  note: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center justify-between rounded-lg border p-3 text-sm transition-colors",
        active ? "border-primary bg-primary/5" : "hover:bg-accent",
      )}
    >
      <span className="font-medium">{title}</span>
      <span className="text-xs text-muted-foreground">{note}</span>
    </button>
  );
}
