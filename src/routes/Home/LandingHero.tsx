import { useTranslation } from "react-i18next";
import { InvoiceWalkthrough } from "./AgriScenes";
import { CONTACT_URL, DEMO_URL } from "./constants";
import { RichHtml } from "./RichHtml";

export function LandingHero() {
  const { t } = useTranslation();
  const tickerItems = t("landing.hero.ticker", { returnObjects: true }) as string[];

  return (
    <section className="hero">
      <div className="container">
        <h1 className="hero-title">
          <RichHtml html={t("landing.hero.title")} />
        </h1>
        <p className="hero-sub">
          <RichHtml html={t("landing.hero.body")} />
        </p>
        <div className="hero-ctas">
          <a href={DEMO_URL} className="btn-primary">
            {t("landing.hero.ctaPrimary")}
            <span className="arrow" aria-hidden="true" />
          </a>
          <a href={CONTACT_URL} className="btn-secondary">
            {t("landing.hero.ctaSecondary")}
          </a>
        </div>
        <p className="hero-meta">
          {tickerItems.map((item, index) => (
            <span key={item}>
              {index > 0 ? (
                <span className="sep" aria-hidden="true">
                  {" · "}
                </span>
              ) : null}
              {item}
            </span>
          ))}
        </p>
        <div className="hero-preview">
          <InvoiceWalkthrough />
        </div>
      </div>
    </section>
  );
}
