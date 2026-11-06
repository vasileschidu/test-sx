#!/usr/bin/env node
/**
 * tools/hubspot/deploy.mjs — full deploy: build → File Manager → Design Manager → pages/redirects.
 *
 * Locally:  uses your `hs` account (hubspot.config.yml); pick one with HUBSPOT_ACCOUNT=<name>.
 * CI:       set HUBSPOT_PERSONAL_ACCESS_KEY (+ optional HUBSPOT_PORTAL_ID) — `hs` runs with --use-env.
 * Flags:    --skip-files, --skip-design, --skip-pages, --dry-run (passed to sync-pages)
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const CONFIG = JSON.parse(fs.readFileSync(path.join(ROOT, "tools/hubspot/config.json"), "utf8"));
const args = new Set(process.argv.slice(2));

function run(cmd, cmdArgs, extraEnv = {}) {
  console.log(`\n$ ${cmd} ${cmdArgs.join(" ")}`);
  const res = spawnSync(cmd, cmdArgs, {
    cwd: ROOT,
    stdio: "inherit",
    env: { ...process.env, ...extraEnv },
    shell: process.platform === "win32",
  });
  if (res.status !== 0) process.exit(res.status || 1);
}

const ciAuth = !!process.env.HUBSPOT_PERSONAL_ACCESS_KEY && !process.env.HUBSPOT_ACCOUNT;
const hsAuth = ciAuth
  ? ["--use-env"]
  : process.env.HUBSPOT_ACCOUNT
    ? [`--account=${process.env.HUBSPOT_ACCOUNT}`]
    : [];
const hsEnv = ciAuth ? { HUBSPOT_PORTAL_ID: process.env.HUBSPOT_PORTAL_ID || String(CONFIG.portalId) } : {};

run("node", ["tools/hubspot/build.mjs"]);

if (!args.has("--skip-files") && !args.has("--dry-run")) {
  run("hs", ["filemanager", "upload", "hubspot-dist/files", CONFIG.fileManagerFolder, ...hsAuth], hsEnv);
}
if (!args.has("--skip-design") && !args.has("--dry-run")) {
  run("hs", ["cms", "upload", "hubspot-dist/design", CONFIG.designManagerFolder, ...hsAuth], hsEnv);
}
if (!args.has("--skip-pages")) {
  run("node", ["tools/hubspot/sync-pages.mjs", ...(args.has("--dry-run") ? ["--dry-run"] : [])]);
}
console.log(`\nDone → https://${CONFIG.domain}/`);
