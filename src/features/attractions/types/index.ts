/**
 * Shapes verified against b2b-front-main usage and api-server-main routes.
 * See docs/documentation/07-attractions-contract.md. Fields the old UI does
 * not read are intentionally untyped (index signature) — no invented contracts.
 */

export interface AttractionListItem {
  _id: string;
  title?: string;
  slug?: string;
  images?: string[];
  destination?: { _id: string; name?: string; slug?: string };
  category?: { _id: string; categoryName?: string };
  activity?: { lowPrice?: number };
  [key: string]: unknown;
}

/** GET .../search/list response (controller: searchDestinationAndAtt). */
export interface AttractionSearchResponse {
  attractions?: { _id: string; title?: string; slug?: string; destination?: { name?: string } }[];
  /** backend typo — contract */
  totoalAttraction?: number;
  destinations?: { _id: string; name?: string; slug?: string }[];
  totalDestination?: number;
  standAlone?: unknown[];
  totalStandAlone?: number;
}

/** GET .../attraction/all response envelope (verified in controller L473). */
export interface AttractionsListResponse {
  attractions?: {
    totalAttractions?: number;
    data?: AttractionListItem[];
  };
  /** empty-destination branch returns { destinations: [] } instead */
  destinations?: unknown[];
  skip?: number;
  limit?: number;
}

export interface TimeSlot {
  EventID?: string;
  EventTypeID?: string;
  EventName?: string;
  StartDateTime?: string;
  EndDateTime?: string;
  ResourceID?: string;
  Status?: string;
  Available?: string;
  AdultPrice?: number;
  ChildPrice?: number;
  [key: string]: unknown;
}

export interface PrivateTransfer {
  _id?: string;
  /** id used inside pricing[].privateTransfers (controller naming) */
  pvtTransferId?: string;
  name?: string;
  maxCapacity?: number;
  price?: number;
  count?: number;
  [key: string]: unknown;
}

/** Activity as returned inside the single-attraction response. */
export interface Activity {
  _id: string;
  attraction?: string;
  name?: string;
  activityType?: "normal" | "transfer" | string;
  base?: "person" | "private" | "hourly" | string;
  description?: string;
  adultPrice?: number;
  childPrice?: number;
  infantPrice?: number;
  lowPrice?: number;
  adultTicketCount?: number;
  childTicketCount?: number;
  infantTicketCount?: number;
  sharedTransferPrice?: number;
  privateTransfers?: PrivateTransfer[];
  isPrivateTransferAvailable?: boolean;
  isSharedTransferAvailable?: boolean;
  /** present on activities from the details/listing responses; the price
   *  recheck returns a fresh copy — dropdown options derive from it */
  pricing?: PricingEntry[];
  isVat?: boolean;
  vat?: number;
  isPromoCode?: boolean;
  productId?: string;
  productCode?: string;
  isTimeSlot?: boolean;
  [key: string]: unknown;
}

export interface AttractionDetails {
  _id: string;
  title?: string;
  slug?: string;
  description?: string;
  highlights?: string;
  images?: string[];
  destination?: { _id: string; name?: string };
  category?: { _id: string; categoryName?: string };
  activities?: Activity[];
  bookingType?: "booking" | "ticket" | string;
  isApiConnected?: boolean;
  itineraryDescription?: string;
  faqs?: { question?: string; answer?: string }[];
  [key: string]: unknown;
}

/** GET single/:id response wrapper (old app: setAgentExcursion). */
export interface SingleAttractionResponse {
  attraction: AttractionDetails;
  ticketCount?: unknown;
  ticketStatus?: unknown;
}

/**
 * Price-check response (controller b2bClientAttractionController.js:975).
 * Price lives in pricing[] — one entry per transferType; the old UI renders
 * pricing.find(p => p.transferType === selectedTransfer).totalPrice
 * (ActivityComponent.jsx:2077). There is NO top-level totalPrice.
 */
export interface PricingEntry {
  transferType?: "without" | "shared" | "private" | string;
  totalPrice?: number;
  privateTransfers?: (PrivateTransfer & { pvtTransferId?: string })[];
  [key: string]: unknown;
}

export interface PriceCheckResponse {
  activityId: string;
  hourCount?: number;
  adultCount?: number;
  childCount?: number;
  infantCount?: number;
  date?: string;
  pricing?: PricingEntry[];
  activityType?: string;
  isTimeSlot?: boolean;
  productId?: string;
  productCode?: string;
}

/**
 * Cart item = the activity object with user selections merged in — stored
 * as-is in localStorage "agentExcursionCart" (same key/shape as the old app).
 */
