import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/features/auth/store/auth.store";
import { walletApi } from "./wallet.api";

export const balanceQueryKey = ["wallet", "balance"] as const;

export function useBalance() {
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  return useQuery({
    queryKey: balanceQueryKey,
    queryFn: walletApi.getBalance,
    enabled: isLoggedIn,
    staleTime: 30_000,
  });
}
