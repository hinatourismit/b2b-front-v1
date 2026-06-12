import { useMutation, useQuery } from "@tanstack/react-query";
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

export function useTransactions(filters: { skip: number; limit: number; status: string }) {
  return useQuery({
    queryKey: ["wallet", "transactions", filters],
    queryFn: () => walletApi.getTransactions(filters),
    placeholderData: (prev) => prev,
  });
}

export function useCompanyBanks(enabled: boolean) {
  return useQuery({
    queryKey: ["wallet", "company-banks"],
    queryFn: walletApi.getCompanyBanks,
    enabled,
    staleTime: Infinity,
  });
}

export function useAgentBanks(enabled: boolean) {
  return useQuery({
    queryKey: ["wallet", "agent-banks"],
    queryFn: walletApi.getAgentBanks,
    enabled,
  });
}

export function useCardDeposit() {
  return useMutation({ mutationFn: walletApi.cardDeposit });
}

export function useAddDepositRequest() {
  return useMutation({ mutationFn: walletApi.addDepositRequest });
}

export function useWithdrawInitiate() {
  return useMutation({ mutationFn: walletApi.withdrawInitiate });
}

export function useWithdrawComplete() {
  return useMutation({
    mutationFn: ({ id, otp }: { id: string; otp: string }) => walletApi.withdrawComplete(id, otp),
  });
}
