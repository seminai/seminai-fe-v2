import { useTranslation } from "react-i18next";
import { RichHtml } from "./RichHtml";

interface ProblemCard {
  title: string;
  body: string;
}

function ClockIcon() {
  return (
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <circle cx="24" cy="24" r="19" stroke="currentColor" strokeWidth="2.2" />
      <path d="M24 12V24L32 29" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="24" cy="24" r="1.6" fill="currentColor" />
      <path d="M24 5V8M24 40V43M5 24H8M40 24H43" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M24 6L43 39H5L24 6Z" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" />
      <path d="M24 19V28" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
      <circle cx="24" cy="33" r="1.7" fill="currentColor" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M24 5L41 11V24C41 33 33 40 24 43C15 40 7 33 7 24V11L24 5Z" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" />
      <path d="M16 24L22 30L33 18" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const PROBLEM_ICONS = [ClockIcon, AlertIcon, ShieldIcon];

export function LandingProblem() {
  const { t } = useTranslation();
  const cards = t("landing.problem.cards", {
    returnObjects: true,
  }) as ProblemCard[];

  return (
    <section className="row problem" style={{ padding: "50px 0px" }}>
      <div className="container">
        <div className="section-head section-head-single">
          <div>
            <h2>
              <RichHtml html={t("landing.problem.title")} />
            </h2>
            <p className="lead">{t("landing.problem.lead")}</p>
          </div>
        </div>

        <div className="problem-grid">
          {cards.map((card, index) => {
            const Icon = PROBLEM_ICONS[index] ?? ClockIcon;
            return (
              <div
                key={card.title}
                className="problem-card"
                style={{ padding: "22px 22px 22px 30px" }}
              >
                <div className="problem-icon icon-clock">
                  <Icon />
                </div>
                <h3>{card.title}</h3>
                <p>{card.body}</p>
              </div>
            );
          })}
        </div>

        <div className="problem-bridge" style={{ margin: 0 }}>
          <p>
            <RichHtml html={t("landing.problem.bridge")} />
          </p>
        </div>
      </div>
    </section>
  );
}
