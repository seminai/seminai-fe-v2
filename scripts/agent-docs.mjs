/**
 * Build-time agent docs. Runs after prerender.mjs and writes, inside dist/:
 *
 *   index.md, index.en.md        homepage as Markdown, from the landing i18n copy
 *   <legal-page>.md              legal pages as Markdown, from their prerendered HTML
 *   llms.txt                     llmstxt.org index: summary + links to every .md page
 *   llms-full.txt                all of the above in one file
 *   .well-known/agent-skills/index.json   sha256 of each SKILL.md recomputed
 *
 * The homepage is built from the i18n JSON rather than its HTML because the prerendered
 * HTML only holds the first tab and the first rotating word; the copy has everything.
 * Generating on every build keeps the agent-facing files in sync with the site.
 */
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
const distDir = join(root, "dist");
const SITE = "https://seminai.tech";
const APP_LOGIN = "https://app.seminai.tech/login";
const CONTACT = "get.seminai@gmail.com";

const landing = {
  it: JSON.parse(readFileSync(join(root, "src/i18n/locales/landing-it.json"), "utf-8")),
  en: JSON.parse(readFileSync(join(root, "src/i18n/locales/landing-en.json"), "utf-8")),
};

const LEGAL_PAGES = [
  {
    slug: "privacy-policy",
    title: "Privacy Policy",
    description: "Come Seminai tratta i dati personali (GDPR): titolari, finalità, conservazione, diritti.",
  },
  {
    slug: "cookie-policy",
    title: "Cookie Policy",
    description: "Cookie tecnici, analitici e di preferenza usati dal sito e come gestirli.",
  },
  {
    slug: "terms-of-service",
    title: "Termini di servizio",
    description: "Condizioni d'uso della piattaforma Seminai.",
  },
];

/** Strips the light inline HTML used in the i18n copy (links, strong, em). */
function plain(text) {
  return text
    .replace(/<a\s+href="([^"]+)"[^>]*>(.*?)<\/a>/gi, "[$2]($1)")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function homeMarkdown(lang) {
  const c = landing[lang];
  const isIt = lang === "it";
  const words = c.hero.docs.map((doc) => doc.word).join(", ");
  const url = isIt ? `${SITE}/` : `${SITE}/ (EN)`;
  const lines = [
    `# Seminai`,
    "",
    `> ${isIt ? "Versione Markdown di" : "Markdown version of"} ${url}`,
    "",
    `${c.hero.titleBefore} ${words} ${c.hero.titleAfter}`,
    "",
    c.hero.body,
    "",
    `## ${c.problem.title}`,
    "",
    c.problem.lead,
    "",
    ...c.problem.cards.map((card) => `- **${card.title}** ${card.body}`),
    "",
    `## ${c.how.title}`,
    "",
    c.how.lead,
    "",
    ...c.how.steps.map((step, index) => `${index + 1}. **${step.title}** ${step.body}`),
    "",
    `## ${c.useCases.title}`,
    "",
    c.useCases.lead,
    "",
    ...c.useCases.items.map((item) => `- ${item}`),
    "",
    `## ${c.faq.title}`,
    "",
    ...c.faq.items.flatMap((item) => [`### ${item.question}`, "", plain(item.answer), ""]),
    `## ${c.booking.title}`,
    "",
    c.booking.lead,
    "",
    isIt
      ? `Per prenotare una demo usa il modulo su ${SITE}/#prenota oppure scrivi a ${CONTACT}.`
      : `To book a demo use the form at ${SITE}/#prenota or write to ${CONTACT}.`,
    "",
    "## Link",
    "",
    `- ${isIt ? "Accesso all'app" : "App login"}: ${APP_LOGIN}`,
    ...LEGAL_PAGES.map((page) => `- ${page.title}: ${SITE}/${page.slug}.md`),
    `- ${isIt ? "Indice per agenti" : "Agent index"}: ${SITE}/llms.txt`,
    "",
  ];
  return lines.join("\n");
}

const BLOCK_TAGS = new Set(["p", "div", "section", "ul", "ol", "li", "h1", "h2", "h3", "h4", "br"]);

/**
 * Converts the simple markup of the legal pages (headings, paragraphs, lists, links,
 * strong/em, br) to Markdown. Anything else is treated as a transparent wrapper.
 */
