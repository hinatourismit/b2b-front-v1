import { apiClient } from "@/lib/api-client";
import type {
  Agent,
  CertificateDetails,
  ForgotPasswordConfirmPayload,
  LoginPayload,
  LoginResponse,
} from "../types";

/**
 * Domain base path — future microservice split repoints this one constant.
 * Endpoint strings are backend contract verbatim (incl. `profileSetings` typo).
 */
const BASE = "/b2b/resellers/auth";
const RESELLERS = "/b2b/resellers";

export const authApi = {
  login: async (payload: LoginPayload) =>
    (await apiClient.post<LoginResponse>(`${BASE}/login`, payload)).data,

  /** multipart: company + contact fields, attachments[i][name] + attachments[i][file] */
  signup: async (formData: FormData) =>
    (await apiClient.post(`${BASE}/signup`, formData)).data,

  getReseller: async () => (await apiClient.get<Agent>(`${BASE}/getReseller`)).data,

  updatePassword: async (payload: { oldPassword: string; newPassword: string }) =>
    (await apiClient.patch(`${BASE}/update/password`, payload)).data,

  getCertificateDetails: async (agentCode: string, randomString: string) =>
    (await apiClient.get<CertificateDetails>(`${BASE}/certificate/${agentCode}/${randomString}`)).data,

  forgotPassword: async (email: string) =>
    (await apiClient.patch<{ agentCode: number; message: string }>(`${RESELLERS}/forget/password`, { email })).data,

  forgotPasswordConfirm: async (payload: ForgotPasswordConfirmPayload) =>
    (await apiClient.patch<{ agentCode: number; message: string }>(`${RESELLERS}/forget/password/confirm`, payload))
      .data,
};
