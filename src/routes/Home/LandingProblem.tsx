import { useTranslation } from "react-i18next";
import { RichHtml } from "./RichHtml";

interface ProblemCard {
  title: string;
  body: string;
}

export function LandingProblem() {
  const { t } = useTranslation();
  const cards = t("landing.problem.cards", {
    returnObjects: true,
  }) as ProblemCard[];

  return (
    <section className="row problem">
      <div className="container">
        <div className="section-head section-head-single">
          <h2>
            <RichHtml html={t("landing.problem.title")} />
          </h2>
          <p className="lead">{t("landing.problem.lead")}</p>
        </div>

        <div className="problem-grid">
          {cards.map((card, index) => (
            <article key={card.title} className="problem-card">
              <span className="step-number">
                {String(index + 1).padStart(2, "0")}
              </span>
              <h3>{card.title}</h3>
              <p>{card.body}</p>
            </article>
          ))}
        </div>

        <div className="problem-bridge">
          <p>
            <RichHtml html={t("landing.problem.bridge")} />
          </p>
        </div>
      </div>
    </section>
  );
}
