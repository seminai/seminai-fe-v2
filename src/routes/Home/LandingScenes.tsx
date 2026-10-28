import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { ChatWalkthrough, PlanWalkthrough } from "./AgriScenes";
import { RichHtml } from "./RichHtml";

const DEMOS: ReadonlyArray<{ key: "chat" | "plan"; scene: ReactNode }> = [
  { key: "chat", scene: <ChatWalkthrough /> },
  { key: "plan", scene: <PlanWalkthrough /> },
];

export function LandingScenes() {
  const { t } = useTranslation();

  return (
    <section className="row" id="in-azione">
      <div className="container">
        <div className="section-head section-head-single">
          <div>
            <h2>
              <RichHtml html={t("landing.show.title")} />
            </h2>
            <p className="lead">{t("landing.show.lead")}</p>
          </div>
        </div>
        <div className="demo-showcase">
          {DEMOS.map((demo) => (
            <div key={demo.key} className="demo-item">
              <div className="demo-item-head">
                <div className="eyebrow">{t(`landing.show.demos.${demo.key}.eyebrow`)}</div>
                <h3>{t(`landing.show.demos.${demo.key}.heading`)}</h3>
                <p>{t(`landing.show.demos.${demo.key}.body`)}</p>
              </div>
              {demo.scene}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
