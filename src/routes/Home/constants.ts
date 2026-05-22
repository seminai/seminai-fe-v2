export const LANDING_LOGIN_URL = "https://app.seminai.tech/login";

export const WHATSAPP_CONTACT = "Francesco";

const WHATSAPP_E164 = "393317424341";
const WHATSAPP_PREFILL_IT =
  "Ciao! Vi invio la fattura per il quaderno di campagna.";
const WHATSAPP_PREFILL_EN =
  "Hi! I'm sending the invoice for the field logbook.";

export function getWhatsAppUrl(language: string): string {
  const text = language.startsWith("en")
    ? WHATSAPP_PREFILL_EN
    : WHATSAPP_PREFILL_IT;
  return `https://wa.me/${WHATSAPP_E164}?text=${encodeURIComponent(text)}`;
}

export const LANDING_LOGO = "/landing/logo.png";

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
