import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import enBase from "./locales/en.json";
import itBase from "./locales/it.json";
import landingEn from "./locales/landing-en.json";
import landingIt from "./locales/landing-it.json";

const it = { ...itBase, landing: landingIt };
const en = { ...enBase, landing: landingEn };

export * from "./language";
import {
  LANGUAGE_STORAGE_KEY,
  isSupportedLanguage,
  normalizeLanguage,
  SUPPORTED_LANGUAGES,
  type SupportedLanguage,
} from "./language";

function getInitialLanguage(): SupportedLanguage {
  if (typeof window === "undefined") {
    return "it";
  }

  const storedLanguage = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
  return isSupportedLanguage(storedLanguage) ? storedLanguage : "it";
}

function persistLanguage(language: string): void {
  const normalizedLanguage = normalizeLanguage(language);

  if (typeof document !== "undefined") {
    document.documentElement.lang = normalizedLanguage;
  }

  if (typeof window !== "undefined") {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, normalizedLanguage);
  }
}

i18n.use(initReactI18next).init({
  resources: {
    it: { translation: it },
    en: { translation: en },
  },
  lng: getInitialLanguage(),
  fallbackLng: "it",
  supportedLngs: SUPPORTED_LANGUAGES,
  interpolation: {
    escapeValue: false,
  },
});

persistLanguage(i18n.language);
i18n.on("languageChanged", persistLanguage);

export default i18n;
