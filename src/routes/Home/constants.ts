import { APP_LOGO_SRCSET, APP_LOGO_URL } from "@/config/brand";

export const LANDING_LOGIN_URL = "https://app.seminai.tech/login";

export const LANDING_LOGO = APP_LOGO_URL;
export const LANDING_LOGO_SRCSET = APP_LOGO_SRCSET;

export const ANCHORS = {
  how: "/#come-funziona",
  who: "/#cooperative",
  plans: "/#piani",
  faq: "/#faq",
  trial: "/#trial",
  sources: "/#fonti",
} as const;

export const LEGAL_ROUTES = {
  privacy: "/privacy-policy",
  cookies: "/cookie-policy",
  terms: "/terms-of-service",
} as const;
