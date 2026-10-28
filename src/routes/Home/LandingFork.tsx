import { useTranslation } from "react-i18next";
import { ANCHORS } from "./constants";
import { RichHtml } from "./RichHtml";

interface Profile {
  eyebrow: string;
  title: string;
  intro: string;
  items: string[];
  cta?: string;
}

export function LandingFork() {
  const { t } = useTranslation();
  const profiles = t("landing.fork.profiles", {
    returnObjects: true,
  }) as Profile[];

  return (
    <section className="row" id="per-chi">
      <div className="container">
        <div className="section-head section-head-single">
          <div>
            <h2>
              <RichHtml html={t("landing.fork.title")} />
            </h2>
            <p className="lead">{t("landing.fork.lead")}</p>
          </div>
        </div>

        <div className="fork-grid fork-grid-3">
          {profiles.map((profile) => (
            <div key={profile.title} className="fork-card">
              <div className="eyebrow">{profile.eyebrow}</div>
              <h3>{profile.title}</h3>
              <p className="intro">{profile.intro}</p>
              <ul>
                {profile.items.map((item) => (
                  <li key={item}>
                    <RichHtml html={item} />
                  </li>
                ))}
              </ul>
              {profile.cta ? (
                <div className="cta-row">
                  <a href={ANCHORS.manufacturing} className="btn-secondary">
                    {profile.cta}
                  </a>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
