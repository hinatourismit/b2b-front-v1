import { useState } from "react";
import { Link } from "react-router-dom";
import { Eye } from "lucide-react";
import { ModuleGuard } from "@/app/guards";
import { useHotelOrders } from "../api/hotels.queries";
import { Button } from "@/components/ui/button";
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

const PAGE = 10;

function statusVariant(s: string | undefined) {
  switch (s) {
    case "confirmed":
    case "booked":
      return "default" as const;
    case "pending":
    case "pay-later":
      return "secondary" as const;
    case "cancelled":
      return "destructive" as const;
    default:
      return "outline" as const;
  }
}

export default function HotelOrdersPage() {
  const [skip, setSkip] = useState(0);
  const { data, isLoading } = useHotelOrders(skip, PAGE);
  const orders = data?.hotelOrders ?? [];
  const total = data?.totalHotelOrders ?? 0;
  const page = skip / PAGE;
  const pageCount = Math.max(1, Math.ceil(total / PAGE));

  return (
    <ModuleGuard module="hotels">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <h1 className="mb-6 text-3xl font-semibold tracking-tight">Hotel orders</h1>

        <div className="overflow-x-auto rounded-xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Reference</TableHead>
                <TableHead>Hotel</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Booked</TableHead>
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
                    No hotel orders yet.
                  </TableCell>
                </TableRow>
              ) : (
                orders.map((o) => (
                  <TableRow key={o._id}>
                    <TableCell className="font-medium">{o.referenceNumber ?? o._id.slice(-8)}</TableCell>
                    <TableCell className="max-w-56 truncate">
                      {o.hotel?.hotelName ?? o.hotelName ?? "—"}
                    </TableCell>
                    <TableCell className="font-semibold tabular-nums">
                      {formatPrice(o.netPrice ?? o.totalAmount)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(o.status ?? o.orderStatus)} className="capitalize">
                        {o.status ?? o.orderStatus ?? "—"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(o.createdAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button asChild variant="ghost" size="sm">
                        <Link to={`/hotel/order/${o._id}/details`}>
                          <Eye className="size-3.5" /> View
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
            {total} order{total === 1 ? "" : "s"}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 0}
              onClick={() => setSkip((s) => Math.max(0, s - PAGE))}
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
              onClick={() => setSkip((s) => s + PAGE)}
            >
              Next
            </Button>
          </div>
        </div>
      </div>
    </ModuleGuard>
  );
}
