import { getAuth } from "@/src/server/auth";
import { withOwner } from "@/src/server/owner";
import { ApiError, apiError, assertSameOrigin, PRIVATE_HEADERS, readJson } from "@/src/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    return await withOwner(request, async () => {
      const input = await readJson(request, 4096);
      if (typeof input.currentPassword !== "string" || input.currentPassword.length > 128 || typeof input.newPassword !== "string" || input.newPassword.length < 12 || input.newPassword.length > 128) throw new ApiError(400, "invalid_password", "Проверьте текущий пароль и новый пароль длиной от 12 символов.");
      const headers = new Headers(request.headers); headers.delete("content-length"); headers.set("content-type", "application/json");
      const url = new URL(request.url); url.pathname = "/api/auth/change-password";
      // Keep the current session while the PIN-protected transaction holds its
      // device lock. Session revocation here could contend with its foreign keys.
      const response = await getAuth().handler(new Request(url, { method: "POST", headers, body: JSON.stringify({ currentPassword: input.currentPassword, newPassword: input.newPassword, revokeOtherSessions: false }) }));
      if (!response.ok) throw new ApiError(response.status === 429 ? 429 : 400, "password_change_failed", "Не удалось сменить пароль. Проверьте текущий пароль и повторите попытку.");
      const outputHeaders = new Headers(response.headers);
      for (const [key,value] of Object.entries(PRIVATE_HEADERS)) outputHeaders.set(key,value);
      outputHeaders.set("content-type", "application/json"); outputHeaders.delete("content-length");
      return new Response(JSON.stringify({ ok: true }), { status: 200, headers: outputHeaders });
    });
  } catch (error) { return apiError(error); }
}
