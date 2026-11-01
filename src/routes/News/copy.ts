import type { NewsLang } from "@/lib/news";

/** UTM-tagged so signups from the news are attributable without JS. */
export const NEWS_SIGNUP_URL =
  "https://app.seminai.tech/register?utm_source=seminai.tech&utm_medium=referral&utm_campaign=news";

/**
 * UI copy of the news pages. Language comes from the URL (/news vs /en/news),
 * not from the i18n switcher, so it lives here instead of the i18n JSON.
 */
export const NEWS_COPY = {
  it: {
    section: "News",
    indexTitle: "News | Seminai",
    indexHeading: "News",
    indexLead:
      "Quaderno di campagna, regole, PAC, dati e intelligenza artificiale spiegati in modo semplice, con fonti verificabili.",
    indexDescription:
      "Articoli di Seminai su quaderno di campagna, normativa fitosanitaria, PAC, dati agricoli e intelligenza artificiale, spiegati in modo semplice.",
    home: "Home",
    breadcrumb: "Percorso di navigazione",
    updatedAt: "Aggiornato al",
    readAlso: "Da leggere insieme",
    faq: "Domande frequenti",
    sources: "Fonti",
    accessed: "consultata il",
    researchLabel: "Cosa dice la ricerca",
    inPractice: "In pratica",
    infographic: "Infografica in arrivo",
    ctaText:
      "Prova Seminai gratis per 14 giorni. Carica le fatture, ricevi il quaderno pronto da rivedere.",
    ctaButton: "Inizia la prova gratuita",
    allNews: "Tutte le news",
    readMore: "Leggi",
  },
  en: {
    section: "News",
    indexTitle: "News | Seminai",
    indexHeading: "News",
    indexLead:
      "Spray records, rules, the CAP, farm data and artificial intelligence explained simply, with sources you can check.",
    indexDescription:
      "Seminai articles on Italian spray records, plant protection rules, the CAP, farm data and artificial intelligence, explained simply.",
    home: "Home",
    breadcrumb: "Breadcrumb",
    updatedAt: "Updated on",
    readAlso: "Read also",
    faq: "Questions people ask",
    sources: "Sources",
    accessed: "accessed on",
    researchLabel: "What the research says",
    inPractice: "In practice",
    infographic: "Infographic coming soon",
    ctaText: "Try Seminai free for 14 days. Upload your invoices, get a register ready for review.",
    ctaButton: "Start the free trial",
    allNews: "All news",
    readMore: "Read",
  },
} satisfies Record<NewsLang, Record<string, string>>;
