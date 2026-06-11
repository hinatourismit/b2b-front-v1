# Existing Frontend Analysis — `/b2b-front-main`

> Phase 1 deliverable. Reference only — this app must not be modified.
> Analyzed: 2026-06-12

## 1. Stack

| Aspect | Detail |
| --- | --- |
| Framework | React 18 + Vite 4, **JavaScript (no TypeScript)** |
| Routing | react-router-dom 6 (`useRoutes` with a route-object tree) |
| State | Redux Toolkit (16 slices) — no react-query/SWR; all server state lives in Redux or component state |
| HTTP | Single axios instance (`src/axios.js`), `baseURL = ${config.SERVER_URL}/api/v1/` |
| Styling | Tailwind CSS 3 + @material-tailwind/react + @headlessui/react |
| Forms | Hand-rolled controlled inputs (no form library, no schema validation) |
| Dates | moment, react-datepicker, react-multi-date-picker |
| Misc | react-icons, lottie-react, react-multi-carousel, google-map-react, react-helmet, react-top-loading-bar |
| Dev server | port **3150** |

Scale: ~365 source files under `src/b2b` (pages + components).

## 2. API Integration

- `src/axios.js` creates one instance with `baseURL` from `config.SERVER_URL` — **`src/constants.js` is gitignored and missing from this copy** (see gaps doc). `.env` only sets `VITE_NODE_ENV` (`PROD_LIVE` / `TEST_LOCAL` / `TEST_LIVE`), which `constants.js` presumably maps to a server URL.
- `AxiosInterceptor` component (wraps the authed route tree): on any **401 response → dispatch `logoutAgent()` → redirect `/login`**.
- **No service layer.** 127 page files (plus many components) call `axios.get/post(...)` inline, each manually attaching `headers: { authorization: "Bearer " + token }` from Redux state. The auth header is *not* set globally on the instance.
- Errors are handled ad-hoc per component (local state, toasts, lottie error screens).

## 3. Authentication Flow

1. **Login** (`B2BLoginPage`): `POST /b2b/resellers/auth/login` → on success dispatch `setAgent({ reseller, jwtToken })` → token saved to `localStorage["agent-string"]`, agent object in Redux, `isLoggedIn = true`.
2. **Bootstrap** (app start): `fetchAgent` thunk reads token from localStorage → `GET /b2b/resellers/auth/getReseller` → populates `agent`, `isLoggedIn`; `isSiteLoading` gates first render.
3. **Pending agents**: login may return `status: "pending"` + `agentCode` + `randomString` → user is sent to `/verification/:agentCode/:randomString` (document upload / status page).
4. **Route protection** (`B2BPrivateRoute`): not logged in → `/login`; missing/null `agent.configuration` → `/entrydenied`; all seven module flags false → `/entrydenied`.
5. **Per-module guards** (`B2BNot<Module>PrivateRoute` × 7): if the module's flag (`showHotel`, `showAttraction`, `showFlight`, `showVisa`, `showA2a`, `showQuotaion` *(sic)*, `showInsurance`) is off, redirect to the first enabled module in priority order: hotel → attraction → flight → visa → a2a → quotation → insurance.
6. **Logout**: `logoutAgent` thunk clears localStorage + Redux.

## 4. State Management (Redux slices)

| Slice | Holds |
| --- | --- |
| `agentSlice` | auth token, agent profile, login state, forgot-password email |
| `generalSlice` | app-wide lookups (countries, currencies, home initial-data) |
| `homeSlice` | home banners/sections |
| `hotelSlice` | hotel search params, availability results, selected rate |
| `flightSlice` | flight search state, cart (tbId), passengers |
| `a2aSlice` | a2a listing/booking state |
| `visaSlice` | visa selection, travellers, documents |
| `quotationSlice` | the in-progress quotation builder (hotels, transfers, excursions, meals, guides, visa, markup) |
| `quotationListSlice` | quotation dashboard listing |
| `markupSlice` | markup management state |
| `resellerSlice` | sub-agent management |
| `walletSlice` | balance, deposits, withdrawals |
| `paymentSlice` | payment method/session state |
| `insuranceSlice` | insurance quotation/contract state |
| `agentExcursionSlice` | excursion data for quotations |

