import { useTranslation } from "react-i18next";
import { RichHtml } from "./RichHtml";

interface TrustSource {
  num: string;
  title: string;
}

export function LandingTrust() {
  const { t } = useTranslation();
  const sources = t("landing.trust.sources", {
    returnObjects: true,
  }) as TrustSource[];

  return (
    <section className="trust" id="fonti">
      <div className="container">
        <div className="section-head section-head-single">
          <div>
            <h2>
              <RichHtml html={t("landing.trust.title")} />
            </h2>
            <p className="lead">{t("landing.trust.lead")}</p>
          </div>
        </div>

        <div className="trust-grid">
          {sources.map((source) => (
            <div key={source.num} className="trust-card">
              <div className="trust-num">{source.num}</div>
              <h3>{source.title}</h3>
            </div>
          ))}
        </div>

        <div className="trust-foot">
          <p>
            <RichHtml html={t("landing.trust.foot")} />
          </p>
          <div
            className="trust-illust"
            role="img"
            aria-label={t("landing.trust.illustrationAria")}
          />
        </div>
      </div>
    </section>
  );
}
