# 14 — Design System Notes

Living reference for the visual layer. Source of truth is `src/index.css` (tokens + utilities).

## Fonts
- **Display** (`--font-display`, headings `h1/h2/h3`): **Fraunces** (serif, optical sizing).
- **Body** (`--font-sans`, default): **Figtree**.
- Loaded via Google Fonts `@import` at the top of `src/index.css`.

## Brand tokens
Defined as CSS variables on `:root` and exposed to Tailwind via `@theme inline`. Highlights:
- `--primary` **`#347bb7`** (Hina brand blue) · `--ring` matches.
- `--gold` champagne gold (accents, dividers, micro-dots).
- `--background` warm sand · `--foreground` deep ink-teal.
- Use the semantic Tailwind classes (`bg-primary`, `text-gold`, `border-border`, …), not raw hex.

## Glass (frosted) surfaces — added 2026-06-25
Two utility classes in `src/index.css`:
- **`.glass-hero`** — frosted light panel for **dark backgrounds** (the home hero gradient / imagery):
  `blur(22px) saturate(140%)`, 10% white fill, hairline white border, layered drop shadow + a 1px inner
  top-edge highlight.
- **`.glass-chip`** — lighter frost for small pills (category tags, badges).

**Accessibility / performance built in:**
- `@supports not (backdrop-filter…)` fallback → opaque-enough tint so text never loses contrast.
- `@media (prefers-reduced-transparency: reduce)` → drops the blur, raises opacity.
- The **content inside** glass stays on solid surfaces (e.g. the hero search `<Input>` is `bg-card`) so
  it's always legible.

### Usage rule (important)
Glass is for **marketing / discovery surfaces only** — the home hero, image-backed cards, overlays.
**Do not** use it on transactional UI (tables, forms, wallet, quotations, reports): data density needs
flat, high-contrast surfaces, and `backdrop-filter` is GPU-expensive on long lists.

### Where it's used
- `features/attractions/pages/AttractionHomePage.tsx` — the **glass hero card** wrapping the search box,
  category quick-tags, and the trust strip in one frosted panel over the hero gradient. Its hero also
  carries a **travel motif** (decorative SVG behind the content): drifting clouds and twinkling stars,
  plus the ambient aura drift / floating ✦ glyph. All `.hero-*` animations live in `index.css` and are
  disabled under `prefers-reduced-motion`. (An earlier paper-plane + flight-route arc was removed —
  didn't read well.)
- `components/common/PromoFlash.tsx` — a floating, **dismissible flash-promo popup** (bottom-right) that
  auto-rotates through offers with a gold flash badge, optional image, CTA, and progress dots.
  **Backend-driven (dynamic):** content comes from the admin-managed home banners — model `B2BBanner`
  (`name:"home"`), read via `GET /b2b/home/banners` (hook `useHomeBanners`). Each banner maps
  `title → title`, `body → text`, `image → image`, `isButton`/`buttonText`/`buttonUrl → CTA` (internal
  `<Link>` or external `<a>`). **Admins control it** through the existing CMS endpoints
  `/admin/frontend/b2b/home/banner/{add,edit,delete}` — **no backend changes** (api-server-main is
  reference-only). A curated `FALLBACK_PROMOS` list shows only when no banners are configured. Appears
  ~1.5s after each home load; dismissing (✕ or a CTA) hides it **for the current view only**; pauses
  rotation under `prefers-reduced-motion`. `fixed`, so it can move to `MainLayout` to run app-wide.
- **Hero action choreography:** the skydive and the city bus share **one 28s cycle** so only
  **one moving object is on screen at a time**, alternating with gaps — skydive in the first ~9s (plane crosses + diver
  drops), a pause, then the bus rolls (~48–84%), then a pause. Both wait offscreen during the other's turn
  (timing in `index.css`; keep them the same duration to stay in phase).
- `components/common/HeroSkydiver.tsx` — a decorative **skydive sequence** (Skydive Dubai nod): a jump
  plane **flies left→right** (`.jump-plane`); the jumper is positioned under the flight path and **exits the
  plane mid-flight** (appears as the plane passes overhead), **free-falls belly-to-earth** near-vertically
  (`.skydiver-freefall`), then the **canopy snaps open** (`.skydiver-canopy`, slight overshoot) and the
  descent **decelerates** into a left→right glide with a pendulum **sway** (`.skydiver-sway`). The drop
  (`.skydiver`) encodes the fast-then-slow vertical rate; freefall/canopy overlap slightly for a seamless
  handoff. `aria-hidden`, hidden on `<sm`; all in `index.css`, disabled under `prefers-reduced-motion`.
- `components/common/HeroCityBus.tsx` — an **open-top double-decker city tour bus** (hop-on-hop-off nod
  that matches the skyline frame) as a **single-colour faint silhouette** (`opacity-30`) rolling
  **left→right** along a faint street line at the hero base, with a subtle suspension jiggle
  (`.city-bus-jiggle`). Takes its turn after the skydive in the shared cycle. `.city-bus` (drive) in
  `index.css`; disabled under `prefers-reduced-motion`.
- `components/common/HeroSkyline.tsx` — a reusable **Dubai / Abu Dhabi landmark skyline** silhouette
  (Burj Al Arab, Dubai Frame, Museum of the Future, Burj Khalifa, **Ain Dubai** — the wheel slowly
  turns — and Sheikh Zayed Grand Mosque), anchored to the hero base. Soft gold silhouettes, `aria-hidden`.
  The wheel spin (`.ain-wheel`, `index.css`) rotates about user-space `(920,150)` of the skyline's
  `viewBox="0 0 1440 300"` and is disabled under `prefers-reduced-motion`.
- `features/hotels/pages/HotelHomePage.tsx` — same `.glass-hero` tray wrapping the (solid, multi-field)
  hotel search panel + a matching trust strip.
  - ⚠️ Neither hero card may get `overflow-hidden` — it would clip the search-suggestions dropdown
    (rendered absolutely below the input). The dense inner search panels stay **solid** (`bg-card`) on
    purpose; only the surrounding tray + chips are frosted.
