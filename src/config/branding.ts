/**
 * Single source for every company-specific value. Swap these when the final
 * Hina Tourism brand assets arrive — feature code must never hard-code any
 * of this. (See docs/documentation/04-environment-config.md.)
 */
export const branding = {
  name: "Hina Tourism",
  shortName: "Hina",
  shortCode: "HINA",
  tagline: "Your gateway to unforgettable journeys",

  logo: "/logo.svg",
  favicon: "/favicon.svg",

  address: {
    line: "Dubai", // TODO: real address pending
    city: "Dubai",
    country: "United Arab Emirates",
  },

  contact: {
    email: "info@hinatourism.com", // TODO: pending
    enquiryEmail: "info@hinatourism.com",
    phone: "",
    whatsapp: "",
  },

  social: {
    facebook: "",
    instagram: "",
  },
} as const;
