import { branding } from "@/config/branding";

export function FullPageLoader() {
  return (
    <div className="grain relative flex min-h-screen flex-col items-center justify-center gap-6 bg-background">
      <div className="flex size-16 items-center justify-center rounded-2xl bg-primary shadow-lg shadow-primary/20">
        <span className="font-display text-2xl font-semibold text-primary-foreground">
          {branding.shortName.charAt(0)}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <span className="size-2 animate-bounce rounded-full bg-gold [animation-delay:0ms]" />
        <span className="size-2 animate-bounce rounded-full bg-gold [animation-delay:150ms]" />
        <span className="size-2 animate-bounce rounded-full bg-gold [animation-delay:300ms]" />
      </div>
    </div>
  );
}
