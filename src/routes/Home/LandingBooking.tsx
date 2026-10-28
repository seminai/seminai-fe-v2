import { useTranslation } from "react-i18next";
import { DemoRequestForm } from "./DemoRequestForm";
import { SCENE } from "./sceneImages";

export function LandingBooking() {
  const { t } = useTranslation();

  return (
    <section className="row booking" id="prenota">
      <div className="container">
        <div className="section-head">
          <h2>{t("landing.booking.title")}</h2>
          <p className="lead">{t("landing.booking.lead")}</p>
        </div>
        <div className="booking-grid">
          <img
            className="booking-photo"
            src={SCENE.photoFarmerBack}
            alt=""
            aria-hidden="true"
            loading="lazy"
          />
          <DemoRequestForm />
        </div>
      </div>
    </section>
  );
}
