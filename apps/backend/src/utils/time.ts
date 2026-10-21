/**
 * User-local time context for LLM prompts.
 *
 * The backend runs in one timezone (usually UTC), but users reason about
 * "today", "this quarter", or "next year" in their own zone. Every LLM call
 * therefore receives a short human-readable sentence describing the user's
 * current local date and time, derived from the `X-Timezone` request header.
 */

/** Timezone assumed when the client sends nothing usable. */
export const FALLBACK_TIMEZONE = "Asia/Jakarta";

/**
 * Returns `timeZone` when the runtime recognises it as a valid IANA zone,
 * otherwise `FALLBACK_TIMEZONE`. `Intl` throws a RangeError for unknown
 * zones; the check is done by constructing a formatter inside a try/catch so
 * a malformed header value can never crash an LLM request.
 */
export function resolveTimeZone(timeZone?: string | null): string {
  if (!timeZone) return FALLBACK_TIMEZONE;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone });
    return timeZone;
  } catch {
    return FALLBACK_TIMEZONE;
  }
}

/**
 * Builds the prompt fragment injected into LLM system/user messages, e.g.
 * `Waktu lokal pengguna saat ini: Rabu, 21 Oktober 2026 pukul 14.30.00 WIB (Asia/Jakarta).`
 *
 * The `Asia/Jakarta` suffix is kept explicitly because the locale string alone
 * prints an abbreviation (WIB) that models may not map back to a zone.
 */
export function formatUserCurrentTime(timeZone?: string | null, now: Date = new Date()): string {
  const zone = resolveTimeZone(timeZone);

  let formatted: string;
  try {
    formatted = new Intl.DateTimeFormat("id-ID", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
      timeZone: zone,
    }).format(now);
  } catch {
    // Defensive: even a resolved zone can fail on exotic ICU builds.
    formatted = now.toISOString();
  }

  return (
    `Waktu lokal pengguna saat ini: ${formatted} (${zone}). ` +
    "Gunakan konteks waktu ini jika pengguna atau dokumen mereferensikan waktu relatif " +
    "(seperti hari ini, tahun ini, kuartal ini, atau tenggat waktu)."
  );
}
