// Test only the isolated local HTTPS site and synthetic local database account.
import assert from "node:assert/strict";
import { chromium } from "@playwright/test";
import pg from "pg";
const browser = await chromium.launch({ headless: true, executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe" });
const pool = new pg.Pool({ connectionString: "postgresql://kq_test@127.0.0.1:55439/postgres" });
const base = "https://localhost:3190";
async function login(page) {
  await page.goto(base + "/sign-in");
  await page.locator("#hardio-email").fill("student@example.test");
  await page.locator("#hardio-password").fill("test-owner-password-123");
  await page.getByRole("button", { name: "Войти в аккаунт" }).click();
  await page.waitForURL("**/profile", { timeout: 30000 });
  await page.getByText("ЛИЧНЫЙ ПРОФИЛЬ").waitFor();
}
try {
  const first = await browser.newContext({ ignoreHTTPSErrors: true, viewport: { width: 390, height: 844 } });
  const page = await first.newPage();
  await login(page);
  await page.goto(base + "/lessons?lesson=math-1");
  await page.getByRole("button", { name: /12/ }).click();
  await page.getByRole("button", { name: /Проверить ответ/ }).click();
  await page.getByRole("button", { name: /Завершить урок/ }).click();
  await page.getByText("Повтор завершён", { exact: false }).waitFor({ timeout: 30000 });
  const event = await pool.query("SELECT COUNT(*) AS count FROM kq_verified_lessons WHERE user_id = 'test-student' AND lesson_id = 'math-1'");
  assert.equal(Number(event.rows[0].count), 1);
  await page.goto(base + "/profile");
  await page.getByRole("button", { name: "Выйти из аккаунта" }).click();
  await page.waitForURL("**/sign-in?logged_out=1", { timeout: 30000 });
  const second = await browser.newContext({ ignoreHTTPSErrors: true, viewport: { width: 1440, height: 900 } });
  const page2 = await second.newPage();
  await login(page2);
  await page2.getByText("Складываем вместе").waitFor();
  await page2.goto(base + "/rankings");
  await page2.getByText("Твоё место:").waitFor();
  await second.close(); await first.close();
  console.log("PASS local HTTPS browser: sign-in, lesson, verified event, sign-out and restored progress in another browser context");
} finally { await browser.close(); await pool.end(); }
