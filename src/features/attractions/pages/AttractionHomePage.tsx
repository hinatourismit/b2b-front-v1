import { Link } from "react-router-dom";
import { MapPin, ArrowUpRight, Sparkles, Ticket, TentTree, Building2 } from "lucide-react";
import { ModuleGuard } from "@/app/guards";
import { AttractionSearchBox } from "../components/AttractionSearchBox";
import { PopularAttractions } from "../components/PopularAttractions";
import { HeroSkyline } from "@/components/common/HeroSkyline";
import { HeroSkydiver } from "@/components/common/HeroSkydiver";
import { HeroCityBus } from "@/components/common/HeroCityBus";
import { PromoFlash } from "@/components/common/PromoFlash";
import { useInitialData } from "@/features/home/api/home.queries";
import { Skeleton } from "@/components/ui/skeleton";
import { env } from "@/config/env";

interface Destination {
  _id: string;
  name?: string;
  slug?: string;
  image?: string;
  [key: string]: unknown;
}

function destinationImage(d: Destination): string | null {
  if (!d.image) return null;
  if (String(d.image).startsWith("http")) return String(d.image);
  return `${env.VITE_API_URL}${String(d.image).startsWith("/") ? "" : "/"}${d.image}`;
}

const CATEGORIES = [
  { label: "Theme parks", icon: Sparkles },
  { label: "Desert safari", icon: TentTree },
  { label: "City tours", icon: Building2 },
  { label: "Skip-the-line", icon: Ticket },
];

/**
 * Mirrors old AttractionPage: search-first hero + top destinations (from
 * /b2b/home/initial-data). Modernised: atmospheric hero, floating search,
 * editorial destination layout — same data + navigation contract.
 */
