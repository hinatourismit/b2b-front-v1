import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  CalendarDays,
  Clock3,
  Loader2,
  Pencil,
  ShoppingCart,
  Trash2,
  Users,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { ModuleGuard } from "@/app/guards";
import { useCartStore } from "../store/cart.store";
import { useCompleteWalletOrder, useCreateAttractionOrder } from "../api/attractions.queries";
import { useBalance } from "@/features/wallet/api/wallet.queries";
import { useInitialData } from "@/features/home/api/home.queries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { cn, formatDate, formatPrice, formatTime } from "@/lib/utils";
import { apiErrorMessage } from "@/types/api";
import type { SelectedActivityPayload } from "../types";

const leadSchema = z.object({
  firstname: z.string().min(1, "Required"),
  lastname: z.string().min(1, "Required"),
  email: z.string().email("Enter a valid email"),
  // backend Joi: phoneNumber must be a number — digits only
  phone: z.string().regex(/^\d{5,15}$/, "Digits only (no + or spaces)"),
  country: z.string().min(1, "Required"),
  agentReferenceNumber: z.string().min(1, "Agent reference number required"),
});

type LeadForm = z.infer<typeof leadSchema>;

/**
 * /attractions/payment — same workflow as old PaymentHomePage:
 * cart (localStorage) → lead passenger + agentReferenceNumber + paymentMethod
 * → POST orders/create → wallet: confirm dialog → complete(otp 12345) →
 * /attractions/invoice/:id; ccavenue: response is HTML → location.replace(blob).
 */
