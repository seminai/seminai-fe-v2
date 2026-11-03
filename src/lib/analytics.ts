/**
 * Google Analytics 4 for the public site, opt-in only (GDPR). gtag.js is not
 * loaded and no cookie is written until the visitor accepts in the cookie
 * banner; the choice is kept in localStorage with the same format as the app.
 */

export const GA_MEASUREMENT_ID = "G-9XXN0YJLHN";

const CONSENT_STORAGE_KEY = "seminai-cookie-consent";
const CONSENT_VERSION = 1;
const PREFERENCES_EVENT = "seminai:cookie-preferences";

export type ConsentStatus = "granted" | "denied";

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

let loaded = false;

export function readStoredConsent(): ConsentStatus | null {
  try {
    const raw = localStorage.getItem(CONSENT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { status?: string; version?: number };
    if (parsed.version !== CONSENT_VERSION) return null;
    return parsed.status === "granted" || parsed.status === "denied" ? parsed.status : null;
  } catch {
    return null;
  }
}

function writeStoredConsent(status: ConsentStatus): void {
  try {
    localStorage.setItem(
      CONSENT_STORAGE_KEY,
      JSON.stringify({ status, version: CONSENT_VERSION, timestamp: new Date().toISOString() }),
    );
  } catch {
    /* storage blocked: the banner shows again on the next visit */
  }
}

/** Injects gtag.js once. Page views (including SPA navigation) come from GA4 enhanced measurement. */
export function loadGoogleAnalytics(): void {
  if (loaded) return;
  loaded = true;

  window.dataLayer = window.dataLayer ?? [];
  window.gtag = function gtag() {
    // gtag.js expects the Arguments object itself, not an array.
    // eslint-disable-next-line prefer-rest-params
    window.dataLayer?.push(arguments);
  };
  window.gtag("consent", "default", {
    analytics_storage: "granted",
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
  });
  window.gtag("js", new Date());
  window.gtag("config", GA_MEASUREMENT_ID);

  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
  document.head.appendChild(script);
}

export function grantAnalyticsConsent(): void {
  writeStoredConsent("granted");
  if (loaded) {
    window.gtag?.("consent", "update", { analytics_storage: "granted" });
  } else {
    loadGoogleAnalytics();
  }
}

export function revokeAnalyticsConsent(): void {
  writeStoredConsent("denied");
  if (!loaded) return;
  window.gtag?.("consent", "update", { analytics_storage: "denied" });
  deleteGoogleAnalyticsCookies();
}

/** Removes the _ga cookies GA4 set on this host or on the parent domain. */
function deleteGoogleAnalyticsCookies(): void {
  const host = window.location.hostname;
  const domains = ["", host, `.${host.split(".").slice(-2).join(".")}`];
  for (const cookie of document.cookie.split(";")) {
    const name = cookie.split("=")[0].trim();
    if (!name.startsWith("_ga")) continue;
    for (const domain of domains) {
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/${domain ? `; domain=${domain}` : ""}`;
    }
  }
}

/** Reopens the cookie banner (footer "Cookie preferences" link). */
export function openCookiePreferences(): void {
  window.dispatchEvent(new Event(PREFERENCES_EVENT));
}

export function onCookiePreferencesRequest(listener: () => void): () => void {
  window.addEventListener(PREFERENCES_EVENT, listener);
  return () => window.removeEventListener(PREFERENCES_EVENT, listener);
}
