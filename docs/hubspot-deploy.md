# Deploying the prototype to HubSpot

The prototype runs on HubSpot CMS as real website pages on its own subdomain
(`domain` in `tools/hubspot/config.json`, default `sx.transcard.com`).
GitHub stays the source of truth: edit in VS Code, merge to `main`, and the
**Deploy to HubSpot** workflow publishes it. Nothing is edited in HubSpot itself.

## How it maps

| Repo | HubSpot |
|---|---|
| `index.html`, `src/pages/**/*.html` | Website pages at the **same path** (`/src/pages/dashboard/supplier-portal.html`), one coded template each in Design Manager → `test-sx-prototype/templates/…` |
| `src/**` (scripts, styles, assets, data), `assets/**`, `wiki/**` | File Manager → `test-sx/…`, served at `https://<domain>/hubfs/test-sx/…` |
| Paths built at runtime (`/src/…`, `../../../src/data/…`) | Redirects `<domain>/src/*`, `/wiki/*`, `/assets/*` → `/hubfs/test-sx/…`, applied only when no page exists |

Keeping page paths identical means the prototype code needs **no changes**:
relative links, `location.pathname` checks and the JSON loaders work as they do on
GitHub Pages. `tools/hubspot/build.mjs` only rewrites static `src`/`href` values in the
HTML to `/hubfs/…`, wraps the page in `{% raw %}`, and adds `standard_header_includes`,
`standard_footer_includes` and (by default) `noindex`.

## Commands

```bash
npm run hubspot:build                 # → hubspot-dist/ (files, design, pages.json)
npm run hubspot:preview               # local HubSpot emulation → http://localhost:8090/
npm run hubspot:deploy -- --dry-run   # build + list the pages/redirects it would create
npm run hubspot:deploy                # build → hs filemanager upload → hs cms upload → pages + redirects
```

Locally `hs` uses your `hubspot.config.yml` (`HUBSPOT_ACCOUNT=<name>` to pick an account);
page creation needs `HUBSPOT_PERSONAL_ACCESS_KEY` or `HUBSPOT_TOKEN` in the environment.

## One-time setup

1. **Domain** — Settings → Content → Domains & URLs → *Connect hosting domain*, no primary
   content types. DNS: `CNAME sx → <portalId>.group42.sites.hubspot.net` (shown by HubSpot).
2. **Secrets** (GitHub → Settings → Secrets and variables → Actions):
   - `HUBSPOT_PERSONAL_ACCESS_KEY` — personal access key for the portal, with CMS scopes.
   - `HUBSPOT_TOKEN` (optional) — private app token with scope `content`, if the personal key
     can't create pages.
3. **Token test page** — add `https://<domain>` to `ALLOWED_ORIGINS` of the Cloudflare worker.
4. **Optional** — password-protect the pages in HubSpot (page settings → audience access).

## Notes

- Pages are never deleted automatically; a removed HTML file leaves its HubSpot page in place.
- Excluded from HubSpot: `src/pages/reports/` (`excludePages` in the config).
- `redirectStyle` is 302 while testing; switch to 301 once the setup is confirmed.
- Asset cache busting still relies on the `?v=` tags in the HTML.
