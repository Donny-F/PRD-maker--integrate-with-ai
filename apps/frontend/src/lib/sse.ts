/**
 * Minimal Server-Sent Events (SSE) client built on `fetch`.
 *
 * `EventSource` cannot send an `Authorization` header, which forces callers to
 * put bearer tokens in the URL. URLs are routinely recorded by access logs,
 * proxies, and browser history, so this helper reads the stream manually and
 * lets the caller pass the token through normal request headers instead.
 *
 * The parser handles event boundaries split across network chunks, CRLF line
 * endings, comment lines, and multi-line `data:` fields per the SSE spec.
 */
export interface SseMessage {
  event: string;
  data: string;
}

export async function streamSse(
  url: string,
  init: RequestInit,
  onMessage: (message: SseMessage) => void
): Promise<void> {
  const headers = new Headers(init.headers);
  if (!headers.has("Accept")) {
    headers.set("Accept", "text/event-stream");
  }

  const response = await fetch(url, {
    ...init,
    headers,
    cache: "no-store",
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    let message = body;
    try {
      const parsed = JSON.parse(body) as { error?: unknown };
      if (typeof parsed.error === "string" && parsed.error) {
        message = parsed.error;
      }
    } catch {
      // Non-JSON error body: keep the raw text.
    }
    throw new Error(message || `Streaming request failed with status ${response.status}`);
  }

  if (!response.body) {
    throw new Error("Streaming response has no body");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  const dispatch = (block: string) => {
    let event = "message";
    const dataLines: string[] = [];

    for (const line of block.split("\n")) {
      if (!line || line.startsWith(":")) continue;

      const colon = line.indexOf(":");
      const field = colon === -1 ? line : line.slice(0, colon);
      let value = colon === -1 ? "" : line.slice(colon + 1);
      if (value.startsWith(" ")) value = value.slice(1);

      if (field === "event") {
        event = value;
      } else if (field === "data") {
        dataLines.push(value);
      }
    }

    // Per the SSE spec, an event without data is not dispatched.
    if (dataLines.length > 0) {
      onMessage({ event, data: dataLines.join("\n") });
    }
  };

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      buffer = buffer.replace(/\r\n?/g, "\n");

      let boundary = buffer.indexOf("\n\n");
      while (boundary !== -1) {
        const block = buffer.slice(0, boundary);
        buffer = buffer.slice(boundary + 2);
        dispatch(block);
        boundary = buffer.indexOf("\n\n");
      }
    }

    // Flush a final event that was not terminated by a blank line.
    buffer += decoder.decode();
    buffer = buffer.replace(/\r\n?/g, "\n");
    if (buffer.trim()) {
      dispatch(buffer);
    }
  } finally {
    reader.releaseLock();
  }
}
