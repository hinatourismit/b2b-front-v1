import { Link } from "react-router-dom";
import { XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

/** /hotel/invoice/error — gateway failure return target for hotels. */
export default function HotelErrorPage() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-5 px-4 text-center">
      <div className="flex size-16 items-center justify-center rounded-2xl bg-destructive/10">
        <XCircle className="size-8 text-destructive" />
      </div>
      <div className="max-w-md space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Booking unsuccessful</h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Your hotel payment was declined or the rate expired before it completed. No amount was
          charged — please search again and rebook.
        </p>
      </div>
      <div className="flex gap-3">
        <Button asChild variant="outline">
          <Link to="/hotel/order">View orders</Link>
        </Button>
        <Button asChild>
          <Link to="/hotel">Search hotels</Link>
        </Button>
      </div>
    </div>
  );
}
