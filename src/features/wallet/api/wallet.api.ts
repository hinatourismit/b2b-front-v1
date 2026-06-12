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

/** Company bank account (deposit destination) — GET /b2b/company/bank-info/all. */
export interface CompanyBank {
  _id: string;
  bankName?: string;
  accountNumber?: string;
  accountHolderName?: string;
  branchName?: string;
  ibanCode?: string;
  [key: string]: unknown;
}

/** Agent's saved withdrawal bank account — GET /b2b/banks/all. */
export interface AgentBankAccount {
  _id: string;
  bankName?: string;
  branchName?: string;
  accountHolderName?: string;
  accountNumber?: string;
  ifscCode?: string;
  ibanCode?: string;
  isoCode?: string;
  [key: string]: unknown;
}

/** Old WithdrawModal.jsx:107-114 — note `bankDeatilId` backend typo. */
export type WithdrawInitiatePayload =
  | {
      isNewBankAccount: true;
      isoCode: string;
      bankName: string;
      branchName: string;
      accountHolderName: string;
      accountNumber: string;
      ifscCode: string;
      ibanCode: string;
      amount: number;
    }
  | {
      isNewBankAccount: false;
      amount: number;
      bankDeatilId: string;
    };

export const walletApi = {
  getBalance: async () => (await apiClient.get<WalletBalance>(`${BASE}/balance`)).data,

  getTransactions: async (filters: { skip: number; limit: number; status: string }) =>
    (await apiClient.get<WalletTransactionsResponse>(`${BASE}/all`, { params: filters })).data,

  /** Card top-up (old CCAvenuePaymentComponent.jsx:16) — response is an HTML page. */
  cardDeposit: async (amount: number) =>
    (await apiClient.post(`/b2b/resellers/wallet/deposit`, { paymentProcessor: "ccavenue", amount }))
      .data as string,

  getCompanyBanks: async () =>
    (await apiClient.get<CompanyBank[]>(`/b2b/company/bank-info/all`)).data,

  /** Bank deposit request (old DepositModal.jsx:48-58) — multipart. */
  addDepositRequest: async (payload: {
    referenceNumber: string;
    amount: string;
    companyBankId: string;
    receipt: File;
  }) => {
    const fd = new FormData();
    fd.append("referenceNumber", payload.referenceNumber);
    fd.append("amount", payload.amount);
    fd.append("companyBankId", payload.companyBankId);
    fd.append("receipt", payload.receipt);
    return (await apiClient.post(`/b2b/wallets/deposit-requests/add`, fd)).data;
  },

  getAgentBanks: async () => (await apiClient.get<AgentBankAccount[]>(`/b2b/banks/all`)).data,

  withdrawInitiate: async (payload: WithdrawInitiatePayload) =>
    (
      await apiClient.post<{ withdrawRequestId: string; [key: string]: unknown }>(
        `/b2b/wallets/withdraw-requests/initiate`,
        payload,
      )
    ).data,

  withdrawComplete: async (withdrawRequestId: string, otp: string) =>
    (
      await apiClient.post<{ success?: string; [key: string]: unknown }>(
        `/b2b/wallets/withdraw-requests/complete/${withdrawRequestId}`,
        { otp },
      )
    ).data,
};
