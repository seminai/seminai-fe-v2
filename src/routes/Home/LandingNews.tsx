import { useTranslation } from "react-i18next";
import { normalizeLanguage } from "@/i18n";
import { newsIndexPath, postsByLang } from "@/lib/news";
import { NewsCard } from "../News/NewsCard";
import "../News/news.css";

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
        <div className="section-head">
          <p className="eyebrow">{t("landing.news.eyebrow")}</p>
          <h2>{t("landing.news.title")}</h2>
          <p className="lead">{t("landing.news.lead")}</p>
        </div>
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
