import { Link } from "react-router-dom";
import { MapPin } from "lucide-react";
import type { AttractionListItem } from "../types";
import { formatPrice } from "@/lib/utils";
import { env } from "@/config/env";

function imageUrl(path: string | undefined): string | null {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  return `${env.VITE_API_URL}${path.startsWith("/") ? "" : "/"}${path}`;
}

export function AttractionCard({ item }: { item: AttractionListItem }) {
  const img = imageUrl(item.images?.[0]);
  const lowPrice = item.activity?.lowPrice;

  return (
    <Link
      to={`/attractions/details/${item._id}`}
      className="group overflow-hidden rounded-xl border bg-card transition-all hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-secondary">
        {img ? (
          <img
            src={img}
            alt={item.title ?? ""}
            loading="lazy"
            className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex size-full items-center justify-center text-muted-foreground">
            <MapPin className="size-8" />
          </div>
        )}
        {item.category?.categoryName && (
          <span className="absolute left-3 top-3 rounded-full bg-card/90 px-2.5 py-1 text-xs font-semibold backdrop-blur">
            {item.category.categoryName}
          </span>
        )}
      </div>
      <div className="space-y-1.5 p-4">
        {item.destination?.name && (
          <p className="flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="size-3" /> {item.destination.name}
          </p>
        )}
        <h3 className="line-clamp-2 font-sans text-sm font-semibold leading-snug">{item.title}</h3>
        {typeof lowPrice === "number" && (
          <p className="pt-1 text-sm">
            <span className="text-xs text-muted-foreground">from </span>
            <span className="font-bold text-primary">{formatPrice(lowPrice)}</span>
          </p>
        )}
      </div>
    </Link>
  );
}
