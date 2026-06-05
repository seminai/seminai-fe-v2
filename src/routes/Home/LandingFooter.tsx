import { useTranslation } from "react-i18next";
import {
  ANCHORS,
  LANDING_LOGO,
  LANDING_LOGO_SRCSET,
  LEGAL_ROUTES,
} from "./constants";

interface LandingFooterProps {
  onOpenSendInvoices: () => void;
}

export function LandingFooter({ onOpenSendInvoices }: LandingFooterProps) {
  const { t } = useTranslation();
  const year = new Date().getFullYear();

  return (
    <footer>
      <div className="container">
        <div className="foot-top">
          <div className="foot-brand">
            <a href="/" className="brand">
              <img
                src={LANDING_LOGO}
                srcSet={LANDING_LOGO_SRCSET}
                alt=""
                className="brand-img"
                aria-hidden="true"
                loading="lazy"
                decoding="async"
                width={34}
                height={34}
              />
              <span>Seminai</span>
            </a>
            <p>{t("landing.footer.description")}</p>
          </div>
          <div className="foot-col">
            <div className="foot-title">{t("landing.footer.productTitle")}</div>
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
              <li>
                <a href="/llms.txt">{t("landing.footer.productLinks.aiInfo")}</a>
              </li>
            </ul>
          </div>
          <div className="foot-col">
            <div className="foot-title">{t("landing.footer.contactTitle")}</div>
            <ul>
              <li>
                <a href="mailto:info@seminai.tech">{t("landing.footer.email")}</a>
              </li>
              <li>
                <button type="button" className="foot-link-btn" onClick={onOpenSendInvoices}>
                  {t("landing.footer.sendInvoices")}
                </button>
              </li>
              <li>
                <a href={ANCHORS.trial}>{t("landing.footer.trial")}</a>
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
