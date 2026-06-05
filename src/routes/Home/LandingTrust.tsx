import { useTranslation } from "react-i18next";
import conforme360Url from "@/assets/landing/conforme-360.webp";
import conforme720Url from "@/assets/landing/conforme-720.webp";
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
          <picture className="trust-illust">
            <source
              type="image/webp"
              srcSet={`${conforme360Url} 360w, ${conforme720Url} 720w`}
              sizes="(max-width: 880px) 220px, 280px"
            />
            <img
              src={conforme360Url}
              alt={t("landing.trust.illustrationAria")}
              loading="lazy"
              decoding="async"
              width={280}
              height={280}
            />
          </picture>
        </div>
      </div>
    </section>
  );
}
