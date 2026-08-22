export const ANALYTICS_CONSENT_KEY = "ia-analytics-consent";
export const ANALYTICS_CONSENT_EVENT = "ia-analytics-consent";
export const COOKIE_PREFERENCES_EVENT = "ia-cookie-preferences";

export type AnalyticsConsent = "granted" | "denied";

// Default for visitors who have not made a choice yet. Null keeps the opt-in
// behaviour (banner decides); "granted" enables analytics by default — used
// when the cookie banner is hidden via COOKIE_BANNER=false.
let defaultConsent: AnalyticsConsent | null = null;

export function setAnalyticsDefaultConsent(value: AnalyticsConsent | null): void {
  defaultConsent = value;
}

export function readAnalyticsConsent(): AnalyticsConsent | null {
  if (typeof window === "undefined") return null;
  try {
    const value = localStorage.getItem(ANALYTICS_CONSENT_KEY);
    return value === "granted" || value === "denied" ? value : defaultConsent;
  } catch {
    return defaultConsent;
  }
}

export function writeAnalyticsConsent(value: AnalyticsConsent): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(ANALYTICS_CONSENT_KEY, value);
  } catch {
    /* ignore quota / private mode */
  }
  if (value === "denied") {
    clearFirstPartyGaCookies();
  }
  window.dispatchEvent(new Event(ANALYTICS_CONSENT_EVENT));
}

export function resetAnalyticsConsent(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(ANALYTICS_CONSENT_KEY);
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new Event(ANALYTICS_CONSENT_EVENT));
}

export function subscribeAnalyticsConsent(onChange: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(ANALYTICS_CONSENT_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(ANALYTICS_CONSENT_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

export function hasAnalyticsConsent(): boolean {
  return readAnalyticsConsent() === "granted";
}

export function openCookiePreferences(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(COOKIE_PREFERENCES_EVENT));
}

export function subscribeCookiePreferences(onOpen: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(COOKIE_PREFERENCES_EVENT, onOpen);
  return () => window.removeEventListener(COOKIE_PREFERENCES_EVENT, onOpen);
}

function isGaCookieName(name: string): boolean {
  return name === "_ga" || name === "_gid" || name === "_gat" || name.startsWith("_ga_") || name.startsWith("_gac_");
}

export function clearFirstPartyGaCookies(): void {
  if (typeof document === "undefined") return;
  const hostname = window.location.hostname;
  const domains = ["", hostname, `.${hostname}`];
  const names = document.cookie.split(";").map((part) => part.split("=")[0]?.trim() ?? "");
  for (const name of names) {
    if (!name || !isGaCookieName(name)) continue;
    for (const domain of domains) {
      const domainPart = domain ? `; domain=${domain}` : "";
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/${domainPart}`;
    }
  }
}
