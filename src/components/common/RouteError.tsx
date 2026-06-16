import { Link, useRouteError } from "react-router-dom";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Route-level error boundary so a render error shows a recoverable page. */
export default function RouteError() {
  const error = useRouteError();
  const message =
    error instanceof Error ? error.message : typeof error === "string" ? error : "Unexpected error";

  return (
    <div className="grain relative flex min-h-screen flex-col items-center justify-center gap-5 px-4 text-center">
      <div className="flex size-16 items-center justify-center rounded-2xl bg-destructive/10">
        <AlertTriangle className="size-8 text-destructive" />
      </div>
      <div className="max-w-md space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Something went wrong</h1>
        <p className="text-sm text-muted-foreground">
          The page hit an unexpected error and couldn't render.
        </p>
        <p className="rounded-md bg-secondary px-3 py-2 text-left font-mono text-xs text-muted-foreground">
          {message}
        </p>
      </div>
      <div className="flex gap-3">
        <Button variant="outline" onClick={() => window.location.reload()}>
          Reload
        </Button>
        <Button asChild>
          <Link to="/">Back to home</Link>
        </Button>
      </div>
    </div>
  );
}
