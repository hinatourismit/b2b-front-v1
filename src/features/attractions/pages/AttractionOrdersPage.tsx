import { useState } from "react";
import { Link } from "react-router-dom";
import { Download, FileSpreadsheet, Loader2, Search, Ticket } from "lucide-react";
import { toast } from "sonner";
import { ModuleGuard } from "@/app/guards";
import { useAttractionOrders } from "../api/attractions.queries";
import { attractionsApi } from "../api/attractions.api";
import type { AttractionOrdersFilters } from "../types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate, formatPrice } from "@/lib/utils";
import { apiErrorMessage } from "@/types/api";

const PAGE_SIZE = 10;

const EMPTY: AttractionOrdersFilters = {
  skip: 0,
  limit: PAGE_SIZE,
  referenceNo: "",
  status: "",
  attraction: "",
  activity: "",
  dateFrom: "",
  dateTo: "",
  travellerEmail: "",
};

function statusVariant(status: string | undefined) {
  switch (status) {
    case "completed":
    case "confirmed":
    case "booked":
      return "default" as const;
    case "pending":
      return "secondary" as const;
    case "cancelled":
    case "failed":
      return "destructive" as const;
    default:
      return "outline" as const;
  }
}

/** /attraction/order — same query contract as old AttractionOrder page. */
export default function AttractionOrdersPage() {
  const [filters, setFilters] = useState<AttractionOrdersFilters>(EMPTY);
  const [referenceInput, setReferenceInput] = useState("");
  const [downloading, setDownloading] = useState(false);
  const { data, isLoading, isFetching } = useAttractionOrders(filters);

  const orders = data?.result?.data ?? [];
  const totalOrders = data?.result?.totalOrders ?? 0;
  const page = filters.skip / PAGE_SIZE;
  const pageCount = Math.max(1, Math.ceil(totalOrders / PAGE_SIZE));

  const downloadSheet = async () => {
    try {
      setDownloading(true);
      const blob = await attractionsApi.getOrdersSheetBlob({
        skip: filters.skip,
        limit: filters.limit,
        referenceNo: filters.referenceNo,
        status: filters.status,
      });
      const href = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = href;
      link.download = "orders.xlsx";
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(href);
    } catch (err) {
      toast.error(apiErrorMessage(err, "Could not download the sheet"));
    } finally {
      setDownloading(false);
    }
  };

  return (
    <ModuleGuard module="attractions">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-3xl font-semibold tracking-tight">Attraction orders</h1>
          <Button variant="outline" onClick={downloadSheet} disabled={downloading}>
            {downloading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <FileSpreadsheet className="size-4" />
            )}
            Export Excel
          </Button>
        </div>

        <div className="mb-4 flex flex-wrap items-center gap-2">
          <form
            className="relative"
            onSubmit={(e) => {
              e.preventDefault();
              setFilters((f) => ({ ...f, skip: 0, referenceNo: referenceInput }));
            }}
          >
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={referenceInput}
              onChange={(e) => setReferenceInput(e.target.value)}
              placeholder="Reference number…"
              className="w-56 pl-9"
            />
          </form>
          <Select
            value={filters.status || "all"}
            onValueChange={(v) => setFilters((f) => ({ ...f, skip: 0, status: v === "all" ? "" : v }))}
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
          {isFetching && !isLoading && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
        </div>

        <div className="overflow-hidden rounded-xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Reference</TableHead>
                <TableHead>Traveller</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 6 }).map((_, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : orders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-12 text-center text-sm text-muted-foreground">
                    No orders found.
                  </TableCell>
                </TableRow>
              ) : (
                orders.map((order) => (
                  <TableRow key={order._id}>
                    <TableCell className="font-medium">
                      {order.referenceNumber ?? order.agentReferenceNumber ?? order._id.slice(-8)}
                    </TableCell>
                    <TableCell>
                      <p className="max-w-44 truncate">
                        {order.attraction?.title ?? order.activities?.activity?.name ?? "—"}
                      </p>
                      <p className="max-w-44 truncate text-xs text-muted-foreground">
                        {order.name} · {order.email}
                      </p>
                    </TableCell>
                    <TableCell className="font-semibold tabular-nums">
                      {formatPrice(order.totalAmount)}
                    </TableCell>
                    <TableCell>
                      {/* status lives on the unwound activities object (old table: item?.activities?.status) */}
                      <Badge variant={statusVariant(order.activities?.status)} className="capitalize">
                        {order.activities?.status ?? "—"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(order.createdAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      {order.ticketDownloadToken && order.activities?._id && (
                        <Button asChild variant="ghost" size="sm">
                          <a
                            href={attractionsApi.bulkTicketsUrl(
                              order._id,
                              order.activities._id,
                              order.ticketDownloadToken,
                            )}
                            target="_blank"
                            rel="noreferrer"
                          >
                            <Ticket className="size-3.5" /> Tickets
                          </a>
                        </Button>
                      )}
                      <Button asChild variant="ghost" size="sm">
                        <Link to={`/attractions/invoice/${order._id}`}>
                          <Download className="size-3.5" /> View
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
          <span>
            {totalOrders} order{totalOrders === 1 ? "" : "s"}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 0}
              onClick={() => setFilters((f) => ({ ...f, skip: Math.max(0, f.skip - PAGE_SIZE) }))}
            >
              Previous
            </Button>
            <span>
              Page {page + 1} of {pageCount}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page + 1 >= pageCount}
              onClick={() => setFilters((f) => ({ ...f, skip: f.skip + PAGE_SIZE }))}
            >
              Next
            </Button>
          </div>
        </div>
      </div>
    </ModuleGuard>
  );
}
