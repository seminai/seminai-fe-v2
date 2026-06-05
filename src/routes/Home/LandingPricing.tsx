import { useTranslation } from "react-i18next";
import { ANCHORS } from "./constants";
import { RichHtml } from "./RichHtml";

interface PricingPlan {
  name: string;
  farms: string;
  oldPrice: string;
  price: string;
  monthly: string;
  perFarm: string;
  who: string;
  featured?: boolean;
}

export function LandingPricing() {
  const { t } = useTranslation();
  const plans = t("landing.pricing.plans", {
    returnObjects: true,
  }) as PricingPlan[];
  const features = t("landing.pricing.features", {
    returnObjects: true,
  }) as string[];

  return (
    <section className="row pricing" id="piani">
      <div className="container pricing-container">
        <div className="section-head section-head-single">
          <div>
            <h2 className="pricing-title">
              <RichHtml html={t("landing.pricing.title")} />
            </h2>
          </div>
        </div>

        <div className="founding-banner" id="founding">
          <div className="founding-content">
            <div className="founding-eyebrow">{t("landing.pricing.foundingEyebrow")}</div>
            <h3>
              <RichHtml html={t("landing.pricing.foundingTitle")} />
            </h3>
            <p>
              <RichHtml html={t("landing.pricing.foundingBody")} />
            </p>
          </div>
          <div className="founding-counter">
            <div className="counter-num">
              {t("landing.pricing.foundingCounter")}
              <span>/100</span>
            </div>
            <div className="counter-label">{t("landing.pricing.foundingCounterLabel")}</div>
            <div
              className="counter-bar"
              role="progressbar"
              aria-label={`${t("landing.pricing.foundingEyebrow")} ${t(
                "landing.pricing.foundingCounterLabel",
              )}`}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={53}
              aria-valuetext={`${t("landing.pricing.foundingCounter")} ${t(
                "landing.pricing.foundingCounterLabel",
              )}`}
            >
              <div className="counter-bar-fill" />
            </div>
          </div>
        </div>

        <div className="anchor-card">
          <div className="left">
            <p>
              <RichHtml html={t("landing.pricing.anchorLeft")} />
            </p>
          </div>
          <div className="right">
            <p>
              <RichHtml html={t("landing.pricing.anchorRight")} />
            </p>
          </div>
        </div>

        <div className="price-grid">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`price-cell${plan.featured ? " featured" : ""}`}
            >
              {plan.featured && (
                <div className="featured-badge">{t("landing.pricing.featuredBadge")}</div>
              )}
              <div className="plan-head">
                <div className="plan-name">{plan.name}</div>
                <div className="plan-sub">{plan.farms}</div>
              </div>
              <div className="price-block">
                <div className="price-old">
                  {plan.oldPrice}
                  <small>{t("landing.pricing.perYear")}</small>
                </div>
                <div className="price">
                  {plan.price}
                  <small>{t("landing.pricing.perYear")}</small>
                </div>
                <div className="price-meta">
                  {plan.monthly} {t("landing.pricing.perMonth")}
                  <span className="pf">
                    <strong>{plan.perFarm}</strong> {t("landing.pricing.perFarmMonth")}
                  </span>
                </div>
                <div className="founding-tag">{t("landing.pricing.foundingTag")}</div>
              </div>
              <p className="who">{plan.who}</p>
              <a href={ANCHORS.trial} className="pick">
                {t("landing.pricing.startCta")}
              </a>
            </div>
          ))}

          <div className="price-cell network">
            <div className="plan-head">
              <div className="plan-name">{t("landing.pricing.networkName")}</div>
              <div className="plan-sub">{t("landing.pricing.networkFarms")}</div>
            </div>
            <div className="net-meta">
              <div className="price serif-i">{t("landing.pricing.networkPrice")}</div>
              <p className="who">{t("landing.pricing.networkWho")}</p>
            </div>
            <a href={ANCHORS.who} className="pick">
              {t("landing.pricing.networkCta")}
            </a>
          </div>
        </div>

        <div className="price-features">
          <h4>{t("landing.pricing.featuresTitle")}</h4>
          <ul>
            {features.map((feature) => (
              <li key={feature}>{feature}</li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
