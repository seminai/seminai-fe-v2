import { useTranslation } from "react-i18next";
import { ANCHORS } from "./constants";
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
  const doorBefore = t("landing.solution.doorBefore", {
    returnObjects: true,
  }) as string[];
  const doorAfter = t("landing.solution.doorAfter", {
    returnObjects: true,
  }) as string[];

  return (
    <section className="row" id="come-funziona" style={{ padding: "50px 0px" }}>
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

        <div className="sliding-doors" aria-label="Trasformazione">
          <div className="door door-before">
            <div className="door-label">{t("landing.solution.doorBeforeLabel")}</div>
            <ul>
              {doorBefore.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
          <div className="door-arrow" aria-hidden="true">
            &rarr;
          </div>
          <div className="door door-after">
            <div className="door-label">{t("landing.solution.doorAfterLabel")}</div>
            <ul>
              {doorAfter.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </div>

        <div className="solution-cta-row">
          <a href={ANCHORS.trial} className="btn-primary">
            {t("landing.solution.ctaPrimary")}
            <span className="arrow" />
          </a>
          <span className="note">{t("landing.solution.ctaNote")}</span>
        </div>
      </div>
    </section>
  );
}
