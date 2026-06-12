import { apiClient } from "@/lib/api-client";

/**
 * Old B2B frontend sources initial-data from the B2C route (homeSlice.js:37:
 * GET `/home/initial-data`), NOT /b2b/home — preserved. Response keys
 * { countries, destinations, currencies, popularHotelCities }
 * (homeControllers.js getInitialData).
 */
const BASE = "/home";

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
