/**
 * Decorative open-top double-decker **city tour bus** rolling left→right along
 * the street at the base of the hero skyline (a hop-on-hop-off sightseeing
 * nod that matches the city frame). Purely ornamental, `aria-hidden`, behind
 * the content, hidden on `<sm`. Motion (`.city-bus` / `.city-bus-jiggle`)
 * lives in index.css and starts after the skydive; disabled under
 * reduced-motion.
 */
export function HeroCityBus() {
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 hidden h-[34%] sm:block" aria-hidden="true">
      {/* the bus — single-colour silhouette, kept faint so it blends in */}
      <div className="city-bus absolute bottom-[12%] left-0 w-36 opacity-30">
        <svg viewBox="0 0 170 84" className="w-full overflow-visible">
          {/* one flat colour; the thin gaps read as the deck divider + open top */}
          <g className="city-bus-jiggle" fill="#e6c478">
            <rect x="12" y="24" width="142" height="14" rx="3" /> {/* upper deck */}
            <rect x="8" y="40" width="150" height="26" rx="4" /> {/* lower deck */}
            <rect x="14" y="19" width="138" height="3" rx="1.5" /> {/* roof rail */}
            <rect x="32" y="19" width="2.5" height="6" /> {/* rail posts */}
            <rect x="66" y="19" width="2.5" height="6" />
            <rect x="100" y="19" width="2.5" height="6" />
            <rect x="134" y="19" width="2.5" height="6" />
            <circle cx="44" cy="66" r="9" /> {/* wheels */}
            <circle cx="124" cy="66" r="9" />
          </g>
        </svg>
      </div>
    </div>
  );
}
