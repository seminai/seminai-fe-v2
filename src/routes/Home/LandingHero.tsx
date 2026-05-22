import { useTranslation } from "react-i18next";
import { ANCHORS, getWhatsAppUrl } from "./constants";
import { RichHtml } from "./RichHtml";

interface DemoRow {
  date: string;
  product: string;
  crop: string;
  dose: string;
  status: "ok" | "warn";
}

export function LandingHero() {
  const { t, i18n } = useTranslation();
  const whatsAppUrl = getWhatsAppUrl(i18n.language);
  const headers = t("landing.hero.demoHeaders", {
    returnObjects: true,
  }) as string[];
  const rows = t("landing.hero.demoRows", {
    returnObjects: true,
  }) as DemoRow[];
  const tickerItems = t("landing.hero.ticker", {
    returnObjects: true,
  }) as string[];

  const tickerContent = tickerItems.flatMap((item, index) => [
    <span key={`a-${item}`}>{item}</span>,
    <span key={`sep-a-${index}`} className="sep">
      ✦
    </span>,
  ]);

  return (
    <section className="hero">
      <div className="container">
        <div className="hero-split">
          <div className="hero-left">
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
              <a href={whatsAppUrl} className="btn-primary" target="_blank" rel="noopener noreferrer">
                {t("landing.hero.ctaPrimary")}
                <span className="arrow" />
              </a>
              <a href={ANCHORS.who} className="btn-link">
                {t("landing.hero.ctaSecondary")}
              </a>
            </div>
          </div>

          <div className="hero-right">
            <div className="demo-frame">
              <div className="demo-bar">
                <span className="dot d1" />
                <span className="dot d2" />
                <span className="dot d3" />
                <span className="demo-url">{t("landing.hero.demoUrl")}</span>
              </div>
              <div className="demo-body">
                <div className="demo-head">
                  <div>
                    <div className="demo-eyebrow">{t("landing.hero.demoEyebrow")}</div>
                    <div className="demo-h">{t("landing.hero.demoTitle")}</div>
                  </div>
                  <div className="demo-status ok">
                    <span className="sdot" />
                    {t("landing.hero.demoStatus")}
                  </div>
                </div>
                <div className="demo-table">
                  <div className="demo-row demo-hd">
                    {headers.map((header) => (
                      <span key={header}>{header}</span>
                    ))}
                  </div>
                  {rows.map((row) => (
                    <div
                      key={`${row.date}-${row.product}`}
                      className={`demo-row${row.status === "warn" ? " warn" : ""}`}
                    >
                      <span>{row.date}</span>
                      <span>{row.product}</span>
                      <span>{row.crop}</span>
                      <span>{row.dose}</span>
                      <span className={`tag ${row.status}`}>
                        {row.status === "ok"
                          ? t("landing.hero.statusOk")
                          : t("landing.hero.statusWarn")}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="demo-note">
                  <span className="note-dot" />
                  <span>
                    <RichHtml html={t("landing.hero.demoAnomaly")} />
                  </span>
                </div>
              </div>
            </div>
            <div className="demo-caption">{t("landing.hero.demoCaption")}</div>
          </div>
        </div>

        <div className="ticker">
          <div className="ticker-track">
            {tickerContent}
            {tickerContent}
          </div>
        </div>
      </div>
    </section>
  );
}
