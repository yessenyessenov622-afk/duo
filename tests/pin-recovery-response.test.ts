import assert from "node:assert/strict";
import test from "node:test";
import { recoveryCompletionResponse, recoveryOAuthResponse } from "../src/server/pin-recovery-response";
import { RECOVERY_COOKIE } from "../src/server/pin";

test("recovery response preserves multiple OAuth cookies and adds a protected challenge", async () => {
  const headers = new Headers({ "content-type": "application/json" });
  headers.append("set-cookie", "__Secure-kiraquest.oauth_state=state; Path=/; Secure; HttpOnly; SameSite=Lax");
  headers.append("set-cookie", "__Secure-kiraquest.other=nonce; Path=/; Secure; HttpOnly; SameSite=Lax");
  const token = "t".repeat(43);
  const oauth = new Response(JSON.stringify({ url: "https://accounts.google.com/o/oauth2/v2/auth?state=state", redirect: false }), { status: 200, headers });
  const response = recoveryOAuthResponse(oauth, token);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "private, no-store");
  assert.equal(response.headers.get("vary"), "Cookie");
  const cookies = response.headers.getSetCookie();
  assert.equal(cookies.length, 3);
  assert.ok(cookies.some((value) => value.startsWith("__Secure-kiraquest.oauth_state=state;")));
  assert.ok(cookies.some((value) => value.startsWith("__Secure-kiraquest.other=nonce;")));
  const challenge = cookies.find((value) => value.startsWith(`${RECOVERY_COOKIE}=`))!;
  for (const setting of [/Secure/i, /HttpOnly/i, /SameSite=lax/i, /Path=\//i, /Max-Age=600/i]) assert.match(challenge, setting);
  const body = await response.text();
  assert.equal(body.includes(token), false);
  assert.equal(JSON.parse(body).url.startsWith("https://accounts.google.com/"), true);
});

test("failed OAuth initiation returns a sanitized retryable error without a challenge", async () => {
  const response = recoveryOAuthResponse(new Response("private-provider-error; client-secret; PIN=123456", { status: 400 }), "t".repeat(43));
  assert.equal(response.status, 503);
  assert.equal(response.headers.getSetCookie().length, 0);
  const body = await response.json();
  assert.equal(body.error, "recovery_unavailable");
  for (const detail of ["client-secret", "123456", "private-provider-error"]) assert.equal(JSON.stringify(body).includes(detail), false);
});

test("recovery completion and failure use fixed redirects and expire the challenge", () => {
  for (const success of [true, false]) {
    const response = recoveryCompletionResponse("https://learn.example.test", success);
    assert.equal(response.status, 303);
    assert.equal(response.headers.get("location"), `https://learn.example.test${success ? "/profile?pin=recovered" : "/sign-in?error=recovery_failed"}`);
    assert.equal(response.headers.get("cache-control"), "private, no-store");
    const cookie = response.headers.getSetCookie().find((value) => value.startsWith(`${RECOVERY_COOKIE}=`))!;
    for (const setting of [/Max-Age=0/i, /Secure/i, /HttpOnly/i, /SameSite=lax/i]) assert.match(cookie, setting);
  }
});
