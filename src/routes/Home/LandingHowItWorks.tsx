import { useTranslation } from "react-i18next";
import { ChatWalkthrough, InvoiceWalkthrough } from "./AgriScenes";
import { SCENE } from "./sceneImages";
import { useAutoAdvance } from "./useAutoAdvance";

interface Step {
  tab: string;
  title: string;
  body: string;
}

interface ChainLink {
  label: string;
  sub: string;
}

const CHAIN_IMAGES = [SCENE.photoSoybeanSack, SCENE.photoGrainTruck, SCENE.photoSilos];

export function LandingHowItWorks() {
  const { t } = useTranslation();
  const steps = t("landing.how.steps", { returnObjects: true }) as Step[];
  const { index, select } = useAutoAdvance(steps.length, 9000);
  const step = steps[index];

  return (
    <section className="row" id="come-funziona">
      <div className="container">
        <div className="section-head">
          <h2>{t("landing.how.title")}</h2>
          <p className="lead">{t("landing.how.lead")}</p>
        </div>

        <div className="step-tabs" role="tablist" aria-label={t("landing.how.tabsLabel")}>
          {steps.map((item, tabIndex) => (
            <button
              key={item.tab}
              type="button"
              role="tab"
              id={`step-tab-${tabIndex}`}
              aria-selected={tabIndex === index}
              aria-controls="step-panel"
              className={`step-tab${tabIndex === index ? " is-active" : ""}`}
              onClick={() => select(tabIndex)}
            >
              <span className="step-tab-num">{String(tabIndex + 1).padStart(2, "0")}</span>
              {item.tab}
            </button>
          ))}
        </div>

        <div
          key={index}
          className="step-panel"
          role="tabpanel"
          id="step-panel"
          aria-labelledby={`step-tab-${index}`}
        >
          <h3>{step.title}</h3>
          <p>{step.body}</p>
          <div className="step-visual">
            {index === 0 ? <InvoiceWalkthrough /> : null}
            {index === 1 ? <ChainVisual /> : null}
            {index === 2 ? <OutputsVisual /> : null}
          </div>
        </div>
      </div>
    </section>
  );
}

function ChainVisual() {
  const { t } = useTranslation();
  const chain = t("landing.how.chain", { returnObjects: true }) as ChainLink[];

  return (
    <ol className="chain">
      {chain.map((link, linkIndex) => (
        <li key={link.label} className="chain-link">
          <img src={CHAIN_IMAGES[linkIndex]} alt="" aria-hidden="true" loading="lazy" />
          <strong>{link.label}</strong>
          <span>{link.sub}</span>
        </li>
      ))}
    </ol>
  );
}

function OutputsVisual() {
  const { t } = useTranslation();
  const rows = t("landing.how.outputs.excelRows", { returnObjects: true }) as string[];

  return (
    <div className="outputs">
      <ChatWalkthrough />
      <div className="outputs-side">
        <figure className="output-card">
          <img src={SCENE.docSprayPlan} alt="" aria-hidden="true" loading="lazy" />
          <figcaption>{t("landing.how.outputs.pdfLabel")}</figcaption>
        </figure>
        <figure className="output-card excel-card">
          <div className="excel-sheet" aria-hidden="true">
            <span className="excel-badge">XLSX</span>
            {rows.map((row) => (
              <span key={row} className="excel-row">
                {row}
              </span>
            ))}
          </div>
          <figcaption>{t("landing.how.outputs.excelLabel")}</figcaption>
        </figure>
      </div>
    </div>
  );
}
