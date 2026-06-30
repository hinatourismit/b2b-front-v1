import { ModuleGuard } from "@/app/guards";
import { HotelSearchBox } from "../components/HotelSearchBox";
import { ShieldCheck, Sparkles, Wallet } from "lucide-react";

/** /hotel — hotel search home. Bedbank availability search. */
export default function HotelHomePage() {
  return (
    <ModuleGuard module="hotels">
      <section className="grain relative z-20 border-b bg-[linear-gradient(160deg,#163a5c,#347bb7)] py-16 text-primary-foreground">
        <div className="relative z-10 mx-auto max-w-5xl px-4 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold">Hotels</p>
          <h1 className="mt-2 text-4xl font-semibold tracking-tight">
            Net rates at thousands of hotels
          </h1>
          <p className="mt-2 text-sm text-primary-foreground/70">
            Live availability, instant confirmation and agent pricing across the globe.
          </p>

          {/* ── GLASS HERO CARD ──────────────────────────────────
             Frosted tray holding the (solid, multi-field) search panel +
             trust strip. No `overflow-hidden` — it would clip the
             destination-suggestions dropdown rendered absolutely below. */}
          <div className="glass-hero relative z-30 mx-auto mt-7 max-w-5xl rounded-[1.6rem] p-2.5 sm:p-3">
            {/* solid search panel stays legible against the frost */}
            <HotelSearchBox className="text-foreground" />

            {/* hairline divider */}
            <div className="mx-auto mt-3.5 h-px w-[92%] bg-white/15" />

            {/* trust strip */}
            <div className="mt-3 flex flex-wrap items-center justify-center gap-x-6 gap-y-1.5 text-[0.72rem] font-medium text-primary-foreground/75">
              <span className="inline-flex items-center gap-1.5">
                <span className="size-1.5 rounded-full bg-gold" /> Live availability
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="size-1.5 rounded-full bg-gold" /> Agent pricing
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="size-1.5 rounded-full bg-gold" /> Flexible payment
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-5xl gap-6 px-4 py-12 sm:grid-cols-3 sm:px-6">
        {[
          { icon: Sparkles, title: "Live availability", text: "Real-time rates and instant confirmation vouchers." },
          { icon: Wallet, title: "Agent pricing", text: "Your markup applied automatically on every rate." },
          { icon: ShieldCheck, title: "Flexible payment", text: "Pay from wallet, by card, or hold with pay-later." },
        ].map((f) => (
          <div key={f.title} className="rounded-xl border bg-card p-5">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10">
              <f.icon className="size-5 text-primary" />
            </div>
            <p className="mt-3 font-semibold">{f.title}</p>
            <p className="mt-1 text-sm text-muted-foreground">{f.text}</p>
          </div>
        ))}
      </section>
    </ModuleGuard>
  );
}
