import { Fragment, useState } from "react";
import { Link } from "react-router-dom";
import {
  ChevronDown,
  Eye,
  FileSpreadsheet,
  Loader2,
  Mail,
  MapPin,
  Phone,
  Ticket,
  User,
} from "lucide-react";
import { toast } from "sonner";
import { ModuleGuard } from "@/app/guards";
import { useAttractionOrders } from "../api/attractions.queries";
import { attractionsApi } from "../api/attractions.api";
import type { AttractionOrdersFilters } from "../types";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn, formatDate, formatPrice } from "@/lib/utils";
import { apiErrorMessage } from "@/types/api";
import { env } from "@/config/env";

const EMPTY: AttractionOrdersFilters = {
  skip: 0,
  limit: 10,
  referenceNo: "",
  status: "",
  attraction: "",
  activity: "",
  dateFrom: "",
  dateTo: "",
  travellerEmail: "",
};

/** Agent-relevant statuses (user decision 2026-06-13). The list API takes a
 *  single status value, so the combined view filters rows client-side. */
const VISIBLE_STATUSES = ["confirmed", "booked"];

function statusVariant(status: string | undefined) {
  switch (status) {
    case "confirmed":
      return "default" as const;
    case "booked":
      return "secondary" as const;
    case "cancelled":
      return "destructive" as const;
    default:
      return "outline" as const;
  }
}

/**
 * /attraction/order — column and filter structure mirrors the old
 * AttractionOrder.jsx / AttractionOrderTable.jsx exactly: Ref.No (agent ref +
 * agent code + booking type), Activity (name + pax), Booking Date
 * (activities.date), Purchase Date (createdAt), Price, Status, Tickets
 * (enabled only when confirmed). referenceNo matches BOTH the agent reference
 * and the platform reference server-side (b2bOrdersHelper.js:46 $or).
 */
