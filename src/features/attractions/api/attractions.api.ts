import { apiClient } from "@/lib/api-client";
import { env } from "@/config/env";
import type {
  AttractionListItem,
  AttractionsListResponse,
  AttractionOrdersFilters,
  AttractionOrdersResponse,
  CreateAttractionOrderPayload,
  PriceCheckPayload,
  PriceCheckResponse,
  SingleAttractionResponse,
  TimeSlot,
  TimeSlotPayload,
} from "../types";

/** Domain base paths (microservice-split seam). Strings are contract verbatim. */
const CLIENT = "/b2b/resellers/client/attraction";
const ORDERS = "/b2b/attractions/orders";

export const attractionsApi = {
  searchList: async (search: string) =>
    (await apiClient.get<AttractionListItem[]>(`${CLIENT}/search/list`, { params: { search } })).data,

  /** Old app: B2C categories endpoint, no /b2b prefix — contract. */
  getCategories: async () =>
    (await apiClient.get<{ _id: string; categoryName?: string }[]>("/attractions/categories/all")).data,

  /** Old app pins limit=100 and filters by destination slug + category id. */
  getAll: async (destination: string, category: string) =>
    (
      await apiClient.get<AttractionsListResponse>(`${CLIENT}/all`, {
        params: { limit: 100, destination, category },
      })
    ).data,

  getSingle: async (id: string) =>
    (await apiClient.get<SingleAttractionResponse>(`${CLIENT}/single/${id}`)).data,

  priceCheck: async (activityId: string, payload: PriceCheckPayload) =>
    (await apiClient.post<PriceCheckResponse>(`${CLIENT}/single/price/${activityId}`, payload)).data,

  getTimeSlots: async (payload: TimeSlotPayload) =>
    (await apiClient.post<TimeSlot[]>(`${CLIENT}/timeslot`, payload)).data,

  /**
   * Response varies by paymentMethod (old-app behavior preserved):
   * wallet → order JSON with _id; ccavenue → HTML page; tabby → URL string.
   */
  createOrder: async (payload: CreateAttractionOrderPayload) =>
    (await apiClient.post(`${ORDERS}/create`, payload)).data,

  /** "OTP" is the old app's hardcoded 12345 behind a confirm dialog. */
  completeWalletOrder: async (orderId: string) =>
    (await apiClient.post<{ _id: string; [key: string]: unknown }>(`${ORDERS}/complete/${orderId}`, { otp: 12345 }))
      .data,

  getOrders: async (filters: AttractionOrdersFilters) =>
    (
      await apiClient.get<AttractionOrdersResponse>(`${ORDERS}/all`, {
        params: filters,
      })
    ).data,

  getOrdersSheetBlob: async (filters: Pick<AttractionOrdersFilters, "skip" | "limit" | "referenceNo" | "status">) =>
    (await apiClient.get(`${ORDERS}/all/sheet`, { params: filters, responseType: "blob" })).data as Blob,

  getSingleOrder: async (orderId: string) =>
    (await apiClient.get(`${ORDERS}/single/${orderId}`)).data,

  getInvoiceBlob: async (orderId: string) =>
    (await apiClient.get(`${ORDERS}/single/${orderId}/invoice`, { responseType: "blob" })).data as Blob,

  getSingleTicketBlob: async (orderId: string, activityId: string, ticketNo: string) =>
    (
      await apiClient.get(`${ORDERS}/${orderId}/ticket/${activityId}/single/${ticketNo}`, {
        responseType: "blob",
      })
    ).data as Blob,

  /** Bulk tickets use the top-level app route with a per-item token (plain link). */
  bulkTicketsUrl: (orderId: string, activityId: string, ticketDownloadToken: string) =>
    `${env.VITE_API_URL}/api/v1/download/attractions/orders/b2b/${orderId}/orderItems/${activityId}/tickets?token=${ticketDownloadToken}`,
};
