---
title: Layout families
type: suite
status: draft
last_reviewed: 2026-10-17
---

# Layout families

All products use the same design system ([design-system/](../design-system/README.md), source of truth: Figma).
On top of it there are **three layout families**. When building UI for a product, follow its family.
Do not borrow patterns from another family unless a decision record allows it.

Architectural rules for the code (navigation, data, dark mode, JS) are in `PROJECT_RULES.md` at the repo root.
Follow them. This page covers layout only.

## 1. Portal: Hub, Exchange, Consumer Portal

**One shared shell.** Hub, Exchange ("Supplier Portal" in the code) and Consumer Portal are the same
application shell. The business's **plan** decides which modules appear (`src/scripts/app-plans.js`):

| Plan | Product it represents | Home page |
|---|---|---|
| `bills-payables` | SMART Hub (buyer view) | `bills-and-payables.html` |
| `supplier-portal` | SMART Exchange (supplier view) | `supplier-portal.html` |
| `consumer-portal` | Consumer Portal (consumer view) | `consumer-payments-received.html` |
| `full` | Internal (Transcard) view, everything | `supplier-portal.html` |

Shell parts:
- **Sidebar**: `<app-nav>` web component (`src/scripts/nav-component.js`), data in `src/data/nav.json`.
  Off-canvas on mobile, fixed rail on `lg+`, collapsible (`sidebar.js`).
- **Top bar**: `topbar-component.js`, including the business/view switcher. Switching business shows
  a 2–3 s skeleton reload (`app-switch.js`). It is treated as a shell reload, not a filter.
- **Module states**: `enabled`, `locked` (visible with an Upgrade badge, routes to an upgrade page)
  or `hidden` (absent and unreachable by URL).
- **Content**: inside `#main-content-wrapper`. Typical page: white card with title, count and actions,
  then tabs, then search / filter / export, then a data table with expandable rows and pagination.
  Reference implementation: Hub Bills & Payables ([standard](../products/smart-hub/standard.md#bills--payables)).
- Light and dark mode are required on every page.

> Note: `PROJECT_RULES.md` says the content offset is `lg:pl-[360px]` / `lg:pl-[88px]`, but
> `bills-and-payables.html` uses `lg:pl-[304px]`. TODO(confirm) which is current; the rules file may be stale.

## 2. Enroll: SMART Enroll

A portal, but with its own layout because its job is onboarding, not daily work.

- Candidate code: `src/pages/onboarding/` (create account → confirm identity → business details →
  review documents → signature → summary → complete). It uses a **static stepper sidebar** instead of `<app-nav>`.
- TODO(confirm): is this SMART Enroll, or Exchange supplier onboarding?
- Figma: TODO (link)

## 3. Token flow: Disburse, Collect

Short, focused flow opened from a token (an emailed link) to finish one task: receive or pay.

- Example: `src/pages/sd-uk/` (Disburse): claim → verify → contact → payment (bank or card)
  → billing/summary → review → sign → done / thank you.
- No portal navigation.
- TODO: shell details (header, width, step indicator). Figma: TODO (link)

## Shared rules across families

- Mobile-first; test at 320, 768, 1280, 1440 px (from `PROJECT_RULES.md`).
- Accessibility baseline: keyboard focus, alt text, labeled icon buttons, 4.5:1 contrast in both themes.
- TODO: anything else every family must follow (branding area, error and empty states).
