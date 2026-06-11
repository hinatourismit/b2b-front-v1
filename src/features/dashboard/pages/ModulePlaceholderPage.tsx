import { Link } from "react-router-dom";
import { Construction } from "lucide-react";
import { ModuleGuard } from "@/app/guards";
import { MODULES, type ModuleKey } from "@/config/modules";
import { Button } from "@/components/ui/button";

/**
 * Temporary stand-in for module home pages. Each gets replaced by the real
 * page as Phases B/C land — the route path and ModuleGuard behavior are
 * already final.
 */
export default function ModulePlaceholderPage({ module }: { module: ModuleKey }) {
  const config = MODULES[module];

  return (
    <ModuleGuard module={module}>
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-5 px-4 text-center">
        <div className="flex size-16 items-center justify-center rounded-2xl bg-secondary">
          <config.icon className="size-8 text-primary" />
        </div>
        <div className="max-w-md space-y-1.5">
          <h1 className="text-2xl font-semibold tracking-tight">{config.label}</h1>
          <p className="flex items-center justify-center gap-1.5 text-sm text-muted-foreground">
            <Construction className="size-4" /> This module is being rebuilt and will be available
            here soon.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link to="/dashboard">Go to dashboard</Link>
        </Button>
      </div>
    </ModuleGuard>
  );
}
