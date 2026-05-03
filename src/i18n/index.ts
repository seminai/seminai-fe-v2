import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./locales/en.json";
import it from "./locales/it.json";

export const LANGUAGE_STORAGE_KEY = "seminai-language";
export const SUPPORTED_LANGUAGES = ["it", "en"] as const;

export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export const LANGUAGE_OPTIONS: Array<{
  value: SupportedLanguage;
  shortLabel: string;
  labelKey: string;
}> = [
  { value: "it", shortLabel: "IT", labelKey: "language.italian" },
  { value: "en", shortLabel: "ENG", labelKey: "language.english" },
];

export function isSupportedLanguage(
  language: string | null | undefined,
): language is SupportedLanguage {
  return SUPPORTED_LANGUAGES.includes(language as SupportedLanguage);
}

export function normalizeLanguage(language: string): SupportedLanguage {
  const baseLanguage = language.split("-")[0];
  return isSupportedLanguage(baseLanguage) ? baseLanguage : "it";
}

export function getIntlLocale(language: string): string {
  return normalizeLanguage(language) === "en" ? "en-US" : "it-IT";
}

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
