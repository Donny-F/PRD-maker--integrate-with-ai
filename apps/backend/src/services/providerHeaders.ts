/**
 * Provider-specific HTTP headers for OpenAI-compatible LLM clients.
 *
 * Most OpenAI-compatible endpoints only need `Authorization`, which the
 * OpenAI SDK sets from the API key. OpenCode Go is stricter: its gateway
 * rejects requests that do not identify the calling agent and the
 * conversation, returning HTTP 400 before it even validates the API key:
 *
 *   400 Request is missing x-opencode-session and cannot be routed
 *       efficiently.
 *
 * Per the OpenCode Go documentation (https://opencode.ai/docs/go/) a client
 * must send:
 *   - a non-generic `User-Agent` naming the application, and
 *   - a stable `x-opencode-session` value per conversation so the gateway can
 *     route requests and reuse the provider prompt cache.
 *
 * The header builder is isolated here so the transport concern stays out of
 * the LLM feature code and can be verified independently.
 */
import crypto from "crypto";

/** OpenCode Go host that fronts the inference gateway. */
const OPEN_CODE_GO_HOST = "opencode.ai";

/** Path prefix shared by every documented OpenCode Go gateway. */
const OPEN_CODE_GO_PATH_PREFIX = "/inference/go/";

/** Application identity sent to OpenCode Go instead of the generic SDK name. */
export const OPEN_CODE_GO_USER_AGENT = "prd-maker/1.0";

/**
 * Returns true when `baseUrl` points at the OpenCode Go inference gateway.
 *
 * Detection is host- and path-based so all documented gateways are covered
 * (`/openai/v1`, `/openai/v1/responses`, `/anthropic/v1/messages`,
 * `/google/v1beta/...`) while unrelated OpenAI-compatible providers are left
 * untouched. Invalid or relative URLs never enable the extra headers.
 */
export function isOpenCodeGoBaseUrl(baseUrl: string): boolean {
  try {
    const url = new URL(baseUrl);
    const host = url.hostname.toLowerCase();
    const isHostMatch =
      host === OPEN_CODE_GO_HOST || host.endsWith(`.${OPEN_CODE_GO_HOST}`);
    return isHostMatch && url.pathname.startsWith(OPEN_CODE_GO_PATH_PREFIX);
  } catch {
    return false;
  }
}

/**
 * Derives a deterministic UUID-shaped session id from `key`.
 *
 * Determinism matters: the gateway uses the value for routing affinity and
 * prompt caching, so the same conversation must present the same id across
 * requests and backend restarts. A random id per request would satisfy the
 * presence check but defeat caching entirely.
 */
export function deriveOpenCodeSessionId(key: string): string {
  const hash = crypto
    .createHash("sha256")
    .update(`prd-maker:${key}`)
    .digest("hex");

  // 8-4-4-4-12 layout. Version/variant nibbles are pinned so the value is a
  // valid UUID even though it is a hash of the caller's conversation key.
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-8${hash.slice(
    17,
    20
  )}-${hash.slice(20, 32)}`;
}

/**
 * Builds the default headers for the SDK client of a given LLM config.
 *
 * Returns `undefined` for providers that need no extra headers, which keeps
 * the OpenAI SDK defaults intact for Google, DeepSeek, and other endpoints.
 *
 * `sessionKey` should identify the conversation (for example the project id).
 * When the caller has no conversation id yet, the config id is used so the
 * value stays stable per model instead of changing on every request.
 */
export function buildDefaultHeaders(
  config: { id: string; baseUrl: string },
  sessionKey?: string
): Record<string, string> | undefined {
  if (!isOpenCodeGoBaseUrl(config.baseUrl)) return undefined;

  return {
    "x-opencode-session": deriveOpenCodeSessionId(
      sessionKey ?? `config:${config.id}`
    ),
    "User-Agent": OPEN_CODE_GO_USER_AGENT,
  };
}
