import { apiClient } from "@/lib/api-client";

/**
 * The old B2B frontend used the B2C route (homeSlice.js:37), but the B2B
 * endpoint /b2b/home/initial-data returns a verified-identical response —
 * same queries, same keys { countries, destinations, currencies,
 * popularHotelCities } (b2bHomeController.js:434 vs homeControllers.js:406).
 * User decision 2026-06-12: prefer the B2B route when responses are equal.
 */
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