export default function AttractionOrdersPage() {
  // Draft = what the inputs hold; applied = what the query uses.
  const [draft, setDraft] = useState(EMPTY);
  const [filters, setFilters] = useState<AttractionOrdersFilters>(EMPTY);
  const [downloading, setDownloading] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const { data, isLoading, isFetching } = useAttractionOrders(filters);

  const allRows = data?.result?.data ?? [];
  const orders =
    filters.status === ""
      ? allRows.filter((o) => VISIBLE_STATUSES.includes(o.activities?.status ?? ""))
      : allRows;
  const totalOrders = data?.result?.totalOrders ?? 0;
  const page = filters.skip / filters.limit;
  const pageCount = Math.max(1, Math.ceil(totalOrders / filters.limit));

  const apply = (patch: Partial<AttractionOrdersFilters> = {}) => {
    const next = { ...draft, ...patch, skip: 0 };
    setDraft(next);
    setFilters(next);
  };

  const setDraftField =
    (key: keyof AttractionOrdersFilters) => (e: React.ChangeEvent<HTMLInputElement>) =>
      setDraft((d) => ({ ...d, [key]: e.target.value }));

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
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-3xl font-semibold tracking-tight">Orders</h1>
          <Button variant="outline" onClick={downloadSheet} disabled={downloading}>
            {downloading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <FileSpreadsheet className="size-4" />
            )}
            Export Excel
          </Button>
        </div>

        {/* One orders hub — module tabs light up as each module ships. */}
        <div className="mb-5 flex gap-1.5 overflow-x-auto border-b pb-px">
          {[
            { label: "Attraction orders", active: true },
            { label: "Hotel orders" },
            { label: "Visa applications" },
            { label: "A2A orders" },
          ].map((tab) => (
            <button
              key={tab.label}
              type="button"
              disabled={!tab.active}
              title={tab.active ? undefined : "Available when this module launches"}
              className={
                tab.active
                  ? "shrink-0 border-b-2 border-primary px-3.5 py-2 text-sm font-semibold text-primary"
                  : "shrink-0 cursor-not-allowed px-3.5 py-2 text-sm font-medium text-muted-foreground/50"
              }
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Filter bar — same field set as the old AttractionOrder.jsx */}
        <form
          className="mb-5 grid grid-cols-2 gap-3 rounded-xl border bg-card p-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-8"
          onSubmit={(e) => {
            e.preventDefault();
            apply();
          }}
        >
          <div className="space-y-1">
            <Label className="text-xs" htmlFor="f-ref">
              Reference No.
            </Label>
            <Input
              id="f-ref"
              placeholder="My ref / order ref"
              value={draft.referenceNo}
              onChange={setDraftField("referenceNo")}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs" htmlFor="f-from">
              Date from
            </Label>
            <Input id="f-from" type="date" value={draft.dateFrom} onChange={setDraftField("dateFrom")} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs" htmlFor="f-to">
              Date to
            </Label>
            <Input id="f-to" type="date" value={draft.dateTo} onChange={setDraftField("dateTo")} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs" htmlFor="f-attraction">
              Attraction
            </Label>
            <Input
              id="f-attraction"
              placeholder="Search attraction…"
              value={draft.attraction}
              onChange={setDraftField("attraction")}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs" htmlFor="f-activity">
              Activity
            </Label>
            <Input
              id="f-activity"
              placeholder="Search activity…"
              value={draft.activity}
              onChange={setDraftField("activity")}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs" htmlFor="f-email">
              Traveller email
            </Label>
            <Input
              id="f-email"
              placeholder="Search email…"
              value={draft.travellerEmail}
              onChange={setDraftField("travellerEmail")}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Status</Label>
            <Select
              value={draft.status || "all"}
              onValueChange={(v) => apply({ status: v === "all" ? "" : v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Confirmed & booked</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="booked">Booked</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end gap-2">
            <div className="flex-1 space-y-1">
              <Label className="text-xs">Per page</Label>
              <Select
                value={String(draft.limit)}
                onValueChange={(v) => apply({ limit: Number(v) })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[10, 25, 50, 100].map((n) => (
                    <SelectItem key={n} value={String(n)}>
                      {n}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" size="sm" className="mb-0.5">
              Apply
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="mb-0.5"
              onClick={() => {
                setDraft(EMPTY);
                setFilters(EMPTY);
              }}
            >
              Clear
            </Button>
          </div>
        </form>

        {isFetching && !isLoading && (
          <p className="mb-2 flex items-center gap-1.5 text-xs text-muted-foreground">
            <Loader2 className="size-3 animate-spin" /> Updating…
          </p>
        )}

        <div className="overflow-x-auto rounded-xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ref.No</TableHead>
                <TableHead>Activity</TableHead>
                <TableHead>Booking Date</TableHead>
                <TableHead>Purchase Date</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Tickets</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : orders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-12 text-center text-sm text-muted-foreground">
                    No orders found.
                  </TableCell>
                </TableRow>
              ) : (
                orders.map((order) => (
                  <Fragment key={order._id}>
                  <TableRow
                    onClick={() =>
                      setExpandedId((id) => (id === order._id ? null : order._id))
                    }
                    className="cursor-pointer"
                  >
                    {/* Ref.No: agent's own reference + agent code + booking type
                        (old AttractionOrderTable.jsx:26-38) */}
                    <TableCell>
                      <p className="font-medium">{order.agentReferenceNumber ?? "—"}</p>
                      <p className="text-xs text-muted-foreground">
                        {order.referenceNumber ?? ""}
                        {order.reseller?.agentCode ? ` · #${order.reseller.agentCode}` : ""}
                      </p>
                      {order.activities?.bookingType && (
                        <p className="text-xs capitalize text-muted-foreground">
                          {order.activities.bookingType}
                        </p>
                      )}
                    </TableCell>
                    <TableCell className="min-w-52">
                      <p className="font-medium">{order.activities?.activity?.name ?? "—"}</p>
                      <p className="text-xs text-muted-foreground">
                        Adult: {order.activities?.adultsCount ?? 0}
                        {(order.activities?.childrenCount ?? 0) > 0 &&
                          ` · Child: ${order.activities?.childrenCount}`}
                        {(order.activities?.infantCount ?? 0) > 0 &&
                          ` · Infant: ${order.activities?.infantCount}`}
                      </p>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm">
                      {formatDate(order.activities?.date)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                      {formatDate(order.createdAt)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap font-semibold tabular-nums">
                      {formatPrice(order.totalAmount)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(order.activities?.status)} className="capitalize">
                        {order.activities?.status ?? "—"}
                      </Badge>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-right">
                      {/* tickets only when confirmed — old table disabled rule (:89) */}
                      {order.ticketDownloadToken && order.activities?._id && (
                        <Button
                          asChild={order.activities?.status === "confirmed"}
                          variant="ghost"
                          size="sm"
                          disabled={order.activities?.status !== "confirmed"}
                          onClick={(e) => e.stopPropagation()}
                        >
                          {order.activities?.status === "confirmed" ? (
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
                          ) : (
                            <span>
                              <Ticket className="size-3.5" /> Tickets
                            </span>
                          )}
                        </Button>
                      )}
                      <Button asChild variant="ghost" size="sm" onClick={(e) => e.stopPropagation()}>
                        <Link to={`/attractions/invoice/${order._id}`}>
                          <Eye className="size-3.5" /> View
                        </Link>
                      </Button>
                      <ChevronDown
                        className={cn(
                          "ml-1 inline size-4 text-muted-foreground transition-transform",
                          expandedId === order._id && "rotate-180",
                        )}
                      />
                    </TableCell>
                  </TableRow>

                  {/* Expanded detail — mirrors old AttractionOrderTable expanded
                      section: image + attraction/activity/date, traveller block,
                      order block */}
                  {expandedId === order._id && (
                    <TableRow className="bg-secondary/40 hover:bg-secondary/40">
                      <TableCell colSpan={7}>
                        <div className="flex flex-wrap items-start gap-10 px-2 py-3">
                          <div className="flex items-start gap-4">
                            {order.attraction?.images?.[0] && (
                              <img
                                src={
                                  String(order.attraction.images[0]).startsWith("http")
                                    ? String(order.attraction.images[0])
                                    : `${env.VITE_API_URL}/${String(order.attraction.images[0]).replace(/^\//, "")}`
                                }
                                alt=""
                                className="h-20 w-32 rounded-lg object-cover"
                              />
                            )}
                            <div>
                              <p className="font-semibold">{order.attraction?.title}</p>
                              <p className="text-sm text-muted-foreground">
                                {order.activities?.activity?.name}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {formatDate(order.activities?.date)}
                              </p>
                            </div>
                          </div>

                          <div className="text-sm">
                            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                              Traveller
                            </p>
                            <p className="mt-1 flex items-center gap-1.5 capitalize">
                              <User className="size-3.5" /> {order.name ?? "—"}
                            </p>
                            <p className="mt-1 flex items-center gap-1.5">
                              <Mail className="size-3.5" /> {order.email ?? "—"}
                            </p>
                            <p className="mt-1 flex items-center gap-1.5">
                              <Phone className="size-3.5" /> {order.phoneNumber ?? "—"}
                            </p>
                            {order.country?.countryName && (
                              <p className="mt-1 flex items-center gap-1.5 capitalize">
                                <MapPin className="size-3.5" /> {order.country.countryName}
                              </p>
                            )}
                          </div>

                          <div className="text-sm">
                            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                              Order
                            </p>
                            <p className="mt-1">
                              Reference:{" "}
                              <span className="font-medium">{order.referenceNumber ?? "—"}</span>
                            </p>
                            {order.activities?.transferType && (
                              <p className="mt-1 capitalize">
                                Transfer: {order.activities.transferType}
                              </p>
                            )}
                            <p className="mt-1">
                              Total:{" "}
                              <span className="font-semibold tabular-nums">
                                {formatPrice(order.totalAmount)}
                              </span>
                            </p>
                            <p className="mt-1 capitalize">
                              Status:{" "}
                              <Badge
                                variant={statusVariant(order.activities?.status)}
                                className="capitalize"
                              >
                                {order.activities?.status ?? "—"}
                              </Badge>
                            </p>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                  </Fragment>
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
              onClick={() =>
                setFilters((f) => ({ ...f, skip: Math.max(0, f.skip - f.limit) }))
              }
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
              onClick={() => setFilters((f) => ({ ...f, skip: f.skip + f.limit }))}
            >
              Next
            </Button>
          </div>
        </div>
      </div>
    </ModuleGuard>
  );
}
