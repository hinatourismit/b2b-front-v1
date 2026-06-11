import { Link } from "react-router-dom";
import { XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

/** /attractions/invoice/error — gateway failure return target for attractions. */
export default function AttractionPaymentErrorPage() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-5 px-4 text-center">
      <div className="flex size-16 items-center justify-center rounded-2xl bg-destructive/10">
        <XCircle className="size-8 text-destructive" />
      </div>
      <div className="max-w-md space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Payment unsuccessful</h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Your attraction booking payment was declined or cancelled. Your cart is untouched — you
          can try again with a different payment method.
        </p>
      </div>
      <div className="flex gap-3">
        <Button asChild variant="outline">
          <Link to="/attractions/payment">Back to checkout</Link>
        </Button>
        <Button asChild>
          <Link to="/attraction">Browse attractions</Link>
        </Button>
      </div>
    </div>
  );
}
