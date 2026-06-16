import { useMutation, useQuery } from "@tanstack/react-query";
import { hotelsApi } from "./hotels.api";

const KEY = ["hotels"] as const;

export function useHotelHome() {
  return useQuery({ queryKey: [...KEY, "home"], queryFn: hotelsApi.getHome, staleTime: 300_000 });
}

export function useHotelSuggestions(search: string) {
  return useQuery({
    queryKey: [...KEY, "suggestions", search],
    queryFn: () => hotelsApi.getSuggestions(search),
    enabled: search.trim().length > 1,
    staleTime: 60_000,
  });
}

export function useHotelSearch() {
  return useMutation({
    mutationFn: (args: Parameters<typeof hotelsApi.searchAvailability>) =>
      hotelsApi.searchAvailability(args[0], args[1]),
  });
}

export function useSingleHotel(hotelId: string | undefined) {
  return useQuery({
    queryKey: [...KEY, "single", hotelId],
    queryFn: () => hotelsApi.getSingleHotel(hotelId!),
    enabled: Boolean(hotelId),
  });
}

export function useSingleSearch() {
  return useMutation({ mutationFn: hotelsApi.singleSearch });
}

export function useRoomRate() {
  return useMutation({
    mutationFn: ({ hotelId, rateKey, searchId }: { hotelId: string; rateKey: string; searchId: string }) =>
      hotelsApi.roomRate(hotelId, rateKey, searchId),
  });
}

export function useCreateHotelOrder() {
  return useMutation({ mutationFn: hotelsApi.createOrder });
}

export function useCompleteHotelWallet() {
  return useMutation({
    mutationFn: ({ orderId, otp }: { orderId: string; otp: string }) =>
      hotelsApi.completeWallet(orderId, otp),
  });
}

export function useCompleteHotelPayLater() {
  return useMutation({ mutationFn: hotelsApi.completePayLater });
}

export function useHotelOrders(skip: number, limit: number) {
  return useQuery({
    queryKey: [...KEY, "orders", skip, limit],
    queryFn: () => hotelsApi.getOrders(skip, limit),
    placeholderData: (prev) => prev,
  });
}

export function useHotelOrder(orderId: string | undefined) {
  return useQuery({
    queryKey: [...KEY, "order", orderId],
    queryFn: () => hotelsApi.getSingleOrder(orderId!),
    enabled: Boolean(orderId),
  });
}
