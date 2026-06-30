import { useQuery } from "@tanstack/react-query";
import { homeApi } from "./home.api";

export function useInitialData() {
  return useQuery({
    queryKey: ["home", "initial-data"],
    queryFn: homeApi.getInitialData,
    staleTime: Infinity, // countries/currencies are effectively static per session
  });
}

/** Admin-managed home banners — the dynamic source for the flash-promo popup. */
export function useHomeBanners() {
  return useQuery({
    queryKey: ["home", "banners"],
    queryFn: homeApi.getHomeBanners,
    staleTime: 5 * 60 * 1000,
  });
}
