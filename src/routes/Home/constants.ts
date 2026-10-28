import { APP_LOGO_SRCSET, APP_LOGO_URL } from "@/config/brand";

export const LANDING_LOGIN_URL = "https://app.seminai.tech/login";
export const CONTACT_URL = "mailto:get.seminai@gmail.com";

export const LANDING_LOGO = APP_LOGO_URL;
export const LANDING_LOGO_SRCSET = APP_LOGO_SRCSET;

export const ANCHORS = {
  how: "/#come-funziona",
  useCases: "/#cosa-puoi-fare",
  faq: "/#faq",
  booking: "/#prenota",
} as const;

export const LEGAL_ROUTES = {
  privacy: "/privacy-policy",
  cookies: "/cookie-policy",
  terms: "/terms-of-service",
} as const;
