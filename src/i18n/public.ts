import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { PUBLIC_RESOURCES } from "./publicResources";

// Public rendering follows the URL, never a preference left by the private app.
const lang =
  typeof location !== "undefined" && /^\/en(?:\/|$)/.test(location.pathname)
    ? "en"
    : "it";
i18n.use(initReactI18next).init({
  lng: lang,
  fallbackLng: "it",
  interpolation: { escapeValue: false },
  resources: PUBLIC_RESOURCES,
});
export default i18n;
