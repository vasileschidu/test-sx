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
- Figma: [R3] SMART Exchange [Figma](https://www.figma.com/design/9DRzbyv7FDCDYFYN5ZGuwZ) for the portal shell; Hub screens in [R2] SH - Accounts Payable [Figma](https://www.figma.com/design/DyBC356t1jIcoPrKjf9Ra8). Figma also shows two different sidebars (Hub vs Supplier Portal); the code unifies them via plans.

> Note: `PROJECT_RULES.md` says the content offset is `lg:pl-[360px]` / `lg:pl-[88px]`, but
> `bills-and-payables.html` uses `lg:pl-[304px]`. TODO(confirm) which is current; the rules file may be stale.

## 2. Enroll: SMART Enroll

A portal, but with its own layout because its job is onboarding, not daily work.

- Candidate code: `src/pages/onboarding/` (create account → confirm identity → business details →
  review documents → signature → summary → complete). It uses a **static stepper sidebar** instead of `<app-nav>`.
- TODO(confirm): is this SMART Enroll, or Exchange supplier onboarding?
- Figma: see Enroll in [figma-files.md](../design-system/figma-files.md) (several candidate files)

## 3. Token flow: Disburse, Collect

Short, focused flow opened from a token (an emailed link) to finish one task: receive or pay. Reference implementation:
SMART Disburse ([standard](../products/smart-disburse/standard.md), [US flow](../products/smart-disburse/flows/us-default.md)).

As built (`src/pages/onboarding/`, `src/scripts/onboarding-sidebar.js`, `onboarding-stepper.js`, `onboarding-mobile-header.js`):

- **Desktop:**
  - **Step rail:** a dark navy rail on the left with the logo and the stepper (done steps checked, current step ringed).
  - **Rail footer:** a card with **Contact Us** and **Decline Payment**, a language picker, Terms of Use / Privacy Policy /
    E-Sign Consent links, and "Powered by Transcard".
  - **Content:** white, on the right. Payment steps lead with a blue gradient **amount card** ("PAYMENT AMOUNT", amount,
    "FROM [sender]"), then chips (**Message**, **Expiration**, **Contact Us**).
- **Inside a payment method:** a substeps header ("Account Information → Summary", `onboarding-substeps.js`, desktop only).
  Every method ends in **One Final Step** (summary, consents, sign dialog) and a confirmation with a receipt.
- **Below 1024px:** the rail is replaced by a sticky top bar with the current step, position and progress. Its menu holds
  Contact / Decline. Content is capped at 640px, centred.
- **Dialogs:** one shared dialog shell (`onboarding-modal.js`): blurred backdrop, close (X), Escape, focus trap.
- **Loading:** each step fades in once, and its data shows skeletons for 1.0–1.5 s (`onboarding-transitions.js`).
- No portal navigation.
- **SMART Exchange** also has a token flow, next to its portal. In the code it uses this same shell: Hub Pay's SMART
  Exchange test email (`payables-pay.js`, `flow: "sx"`) links to `src/pages/onboarding/index.html?flow=sx`. But the shell doesn't
  branch on `sx` (`onboarding-flow.js` knows `us` and `multi-party`), so it shows the SMART Disburse screens. There are no
  SX-specific screens yet, including the [STP](../products/smart-exchange/stp.md) opt-in under Card. TODO(confirm).
- Figma ([LAUNCHED] Default Flow [Figma](https://www.figma.com/design/4WZgq8XswZFkHcI6bzOIiK)); sidebar "SD Menu" node 19427:30373.

## Shared rules across families

- **Table filter (Portal family):** identical layout and behavior in Hub AP, Hub AR, Exchange and Consumer Portal. Only the categories differ, and they come from each table’s column headers. See [table-filter.md](../design-system/table-filter.md).
- Known gaps between portals: [portal-consistency.md](../design-system/portal-consistency.md).
- Mobile-first; test at 320, 768, 1280, 1440 px (from `PROJECT_RULES.md`).
- Accessibility baseline: keyboard focus, alt text, labeled icon buttons, 4.5:1 contrast in both themes.
- Frame widths in Figma vary (1440 / 1728 / 1920). TODO(confirm) the reference desktop width.
- TODO: anything else every family must follow (branding area, error and empty states).
