import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { Loader2, SearchX } from "lucide-react";
import { ModuleGuard } from "@/app/guards";
import { HotelSearchBox } from "../components/HotelSearchBox";
import { HotelResultCard } from "../components/HotelResultCard";
import { hotelsApi } from "../api/hotels.api";
import type { AvailabilityResultItem, RoomOccupancy, SearchQuery } from "../types";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/utils";
import { apiErrorMessage } from "@/types/api";

const LIMIT = 10;

export default function HotelResultsPage() {
  const [searchParams] = useSearchParams();
  const [hotels, setHotels] = useState<AvailabilityResultItem[]>([]);
  const [searchId, setSearchId] = useState("");
  const [filteredCount, setFilteredCount] = useState(0);
  const [skip, setSkip] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");

  const fromDate = searchParams.get("fromDate")?.slice(0, 10) ?? "";
  const toDate = searchParams.get("toDate")?.slice(0, 10) ?? "";
  const searchString = searchParams.toString();

  const runSearch = useCallback(
    async (nextSkip: number) => {
      try {
        if (nextSkip === 0) setLoading(true);
        else setLoadingMore(true);
        setError("");

        const roomsRaw = searchParams.get("rooms");
        const sqRaw = searchParams.get("searchQuery");
        const rooms: RoomOccupancy[] = roomsRaw
          ? JSON.parse(roomsRaw)
          : [{ noOfAdults: 2, noOfChildren: 0, childrenAges: [] }];
        const searchQuery: SearchQuery | null = sqRaw ? JSON.parse(sqRaw) : null;

        const res = await hotelsApi.searchAvailability(
          { skip: nextSkip, limit: LIMIT, searchId: nextSkip === 0 ? "" : searchId },
          {
            searchQuery,
            fromDate,
            toDate,
            rooms,
            nationality: searchParams.get("nationality") ?? "",
            priceType: searchParams.get("priceType") ?? "",
          },
        );

        setSearchId(res.searchId);
        setFilteredCount(res.filteredHotelsCount ?? res.hotels?.length ?? 0);
        setHotels((prev) => (nextSkip === 0 ? (res.hotels ?? []) : [...prev, ...(res.hotels ?? [])]));
        setSkip(nextSkip);
      } catch (err) {
        setError(apiErrorMessage(err, "No availability for this search."));
        if (nextSkip === 0) setHotels([]);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [searchString],
  );

  useEffect(() => {
    runSearch(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchString]);

  const hasMore = hotels.length < filteredCount;

  return (
    <ModuleGuard module="hotels">
      <div className="border-b bg-secondary/40">
        <div className="mx-auto max-w-6xl px-4 py-4 sm:px-6">
          <HotelSearchBox />
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        <div className="mb-4 flex items-baseline justify-between gap-3">
          <h1 className="text-xl font-semibold tracking-tight">
            {loading ? "Searching…" : `${filteredCount} hotels`}
          </h1>
          {fromDate && toDate && (
            <p className="text-sm text-muted-foreground">
              {formatDate(fromDate)} – {formatDate(toDate)}
            </p>
          )}
        </div>

        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex gap-4 rounded-xl border bg-card p-4">
                <Skeleton className="aspect-[4/3] w-64 rounded-lg" />
                <div className="flex-1 space-y-2 py-2">
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-3 w-2/3" />
                  <Skeleton className="h-3 w-1/3" />
                </div>
              </div>
            ))}
          </div>
        ) : error || hotels.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-20 text-center">
            <SearchX className="size-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {error || "No hotels match this search. Try different dates or destination."}
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              {hotels.map((item, i) => (
                <HotelResultCard
                  key={`${item.hotel.hotelId ?? item.hotel._id}-${i}`}
                  item={item}
                  searchString={searchString}
                />
              ))}
            </div>
            {hasMore && (
              <div className="mt-6 flex justify-center">
                <Button variant="outline" onClick={() => runSearch(skip + LIMIT)} disabled={loadingMore}>
                  {loadingMore && <Loader2 className="size-4 animate-spin" />}
                  Load more hotels
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </ModuleGuard>
  );
}
