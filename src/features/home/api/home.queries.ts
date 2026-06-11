import { useQuery } from "@tanstack/react-query";
import { homeApi } from "./home.api";

export function useInitialData() {
  return useQuery({
    queryKey: ["home", "initial-data"],
    queryFn: homeApi.getInitialData,
    staleTime: Infinity, // countries/currencies are effectively static per session
  });
}