export default function AttractionHomePage() {
  const { data, isLoading } = useInitialData();
  const destinations = ((data?.destinations ?? []) as Destination[]).filter((d) => d.name);
  const [feature, ...rest] = destinations;

  return (
    <ModuleGuard module="attractions">
      <div className="bg-background">
        {/* ── HERO ─────────────────────────────────────────────── */}
        {/* no overflow-hidden on the section itself — it would clip the search dropdown */}
        <section className="relative isolate z-20 border-b border-border/60 px-4 pb-12 pt-16 text-primary-foreground sm:pt-20">
          {/* decorative background, clipped to the hero (search dropdown stays above) */}
          <div className="absolute inset-0 -z-10 overflow-hidden">
            <div className="absolute inset-0 bg-[linear-gradient(152deg,#0e3050_0%,#1d4a73_46%,#347bb7_100%)]" />
            {/* warm gold aura, top-right (slow ambient drift) */}
            <div className="hero-aura-gold absolute -right-24 -top-24 size-[34rem] rounded-full bg-[radial-gradient(circle,rgba(216,178,96,0.42),transparent_62%)] blur-[2px]" />
            {/* faint deep glow, bottom-left, for depth (counter-drift) */}
            <div className="hero-aura-deep absolute -bottom-40 -left-24 size-[40rem] rounded-full bg-[radial-gradient(circle,rgba(10,28,46,0.6),transparent_60%)]" />
            {/* hairline coordinate grid */}
            <div className="absolute inset-0 opacity-[0.07] [background-image:linear-gradient(to_right,#fff_1px,transparent_1px),linear-gradient(to_bottom,#fff_1px,transparent_1px)] [background-size:64px_64px]" />
            <div className="grain absolute inset-0" />

            {/* ── travel motif: drifting clouds + twinkling stars ── */}
            <svg
              viewBox="0 0 1440 600"
              preserveAspectRatio="xMidYMid slice"
              className="absolute inset-0 size-full"
              aria-hidden="true"
            >
              {/* drifting clouds */}
              <g fill="#ffffff">
                <ellipse className="hero-cloud" cx="330" cy="120" rx="130" ry="22" opacity="0.05" style={{ animationDelay: "-5s" }} />
                <ellipse className="hero-cloud" cx="1090" cy="80" rx="160" ry="26" opacity="0.045" style={{ animationDelay: "-13s" }} />
                <ellipse className="hero-cloud" cx="760" cy="300" rx="105" ry="18" opacity="0.035" style={{ animationDelay: "-9s" }} />
              </g>

              {/* twinkling stars */}
              <g fill="#e6c478">
                <circle className="hero-star" cx="250" cy="90" r="2" style={{ animationDelay: "-0.4s" }} />
                <circle className="hero-star" cx="520" cy="150" r="1.6" style={{ animationDelay: "-1.7s" }} />
                <circle className="hero-star" cx="980" cy="120" r="2.2" style={{ animationDelay: "-2.6s" }} />
                <circle className="hero-star" cx="1180" cy="220" r="1.6" style={{ animationDelay: "-0.9s" }} />
                <circle className="hero-star" cx="700" cy="80" r="1.8" style={{ animationDelay: "-3.1s" }} />
              </g>
            </svg>

            {/* skydive sequence: jump plane + jumper (freefall → canopy) */}
            <HeroSkydiver />

            {/* Dubai / Abu Dhabi landmark skyline, anchored to the hero base */}
            <HeroSkyline />

            {/* city tour bus rolling along, after the skydive (shared cycle) */}
            <HeroCityBus />

            {/* oversized watermark glyph (gentle float) */}
            <span className="hero-glyph pointer-events-none absolute -right-6 bottom-2 select-none font-display text-[14rem] leading-none text-white/[0.05] sm:text-[20rem]">
              ✦
            </span>
          </div>

          <div className="mx-auto max-w-3xl text-center">
            <p className="animate-in fade-in slide-in-from-bottom-2 inline-flex items-center gap-2 text-[0.7rem] font-semibold uppercase tracking-[0.28em] text-gold">
              <span className="h-px w-6 bg-gold/60" />
              Attractions &amp; Experiences
              <span className="h-px w-6 bg-gold/60" />
            </p>

            <h1
              className="animate-in fade-in slide-in-from-bottom-3 mt-5 font-display text-[2.6rem] font-medium leading-[1.05] tracking-tight sm:text-6xl"
              style={{ animationDelay: "80ms" }}
            >
              What will your clients
              <br className="hidden sm:block" />{" "}
              <span className="italic text-gold">experience</span> next?
            </h1>

            <p
              className="animate-in fade-in slide-in-from-bottom-3 mx-auto mt-4 max-w-xl text-sm text-primary-foreground/70 sm:text-base"
              style={{ animationDelay: "150ms" }}
            >
              Theme parks, desert safaris, city tours and skip-the-line tickets —
              booked instantly at agent net rates.
            </p>

            {/* ── GLASS HERO CARD ──────────────────────────────────
               One frosted panel holding the search + quick-tags + trust
               strip. No `overflow-hidden` here — it would clip the search
               suggestions dropdown (which renders absolutely below). */}
            <div
              className="glass-hero animate-in fade-in zoom-in-95 relative z-30 mx-auto mt-9 max-w-2xl rounded-[1.6rem] p-3 sm:p-4"
              style={{ animationDelay: "220ms" }}
            >
              {/* solid input keeps the search legible against the frost */}
              <AttractionSearchBox className="text-foreground" />

              {/* category quick-tags (frosted pills) */}
              <div className="mt-3.5 flex flex-wrap items-center justify-center gap-2">
                {CATEGORIES.map(({ label, icon: Icon }) => (
                  <span
                    key={label}
                    className="glass-chip inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-primary-foreground/90 transition-colors hover:text-primary-foreground"
                  >
                    <Icon className="size-3.5 text-gold" />
                    {label}
                  </span>
                ))}
              </div>

              {/* hairline divider */}
              <div className="mx-auto mt-4 h-px w-[92%] bg-white/15" />

              {/* trust strip */}
              <div className="mt-3.5 flex flex-wrap items-center justify-center gap-x-6 gap-y-1.5 text-[0.72rem] font-medium text-primary-foreground/75">
                <span className="inline-flex items-center gap-1.5">
                  <span className="size-1.5 rounded-full bg-gold" /> Agent net rates
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="size-1.5 rounded-full bg-gold" /> Instant e-vouchers
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="size-1.5 rounded-full bg-gold" /> Curated experiences
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* ── POPULAR ATTRACTIONS (Dubai & Abu Dhabi) ──────────── */}
        <PopularAttractions destinations={destinations} />

        {/* ── TOP DESTINATIONS ─────────────────────────────────── */}
        <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16">
          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              <p className="text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-gold">
                Where to next
              </p>
              <h2 className="mt-1 font-display text-3xl font-medium tracking-tight text-foreground sm:text-4xl">
                Top destinations
              </h2>
            </div>
            <span className="hidden h-px flex-1 bg-border sm:block" />
          </div>

          {isLoading ? (
            <div className="grid auto-rows-[180px] grid-cols-2 gap-4 md:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton
                  key={i}
                  className={i === 0 ? "col-span-2 row-span-2 rounded-2xl" : "rounded-2xl"}
                />
              ))}
            </div>
          ) : destinations.length === 0 ? (
            <div className="rounded-2xl border border-dashed py-16 text-center text-sm text-muted-foreground">
              No destinations available yet.
            </div>
          ) : (
            <div className="grid auto-rows-[180px] grid-cols-2 gap-4 md:grid-cols-4">
              {feature && <DestinationTile d={feature} featured index={0} />}
              {rest.map((d, i) => (
                <DestinationTile key={d._id} d={d} index={i + 1} />
              ))}
            </div>
          )}
        </section>

        {/* floating flash-promo popup */}
        <PromoFlash />
      </div>
    </ModuleGuard>
  );
}

