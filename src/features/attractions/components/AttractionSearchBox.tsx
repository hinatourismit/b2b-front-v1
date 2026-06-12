import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, MapPin, Search, Ticket } from "lucide-react";
import { useAttractionSearch } from "../api/attractions.queries";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/**
 * Search box backed by GET .../search/list?search=. Response is grouped —
 * { destinations: [{name}], attractions: [{_id, title}] } — and rendered as
 * two sections like the old AttractionCard dropdown. Navigation values are
 * old-app contract: destinations by NAME, attractions by _id.
 */
export function AttractionSearchBox({ className }: { className?: string }) {
  const navigate = useNavigate();
  const [value, setValue] = useState("");
  const [open, setOpen] = useState(false);
  const blurTimer = useRef<number>(0);
  const { data, isFetching } = useAttractionSearch(value);

  const destinations = data?.destinations ?? [];
  const attractions = data?.attractions ?? [];
  const hasResults = destinations.length > 0 || attractions.length > 0;

  const pick = (fn: () => void) => {
    window.clearTimeout(blurTimer.current);
    setOpen(false);
    fn();
  };

  return (
    <div className={cn("relative", className)}>
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => {
            blurTimer.current = window.setTimeout(() => setOpen(false), 150);
          }}
          placeholder="Search attractions, tours & destinations…"
          className="h-12 rounded-full bg-card pl-10 pr-10 shadow-sm"
        />
        {isFetching && (
          <Loader2 className="absolute right-3.5 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
        )}
      </div>

      {open && value.trim().length > 1 && hasResults && (
        <div className="absolute z-50 mt-2 max-h-80 w-full overflow-auto rounded-xl border bg-popover p-1.5 text-left shadow-lg">
          {destinations.length > 0 && (
            <>
              <p className="flex items-center gap-1.5 rounded-md bg-secondary/70 px-3 py-1.5 text-xs font-semibold text-muted-foreground">
                <MapPin className="size-3.5" /> Destinations
              </p>
              {destinations.map((d) => (
                <button
                  key={d._id}
                  type="button"
                  onMouseDown={() =>
                    pick(() => navigate(`/attractions/${encodeURIComponent(d.name ?? "")}`))
                  }
                  className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm capitalize hover:bg-accent"
                >
                  <MapPin className="size-4 shrink-0 text-primary" />
                  <span className="truncate">{d.name}</span>
                </button>
              ))}
            </>
          )}

          {attractions.length > 0 && (
            <>
              <p className="mt-1 flex items-center gap-1.5 rounded-md bg-secondary/70 px-3 py-1.5 text-xs font-semibold text-muted-foreground">
                <Ticket className="size-3.5" /> Attractions
              </p>
              {attractions.map((a) => (
                <button
                  key={a._id}
                  type="button"
                  onMouseDown={() => pick(() => navigate(`/attractions/details/${a._id}`))}
                  className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm capitalize hover:bg-accent"
                >
                  <Ticket className="size-4 shrink-0 text-gold" />
                  <span className="truncate">{a.title}</span>
                </button>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}
