import { useTranslation } from "react-i18next";
import { ANCHORS } from "./constants";
import { SCENE } from "./sceneImages";

export function LandingUseCases() {
  const { t } = useTranslation();
  const items = t("landing.useCases.items", { returnObjects: true }) as string[];

  return (
    <section className="row use-cases" id="cosa-puoi-fare">
      <div className="container">
        <div className="section-head">
          <h2>{t("landing.useCases.title")}</h2>
          <p className="lead">{t("landing.useCases.lead")}</p>
        </div>
        <div className="use-cases-stage">
          <img
            className="use-cases-photo use-cases-photo-left"
            src={SCENE.photoCrates}
            alt=""
            aria-hidden="true"
            loading="lazy"
          />
          <ul className="chips">
            {items.map((item) => (
              <li key={item} className="chip">
                {item}
              </li>
            ))}
            <li>
              <a className="chip chip-cta" href={ANCHORS.booking}>
                {t("landing.useCases.cta")}
              </a>
            </li>
          </ul>
          <img
            className="use-cases-photo use-cases-photo-right"
            src={SCENE.photoTractor}
            alt=""
            aria-hidden="true"
            loading="lazy"
          />
        </div>
      </div>
    </section>
  );
}
