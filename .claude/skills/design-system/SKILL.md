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

## Dark mode
Dashboard pages only: class-based (`@custom-variant dark (&:where(.dark, .dark *))`, `theme-init.js`,
`localStorage.theme`). Every new colour needs its `dark:` pair — semantic classes do it for you.
The SD / onboarding flows are light-only.
