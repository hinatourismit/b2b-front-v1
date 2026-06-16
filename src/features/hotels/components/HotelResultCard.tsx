import { Link } from "react-router-dom";
import { MapPin, Star } from "lucide-react";
import type { AvailabilityResultItem } from "../types";
import { env } from "@/config/env";
import { formatPrice } from "@/lib/utils";

function imageUrl(image: AvailabilityResultItem["hotel"]["image"]): string | null {
  if (!image) return null;
  if (typeof image === "string") return image.startsWith("http") ? image : `${env.VITE_API_URL}${image}`;
  if (image.path) return image.isRelative ? `${env.VITE_API_URL}${image.path}` : image.path;
  return null;
}

function text(v: unknown): string | undefined {
  if (typeof v === "string") return v;
  if (v && typeof v === "object") {
    const o = v as { countryName?: string; stateName?: string };
    return o.countryName ?? o.stateName;
  }
  return undefined;
}

export function HotelResultCard({
  item,
  searchString,
}: {
  item: AvailabilityResultItem;
  searchString: string;
}) {
  const { hotel } = item;
  const img = imageUrl(hotel.image);
  const stars = Number(hotel.starCategory) || 0;
  const id = hotel.hotelId ?? hotel._id;

  return (
    <Link
      to={`/hotel/details/${id}?${searchString}`}
      className="group flex flex-col overflow-hidden rounded-xl border bg-card transition-all hover:-translate-y-0.5 hover:shadow-md sm:flex-row"
    >
      <div className="relative aspect-[4/3] shrink-0 overflow-hidden bg-secondary sm:w-64">
        {img ? (
          <img
            src={img}
            alt={hotel.hotelName ?? ""}
            loading="lazy"
            className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex size-full items-center justify-center text-muted-foreground">
            <MapPin className="size-8" />
          </div>
        )}
      </div>

      <div className="flex flex-1 items-center justify-between gap-4 p-4">
        <div className="min-w-0">
          {stars > 0 && (
            <div className="mb-1 flex items-center gap-0.5 text-gold">
              {Array.from({ length: stars }).map((_, i) => (
                <Star key={i} className="size-3.5 fill-current" />
              ))}
            </div>
          )}
          <h3 className="font-sans text-base font-semibold leading-snug">{hotel.hotelName}</h3>
          {hotel.address && (
            <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="size-3 shrink-0" />
              <span className="line-clamp-1">{hotel.address}</span>
            </p>
          )}
          {(text(hotel.country) || text(hotel.state)) && (
            <p className="mt-0.5 text-xs text-muted-foreground">
              {[text(hotel.state), text(hotel.country)].filter(Boolean).join(", ")}
            </p>
          )}
          {hotel.accommodationType && (
            <span className="mt-2 inline-block rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium capitalize">
              {hotel.accommodationType}
            </span>
          )}
        </div>

        <div className="shrink-0 text-right">
          <p className="text-xs text-muted-foreground">from</p>
          <p className="text-xl font-bold text-primary">{formatPrice(item.minRate)}</p>
          <p className="text-[11px] text-muted-foreground">per stay</p>
          <span className="mt-2 inline-block rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground">
            View rooms
          </span>
        </div>
      </div>
    </Link>
  );
}
