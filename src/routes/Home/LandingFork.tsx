import { useTranslation } from "react-i18next";
import chatFarmer320Url from "@/assets/landing/chat-farmer-320.webp";
import chatFarmer640Url from "@/assets/landing/chat-farmer-640.webp";
import whiteLabel320Url from "@/assets/landing/white-label-320.webp";
import whiteLabel640Url from "@/assets/landing/white-label-640.webp";
import { ANCHORS } from "./constants";
import { RichHtml } from "./RichHtml";

export function LandingFork() {
  const { t } = useTranslation();
  const studiosItems = t("landing.fork.studiosItems", {
    returnObjects: true,
  }) as string[];
  const networkItems = t("landing.fork.networkItems", {
    returnObjects: true,
  }) as string[];

  return (
    <section className="row" id="cooperative">
      <div className="container">
        <div className="section-head section-head-single">
          <div>
            <h2>
              <RichHtml html={t("landing.fork.title")} />
            </h2>
            <p className="lead">{t("landing.fork.lead")}</p>
          </div>
        </div>

        <div className="fork-grid">
          <div className="fork-card left">
            <picture className="illust" aria-hidden="true">
              <source
                type="image/webp"
                srcSet={`${chatFarmer320Url} 320w, ${chatFarmer640Url} 640w`}
                sizes="110px"
              />
              <img
                src={chatFarmer320Url}
                alt=""
                loading="lazy"
                decoding="async"
                width={110}
                height={110}
              />
            </picture>
            <div className="eyebrow">
              {t("landing.fork.studiosEyebrow")}
            </div>
            <h3>{t("landing.fork.studiosTitle")}</h3>
            <p className="intro">{t("landing.fork.studiosIntro")}</p>
            <ul>
              {studiosItems.map((item) => (
                <li key={item}>
                  <RichHtml html={item} />
                </li>
              ))}
            </ul>
            <div className="price-note">{t("landing.fork.studiosPrice")}</div>
            <div className="cta-row">
              <a href={ANCHORS.plans} className="btn-secondary">
                {t("landing.fork.studiosCta")}
              </a>
            </div>
          </div>

          <div className="fork-card right dark">
            <picture className="illust" aria-hidden="true">
              <source
                type="image/webp"
                srcSet={`${whiteLabel320Url} 320w, ${whiteLabel640Url} 640w`}
                sizes="110px"
              />
              <img
                src={whiteLabel320Url}
                alt=""
                loading="lazy"
                decoding="async"
                width={110}
                height={110}
              />
            </picture>
            <div className="eyebrow">
              {t("landing.fork.networkEyebrow")}
            </div>
            <h3>{t("landing.fork.networkTitle")}</h3>
            <p className="intro">{t("landing.fork.networkIntro")}</p>
            <ul>
              {networkItems.map((item) => (
                <li key={item}>
                  <RichHtml html={item} />
                </li>
              ))}
            </ul>
            <div className="price-note">{t("landing.fork.networkPrice")}</div>
            <div className="cta-row">
              <a href={ANCHORS.trial} className="btn-secondary">
                {t("landing.fork.networkCta")}
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
