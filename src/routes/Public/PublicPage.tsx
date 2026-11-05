import { Seo } from "@/components/molecules/Seo/Seo";
import { absoluteUrl } from "@/config/seo";
import { PUBLIC_PAGES, type PublicPage as Page } from "@/config/publicPages";
import {
  demoPath,
  homePath,
  resourcesPath,
  rulesPath,
} from "@/config/publicPaths";
import { findPost, newsIndexPath } from "@/lib/news";
import { NewsLayout } from "../News/NewsLayout";
import { NewsCard } from "../News/NewsCard";
import { LandingBooking } from "../Home/LandingBooking";

export function PublicPage({ page }: { page: Page }) {
  const en = page.lang === "en";
  const url = absoluteUrl(page.path);
  const articles = page.articles.flatMap((slug) => {
    const post = findPost(page.lang, slug);
    return post ? [post] : [];
  });
  return (
    <NewsLayout
      languageLinks={
        {
          [page.lang]: page.path,
          [en ? "it" : "en"]: page.otherPath,
        } as Record<"it" | "en", string>
      }
    >
      <Seo
        title={`${page.title} | Seminai`}
        description={page.description}
        canonical={url}
        locale={en ? "en_US" : "it_IT"}
        markdownHref={absoluteUrl(`${page.path.replace(/\/$/, "")}.md`)}
        alternates={[
          { hrefLang: page.lang, href: url },
          { hrefLang: en ? "it" : "en", href: absoluteUrl(page.otherPath) },
          {
            hrefLang: "x-default",
            href: absoluteUrl(en ? page.otherPath : page.path),
          },
        ]}
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "WebPage",
          "@id": url,
          url,
          name: page.title,
          description: page.description,
          inLanguage: page.lang,
          isPartOf: { "@id": "https://seminai.tech/#website" },
        }}
      />
      <article className="container public-article">
        <nav
          className="news-crumbs"
          aria-label={en ? "Breadcrumb" : "Percorso"}
        >
          <a href={homePath(page.lang)}>Home</a>
          <span>/</span>
          <a href={resourcesPath(page.lang)}>{en ? "Resources" : "Risorse"}</a>
        </nav>
        <header className="public-heading">
          <p className="public-kicker">
            Seminai ·{" "}
            {en
              ? "Documents, fields, decisions"
              : "Documenti, campi, decisioni"}
          </p>
          <h1>{page.title}</h1>
          <p className="lead">{page.intro}</p>
        </header>
        <div className="public-sections">
          {page.sections.map((section, index) => (
            <section key={section.title}>
              <span className="public-number">0{index + 1}</span>
              <h2>{section.title}</h2>
              <p>{section.body}</p>
            </section>
          ))}
        </div>
        <div className="public-actions">
          <a className="btn-primary" href={demoPath(page.lang)}>
            {en ? "Request a demo" : "Richiedi una demo"}
          </a>
          <a className="btn-secondary" href={rulesPath(page.lang)}>
            {en ? "Public rules catalogue" : "Catalogo regole pubbliche"}
          </a>
        </div>
        {page.id === "api" && (
          <p>
            <a href="https://seminai-be-v2-661301438659.europe-west1.run.app/developer/docs/">
              OpenAPI · Extraction API
            </a>
          </p>
        )}
      </article>
      {articles.length > 0 && (
        <section className="container public-reading">
          <h2>{en ? "Explore the workflow" : "Approfondisci il flusso"}</h2>
          <div className="news-grid">
            {articles.map((post) => (
              <NewsCard key={post.slug} post={post} />
            ))}
          </div>
        </section>
      )}
      <section
        className="container public-links"
        aria-label={en ? "Product guides" : "Guide al prodotto"}
      >
        {PUBLIC_PAGES.filter(
          (item) =>
            item.lang === page.lang &&
            ["field-logbook", "document-ocr", "agronomists", "api"].includes(
              item.id,
            ),
        ).map((item) => (
          <a key={item.id} href={item.path}>
            {item.title} →
          </a>
        ))}
        <a href={newsIndexPath(page.lang)}>
          {en ? "All guides and news" : "Tutte le guide e news"} →
        </a>
      </section>
    </NewsLayout>
  );
}
export function DemoPage({ lang }: { lang: "it" | "en" }) {
  const en = lang === "en";
  return (
    <NewsLayout languageLinks={{ it: demoPath("it"), en: demoPath("en") }}>
      <Seo
        title={en ? "Request a Seminai demo" : "Richiedi una demo Seminai"}
        description={
          en
            ? "Tell us about your farm data workflow and a preferred time. The team will contact you to confirm the appointment."
            : "Raccontaci il tuo flusso e indica una preferenza. Il team ti contatterà per confermare l'appuntamento."
        }
        canonical={absoluteUrl(demoPath(lang))}
        locale={en ? "en_US" : "it_IT"}
        markdownHref={absoluteUrl(`${demoPath(lang).slice(0, -1)}.md`)}
        alternates={[
          { hrefLang: "it", href: absoluteUrl(demoPath("it")) },
          { hrefLang: "en", href: absoluteUrl(demoPath("en")) },
        ]}
      />
      <div className="container public-heading">
        <h1>
          {en ? "Let's start with your workflow." : "Partiamo dal tuo lavoro."}
        </h1>
        <p className="lead">
          {en
            ? "This is a request, not a confirmed booking. We will agree the appointment with you."
            : "È una richiesta, non una prenotazione confermata. Concordiamo insieme l'appuntamento."}
        </p>
      </div>
      <LandingBooking />
    </NewsLayout>
  );
}
