---
title: Design tokens
type: reference
status: draft
last_reviewed: 2026-10-19
---

# Design tokens

Figma and code use the same token **names**. Source of truth: the **🛠 SMART System** Figma file.

**Palette:** the pages run Tailwind v4 from the CDN, but `src/scripts/tailwind-theme.js` pins the colours to the
classic Tailwind v3 hex palette the Figma product files are drawn with (`blue-600 #2563EB`). The semantic
classes below resolve through it. TODO(decide): SMART System's primitive variables currently hold the v4
values (updated 2026-10-19, not published) — align them to the v3 palette or move code to v4.

## How to use them

1. **Primitives = plain Tailwind.** Colours (`bg-blue-600`), spacing (`p-4`, `gap-6`), radius
   (`rounded-md`), shadows (`shadow-sm`), text sizes (`text-sm`) are Tailwind's own classes.
   Figma's `primitive-colors`, `spacing`, `border-radius`, `font` collections and the shadow
   styles carry the same names and values.
2. **Prefer the semantic classes below for new UI.** They say *what* a colour is for, switch to dark
   mode on their own, and map 1:1 to Figma's `semantic colors` collection.
3. **Use a text role** (`type-*`) for type instead of combining size and weight by hand. Each one is a
   Figma text style with the same name.

Defined in `src/scripts/design-tokens.js`, loaded right after `tailwind-theme.js` on every page.
That file is generated from Figma (`~/figma-audit/tokens/gen_tokens.py`): change Figma, then
regenerate, don't hand-edit. The two layers only **add** names; nothing existing changes.

## Text roles

| Figma text style | Class | Tailwind equivalent |
|---|---|---|
| Title/Page | `type-title-page` | `text-3xl font-semibold` |
| Title/Section | `type-title-section` | `text-xl font-semibold` |
| Title/Modal | `type-title-modal` | `text-lg font-semibold` |
| Title/Card | `type-title-card` | `text-base font-semibold` |
| Title/Small | `type-title-small` | `text-sm font-semibold` |
| Description/Default | `type-description` | `text-sm font-normal` |
| Description/Small | `type-description-small` | `text-xs font-normal` |
| Body/Default | `type-body` | `text-sm font-normal` |
| Body/Large | `type-body-large` | `text-base font-normal` |
| Label/Default | `type-label` | `text-sm font-medium` |
| Label/Large | `type-label-large` | `text-base font-medium` |
| Label/Small | `type-label-small` | `text-xs font-medium` |
| Overline | `type-overline` | `text-xs font-medium uppercase tracking-wider` |
| Button/Default | `type-button` | `text-sm font-semibold` |
| Button/Large | `type-button-large` | `text-base font-semibold` |
| Link/Default | `type-link` | `text-sm font-semibold` |
| Caption | `type-caption` | `text-xs font-normal` |
| Amount/Hero | `type-amount-hero` | `text-5xl font-normal` |
| Amount/Large | `type-amount-large` | `text-2xl font-bold` |

## Semantic colours

Light value / dark value are Tailwind colours. Dark applies inside `.dark`.