export interface CartItem extends Activity {
  isChecked?: boolean;
  date: string;
  adult: number;
  child: number;
  infant: number;
  hourCount?: number;
  minHour?: number;
  totalPrice?: number;
  transfer: "without" | "shared" | "private" | string;
  selectedTimeSlot?: TimeSlot | null;
  selectedVehicle?: PrivateTransfer[];
  vehicle?: PrivateTransfer[];
  price: number;
  isPromoAdded?: boolean;
  /** display helpers carried by the old app */
  attractionTitle?: string;
  attractionImage?: string;
  /** stored at add-to-cart time for the edit link back to details */
  attractionId?: string;
}

export interface PriceCheckPayload {
  hourCount: number;
  activityType?: string;
  base?: string;
  adultCount: number;
  childCount: number;
  /** old app always sends 0 (duplicate-key quirk preserved as contract) */
  infantCount: 0;
  date: string;
}

export interface TimeSlotPayload {
  productId?: string;
  productCode?: string;
  timeSlotDate: string;
  activityId: string;
}

/** Shaped to b2bAttractionOrder.schema.js exactly — Joi rejects unknown keys. */
export interface SelectedActivityPayload {
  activity: string;
  date: string;
  adultsCount: number;
  childrenCount: number;
  infantCount: number;
  hoursCount: number | "";
  transferType: string;
  /** only the 10 whitelisted slot keys */
  slot?: Pick<
    TimeSlot,
    | "EventID"
    | "EventTypeID"
    | "EventName"
    | "StartDateTime"
    | "EndDateTime"
    | "ResourceID"
    | "Status"
    | "AdultPrice"
    | "ChildPrice"
    | "Available"
  > | null;
  isPromoAdded?: boolean;
  /** required shape when transferType === "private" */
  privateTransfers?: { vehicleId: string; count: number }[];
}

export interface CreateAttractionOrderPayload {
  selectedActivities: SelectedActivityPayload[];
  country: string;
  /** firstname + " " + lastname (joined exactly like the old app) */
  name: string;
  email: string;
  phoneNumber: string;
  agentReferenceNumber: string;
  paymentMethod: "wallet" | "ccavenue" | "tabby";
}

/**
 * Orders list row (old AttractionOrderTable.jsx usage): `activities` is a
 * SINGULAR unwound object per row; status lives at activities.status;
 * ticketDownloadToken at ROW level.
 */
export interface AttractionOrderListItem {
  _id: string;
  referenceNumber?: string;
  agentReferenceNumber?: string;
  name?: string;
  email?: string;
  phoneNumber?: string;
  totalAmount?: number;
  createdAt?: string;
  ticketDownloadToken?: string;
  attraction?: { title?: string; images?: string[] };
  reseller?: { agentCode?: number };
  country?: { countryName?: string };
  activities?: {
    _id: string;
    status?: string;
    bookingType?: string;
    date?: string;
    adultsCount?: number;
    childrenCount?: number;
    infantCount?: number;
    transferType?: string;
    activity?: { name?: string };
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

/**
 * Single-order response (b2bAttractionOrderController.js getSingleAttractionOrder):
 * `{ ...order, ticketDownloadToken }` where line items are grouped into
 * `activites` (BACKEND TYPO — contract; $group $push at controller). Old
 * consumer: AttractionInvoice.jsx maps output.activites.
 */
export interface AttractionOrderDetail {
  _id: string;
  referenceNumber?: string;
  agentReferenceNumber?: string;
  name?: string;
  email?: string;
  totalAmount?: number;
  orderStatus?: string;
  ticketDownloadToken?: string;
  /** sic — backend typo */
  activites?: {
    _id: string;
    activity?: { name?: string };
    attraction?: { title?: string };
    status?: string;
    bookingType?: string;
    date?: string;
    adultsCount?: number;
    childrenCount?: number;
    infantCount?: number;
    transferType?: string;
    adultActivityTotalPrice?: number;
    childActivityTotalPrice?: number;
    infantActivityTotalPrice?: number;
    grandTotal?: number;
    amount?: number;
    [key: string]: unknown;
  }[];
  [key: string]: unknown;
}

export interface AttractionOrdersResponse {
  result: {
    data: AttractionOrderListItem[];
    totalOrders: number;
  };
}

export interface AttractionOrdersFilters {
  skip: number;
  limit: number;
  referenceNo: string;
  status: string;
  attraction: string;
  activity: string;
  dateFrom: string;
  dateTo: string;
  travellerEmail: string;
}