Heavy use of Redux for what is really *server cache* (search results, lists) — in the rebuild this maps to TanStack Query; only auth + multi-step builder state (quotation, booking forms) needs a client store.

## 5. Route Map

Public routes:

| Route | Page | Purpose |
| --- | --- | --- |
| `/login` | B2BLoginPage | Agent login |
| `/register` | B2BRegisterPage | Agent signup |
| `/verification/:agentCode/:randomString` | ResellersVerification | Pending-agent docs/status |
| `/landingpageb2b` | LandingPage | Marketing landing |
| `/aboutus`, `/contactusb2b` | AboutUsPage / ContactUsPage | Static |
| `/privacy-policy`, `/tabby-terms&conditions` | static pages | Legal |
| `/entrydenied` | EntryDenied | No modules enabled |
| `/payment-decline`, `/b2b/wallet/deposit/:id/cancelled`, `/b2b/wallet/deposit/:id/success` | payment result pages | Gateway redirects |
| `/demo` | Demo | dev scratch page |

Authenticated routes (inside `AxiosInterceptor > B2BPrivateRoute > B2BMainLayout`), grouped by module wrapper:

**Hotel module** (default home!)

| Route | Page |
| --- | --- |
| `/` | HotelPage (hotel search home) |
| `/hotel/avail` | HotelIndexPage (results) |
| `/hotel/details/:id` | HotelDetailIndex |
| `/hotel/:id/apply/:roomtypeid` | HotelApplyIndex (checkout) |
| `/hotel/order` | HotelOrder (list) |
| `/hotel/order/:id/details` | HotelOrderDetailPage |
| `/hotel/invoice/:id` | HotelSuccessPage |
| `/hotel/invoice/error` | HotelErrorPage |

**Quotation module**

| Route | Page |
| --- | --- |
| `/quotation` | QuotationHomeIndex (builder) |
| `/quotation/list` | QuotationDashboardIndexpage |
| `/quotation/view` | QuotationView |
| `/quotation/email` | QuotationEmail |
| `/quotation/list/edit/:amendment` | QuotationEditHomeIndex |

**Attraction module**

| Route | Page |
| --- | --- |
| `/attraction` | AttractionPage (home) |
| `/attractions/:slug` | Attraction (listing by destination) |
| `/attractions/details/:id` | AttractionDetails |
| `/attractions/payment` | PaymentHomePage (checkout) |
| `/attraction/order` | AttractionOrder (orders list) |
| `/attractions/invoice/:id` | AttractionInvoice |
| `/attractions/invoice/error` | AttractionPaymentError |
| `/payment/approval` | PaymentApproval |

**Visa module**

| Route | Page |
| --- | --- |
| `/visa` | VisaPage (home) |
| `/visa/:id` | VisaHomeScreen (country/types) |
| `/visa/:id/apply` | VisaIndex (application form) |
| `/visa/order` | VisaOrderPage (applications list) |
| `/visa/order/:id/details` | VisaOrderDetailsPage |
| `/visa/order/:id/details/:passenger` | ReapplyIndividual |
| `/visa/apply/invoice/:id` | VisaApplySuccessPage |

**A2A module**

| Route | Page |
| --- | --- |
| `/a2a` | A2aPage (home) |
| `/a2a/data` | A2ASelectionIndexPage |
| `/a2a/booking/:id` | A2ABookingIndexPage |
| `/a2a/booking/:id/confirm` | A2AConfirmationPage |
| `/a2a/order` | A2AOrderPage |
| `/a2a/order/:id` | A2AorderIndividualPage |

**General module** (flights, insurance, agents, markup, wallet, settings)

