/**
 * Schema.org JSON-LD builders for the Seminai landing, ported from the reference
 * static landing (landing_page/Seminai.html). The FAQ node is derived from the
 * i18n `landing.faq.items` so the copy has a single source of truth.
 *
 * Used by the homepage <Seo> (src/routes/Home/index.tsx) and the prerender.
 */
import { GEO_DESCRIPTION, OG_IMAGE, SITE_URL, SITE_NAME } from "./seo";

export interface FaqItem {
  question: string;
  answer: string;
}

/** Minimal HTML/entity strip so JSON-LD text stays plain. */
function plain(text: string): string {
  return text
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

const ORG_ID = `${SITE_URL}/#organization`;
const WEBSITE_ID = `${SITE_URL}/#website`;

function buildOrganization() {
  return {
    "@type": "Organization",
    "@id": ORG_ID,
    name: SITE_NAME,
    url: SITE_URL,
    logo: { "@type": "ImageObject", url: OG_IMAGE },
    description: GEO_DESCRIPTION,
    areaServed: { "@type": "Country", name: "Italia" },
    knowsLanguage: "it-IT",
    foundingDate: "2025",
    sameAs: [
      "https://www.linkedin.com/company/seminai",
      "https://www.instagram.com/seminai.it",
    ],
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer support",
      availableLanguage: ["Italian"],
      areaServed: "IT",
    },
  };
}

function buildWebSite() {
  return {
    "@type": "WebSite",
    "@id": WEBSITE_ID,
    url: `${SITE_URL}/`,
    name: SITE_NAME,
    description: GEO_DESCRIPTION,
    inLanguage: "it-IT",
    publisher: { "@id": ORG_ID },
  };
}

function buildSoftwareApplication() {
  return {
    "@type": "SoftwareApplication",
    "@id": `${SITE_URL}/#software`,
    name: SITE_NAME,
    applicationCategory: "BusinessApplication",
    applicationSubCategory: "Agricultural Software",
    operatingSystem: "Web, iOS, Android",
    description: GEO_DESCRIPTION,
    url: SITE_URL,
    inLanguage: "it-IT",
    datePublished: "2025-01-01",
    dateModified: "2026-05-14",
    publisher: { "@id": ORG_ID },
    featureList: [
      "OCR automatico fatture da WhatsApp, PDF, email",
      "Verifica conformità su 4 livelli normativi",
      "Aggiornamento automatico bollettini regionali (20 regioni)",
      "Segnalazione anomalie con fonte normativa",
      "Server europei — conforme GDPR",
      "Esportazione PDF firmabile dall'agronomo",
    ],
    offers: {
      "@type": "AggregateOffer",
      lowPrice: "297",
      highPrice: "3497",
      priceCurrency: "EUR",
      offerCount: "4",
      availability: "https://schema.org/InStock",
    },
  };
}

const PLAN_DATA: ReadonlyArray<{ name: string; price: string; desc: string }> = [
  { name: "Seminai Solo", price: "297", desc: "Piano per agronomi liberi professionisti con poche aziende o singoli agricoltori. Fino a 3 farm." },
  { name: "Seminai Studio 10", price: "697", desc: "Piano per studi tecnici medi. Fino a 10 farm." },
  { name: "Seminai Studio 30", price: "1497", desc: "Piano per studi strutturati con team di tecnici. Fino a 30 farm." },
  { name: "Seminai Studio 80", price: "3497", desc: "Piano per grandi studi o piccoli consorzi. Fino a 80 farm." },
];

function buildProducts() {
  return PLAN_DATA.map((plan) => ({
    "@type": "Product",
    name: plan.name,
    description: plan.desc,
    brand: { "@id": ORG_ID },
    offers: {
      "@type": "Offer",
      price: plan.price,
      priceCurrency: "EUR",
      availability: "https://schema.org/InStock",
      url: `${SITE_URL}/#piani`,
    },
  }));
}

function buildHowTo() {
  const url = `${SITE_URL}/#come-funziona`;
  return {
    "@type": "HowTo",
    name: "Come produrre il quaderno di campagna digitale con Seminai",
    description:
      "Procedura in 3 step per produrre un quaderno di campagna conforme PAC partendo dalle fatture.",
    totalTime: "PT5M",
    inLanguage: "it-IT",
    step: [
      {
        "@type": "HowToStep",
        position: 1,
        name: "Carica le fatture",
        text: "Invia le foto delle fatture via WhatsApp, carica PDF o inoltra le email. Fitofarmaci, sementi, fertilizzanti — anche disorganizzate, anche da fonti diverse.",
        url,
      },
      {
        "@type": "HowToStep",
        position: 2,
        name: "Il sistema elabora e segnala",
        text: "Seminai estrae i dati con OCR, incrocia i dosaggi con le etichette ministeriali e verifica la conformità su 4 livelli normativi aggiornati. Ogni anomalia viene segnalata con fonte e azione correttiva.",
        url,
      },
      {
        "@type": "HowToStep",
        position: 3,
        name: "Rivedi, approvi, consegni",
        text: "In pochi minuti hai il quaderno pronto per la revisione. Controlli, approvi o correggi. Firmi tu — la responsabilità professionale resta del tecnico abilitato.",
        url,
      },
    ],
  };
}

function buildFaqPage(faqItems: FaqItem[]) {
  return {
    "@type": "FAQPage",
    "@id": `${SITE_URL}/#faq`,
    mainEntity: faqItems.map((item) => ({
      "@type": "Question",
      name: plain(item.question),
      acceptedAnswer: { "@type": "Answer", text: plain(item.answer) },
    })),
  };
}

function buildBreadcrumb() {
  return {
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `${SITE_URL}/` },
    ],
  };
}

/** Full @graph for the homepage. `faqItems` come from i18n `landing.faq.items`. */
export function buildHomeGraph(faqItems: FaqItem[]) {
  return {
    "@context": "https://schema.org",
    "@graph": [
      buildWebSite(),
      buildOrganization(),
      buildSoftwareApplication(),
      ...buildProducts(),
      buildHowTo(),
      buildFaqPage(faqItems),
      buildBreadcrumb(),
    ],
  };
}
