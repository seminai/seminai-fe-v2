import { useTranslation } from "react-i18next";
import { ANCHORS, getWhatsAppUrl, LANDING_LOGO, LEGAL_ROUTES } from "./constants";

export function LandingFooter() {
  const { t, i18n } = useTranslation();
  const whatsAppUrl = getWhatsAppUrl(i18n.language);
  const year = new Date().getFullYear();

  return (
    <footer>
      <div className="container">
        <div className="foot-top">
          <div className="foot-brand">
            <a href="/" className="brand">
              <img src={LANDING_LOGO} alt="Seminai" className="brand-img" />
              <span>Seminai</span>
            </a>
            <p>{t("landing.footer.description")}</p>
          </div>
          <div className="foot-col">
            <h5>{t("landing.footer.productTitle")}</h5>
            <ul>
              <li>
                <a href={ANCHORS.how}>{t("landing.footer.productLinks.how")}</a>
              </li>
              <li>
                <a href={ANCHORS.sources}>{t("landing.footer.productLinks.sources")}</a>
              </li>
              <li>
                <a href={ANCHORS.plans}>{t("landing.footer.productLinks.plans")}</a>
              </li>
              <li>
                <a href={ANCHORS.who}>{t("landing.footer.productLinks.cooperative")}</a>
              </li>
              <li>
                <a href={ANCHORS.faq}>{t("landing.footer.productLinks.faq")}</a>
              </li>
            </ul>
          </div>
          <div className="foot-col">
            <h5>{t("landing.footer.contactTitle")}</h5>
            <ul>
              <li>
                <a href="mailto:info@seminai.tech">{t("landing.footer.email")}</a>
              </li>
              <li>
                <a href={whatsAppUrl} target="_blank" rel="noopener noreferrer">
                  {t("landing.footer.whatsapp")}
                </a>
              </li>
              <li>
                <a href={ANCHORS.trial}>{t("landing.footer.trial")}</a>
              </li>
            </ul>
          </div>
          <div className="foot-col">
            <h5>{t("landing.footer.legalTitle")}</h5>
            <ul>
              <li>
                <a href={LEGAL_ROUTES.privacy}>{t("landing.footer.privacy")}</a>
              </li>
              <li>
                <a href={LEGAL_ROUTES.cookies}>{t("landing.footer.cookies")}</a>
              </li>
              <li>
                <a href={LEGAL_ROUTES.terms}>{t("landing.footer.terms")}</a>
              </li>
            </ul>
          </div>
        </div>
        <div className="foot-bottom">
          <span>{t("landing.footer.copyright", { year })}</span>
        </div>
      </div>
    </footer>
  );
}
