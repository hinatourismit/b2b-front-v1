# Environment & Branding Config (from old `src/constants.js`)

> Provided by the user on 2026-06-12 (the `devLive` variant of the gitignored
> `b2b-front-main/src/constants.js`). Resolves gap #1 in `03-gaps-and-open-questions.md`.
> Do not commit real keys/URLs into the new app — these belong in `.env` / a branding config.

## Connection values

| Key | Value | New-app mapping |
| --- | --- | --- |
| `SERVER_URL` | `https://api-server-i1.mytravellerschoice.com` | `VITE_API_URL` (axios baseURL = `${VITE_API_URL}/api/v1`) |
| `CLIENT_URL` | `https://b2b.mytravellerschoice.com` | `VITE_CLIENT_URL` (used for gateway return URLs) |
| `MAP_API_KEY` | `AIzaSy…zxwW4` (Google Maps) | `VITE_GOOGLE_MAPS_API_KEY` |
| `IS_API_INTEGRATED` | `true` | feature flag if still needed |
| `API_INTEGRATION_URL` | docs link for partner attraction API | static link in settings page |

Note: the old file had variants per `VITE_NODE_ENV` (`PROD_LIVE` / `TEST_LOCAL` / `TEST_LIVE`); only this one was provided. The values above are **production** — for development we still want a test/local backend URL if one exists.

## Branding values (old app = Traveller's Choice; new app = Hina Tourism)

The old constants hard-code Traveller's Choice branding. The new frontend must keep all of these in a single branding/config module (env-driven where deployment-specific) so Hina Tourism values can be dropped in without touching feature code:

- Company name / short name / short code (`TITLE_NAME`, `TITLE_SHORT_NAME`, `COMPANY_SHORT_CODE`)
- Logo, favicon, login/signup banner images
- Address block (address, city, pincode, country)
- Contact emails (contact-us, enquiry, company), phone numbers, WhatsApp number
- Social links (Facebook, Instagram), Play Store URL, mobile-app image

**Open item:** Hina Tourism's own branding assets and contact details are not yet provided — placeholder values will be used until supplied.