export default function AttractionCheckoutPage() {
  const navigate = useNavigate();
  const { items, removeItem, emptyCart, total } = useCartStore();
  const { data: balance } = useBalance();
  const { data: initialData } = useInitialData();
  const createOrder = useCreateAttractionOrder();
  const completeOrder = useCompleteWalletOrder();

  const [payBy, setPayBy] = useState<"wallet" | "ccavenue">("wallet");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);

  const form = useForm<LeadForm>({ resolver: zodResolver(leadSchema) });

  // Breakdown: row prices are pre-VAT; VAT added per item (same formula the
  // old checkout used inside finalPayment). Card payments carry a 3% surcharge
  // (user decision 2026-06-13), auto-added when CCAvenue is selected.
  const subtotal = items.reduce((acc, item) => acc + item.price, 0);
  const vatTotal = items.reduce(
    (acc, item) => acc + (item.isVat && item.vat ? (item.price * item.vat) / 100 : 0),
    0,
  );
  const grandTotal = total(); // subtotal + VAT
  // No card surcharge here: the backend computes the order total itself and
  // the gateway charges exactly that (verified — no fee logic in the
  // attraction order controller/helpers). Adding 3% on card checkout needs a
  // backend change; the wallet top-up fee works because that controller
  // deducts the fee from the credited amount.
  const payableTotal = grandTotal;

  // Backend rule (checkWalletBalance.js): spendable = balance + (creditAmount
  // - creditUsed). Credit lets agents pay even with zero cash balance.
  const spendable =
    (balance?.balance ?? 0) + ((balance?.creditAmount ?? 0) - (balance?.creditUsed ?? 0));

  const onSubmit = (values: LeadForm) => {
    if (payBy === "wallet" && spendable < grandTotal) {
      toast.error("Not enough wallet balance or credit", {
        description: "Please top up your wallet and try again.",
      });
      return;
    }

    // Payload shaped to b2bAttractionOrder.schema.js exactly: slot allows only
    // whitelisted keys; privateTransfers items are { vehicleId, count } with
    // vehicleId = pvtTransferId (old ActivityComponent.jsx:370).
    const selectedActivities: SelectedActivityPayload[] = items.map((item) => {
      const slot = item.selectedTimeSlot
        ? {
            EventID: item.selectedTimeSlot.EventID,
            EventTypeID: item.selectedTimeSlot.EventTypeID,
            EventName: item.selectedTimeSlot.EventName,
            StartDateTime: item.selectedTimeSlot.StartDateTime,
            EndDateTime: item.selectedTimeSlot.EndDateTime,
            ResourceID: item.selectedTimeSlot.ResourceID,
            Status: item.selectedTimeSlot.Status,
            AdultPrice: item.selectedTimeSlot.AdultPrice,
            ChildPrice: item.selectedTimeSlot.ChildPrice,
            Available: item.selectedTimeSlot.Available,
          }
        : null;

      const vehicles =
        Array.isArray(item.selectedVehicle) && item.selectedVehicle.length > 0
          ? item.selectedVehicle
          : (item.vehicle ?? []);

      return {
        activity: item._id,
        date: item.date,
        adultsCount: item.adult,
        childrenCount: item.child,
        infantCount: item.infant,
        hoursCount: item.hourCount ? item.hourCount : "",
        transferType: item.transfer,
        slot,
        isPromoAdded: item.isPromoAdded ?? false,
        privateTransfers:
          item.transfer === "private"
            ? vehicles.map((v) => ({
                vehicleId: (v.pvtTransferId ?? v._id) as string,
                count: v.count ?? 0,
              }))
            : undefined,
      };
    });

    createOrder.mutate(
      {
        selectedActivities,
        country: values.country,
        name: `${values.firstname} ${values.lastname}`,
        email: values.email,
        phoneNumber: values.phone,
        agentReferenceNumber: values.agentReferenceNumber,
        paymentMethod: payBy,
      },
      {
        onSuccess: (data) => {
          if (payBy === "wallet") {
            setOrderId((data as { _id: string })._id);
            setConfirmOpen(true);
          } else if (payBy === "ccavenue") {
            // Old-app behavior: response is an HTML page → replace location.
            const winUrl = URL.createObjectURL(new Blob([data as string], { type: "text/html" }));
            window.location.replace(winUrl);
          }
        },
        onError: (err) => toast.error(apiErrorMessage(err)),
      },
    );
  };

  const confirmWalletPayment = () => {
    if (!orderId) return;
    completeOrder.mutate(orderId, {
      onSuccess: (data) => {
        setConfirmOpen(false);
        emptyCart();
        toast.success("Payment success — order completed");
        navigate(`/attractions/invoice/${data._id}`);
      },
      onError: (err) => toast.error(apiErrorMessage(err)),
    });
  };

  const countries = initialData?.countries ?? [];

  if (items.length === 0) {
    return (
      <ModuleGuard module="attractions">
        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
          <ShoppingCart className="size-10 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Your cart is empty.</p>
          <Button asChild variant="outline">
            <Link to="/attraction">Browse attractions</Link>
          </Button>
        </div>
      </ModuleGuard>
    );
  }

  return (
    <ModuleGuard module="attractions">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <h1 className="mb-6 text-3xl font-semibold tracking-tight">Checkout</h1>

        <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
          <div className="space-y-6">
            <section className="space-y-3">
              <h2 className="text-lg font-semibold">Your cart</h2>
              {items.map((item) => (
                <div
                  key={item._id}
                  className="flex items-center justify-between gap-4 rounded-xl border bg-card p-4"
                >
                  <div className="min-w-0">
                    <p className="truncate font-sans text-sm font-semibold">
                      {item.attractionTitle ?? item.name}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">{item.name}</p>
                    <p className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <CalendarDays className="size-3" /> {formatDate(item.date)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="size-3" />
                        {item.adult}A{item.child > 0 ? ` · ${item.child}C` : ""}
                        {item.infant > 0 ? ` · ${item.infant}I` : ""}
                      </span>
                      <span className="capitalize">{item.transfer} transfer</span>
                    </p>
                    {item.selectedTimeSlot && (
                      <p className="mt-1 flex items-center gap-1 text-xs font-medium text-primary">
                        <Clock3 className="size-3" />
                        {formatTime(item.selectedTimeSlot.StartDateTime)} –{" "}
                        {formatTime(item.selectedTimeSlot.EndDateTime)}
                        <span className="text-muted-foreground">
                          · Adult {formatPrice(Number(item.selectedTimeSlot.AdultPrice ?? 0))} ·
                          Child {formatPrice(Number(item.selectedTimeSlot.ChildPrice ?? 0))}
                        </span>
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <div className="text-right">
                      <span className="font-semibold text-primary">{formatPrice(item.price)}</span>
                      {item.isVat && item.vat ? (
                        <span className="block text-[11px] text-muted-foreground">
                          +{item.vat}% VAT
                        </span>
                      ) : null}
                    </div>
                    {(() => {
                      const editId =
                        item.attractionId ??
                        (typeof item.attraction === "string"
                          ? item.attraction
                          : (item.attraction as { _id?: string } | undefined)?._id);
                      return editId ? (
                        <Link
                          to={`/attractions/details/${editId}`}
                          className="text-muted-foreground hover:text-primary"
                          aria-label="Edit selection"
                          title="Edit"
                        >
                          <Pencil className="size-4" />
                        </Link>
                      ) : null;
                    })()}
                    <button
                      onClick={() => removeItem(item._id)}
                      className="text-muted-foreground hover:text-destructive"
                      aria-label="Remove from cart"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </div>
              ))}
            </section>

            <section>
              <h2 className="mb-3 text-lg font-semibold">Lead passenger</h2>
              <form
                id="checkout-form"
                onSubmit={form.handleSubmit(onSubmit)}
                className="grid gap-4 rounded-xl border bg-card p-5 sm:grid-cols-2"
                noValidate
              >
                <div className="space-y-1.5">
                  <Label htmlFor="firstname">First name</Label>
                  <Input id="firstname" {...form.register("firstname")} />
                  {form.formState.errors.firstname && (
                    <p className="text-xs text-destructive">{form.formState.errors.firstname.message}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="lastname">Last name</Label>
                  <Input id="lastname" {...form.register("lastname")} />
                  {form.formState.errors.lastname && (
                    <p className="text-xs text-destructive">{form.formState.errors.lastname.message}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" {...form.register("email")} />
                  {form.formState.errors.email && (
                    <p className="text-xs text-destructive">{form.formState.errors.email.message}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="phone">Phone</Label>
                  <Input id="phone" {...form.register("phone")} />
                  {form.formState.errors.phone && (
                    <p className="text-xs text-destructive">{form.formState.errors.phone.message}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label>Country</Label>
                  <Select onValueChange={(v) => form.setValue("country", v, { shouldValidate: true })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select country" />
                    </SelectTrigger>
                    <SelectContent>
                      {countries.map((c) => (
                        <SelectItem key={c._id} value={c._id}>
                          {c.countryName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {form.formState.errors.country && (
                    <p className="text-xs text-destructive">{form.formState.errors.country.message}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="agentReferenceNumber">Agent reference number</Label>
                  <Input id="agentReferenceNumber" {...form.register("agentReferenceNumber")} />
                  {form.formState.errors.agentReferenceNumber && (
                    <p className="text-xs text-destructive">
                      {form.formState.errors.agentReferenceNumber.message}
                    </p>
                  )}
                </div>
              </form>
            </section>
          </div>

          <aside className="h-fit space-y-4 lg:sticky lg:top-20">
            <div className="rounded-xl border bg-card p-5">
              <h2 className="mb-3 text-lg font-semibold">Payment</h2>
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => setPayBy("wallet")}
                  className={cn(
                    "flex w-full items-center justify-between rounded-lg border p-3 text-sm transition-colors",
                    payBy === "wallet" ? "border-primary bg-primary/5" : "hover:bg-accent",
                  )}
                >
                  <span className="flex items-center gap-2 font-medium">
                    <Wallet className="size-4" /> Wallet
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatPrice(spendable)} available
                    {(balance?.creditAmount ?? 0) > 0 ? " (incl. credit)" : ""}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setPayBy("ccavenue")}
                  className={cn(
                    "flex w-full items-center justify-between rounded-lg border p-3 text-sm transition-colors",
                    payBy === "ccavenue" ? "border-primary bg-primary/5" : "hover:bg-accent",
                  )}
                >
                  <span className="font-medium">Card (CCAvenue)</span>
                  <span className="text-xs text-muted-foreground">redirects to gateway</span>
                </button>
              </div>

              <div className="mt-4 space-y-1.5 border-t pt-4 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal</span>
                  <span className="tabular-nums">{formatPrice(subtotal)}</span>
                </div>
                {vatTotal > 0 && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>VAT</span>
                    <span className="tabular-nums">{formatPrice(vatTotal)}</span>
                  </div>
                )}
                <div className="flex justify-between border-t pt-1.5 font-semibold">
                  <span>Total</span>
                  <span className="text-lg text-primary">{formatPrice(payableTotal)}</span>
                </div>
              </div>

              <Button
                form="checkout-form"
                type="submit"
                className="mt-4 w-full"
                size="lg"
                disabled={createOrder.isPending}
              >
                {createOrder.isPending && <Loader2 className="size-4 animate-spin" />}
                {payBy === "wallet" ? "Pay from wallet" : "Continue to payment"}
              </Button>
            </div>
          </aside>
        </div>
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">Booking confirmation</DialogTitle>
            <DialogDescription>
              By confirming, the attraction will be purchased and{" "}
              <span className="font-semibold text-foreground">{formatPrice(grandTotal)}</span> will
              be deducted from your wallet.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <Button onClick={confirmWalletPayment} disabled={completeOrder.isPending}>
              {completeOrder.isPending && <Loader2 className="size-4 animate-spin" />}
              Confirm & pay
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </ModuleGuard>
  );
}
