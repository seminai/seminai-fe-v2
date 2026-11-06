import type { PublicLanguage } from "./publicPaths";
export interface PublicPage {
  id: string;
  lang: PublicLanguage;
  path: string;
  otherPath: string;
  title: string;
  description: string;
  intro: string;
  sections: Array<{ title: string; body: string }>;
  articles: string[];
}
const pages: PublicPage[] = [];
function add(
  id: string,
  paths: [string, string],
  it: Omit<PublicPage, "id" | "lang" | "path" | "otherPath">,
  en: typeof it,
) {
  pages.push({ ...it, id, lang: "it", path: paths[0], otherPath: paths[1] });
  pages.push({ ...en, id, lang: "en", path: paths[1], otherPath: paths[0] });
}
add(
  "field-logbook",
  ["/quaderno-di-campagna/", "/en/field-logbook/"],
  {
    title: "Quaderno di campagna digitale per aziende e agronomi",
    description:
      "Dai documenti al quaderno di campagna: dati collegati ai campi, controlli sulle fonti e una bozza da rivedere con il tecnico.",
    intro:
      "Un registro utile nasce durante il lavoro, con documenti, appezzamenti e operazioni riconoscibili. Seminai aiuta a mettere in relazione questi dati e a preparare il quaderno da controllare.",
    sections: [
      {
        title: "Dalla nota alla registrazione",
        body: "Fatture e note raccontano fatti diversi: un acquisto non dimostra che un trattamento sia stato eseguito. Il tecnico verifica prodotto, data, dose e superficie prima di confermare una registrazione.",
      },
      {
        title: "Controlli con un riferimento",
        body: "Etichette, disciplinari e storico aziendale danno il contesto. Le segnalazioni vanno lette con la fonte applicabile e con i dati del campo: non costituiscono una certificazione automatica di conformità.",
      },
      {
        title: "Una demo sul tuo flusso",
        body: "Durante la demo concordiamo quali documenti, colture e passaggi mostrare. Il quaderno resta soggetto alla revisione e alla responsabilità della persona competente.",
      },
    ],
    articles: [
      "quaderno-compilato-tardi",
      "dose-giusta-superficie-vera",
      "biologico-errore-appezzamento",
    ],
  },
  {
    title: "Digital field logbook for farms and agronomists",
    description:
      "Connect farm documents, plots and operations in a field logbook workflow, with source-based checks and human review.",
    intro:
      "A useful register grows with the work. Seminai helps connect documents, plots and operations and prepare entries for review.",
    sections: [
      {
        title: "From a note to a confirmed entry",
        body: "An invoice records a purchase; it does not prove a treatment took place. A competent person checks the product, date, dose and actual area before confirming an entry.",
      },
      {
        title: "Checks with a source",
        body: "Labels, applicable rules and farm history provide context. A warning needs the relevant source and plot data; it is not an automatic certificate of compliance.",
      },
      {
        title: "A demo of your workflow",
        body: "We agree which documents, crops and steps to show. The final logbook remains subject to professional review and responsibility.",
      },
    ],
    articles: [
      "field-notebook-written-too-late",
      "right-dose-real-area",
      "organic-one-mistake-whole-plot",
    ],
  },
);
add(
  "document-ocr",
  ["/ocr-documenti-agricoli/", "/en/agricultural-document-ocr/"],
  {
    title: "OCR per fatture e DDT agricoli",
    description:
      "Estrai prodotti, quantità e riferimenti da fatture e DDT agricoli. Scopri il flusso OCR e i passaggi di verifica con Seminai.",
    intro:
      "Foto, PDF e documenti di fornitori diversi richiedono un lavoro di lettura e controllo. Seminai propone dati strutturati da confrontare con il documento originale.",
    sections: [
      {
        title: "Quali dati si leggono",
        body: "Il flusso può estrarre intestazioni, righe prodotto, quantità e riferimenti disponibili nel documento. Campi mancanti o ambigui richiedono una verifica; non vengono ricostruiti come fatti certi.",
      },
      {
        title: "Controllare prima di usare",
        body: "Una scansione sfocata, un lotto o una confezione poco chiara possono cambiare il significato di una riga. Il documento di origine resta il riferimento per correggere la proposta prima di usarla nel lavoro aziendale.",
      },
      {
        title: "Valutare il risultato",
        body: "La qualità si valuta su esempi rappresentativi e sul tempo di verifica effettivo, non su una promessa universale di precisione. In demo definiamo insieme un campione adatto.",
      },
    ],
    articles: [
      "ocr-fatture-fitofarmaci",
      "dati-sparsi-azienda-agricola",
      "magazzino-e-registro",
    ],
  },
  {
    title: "OCR for agricultural invoices and delivery notes",
    description:
      "Extract products, quantities and references from agricultural invoices and delivery notes, with a clear review workflow.",
    intro:
      "Supplier PDFs and phone photos need reading and checking. Seminai proposes structured data that can be compared with the original document.",
    sections: [
      {
        title: "What can be extracted",
        body: "Available headings, product lines, quantities and references can be extracted. Missing or ambiguous fields need review rather than being presented as established facts.",
      },
      {
        title: "Review before use",
        body: "A blurred scan, batch number or pack size can change the meaning of a line. The original document remains the reference for correcting a proposal.",
      },
      {
        title: "Evaluate on a representative sample",
        body: "Assess extraction quality and actual review time on documents that reflect your work. We agree a suitable sample during the demo rather than promising universal accuracy.",
      },
    ],
    articles: [
      "agricultural-invoice-ocr",
      "scattered-farm-data",
      "warehouse-and-register",
    ],
  },
);
add(
  "agronomists",
  ["/software-studi-agronomici/", "/en/software-for-agronomists/"],
  {
    title: "Software per studi agronomici e consulenti",
    description:
      "Organizza documenti e registri di più aziende agricole con Seminai. Meno ricopiature, fonti riconoscibili e revisione professionale.",
    intro:
      "Seguire più aziende significa ricevere file, foto e richieste in formati diversi. Il primo obiettivo è rendere riconoscibile ogni fatto e la sua azienda di appartenenza.",
    sections: [
      {
        title: "Un archivio leggibile",
        body: "Documenti, campi e operazioni devono poter essere ricondotti all'azienda corretta. Durante la demo verifichiamo il flusso di raccolta, consultazione e preparazione dei registri del tuo studio.",
      },
      {
        title: "Il tempo della revisione",
        body: "Le proposte automatiche aiutano soltanto quando si possono verificare. Fonti e correzioni rendono il lavoro leggibile anche da chi dovrà rivederlo dopo.",
      },
      {
        title: "Partire senza sostituire tutto",
        body: "Partiamo da un flusso circoscritto e dai sistemi già in uso. Le integrazioni e i formati di scambio si valutano esplicitamente, senza promettere compatibilità non verificate.",
      },
    ],
    articles: [
      "tempo-dei-tecnici",
      "tenere-i-software-che-avete",
      "ai-propone-persona-decide",
    ],
  },
  {
    title: "Farm management software for agronomy practices",
    description:
      "Organise documents and registers across farm clients, with traceable sources, less copying and professional review.",
    intro:
      "Supporting several farms means receiving files, photos and requests in many formats. Each fact needs a clear source and the correct farm context.",
    sections: [
      {
        title: "An archive people can follow",
        body: "Documents, plots and operations must belong to the right farm. The demo explores collection, consultation and register preparation for your practice.",
      },
      {
        title: "Time for review",
        body: "Automated proposals help when they can be checked. Sources and corrections make work understandable to the next reviewer.",
      },
      {
        title: "Start with one workflow",
        body: "We start with a defined process and the systems you already use. Integrations and exchange formats are assessed explicitly rather than assumed compatible.",
      },
    ],
    articles: [
      "where-advisers-time-goes",
      "keep-the-software-you-already-use",
      "ai-proposes-person-decides",
    ],
  },
);
add(
  "api",
  ["/api-agricoltura/", "/en/agricultural-api/"],
  {
    title: "API OCR per documenti agricoli e integrazioni",
    description:
      "Integra l'estrazione di fatture e DDT agricoli tramite l'API Seminai. Contratto OpenAPI, autenticazione e valutazione tecnica in demo.",
    intro:
      "Per chi sviluppa un gestionale, l'API di estrazione consente di proporre dati strutturati a partire da fatture e documenti di trasporto.",
    sections: [
      {
        title: "Un contratto verificabile",
        body: "Il riferimento è la documentazione OpenAPI. L'endpoint di estrazione documenti usa una chiave API e accetta i tipi invoice, ddt e auto; i formati supportati e gli errori vanno verificati nella documentazione corrente.",
      },
      {
        title: "L'integrazione nel tuo backend",
        body: "La chiave resta sul tuo server. Il sistema che riceve il risultato deve gestire errori e revisione dei dati prima di produrre movimenti o registrazioni definitive.",
      },
      {
        title: "Concordare il perimetro",
        body: "In demo definiamo documenti, volumi, vincoli e responsabilità. Costi, accesso e livelli di servizio si confermano con il team: non sono impliciti in questa pagina.",
      },
    ],
    articles: ["api-seminai-integrazione-15-minuti", "ocr-fatture-fitofarmaci"],
  },
  {
    title: "Agricultural document OCR API and integrations",
    description:
      "Integrate invoice and delivery-note extraction through the Seminai API. Review the OpenAPI contract and discuss your workflow in a demo.",
    intro:
      "For software teams building farm management systems, the extraction API proposes structured data from invoices and delivery notes.",
    sections: [
      {
        title: "A verifiable contract",
        body: "OpenAPI documentation is the reference. Document extraction uses an API key and accepts invoice, ddt and auto. Check the current contract for supported formats and errors.",
      },
      {
        title: "Integrate in your backend",
        body: "Keep the key on your server. Handle errors and review extracted data before creating final stock movements or register entries.",
      },
      {
        title: "Agree the scope",
        body: "A demo defines documents, volumes, constraints and responsibilities. Access, pricing and service levels are confirmed with the team, not implied by this page.",
      },
    ],
    articles: [
      "agricultural-document-extraction-api",
      "agricultural-invoice-ocr",
    ],
  },
);
add(
  "about",
  ["/chi-siamo/", "/en/about/"],
  {
    title: "Chi è Seminai",
    description:
      "Seminai aiuta aziende agricole e professionisti a collegare documenti, campi e registri. Scopri il progetto e richiedi una demo.",
    intro:
      "Seminai è un progetto software per rendere utilizzabili i dati che le aziende agricole producono già: fatture, documenti di trasporto, note e registri.",
    sections: [
      {
        title: "Come lavoriamo",
        body: "L'intelligenza artificiale propone letture e collegamenti; una persona competente controlla il risultato prima che entri in un processo reale. Fonti e limiti devono essere riconoscibili.",
      },
      {
        title: "Parlare con il team",
        body: "La demo parte dal lavoro concreto dell'azienda o dello studio. Usiamo esempi sintetici per illustrare il prodotto e concordiamo separatamente l'eventuale uso di documenti reali.",
      },
    ],
    articles: ["ai-propone-persona-decide"],
  },
  {
    title: "About Seminai",
    description:
      "Seminai helps farms and agronomists connect documents, plots and records. Learn about the project and request a demo.",
    intro:
      "Seminai is a software project that makes existing farm information useful: invoices, delivery notes, field notes and registers.",
    sections: [
      {
        title: "How we work",
        body: "AI proposes readings and connections. A competent person checks the result before it becomes part of a real process. Sources and limitations must remain visible.",
      },
      {
        title: "Talk to the team",
        body: "A demo starts with your farm or practice workflow. We use synthetic examples to explain the product and separately agree any use of real documents.",
      },
    ],
    articles: ["ai-proposes-person-decides"],
  },
);
add(
  "editorial",
  ["/politica-editoriale/", "/en/editorial-policy/"],
  {
    title: "Politica editoriale e fonti",
    description:
      "Come Seminai prepara, corregge e aggiorna le guide: fonti verificabili, esempi dichiarati e responsabilità editoriale.",
    intro:
      "Le guide sono curate dalla Redazione Seminai. Descrivono problemi e possibilità operative; non sostituiscono una valutazione agronomica o normativa del caso concreto.",
    sections: [
      {
        title: "Responsabilità e revisione",
        body: "La Redazione Seminai è responsabile dei contenuti pubblicati. Un revisore individuale è indicato soltanto dopo averne verificato identità, competenze e approvazione. Le bozze di aggiornamento vengono sottoposte alla revisione del team prima del rilascio.",
      },
      {
        title: "Fonti ed esempi",
        body: "Le fonti sono collegate al punto pertinente. Una ricerca descrive il suo ambito e non dimostra da sola le prestazioni di Seminai. Esempi e dati sintetici sono dichiarati; numeri commerciali richiedono una misura documentata.",
      },
      {
        title: "Date e correzioni",
        body: "La data di pubblicazione resta quella originaria. Una modifica sostanziale aggiorna la data di revisione; visite e ritocchi grafici non indicano una nuova verifica. Le segnalazioni si possono inviare al team dalla pagina di contatto demo.",
      },
    ],
    articles: [],
  },
  {
    title: "Editorial policy and sources",
    description:
      "How Seminai prepares and updates its guides: verifiable sources, labelled examples and clear editorial responsibility.",
    intro:
      "Guides are prepared by the Seminai editorial team. They describe workflows and limitations and do not replace case-specific agronomic or regulatory advice.",
    sections: [
      {
        title: "Responsibility and review",
        body: "The Seminai editorial team is responsible for published content. Individual reviewers are named only after their identity, qualifications and approval are verified. Update drafts are reviewed by the team before release.",
      },
      {
        title: "Sources and examples",
        body: "Sources are linked where relevant. A research paper does not itself demonstrate Seminai performance. Illustrative examples and synthetic data are labelled; commercial figures require documented measurements.",
      },
      {
        title: "Dates and corrections",
        body: "Original publication dates are retained. Substantive edits update the modification date; visits and styling changes do not imply a new review. Corrections can be sent to the team through the demo contact page.",
      },
    ],
    articles: [],
  },
);
add(
  "resources",
  ["/risorse/", "/en/resources/"],
  {
    title: "Guide e risorse per i dati agricoli",
    description:
      "Guide su documenti, quaderno di campagna e magazzino, con i cataloghi delle skill AI e delle regole pubbliche di Seminai.",
    intro:
      "Un punto di partenza per collegare ciò che arriva dai documenti al lavoro dei campi e ai registri. Le guide spiegano i passaggi; i cataloghi distinguono i workflow AI dalle regole rese pubbliche.",
    sections: [
      {
        title: "Scegli il tuo percorso",
        body: "Parti dalla lettura dei documenti, dall'organizzazione del quaderno o dal lavoro dello studio. Ogni pagina collega guide di approfondimento e fonti, insieme a una richiesta demo per discutere il tuo caso.",
      },
    ],
    articles: [
      "perche-centralizzare-i-dati-agricoli",
      "ocr-fatture-fitofarmaci",
      "disciplinari-agronomici-digitali",
    ],
  },
  {
    title: "Farm data guides and resources",
    description:
      "Guides to farm documents, field logbooks and stock records, alongside Seminai's public AI skills and rules catalogues.",
    intro:
      "Start connecting incoming documents with field work and registers. Guides explain the steps; the catalogues separate public AI workflows from published rules.",
    sections: [
      {
        title: "Choose your starting point",
        body: "Begin with document extraction, logbook preparation or your practice workflow. Each page links to further reading and sources, with a demo request to discuss your case.",
      },
    ],
    articles: [
      "why-centralize-farm-data",
      "agricultural-invoice-ocr",
      "digital-agronomic-rules",
    ],
  },
);
export const PUBLIC_PAGES: readonly PublicPage[] = pages;