| Route | Page |
| --- | --- |
| `/flight` | FlightPage (search home) |
| `/flight/order/results` | FlightHomePage (results) |
| `/b2b/flight/:tbId` | FlightBookingPage |
| `/b2b/flight/ticket/booking/:bookingId` | FlightBookingTicket |
| `/flight/order` | FlightOrderPage (list) |
| `/b2b/flight/order/details/:bookingId` | FlightOrderDetailPage |
| `/insurance` | InsurancePage |
| `/insurance/order` | InsuranceOrderIndex |
| `/insurance/order/orderView/:id` | InsuranceOrderViewPage |
| `/resellers` | Resellers (sub-agent list) |
| `/reseller/add` | NewRegisters |
| `/reseller/:id` | SingleSubAgent |
| `/reseller/:id/edit` | EditResellers |
| `/markup/attraction` | MarkUpList |
| `/markup/visa` | VisaMarkupList |
| `/markup/hotel` | HotelMarkupList |
| `/markup/quotation` | QuotationMarkupIndex |
| `/wallet` | Wallet |
| `/settings` | Settings |
| `/error`, `/*` | PageNotFound |

Notes:
- **Transfer routes exist but are commented out** (`/transfer`, `/transferLIst`) — transfer booking currently happens only inside the unified order/cart and quotation flows, though backend transfer endpoints are live.
- A `Dashboard.jsx` page exists but is **not routed** — there is no dashboard; hotel search is the de-facto home.
- Mixed path conventions (`/b2b/flight/...` vs `/flight/...`) are inconsistent legacy naming.

## 6. Business Workflows to Preserve

### Quotation → Amendment → Confirm (the core B2B workflow)
1. Agent builds a quotation (`/quotation`): hotels (multiple stay options), excursions, transfers, meals, guides, visa, markup — `POST /quotations/create` → returns `quotationNumber`.
2. Every edit (`PATCH /quotations/update/:quotationNumber`) creates an **amendment** (versioned revision).
3. Agent views/sends PDF or email (`/quotation/view`, `/quotation/email`).
4. Confirmation: `PATCH /quotations/amendment/confirm/:amendmentId` with chosen `selectedStay`, `occupancyRoomCount`, comments, and a **mandatory unique `employee_reference_number`** — this converts the quotation into a confirmed booking.

### Hotel booking
search → results → details → rate recheck (`booking/room-rate`) → `orders/create` → pay (wallet `:orderId/complete`, pay-later, or CCAvenue) → voucher + invoice PDFs.

### Attraction booking
browse → activity detail (timeslots, price check) → order create → complete (wallet/Tabby/CCAvenue) → tickets (PDF per activity/ticket) + invoice. Cancellation per activity.

### Visa application
country → visa type by nationality → apply (travellers) → pay → upload documents per traveller → track status → reapply per traveller on rejection.

### Wallet
balance (`/transactions/balance`) is checked before wallet payments everywhere; deposits via gateway or manual deposit-request with receipt upload; withdraw requests; full transaction history with Excel export.

### Markup
Two-level pricing: reseller sets **client markup** (their B2C margin) and **sub-agent markup** per product (attraction activity, visa type, hotel room-type/star-category, flight, transfer vehicle, quotation). Applied server-side to all prices returned.

## 7. Shared Logic Worth Porting

- 401-driven global logout (axios interceptor).
- Module-flag gating + fallback-module redirect priority (hotel → attraction → flight → visa → a2a → quotation → insurance).
- Pending-agent verification flow (`status: "pending"` login branch).
- Wallet-balance check before pay actions; `pay-later` only when backend offers it on the rate.
- Price utilities: `src/utils/PriceConversion.js` (currency display), date/time formatters (`formatDate`, `formatTime`, `convertTimeFormat`).
- Sub-agent vs reseller role: sub-agents don't see agent-management/markup screens (role checks scattered in components — `agent.role === "reseller"`).
- Excel/PDF downloads are plain GET links to backend endpoints (some unauthenticated by design).
