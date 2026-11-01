import { Seo } from "@/components/molecules/Seo/Seo";
import { absoluteUrl } from "@/config/seo";
import { newsIndexPath, postsByLang, type NewsLang } from "@/lib/news";
import { NEWS_COPY } from "./copy";
import { NewsCard } from "./NewsCard";
import { NewsLayout } from "./NewsLayout";

export default function NewsIndex({ lang }: { lang: NewsLang }) {
  const copy = NEWS_COPY[lang];
  const posts = postsByLang(lang);

  return (
    <NewsLayout languageLinks={{ it: newsIndexPath("it"), en: newsIndexPath("en") }}>
      <Seo
        title={copy.indexTitle}
        description={copy.indexDescription}
        canonical={absoluteUrl(newsIndexPath(lang))}
        locale={lang === "en" ? "en_US" : "it_IT"}
        markdownHref={absoluteUrl(lang === "en" ? "/en/news.md" : "/news.md")}
        alternates={[
          { hrefLang: "it", href: absoluteUrl(newsIndexPath("it")) },
          { hrefLang: "en", href: absoluteUrl(newsIndexPath("en")) },
          { hrefLang: "x-default", href: absoluteUrl(newsIndexPath("it")) },
        ]}
      />
      <section className="news-index container">
        <header className="news-index-head">
          <p className="eyebrow">Seminai</p>
          <h1>{copy.indexHeading}</h1>
          <p className="lead">{copy.indexLead}</p>
        </header>
        <div className="news-grid">
          {posts.map((post) => (
            <NewsCard key={post.slug} post={post} />
          ))}
        </div>
      </section>
    </NewsLayout>
  );
}
