import { Link } from "react-router-dom";
import { ArrowUpRight, CreditCard, PiggyBank, Wallet } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useAgent } from "@/features/auth/api/auth.queries";
import { useBalance } from "@/features/wallet/api/wallet.queries";
import { useAttractionOrders } from "@/features/attractions/api/attractions.queries";
import { enabledModules } from "@/config/modules";
import { formatDate, formatPrice } from "@/lib/utils";

function StatCard({
  title,
  value,
  icon: Icon,
  loading,
}: {
  title: string;
  value: string;
  icon: typeof Wallet;
  loading?: boolean;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="font-sans text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className="flex size-8 items-center justify-center rounded-lg bg-secondary">
          <Icon className="size-4 text-primary" />
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-8 w-28" />
        ) : (
          <p className="text-2xl font-bold tabular-nums">{value}</p>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * New page (decision 2026-06-12): real dashboard at /dashboard while hotel
 * search stays the landing page. Booking/quotation summaries get wired in as
 * those modules land in Phases B/C.
 */
export default function DashboardPage() {
  const { agent, flags } = useAgent();
  const { data: balance, isLoading } = useBalance();
  const modules = enabledModules(flags);
  const { data: ordersData, isLoading: ordersLoading } = useAttractionOrders({
    skip: 0,
    limit: 5,
    referenceNo: "",
    status: "",
    attraction: "",
    activity: "",
    dateFrom: "",
    dateTo: "",
    travellerEmail: "",
  });
  const recentOrders = ordersData?.result?.data ?? [];

  const firstName = (agent?.name ?? "there").split(" ")[0];

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-gold">Dashboard</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">
          Welcome back, {firstName}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {agent?.companyName} · Agent #{agent?.agentCode}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          title="Wallet balance"
          value={formatPrice(balance?.balance)}
          icon={Wallet}
          loading={isLoading}
        />
        <StatCard
          title="Credit available"
          value={formatPrice((balance?.creditAmount ?? 0) - (balance?.creditUsed ?? 0))}
          icon={CreditCard}
          loading={isLoading}
        />
        <StatCard
          title="Credit used"
          value={formatPrice(balance?.creditUsed)}
          icon={PiggyBank}
          loading={isLoading}
        />
      </div>

      <section>
        <h2 className="mb-3 text-xl font-semibold">Start a booking</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {modules.map(([key, m]) => (
            <Link
              key={key}
              to={m.home}
              className="group relative overflow-hidden rounded-xl border bg-card p-5 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
            >
              <div className="flex items-start justify-between">
                <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <m.icon className="size-5 text-primary transition-colors group-hover:text-primary-foreground" />
                </div>
                <ArrowUpRight className="size-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
              </div>
              <p className="mt-4 font-semibold">{m.label}</p>
              <p className="text-xs text-muted-foreground">Search & book {m.label.toLowerCase()}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="font-sans text-base">Recent bookings</CardTitle>
            <Link to="/attraction/order" className="text-xs font-medium text-primary hover:underline">
              View all
            </Link>
          </CardHeader>
          <CardContent>
            {ordersLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : recentOrders.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No bookings yet.</p>
            ) : (
              <div className="divide-y">
                {recentOrders.map((order) => (
                  <Link
                    key={order._id}
                    to={`/attractions/invoice/${order._id}`}
                    className="flex items-center justify-between gap-3 py-2.5 transition-colors hover:bg-accent/50"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {order.activities?.activity?.name ?? order.attraction?.title ?? "Booking"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {order.agentReferenceNumber ?? order.referenceNumber} ·{" "}
                        {formatDate(order.activities?.date ?? order.createdAt)}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="text-sm font-semibold tabular-nums">
                        {formatPrice(order.totalAmount)}
                      </span>
                      <Badge variant="outline" className="capitalize">
                        {order.activities?.status ?? "—"}
                      </Badge>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="font-sans text-base">Recent quotations</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="py-6 text-center text-sm text-muted-foreground">
              Quotation activity will appear here once the quotation module goes live (Phase C).
            </p>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
