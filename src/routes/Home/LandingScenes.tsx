import { useTranslation } from "react-i18next";
import { ChatWalkthrough, PlanWalkthrough } from "./AgriScenes";
import { RichHtml } from "./RichHtml";

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
        <div className="scene-grid">
          <PlanWalkthrough />
          <ChatWalkthrough />
        </div>
      </div>
    </section>
  );
}
