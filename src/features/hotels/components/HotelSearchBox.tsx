import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Building2, CalendarDays, Loader2, MapPin, Minus, Plus, Search, Tag, Users } from "lucide-react";
import { useHotelSuggestions } from "../api/hotels.queries";
import type { HotelSuggestion, RoomOccupancy, SearchQuery } from "../types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

/** Rate sourcing filter — mirrors b2b-front-main HotelCard priceType (All/Static/Dynamic). */
const PRICE_TYPES = [
  { value: "all", label: "All" },
  { value: "static", label: "Static" },
  { value: "dynamic", label: "Dynamic" },
] as const;

function uaeDate(offsetDays: number): string {
  const base = new Date(
    new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Dubai" }).format(new Date()),
  );
  base.setDate(base.getDate() + offsetDays);
  return base.toISOString().slice(0, 10);
}

const SUGGESTION_LABEL: Record<string, string> = { CITY: "City", AREA: "Area", HOTEL: "Hotel" };

export function HotelSearchBox({ className }: { className?: string }) {
  const navigate = useNavigate();

  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<HotelSuggestion | null>(null);
  const [open, setOpen] = useState(false);
  const blurTimer = useRef<number>(0);
  const { data, isFetching } = useHotelSuggestions(query);

  const [fromDate, setFromDate] = useState(uaeDate(1));
  const [toDate, setToDate] = useState(uaeDate(3));
  const [rooms, setRooms] = useState<RoomOccupancy[]>([
    { noOfAdults: 2, noOfChildren: 0, childrenAges: [] },
  ]);
  const [priceType, setPriceType] = useState("all");

  const suggestions: HotelSuggestion[] = data
    ? [...data.cities, ...data.areas, ...data.hotels]
    : [];

  const pick = (s: HotelSuggestion) => {
    window.clearTimeout(blurTimer.current);
    setSelected(s);
    setQuery(
      s.suggestionType === "HOTEL"
        ? (s.hotelName ?? "")
        : (s.cityName ?? s.name ?? s.stateName ?? ""),
    );
    setOpen(false);
  };

  const totalGuests = rooms.reduce((a, r) => a + r.noOfAdults + r.noOfChildren, 0);

  const search = () => {
    // HOTEL suggestion → go straight to the detail page; otherwise results list.
    const params = new URLSearchParams();
    params.set("fromDate", new Date(fromDate).toJSON());
    params.set("toDate", new Date(toDate).toJSON());
    params.set("rooms", JSON.stringify(rooms));
    params.set("priceType", priceType);
    if (selected?.suggestionType === "HOTEL") {
      navigate(`/hotel/details/${selected.hotelId ?? selected._id}?${params.toString()}`);
      return;
    }
    if (selected) {
      const sq: SearchQuery = {
        id: selected._id,
        _id: selected._id,
        suggestionType: selected.suggestionType,
      };
      params.set("searchQuery", JSON.stringify(sq));
    }
    navigate(`/hotel/avail?${params.toString()}`);
  };

  const setRoom = (i: number, patch: Partial<RoomOccupancy>) =>
    setRooms((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));

  return (
    <div className={cn("rounded-2xl bg-card p-3 shadow-lg", className)}>
      <div className="grid gap-2 lg:grid-cols-[1.6fr_1fr_1fr_1fr_0.9fr_auto]">
        {/* Destination */}
        <div className="relative">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSelected(null);
                setOpen(true);
              }}
              onFocus={() => setOpen(true)}
              onBlur={() => {
                blurTimer.current = window.setTimeout(() => setOpen(false), 150);
              }}
              placeholder="City, area or hotel"
              className="h-12 pl-9"
            />
            {isFetching && (
              <Loader2 className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
            )}
          </div>
          {open && query.trim().length > 1 && suggestions.length > 0 && (
            <ul className="absolute z-50 mt-1.5 max-h-80 w-full overflow-auto rounded-xl border bg-popover p-1.5 shadow-lg">
              {suggestions.map((s, i) => (
                <li key={`${s._id}-${i}`}>
                  <button
                    type="button"
                    onMouseDown={() => pick(s)}
                    className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm hover:bg-accent"
                  >
                    {s.suggestionType === "HOTEL" ? (
                      <Building2 className="size-4 shrink-0 text-gold" />
                    ) : (
                      <MapPin className="size-4 shrink-0 text-primary" />
                    )}
                    <span className="min-w-0 flex-1 truncate">
                      {s.hotelName ?? s.cityName ?? s.name ?? s.stateName}
                      {s.countryName && (
                        <span className="text-muted-foreground"> · {s.countryName}</span>
                      )}
                    </span>
                    <span className="shrink-0 rounded bg-secondary px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
                      {SUGGESTION_LABEL[s.suggestionType] ?? s.suggestionType}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Check-in */}
        <div className="relative">
          <CalendarDays className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="date"
            value={fromDate}
            min={uaeDate(0)}
            onChange={(e) => {
              setFromDate(e.target.value);
              if (e.target.value >= toDate) {
                const t = new Date(e.target.value);
                t.setDate(t.getDate() + 2);
                setToDate(t.toISOString().slice(0, 10));
              }
            }}
            className="h-12 pl-9"
          />
        </div>

        {/* Check-out */}
        <div className="relative">
          <CalendarDays className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="date"
            value={toDate}
            min={fromDate}
            onChange={(e) => setToDate(e.target.value)}
            className="h-12 pl-9"
          />
        </div>

        {/* Rooms & guests */}
        <Popover>
          <PopoverTrigger asChild>
            <button className="flex h-12 items-center gap-2 rounded-md border bg-card px-3 text-sm">
              <Users className="size-4 text-muted-foreground" />
              <span className="truncate">
                {rooms.length} room{rooms.length > 1 ? "s" : ""} · {totalGuests} guest
                {totalGuests > 1 ? "s" : ""}
              </span>
            </button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-80 space-y-4">
            {rooms.map((room, i) => (
              <div key={i} className="space-y-2 border-b pb-3 last:border-0 last:pb-0">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold">Room {i + 1}</p>
                  {rooms.length > 1 && (
                    <button
                      type="button"
                      className="text-xs text-destructive hover:underline"
                      onClick={() => setRooms((prev) => prev.filter((_, idx) => idx !== i))}
                    >
                      Remove
                    </button>
                  )}
                </div>
                <PaxRow
                  label="Adults"
                  value={room.noOfAdults}
                  min={1}
                  onChange={(v) => setRoom(i, { noOfAdults: v })}
                />
                <PaxRow
                  label="Children"
                  value={room.noOfChildren}
                  min={0}
                  onChange={(v) =>
                    setRoom(i, {
                      noOfChildren: v,
                      childrenAges: Array.from({ length: v }, (_, k) => room.childrenAges[k] ?? 7),
                    })
                  }
                />
                {room.noOfChildren > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {room.childrenAges.map((age, k) => (
                      <input
                        key={k}
                        type="number"
                        min={0}
                        max={17}
                        value={age}
                        onChange={(e) => {
                          const ages = [...room.childrenAges];
                          ages[k] = Number(e.target.value);
                          setRoom(i, { childrenAges: ages });
                        }}
                        className="h-8 w-16 rounded-md border bg-card px-2 text-center text-sm"
                        aria-label={`Child ${k + 1} age`}
                      />
                    ))}
                  </div>
                )}
              </div>
            ))}
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() =>
                setRooms((prev) => [...prev, { noOfAdults: 2, noOfChildren: 0, childrenAges: [] }])
              }
            >
              <Plus className="size-4" /> Add room
            </Button>
          </PopoverContent>
        </Popover>

        {/* Rate type — All / Static / Dynamic */}
        <Select value={priceType} onValueChange={setPriceType}>
          <SelectTrigger className="!h-12 w-full" aria-label="Rate type">
            <Tag className="size-4 shrink-0 text-muted-foreground" />
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            {PRICE_TYPES.map((t) => (
              <SelectItem key={t.value} value={t.value}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button className="h-12 px-6" onClick={search}>
          <Search className="size-4" /> Search
        </Button>
      </div>
    </div>
  );
}

function PaxRow({
  label,
  value,
  min,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onChange(Math.max(min, value - 1))}
          className="flex size-7 items-center justify-center rounded-full border hover:bg-accent"
        >
          <Minus className="size-3.5" />
        </button>
        <span className="w-6 text-center text-sm font-semibold tabular-nums">{value}</span>
        <button
          type="button"
          onClick={() => onChange(value + 1)}
          className="flex size-7 items-center justify-center rounded-full border hover:bg-accent"
        >
          <Plus className="size-3.5" />
        </button>
      </div>
    </div>
  );
}
