import { useState } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  CreditCard,
  Hourglass,
  Loader2,
  PlusCircle,
  Wallet,
} from "lucide-react";
import { useBalance, useTransactions } from "../api/wallet.queries";
import { TopUpDialog } from "../components/TopUpDialog";
import { WithdrawDialog } from "../components/WithdrawDialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate, formatPrice } from "@/lib/utils";

const PAGE_SIZE = 10;

function txVariant(type: string | undefined) {
  switch (type) {
    case "deposit":
    case "refund":
      return "default" as const;
    case "deduct":
      return "secondary" as const;
    case "withdraw":
      return "destructive" as const;
    default:
      return "outline" as const;
  }
}

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
        <CardTitle className="font-sans text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div className="flex size-8 items-center justify-center rounded-lg bg-secondary">
          <Icon className="size-4 text-primary" />
        </div>
      </CardHeader>
      <CardContent>
        {loading ? <Skeleton className="h-8 w-28" /> : <p className="text-2xl font-bold tabular-nums">{value}</p>}
      </CardContent>
    </Card>
  );
}

/**
 * /wallet — balance/credit summary + transactions (contracts per old
 * Wallet.jsx:51 and AllTransaction.jsx; envelope { result: { data,
 * totalTransactions } }). Deposits/withdrawals management lands in Phase D.
 */
export default function WalletPage() {
  const { data: balance, isLoading: balanceLoading } = useBalance();
  const [skip, setSkip] = useState(0);
  const [topUpOpen, setTopUpOpen] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const { data, isLoading, isFetching } = useTransactions({
    skip,
    limit: PAGE_SIZE,
    status: "",
  });

  const transactions = data?.result?.data ?? [];
  const total = data?.result?.totalTransactions ?? 0;
  const page = skip / PAGE_SIZE;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const creditAvailable = (balance?.creditAmount ?? 0) - (balance?.creditUsed ?? 0);

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-gold">Finance</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Wallet</h1>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setTopUpOpen(true)}>
            <PlusCircle className="size-4" /> Top up
          </Button>
          <Button variant="outline" onClick={() => setWithdrawOpen(true)}>
            <ArrowUpRight className="size-4" /> Withdraw
          </Button>
        </div>
      </div>

      <TopUpDialog open={topUpOpen} onOpenChange={setTopUpOpen} />
      <WithdrawDialog open={withdrawOpen} onOpenChange={setWithdrawOpen} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Balance" value={formatPrice(balance?.balance)} icon={Wallet} loading={balanceLoading} />
        <StatCard
          title="Credit available"
          value={formatPrice(creditAvailable)}
          icon={CreditCard}
          loading={balanceLoading}
        />
        <StatCard
          title="Credit used"
          value={formatPrice(balance?.creditUsed)}
          icon={ArrowUpRight}
          loading={balanceLoading}
        />
        <StatCard
          title="Pending balance"
          value={formatPrice(balance?.pendingBalance)}
          icon={Hourglass}
          loading={balanceLoading}
        />
      </div>

      {/* Transactions hidden for now (user decision 2026-06-13) — restore by
          removing this false-gate. */}
      {false && (
      <section>
        <div className="mb-3 flex items-center gap-2">
          <h2 className="text-xl font-semibold">Transactions</h2>
          {isFetching && !isLoading && (
            <Loader2 className="size-4 animate-spin text-muted-foreground" />
          )}
        </div>

        <div className="overflow-hidden rounded-xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Details</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Closing balance</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 5 }).map((_, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : transactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-12 text-center text-sm text-muted-foreground">
                    No transactions yet.
                  </TableCell>
                </TableRow>
              ) : (
                transactions.map((tx) => (
                  <TableRow key={tx._id}>
                    <TableCell>
                      <Badge variant={txVariant(tx.transactionType)} className="capitalize">
                        {tx.transactionType === "deposit" ? (
                          <ArrowDownLeft className="size-3" />
                        ) : (
                          <ArrowUpRight className="size-3" />
                        )}
                        {tx.transactionType ?? "—"}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-72">
                      <p className="truncate text-sm capitalize">
                        {tx.product ?? tx.paymentProcessor ?? "—"}
                      </p>
                      {(tx.description ?? tx.note) && (
                        <p className="truncate text-xs text-muted-foreground">
                          {tx.description ?? tx.note}
                        </p>
                      )}
                    </TableCell>
                    <TableCell className="font-semibold tabular-nums">
                      {formatPrice(tx.amount)}
                    </TableCell>
                    <TableCell className="tabular-nums text-muted-foreground">
                      {typeof tx.closingBalance === "number" ? formatPrice(tx.closingBalance) : "—"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(tx.dateTime ?? tx.createdAt)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
          <span>
            {total} transaction{total === 1 ? "" : "s"}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 0}
              onClick={() => setSkip((s) => Math.max(0, s - PAGE_SIZE))}
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
              onClick={() => setSkip((s) => s + PAGE_SIZE)}
            >
              Next
            </Button>
          </div>
        </div>
      </section>
      )}
    </div>
  );
}
