# figma-designer — lessons archive

Grep this file (`grep -n -i -A3 "<topic>"`); never read it whole. Append ≤ 3-line dated lessons, newest last.
Tags: [tokens] [library] [audit] [api] [naming] [geap-style].

- 2026-10-16 [audit] Full-file REST downloads can exceed 6 GB (SMART Exchange): fetch page by page with
  `/v1/files/:key/nodes?ids=…&geometry=omit`, summarise each batch, keep only the summary.
- 2026-10-16 [audit] Nested SECTIONs inside SECTIONs hide frames from a top-level scan — recurse into sections.
- 2026-10-19 [tokens] SMART System colours were Tailwind v2-named (yellow = amber, green = emerald, purple = violet,
  light-blue = sky). Renaming + revaluing by name silently changes hues — map by intent first.
- 2026-10-19 [tokens] Text styles bound to `size/*`, `leading/*`, `family/sans` variables; every token carries WEB
  code syntax (`var(--color-blue-600)`) and a Tailwind description so Dev Mode / MCP hand over our classes.
- 2026-10-20 [tokens] Documentation pages bind every swatch / bar / specimen to its token — they update themselves.
  Found two real token bugs that way (`text/base/default-on-color` black in dark, `text/disabled/secondary` invisible in dark).
- 2026-10-26 [tokens] Code pins the v3 hex palette (`tailwind-theme.js`, Vlad) while SMART System primitives hold v4
  values (unpublished). Pending decision — don't publish SMART System colour changes until it's settled.
