import { useTranslation } from "react-i18next";
import { InvoiceWalkthrough } from "./AgriScenes";
import { ANCHORS } from "./constants";
import { MigrationOffer } from "./MigrationOffer";
import { RichHtml } from "./RichHtml";

interface LandingHeroProps {
  onOpenSendInvoices: () => void;
}

export function LandingHero({ onOpenSendInvoices }: LandingHeroProps) {
  const { t } = useTranslation();
  const tickerItems = t("landing.hero.ticker", { returnObjects: true }) as string[];

  return (
    <section className="hero">
      <div className="container">
        <h1 className="hero-title">
          <RichHtml html={t("landing.hero.title")} />
        </h1>
        <p className="hero-subtitle">
          <RichHtml html={t("landing.hero.subtitle")} />
        </p>
        <p className="hero-sub">
          <RichHtml html={t("landing.hero.body")} />
        </p>
        <div className="hero-ctas">
          <button type="button" className="btn-primary" onClick={onOpenSendInvoices}>
            {t("landing.hero.ctaPrimary")}
            <span className="arrow" aria-hidden="true" />
          </button>
          <a href={ANCHORS.manufacturing} className="btn-secondary">
            {t("landing.hero.ctaManufacturing")}
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
        <MigrationOffer />
        <div className="hero-preview">
          <InvoiceWalkthrough />
        </div>
      </div>
    </section>
  );
}
