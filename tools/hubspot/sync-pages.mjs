#!/usr/bin/env node
/**
 * tools/hubspot/sync-pages.mjs
 * Makes HubSpot match hubspot-dist/pages.json (run build.mjs first):
 *   - creates a website page for every template that has no page yet, on config.domain,
 *     with the same path as in the repo, and publishes it;
 *   - fixes title / template of existing pages if they drifted;
 *   - creates the redirects that send runtime paths (/src/*, /wiki/*, /assets/*) to /hubfs/.
 * Pages are never deleted: removing one is a manual decision in HubSpot.
 *
 * Auth (env): HUBSPOT_TOKEN (private app token, scope "content")
 *          or HUBSPOT_PERSONAL_ACCESS_KEY (the same key the hs CLI uses).
 * Flags: --dry-run (print what would change), --pages-only, --redirects-only
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const MANIFEST = path.join(ROOT, "hubspot-dist/pages.json");
const API = "https://api.hubapi.com";
const args = new Set(process.argv.slice(2));
const DRY = args.has("--dry-run");

if (!fs.existsSync(MANIFEST)) {
  console.error("hubspot-dist/pages.json not found — run: npm run hubspot:build");
  process.exit(1);
}
const { config, pages } = JSON.parse(fs.readFileSync(MANIFEST, "utf8"));
const DOMAIN = process.env.HUBSPOT_DOMAIN || config.domain;

async function getToken() {
  if (process.env.HUBSPOT_TOKEN) return process.env.HUBSPOT_TOKEN;
  const key = process.env.HUBSPOT_PERSONAL_ACCESS_KEY;
  if (!key) throw new Error("Set HUBSPOT_TOKEN or HUBSPOT_PERSONAL_ACCESS_KEY");
  const res = await fetch(`${API}/localdevauth/v1/auth/refresh?portalId=${config.portalId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ encodedOAuthRefreshToken: key }),
  });
  if (!res.ok) throw new Error(`Personal access key exchange failed: HTTP ${res.status} ${await res.text()}`);
  return (await res.json()).oauthAccessToken;
}

let TOKEN;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function api(method, url, body) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const res = await fetch(API + url, {
      method,
      headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (res.status === 429) { await sleep(1500 * (attempt + 1)); continue; }
    const text = await res.text();
    if (!res.ok) throw new Error(`${method} ${url} → HTTP ${res.status}: ${text}`);
    return text ? JSON.parse(text) : null;
  }
  throw new Error(`${method} ${url} → rate limited`);
}

async function listAll(url) {
  const out = [];
  let after = "";
  do {
    const sep = url.includes("?") ? "&" : "?";
    const data = await api("GET", `${url}${sep}limit=100${after ? `&after=${after}` : ""}`);
    out.push(...(data.results || []));
    after = data.paging?.next?.after || "";
  } while (after);
  return out;
}

const act = async (label, fn) => {
  console.log((DRY ? "[dry-run] " : "") + label);
  if (!DRY) { await fn(); await sleep(150); }
};

async function syncPages() {
  const existing = (await listAll("/cms/v3/pages/site-pages?archived=false")).filter(
    (p) => (p.domain || "").toLowerCase() === DOMAIN.toLowerCase()
  );
  const bySlug = new Map(existing.map((p) => [p.slug || "", p]));
  let created = 0, updated = 0, published = 0;

  for (const page of pages) {
    const current = bySlug.get(page.slug);
    const url = `https://${DOMAIN}/${page.slug}`;
    if (!current) {
      await act(`create + publish ${url}`, async () => {
        const made = await api("POST", "/cms/v3/pages/site-pages", {
          name: page.name,
          htmlTitle: page.htmlTitle,
          slug: page.slug,
          domain: DOMAIN,
          templatePath: page.templatePath,
        });
        await publish(made.id);
      });
      created++;
      continue;
    }
    if (current.templatePath !== page.templatePath || current.htmlTitle !== page.htmlTitle) {
      await act(`update ${url}`, async () => {
        await api("PATCH", `/cms/v3/pages/site-pages/${current.id}/draft`, {
          templatePath: page.templatePath,
          htmlTitle: page.htmlTitle,
        });
        if (current.currentState === "PUBLISHED") {
          await api("POST", `/cms/v3/pages/site-pages/${current.id}/draft/push-live`);
        }
      });
      updated++;
    }
    if (current.currentState !== "PUBLISHED") {
      await act(`publish ${url}`, () => publish(current.id));
      published++;
    }
  }
  console.log(`Pages: ${created} created, ${updated} updated, ${published} published, ${pages.length} total.`);
}

async function publish(id) {
  // The API publishes through a schedule; a date a few seconds ahead means "now".
  await api("POST", "/cms/v3/pages/site-pages/schedule", {
    id: String(id),
    publishDate: new Date(Date.now() + 15000).toISOString(),
  });
}

async function syncRedirects() {
  const existing = await listAll("/cms/v3/url-redirects");
  const hubfs = `/hubfs/${config.fileManagerFolder}`;
  for (const root of config.staticRoots) {
    const routePrefix = `${DOMAIN}/${root}/*rest`;
    const wanted = {
      routePrefix,
      destination: `https://${DOMAIN}${hubfs}/${root}/{rest}`,
      redirectStyle: config.redirectStyle || 302,
      isPattern: true,
      isMatchFullUrl: true,
      isProtocolAgnostic: true,
      isOnlyAfterNotFound: true, // real pages under /src/pages/ always win
      isMatchQueryString: false,
      isTrailingSlashOptional: true,
    };
    const found = existing.find((r) => r.routePrefix === routePrefix);
    if (!found) {
      await act(`redirect ${routePrefix} → ${wanted.destination}`, () =>
        api("POST", "/cms/v3/url-redirects", wanted)
      );
    } else if (found.destination !== wanted.destination || found.redirectStyle !== wanted.redirectStyle) {
      await act(`update redirect ${routePrefix}`, () =>
        api("PATCH", `/cms/v3/url-redirects/${found.id}`, wanted)
      );
    }
  }
  console.log("Redirects: ok.");
}

try {
  TOKEN = DRY && !process.env.HUBSPOT_TOKEN && !process.env.HUBSPOT_PERSONAL_ACCESS_KEY ? null : await getToken();
  if (!TOKEN) {
    console.log(`[dry-run without token] ${pages.length} pages would be ensured on https://${DOMAIN}/`);
    for (const p of pages.slice(0, 5)) console.log(`  https://${DOMAIN}/${p.slug}  ←  ${p.templatePath}`);
    console.log("  …");
    process.exit(0);
  }
  if (!args.has("--redirects-only")) await syncPages();
  if (!args.has("--pages-only")) await syncRedirects();
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
