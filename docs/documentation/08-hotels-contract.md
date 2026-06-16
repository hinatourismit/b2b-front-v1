# Hotels Module — Verified Contract (Phase B1)

> Extracted 2026-06-16 from `b2b-front-main` pages/slices (ground truth for payloads/workflow)
> cross-checked with `api-server-main` controllers. Field names verbatim per the fidelity rule.
> Hotels is a bedbank-style integration: stateful searches keyed by `searchId`, rate rechecks
> before booking, multi-room paxes, time-limited rate holds (`expiresIn`).

## Endpoints & exact usage

| Step | Call | Notes |
| --- | --- | --- |
| Home | GET `/b2b/hotels/home` | promotions, featured, background banners (HotelPage.jsx:33) |
| Suggestions | GET `/b2b/hotels/availabilities/search/suggestions?search=<q>` | **response `{ cities, areas, hotels }`** (controller :319) — three grouped arrays, not flat. Item: `{ _id, suggestionType: "CITY"\|"AREA"\|"HOTEL", countryName, stateName, cityName, hotelName, hotelId }` |
| Results | POST `/b2b/hotels/availabilities/search?<filterQuery>` | body `{ searchQuery, fromDate (YYYY-MM-DD), toDate, rooms[], nationality, priceType }`. `searchQuery` = the chosen suggestion object `{ id/_id, suggestionType }`. Query string carries paging+filters (see below). |
| Single hotel static | GET `/b2b/hotels/availabilities/single/:hotelId` | hotel detail object (controller :1391 returns hotel) |
| Single hotel availability | POST `/b2b/hotels/availabilities/single/search` | body `{ fromDate, toDate, rooms[], nationality, hotelId, priceType ("all" default) }` → `{ rooms[], roomPaxes, fromDate, toDate, noOfNights, searchId }`; each room has `rates[]` with `netPrice`, `rateKey` |
| Rate recheck | POST `/b2b/hotels/availabilities/booking/room-rate` | body `{ rateKey (decodeURIComponent), searchId }` → `{ allowedPaymentMethods[], hotel, rate, roomPaxes, fromDate, toDate, noOfNights, travellerDetails[], expiresIn (seconds), searchId }` |
| Create order | POST `/b2b/hotels/orders/create` | body `{ rateKey, hotelId, searchId, travellerDetails[], contactDetails, specialRequest, paymentMethod }`. Response: wallet → order JSON (`_id`); ccavenue → **HTML page** → `location.replace(blob)` |
| Complete (wallet) | POST `/b2b/hotels/orders/:orderId/complete` | body `{ otp }` (5-digit; old uses real OTP inputs) → navigate `/hotel/invoice/<_id>` |
| Complete (pay-later) | POST `/b2b/hotels/orders/complete/pay-later` | body `{ rateKey, hotelId, searchId, travellerDetails[], contactDetails, specialRequest }` (no paymentMethod) → navigate `/hotel/invoice/<_id>` |
| Orders list | GET `/b2b/hotels/orders/all?skip=&limit=` | response `{ hotelOrders[], totalHotelOrders }` |
| Order detail | GET `/b2b/hotels/orders/single/:orderId` | |
| Voucher PDF | GET `/b2b/hotels/orders/voucher/:orderId` | blob |
| Invoice PDF | GET `/b2b/hotels/orders/invoice/:orderId` | blob |
| Cancel | POST `/b2b/hotels/orders/cancel/:orderId` | |

## Payload detail

### rooms[] (occupancy)
```
{ noOfAdults: number, noOfChildren: number, childrenAges: number[] }
```
Default single room: `{ noOfAdults: 1, noOfChildren: 0, childrenAges: [] }`. The home page seeds 2 adults.

### travellerDetails[] (order create) — mapped from form (HotelApplyIndex.jsx:148)
```
{ roomId, title, firstName, lastName, age, gender, type }
```
`type` = `item.type.split(" ")[0].toLowerCase()` (e.g. "Adult 1" → "adult"). The recheck response supplies the `travellerDetails` skeleton (one per pax with roomId/type) to fill in.

### contactDetails (order create)
`{ country, email, phoneNumber }` (validated non-empty before submit).

### Results query string (filters)
`limit, skip, searchId, accommodationTypes (JSON), priceFrom, priceTo, starCategories (JSON), boardTypes (JSON), chains (JSON), amenities (JSON), sortBy`

## Result item shape (search → cards)
`{ hotel: { hotelName, image, starCategory, accommodationType, address, country, state, distanceFromCity, featuredAmenities[] }, minRate, totalOffer }`
Search response root: `{ searchId, totalHotels, filteredHotelsCount, skip, limit, filters, appliedFilters, hotels[], fromDate, toDate, roomPaxes }`.

## Routes (preserve exactly)
`/hotel` (home/search) — NOTE: currently `/` is attractions home; hotel home is at `/hotel`.
`/hotel/avail` (results), `/hotel/details/:id` (detail+availability),
`/hotel/:id/apply/:roomtypeid` (checkout), `/hotel/order` (list),
`/hotel/order/:id/details`, `/hotel/invoice/:id` (success), `/hotel/invoice/error`.

## Workflow
search box (suggestion + dates + rooms + nationality) → results (`/hotel/avail`, infinite scroll, filters) →
detail (static + availability with room rates) → pick rate → checkout (`/hotel/:id/apply/...`):
rate recheck (holds rate, countdown via `expiresIn`) → traveller + contact details →
pay (wallet OTP / pay-later / ccavenue HTML redirect) → `/hotel/invoice/:id` → voucher + invoice PDFs.

## Quirks preserved
- Dates sent as `YYYY-MM-DD` (sliced from ISO) — display still DD/MM/YYYY.
- `rateKey` is URL-encoded in links, `decodeURIComponent` before sending.
- ccavenue create returns an HTML page (blob + location.replace), same as attractions.
- `priceType`/`priceType: "all"` default on single search.
- Rate holds expire (`expiresIn`); old app shows a countdown and the rate can lapse.

## Card fee
Confirm whether hotel ccavenue adds 3% (attractions does via totalFee). To verify in
`b2bHotelOrdersController.js` before wiring a surcharge into hotel checkout.
