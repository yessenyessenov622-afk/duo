import test from "node:test";
import assert from "node:assert/strict";
import { deliverOtpMail, otpMailConfiguration } from "../src/server/otp-mail";

test("development mail cannot be enabled in production", () => {
  assert.equal(otpMailConfiguration({ NODE_ENV: "production", KIRAQUEST_MAIL_MODE: "development" }), null);
  assert.deepEqual(otpMailConfiguration({ NODE_ENV: "development", KIRAQUEST_MAIL_MODE: "development" }), { mode: "development" });
  assert.equal(otpMailConfiguration({ NODE_ENV: "production", KIRAQUEST_MAIL_MODE: "resend", RESEND_API_KEY: "key" }), null);
});

test("mail transport sends only to the configured recipient and hides provider failures", async () => {
  const config = { mode: "resend", apiKey: "test-key", from: "KiraQuest <auth@example.org>" } as const;
  let captured: RequestInit | undefined;
  const send = async (_url: string | URL | Request, init?: RequestInit) => { captured = init; return new Response("provider secret", { status: 403 }); };
  await assert.rejects(deliverOtpMail(config, "user@example.org", "123456", send as typeof fetch), { message: "Email delivery failed" });
  assert.deepEqual(JSON.parse(String(captured?.body)).to, ["user@example.org"]);
  await assert.rejects(deliverOtpMail(config, "user@example.org", "not-a-code", send as typeof fetch));
});
