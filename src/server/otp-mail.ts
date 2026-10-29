import "server-only";

export type OtpMailConfig =
  | { mode: "development" }
  | { mode: "resend"; apiKey: string; from: string };

/** Development delivery is never enabled in a production process. */
export function otpMailConfiguration(env: Record<string, string | undefined> = process.env): OtpMailConfig | null {
  if (env.KIRAQUEST_MAIL_MODE === "development" && env.NODE_ENV === "development") return { mode: "development" };
  if (env.KIRAQUEST_MAIL_MODE === "resend" && env.RESEND_API_KEY && env.KIRAQUEST_MAIL_FROM && !/[\r\n]/.test(env.KIRAQUEST_MAIL_FROM)) {
    return { mode: "resend", apiKey: env.RESEND_API_KEY, from: env.KIRAQUEST_MAIL_FROM };
  }
  return null;
}

/** Never return provider error bodies, headers, the API key, or the OTP to clients. */
export async function deliverOtpMail(config: OtpMailConfig, email: string, otp: string, send: typeof fetch = fetch, purpose: "sign-in" | "email-verification" | "forget-password" | "change-email" = "sign-in"): Promise<void> {
  if (!/^\d{6}$/.test(otp) || email.length > 254 || /[\r\n]/.test(email)) throw new Error("Invalid message");
  if (config.mode === "development") {
    if (process.env.NODE_ENV !== "development") throw new Error("Development mail is unavailable");
    console.info(`[KiraQuest development only] One-time code for ${email}: ${otp}`);
    return;
  }
  const action = purpose === "forget-password" ? "восстановления пароля" : purpose === "email-verification" ? "подтверждения почты" : "входа";
  const response = await send("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${config.apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: config.from, to: [email], subject: `Код ${action} в KiraQuest`, text: `Твой код ${action}: ${otp}\n\nЕсли ты не запрашивал код, просто проигнорируй это письмо.` }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error("Email delivery failed");
}
