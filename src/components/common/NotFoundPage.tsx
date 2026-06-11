import { Link } from "react-router-dom";
import { Compass } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFoundPage() {
  return (
    <div className="grain relative flex min-h-[70vh] flex-col items-center justify-center gap-6 px-4 text-center">
      <div className="flex size-16 items-center justify-center rounded-2xl bg-secondary">
        <Compass className="size-8 text-primary" />
      </div>
      <div className="max-w-md space-y-2">
        <p className="font-display text-6xl font-semibold text-primary/20">404</p>
        <h1 className="text-2xl font-semibold tracking-tight">This page wandered off</h1>
        <p className="text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has moved.
        </p>
      </div>
      <Button asChild>
        <Link to="/">Back to home</Link>
      </Button>
    </div>
  );
}
