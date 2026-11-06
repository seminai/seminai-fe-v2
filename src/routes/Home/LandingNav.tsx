import { useTranslation } from "react-i18next";
import { useLocation } from "react-router-dom";
import {
  LANGUAGE_OPTIONS,
  normalizeLanguage,
  type SupportedLanguage,
} from "@/i18n/language";
import { newsIndexPath } from "@/lib/news";
import {
  ANCHORS,
  LANDING_LOGIN_URL,
  LANDING_LOGO,
  LANDING_LOGO_SRCSET,
} from "./constants";

export function LandingBrand() {
  const { i18n } = useTranslation();
  return (
    <a href={i18n.language.startsWith("en") ? "/en/" : "/"} className="brand">
      <span className="brand-mark">
        <img
          src={LANDING_LOGO}
          srcSet={LANDING_LOGO_SRCSET}
          alt=""
          className="brand-img"
          width={28}
          height={28}
        />
      </span>
      Semin<span className="brand-ai">AI</span>
    </a>
  );
}

type LandingNavProps = {
  /**
   * Pages whose language comes from the URL (news) pass the IT / EN destinations:
   * the switch then navigates instead of changing the i18n language in place.
   */
  languageLinks?: Record<SupportedLanguage, string>;
};

export function LandingNav({ languageLinks }: LandingNavProps = {}) {
  const { t, i18n } = useTranslation();
  const currentLanguage = normalizeLanguage(i18n.language);
  const isEnglish = currentLanguage === "en";
  const isNewsPage = /^\/(en\/)?news(\/|$)/.test(useLocation().pathname);

  const links = languageLinks ?? { it: "/", en: "/en/" };

  return (
    <>
      <a className="skip-link" href="#contenuto">
        {isEnglish ? "Skip to content" : "Vai al contenuto"}
      </a>
      <header className="site-header">
        <LandingBrand />
        <nav
          className="nav-links"
          aria-label={isEnglish ? "Main" : "Navigazione principale"}
        >
          <a href={`${isEnglish ? "/en/" : "/"}#come-funziona`}>
            {t("landing.nav.how")}
          </a>
          <a href={`${isEnglish ? "/en/" : "/"}#cosa-puoi-fare`}>
            {t("landing.nav.useCases")}
          </a>
          <a href={`${isEnglish ? "/en/" : "/"}#faq`}>{t("landing.nav.faq")}</a>
          <a
            href={newsIndexPath(currentLanguage)}
            aria-current={isNewsPage ? "page" : undefined}
          >
            {t("landing.nav.news")}
          </a>
          <a href={isEnglish ? "/en/resources/" : "/risorse/"}>
            {isEnglish ? "Resources" : "Risorse"}
          </a>
          <a href={isEnglish ? "/en/skills/" : "/skills/"}>
            {isEnglish ? "AI skills" : "Skill AI"}
          </a>
        </nav>
        <div className="nav-actions">
          <div
            className="lang-toggle"
            role="group"
            aria-label={t("language.publicSwitcherAria")}
          >
            {LANGUAGE_OPTIONS.map((option) => (
              <a
                key={option.value}
                href={links[option.value]}
                hrefLang={option.value}
                data-lang={option.value}
                aria-current={
                  currentLanguage === option.value ? "page" : undefined
                }
              >
                {option.value === "it" ? "IT" : "EN"}
              </a>
            ))}
          </div>
          <a
            href={LANDING_LOGIN_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="nav-login"
          >
            {t("landing.nav.login")}
          </a>
          <a href={ANCHORS.booking} className="nav-cta">
            {t("landing.nav.demo")}
          </a>
        </div>
      </header>
    </>
  );
}
