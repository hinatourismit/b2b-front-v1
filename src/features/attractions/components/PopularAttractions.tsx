import { useMemo } from "react";
import { AttractionCard } from "./AttractionCard";
import { useAttractionsList } from "../api/attractions.queries";
import { Skeleton } from "@/components/ui/skeleton";
import type { AttractionListItem } from "../types";

interface Dest {
  _id: string;
  name?: string;
}

/** Resolve the real stored destination name (e.g. "Dubai - UAE") from the
 *  loaded list, so the list query uses the exact contract value rather than a
 *  guessed literal. Falls back to the plain name if not present. */
function resolveName(destinations: Dest[], re: RegExp, fallback: string): string {
  return destinations.find((d) => d.name && re.test(d.name))?.name ?? fallback;
}

/**
 * "Popular in Dubai & Abu Dhabi" — real attractions pulled from the existing
 * list endpoint (GET .../attraction/all?destination=) for the two cities and
 * interleaved. No new contract: same query the listing page uses, same
 * AttractionCard, same /attractions/details/:id navigation. Self-hides if the
 * connected DB has no attractions for either city.
 */
export function PopularAttractions({ destinations }: { destinations: Dest[] }) {
  const ready = destinations.length > 0;
  const dubai = useMemo(() => resolveName(destinations, /dubai/i, "Dubai"), [destinations]);
  const abuDhabi = useMemo(
    () => resolveName(destinations, /abu\s*dhabi/i, "Abu Dhabi"),
    [destinations],
  );

  const dubaiQ = useAttractionsList(dubai, "", { enabled: ready });
  const abuQ = useAttractionsList(abuDhabi, "", { enabled: ready });
  const isLoading = !ready || dubaiQ.isLoading || abuQ.isLoading;

  const items = useMemo<AttractionListItem[]>(() => {
    const d = dubaiQ.data?.attractions?.data ?? [];
    const a = abuQ.data?.attractions?.data ?? [];
    // interleave so both cities are represented; cap at 8
    const out: AttractionListItem[] = [];
    for (let i = 0; i < Math.max(d.length, a.length) && out.length < 8; i++) {
      if (d[i]) out.push(d[i]);
      if (a[i] && out.length < 8) out.push(a[i]);
    }
    return out;
  }, [dubaiQ.data, abuQ.data]);

  // Nothing for these cities in the connected DB — don't render an empty block.
  if (!isLoading && items.length === 0) return null;

  return (
    <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-gold">
            Crowd favourites
          </p>
          <h2 className="mt-1 font-display text-3xl font-medium tracking-tight text-foreground sm:text-4xl">
            Popular in Dubai &amp; Abu Dhabi
          </h2>
        </div>
        <span className="hidden h-px flex-1 bg-border sm:block" />
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="aspect-[4/3] rounded-xl" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/3" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {items.map((item, i) => (
            <div
              key={item._id}
              className="animate-in fade-in slide-in-from-bottom-3"
              style={{ animationDelay: `${Math.min(i * 60, 420)}ms` }}
            >
              <AttractionCard item={item} />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
