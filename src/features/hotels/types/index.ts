/**
 * Verified against b2b-front-main hotel pages + api-server-main
 * b2bHotelAvailabilitiesController / b2bHotelOrdersController.
 * See docs/documentation/08-hotels-contract.md.
 */

export interface RoomOccupancy {
  noOfAdults: number;
  noOfChildren: number;
  childrenAges: number[];
}

export type SuggestionType = "CITY" | "AREA" | "HOTEL";

export interface HotelSuggestion {
  _id: string;
  suggestionType: SuggestionType;
  countryName?: string;
  stateName?: string;
  cityName?: string;
  hotelName?: string;
  hotelId?: string;
  name?: string;
  [key: string]: unknown;
}

/** GET search/suggestions → grouped arrays (controller :319). */
export interface SuggestionsResponse {
  cities: HotelSuggestion[];
  areas: HotelSuggestion[];
  hotels: HotelSuggestion[];
}

/** The chosen suggestion sent as `searchQuery` in the availability search. */
export interface SearchQuery {
  id?: string;
  _id?: string;
  suggestionType: SuggestionType;
  [key: string]: unknown;
}

export interface HotelSummary {
  _id?: string;
  hotelId?: string;
  hotelName?: string;
  image?: { path?: string; isRelative?: boolean } | string;
  starCategory?: number | string;
  accommodationType?: string;
  address?: string;
  country?: { countryName?: string } | string;
  state?: { stateName?: string } | string;
  distanceFromCity?: string | number;
  featuredAmenities?: { name?: string; icon?: string }[];
  [key: string]: unknown;
}

/** A row in the results list. */
export interface AvailabilityResultItem {
  hotel: HotelSummary;
  minRate?: number;
  totalOffer?: number;
  [key: string]: unknown;
}

export interface SearchAvailabilityBody {
  searchQuery: SearchQuery | null;
  fromDate: string; // YYYY-MM-DD
  toDate: string;
  rooms: RoomOccupancy[];
  nationality?: string;
  priceType?: string;
}

export interface SearchAvailabilityResponse {
  searchId: string;
  totalHotels: number;
  filteredHotelsCount: number;
  skip: number;
  limit: number;
  hotels: AvailabilityResultItem[];
  fromDate: string;
  toDate: string;
  roomPaxes: RoomOccupancy[];
  appliedFilters?: Record<string, unknown>;
  filters?: unknown;
  sortBy?: string;
}

export interface SearchFilters {
  skip: number;
  limit: number;
  searchId: string;
  accommodationTypes: string[];
  priceFrom: string;
  priceTo: string;
  starCategories: (number | string)[];
  boardTypes: string[];
  chains: string[];
  amenities: string[];
  sortBy: string;
}

/** A rate option within a room (old AvailabilitySection `sub`). */
export interface HotelRate {
  rateKey: string;
  rateName?: string;
  netPrice?: number;
  grossPrice?: number;
  availableAllocation?: number;
  cancellationType?: string;
  cancellationPolicies?: unknown[];
  boardName?: string;
  boardCode?: string;
  selectedRoomOccupancies?: { text?: string }[] | string[];
  rateComments?: string[];
  promotions?: { text?: string }[];
  provider?: string;
  isApiConnected?: boolean;
  [key: string]: unknown;
}

/** A room type with its rates (old AvailabilitySection `item`). */
export interface HotelRoom {
  roomTypeId?: string;
  roomId?: string;
  standardName?: string;
  roomType?: {
    roomName?: string;
    images?: string[];
    areaInM2?: number | string;
    amenities?: string[];
  };
  rates: HotelRate[];
  [key: string]: unknown;
}

/** Static hotel detail (GET single/:hotelId). */
export interface HotelDetail {
  _id: string;
  hotelName?: string;
  description?: string;
  images?: string[];
  starCategory?: number | string;
  address?: string;
  landMark?: string;
  city?: { cityName?: string } | string;
  state?: { stateName?: string } | string;
  country?: { countryName?: string } | string;
  amenities?: { name?: string; icon?: string }[];
  featuredAmenities?: { name?: string; icon?: string }[];
  checkInTime?: string;
  checkOutTime?: string;
  distanceFromCity?: string | number;
  geoCode?: { lat?: number; lng?: number; latitude?: number; longitude?: number };
  roomsCount?: number;
  floorsCount?: number;
  [key: string]: unknown;
}

export interface SingleSearchBody {
  fromDate: string;
  toDate: string;
  rooms: RoomOccupancy[];
  nationality?: string;
  hotelId: string;
  priceType?: string;
}

export interface SingleSearchResponse {
  rooms: HotelRoom[];
  roomPaxes: RoomOccupancy[];
  fromDate: string;
  toDate: string;
  noOfNights: number;
  searchId: string;
}

export interface TravellerDetail {
  roomId?: string;
  title: string;
  firstName: string;
  lastName: string;
  age?: number | string;
  gender?: string;
  type?: string;
}

export interface RoomRateResponse {
  allowedPaymentMethods: string[];
  hotel: HotelSummary;
  rate: HotelRate;
  roomPaxes: RoomOccupancy[];
  fromDate: string;
  toDate: string;
  noOfNights: number;
  travellerDetails: TravellerDetail[];
  expiresIn: number;
  searchId: string;
}

export interface ContactDetails {
  country: string;
  email: string;
  phoneNumber: string;
}

export interface CreateHotelOrderBody {
  rateKey: string;
  hotelId: string;
  searchId: string;
  travellerDetails: TravellerDetail[];
  contactDetails: ContactDetails;
  specialRequest: string;
  paymentMethod?: "wallet" | "ccavenue" | "pay-later";
}

export interface HotelOrderListItem {
  _id: string;
  referenceNumber?: string;
  hotelName?: string;
  hotel?: { hotelName?: string };
  checkInDate?: string;
  checkOutDate?: string;
  fromDate?: string;
  toDate?: string;
  netPrice?: number;
  totalAmount?: number;
  status?: string;
  orderStatus?: string;
  createdAt?: string;
  [key: string]: unknown;
}

export interface HotelOrdersResponse {
  hotelOrders: HotelOrderListItem[];
  totalHotelOrders: number;
}
