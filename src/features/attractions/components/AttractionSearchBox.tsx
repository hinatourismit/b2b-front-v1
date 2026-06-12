import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, MapPin, Search, Ticket } from "lucide-react";
import { useAttractionSearch } from "../api/attractions.queries";
import type { AttractionListItem } from "../types";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/**
 * Search-first box backed by GET .../search/list?search= (same as old
 * AttractionCard search). Suggestions navigate to destination listing or
 * attraction details.
 */
export function AttractionSearchBox({ className }: { className?: string }) {
  const navigate = useNavigate();
  const [value, setValue] = useState("");
  const [open, setOpen] = useState(false);
  const blurTimer = useRef<number>(0);
  const { data, isFetching } = useAttractionSearch(value);

  const results = (data ?? []) as (AttractionListItem & {
    name?: string;
    suggestionType?: string;
  })[];

  const go = (item: (typeof results)[number]) => {
    setOpen(false);
    // Old-app navigation: destinations by NAME (backend matches name exactly),
    // attractions by _id to the details page.
    if (item.name && !item.title) navigate(`/attractions/${encodeURIComponent(item.name)}`);
    else if (item._id) navigate(`/attractions/details/${item._id}`);
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

      {open && value.trim().length > 1 && results.length > 0 && (
        <ul className="absolute z-30 mt-2 max-h-80 w-full overflow-auto rounded-xl border bg-popover p-1.5 shadow-lg">
          {results.map((item, i) => (
            <li key={`${item._id}-${i}`}>
              <button
                type="button"
                onMouseDown={() => {
                  window.clearTimeout(blurTimer.current);
                  go(item);
                }}
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm hover:bg-accent"
              >
                {item.title ? (
                  <Ticket className="size-4 shrink-0 text-gold" />
                ) : (
                  <MapPin className="size-4 shrink-0 text-primary" />
                )}
                <span className="truncate">{String(item.title ?? item.name ?? "")}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
