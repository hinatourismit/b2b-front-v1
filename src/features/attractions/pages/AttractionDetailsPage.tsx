import { useParams } from "react-router-dom";
import { MapPin } from "lucide-react";
import { ModuleGuard } from "@/app/guards";
import { useAttractionDetails } from "../api/attractions.queries";
import { ActivityConfigurator } from "../components/ActivityConfigurator";
import { Skeleton } from "@/components/ui/skeleton";
import { env } from "@/config/env";

function img(path: string | undefined): string | null {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  return `${env.VITE_API_URL}${path.startsWith("/") ? "" : "/"}${path}`;
}

export default function AttractionDetailsPage() {
  const { id } = useParams();
  const { data, isLoading, isError } = useAttractionDetails(id);
  const attraction = data?.attraction;

  return (
    <ModuleGuard module="attractions">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        {isLoading ? (
          <div className="space-y-6">
            <Skeleton className="h-8 w-2/3" />
            <div className="grid gap-3 md:grid-cols-3">
              <Skeleton className="aspect-[4/3] rounded-xl md:col-span-2" />
              <div className="hidden flex-col gap-3 md:flex">
                <Skeleton className="flex-1 rounded-xl" />
                <Skeleton className="flex-1 rounded-xl" />
              </div>
            </div>
            <Skeleton className="h-40 rounded-xl" />
          </div>
        ) : isError || !attraction ? (
          <p className="py-20 text-center text-sm text-muted-foreground">
            We couldn't load this attraction. Please try again.
          </p>
        ) : (
          <div className="space-y-8">
            <div>
              {attraction.destination?.name && (
                <p className="flex items-center gap-1 text-sm text-muted-foreground">
                  <MapPin className="size-3.5" /> {attraction.destination.name}
                </p>
              )}
              <h1 className="mt-1 text-3xl font-semibold tracking-tight">{attraction.title}</h1>
            </div>

            {(attraction.images?.length ?? 0) > 0 && (
              <div className="grid gap-3 md:grid-cols-3">
                <div className="overflow-hidden rounded-xl md:col-span-2">
                  <img
                    src={img(attraction.images![0]) ?? undefined}
                    alt={attraction.title}
                    className="aspect-[4/3] w-full object-cover"
                  />
                </div>
                <div className="hidden flex-col gap-3 md:flex">
                  {attraction.images!.slice(1, 3).map((image, i) => (
                    <div key={i} className="flex-1 overflow-hidden rounded-xl">
                      <img
                        src={img(image) ?? undefined}
                        alt=""
                        className="size-full object-cover"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            <section>
              <h2 className="mb-3 text-xl font-semibold">Available options</h2>
              <div className="space-y-4">
                {(attraction.activities ?? []).map((activity) => (
                  <ActivityConfigurator
                    key={activity._id}
                    activity={activity}
                    attraction={attraction}
                  />
                ))}
                {(attraction.activities?.length ?? 0) === 0 && (
                  <p className="text-sm text-muted-foreground">
                    No bookable options for this attraction right now.
                  </p>
                )}
              </div>
            </section>

            {/* old app renders `highlights` (DetailsCard.jsx); description as fallback */}
            {(attraction.highlights ?? attraction.description) && (
              <section>
                <h2 className="mb-2 text-xl font-semibold">About</h2>
                <div
                  className="prose prose-sm max-w-none text-muted-foreground [&_a]:text-primary"
                  dangerouslySetInnerHTML={{
                    __html: (attraction.highlights ?? attraction.description)!,
                  }}
                />
              </section>
            )}

            {(attraction.faqs?.length ?? 0) > 0 && (
              <section>
                <h2 className="mb-3 text-xl font-semibold">FAQs</h2>
                <div className="space-y-3">
                  {attraction.faqs!.map((f, i) => (
                    <details key={i} className="rounded-lg border bg-card p-4">
                      <summary className="cursor-pointer text-sm font-semibold">
                        {f.question}
                      </summary>
                      <div
                        className="mt-2 text-sm text-muted-foreground"
                        dangerouslySetInnerHTML={{ __html: f.answer ?? "" }}
                      />
                    </details>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </ModuleGuard>
  );
}
