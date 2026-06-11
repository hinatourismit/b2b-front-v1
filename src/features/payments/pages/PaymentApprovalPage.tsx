import { Link } from "react-router-dom";
import { Clock } from "lucide-react";
import { Button } from "@/components/ui/button";

/** /payment/approval — static informational page (parity with old app: no API). */
export default function PaymentApprovalPage() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-5 px-4 text-center">
      <div className="flex size-16 items-center justify-center rounded-2xl bg-warning/15">
        <Clock className="size-8 text-warning" />
      </div>
      <div className="max-w-md space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Payment pending approval</h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Your payment is being verified. The order will be confirmed once the payment is approved —
          you can track its status from your orders page.
        </p>
      </div>
      <Button asChild>
        <Link to="/attraction/order">View orders</Link>
      </Button>
    </div>
  );
}
