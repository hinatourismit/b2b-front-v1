/**
 * Decorative Dubai / Abu Dhabi skyline silhouette for hero banners.
 * Recognisable landmarks rendered as soft gold silhouettes, anchored to the
 * bottom of the hero (purely ornamental, `aria-hidden`, no pointer events):
 *   Burj Al Arab · Dubai Frame · Museum of the Future · Burj Khalifa ·
 *   Ain Dubai (the wheel slowly turns) · Sheikh Zayed Grand Mosque.
 * viewBox is 1440×300 with ground at y=300; the wheel hub sits at (920,150)
 * — kept in sync with `.ain-wheel`'s transform-origin in index.css.
 */
export function HeroSkyline({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 1440 300"
      className={`pointer-events-none absolute inset-x-0 bottom-0 w-full ${className}`}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="heroSkyGold" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f0d9a8" stopOpacity="0.22" />
          <stop offset="1" stopColor="#c89b4a" stopOpacity="0.08" />
        </linearGradient>
      </defs>

      {/* faint back-row buildings for depth */}
      <g fill="#ffffff" opacity="0.05">
        <rect x="60" y="235" width="40" height="65" />
        <rect x="108" y="255" width="26" height="45" />
        <rect x="600" y="242" width="30" height="58" />
        <rect x="640" y="258" width="22" height="42" />
        <rect x="1030" y="250" width="34" height="50" />
        <rect x="1366" y="236" width="42" height="64" />
      </g>

      <g fill="url(#heroSkyGold)">
        {/* Burj Al Arab — the sail */}
        <path d="M150 300 L150 130 Q152 120 161 127 Q205 174 212 300 Z" />

        {/* Dubai Frame */}
        <path d="M330 300 L330 120 L344 120 L344 300 Z" />
        <path d="M398 300 L398 120 L412 120 L412 300 Z" />
        <path d="M330 120 L412 120 L412 135 L330 135 Z" />

        {/* Museum of the Future — pedestal (ring drawn separately below) */}
        <rect x="500" y="252" width="44" height="48" rx="4" />

        {/* Burj Khalifa — stepped taper to the spire */}
        <path d="M690 300 L690 150 L695 150 L695 96 L699 96 L699 54 L703 54 L705 16 L707 54 L711 54 L711 96 L715 96 L715 150 L720 150 L720 300 Z" />

        {/* Ain Dubai — A-frame support legs (static) */}
        <path d="M884 300 L916 156 L924 156 L956 300 L947 300 L920 168 L893 300 Z" />

        {/* Sheikh Zayed Grand Mosque */}
        <rect x="1120" y="262" width="190" height="38" rx="2" />
        <path d="M1126 262 L1126 152 Q1130 140 1134 152 L1134 262 Z" /> {/* minaret L */}
        <path d="M1296 262 L1296 152 Q1300 140 1304 152 L1304 262 Z" /> {/* minaret R */}
        <path d="M1158 262 Q1158 214 1178 214 Q1198 214 1198 262 Z" /> {/* side dome L */}
        <path d="M1232 262 Q1232 214 1252 214 Q1272 214 1272 262 Z" /> {/* side dome R */}
        <path d="M1188 262 Q1188 196 1215 178 Q1242 196 1242 262 Z" /> {/* central onion dome */}
      </g>

      {/* Museum of the Future — the torus ring */}
      <ellipse
        cx="522"
        cy="200"
        rx="40"
        ry="58"
        transform="rotate(18 522 200)"
        fill="none"
        stroke="url(#heroSkyGold)"
        strokeWidth="11"
      />

      {/* Ain Dubai — rim + rotating spokes + hub */}
      <g fill="none" stroke="url(#heroSkyGold)" strokeWidth="3">
        <circle cx="920" cy="150" r="86" />
        <g className="ain-wheel">
          <line x1="920" y1="150" x2="920" y2="64" />
          <line x1="920" y1="150" x2="920" y2="236" />
          <line x1="920" y1="150" x2="834" y2="150" />
          <line x1="920" y1="150" x2="1006" y2="150" />
          <line x1="920" y1="150" x2="859" y2="89" />
          <line x1="920" y1="150" x2="981" y2="211" />
          <line x1="920" y1="150" x2="859" y2="211" />
          <line x1="920" y1="150" x2="981" y2="89" />
        </g>
        <circle cx="920" cy="150" r="7" fill="url(#heroSkyGold)" stroke="none" />
      </g>

      {/* a few twinkling lights on the skyline */}
      <g fill="#f3ddae">
        <circle className="hero-star" cx="705" cy="118" r="1.5" style={{ animationDelay: "-0.6s" }} />
        <circle className="hero-star" cx="161" cy="158" r="1.4" style={{ animationDelay: "-1.5s" }} />
        <circle className="hero-star" cx="1215" cy="206" r="1.5" style={{ animationDelay: "-2.3s" }} />
        <circle className="hero-star" cx="406" cy="150" r="1.3" style={{ animationDelay: "-3s" }} />
      </g>
    </svg>
  );
}
