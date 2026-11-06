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
