import "server-only";
import nodemailer from "nodemailer";

export type GmailMailConfig = { mode: "gmail"; address: string; appPassword: string };

export function gmailMailConfiguration(env: Record<string, string | undefined>): GmailMailConfig | null {
  const address = (env.KIRAQUEST_GMAIL_ADDRESS ?? "").trim().toLowerCase();
  const appPassword = (env.KIRAQUEST_GMAIL_APP_PASSWORD ?? "").replace(/ /g, "");
  if (env.KIRAQUEST_MAIL_MODE !== "gmail" || !/^[a-z0-9][a-z0-9.]{4,29}@(gmail\.com|googlemail\.com)$/.test(address) || !/^[a-z]{16}$/.test(appPassword)) return null;
  return { mode: "gmail", address, appPassword };
}

type Mail = { from: string; to: string; subject: string; text: string };
type Send = (config: GmailMailConfig, message: Mail) => Promise<void>;

const smtpSend: Send = async (config, message) => {
  const transport = nodemailer.createTransport({
    host: "smtp.gmail.com", port: 465, secure: true,
    auth: { user: config.address, pass: config.appPassword },
    connectionTimeout: 10_000, greetingTimeout: 10_000, socketTimeout: 20_000,
  });
  try { await transport.sendMail(message); } finally { transport.close(); }
};

export async function deliverGmailMail(config: GmailMailConfig, email: string, subject: string, text: string, send: Send = smtpSend): Promise<void> {
  if (email.length > 254 || !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email)) throw new Error("Invalid message");
  try { await send(config, { from: config.address, to: email, subject, text }); }
  catch { throw new Error("Email delivery failed"); }
}
