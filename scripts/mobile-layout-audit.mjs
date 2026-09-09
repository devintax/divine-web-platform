import { createHmac, randomBytes } from "node:crypto";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import nextEnv from "@next/env";
import { chromium } from "playwright-core";

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

const baseURL = process.env.MOBILE_AUDIT_BASE_URL || "http://localhost:3000";
const authUserId = process.env.MOBILE_AUDIT_AUTH_USER_ID;
const sessionSecret = process.env.SESSION_SECRET || process.env.AUTH_SECRET;
const executablePath = process.env.PLAYWRIGHT_CHROME_PATH
  || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

if (!authUserId || !sessionSecret) {
  throw new Error("MOBILE_AUDIT_AUTH_USER_ID and SESSION_SECRET are required");
}

const defaultRoutes = [
  "/portal",
  "/portal/intake",
  "/portal/entities",
  "/portal/bookkeeping",
  "/portal/vault",
  "/portal/appointments",
  "/portal/esign",
  "/portal/messages",
  "/portal/profile",
  "/portal/chat",
  "/portal/orders",
  "/portal/registered-agent",
];
const routes = process.env.MOBILE_AUDIT_ROUTES
  ? process.env.MOBILE_AUDIT_ROUTES.split(",").map((route) => route.trim()).filter(Boolean)
  : defaultRoutes;

const defaultViewports = [
  { name: "iphone-se", width: 320, height: 700 },
  { name: "iphone", width: 375, height: 812 },
  { name: "iphone-pro", width: 390, height: 844 },
  { name: "iphone-pro-max", width: 430, height: 932 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "desktop", width: 1280, height: 800 },
];
const viewports = process.env.MOBILE_AUDIT_VIEWPORT
  ? [{
      name: "custom",
      width: Number(process.env.MOBILE_AUDIT_VIEWPORT.split("x")[0]),
      height: Number(process.env.MOBILE_AUDIT_VIEWPORT.split("x")[1]),
    }]
  : defaultViewports;

function createSessionToken() {
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    authId: authUserId,
    iat: now,
    exp: now + 3600,
    nonce: randomBytes(12).toString("base64url"),
  };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = createHmac("sha256", sessionSecret).update(body).digest("base64url");
  return `${body}.${signature}`;
}

const outputDirectory = path.join(process.cwd(), "test-results", "mobile");
await mkdir(outputDirectory, { recursive: true });

const browser = await chromium.launch({ executablePath, headless: true });
const failures = [];

