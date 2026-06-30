import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, X, Zap } from "lucide-react";
import { useHomeBanners } from "@/features/home/api/home.queries";
import type { HomeBanner } from "@/features/home/api/home.api";
import { env } from "@/config/env";

interface PromoItem {
  id: string;
  badge: string;
  title: string;
  text?: string;
  image?: string;
  cta?: string;
  href?: string;
}

/**
 * Fallback offers shown only when the admin hasn't configured any home banners
 * (model `B2BBanner`, doc `name:"home"`). Marketing copy only — no
 * promo-code/redemption contract. Links use the existing navigation contract.
 */
const FALLBACK_PROMOS: PromoItem[] = [
  {
    id: "dubai-parks",
    badge: "Flash sale",
    title: "15% off Dubai theme parks",
    text: "Agent net rates on IMG, Motiongate & more — this week only.",
    cta: "Explore Dubai",
    href: "/attractions/Dubai",
  },
  {
    id: "auh-live",
    badge: "Just launched",
    title: "Abu Dhabi experiences are live",
    text: "Ferrari World, Louvre & Grand Mosque tours now bookable.",
    cta: "Browse Abu Dhabi",
    href: "/attractions/Abu%20Dhabi",
  },
  {
    id: "wallet",
    badge: "Wallet bonus",
    title: "Top up & earn 2% credit",
    text: "Add AED 10,000 to your wallet and get AED 200 bonus credit.",
    cta: "Go to wallet",
    href: "/wallet",
  },
];

const ROTATE_MS = 6000;

function imageUrl(path?: string): string | undefined {
  if (!path) return undefined;
  if (path.startsWith("http")) return path;
  return `${env.VITE_API_URL}${path.startsWith("/") ? "" : "/"}${path}`;
}

/** Map an admin home banner → the promo card shape. */
function toPromo(b: HomeBanner, i: number): PromoItem {
  return {
    id: b._id ?? `banner-${i}`,
    badge: "Offer",
    title: b.title ?? "",
    text: b.body,
    image: imageUrl(b.image),
    cta: b.isButton ? b.buttonText : undefined,
    href: b.isButton ? b.buttonUrl : undefined,
  };
}

/**
 * Floating, dismissible flash-promo popup. Content is driven by the
 * admin-managed home banners (dynamic, backend-controlled); the curated
 * fallback list shows only when none are configured.
 */
export function PromoFlash() {
  const { data: banners } = useHomeBanners();
  const [visible, setVisible] = useState(false);
  const [index, setIndex] = useState(0);
  const reduceMotion = useMemo(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    [],
  );

  const promos = useMemo<PromoItem[]>(() => {
    const live = (banners ?? [])
      .map(toPromo)
      .filter((p) => p.title || p.text); // skip blank banners
    return live.length > 0 ? live : FALLBACK_PROMOS;
  }, [banners]);

  // appear shortly after the home page loads (every visit / reload)
  useEffect(() => {
    const t = window.setTimeout(() => setVisible(true), 1500);
    return () => window.clearTimeout(t);
  }, []);

  // auto-rotate
  useEffect(() => {
    if (!visible || reduceMotion || promos.length < 2) return;
    const t = window.setInterval(() => setIndex((i) => (i + 1) % promos.length), ROTATE_MS);
    return () => window.clearInterval(t);
  }, [visible, reduceMotion, promos.length]);

  if (!visible || promos.length === 0) return null;
  const promo = promos[Math.min(index, promos.length - 1)];

  // hide for the current view only — returns on the next home visit / reload
  const dismiss = () => setVisible(false);

  const isExternal = !!promo.href && /^https?:\/\//.test(promo.href);

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 fixed bottom-4 right-4 z-50 w-[calc(100%-2rem)] max-w-sm sm:bottom-6 sm:right-6">
      <div className="relative overflow-hidden rounded-2xl border border-gold/30 bg-card text-card-foreground shadow-[0_24px_60px_-20px_rgba(8,24,40,0.5)] ring-1 ring-black/5">
        {/* gold sheen accent */}
        <div className="absolute inset-x-0 top-0 z-10 h-1 bg-[linear-gradient(90deg,var(--gold),transparent)]" />

        <button
          onClick={dismiss}
          aria-label="Dismiss promotions"
          className="absolute right-2.5 top-2.5 z-10 rounded-full bg-card/70 p-1 text-muted-foreground backdrop-blur transition-colors hover:bg-secondary hover:text-foreground"
        >
          <X className="size-4" />
        </button>

        {/* key forces the slide-in to replay on each rotation */}
        <div key={promo.id} className="animate-in fade-in slide-in-from-right-3">
          {promo.image && (
            <div className="aspect-[16/7] w-full overflow-hidden bg-secondary">
              <img src={promo.image} alt="" loading="lazy" className="size-full object-cover" />
            </div>
          )}
          <div className="p-4 pr-9">
            <span className="inline-flex items-center gap-1 rounded-full bg-gold/15 px-2.5 py-1 text-[0.68rem] font-bold uppercase tracking-wide text-gold-foreground">
              <Zap className="size-3.5 fill-gold text-gold" /> {promo.badge}
            </span>
            <h3 className="mt-2.5 font-display text-lg font-medium leading-snug">{promo.title}</h3>
            {promo.text && <p className="mt-1 text-sm text-muted-foreground">{promo.text}</p>}
            {promo.cta && promo.href && (
              isExternal ? (
                <a
                  href={promo.href}
                  target="_blank"
                  rel="noreferrer"
                  onClick={dismiss}
                  className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  {promo.cta} <ArrowRight className="size-4" />
                </a>
              ) : (
                <Link
                  to={promo.href}
                  onClick={dismiss}
                  className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  {promo.cta} <ArrowRight className="size-4" />
                </Link>
              )
            )}
          </div>
        </div>

        {/* progress dots (only when more than one) */}
        {promos.length > 1 && (
          <div className="flex items-center gap-1.5 px-4 pb-3">
            {promos.map((p, i) => (
              <button
                key={p.id}
                aria-label={`Show promotion ${i + 1}`}
                onClick={() => setIndex(i)}
                className={`h-1.5 rounded-full transition-all ${
                  i === index ? "w-5 bg-gold" : "w-1.5 bg-border hover:bg-gold/50"
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
