import type { ModuleFlags } from "@/config/modules";

/**
 * Shapes observed from api-server-main (b2bResellersAuthController). Fields
 * not yet confirmed on a screen are optional — never assume presence.
 */
export interface ResellerConfiguration extends ModuleFlags {
  _id?: string;
  reseller?: string;
}

export interface Agent {
  _id: string;
  role: "reseller" | "sub-agent";
  agentCode: number;
  email: string;
  name?: string;
  companyName?: string;
  address?: string;
  website?: string;
  country?: { _id: string; countryName?: string; phonecode?: string } | string;
  city?: string;
  zipCode?: string | number;
  designation?: string;
  phoneNumber?: string;
  skypeId?: string;
  whatsappNumber?: string;
  trnNumber?: string;
  companyRegistration?: string;
  shortName?: string;
  avatarImg?: string | null;
  status?: "pending" | "ok" | "cancelled" | "disabled";
  configuration?: ResellerConfiguration | null;
}

export interface LoginPayload {
  email: string;
  password: string;
}

/** status === "ok" branch */
export interface LoginSuccessResponse {
  status: "ok";
  reseller: Agent;
  jwtToken: string;
  agentCode: number;
}

/** status === "pending" branch (no token issued) */
export interface LoginPendingResponse {
  status: "pending";
  message: string;
  agentCode: number;
  randomString: string;
}

export type LoginResponse = LoginSuccessResponse | LoginPendingResponse;

export interface ForgotPasswordConfirmPayload {
  email: string;
  otp: string;
  newPassword: string;
  confirmPassword: string;
}

export interface CertificateDetails {
  agentCode: number;
  taxCertificate?: string | null;
  tradeLicense?: string | null;
}

export interface WalletBalance {
  balance: number;
  creditAmount: number;
  creditUsed: number;
  pendingBalance: number;
}