| Figma variable | Class | Light | Dark |
|---|---|---|---|
| `background/base/default` | `bg-default` | white | gray-950 |
| `background/base/default-hover` | `bg-default-hover` | gray-50 | gray-900 |
| `background/base/default-active` | `bg-default-active` | gray-100 | gray-800 |
| `background/base/secondary` | `bg-secondary` | gray-100 | gray-900 |
| `background/base/secondary-hover` | `bg-secondary-hover` | gray-200 | gray-800 |
| `background/base/secondary-active` | `bg-secondary-active` | gray-300 | gray-700 |
| `background/base/tertiary` | `bg-tertiary` | gray-50 | gray-800 |
| `background/base/tertiary-hover` | `bg-tertiary-hover` | gray-100 | gray-700 |
| `background/brand/default` | `bg-brand` | blue-600 | blue-500 |
| `background/brand/default-hover` | `bg-brand-hover` | blue-700 | blue-400 |
| `background/brand/default-active` | `bg-brand-active` | blue-800 | blue-300 |
| `background/brand/secondary` | `bg-brand-secondary` | blue-100 | blue-200 |
| `background/brand/secondary-hover` | `bg-brand-secondary-hover` | blue-200 | blue-300 |
| `background/brand/secondary-active` | `bg-brand-secondary-active` | blue-300 | blue-400 |
| `background/disabled/default` | `bg-disabled` | gray-200 | gray-700 |
| `background/alpha/default-overlay-dark` | `bg-overlay` | gray-900/75 | gray-900/25 |
| `background/alpha/secondary-overlay-dark` | `bg-overlay-secondary` | gray-900/50 | gray-900/25 |
| `background/disabled/secondary` | `bg-disabled-secondary` | gray-300 | gray-600 |
| `background/success/default` | `bg-success` | green-600 | green-500 |
| `background/success/default-hover` | `bg-success-hover` | green-700 | green-600 |
| `background/success/default-active` | `bg-success-active` | green-800 | green-400 |
| `background/success/secondary` | `bg-success-secondary` | green-100 | green-800 |
| `background/success/secondary-hover` | `bg-success-secondary-hover` | green-200 | green-700 |
| `background/success/secondary-active` | `bg-success-secondary-active` | green-300 | green-600 |
| `background/success/tertiary` | `bg-success-tertiary` | green-50 | green-900 |
| `background/warning/default` | `bg-warning` | yellow-500 | yellow-400 |
| `background/warning/default-hover` | `bg-warning-hover` | yellow-600 | yellow-300 |
| `background/warning/default-active` | `bg-warning-active` | yellow-700 | yellow-300 |
| `background/warning/secondary` | `bg-warning-secondary` | yellow-100 | yellow-800 |
| `background/warning/secondary-hover` | `bg-warning-secondary-hover` | yellow-200 | yellow-600 |
| `background/warning/secondary-active` | `bg-warning-secondary-active` | yellow-300 | yellow-500 |
| `background/warning/tertiary` | `bg-warning-tertiary` | yellow-50 | yellow-900 |
| `background/danger/default` | `bg-danger` | red-600 | red-500 |
| `background/danger/default-hover` | `bg-danger-hover` | red-700 | red-400 |
| `background/danger/default-active` | `bg-danger-active` | red-800 | red-300 |
| `background/danger/secondary` | `bg-danger-secondary` | red-100 | red-800 |
| `background/danger/secondary-hover` | `bg-danger-secondary-hover` | red-200 | red-700 |
| `background/danger/secondary-active` | `bg-danger-secondary-active` | red-300 | red-600 |
| `background/danger/tertiary` | `bg-danger-tertiary` | red-50 | red-900 |
| `border/base/default` | `border-default` | gray-200 | gray-700 |
| `border/brand/default` | `border-brand` | blue-600 | blue-500 |
| `border/disabled/default` | `border-disabled` | gray-300 | gray-700 |
| `border/success/default` | `border-success` | green-600 | green-500 |
| `border/warning/default` | `border-warning` | yellow-500 | yellow-400 |
| `border/danger/default` | `border-danger` | red-600 | red-500 |
| `border/danger/subtle` | `border-danger-subtle` | red-200 | red-800 |
| `border/warning/subtle` | `border-warning-subtle` | yellow-200 | yellow-800 |
| `border/success/subtle` | `border-success-subtle` | green-200 | green-800 |
| `border/brand/subtle` | `border-brand-subtle` | blue-200 | blue-800 |
| `border/base/secondary` | `border-secondary` | gray-300 | gray-600 |
| `border/base/tertiary` | `border-tertiary` | gray-400 | gray-500 |
| `border/base/strong` | `border-strong` | gray-950 | gray-100 |
| `border/base/subtle` | `border-subtle` | gray-50 | gray-900 |
| `text/base/default` | `text-default` | gray-950 | gray-50 |
| `text/base-inverse/default` | `text-inverse` | white | black |
| `text/brand/default` | `text-brand` | blue-600 | blue-400 |
| `text/disabled/default` | `text-disabled` | gray-500 | gray-500 |
| `text/success/default` | `text-success` | green-600 | green-400 |
| `text/warning/default` | `text-warning` | yellow-500 | yellow-400 |
| `text/warning/default-on-color` | `text-warning-on-color` | yellow-700 | yellow-300 |
| `text/danger/default` | `text-danger` | red-600 | red-400 |
| `text/danger/default-on-color` | `text-danger-on-color` | red-800 | red-200 |
| `icon/default` | `text-icon-inverse` | white | black |
| `icon/default-on-color` | `text-icon-inverse-on-color` | white | white |
| `text/success/default-on-color` | `text-success-on-color` | green-800 | green-200 |
| `text/disabled/secondary` | `text-disabled-secondary` | gray-300 | gray-800 |
| `text/brand/default-hover` | `text-brand-hover` | blue-700 | blue-500 |
| `text/brand/default-active` | `text-brand-active` | blue-700 | blue-500 |
| `text/brand/visited` | `text-brand-visited` | purple-700 | purple-400 |
| `text/base-inverse/default-on-color` | `text-inverse-on-color` | white | white |
| `text/base/secondary` | `text-secondary` | gray-700 | gray-300 |
| `text/base/tertiary` | `text-tertiary` | gray-500 | gray-500 |
| `text/base/default-on-color` | `text-default-on-color` | black | black |
| `icon/base/default` | `text-icon` | gray-500 | gray-400 |
| `icon/base/secondary` | `text-icon-secondary` | gray-700 | gray-200 |
| `icon/base/default-on-color` | `text-icon-on-color` | gray-950 | gray-950 |
| `icon/base/secondary-on-color` | `text-icon-secondary-on-color` | gray-600 | gray-600 |

## Rules for agents

- Before using a raw colour class (`text-gray-500`), check for a semantic class with that role (`text-tertiary`).
- Never invent a token name. If none fits, use the Tailwind primitive and flag it in the pull request.
- New tokens are added in Figma first, then regenerated here.

