import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  grantAnalyticsConsent,
  loadGoogleAnalytics,
  onCookiePreferencesRequest,
  readStoredConsent,
  revokeAnalyticsConsent,
} from "@/lib/analytics";
import { LEGAL_ROUTES } from "./constants";

/**
 * Cookie banner of the public pages. Renders nothing on the server (the choice
 * lives in localStorage), so the prerendered HTML never contains it.
 */
export function CookieConsent() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  // Syncs with localStorage and the footer link, both outside React.
  useEffect(() => {
    const consent = readStoredConsent();
    if (consent === "granted") loadGoogleAnalytics();
    if (consent === null) setOpen(true);
    return onCookiePreferencesRequest(() => setOpen(true));
  }, []);

  if (!open) return null;

  const choose = (accept: boolean) => {
    if (accept) {
      grantAnalyticsConsent();
    } else {
      revokeAnalyticsConsent();
    }
    setOpen(false);
  };

  return (
    <div className="cookie-banner" role="region" aria-label={t("landing.cookieBanner.label")}>
      <p>
        {t("landing.cookieBanner.text")}{" "}
        <a href={LEGAL_ROUTES.cookies}>{t("landing.cookieBanner.more")}</a>
      </p>
      <div className="cookie-banner-actions">
        <button type="button" className="btn-secondary" onClick={() => choose(false)}>
          {t("landing.cookieBanner.reject")}
        </button>
        <button type="button" className="btn-primary" onClick={() => choose(true)}>
          {t("landing.cookieBanner.accept")}
        </button>
      </div>
    </div>
  );
}
