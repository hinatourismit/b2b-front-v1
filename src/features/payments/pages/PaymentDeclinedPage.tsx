import { Link } from "react-router-dom";
import { XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * CCAvenue/gateway failure return target. Served at both /payment-decline and
 * /b2b/wallet/deposit/:id/cancelled — these exact paths are configured on the
 * backend's gateway redirects and must never change.
 */
export default function PaymentDeclinedPage() {
  return (
    <div className="grain relative flex min-h-screen flex-col items-center justify-center gap-6 px-4 text-center">
      <div className="flex size-16 items-center justify-center rounded-2xl bg-destructive/10">
        <XCircle className="size-8 text-destructive" />
      </div>
      <div className="max-w-md space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Payment unsuccessful</h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Your payment was declined or cancelled. No amount has been charged — if you saw a
          deduction, it will be reversed automatically by your bank.
        </p>
      </div>
      <div className="flex gap-3">
        <Button asChild variant="outline">
          <Link to="/wallet">Back to wallet</Link>
        </Button>
        <Button asChild>
          <Link to="/">Back to home</Link>
        </Button>
      </div>
    </div>
  );
}
