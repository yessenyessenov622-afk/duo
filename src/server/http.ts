import "server-only";

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly retryAfter?: number,
  ) { super(message); }
}

export const PRIVATE_HEADERS = { "Cache-Control": "private, no-store", "Vary": "Cookie" };

/** Never serialize an underlying DB/OAuth exception, credentials, cookies or PINs. */
export function apiError(error: unknown): Response {
  const known = error instanceof ApiError;
  const status = known ? error.status : 503;
  const headers: Record<string, string> = { ...PRIVATE_HEADERS };
  if (known && error.retryAfter !== undefined) headers["Retry-After"] = String(Math.max(1, Math.ceil(error.retryAfter)));
  return Response.json({
    error: known ? error.code : "service_unavailable",
    message: known ? error.message : "Сервис аккаунтов временно недоступен. Попробуй ещё раз немного позже.",
    ...(known && error.retryAfter !== undefined ? { retryAfter: error.retryAfter } : {}),
  }, { status, headers });
}

/** A fixed configured origin is used, never a caller-supplied Host header. */
export function assertSameOrigin(request: Request): void {
  const configured = process.env.BETTER_AUTH_URL;
  let expected: string;
  try { expected = new URL(configured ?? "").origin; }
  catch { throw new ApiError(503, "auth_not_configured", "Вход пока не настроен владельцем KiraQuest."); }
  if (request.headers.get("origin") !== expected || request.headers.get("sec-fetch-site") === "cross-site") {
    throw new ApiError(403, "invalid_origin", "Открой KiraQuest по основному адресу и повтори действие.");
  }
  const type = request.headers.get("content-type")?.split(";", 1)[0].trim().toLowerCase();
  if (type !== "application/json") throw new ApiError(415, "invalid_content_type", "Ожидается запрос JSON.");
}

export async function readJson(request: Request, maxBytes = 65_536): Promise<Record<string, unknown>> {
  const length = request.headers.get("content-length");
  if (length && (!/^\d+$/.test(length) || Number(length) > maxBytes)) {
    throw new ApiError(413, "body_too_large", "Слишком большой запрос.");
  }
  if (!request.body) throw new ApiError(400, "invalid_json", "Запрос пуст.");
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      size += chunk.value.byteLength;
      if (size > maxBytes) {
        await reader.cancel();
        throw new ApiError(413, "body_too_large", "Слишком большой запрос.");
      }
      chunks.push(chunk.value);
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    const parsed: unknown = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("invalid_json");
    return parsed as Record<string, unknown>;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(400, "invalid_json", "Не удалось прочитать запрос JSON.");
  } finally {
    reader.releaseLock();
  }
}
