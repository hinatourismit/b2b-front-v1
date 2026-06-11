import type { ReactNode } from "react";
import { branding } from "@/config/branding";

/**
 * Split-screen auth shell: form on the left, brand panel on the right.
 * The panel is pure CSS (layered gradients + grain) — no image dependencies.
 */
export function AuthLayout({ children, panel }: { children: ReactNode; panel?: ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[1fr_44%]">
      <div className="grain relative flex items-center justify-center px-4 py-10 sm:px-8">
        <div className="w-full max-w-md">
          <div className="mb-8 flex items-center gap-2.5">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary shadow-md shadow-primary/20">
              <span className="font-display text-xl font-semibold text-primary-foreground">
                {branding.shortName.charAt(0)}
              </span>
            </div>
            <div className="leading-tight">
              <span className="font-display text-xl font-semibold tracking-tight">
                {branding.name}
              </span>
              <span className="block text-[10px] font-semibold uppercase tracking-[0.18em] text-gold">
                B2B Portal
              </span>
            </div>
          </div>
          {children}
        </div>
      </div>

      <div className="relative hidden overflow-hidden lg:block">
        <div className="absolute inset-0 bg-[linear-gradient(160deg,oklch(0.32_0.06_196)_0%,oklch(0.42_0.075_192)_55%,oklch(0.5_0.08_175)_100%)]" />
        <div className="absolute -right-24 -top-24 size-96 rounded-full bg-gold/20 blur-3xl" />
        <div className="absolute -bottom-32 -left-16 size-[28rem] rounded-full bg-[oklch(0.6_0.1_200)]/30 blur-3xl" />
        <div className="grain absolute inset-0" />
        <div className="relative flex h-full flex-col justify-between p-12 text-primary-foreground">
          <div />
          {panel ?? (
            <div className="space-y-4">
              <p className="font-display text-4xl font-medium leading-tight">
                {branding.tagline}
              </p>
              <p className="max-w-sm text-primary-foreground/70">
                Hotels, attractions, visas and more — one portal for your agency, with instant
                confirmations and agent-level pricing control.
              </p>
            </div>
          )}
          <p className="text-xs uppercase tracking-[0.2em] text-primary-foreground/50">
            {branding.address.city}, {branding.address.country}
          </p>
        </div>
      </div>
    </div>
  );
}
