import { requireSession } from "@/src/server/auth";
import { withUnlocked } from "@/src/server/pin";
import { MAX_WALLPAPER_BYTES, readAccountWallpaper, saveAccountWallpaper, wallpaperMime } from "@/src/server/account-data";
import { ApiError, apiError, PRIVATE_HEADERS } from "@/src/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const identity = await requireSession(request);
    const wallpaper = await withUnlocked(request, identity, (client) => readAccountWallpaper(identity.user.id, client));
    if (!wallpaper) throw new ApiError(404, "wallpaper_not_found", "У аккаунта ещё нет сохранённого изображения.");
    return new Response(new Uint8Array(wallpaper.image_bytes), {
      headers: { ...PRIVATE_HEADERS, "Content-Type": wallpaper.mime_type, "X-Content-Type-Options": "nosniff", "Content-Security-Policy": "default-src 'none'; sandbox" },
    });
  } catch (error) { return apiError(error); }
}

export async function PUT(request: Request) {
  try {
    // This endpoint accepts bytes, not JSON. Use the same strict origin policy.
    const origin = request.headers.get("origin");
    const expected = process.env.BETTER_AUTH_URL;
    if (!expected || origin !== new URL(expected).origin || request.headers.get("sec-fetch-site") === "cross-site") {
      throw new ApiError(403, "invalid_origin", "Запрос должен быть отправлен из KiraQuest.");
    }
    const identity = await requireSession(request);
    const length = request.headers.get("content-length");
    if (length && (!/^\d+$/.test(length) || Number(length) > MAX_WALLPAPER_BYTES)) throw new ApiError(413, "image_too_large", "Выбери изображение до 2 МБ.");
    if (!request.body) throw new ApiError(400, "invalid_image", "Выбери изображение PNG, JPEG или WebP.");
    const reader = request.body.getReader();
    const chunks: Uint8Array[] = [];
    let total = 0;
    try {
      for (;;) {
        const part = await reader.read();
        if (part.done) break;
        total += part.value.byteLength;
        if (total > MAX_WALLPAPER_BYTES) {
          await reader.cancel();
          throw new ApiError(413, "image_too_large", "Выбери изображение до 2 МБ.");
        }
        chunks.push(part.value);
      }
    } finally { reader.releaseLock(); }
    const bytes = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    const mime = wallpaperMime(bytes);
    if (!mime) throw new ApiError(400, "invalid_image", "Поддерживаются изображения PNG, JPEG и WebP до 2 МБ. SVG не поддерживается.");
    await withUnlocked(request, identity, (client) => saveAccountWallpaper(identity.user.id, bytes, mime, client));
    return Response.json({ ok: true }, { headers: PRIVATE_HEADERS });
  } catch (error) { return apiError(error); }
}
