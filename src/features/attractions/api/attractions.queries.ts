import { useMutation, useQuery } from "@tanstack/react-query";
import { attractionsApi } from "./attractions.api";
import type { AttractionOrdersFilters, PriceCheckPayload, TimeSlotPayload } from "../types";

const KEY = ["attractions"] as const;

export function useAttractionSearch(search: string) {
  return useQuery({
    queryKey: [...KEY, "search", search],
    queryFn: () => attractionsApi.searchList(search),
    enabled: search.trim().length > 1,
    staleTime: 60_000,
  });
}

export function useAttractionCategories() {
  return useQuery({
    queryKey: [...KEY, "categories"],
    queryFn: attractionsApi.getCategories,
    staleTime: Infinity,
  });
}

export function useAttractionsList(destination: string, category: string) {
  return useQuery({
    queryKey: [...KEY, "list", destination, category],
    queryFn: () => attractionsApi.getAll(destination, category),
  });
}

export function useAttractionDetails(id: string | undefined) {
  return useQuery({
    queryKey: [...KEY, "single", id],
    queryFn: () => attractionsApi.getSingle(id!),
    enabled: Boolean(id),
  });
}

export function usePriceCheck() {
  return useMutation({
    mutationFn: ({ activityId, payload }: { activityId: string; payload: PriceCheckPayload }) =>
      attractionsApi.priceCheck(activityId, payload),
  });
}

export function useTimeSlots() {
  return useMutation({
    mutationFn: (payload: TimeSlotPayload) => attractionsApi.getTimeSlots(payload),
  });
}

export function useCreateAttractionOrder() {
  return useMutation({ mutationFn: attractionsApi.createOrder });
}

export function useCompleteWalletOrder() {
  return useMutation({
    mutationFn: (orderId: string) => attractionsApi.completeWalletOrder(orderId),
  });
}

export function useAttractionOrders(filters: AttractionOrdersFilters) {
  return useQuery({
    queryKey: [...KEY, "orders", filters],
    queryFn: () => attractionsApi.getOrders(filters),
    placeholderData: (prev) => prev,
  });
}

export function useAttractionOrder(orderId: string | undefined) {
  return useQuery({
    queryKey: [...KEY, "order", orderId],
    queryFn: () => attractionsApi.getSingleOrder(orderId!),
    enabled: Boolean(orderId),
  });
}
