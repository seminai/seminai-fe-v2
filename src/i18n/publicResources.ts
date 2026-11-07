import it from "./locales/landing-it.json";
import en from "./locales/landing-en.json";

/** Public-only copy shared by the static site and the dynamic catalogue. */
export const PUBLIC_RESOURCES = {
  it: { translation: { landing: it, language: { publicSwitcherAria: "Lingua" } } },
  en: { translation: { landing: en, language: { publicSwitcherAria: "Language" } } },
};
