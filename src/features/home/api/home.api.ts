import { apiClient } from "@/lib/api-client";

const BASE = "/b2b/home";

export interface Country {
  _id: string;
  countryName: string;
  isocode?: string;
  phonecode?: string;
  flag?: string;
}

export interface InitialData {
  countries: Country[];
  destinations: unknown[];
  currencies: unknown[];
  [key: string]: unknown;
}

export const homeApi = {
  getInitialData: async () => (await apiClient.get<InitialData>(`${BASE}/initial-data`)).data,
};
