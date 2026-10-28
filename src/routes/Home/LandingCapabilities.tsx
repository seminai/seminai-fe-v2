import { useTranslation } from "react-i18next";
import { RichHtml } from "./RichHtml";

interface Capability {
  title: string;
  body: string;
}

export function LandingCapabilities() {
  const { t } = useTranslation();
  const items = t("landing.capabilities.items", {
    returnObjects: true,
  }) as Capability[];

  return (
    <section className="row" id="cosa-puoi-fare">
      <div className="container">
        <div className="section-head section-head-single">
          <div>
            <h2>
              <RichHtml html={t("landing.capabilities.title")} />
            </h2>
            <p className="lead">{t("landing.capabilities.lead")}</p>
          </div>
        </div>

        <div className="trust-grid">
          {items.map((item, index) => (
            <article key={item.title} className="trust-card">
              <span className="step-number">
                {String(index + 1).padStart(2, "0")}
              </span>
              <h3>{item.title}</h3>
              <p>{item.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