function htmlToMarkdown(html) {
  // React leaves <!-- --> markers between adjacent text nodes; drop them before tokenizing.
  const source = html.replace(/<!--[\s\S]*?-->/g, "");
  const tokens = source.match(/<\/?[a-z][a-z0-9]*\b[^>]*>|[^<]+/gi) ?? [];
  const out = [];
  let line = "";
  const listStack = [];
  let href = null;

  const flush = (hardBreak = false) => {
    const text = line.replace(/[ \t]+/g, " ").trim();
    // Two trailing spaces = Markdown line break, so <br> lines don't merge into one.
    if (text) out.push(hardBreak ? `${text}  ` : text);
    line = "";
  };
  const blank = () => {
    flush();
    if (out.length && out[out.length - 1] !== "") out.push("");
  };

  for (const token of tokens) {
    const tag = token.match(/^<(\/?)([a-z][a-z0-9]*)\b([^>]*)>$/i);
    if (!tag) {
      let text = decode(token).replace(/\s+/g, " ");
      // No space right after an opening ** or _.
      if (/(\*\*|_)$/.test(line) && !/\S(\*\*|_)$/.test(line)) text = text.trimStart();
      line += text;
      continue;
    }
    const [, closing, rawName, attrs] = tag;
    const name = rawName.toLowerCase();

    if (name === "br") {
      flush(true);
      continue;
    }
    if (/^h[1-4]$/.test(name)) {
      if (closing) {
        const text = line.trim();
        line = "";
        blank();
        out.push(`${"#".repeat(Number(name[1]))} ${text}`, "");
      } else {
        blank();
      }
      continue;
    }
    if (name === "ul" || name === "ol") {
      if (closing) {
        listStack.pop();
        blank();
      } else {
        blank();
        listStack.push(name);
      }
      continue;
    }
    if (name === "li") {
      if (closing) {
        flush();
      } else {
        flush();
        line = `${"  ".repeat(Math.max(0, listStack.length - 1))}- `;
      }
      continue;
    }
    if (name === "a") {
      if (closing) {
        line += href ? `](${href})` : "";
        href = null;
      } else {
        const match = attrs.match(/href="([^"]+)"/i);
        href = match ? absolute(decode(match[1])) : null;
        if (href) line += "[";
      }
      continue;
    }
    if (name === "strong" || name === "b" || name === "em" || name === "i") {
      const mark = name === "strong" || name === "b" ? "**" : "_";
      if (closing) {
        // Markdown needs the closing mark right after the text: move trailing spaces outside it.
        const trailing = /\s$/.test(line) ? " " : "";
        line = `${line.trimEnd()}${mark}${trailing}`;
      } else {
        line += mark;
      }
      continue;
    }
    if (BLOCK_TAGS.has(name)) {
      if (listStack.length && name !== "p") continue;
      blank();
    }
  }
  flush();

  return out
    .join("\n")
    .replace(/\*\*[ \t]*\*\*/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function absolute(url) {
  if (url.startsWith("/")) return `${SITE}${url}`;
  return url;
}

function decode(text) {
  return text
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;/g, "'");
}

function legalMarkdown(page) {
  const html = readFileSync(join(distDir, page.slug, "index.html"), "utf-8");
  const main = html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i);
  if (!main) throw new Error(`agent-docs: no <main> in dist/${page.slug}/index.html`);
  return [
    htmlToMarkdown(main[1]).replace(/^# .*/, (h1) => `${h1}\n\n> Versione Markdown di ${SITE}/${page.slug}`),
    "",
  ].join("\n");
}

function llmsTxt() {
  const it = landing.it;
  const summary =
    "Seminai è la piattaforma con AI per le piccole e medie imprese agricole: legge fatture, DDT, etichette, fascicoli aziendali e appunti a mano e li trasforma in dati utilizzabili, da interrogare in chat, esportare in Excel o PDF e usare per compilare il quaderno di campagna.";
  return [
    "# Seminai",
    "",
    `> ${summary}`,
    "",
    `${it.hero.body} Il quaderno di campagna viene controllato su fonti ufficiali e resta da rivedere, approvare e firmare da parte dell'utente. Sito in italiano, con versione inglese. Per una demo: ${SITE}/#prenota oppure ${CONTACT}.`,
    "",
    "## Pagine",
    "",
    `- [Home](${SITE}/index.md): cosa fa Seminai, come funziona, casi d'uso, FAQ e come prenotare una demo`,
    `- [Home (English)](${SITE}/index.en.md): the same homepage content in English`,
    "",
    "## Legale",
    "",
    ...LEGAL_PAGES.map((page) => `- [${page.title}](${SITE}/${page.slug}.md): ${page.description}`),
    "",
    "## Per agenti",
    "",
    `- [Contesto completo](${SITE}/llms-full.txt): tutte le pagine sopra in un unico file`,
    `- [Autenticazione e API](${SITE}/auth.md): cosa è pubblico, cosa richiede login, come chiedere accesso alle API`,
    `- [Agent skills](${SITE}/.well-known/agent-skills/index.json): skill per agenti che devono spiegare Seminai`,
    `- [API catalog](${SITE}/.well-known/api-catalog): documentazione OpenAPI del backend`,
    "",
    "## Optional",
    "",
    `- [App](${APP_LOGIN}): accesso alla piattaforma, richiede un account`,
    `- [Sitemap](${SITE}/sitemap.xml): pagine HTML del sito`,
    "",
  ].join("\n");
}

const pages = [
  { file: "index.md", body: homeMarkdown("it") },
  { file: "index.en.md", body: homeMarkdown("en") },
  ...LEGAL_PAGES.map((page) => ({ file: `${page.slug}.md`, body: legalMarkdown(page) })),
];

for (const page of pages) {
  writeFileSync(join(distDir, page.file), page.body, "utf-8");
  console.log(`✓ agent doc dist/${page.file}`);
}

const index = llmsTxt();
writeFileSync(join(distDir, "llms.txt"), index, "utf-8");
writeFileSync(
  join(distDir, "llms-full.txt"),
  [index, ...pages.map((page) => `---\n\n<!-- ${SITE}/${page.file} -->\n\n${page.body}`)].join("\n"),
  "utf-8",
);
console.log("✓ agent doc dist/llms.txt, dist/llms-full.txt");

// The skills index pins each SKILL.md by hash; recompute it so edits to a skill never ship a stale digest.
const skillsIndexPath = join(distDir, ".well-known/agent-skills/index.json");
const skillsIndex = JSON.parse(readFileSync(skillsIndexPath, "utf-8"));
for (const skill of skillsIndex.skills) {
  if (!skill.url.startsWith(`${SITE}/`)) continue;
  const file = readFileSync(join(distDir, skill.url.slice(SITE.length + 1)));
  skill.sha256 = createHash("sha256").update(file).digest("hex");
}
writeFileSync(skillsIndexPath, `${JSON.stringify(skillsIndex, null, 2)}\n`, "utf-8");
console.log("✓ agent doc dist/.well-known/agent-skills/index.json (hashes refreshed)");
