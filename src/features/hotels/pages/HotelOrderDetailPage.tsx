import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Download, FileText, Loader2, MapPin, XCircle } from "lucide-react";
import { toast } from "sonner";
import { ModuleGuard } from "@/app/guards";
import { useHotelOrder } from "../api/hotels.queries";
import { hotelsApi } from "../api/hotels.api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { formatDate, formatPrice } from "@/lib/utils";
import { apiErrorMessage } from "@/types/api";

function saveBlob(blob: Blob, filename: string) {
  const href = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = href;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(href);
}

interface OrderDetail {
  _id: string;
  referenceNumber?: string;
  status?: string;
  netPrice?: number;
  totalAmount?: number;
  fromDate?: string;
  toDate?: string;
  checkInDate?: string;
  checkOutDate?: string;
  paymentState?: string;
  cancellationRemark?: string;
  hotel?: { hotelName?: string; address?: string };
  travellerDetails?: { title?: string; firstName?: string; lastName?: string; type?: string }[];
  rooms?: { roomName?: string }[];
  [key: string]: unknown;
}

export default function HotelOrderDetailPage({ success = false }: { success?: boolean }) {
  const { id } = useParams();
  const queryClient = useQueryClient();
  const { data, isLoading, isError } = useHotelOrder(id);
  const order = data as OrderDetail | undefined;

  const [busy, setBusy] = useState<"voucher" | "invoice" | null>(null);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [remark, setRemark] = useState("");
  const [cancelling, setCancelling] = useState(false);

  const download = async (kind: "voucher" | "invoice") => {
    if (!id) return;
    try {
      setBusy(kind);
      const blob =
        kind === "voucher"
          ? await hotelsApi.getVoucherBlob(id)
          : await hotelsApi.getInvoiceBlob(id);
      saveBlob(blob, `${kind}-${id}.pdf`);
    } catch (err) {
      toast.error(apiErrorMessage(err, `Could not download the ${kind}`));
    } finally {
      setBusy(null);
    }
  };

  const cancel = async () => {
    if (!id) return;
    try {
      setCancelling(true);
      await hotelsApi.cancelOrder(id, remark);
      toast.success("Cancellation requested");
      setCancelOpen(false);
      queryClient.invalidateQueries({ queryKey: ["hotels", "order", id] });
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setCancelling(false);
    }
  };

  const checkIn = order?.fromDate ?? order?.checkInDate;
  const checkOut = order?.toDate ?? order?.checkOutDate;
  const cancellable = order && !["cancelled"].includes(order.status ?? "");

  return (
    <ModuleGuard module="hotels">
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-8 w-2/3" />
            <Skeleton className="h-48 rounded-xl" />
          </div>
        ) : isError || !order ? (
          <div className="py-16 text-center">
            <p className="text-sm text-muted-foreground">We couldn't load this order.</p>
            <Button asChild variant="outline" className="mt-4">
              <Link to="/hotel/order">Go to orders</Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {success && (
              <div className="rounded-xl border border-success/30 bg-success/5 p-4 text-center">
                <p className="font-display text-2xl font-semibold text-success">Booking confirmed</p>
                <p className="text-sm text-muted-foreground">
                  A confirmation voucher is available below.
                </p>
              </div>
            )}

            <div>
              <div className="flex items-center justify-between gap-3">
                <h1 className="text-2xl font-semibold tracking-tight">
                  {order.hotel?.hotelName ?? "Hotel order"}
                </h1>
                <Badge className="capitalize">{order.status ?? "—"}</Badge>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                Reference {order.referenceNumber ?? order._id}
              </p>
              {order.hotel?.address && (
                <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin className="size-3" /> {order.hotel.address}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4 rounded-xl border bg-card p-5 text-sm sm:grid-cols-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Check-in</p>
                <p className="font-medium">{formatDate(checkIn)}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Check-out</p>
                <p className="font-medium">{formatDate(checkOut)}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Total</p>
                <p className="font-semibold text-primary">
                  {formatPrice(order.netPrice ?? order.totalAmount)}
                </p>
              </div>
              {order.paymentState && (
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Payment</p>
                  <p className="font-medium capitalize">{order.paymentState}</p>
                </div>
              )}
            </div>

            {(order.travellerDetails?.length ?? 0) > 0 && (
              <div className="rounded-xl border bg-card p-5">
                <p className="mb-2 text-sm font-semibold">Guests</p>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  {order.travellerDetails!.map((t, i) => (
                    <li key={i} className="capitalize">
                      {t.title} {t.firstName} {t.lastName}
                      {t.type ? ` · ${t.type}` : ""}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {order.cancellationRemark && (
              <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm">
                <p className="font-medium text-destructive">Cancellation</p>
                <p className="text-muted-foreground">{order.cancellationRemark}</p>
              </div>
            )}

            <div className="flex flex-wrap gap-3">
              <Button onClick={() => download("voucher")} disabled={busy !== null}>
                {busy === "voucher" ? <Loader2 className="size-4 animate-spin" /> : <FileText className="size-4" />}
                Voucher
              </Button>
              <Button variant="outline" onClick={() => download("invoice")} disabled={busy !== null}>
                {busy === "invoice" ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
                Invoice
              </Button>
              {cancellable && (
                <Button variant="ghost" className="text-destructive" onClick={() => setCancelOpen(true)}>
                  <XCircle className="size-4" /> Cancel booking
                </Button>
              )}
              <Button asChild variant="ghost" className="ml-auto">
                <Link to="/hotel/order">All orders</Link>
              </Button>
            </div>
          </div>
        )}
      </div>

      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">Cancel booking</DialogTitle>
            <DialogDescription>
              Cancellation charges may apply per the rate's policy. Add a remark for your records.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={remark}
            onChange={(e) => setRemark(e.target.value)}
            placeholder="Reason for cancellation"
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setCancelOpen(false)}>
              Keep booking
            </Button>
            <Button variant="destructive" onClick={cancel} disabled={cancelling}>
              {cancelling && <Loader2 className="size-4 animate-spin" />}
              Confirm cancellation
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </ModuleGuard>
  );
}
