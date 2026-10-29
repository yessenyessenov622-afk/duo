import assert from "node:assert/strict";
import { chromium } from "@playwright/test";

// Run against a local server: node scripts/check-guest-flow.mjs
const base = process.env.REVIEW_APP_URL || "http://localhost:3189";
const browser = await chromium.launch({ headless: true, executablePath: process.env.REVIEW_BROWSER || "C:/Program Files/Google/Chrome/Application/chrome.exe" });
const themes = ["light", "dark", "lavender", "amber", "mint", "sakura", "ocean", "forest", "mono", "dark-knight", "cyberpunk", "sunset", "royal-purple"];
try {
  for (const width of [390, 1440]) {
    const context = await browser.newContext({ viewport: { width, height: 900 } });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.goto(`${base}/sign-in`);
    await page.locator(".hardio-auth-title").waitFor();
    for (const theme of themes) {
      await page.evaluate((theme) => {
        localStorage.setItem("kiraquest.customization.v1", JSON.stringify({version:1,theme,themeMode: theme === "dark" ? "dark" : "light", visualStyle:"calm"}));
      }, theme);
      for (const route of ["/sign-in", "/register"]) {
        await page.goto(base + route);
        await page.locator(".hardio-auth-title").waitFor();
        await page.getByText("Гостевое обучение доступно.", { exact: false }).waitFor();
        assert.equal(await page.locator('input[type="password"]').count(), 0, `password field on HTTP ${theme}`);
        assert.equal(await page.locator("body").innerText().then(text => /hardio/i.test(text)), false);
        assert.ok(await page.locator('.hardio-switch-auth a[href="/"]').isVisible());
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `horizontal overflow ${theme} ${route} ${width}`);
        const colors = await page.locator(".hardio-auth-title").evaluate(el => {
          const lum = c => { const rgb = c.match(/\d+/g).slice(0,3).map(Number).map(x => x / 255).map(x => x <= .04045 ? x / 12.92 : ((x + .055) / 1.055) ** 2.4); return .2126*rgb[0]+.7152*rgb[1]+.0722*rgb[2]; };
          const fg = lum(getComputedStyle(el).color), bg = lum(getComputedStyle(el.closest('.hardio-auth-card')).backgroundColor);
          return (Math.max(fg,bg)+.05)/(Math.min(fg,bg)+.05);
        });
        assert.ok(colors >= 4.5, `title contrast ${colors} ${theme} ${route} ${width}`);
      }
    }
    await page.goto(`${base}/lessons?lesson=hello-1`);
    await page.locator(".lesson-answer-option").first().click();
    await page.locator(".lesson-question-footer button.button-dark").click();
    assert.equal(await page.locator(".explanation-retry").count(), 1);
    await page.locator(".lesson-answer-option").nth(1).click();
    await page.locator(".lesson-question-footer button.button-dark").click();
    assert.equal(await page.locator(".explanation-correct").count(), 1);
    await page.locator(".lesson-question-footer button.button-dark").click();
    await page.locator(".lesson-answer-option").first().click();
    await page.locator(".lesson-question-footer button.button-dark").click();
    await page.locator(".explanation-correct").waitFor();
    await page.locator(".lesson-question-footer button.button-dark").click();
    await page.locator(".expanded-answer input").fill("name");
    await page.locator(".lesson-question-footer button.button-dark").click();
    await page.locator(".explanation-correct").waitFor();
    await page.locator(".lesson-question-footer button.button-dark").click();
    await page.getByRole("button", {name:"Поднять выше: My"}).click();
    await page.getByRole("button", {name:"Поднять выше: My"}).click();
    await page.getByRole("button", {name:"Поднять выше: name"}).click();
    await page.getByRole("button", {name:"Поднять выше: name"}).click();
    await page.getByRole("button", {name:"Поднять выше: is"}).click();
    await page.locator(".lesson-question-footer button.button-dark").click();
    await page.locator(".explanation-correct").waitFor();
    await page.locator(".lesson-question-footer button.button-dark").click();
    await page.locator(".lesson-answer-option").first().click();
    await page.locator(".lesson-question-footer button.button-dark").click();
    await page.locator(".explanation-correct").waitFor();
    await page.locator(".lesson-question-footer button.button-dark").click();
    await page.locator(".expanded-answer input").fill("hi");
    await page.locator(".lesson-question-footer button.button-dark").click();
    await page.locator(".explanation-correct").waitFor();
    await page.locator(".lesson-question-footer button.button-dark").click();
    await page.locator(".lesson-result-card").waitFor();
    const progress = await page.evaluate(() => JSON.parse(localStorage.getItem("kiraquest.progress.v1")));
    assert.ok(progress.completedLessons.includes("hello-1"));
    assert.ok(progress.xp > 0);
    await page.goto(`${base}/profile`);
    await page.locator(".profile-stat-grid").waitFor();
    await page.reload();
    assert.ok((await page.evaluate(() => JSON.parse(localStorage.getItem("kiraquest.progress.v1")))).completedLessons.includes("hello-1"));
    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Скачать гостевой прогресс" }).click();
    const download = await downloadPromise;
    const restoredContext = await browser.newContext({ viewport: { width, height: 900 } });
    const restoredPage = await restoredContext.newPage();
    await restoredPage.goto(`${base}/profile`);
    await restoredPage.locator('input[type="file"]').setInputFiles(await download.path());
    await restoredPage.getByRole("button", { name: "Объединить прогресс" }).click();
    await restoredPage.getByText("Прогресс объединён. Исходные данные не удалены.").waitFor();
    await restoredPage.reload();
    assert.ok((await restoredPage.evaluate(() => JSON.parse(localStorage.getItem("kiraquest.progress.v1")))).completedLessons.includes("hello-1"));
    await restoredContext.close();
    await page.goto(`${base}/map`);
    await page.locator(".journey-node").first().waitFor();
    assert.ok((await page.evaluate(() => JSON.parse(localStorage.getItem("kiraquest.progress.v1")))).completedLessons.includes("hello-1"));
    assert.deepEqual(errors, []);
    console.log(`PASS: ${width}px, 13 themes, guest auth screens, lesson and persisted progress`);
    await context.close();
  }
} finally { await browser.close(); }
