import { apiClient } from "@/lib/api-client";
import type { WalletBalance } from "@/features/auth/types";

const BASE = "/b2b/transactions";

export const walletApi = {
  getBalance: async () => (await apiClient.get<WalletBalance>(`${BASE}/balance`)).data,
};