try {
  for (const viewport of viewports) {
    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
      deviceScaleFactor: 1,
      isMobile: viewport.width < 768,
      hasTouch: viewport.width < 768,
    });
    await context.addCookies([{
      name: "d_session",
      value: createSessionToken(),
      url: baseURL,
      httpOnly: true,
      secure: baseURL.startsWith("https://"),
      sameSite: "Lax",
    }]);

    const page = await context.newPage();
    for (const route of routes) {
      const response = await page.goto(`${baseURL}${route}`, { waitUntil: "domcontentloaded", timeout: 30_000 });
      await page.waitForTimeout(350);

      const result = await page.evaluate(() => {
        const viewportWidth = window.innerWidth;
        const hasHorizontalOverflow = Math.max(
          document.documentElement.scrollWidth,
          document.body.scrollWidth,
        ) > viewportWidth + 1;

        const outsideViewport = [...document.querySelectorAll("button, a, input, select, textarea")]
          .map((element) => {
            const rect = element.getBoundingClientRect();
            if (rect.width === 0 || rect.height === 0) return null;
            let parent = element.parentElement;
            while (parent) {
              const style = getComputedStyle(parent);
              if ((style.overflowX === "auto" || style.overflowX === "scroll") && parent.scrollWidth > parent.clientWidth) return null;
              parent = parent.parentElement;
            }
            if (rect.left >= -1 && rect.right <= viewportWidth + 1) return null;
            return {
              label: element.getAttribute("aria-label") || element.textContent?.trim().slice(0, 50) || element.tagName,
              left: Math.round(rect.left),
              right: Math.round(rect.right),
              width: Math.round(rect.width),
            };
          })
          .filter(Boolean)
          .slice(0, 8)

        const shortFormControls = [...document.querySelectorAll("button, input, select, textarea")]
          .filter((element) => {
            const rect = element.getBoundingClientRect();
            return rect.width > 0 && rect.height > 0 && rect.height < 44;
          })
          .slice(0, 8)
          .map((element) => `${element.tagName}:${Math.round(element.getBoundingClientRect().height)}`);

        const mobileNav = document.querySelector('nav[aria-label="Primary"]');
        const textarea = document.querySelector("textarea");
        const debugAncestors = [];
        let ancestor = textarea;
        while (ancestor && debugAncestors.length < 8) {
          const rect = ancestor.getBoundingClientRect();
          const style = getComputedStyle(ancestor);
          debugAncestors.push({
            tag: ancestor.tagName,
            className: String(ancestor.className).slice(0, 100),
            left: Math.round(rect.left),
            right: Math.round(rect.right),
            clientWidth: ancestor.clientWidth,
            scrollWidth: ancestor.scrollWidth,
            minWidth: style.minWidth,
            overflowX: style.overflowX,
          });
          ancestor = ancestor.parentElement;
        }
        return {
          hasHorizontalOverflow,
          documentWidth: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth),
          viewportWidth,
          outsideViewport,
          shortFormControls,
          mobileNavVisible: mobileNav ? getComputedStyle(mobileNav).display !== "none" : false,
          debugAncestors,
        };
      });

      const routeFailures = [];
      if (!response || response.status() >= 400) routeFailures.push(`HTTP ${response?.status() || "none"}`);
      if (page.url().includes("/login")) routeFailures.push("redirected to login");
      if (result.hasHorizontalOverflow) routeFailures.push("document has horizontal overflow");
      if (result.outsideViewport.length) routeFailures.push(`clipped controls: ${result.outsideViewport.map((item) => `${item.label}[${item.left},${item.right}]`).join(", ")}`);
      if (viewport.width < 768 && result.shortFormControls.length) routeFailures.push(`form controls below 44px: ${result.shortFormControls.join(", ")}`);
      if (viewport.width < 768 && !result.mobileNavVisible) routeFailures.push("mobile navigation is missing");

      if (route === "/portal/intake") {
        const serviceButtons = page.locator("[data-service-key]");
        if (await serviceButtons.count() !== 5) routeFailures.push("not all five services are rendered");
        for (const key of ["formation", "tax", "insurance", "notary", "bookkeeping"]) {
          const button = page.locator(`[data-service-key="${key}"]`);
          if (!await button.isVisible()) routeFailures.push(`${key} service is not visible`);
          await button.click();
          try {
            await page.waitForFunction(
              (serviceKey) => document.querySelector(`[data-service-key="${serviceKey}"]`)?.getAttribute("aria-pressed") === "true",
              key,
              { timeout: 1_000 },
            );
          } catch {
            routeFailures.push(`${key} service cannot be selected`);
          }
        }
      }

      if (process.env.MOBILE_AUDIT_CAPTURE === "1") {
        const fileName = `${viewport.name}-${route.replaceAll("/", "-").replace(/^-/, "") || "home"}-capture.png`;
        await page.screenshot({ path: path.join(outputDirectory, fileName), fullPage: true });
      }

      if (routeFailures.length) {
        failures.push({
          viewport: viewport.name,
          route,
          width: `${result.documentWidth}/${result.viewportWidth}`,
          issues: routeFailures,
          debugAncestors: result.hasHorizontalOverflow ? result.debugAncestors : undefined,
        });
        const fileName = `${viewport.name}-${route.replaceAll("/", "-").replace(/^-/, "") || "home"}.png`;
        await page.screenshot({ path: path.join(outputDirectory, fileName), fullPage: true });
      }
    }
    await context.close();
  }
} finally {
  await browser.close();
}

if (failures.length) {
  console.error(JSON.stringify({ status: "failed", failures }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({
  status: "passed",
  routes: routes.length,
  viewports: viewports.length,
  checks: routes.length * viewports.length,
}, null, 2));
