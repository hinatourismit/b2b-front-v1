import { useState } from "react";
import { useParams } from "react-router-dom";
import { ModuleGuard } from "@/app/guards";
import { AttractionSearchBox } from "../components/AttractionSearchBox";
import { AttractionCard } from "../components/AttractionCard";
import { useAttractionCategories, useAttractionsList } from "../api/attractions.queries";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/**
 * /attractions/:slug — mirrors old SearchingResultPage: list by destination
 * slug with category filter chips (limit=100, same query contract).
 */
export default function AttractionListingPage() {
  const { slug = "" } = useParams();
  const [category, setCategory] = useState("");
  const { data: categories } = useAttractionCategories();
  const { data, isLoading } = useAttractionsList(slug, category);
  // Envelope verified in controller: { attractions: { totalAttractions, data } }
  const attractions = data?.attractions?.data ?? [];

  return (
    <ModuleGuard module="attractions">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <AttractionSearchBox className="mx-auto mb-8 max-w-xl" />

        <div className="mb-6 flex items-center justify-between gap-4">
          <h1 className="text-2xl font-semibold capitalize tracking-tight">
            Experiences in {slug.replaceAll("-", " ")}
          </h1>
        </div>

        {categories && categories.length > 0 && (
          <div className="mb-6 flex gap-2 overflow-x-auto pb-1">
            <button
              onClick={() => setCategory("")}
              className={cn(
                "shrink-0 rounded-full border px-4 py-1.5 text-sm font-medium transition-colors",
                category === ""
                  ? "border-primary bg-primary text-primary-foreground"
                  : "bg-card hover:bg-accent",
              )}
            >
              All
            </button>
            {categories.map((c) => (
              <button
                key={c._id}
                onClick={() => setCategory(c._id)}
                className={cn(
                  "shrink-0 rounded-full border px-4 py-1.5 text-sm font-medium capitalize transition-colors",
                  category === c._id
                    ? "border-primary bg-primary text-primary-foreground"
                    : "bg-card hover:bg-accent",
                )}
              >
                {c.categoryName}
              </button>
            ))}
          </div>
        )}

        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="space-y-3">
                <Skeleton className="aspect-[4/3] rounded-xl" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ))}
          </div>
        ) : attractions.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {attractions.map((item) => (
              <AttractionCard key={item._id} item={item} />
            ))}
          </div>
        ) : (
          <p className="py-16 text-center text-sm text-muted-foreground">
            No experiences found for this destination
            {category ? " in the selected category" : ""}.
          </p>
        )}
      </div>
    </ModuleGuard>
  );
}
