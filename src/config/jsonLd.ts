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
    dateModified: "2026-10-27",
    publisher: { "@id": ORG_ID },
    featureList: [
      "Raccolta dati da fatture, DDT, WhatsApp, PDF ed email",
      "Piani delle operazioni future",
      "AI che ottimizza dosi, anomalie e giacenze",
      "Verifica conformità su 4 livelli normativi",
      "Aggiornamento automatico bollettini regionali (20 regioni)",
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
    name: "Come funziona Seminai: raccogli, pianifica, ottimizza",
    description:
      "Tre passi: i documenti entrano nel gestionale, Seminai prepara il piano delle operazioni, l'AI propone le correzioni. La firma resta del professionista.",
    totalTime: "PT5M",
    inLanguage: "it-IT",
    step: [
      {
        "@type": "HowToStep",
        position: 1,
        name: "Raccogli i dati",
        text: "Carica fatture, DDT, foto e messaggi. Seminai li trasforma in anagrafiche, giacenze e righe del quaderno.",
        url,
      },
      {
        "@type": "HowToStep",
        position: 2,
        name: "Prepara il piano",
        text: "Dal registro esce il piano delle operazioni future: cosa fare, su quale appezzamento, con quale prodotto. Lo confermi prima che diventi lavoro.",
        url,
      },
      {
        "@type": "HowToStep",
        position: 3,
        name: "Ottimizza e approva",
        text: "L'AI segnala dosi e anomalie. In chat puoi correggere un dato e vederlo cambiare. Rivedi, approvi e firmi tu.",
        url,
      },
    ],
  };
}

function buildFaqPage(faqItems: FaqItem[], id = `${SITE_URL}/#faq`) {
  return {
    "@type": "FAQPage",
    "@id": id,
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

const MANUFACTURING_DESCRIPTION =
  "Leggi i documenti di trasporto, accetta i carichi a magazzino e modifica le giacenze in chat.";

/** JSON-LD for the manufacturing landing. */
export function buildManufacturingGraph(faqItems: FaqItem[]) {
  return {
    "@context": "https://schema.org",
    "@graph": [
      buildOrganization(),
      {
        "@type": "WebPage",
        "@id": `${SITE_URL}/manifattura#webpage`,
        url: `${SITE_URL}/manifattura`,
        name: "Seminai per la manifattura",
        description: MANUFACTURING_DESCRIPTION,
        isPartOf: { "@id": WEBSITE_ID },
        inLanguage: "it-IT",
      },
      buildFaqPage(faqItems, `${SITE_URL}/manifattura#faq`),
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: `${SITE_URL}/` },
          {
            "@type": "ListItem",
            position: 2,
            name: "Manifattura",
            item: `${SITE_URL}/manifattura`,
          },
        ],
      },
    ],
  };
}
