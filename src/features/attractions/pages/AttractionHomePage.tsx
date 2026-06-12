import { Link } from "react-router-dom";
import { MapPin } from "lucide-react";
import { ModuleGuard } from "@/app/guards";
import { AttractionSearchBox } from "../components/AttractionSearchBox";
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

/**
 * Mirrors old AttractionPage: search-first hero + top destinations (from
 * /b2b/home/initial-data, same source as the old TopDestination page).
 */
export default function AttractionHomePage() {
  const { data, isLoading } = useInitialData();
  const destinations = ((data?.destinations ?? []) as Destination[]).filter((d) => d.name);

  return (
    <ModuleGuard module="attractions">
      <div>
        {/* no overflow-hidden here — it would clip the search dropdown */}
        <section className="grain relative z-20 border-b bg-[linear-gradient(160deg,#1d4a73,#347bb7)] py-16 text-primary-foreground">
          <div className="relative z-10 mx-auto max-w-3xl px-4 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold">
              Attractions & Experiences
            </p>
            <h1 className="mt-2 text-4xl font-semibold tracking-tight">
              What will your clients experience next?
            </h1>
            <p className="mt-2 text-sm text-primary-foreground/70">
              Theme parks, desert safaris, city tours and skip-the-line tickets — at agent rates.
            </p>
            <AttractionSearchBox className="mx-auto mt-7 max-w-xl text-foreground" />
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
          <h2 className="mb-4 text-2xl font-semibold">Top destinations</h2>
          {isLoading ? (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="aspect-[5/4] rounded-xl" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              {destinations.map((d) => {
                const img = destinationImage(d);
                return (
                  <Link
                    key={d._id}
                    // Old app navigates with the destination NAME (spaces and
                    // all) — the backend matches findOne({ name }) exactly.
                    to={`/attractions/${encodeURIComponent(d.name!)}`}
                    className="group relative aspect-[5/4] overflow-hidden rounded-xl border bg-secondary"
                  >
                    {img ? (
                      <img
                        src={img}
                        alt={d.name}
                        loading="lazy"
                        className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex size-full items-center justify-center text-muted-foreground">
                        <MapPin className="size-8" />
                      </div>
                    )}
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-3">
                      <p className="font-display text-lg font-medium capitalize text-white">
                        {d.name}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </ModuleGuard>
  );
}
