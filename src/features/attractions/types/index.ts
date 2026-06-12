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
  EventName?: string;
  StartDateTime?: string;
  EndDateTime?: string;
  Available?: string | number;
  AdultPrice?: number;
  ChildPrice?: number;
  [key: string]: unknown;
}

export interface PrivateTransfer {
  _id?: string;
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

/** Price-check response merges into the activity by activityId (old updateActivity). */
export interface PriceCheckResponse {
  activityId: string;
  totalPrice?: number;
  [key: string]: unknown;
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

export interface SelectedActivityPayload {
  activity: string;
  date: string;
  adultsCount: number;
  childrenCount: number;
  infantCount: number;
  hoursCount: number | "";
  transferType: string;
  slot?: TimeSlot | null;
  isPromoAdded?: boolean;
  privateTransfers?: PrivateTransfer[];
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

export interface AttractionOrderListItem {
  _id: string;
  referenceNumber?: string;
  agentReferenceNumber?: string;
  name?: string;
  email?: string;
  totalAmount?: number;
  orderStatus?: string;
  paymentStatus?: string;
  createdAt?: string;
  activities?: {
    _id: string;
    status?: string;
    ticketDownloadToken?: string;
    [key: string]: unknown;
  };
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
