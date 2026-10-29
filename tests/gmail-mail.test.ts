import test from "node:test";
import assert from "node:assert/strict";
import { deliverGmailMail, gmailMailConfiguration } from "../src/server/gmail-mail";
import { authConfiguration } from "../src/server/auth";

test("Gmail requires a personal address and app password before password auth can be enabled", () => {
  const env = { NODE_ENV: "production", KIRAQUEST_MAIL_MODE: "gmail", DATABASE_URL: "postgres://test", BETTER_AUTH_URL: "https://example.org", BETTER_AUTH_SECRET: "x".repeat(40), KIRAQUEST_PASSWORD_AUTH: "enabled" };
  assert.equal(gmailMailConfiguration(env), null);
  assert.equal(authConfiguration(env), null);
  assert.equal(gmailMailConfiguration({ ...env, KIRAQUEST_GMAIL_ADDRESS: "person@example.org", KIRAQUEST_GMAIL_APP_PASSWORD: "abcdefghijklmnop" }), null);
  const ready = { ...env, KIRAQUEST_GMAIL_ADDRESS: "student@gmail.com", KIRAQUEST_GMAIL_APP_PASSWORD: "abcd efgh ijkl mnop" };
  assert.equal(authConfiguration(ready)?.passwordEnabled, true);
  assert.equal(gmailMailConfiguration(ready)?.appPassword, "abcdefghijklmnop");
});

test("Gmail delivery uses the authenticated sender and hides transport errors", async () => {
  const config = { mode: "gmail", address: "student@gmail.com", appPassword: "abcdefghijklmnop" } as const;
  let recipient = "";
  await deliverGmailMail(config, "other@example.org", "Тест", "Сообщение", async (receivedConfig, message) => {
    assert.equal(receivedConfig, config);
    assert.equal(message.from, config.address);
    recipient = message.to;
  });
  assert.equal(recipient, "other@example.org");
  await assert.rejects(deliverGmailMail(config, "other@example.org", "Тест", "Сообщение", async () => { throw new Error("sensitive provider details"); }), { message: "Email delivery failed" });
  await assert.rejects(deliverGmailMail(config, "bad\r\n@example.org", "Тест", "Сообщение"), { message: "Invalid message" });
});
