import { useTranslation } from "react-i18next";
import {
  LANGUAGE_OPTIONS,
  normalizeLanguage,
  type SupportedLanguage,
} from "@/i18n";
import { ANCHORS, LANDING_LOGIN_URL, LANDING_LOGO } from "./constants";

export function LandingNav() {
  const { t, i18n } = useTranslation();
  const currentLanguage = normalizeLanguage(i18n.language);

  const changeLanguage = (language: SupportedLanguage) => {
    void i18n.changeLanguage(language);
  };

  return (
    <nav className="top">
      <div className="container nav-row" style={{ padding: "14px 12px" }}>
        <a href="#" className="brand">
          <img src={LANDING_LOGO} alt="Seminai" className="brand-img" />
          <span>Seminai</span>
        </a>
        <div className="nav-links">
          <a href={ANCHORS.how}>{t("landing.nav.how")}</a>
          <a href={ANCHORS.who}>{t("landing.nav.who")}</a>
          <a href={ANCHORS.plans}>{t("landing.nav.plans")}</a>
          <a href={ANCHORS.faq}>{t("landing.nav.faq")}</a>
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
      </div>
    </nav>
  );
}