function DestinationTile({
  d,
  index,
  featured = false,
}: {
  d: Destination;
  index: number;
  featured?: boolean;
}) {
  const img = destinationImage(d);
  return (
    <Link
      // Old app navigates with the destination NAME (spaces and all) — the
      // backend matches findOne({ name }) exactly.
      to={`/attractions/${encodeURIComponent(d.name!)}`}
      className={`group animate-in fade-in slide-in-from-bottom-3 relative overflow-hidden rounded-2xl border border-border/70 bg-secondary ring-gold/0 transition-all duration-300 hover:-translate-y-0.5 hover:border-gold/40 hover:shadow-[0_20px_44px_-22px_rgba(52,123,183,0.7)] hover:ring-2 ${
        featured ? "col-span-2 row-span-2" : ""
      }`}
      style={{ animationDelay: `${Math.min(index * 60, 480)}ms` }}
    >
      {img ? (
        <img
          src={img}
          alt={d.name}
          loading="lazy"
          className="size-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.07]"
        />
      ) : (
        <div className="flex size-full items-center justify-center bg-[linear-gradient(150deg,#1d4a73,#347bb7)] text-white/70">
          <MapPin className={featured ? "size-12" : "size-7"} />
        </div>
      )}

      {/* readability gradient */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />

      {/* hover arrow chip */}
      <div className="absolute right-3 top-3 translate-y-1 rounded-full bg-card/90 p-1.5 text-foreground opacity-0 shadow-sm backdrop-blur transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
        <ArrowUpRight className="size-4" />
      </div>

      <div className="absolute inset-x-0 bottom-0 p-3.5 sm:p-4">
        <p
          className={`font-display font-medium capitalize text-white drop-shadow-sm ${
            featured ? "text-2xl sm:text-3xl" : "text-lg"
          }`}
        >
          {d.name}
        </p>
        <p className="mt-0.5 flex items-center gap-1 text-[0.72rem] font-medium text-gold opacity-0 transition-opacity duration-300 group-hover:opacity-100">
          Explore experiences <ArrowUpRight className="size-3" />
        </p>
      </div>
    </Link>
  );
}
