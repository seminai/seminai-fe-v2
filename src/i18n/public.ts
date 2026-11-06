import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import it from "./locales/landing-it.json";
import en from "./locales/landing-en.json";

// Public rendering follows the URL, never a preference left by the private app.
const lang =
  typeof location !== "undefined" && /^\/en(?:\/|$)/.test(location.pathname)
    ? "en"
    : "it";
i18n.use(initReactI18next).init({
  lng: lang,
  fallbackLng: "it",
  interpolation: { escapeValue: false },
  resources: {
    it: {
      translation: { landing: it, language: { publicSwitcherAria: "Lingua" } },
    },
    en: {
      translation: {
        landing: en,
        language: { publicSwitcherAria: "Language" },
      },
    },
  },
});
export default i18n;
