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
    dateModified: "2026-10-28",
    publisher: { "@id": ORG_ID },
    featureList: [
      "Estrazione dati da fatture, DDT, etichette, fascicoli aziendali e note manuali",
      "Chat sui dati estratti",
      "Export PDF ed Excel",
      "Compilazione del quaderno di campagna",
      "Verifica dei trattamenti su fonti normative ufficiali",
      "Magazzino e registri aggiornati dai documenti",
      "Server europei — conforme GDPR",
    ],
  };
}

function buildHowTo() {
  const url = `${SITE_URL}/#come-funziona`;
  return {
    "@type": "HowTo",
    name: "Come funziona Seminai: carica, estrai, usa",
    description:
      "Tre passi: carichi i documenti, Seminai estrae e organizza i dati, tu li usi in chat, in PDF o Excel e nel quaderno di campagna.",
    totalTime: "PT5M",
    inLanguage: "it-IT",
    step: [
      {
        "@type": "HowToStep",
        position: 1,
        name: "Carica i documenti",
        text: "Fatture, DDT, etichette, fascicolo aziendale e note a mano, in foto, PDF, scansione o email.",
        url,
      },
      {
        "@type": "HowToStep",
        position: 2,
        name: "Seminai estrae e organizza",
        text: "Prodotti, quantità, lotti, fornitori, date e appezzamenti, ognuno collegato al documento da cui viene.",
        url,
      },
      {
        "@type": "HowToStep",
        position: 3,
        name: "Usa i dati",
        text: "Chiedi in chat, scarica in PDF o Excel, compila il quaderno di campagna.",
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
