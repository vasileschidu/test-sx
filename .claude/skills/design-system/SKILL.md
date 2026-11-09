---
name: design-system
description: Design tokens for the SMART prototype — colour palette, semantic colour classes (text-secondary, bg-brand…), text roles (type-title-page, type-description…), spacing, radius, shadows, dark mode. Use before writing or reviewing any CSS, Tailwind classes or UI markup in this repo.
---

# Design system (tokens)

Figma source: **🛠 SMART System** (`PdvEp0MAIlof6O8MYaXCcy`), page „📘 Design tokens".
Full Figma ↔ code table: `wiki/design-system/tokens.md`. Never write raw hex or px.

## Layers (use the highest one that fits)

1. **Text roles** — `type-*` classes = Figma text styles (size + weight + line height, no colour).
2. **Semantic colours** — role-named classes; switch for dark mode inside `.dark` on their own.
3. **Tailwind primitives** — `bg-blue-600`, `p-4`, `rounded-md`, `shadow-xs`, `text-sm`.

Palette: the pages run Tailwind v4 but `src/scripts/tailwind-theme.js` pins the colours to the
classic Tailwind v3 hex palette the Figma product files use (`blue-600 #2563EB`, `gray-500 #6B7280`,
`red-600 #DC2626`). Semantic classes resolve through it. Script order in `<head>`:
Tailwind CDN → `tailwind-theme.js` → `design-tokens.js`.

## Text roles (`type-*`)

| Class | = Tailwind | Use |
|---|---|---|
| `type-title-page` | text-3xl font-semibold | page title (h1), one per screen |
| `type-title-section` | text-xl font-semibold | section heading |
| `type-title-modal` | text-lg font-semibold | modal / drawer / panel title |
| `type-title-card` | text-base font-semibold | card, details-card, group title |
| `type-title-small` | text-sm font-semibold | compact titles |
| `type-description` / `-small` | text-sm / text-xs normal | supporting text under a title or field (+ `text-tertiary`) |
| `type-body` / `-large` | text-sm / text-base normal | running text, table cells, values |
| `type-label` / `-large` / `-small` | text-sm / base / xs medium | labels, nav items / large selectors / badges |
| `type-overline` | text-xs medium uppercase tracking-wider | table headers, eyebrows |
| `type-button` / `-large` | text-sm / text-base semibold | button labels |
| `type-link` | text-sm semibold | text links (+ `text-brand`) |
| `type-caption` | text-xs normal | timestamps, footnotes |
| `type-amount-hero` / `-large` | text-5xl normal / text-2xl bold | payment amounts |

## Semantic colours (most used)

| Role | Class | Light → dark |
|---|---|---|
| Text | `text-default` · `text-secondary` · `text-tertiary` | gray-950 · 700 · 500 → gray-50 · 300 · 500 |
| Text on brand/colour | `text-inverse` | white → black |
| Links / brand | `text-brand`, `text-brand-hover` | blue-600 / 700 |
| Status text | `text-success` · `text-warning` · `text-danger` | green / yellow / red-600 |
| Surfaces | `bg-default` · `bg-secondary` · `bg-tertiary` (+ `-hover`, `-active`) | white · gray-100 · gray-50 |
| Brand fill | `bg-brand` (+ `-hover`, `-active`), `bg-brand-secondary` | blue-600, blue-100 |
| Status fills | `bg-success` · `bg-warning` · `bg-danger` (+ `-secondary`, `-tertiary`) | |
| Overlay | `bg-overlay`, `bg-overlay-secondary` | gray-900 / 75 · 50 |
| Borders | `border-default` · `border-secondary` · `border-strong` · `border-subtle`, `border-brand`, `border-danger(-subtle)` | gray-200 · 300 · 950 · 50 |
| Icons | `text-icon` · `text-icon-secondary` | gray-500 · 700 |

All 77 are in `wiki/design-system/tokens.md`. Existing pages still use primitives — don't mass
rewrite; use semantic classes in new or touched UI.

## Spacing, radius, shadow (Tailwind steps; Figma `spacing` variables use the same numbers)

- Rhythm 8 / 16 / 24: `gap-2`, `gap-4`, `gap-6`; card padding `p-4` (dense) or `p-6`; page gutter `px-4 lg:px-10`.
- Inputs and buttons `rounded-md`; cards `rounded-lg`; pills `rounded-full`.
- Shadows: `shadow-xs` on buttons/inputs, `shadow-sm` cards, `shadow-lg` menus/modals.
- Field heights: copy the inventory snippets (select trigger `py-1.5 sm:text-sm/6`, table search `h-10`); SD consumer steps use 56px primary buttons.

## Dark mode — required on every change
Every page (dashboard, consumer portal, SX enrolment, SD US, SD UK) is class-based dark mode
(`@custom-variant dark (&:where(.dark, .dark *))`, `theme-init.js?v=…`, `localStorage.theme`, switch in the
user menu; testers add `?theme=dark|light`). Documents/PDF canvases stay white on purpose.

**Rule: no UI ships light-only.** Anything you add or touch gets its dark pair in the same change, written the
way Tailwind Plus writes it (its snippets already carry the `dark:` classes — keep them, don't strip them):
- Every state, not just the default: `hover:`, `focus-visible:`, `active:`, `disabled:`, `aria-selected:`,
  expanded/open. A `hover:bg-gray-50` without `dark:hover:bg-white/10` turns light on hover in dark.
- Surfaces: white → `gray-900`; cards/inputs gray-50 → `white/5`; hover → `white/10`; menus/popovers
  `gray-800` + `outline-white/10`; borders gray-200/300 → `white/10`–`white/15`.
- Text: gray-900 → `white`, gray-700 → `gray-300`, gray-500 → `gray-400`, blue-600 → `blue-400`.
- Badges (Tailwind dark badge): `bg-{c}-400/10 text-{c}-400 inset-ring-{c}-400/20` (yellow text `yellow-500`,
  green ring `green-500/20`); same for bordered badges with `border-{c}-400/20`.
- Primary buttons: `dark:bg-blue-500 dark:hover:bg-blue-400 dark:shadow-none`.
- Sticky/overlay cells must stay opaque: keep `dark:bg-gray-900` and add the tint as a layer
  (`dark:bg-linear-to-r dark:from-white/5 dark:to-white/5`) — never a translucent `dark:bg-white/5` alone.
- Black-only logos/wordmarks: `dark:invert` (or a currentColor SVG with `dark:text-white`).
- Floating things on a gray-900 page (toasts, chips) need contrast: `gray-950` + a `white/10` ring.
- Prefer semantic classes where the light value is identical — they switch on their own.

**Check before done:** `npm run qa:hover -- --pages <changed pages> --dark` → `dark-light-hover 0`
(it hovers every control in dark and flags light backgrounds and unreadable text), plus a dark screenshot
of what you changed. Blue primary buttons report `dark-low-contrast` 2.5 by Tailwind design — accepted.
