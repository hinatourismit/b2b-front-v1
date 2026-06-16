import { useEffect, useState, useCallback } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { CalendarDays, MapPin, Star, Utensils, XCircle } from "lucide-react";
import { ModuleGuard } from "@/app/guards";
import { useSingleHotel } from "../api/hotels.queries";
import { hotelsApi } from "../api/hotels.api";
import type { HotelRoom, RoomOccupancy } from "../types";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { cn, formatDate, formatPrice } from "@/lib/utils";
import { env } from "@/config/env";
import { apiErrorMessage } from "@/types/api";

function img(path: string | undefined): string | null {
  if (!path) return null;
  return path.startsWith("http") ? path : `${env.VITE_API_URL}${path.startsWith("/") ? "" : "/"}${path}`;
}

function locText(v: unknown): string | undefined {
  if (typeof v === "string") return v;
  if (v && typeof v === "object") {
    const o = v as { cityName?: string; stateName?: string; countryName?: string };
    return o.cityName ?? o.stateName ?? o.countryName;
  }
  return undefined;
}

export default function HotelDetailPage() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { data: hotel, isLoading } = useSingleHotel(id);

  const [rooms, setRooms] = useState<HotelRoom[]>([]);
  const [searchId, setSearchId] = useState("");
  const [nights, setNights] = useState(0);
  const [availLoading, setAvailLoading] = useState(true);
  const [availError, setAvailError] = useState("");

  const fromDate = searchParams.get("fromDate")?.slice(0, 10) ?? "";
  const toDate = searchParams.get("toDate")?.slice(0, 10) ?? "";

  const loadAvailability = useCallback(async () => {
    if (!id) return;
    try {
      setAvailLoading(true);
      setAvailError("");
      const roomsRaw = searchParams.get("rooms");
      const occ: RoomOccupancy[] = roomsRaw
        ? JSON.parse(roomsRaw)
        : [{ noOfAdults: 1, noOfChildren: 0, childrenAges: [] }];
      const res = await hotelsApi.singleSearch({
        fromDate,
        toDate,
        rooms: occ,
        nationality: searchParams.get("nationality") ?? "",
        hotelId: id,
        priceType: searchParams.get("priceType") ?? "all",
      });
      setRooms(res.rooms ?? []);
      setSearchId(res.searchId);
      setNights(res.noOfNights ?? 0);
    } catch (err) {
      setAvailError(apiErrorMessage(err, "No availability for these dates."));
      setRooms([]);
    } finally {
      setAvailLoading(false);
    }
  }, [id, fromDate, toDate, searchParams]);

  useEffect(() => {
    loadAvailability();
  }, [loadAvailability]);

  const book = (roomTypeId: string | undefined, rateKey: string) => {
    const p = new URLSearchParams();
    p.set("hotelId", id ?? "");
    p.set("rateKey", encodeURIComponent(rateKey));
    p.set("searchId", searchId);
    navigate(`/hotel/${id}/apply/${roomTypeId ?? "room"}?${p.toString()}`);
  };

  const stars = Number(hotel?.starCategory) || 0;

  return (
    <ModuleGuard module="hotels">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        {isLoading ? (
          <div className="space-y-6">
            <Skeleton className="h-8 w-2/3" />
            <Skeleton className="aspect-[16/7] w-full rounded-xl" />
          </div>
        ) : !hotel ? (
          <p className="py-20 text-center text-sm text-muted-foreground">
            We couldn't load this hotel.
          </p>
        ) : (
          <div className="space-y-8">
            <div>
              {stars > 0 && (
                <div className="mb-1 flex items-center gap-0.5 text-gold">
                  {Array.from({ length: stars }).map((_, i) => (
                    <Star key={i} className="size-4 fill-current" />
                  ))}
                </div>
              )}
              <h1 className="text-3xl font-semibold tracking-tight">{hotel.hotelName}</h1>
              {(hotel.address || locText(hotel.city)) && (
                <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                  <MapPin className="size-3.5" />
                  {[hotel.address, locText(hotel.city), locText(hotel.country)]
                    .filter(Boolean)
                    .join(", ")}
                </p>
              )}
            </div>

            {(hotel.images?.length ?? 0) > 0 && (
              <div className="grid gap-2 sm:grid-cols-4 sm:grid-rows-2">
                <div className="overflow-hidden rounded-xl sm:col-span-2 sm:row-span-2">
                  <img
                    src={img(hotel.images![0]) ?? undefined}
                    alt={hotel.hotelName}
                    className="h-full w-full object-cover"
                  />
                </div>
                {hotel.images!.slice(1, 5).map((image, i) => (
                  <div key={i} className="hidden overflow-hidden rounded-xl sm:block">
                    <img src={img(image) ?? undefined} alt="" className="h-full w-full object-cover" />
                  </div>
                ))}
              </div>
            )}

            {(hotel.featuredAmenities?.length ?? 0) > 0 && (
              <div className="flex flex-wrap gap-2">
                {hotel.featuredAmenities!.map((a, i) => (
                  <Badge key={i} variant="secondary" className="font-normal">
                    {a.name}
                  </Badge>
                ))}
              </div>
            )}

            {/* Availability */}
            <section id="rooms">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-xl font-semibold">Available rooms</h2>
                {fromDate && toDate && (
                  <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <CalendarDays className="size-4" />
                    {formatDate(fromDate)} – {formatDate(toDate)}
                    {nights > 0 && ` · ${nights} night${nights > 1 ? "s" : ""}`}
                  </p>
                )}
              </div>

              {availLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-28 rounded-xl" />
                  ))}
                </div>
              ) : availError || rooms.length === 0 ? (
                <div className="flex flex-col items-center gap-2 rounded-xl border bg-card py-12 text-center">
                  <XCircle className="size-8 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    {availError || "No rooms available for these dates."}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {rooms.map((room, ri) => (
                    <div key={room.roomTypeId ?? ri} className="overflow-hidden rounded-xl border bg-card">
                      <div className="flex items-center gap-3 border-b bg-secondary/40 p-4">
                        {room.roomType?.images?.[0] && (
                          <img
                            src={img(room.roomType.images[0]) ?? undefined}
                            alt=""
                            className="size-14 rounded-lg object-cover"
                          />
                        )}
                        <div>
                          <p className="font-semibold">
                            {room.roomType?.roomName ?? room.standardName ?? "Room"}
                          </p>
                          {room.roomType?.areaInM2 && (
                            <p className="text-xs text-muted-foreground">{room.roomType.areaInM2} m²</p>
                          )}
                        </div>
                      </div>
                      <div className="divide-y">
                        {room.rates.map((rate, i) => {
                          const soldOut = (rate.availableAllocation ?? 1) < 1;
                          return (
                            <div
                              key={rate.rateKey ?? i}
                              className="flex flex-wrap items-center justify-between gap-3 p-4"
                            >
                              <div className="min-w-0">
                                <p className="text-sm font-medium">{rate.rateName}</p>
                                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                  {rate.boardName && (
                                    <span className="flex items-center gap-1">
                                      <Utensils className="size-3" /> {rate.boardName}
                                    </span>
                                  )}
                                  {rate.cancellationType && (
                                    <span
                                      className={cn(
                                        "rounded px-1.5 py-0.5",
                                        /non/i.test(rate.cancellationType)
                                          ? "bg-destructive/10 text-destructive"
                                          : "bg-success/10 text-success",
                                      )}
                                    >
                                      {rate.cancellationType}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-4">
                                <div className="text-right">
                                  {rate.grossPrice && rate.grossPrice > (rate.netPrice ?? 0) && (
                                    <p className="text-xs text-muted-foreground line-through">
                                      {formatPrice(rate.grossPrice)}
                                    </p>
                                  )}
                                  <p className="text-lg font-bold text-primary">
                                    {formatPrice(rate.netPrice)}
                                  </p>
                                </div>
                                <Button
                                  size="sm"
                                  disabled={soldOut}
                                  onClick={() => book(room.roomTypeId, rate.rateKey)}
                                >
                                  {soldOut ? "Sold out" : "Book now"}
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {hotel.description && (
              <section>
                <h2 className="mb-2 text-xl font-semibold">About this hotel</h2>
                <div
                  className="prose prose-sm max-w-none text-muted-foreground [&_a]:text-primary"
                  dangerouslySetInnerHTML={{ __html: hotel.description }}
                />
              </section>
            )}

            {(hotel.checkInTime || hotel.checkOutTime) && (
              <section className="flex gap-8 text-sm">
                {hotel.checkInTime && (
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Check-in</p>
                    <p className="font-medium">{hotel.checkInTime}</p>
                  </div>
                )}
                {hotel.checkOutTime && (
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Check-out</p>
                    <p className="font-medium">{hotel.checkOutTime}</p>
                  </div>
                )}
              </section>
            )}
          </div>
        )}
      </div>
    </ModuleGuard>
  );
}
