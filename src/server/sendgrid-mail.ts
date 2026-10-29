import "server-only";

export type SendGridMailConfig = { mode: "sendgrid"; apiKey: string; from: string };

/** Only a plain, verified sender address is accepted; display names are not parsed. */
export function sendGridMailConfiguration(env: Record<string, string | undefined>): SendGridMailConfig | null {
  const from = env.KIRAQUEST_MAIL_FROM?.trim() ?? "";
  if (env.KIRAQUEST_MAIL_MODE !== "sendgrid" || !env.SENDGRID_API_KEY || !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(from) || from.length > 254) return null;
  return { mode: "sendgrid", apiKey: env.SENDGRID_API_KEY, from };
}

/** Never return the provider response body, which may contain sensitive data. */
export async function deliverSendGridMail(config: SendGridMailConfig, email: string, subject: string, text: string, send: typeof fetch = fetch): Promise<void> {
  if (email.length > 254 || !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email)) throw new Error("Invalid message");
  const response = await send("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: { Authorization: `Bearer ${config.apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      personalizations: [{ to: [{ email }] }],
      from: { email: config.from }, subject,
      content: [{ type: "text/plain", value: text }],
      // Password reset links must never be rewritten by provider tracking.
      tracking_settings: { click_tracking: { enable: false, enable_text: false }, open_tracking: { enable: false } },
    }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error("Email delivery failed");
}
