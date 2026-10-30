import assert from "node:assert/strict";
import { chromium } from "@playwright/test";

// Start the application first. This is browser emulation, not a physical device.
const base = process.env.REVIEW_APP_URL || "http://localhost:3189";
const browser = await chromium.launch({ headless: true, executablePath: process.env.REVIEW_BROWSER || "C:/Program Files/Google/Chrome/Application/chrome.exe" });
const routes = ["/", "/map", "/lessons", "/lessons?lesson=hello-1", "/profile", "/studio", "/sign-in", "/register", "/reset-password", "/reviews", "/rankings", "/admin"];
try {
  for (const width of [360, 390, 430, 1440]) {
    for (const settings of [{theme:"lavender",themeMode:"light",visualStyle:"calm"}, {theme:"ocean",themeMode:"dark",visualStyle:"pixel-art",largeText:true}]) {
      const page = await browser.newPage({ viewport: { width, height: 800 } });
      const errors = [];
      page.on("pageerror", error => errors.push(error.message));
      await page.goto(base);
      await page.evaluate(value => localStorage.setItem("kiraquest.customization.v1", JSON.stringify({ version: 7, ...value })), settings);
      for (const route of routes) {
        await page.goto(base + route);
        await page.locator("main").waitFor();
        await page.waitForTimeout(200);
        const measurements = await page.evaluate(() => {
          const controls = [...document.querySelectorAll("main button, main a, .side-nav a")].filter(el => {
            const rect = el.getBoundingClientRect(), style = getComputedStyle(el);
            return rect.width > 0 && rect.height > 0 && style.visibility !== "hidden" && !el.closest("[hidden]") && (rect.width < 44 || rect.height < 44);
          }).map(el => ({ label: (el.textContent || el.getAttribute("aria-label") || "").trim().slice(0, 40), width: el.getBoundingClientRect().width, height: el.getBoundingClientRect().height }));
          return { viewport: innerWidth, document: document.documentElement.scrollWidth, controls };
        });
        assert.ok(measurements.document <= measurements.viewport + 1, `Переполнение ${width}px ${route}: ${JSON.stringify(measurements)}`);
        assert.deepEqual(measurements.controls, [], `Маленькие элементы ${width}px ${route}: ${JSON.stringify(measurements.controls)}`);
      }
      assert.deepEqual(errors, [], `Ошибки страницы ${width}px: ${errors.join(", ")}`);
      await page.close();
      console.log(`PASS ${width}px ${settings.themeMode} ${settings.visualStyle}`);
    }
  }
} finally { await browser.close(); }
