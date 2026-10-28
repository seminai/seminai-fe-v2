import { useTranslation } from "react-i18next";
import { CONTACT_URL, DEMO_URL } from "./constants";
import { RichHtml } from "./RichHtml";

export function LandingDemoCta() {
  const { t } = useTranslation();
  const securityItems = t("landing.security.items", {
    returnObjects: true,
  }) as string[];

  return (
    <section className="magnet final-cta" id="contatti">
      <div className="container">
        <div className="security-strip">
          <p className="security-title">{t("landing.security.title")}</p>
          <ul>
            {securityItems.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>

        <h2>
          <RichHtml html={t("landing.cta.title")} />
        </h2>
        <p className="lead">{t("landing.cta.lead")}</p>
        <div className="hero-ctas">
          <a href={DEMO_URL} className="btn-primary">
            {t("landing.cta.primary")}
            <span className="arrow" aria-hidden="true" />
          </a>
          <a href={CONTACT_URL} className="btn-secondary">
            {t("landing.cta.secondary")}
          </a>
        </div>
      </div>
    </section>
  );
}
