import { apiClient } from "@/lib/api-client";
import type {
  CreateHotelOrderBody,
  HotelDetail,
  HotelOrdersResponse,
  RoomRateResponse,
  SearchAvailabilityBody,
  SearchAvailabilityResponse,
  SearchFilters,
  SingleSearchBody,
  SingleSearchResponse,
  SuggestionsResponse,
} from "../types";

const AVAIL = "/b2b/hotels/availabilities";
const ORDERS = "/b2b/hotels/orders";

function filterQuery(f: Partial<SearchFilters>): string {
  const p = new URLSearchParams();
  p.set("limit", String(f.limit ?? 10));
  p.set("skip", String(f.skip ?? 0));
  if (f.searchId) p.set("searchId", f.searchId);
  p.set("accommodationTypes", JSON.stringify(f.accommodationTypes ?? []));
  p.set("priceFrom", f.priceFrom ?? "");
  p.set("priceTo", f.priceTo ?? "");
  p.set("starCategories", JSON.stringify(f.starCategories ?? []));
  p.set("boardTypes", JSON.stringify(f.boardTypes ?? []));
  p.set("chains", JSON.stringify(f.chains ?? []));
  p.set("amenities", JSON.stringify(f.amenities ?? []));
  p.set("sortBy", f.sortBy ?? "");
  return p.toString();
}

export const hotelsApi = {
  getHome: async () => (await apiClient.get(`/b2b/hotels/home`)).data,

  getSuggestions: async (search: string) =>
    (await apiClient.get<SuggestionsResponse>(`${AVAIL}/search/suggestions`, { params: { search } }))
      .data,

  searchAvailability: async (filters: Partial<SearchFilters>, body: SearchAvailabilityBody) =>
    (await apiClient.post<SearchAvailabilityResponse>(`${AVAIL}/search?${filterQuery(filters)}`, body))
      .data,

  getSingleHotel: async (hotelId: string) =>
    (await apiClient.get<HotelDetail>(`${AVAIL}/single/${hotelId}`)).data,

  singleSearch: async (body: SingleSearchBody) =>
    (await apiClient.post<SingleSearchResponse>(`${AVAIL}/single/search`, body)).data,

  roomRate: async (hotelId: string, rateKey: string, searchId: string) =>
    (await apiClient.post<RoomRateResponse>(`${AVAIL}/booking/room-rate`, { hotelId, rateKey, searchId }))
      .data,

  /** wallet → order JSON; ccavenue → HTML page string */
  createOrder: async (body: CreateHotelOrderBody) =>
    (await apiClient.post(`${ORDERS}/create`, body)).data,

  completeWallet: async (orderId: string, otp: string) =>
    (await apiClient.post<{ _id: string; [k: string]: unknown }>(`${ORDERS}/${orderId}/complete`, { otp }))
      .data,

  completePayLater: async (body: Omit<CreateHotelOrderBody, "paymentMethod">) =>
    (await apiClient.post<{ _id: string; [k: string]: unknown }>(`${ORDERS}/complete/pay-later`, body)).data,

  getOrders: async (skip: number, limit: number) =>
    (await apiClient.get<HotelOrdersResponse>(`${ORDERS}/all`, { params: { skip, limit } })).data,

  getSingleOrder: async (orderId: string) =>
    (await apiClient.get(`${ORDERS}/single/${orderId}`)).data,

  getVoucherBlob: async (orderId: string) =>
    (await apiClient.get(`${ORDERS}/voucher/${orderId}`, { responseType: "blob" })).data as Blob,

  getInvoiceBlob: async (orderId: string) =>
    (await apiClient.get(`${ORDERS}/invoice/${orderId}`, { responseType: "blob" })).data as Blob,

  cancelOrder: async (orderId: string, cancellationRemark: string) =>
    (await apiClient.post(`${ORDERS}/cancel/${orderId}`, { cancellationRemark })).data,
};
