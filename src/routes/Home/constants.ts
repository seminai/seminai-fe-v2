import { APP_LOGO_SRCSET, APP_LOGO_URL } from "@/config/brand";

export const LANDING_LOGIN_URL = "https://app.seminai.tech/login";
export const LANDING_REGISTER_URL = "https://app.seminai.tech/register";
export const MANUFACTURING_CONTACT_URL =
  "mailto:info@seminai.tech?subject=Seminai%20manifattura";
export const DEMO_URL = "mailto:info@seminai.tech?subject=Richiesta%20demo%20Seminai";
export const CONTACT_URL = "mailto:info@seminai.tech";

export const LANDING_LOGO = APP_LOGO_URL;
export const LANDING_LOGO_SRCSET = APP_LOGO_SRCSET;

export const ANCHORS = {
  how: "/#come-funziona",
  capabilities: "/#cosa-puoi-fare",
  who: "/#per-chi",
  faq: "/#faq",
  manufacturing: "/manifattura",
  sources: "/#fonti",
  contact: "/#contatti",
} as const;

export const LEGAL_ROUTES = {
  privacy: "/privacy-policy",
  cookies: "/cookie-policy",
  terms: "/terms-of-service",
} as const;
