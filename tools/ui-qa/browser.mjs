// Shared headless-browser launcher for the UI QA tools.
// Uses playwright-core (devDependency) with the Google Chrome already installed on the machine,
// falling back to a Playwright-cached Chromium. Nothing large gets downloaded.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { chromium } from "playwright-core";

export const BASE = process.env.SX_BASE || "http://localhost:8899";

function cachedChromium() {
  const root = path.join(os.homedir(), "Library/Caches/ms-playwright");
  if (!fs.existsSync(root)) return null;
  for (const dir of fs.readdirSync(root).filter((d) => d.startsWith("chromium")).sort().reverse()) {
    const stack = [path.join(root, dir)];
    while (stack.length) {
      const p = stack.pop();
      for (const e of fs.readdirSync(p, { withFileTypes: true })) {
        const full = path.join(p, e.name);
        if (e.isDirectory()) stack.push(full);
        else if (/^(chrome-headless-shell|Chromium|chrome)$/.test(e.name)) return full;
      }
    }
  }
  return null;
}

export async function launch() {
  try {
    return await chromium.launch({ channel: "chrome" });
  } catch (e) {
    const exe = process.env.CHROME_PATH || cachedChromium();
    if (!exe) throw new Error("No Chrome found: install Google Chrome or set CHROME_PATH.");
    return chromium.launch({ executablePath: exe });
  }
}

export const arg = (name, def) => {
  const i = process.argv.indexOf("--" + name);
  return i > -1 ? process.argv[i + 1] : def;
};
export const flag = (name) => process.argv.includes("--" + name);
export const list = (name) => (arg(name, "") || "").split(",").map((s) => s.trim()).filter(Boolean);

// Tailwind's browser build generates CSS after load (and after DOM changes): give it a moment.
export async function settle(page, ms = 900) {
  await page.waitForLoadState("load").catch(() => {});
  await page.waitForTimeout(ms);
}
