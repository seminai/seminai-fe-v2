import { useTranslation } from "react-i18next";
import { normalizeLanguage } from "@/i18n/language";
import { newsIndexPath, postsByLang } from "@/lib/news";
import { NewsCard } from "../News/NewsCard";

const LATEST_COUNT = 3;

/** Homepage section with the latest news in the current language. */
export function LandingNews() {
  const { t, i18n } = useTranslation();
  const lang = normalizeLanguage(i18n.language);
  const posts = postsByLang(lang).slice(0, LATEST_COUNT);

  if (posts.length === 0) return null;

  return (
    <section className="row" id="news">
      <div className="container">
        <h2 className="news-home-head eyebrow">{t("landing.news.eyebrow")}</h2>
        <div className="news-grid">
          {posts.map((post) => (
            <NewsCard key={post.slug} post={post} />
          ))}
        </div>
        <p className="news-home-foot">
          <a className="btn-secondary" href={newsIndexPath(lang)}>
            {t("landing.news.all")}
          </a>
        </p>
      </div>
    </section>
  );
}
