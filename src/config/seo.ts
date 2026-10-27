/**
 * Centralized SEO configuration — single source of truth for the marketing/canonical
 * origin, per-route meta, and shared defaults. Consumed by the <Seo> molecule
 * (src/components/molecules/Seo) and the build-time prerender (src/entry-server.tsx).
 *
 * NOTE: SITE_URL is the marketing/canonical origin only. The app login lives on a
 * different host (app.seminai.tech, see src/routes/Home/constants.ts) — keep them separate.
 */

export const SITE_URL = "https://seminai.tech";
export const SITE_NAME = "Seminai";
export const THEME_COLOR = "#234D34";
export const GEO_DESCRIPTION =
  "Seminai raccoglie fatture, DDT e messaggi in un gestionale, prepara i piani delle operazioni e usa l'AI per ottimizzare dosi, giacenze e conformità. Il quaderno di campagna lo rivedi e lo firmi tu. Passaggio dati gratuito per i primi 200 utenti.";

/** OG/Twitter share image. Keep it lightweight because it is emitted into public HTML. */
export const OG_IMAGE = `${SITE_URL}/og/og-image.jpg`;
export const OG_IMAGE_ALT =
  "Seminai — quaderno di campagna digitale per agronomi e cooperative agricole";

export type SeoLocale = "it_IT" | "en_US";

export interface SeoMeta {
  /** <title> */
  title: string;
  /** meta description */
  description: string;
  /** absolute canonical URL */
  canonical: string;
  /** og:locale */
  locale: SeoLocale;
  /** emit noindex,nofollow (private/auth/conversion pages) */
  noindex?: boolean;
  /** emit it + x-default hreflang alternates (homepage only for now) */
  hreflang?: boolean;
}

/** Build an absolute URL on the canonical origin. */
export function absoluteUrl(path: string): string {
  if (path === "/") return `${SITE_URL}/`;
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

export const SEO: Record<
  "home" | "manufacturing" | "privacy" | "cookie" | "terms" | "beta" | "auth",
  SeoMeta
> = {
  home: {
    title: "Gestionale agricolo con AI — Quaderno di campagna | Seminai",
    description: GEO_DESCRIPTION,
    canonical: absoluteUrl("/"),
    locale: "it_IT",
    hreflang: true,
  },
  manufacturing: {
    title: "Gestionale di magazzino con AI per la manifattura | Seminai",
    description:
      "Leggi i documenti di trasporto, accetta i carichi a magazzino e modifica le giacenze in chat. Seminai è il gestionale con AI per officine e magazzini. Passaggio dati gratuito per i primi 200 utenti.",
    canonical: absoluteUrl("/manifattura"),
    locale: "it_IT",
  },
  privacy: {
    title: "Privacy Policy | Seminai",
    description:
      "Informativa privacy di Seminai: come trattiamo i dati personali in conformità al GDPR (Reg. UE 2016/679). Server europei, dati cifrati, nessun uso per addestrare modelli AI.",
    canonical: absoluteUrl("/privacy-policy"),
    locale: "it_IT",
  },
  cookie: {
    title: "Cookie Policy | Seminai",
    description:
      "Cookie Policy di Seminai: cookie tecnici, analitici e di preferenza usati dalla piattaforma e come gestirli.",
    canonical: absoluteUrl("/cookie-policy"),
    locale: "it_IT",
  },
  terms: {
    title: "Termini di Servizio | Seminai",
    description:
      "Termini e condizioni di servizio della piattaforma Seminai per la produzione del quaderno di campagna digitale.",
    canonical: absoluteUrl("/terms-of-service"),
    locale: "it_IT",
  },
  beta: {
    title: "Diventa Beta Tester | Seminai",
    description:
      "Entra tra i primi studi che costruiscono Seminai. Accordo beta tester e accesso anticipato al quaderno di campagna digitale.",
    canonical: absoluteUrl("/diventa-beta-tester"),
    locale: "it_IT",
    noindex: true,
  },
  auth: {
    title: "Accedi | Seminai",
    description:
      "Accedi alla piattaforma Seminai per gestire il quaderno di campagna digitale delle tue aziende agricole.",
    canonical: absoluteUrl("/auth"),
    locale: "it_IT",
    noindex: true,
  },
};
