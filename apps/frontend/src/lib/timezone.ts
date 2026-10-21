/**
 * Client timezone detection.
 *
 * The backend needs the user's local timezone so LLM prompts can refer to
 * "today", "this quarter", etc. relative to the user's own clock instead of
 * the server's. Browsers expose the IANA zone through `Intl`, so it is sent
 * as the `X-Timezone` header on every API call.
 */

/** Timezone used when the browser cannot report one (and on the server). */
export const FALLBACK_TIMEZONE = "Asia/Jakarta";

/**
 * Returns the IANA timezone of the current browser, or `FALLBACK_TIMEZONE`
 * when running on the server or when the runtime reports nothing useful.
 */
export function getClientTimezone(): string {
  if (typeof Intl === "undefined" || typeof Intl.DateTimeFormat !== "function") {
    return FALLBACK_TIMEZONE;
  }
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || FALLBACK_TIMEZONE;
  } catch {
    return FALLBACK_TIMEZONE;
  }
}

/**
 * Sets the `X-Timezone` header on an outgoing request unless the caller
 * already provided one explicitly.
 */
export function applyTimezoneHeader(headers: Headers): void {
  if (!headers.has("X-Timezone")) {
    headers.set("X-Timezone", getClientTimezone());
  }
}
