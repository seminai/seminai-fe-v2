import { useTranslation } from "react-i18next";
import { SCENE } from "./sceneImages";

interface ProblemCard {
  title: string;
  body: string;
  tag?: string;
}

const CARD_IMAGES = [SCENE.photoGlovePhone, SCENE.docInvoice, SCENE.softwareChecklist];

export function LandingProblem() {
  const { t } = useTranslation();
  const cards = t("landing.problem.cards", { returnObjects: true }) as ProblemCard[];

  return (
    <section className="row problem">
      <div className="container">
        <div className="section-head">
          <h2>{t("landing.problem.title")}</h2>
          <p className="lead">{t("landing.problem.lead")}</p>
        </div>

        <div className="chaos" aria-hidden="true">
          <img className="chaos-card chaos-call" src={SCENE.msgPhoneCall} alt="" loading="lazy" />
          <img className="chaos-card chaos-whatsapp" src={SCENE.msgWhatsapp} alt="" loading="lazy" />
          <img className="chaos-photo" src={SCENE.photoFarmerPhone} alt="" loading="lazy" />
          <img className="chaos-card chaos-voice" src={SCENE.msgVoice} alt="" loading="lazy" />
        </div>

        <div className="triad">
          {cards.map((card, index) => (
            <article key={card.title} className="triad-card">
              <div className={`triad-visual triad-visual-${index}`} aria-hidden="true">
                <img src={CARD_IMAGES[index]} alt="" loading="lazy" />
                {card.tag ? <span className="extract-tag">{card.tag}</span> : null}
              </div>
              <h3>{card.title}</h3>
              <p>{card.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
