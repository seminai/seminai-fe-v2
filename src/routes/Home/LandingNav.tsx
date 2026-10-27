import { useTranslation } from "react-i18next";
import {
  LANGUAGE_OPTIONS,
  normalizeLanguage,
  type SupportedLanguage,
} from "@/i18n";
import {
  ANCHORS,
  LANDING_LOGIN_URL,
  LANDING_LOGO,
  LANDING_LOGO_SRCSET,
} from "./constants";

export function LandingBrand() {
  return (
    <a href="/" className="brand">
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

export function LandingNav() {
  const { t, i18n } = useTranslation();
  const currentLanguage = normalizeLanguage(i18n.language);
  const isEnglish = currentLanguage === "en";

  const changeLanguage = (language: SupportedLanguage) => {
    void i18n.changeLanguage(language);
  };

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
          <a href={ANCHORS.how}>{t("landing.nav.how")}</a>
          <a href={ANCHORS.manufacturing}>{t("landing.nav.manufacturing")}</a>
          <a href={ANCHORS.who}>{t("landing.nav.who")}</a>
          <a href={ANCHORS.plans}>{t("landing.nav.plans")}</a>
          <a href={ANCHORS.faq}>{t("landing.nav.faq")}</a>
        </nav>
        <div className="nav-actions">
          <div
            className="lang-toggle"
            role="group"
            aria-label={t("language.publicSwitcherAria")}
          >
            {LANGUAGE_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                data-lang={option.value}
                aria-pressed={currentLanguage === option.value}
                onClick={() => changeLanguage(option.value)}
              >
                {option.value === "it" ? "IT" : "EN"}
              </button>
            ))}
          </div>
          <a
            href={LANDING_LOGIN_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="nav-cta"
          >
            {t("landing.nav.login")}
          </a>
        </div>
      </header>
    </>
  );
}
