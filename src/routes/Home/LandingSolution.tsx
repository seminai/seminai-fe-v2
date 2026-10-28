import { useTranslation } from "react-i18next";
import { DEMO_URL } from "./constants";
import { RichHtml } from "./RichHtml";
import { useStepperAnimation } from "./useStepperAnimation";

interface SolutionStep {
  label: string;
  heading: string;
  body: string;
}

export function LandingSolution() {
  const { t } = useTranslation();
  const stepperRef = useStepperAnimation();
  const steps = t("landing.solution.steps", {
    returnObjects: true,
  }) as SolutionStep[];

  return (
    <section className="row" id="come-funziona">
      <div className="container">
        <div className="section-head section-head-single">
          <div>
            <h2>
              <RichHtml html={t("landing.solution.title")} />
            </h2>
            <p className="lead">{t("landing.solution.lead")}</p>
          </div>
        </div>

        <div className="stepper" id="stepper" ref={stepperRef}>
          <div className="stepper-track">
            <div className="stepper-line">
              <div className="stepper-fill" />
            </div>
            {steps.map((step, index) => (
              <div
                key={step.label}
                className="stepper-node"
                data-step={String(index + 1)}
              >
                <div className="node-dot">
                  <span>{index + 1}</span>
                </div>
                <div className="node-label">{step.label}</div>
              </div>
            ))}
          </div>

          <div className="stepper-content">
            {steps.map((step) => (
              <div key={step.label} className="step-block">
                <div className="step-block-h">{step.heading}</div>
                <p>
                  <RichHtml html={step.body} />
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="solution-cta-row">
          <a href={DEMO_URL} className="btn-primary">
            {t("landing.solution.ctaPrimary")}
            <span className="arrow" />
          </a>
          <span className="note">{t("landing.solution.ctaNote")}</span>
        </div>
      </div>
    </section>
  );
}
