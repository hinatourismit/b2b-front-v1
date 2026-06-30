/**
 * Decorative skydive sequence for the hero sky (a nod to Skydive Dubai): a jump
 * plane sits top-left and a parachutist drops from it, falling fast on a
 * left→right diagonal across the screen while swaying under the canopy.
 * Purely ornamental, `aria-hidden`, behind the content, hidden on `<sm`.
 * Motion lives in `.skydiver` / `.skydiver-sway` (index.css) and is disabled
 * under reduced-motion.
 */
export function HeroSkydiver() {
  return (
    <div className="pointer-events-none absolute inset-0 hidden overflow-hidden sm:block" aria-hidden="true">
      {/* jump plane flying left→right — the diver drops mid-flight */}
      <div className="jump-plane absolute left-0 top-[8%] w-20">
        <svg viewBox="0 0 120 40" className="w-full">
          <g fill="#e6c478" fillOpacity="0.7">
            <path d="M12 20 Q55 14 110 20 Q55 26 12 20 Z" /> {/* fuselage */}
            <path d="M62 20 L46 4 L72 18 Z" /> {/* upper wing */}
            <path d="M62 20 L46 36 L72 22 Z" /> {/* lower wing */}
            <path d="M22 20 L11 7 L30 18 Z" /> {/* tail fin */}
          </g>
        </svg>
      </div>

      {/* parachutist: exits the plane, free-falls belly-to-earth, then deploys.
         Positioned under the plane's flight path so the jump reads as mid-flight. */}
      <div className="skydiver absolute left-[28%] top-[8%] w-14">
        <svg viewBox="0 0 80 100" className="w-full overflow-visible">
          {/* freefall figure — belly-to-earth (parallel to the ground), facing
             the direction of travel, arms + legs swept; visible until deploy */}
          <g className="skydiver-freefall" fill="#e6c478" fillOpacity="0.85">
            <circle cx="53" cy="49" r="5" /> {/* head, forward */}
            <path d="M30 46 Q42 43 50 49 Q42 55 30 53 Z" /> {/* arched torso */}
            <rect x="37" y="38" width="14" height="3.2" rx="1.6" transform="rotate(-38 44 39)" /> {/* arm */}
            <rect x="37" y="55" width="14" height="3.2" rx="1.6" transform="rotate(38 44 56)" /> {/* arm */}
            <rect x="20" y="44" width="15" height="3.2" rx="1.6" transform="rotate(-20 27 45)" /> {/* leg */}
            <rect x="20" y="52" width="15" height="3.2" rx="1.6" transform="rotate(20 27 53)" /> {/* leg */}
          </g>

          {/* parachute + hanging figure — deploys (pops open), then sways */}
          <g className="skydiver-canopy">
            <g className="skydiver-sway">
              {/* canopy */}
              <path d="M6 26 Q40 -6 74 26 Z" fill="#f0d9a8" fillOpacity="0.8" />
              {/* canopy cell seams */}
              <g stroke="#c89b4a" strokeOpacity="0.5" strokeWidth="1">
                <line x1="23" y1="13" x2="23" y2="26" />
                <line x1="40" y1="8" x2="40" y2="26" />
                <line x1="57" y1="13" x2="57" y2="26" />
              </g>
              {/* suspension lines */}
              <g stroke="#e6c478" strokeOpacity="0.55" strokeWidth="1">
                <line x1="8" y1="26" x2="38" y2="60" />
                <line x1="27" y1="26" x2="39" y2="60" />
                <line x1="53" y1="26" x2="41" y2="60" />
                <line x1="72" y1="26" x2="42" y2="60" />
              </g>
              {/* hanging figure */}
              <g fill="#e6c478" fillOpacity="0.85">
                <circle cx="40" cy="64" r="4.5" />
                <rect x="36.5" y="68" width="7" height="13" rx="3" />
                <rect x="29" y="69" width="9" height="3" rx="1.5" transform="rotate(22 33 70)" />
                <rect x="42" y="69" width="9" height="3" rx="1.5" transform="rotate(-22 47 70)" />
                <rect x="37" y="80" width="3" height="10" rx="1.5" transform="rotate(13 38 85)" />
                <rect x="40" y="80" width="3" height="10" rx="1.5" transform="rotate(-13 42 85)" />
              </g>
            </g>
          </g>
        </svg>
      </div>
    </div>
  );
}
