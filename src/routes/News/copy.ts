import type { NewsLang } from "@/lib/news";

/**
 * UI copy of the news pages. Language comes from the URL (/news vs /en/news),
 * not from the i18n switcher, so it lives here instead of the i18n JSON.
 */
export const NEWS_COPY = {
  it: {
    section: "News",
    indexTitle: "News | Seminai",
    indexHeading: "News",
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
      "Raccontaci il tuo flusso. Il team ti contatterà per concordare una demo e confermare l’appuntamento.",
    ctaButton: "Richiedi una demo",
  },
  en: {
    section: "News",
    indexTitle: "News | Seminai",
    indexHeading: "News",
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
    ctaText:
      "Tell us about your workflow. The team will contact you to agree and confirm a demo.",
    ctaButton: "Request a demo",
  },
} satisfies Record<NewsLang, Record<string, string>>;
