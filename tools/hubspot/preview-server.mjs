#!/usr/bin/env node
/**
 * tools/hubspot/preview-server.mjs — local emulation of how HubSpot will serve hubspot-dist/:
 *   /<slug>                → page template (HubL includes stripped)
 *   /hubfs/<folder>/<path> → File Manager files
 *   /src/*, /wiki/*, /assets/* with no page → 302 to /hubfs/<folder>/… (same as the HubSpot redirects)
 * Usage: npm run hubspot:build && npm run hubspot:preview  → http://localhost:8090/
 */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const DIST = path.join(ROOT, "hubspot-dist");
const { config, pages } = JSON.parse(fs.readFileSync(path.join(DIST, "pages.json"), "utf8"));
const PORT = Number(process.env.PORT || 8090);
const HUBFS = `/hubfs/${config.fileManagerFolder}/`;
const bySlug = new Map(pages.map((p) => [p.slug, p]));

const TYPES = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".mjs": "text/javascript",
  ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png",
  ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".pdf": "application/pdf", ".md": "text/markdown; charset=utf-8",
  ".woff2": "font/woff2", ".ico": "image/x-icon", ".webp": "image/webp",
};

function renderTemplate(page) {
  const file = path.join(DIST, "design", page.templatePath.slice(config.designManagerFolder.length + 1));
  return fs
    .readFileSync(file, "utf8")
    .replace(/^<!--[\s\S]*?-->\n/, "")
    .replace(/\{%\s*(end)?raw\s*%\}/g, "")
    .replace(/\{\{\s*standard_(header|footer)_includes\s*\}\}/g, "");
}

http
  .createServer((req, res) => {
    const url = new URL(req.url, "http://localhost");
    let p;
    try { p = decodeURIComponent(url.pathname); } catch (_) { p = url.pathname; }
    const slug = p.replace(/^\/+/, "");

    const page = bySlug.get(slug) || (slug.endsWith("/") ? null : bySlug.get(slug.replace(/\/$/, "")));
    if (page) {
      res.writeHead(200, { "Content-Type": TYPES[".html"], "Cache-Control": "no-store" });
      return res.end(renderTemplate(page));
    }
    if (p.startsWith(HUBFS)) {
      const file = path.join(DIST, "files", p.slice(HUBFS.length));
      if (file.startsWith(path.join(DIST, "files")) && fs.existsSync(file) && fs.statSync(file).isFile()) {
        res.writeHead(200, {
          "Content-Type": TYPES[path.extname(file).toLowerCase()] || "application/octet-stream",
          "Cache-Control": "no-store",
        });
        return fs.createReadStream(file).pipe(res);
      }
    } else {
      const root = slug.split("/")[0];
      if (config.staticRoots.includes(root) && slug.includes("/")) {
        res.writeHead(302, { Location: HUBFS.slice(0, -1) + url.pathname + url.search });
        return res.end();
      }
    }
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("404 " + p);
  })
  .listen(PORT, () => console.log(`HubSpot preview → http://localhost:${PORT}/`));
