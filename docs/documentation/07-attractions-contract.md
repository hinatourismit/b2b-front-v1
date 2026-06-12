# Attractions Module — Verified Contract (Phase B2)

> Extracted 2026-06-12 from `b2b-front-main` pages (ground truth for payloads/workflow)
> cross-checked with `api-server-main` routes. Per the fidelity rule, field names are verbatim.

## Endpoints & exact usage

| Step | Call | Notes |
| --- | --- | --- |
| Search suggestions | GET `/b2b/resellers/client/attraction/search/list?search=<q>` | response used directly as list |
| Categories | GET `/attractions/categories/all` | **B2C endpoint — no `/b2b` prefix** (old app uses it for filter chips) |
| Listing | GET `/b2b/resellers/client/attraction/all?limit=100&destination=<slug>&category=<id>` | destination comes from route `:slug` |
| Details | GET `/b2b/resellers/client/attraction/single/:id` | attraction with `activities[]` |
| Price recheck | POST `/b2b/resellers/client/attraction/single/price/:activityId` body `{ hourCount, activityType, base, adultCount, childCount, infantCount: 0, date }` | old app always sends `infantCount: 0` (duplicate-key quirk — preserved); debounced. **Response** (controller :975): `{ activityId, …counts, date, pricing: [{ transferType, totalPrice, privateTransfers: [{pvtTransferId, name, price, maxCapacity}] }], activityType, isTimeSlot, productId, productCode }` — display price = `pricing.find(p => p.transferType === selected).totalPrice` (old render: ActivityComponent.jsx:2077). **No top-level totalPrice.** |
| Timeslots | POST `/b2b/resellers/client/attraction/timeslot` body `{ productId, productCode, timeSlotDate, activityId }` | only for timeslot products (e.g. Burj Khalifa) |
| Create order | POST `/b2b/attractions/orders/create` body `{ selectedActivities, country, name, email, phoneNumber, agentReferenceNumber, paymentMethod }` | name = firstname + " " + lastname joined; paymentMethod: `wallet` \| `ccavenue` \| `tabby` |
| └ selectedActivities[i] | `{ activity: _id, date, adultsCount, childrenCount, infantCount, hoursCount: hourCount or "", transferType, slot: selectedTimeSlot, isPromoAdded, privateTransfers: selectedVehicle[] or vehicle }` | note plural/singular mix is contract |
| Complete (wallet) | POST `/b2b/attractions/orders/complete/:orderId` body `{ otp: 12345 }` | "OTP" is a hardcoded 12345 behind a confirm dialog; success → navigate `/attractions/invoice/<response._id>` and empty cart |
| Complete (ccavenue) | create-order response is an **HTML page** → old app blobs it and `window.location.replace(blobUrl)` | gateway posts back to backend; backend redirects to client return paths |
| Complete (tabby) | create-order response is a **URL string** → `window.location.replace(url)` | deferred (CCAvenue-first decision) but contract recorded |
| Orders list | GET `/b2b/attractions/orders/all?skip=&limit=&referenceNo=&status=&attraction=&activity=&dateFrom=&dateTo=&travellerEmail=` | response `{ result: { data: [], totalOrders } }` |
| Orders Excel | GET `/b2b/attractions/orders/all/sheet?skip=&limit=&referenceNo=&status=` | blob → orders.xlsx |
| Order detail | GET `/b2b/attractions/orders/single/:orderId` | used by invoice page |
| Invoice PDF | GET `/b2b/attractions/orders/single/:orderId/invoice` | blob |
| Bulk tickets | `${SERVER_URL}/api/v1/download/attractions/orders/b2b/:orderId/orderItems/:activityId/tickets?token=<ticketDownloadToken>` | top-level app route, token from order item — plain link, not the b2b router |
| Single ticket | GET `/b2b/attractions/orders/:orderId/ticket/:activityId/single/:ticketNo` | blob |

## Workflow (must match)

browse → details → configure activity (date, pax, transfer type, hourly count, timeslot)
→ price recheck on every change → add to cart (localStorage `agentExcursionCart`,
deduped by activity `_id`) → `/attractions/payment`: lead passenger (firstname,
lastname, email, phone, country) + **agentReferenceNumber (required)** + payment
method → create → wallet: balance check first, confirm dialog → complete(otp 12345)
→ invoice page. CCAvenue: replace location with returned HTML.

## Cart item shape (activity object + user selections, stored as-is)

Activity fields read by old UI: `_id, attraction, name, activityType ("normal"|"transfer"),
base ("person"|"private"|"hourly"), isTimeSlot/isB2bPromoCode-ish flags, pricing,
lowPrice, sharedTransferPrice, privateTransfers[], adultTicketCount, childTicketCount,
infantTicketCount, vat, isVat, productId, productCode`.
Selection fields merged in: `isChecked, date, adult, child, infant, hourCount,
transfer ("without"|"shared"|"private"), selectedTimeSlot, selectedVehicle[]/vehicle,
price, isPromoAdded`.

## Old-UI behaviors preserved on purpose

- No cancel action in the agent UI (backend has cancel endpoints; old UI never calls them).
- PaymentApproval (`/payment/approval`) is a static informational page (no API).
- Attraction home = search + top destinations (from `/b2b/home/initial-data` destinations) — `banners`/`sections` endpoints are unused by the old app.
- Discrepancy with doc 06 fixed: attraction checkout uses `/b2b/attractions/orders/create`, **not** the unified `/b2b/orders/create`.
