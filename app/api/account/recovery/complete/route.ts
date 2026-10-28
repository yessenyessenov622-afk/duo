import { authConfiguration, requireSession } from "@/src/server/auth";
import { finishPinRecovery, getRecoveryCookie } from "@/src/server/pin";
import { PRIVATE_HEADERS } from "@/src/server/http";
import { recoveryCompletionResponse } from "@/src/server/pin-recovery-response";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const config = authConfiguration();
  if (!config) return Response.json({ error: "auth_not_configured", message: "Вход ещё не настроен." }, { status: 503, headers: PRIVATE_HEADERS });
  let succeeded = false;
  try {
    const identity = await requireSession(request);
    const token = getRecoveryCookie(request);
    if (!token) throw new Error("recovery_missing");
    await finishPinRecovery(identity, token);
    succeeded = true;
  } catch { /* Only a generic recovery error reaches the browser. */ }
  return recoveryCompletionResponse(config.baseURL, succeeded);
}
