import { useTranslation } from "react-i18next";
import { normalizeLanguage } from "@/i18n/language";
import { openCookiePreferences } from "@/lib/analytics";
import { newsIndexPath } from "@/lib/news";
import { demoPath, homePath } from "@/config/publicPaths";
import { CONTACT_URL, LEGAL_ROUTES } from "./constants";
import { CookieConsent } from "./CookieConsent";
import { LandingBrand } from "./LandingNav";

export function LandingFooter() {
  const { t, i18n } = useTranslation();
  const year = new Date().getFullYear();
  const lang = normalizeLanguage(i18n.language);

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
                <a
                  href={
                    i18n.language.startsWith("en")
                      ? "/en/resources/"
                      : "/risorse/"
                  }
                >
                  {i18n.language.startsWith("en") ? "Resources" : "Risorse"}
                </a>
              </li>
              <li>
                <a href={i18n.language.startsWith("en") ? "/en/skills/" : "/skills/"}>
                  {i18n.language.startsWith("en") ? "AI skills" : "Skill AI"}
                </a>
              </li>
              <li>
                <a
                  href={
                    i18n.language.startsWith("en") ? "/en/rules/" : "/regole/"
                  }
                >
                  {i18n.language.startsWith("en")
                    ? "Public rules"
                    : "Regole pubbliche"}
                </a>
              </li>
              <li>
                <a
                  href={
                    i18n.language.startsWith("en")
                      ? "/en/about/"
                      : "/chi-siamo/"
                  }
                >
                  {i18n.language.startsWith("en") ? "About" : "Chi siamo"}
                </a>
              </li>
              <li>
                <a
                  href={
                    i18n.language.startsWith("en")
                      ? "/en/editorial-policy/"
                      : "/politica-editoriale/"
                  }
                >
                  {i18n.language.startsWith("en")
                    ? "Editorial policy"
                    : "Politica editoriale"}
                </a>
              </li>
              <li>
                <a href={`${homePath(lang)}#come-funziona`}>{t("landing.footer.productLinks.how")}</a>
              </li>
              <li>
                <a href={`${homePath(lang)}#cosa-puoi-fare`}>
                  {t("landing.footer.productLinks.useCases")}
                </a>
              </li>
              <li>
                <a href={`${homePath(lang)}#faq`}>{t("landing.footer.productLinks.faq")}</a>
              </li>
              <li>
                <a href={newsIndexPath(normalizeLanguage(i18n.language))}>
                  {t("landing.footer.productLinks.news")}
                </a>
              </li>
              <li>
                <a href="/llms.txt">
                  {t("landing.footer.productLinks.aiInfo")}
                </a>
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
                <a href={demoPath(lang)}>{t("landing.footer.demo")}</a>
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
              <li>
                <button
                  type="button"
                  className="foot-link"
                  onClick={openCookiePreferences}
                >
                  {t("landing.footer.cookiePreferences")}
                </button>
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
      <CookieConsent />
    </footer>
  );
}
