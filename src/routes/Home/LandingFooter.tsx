import { useTranslation } from "react-i18next";
import { ANCHORS, CONTACT_URL, LEGAL_ROUTES } from "./constants";
import { LandingBrand } from "./LandingNav";

export function LandingFooter() {
  const { t } = useTranslation();
  const year = new Date().getFullYear();

  return (
    <footer>
      <div className="container">
        <div className="foot-top">
          <div className="foot-brand">
            <LandingBrand />
            <p>{t("landing.footer.description")}</p>
          </div>
          <div className="foot-col">
            <div className="foot-title">{t("landing.footer.productTitle")}</div>
            <ul>
              <li>
                <a href={ANCHORS.how}>{t("landing.footer.productLinks.how")}</a>
              </li>
              <li>
                <a href={ANCHORS.useCases}>{t("landing.footer.productLinks.useCases")}</a>
              </li>
              <li>
                <a href={ANCHORS.faq}>{t("landing.footer.productLinks.faq")}</a>
              </li>
              <li>
                <a href="/llms.txt">{t("landing.footer.productLinks.aiInfo")}</a>
              </li>
            </ul>
          </div>
          <div className="foot-col">
            <div className="foot-title">{t("landing.footer.contactTitle")}</div>
            <ul>
              <li>
                <a href={CONTACT_URL}>{t("landing.footer.email")}</a>
              </li>
              <li>
                <a href={ANCHORS.booking}>{t("landing.footer.demo")}</a>
              </li>
              <li>
                <a href={CONTACT_URL}>{t("landing.footer.contact")}</a>
              </li>
            </ul>
          </div>
          <div className="foot-col">
            <div className="foot-title">{t("landing.footer.legalTitle")}</div>
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
          {/* year is baked at prerender time; suppress the once-a-year SSR/CSR mismatch */}
          <span suppressHydrationWarning>
            {t("landing.footer.copyright", { year })}
          </span>
        </div>
      </div>
    </footer>
  );
}
