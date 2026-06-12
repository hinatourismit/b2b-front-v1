import { apiClient } from "@/lib/api-client";
import type { WalletBalance } from "@/features/auth/types";

const BASE = "/b2b/transactions";

/**
 * Transactions list (old Wallet.jsx:51 → GET ?skip=&limit=&status=).
 * Response `{ result: { data, totalTransactions } }` (old AllTransaction.jsx:48
 * maps transaction?.result?.data). Row fields per AllTransaction.jsx usage.
 */
export interface WalletTransaction {
  _id: string;
  transactionType?: "deposit" | "deduct" | "withdraw" | "refund" | string;
  amount?: number;
  description?: string;
  note?: string;
  paymentProcessor?: string;
  product?: string;
  closingBalance?: number;
  dateTime?: string;
  createdAt?: string;
  [key: string]: unknown;
}

export interface WalletTransactionsResponse {
  result?: {
    data?: WalletTransaction[];
    totalTransactions?: number;
  };
}

export const walletApi = {
  getBalance: async () => (await apiClient.get<WalletBalance>(`${BASE}/balance`)).data,

  getTransactions: async (filters: { skip: number; limit: number; status: string }) =>
    (await apiClient.get<WalletTransactionsResponse>(`${BASE}/all`, { params: filters })).data,
};
