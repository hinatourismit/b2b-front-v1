import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { CheckCircle2, Download, FileText, Loader2, Ticket } from "lucide-react";
import { toast } from "sonner";
import { ModuleGuard } from "@/app/guards";
import { useAttractionOrder } from "../api/attractions.queries";
import { attractionsApi } from "../api/attractions.api";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { formatPrice } from "@/lib/utils";
import { apiErrorMessage } from "@/types/api";

interface OrderActivity {
  _id: string;
  activity?: { name?: string } | string;
  attraction?: { title?: string } | string;
  status?: string;
  grandTotal?: number;
  amount?: number;
  date?: string;
  adultsCount?: number;
  childrenCount?: number;
  ticketDownloadToken?: string;
  bookingType?: string;
  [key: string]: unknown;
}

function saveBlob(blob: Blob, filename: string) {
  const href = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = href;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(href);
}

/**
 * /attractions/invoice/:id — success/landing page after payment (also the
 * gateway/email return target). Mirrors old AttractionInvoice: order summary,
 * per-activity ticket downloads (token link), invoice PDF.
 */
export default function AttractionInvoicePage() {
  const { id } = useParams();
  const { data, isLoading, isError } = useAttractionOrder(id);
  const [downloadingInvoice, setDownloadingInvoice] = useState(false);

  const order = data as
    | {
        _id: string;
        referenceNumber?: string;
        agentReferenceNumber?: string;
        name?: string;
        email?: string;
        totalAmount?: number;
        orderStatus?: string;
        activities?: OrderActivity[];
        [key: string]: unknown;
      }
    | undefined;

  const downloadInvoice = async () => {
    if (!id) return;
    try {
      setDownloadingInvoice(true);
      saveBlob(await attractionsApi.getInvoiceBlob(id), `invoice-${id}.pdf`);
    } catch (err) {
      toast.error(apiErrorMessage(err, "Could not download the invoice"));
    } finally {
      setDownloadingInvoice(false);
    }
  };

  return (
    <ModuleGuard module="attractions">
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="mx-auto size-14 rounded-full" />
            <Skeleton className="mx-auto h-7 w-64" />
            <Skeleton className="h-48 rounded-xl" />
          </div>
        ) : isError || !order ? (
          <div className="py-16 text-center">
            <p className="text-sm text-muted-foreground">We couldn't load this order.</p>
            <Button asChild variant="outline" className="mt-4">
              <Link to="/attraction/order">Go to orders</Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="text-center">
              <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-success/10">
                <CheckCircle2 className="size-7 text-success" />
              </div>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight">Order confirmed</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Reference{" "}
                <span className="font-semibold text-foreground">
                  {order.referenceNumber ?? order._id}
                </span>
                {order.agentReferenceNumber ? ` · Agent ref ${order.agentReferenceNumber}` : ""}
              </p>
            </div>

            <div className="rounded-xl border bg-card p-5">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="font-semibold">{order.name}</p>
                  <p className="text-xs text-muted-foreground">{order.email}</p>
                </div>
                <Badge className="capitalize">{order.orderStatus ?? "—"}</Badge>
              </div>

              <div className="space-y-3">
                {(order.activities ?? []).map((item) => {
                  const activityName =
                    typeof item.activity === "object" ? item.activity?.name : undefined;
                  const attractionTitle =
                    typeof item.attraction === "object" ? item.attraction?.title : undefined;
                  return (
                    <div
                      key={item._id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-secondary/50 p-3"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">
                          {attractionTitle ?? activityName ?? "Activity"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {activityName}
                          {item.date ? ` · ${new Date(item.date).toLocaleDateString()}` : ""}
                          {item.status ? ` · ${item.status}` : ""}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold tabular-nums">
                          {formatPrice(item.grandTotal ?? item.amount)}
                        </span>
                        {item.ticketDownloadToken && id && (
                          <Button asChild size="sm" variant="outline">
                            <a
                              href={attractionsApi.bulkTicketsUrl(id, item._id, item.ticketDownloadToken)}
                              target="_blank"
                              rel="noreferrer"
                            >
                              <Ticket className="size-3.5" /> Tickets
                            </a>
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-4 flex items-center justify-between border-t pt-4">
                <span className="text-sm font-semibold">Total</span>
                <span className="text-lg font-bold text-primary">
                  {formatPrice(order.totalAmount)}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap justify-center gap-3">
              <Button onClick={downloadInvoice} disabled={downloadingInvoice} variant="outline">
                {downloadingInvoice ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <FileText className="size-4" />
                )}
                Download invoice
              </Button>
              <Button asChild>
                <Link to="/attraction/order">
                  <Download className="size-4" /> All orders
                </Link>
              </Button>
            </div>
          </div>
        )}
      </div>
    </ModuleGuard>
  );
}
