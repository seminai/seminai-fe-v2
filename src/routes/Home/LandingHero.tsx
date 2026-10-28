import { useTranslation } from "react-i18next";
import { ANCHORS } from "./constants";
import { HERO_DOCS, SCENE } from "./sceneImages";
import { useAutoAdvance } from "./useAutoAdvance";

interface HeroDoc {
  word: string;
  source: string;
  alt: string;
  fields: [string, string][];
}

export function LandingHero() {
  const { t } = useTranslation();
  const docs = t("landing.hero.docs", { returnObjects: true }) as HeroDoc[];
  const outputs = t("landing.hero.outputs", { returnObjects: true }) as string[];
  const { index, select } = useAutoAdvance(docs.length, 3200);
  const active = docs[index];

  return (
    <section className="hero">
      <div className="container">
        <h1 className="hero-title rotator-title">
          <span>{t("landing.hero.titleBefore")}</span>
          <span className="rotator" aria-live="polite">
            <span key={index} className="rotator-word">
              {active.word}
            </span>
          </span>
          <span>{t("landing.hero.titleAfter")}</span>
        </h1>
        <p className="hero-sub">{t("landing.hero.body")}</p>
        <div className="hero-ctas">
          <a href={ANCHORS.booking} className="btn-primary">
            {t("landing.hero.ctaPrimary")}
            <span className="arrow" aria-hidden="true" />
          </a>
          <a href={ANCHORS.how} className="btn-secondary">
            {t("landing.hero.ctaSecondary")}
          </a>
        </div>

        <figure className="stage">
          <img
            className="stage-backdrop"
            src={SCENE.photoFarmhouse}
            alt=""
            aria-hidden="true"
            width={900}
            height={434}
          />
          <div className="stage-inputs">
            {docs.map((doc, docIndex) => (
              <button
                key={doc.source}
                type="button"
                className={`stage-doc stage-doc-${docIndex}${docIndex === index ? " is-active" : ""}`}
                aria-pressed={docIndex === index}
                onClick={() => select(docIndex)}
              >
                <img src={HERO_DOCS[docIndex]} alt={doc.alt} />
              </button>
            ))}
          </div>

          <div className="stage-flow" aria-hidden="true">
            <span className="stage-flow-line" />
            <span className="stage-flow-pill">Seminai</span>
          </div>

          <div className="stage-output">
            <div key={index} className="data-card">
              <div className="data-card-head">
                <span className="data-dot" aria-hidden="true" />
                {t("landing.hero.extracted")}
                <span className="data-source">
                  {t("landing.hero.from")} {active.source}
                </span>
              </div>
              <dl>
                {active.fields.map(([label, value], row) => (
                  <div
                    key={label}
                    className="data-row"
                    style={{ animationDelay: `${row * 90}ms` }}
                  >
                    <dt>{label}</dt>
                    <dd>{value}</dd>
                  </div>
                ))}
              </dl>
              <div className="data-outputs">
                {outputs.map((output) => (
                  <span key={output} className="chip chip-small">
                    {output}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <figcaption className="demo-caption">{t("landing.hero.stageLabel")}</figcaption>
        </figure>
      </div>
    </section>
  );
}
