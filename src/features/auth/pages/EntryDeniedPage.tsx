import { useNavigate } from "react-router-dom";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { branding } from "@/config/branding";
import { useAuthStore } from "../store/auth.store";

/** Shown when an agent has no configuration or all modules disabled. */
export default function EntryDeniedPage() {
  const navigate = useNavigate();
  const logout = useAuthStore((s) => s.logout);

  return (
    <div className="grain relative flex min-h-screen flex-col items-center justify-center gap-6 px-4 text-center">
      <div className="flex size-16 items-center justify-center rounded-2xl bg-destructive/10">
        <ShieldAlert className="size-8 text-destructive" />
      </div>
      <div className="max-w-md space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Access not enabled</h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Your account doesn't have any booking modules enabled yet. Please contact the{" "}
          {branding.name} team at{" "}
          <a className="font-medium text-primary hover:underline" href={`mailto:${branding.contact.email}`}>
            {branding.contact.email}
          </a>{" "}
          to activate your access.
        </p>
      </div>
      <Button
        variant="outline"
        onClick={() => {
          logout();
          navigate("/login");
        }}
      >
        Sign in with a different account
      </Button>
    </div>
  );
}
