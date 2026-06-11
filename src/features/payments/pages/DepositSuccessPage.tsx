import { Link, useParams } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * CCAvenue wallet-deposit success return target. The exact path
 * /b2b/wallet/deposit/:id/success is backend gateway contract.
 */
export default function DepositSuccessPage() {
  const { id } = useParams();

  return (
    <div className="grain relative flex min-h-screen flex-col items-center justify-center gap-6 px-4 text-center">
      <div className="flex size-16 items-center justify-center rounded-2xl bg-success/10">
        <CheckCircle2 className="size-8 text-success" />
      </div>
      <div className="max-w-md space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Deposit successful</h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Your wallet has been topped up{id ? ` (reference ${id})` : ""}. The new balance is
          available immediately for bookings.
        </p>
      </div>
      <div className="flex gap-3">
        <Button asChild variant="outline">
          <Link to="/wallet">View wallet</Link>
        </Button>
        <Button asChild>
          <Link to="/">Start booking</Link>
        </Button>
      </div>
    </div>
  );
}
