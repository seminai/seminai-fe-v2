import { Suspense, useMemo } from "react";
import { Navigate, useParams } from "react-router-dom";
import { Seo } from "@/components/molecules/Seo/Seo";
import { absoluteUrl } from "@/config/seo";
import { buildArticleGraph } from "@/config/jsonLd";
import {
  articleComponent,
  findPost,
  formatNewsDate,
  newsIndexPath,
  relatedPosts,
  translationOf,
  type NewsLang,
} from "@/lib/news";
import { NEWS_COPY, NEWS_SIGNUP_URL } from "./copy";
import { buildMdxComponents } from "./mdxComponents";
import { NewsLayout } from "./NewsLayout";

export default function NewsArticle({ lang }: { lang: NewsLang }) {
  const { slug = "" } = useParams();
  const post = findPost(lang, slug);
  const components = useMemo(() => buildMdxComponents(lang), [lang]);

  if (!post) return <Navigate to={newsIndexPath(lang)} replace />;

  const copy = NEWS_COPY[lang];
  const Body = articleComponent(post);
  const translation = translationOf(post);
  const related = relatedPosts(post);
  const url = absoluteUrl(post.path);
  const otherLang: NewsLang = lang === "it" ? "en" : "it";

  const alternates = translation
    ? [
        { hrefLang: post.lang, href: url },
        { hrefLang: translation.lang, href: absoluteUrl(translation.path) },
        {
          hrefLang: "x-default",
          href: absoluteUrl(post.lang === "it" ? post.path : translation.path),
        },
      ]
    : [];

  const languageLinks = {
    [lang]: post.path,
    [otherLang]: translation?.path ?? newsIndexPath(otherLang),
  } as Record<NewsLang, string>;

  return (
    <NewsLayout languageLinks={languageLinks}>
      <Seo
        title={`${post.title} | Seminai`}
        description={post.description}
        canonical={url}
        locale={lang === "en" ? "en_US" : "it_IT"}
        ogType="article"
        image={post.image ? absoluteUrl(post.image) : undefined}
        imageAlt={post.imageAlt}
        markdownHref={absoluteUrl(`${post.path.replace(/\/$/, "")}.md`)}
        alternates={alternates}
        jsonLd={buildArticleGraph({
          url,
          title: post.title,
          description: post.description,
          author: post.author,
          date: post.date,
          updated: post.updated,
          image: post.image ? absoluteUrl(post.image) : undefined,
          lang,
          keyword: post.keyword,
          faqs: post.faqs,
          breadcrumb: [
            { name: copy.home, url: absoluteUrl("/") },
            { name: copy.section, url: absoluteUrl(newsIndexPath(lang)) },
            { name: post.title, url },
          ],
        })}
      />
      <article className="news-article container">
        <nav className="news-crumbs" aria-label={copy.breadcrumb}>
          <a href="/">{copy.home}</a>
          <span aria-hidden="true">/</span>
          <a href={newsIndexPath(lang)}>{copy.section}</a>
        </nav>

        <header className="news-article-head">
          {post.tags.length > 0 ? (
            <ul className="news-tags">
              {post.tags.map((tag) => (
                <li key={tag}>{tag}</li>
              ))}
            </ul>
          ) : null}
          <h1>{post.title}</h1>
          <p className="news-meta">
            {post.author} · <time dateTime={post.date}>{formatNewsDate(post.date, lang)}</time>
          </p>
          {post.showUpdated && post.updated ? (
            <p className="news-updated">
              {copy.updatedAt} <time dateTime={post.updated}>{formatNewsDate(post.updated, lang)}</time>
            </p>
          ) : null}
          <p className="news-summary">{post.description}</p>
        </header>

        {post.image ? (
          <figure className="news-figure news-hero">
            <img src={post.image} alt={post.imageAlt ?? ""} width={1200} height={675} />
          </figure>
        ) : null}

        <div className="news-prose">
          <Suspense fallback={null}>
            <Body components={components} />
          </Suspense>

          {post.diagram && post.diagramAlt ? (
            <figure className="news-figure">
              <img src={post.diagram} alt={post.diagramAlt} width={720} height={360} loading="lazy" />
              <figcaption>{post.diagramAlt}</figcaption>
            </figure>
          ) : null}

          {related.length > 0 ? (
            <section className="news-related">
              <h2>{copy.readAlso}</h2>
              <ul>
                {related.map((item) => (
                  <li key={item.slug}>
                    <a href={item.path}>{item.title}</a>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {post.faqs.length > 0 ? (
            <section className="news-faq">
              <h2>{copy.faq}</h2>
              {post.faqs.map((faq) => (
                <div key={faq.question} className="news-faq-item">
                  <h3>{faq.question}</h3>
                  <p>{faq.answer}</p>
                </div>
              ))}
            </section>
          ) : null}
        </div>

        <aside className="news-cta">
          <p>{copy.ctaText}</p>
          <a className="btn-primary" href={NEWS_SIGNUP_URL} rel="noopener">
            {copy.ctaButton}
          </a>
        </aside>

        {post.sources.length > 0 ? (
          <section className="news-sources">
            <h2>{copy.sources}</h2>
            <ol>
              {post.sources.map((source) => (
                <li key={source.url}>
                  <a href={source.url} target="_blank" rel="noopener noreferrer">
                    {source.title}
                  </a>
                  , {copy.accessed} {formatNewsDate(source.accessed, lang)}
                </li>
              ))}
            </ol>
          </section>
        ) : null}
      </article>
    </NewsLayout>
  );
}
