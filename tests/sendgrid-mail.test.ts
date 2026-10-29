import test from "node:test";
import assert from "node:assert/strict";
import { deliverSendGridMail, sendGridMailConfiguration } from "../src/server/sendgrid-mail";
import { deliverOtpMail, deliverPasswordResetLink, otpMailConfiguration } from "../src/server/otp-mail";

test("SendGrid requires a key and a plain verified sender address", () => {
  assert.equal(sendGridMailConfiguration({ KIRAQUEST_MAIL_MODE: "sendgrid", KIRAQUEST_MAIL_FROM: "mail@example.org" }), null);
  assert.equal(sendGridMailConfiguration({ KIRAQUEST_MAIL_MODE: "sendgrid", SENDGRID_API_KEY: "key", KIRAQUEST_MAIL_FROM: "Name <mail@example.org>" }), null);
  assert.equal(sendGridMailConfiguration({ KIRAQUEST_MAIL_MODE: "sendgrid", SENDGRID_API_KEY: "key", KIRAQUEST_MAIL_FROM: "a@example.org\nb@example.org" }), null);
  assert.deepEqual(sendGridMailConfiguration({ KIRAQUEST_MAIL_MODE: "sendgrid", SENDGRID_API_KEY: "key", KIRAQUEST_MAIL_FROM: "mail@example.org" }), { mode: "sendgrid", apiKey: "key", from: "mail@example.org" });
});

test("both verification and reset messages use the SendGrid transport", async () => {
  const config = otpMailConfiguration({ KIRAQUEST_MAIL_MODE: "sendgrid", SENDGRID_API_KEY: "key", KIRAQUEST_MAIL_FROM: "sender@example.org" });
  assert.ok(config);
  const bodies: Array<Record<string, any>> = [];
  const send = async (_target: string | URL | Request, init?: RequestInit) => { bodies.push(JSON.parse(String(init?.body))); return new Response(null, { status: 202 }); };
  await deliverOtpMail(config, "student@example.org", "123456", send as typeof fetch, "email-verification");
  await deliverPasswordResetLink(config, "student@example.org", "https://example.org/reset-password#token=abcdefghijklmnopqrstuvwx", send as typeof fetch);
  assert.equal(bodies.length, 2);
  assert.match(bodies[0].content[0].value, /123456/);
  assert.match(bodies[1].content[0].value, /https:\/\/example\.org\/reset-password#token=abcdefghijklmnopqrstuvwx/);
  assert.equal(bodies[0].tracking_settings.click_tracking.enable, false);
  assert.equal(bodies[1].tracking_settings.click_tracking.enable, false);
});

test("SendGrid delivers only to the given recipient, disables tracking, and hides provider errors", async () => {
  const config = { mode: "sendgrid", apiKey: "test-key", from: "sender@example.org" } as const;
  let url: string | URL | Request | undefined;
  let captured: RequestInit | undefined;
  const send = async (target: string | URL | Request, init?: RequestInit) => { url = target; captured = init; return new Response("private provider response", { status: 403 }); };
  await assert.rejects(deliverSendGridMail(config, "student@example.org", "subject", "text", send as typeof fetch), { message: "Email delivery failed" });
  assert.equal(url, "https://api.sendgrid.com/v3/mail/send");
  const body = JSON.parse(String(captured?.body));
  assert.deepEqual(body.personalizations, [{ to: [{ email: "student@example.org" }] }]);
  assert.deepEqual(body.from, { email: "sender@example.org" });
  assert.deepEqual(body.tracking_settings, { click_tracking: { enable: false, enable_text: false }, open_tracking: { enable: false } });
  await assert.rejects(deliverSendGridMail(config, "student@example.org\nother@example.org", "subject", "text", send as typeof fetch), { message: "Invalid message" });
});
