# Prompt: User Management module (SMART Hub settings), invites sent by real email

Paste this into a new session, or give it to `proto-engineer` one phase at a time.

---

You are building the **User Management** module in the SMART prototype (repo `test-sx`, branch from
`andrian-sandbox`). Read `CLAUDE.md`, `PROJECT_RULES.md`, `wiki/AGENTS.md`, the `components` and
`design-system` skills and `.claude/skills/usage-budget/SKILL.md` first. Code first, Figma later.

## Source design
Figma `qiy6GvUHQMhdbC7hkXCCyb` ([REVIEW] User Management), page **Implementation - OLD?** (`460:13675`).
Use Figma for layout only. Every table, button, modal, field, badge and toggle comes from the components skill.

| Section | Frame | States |
|---|---|---|
| 1. Users | `460:35149` | 6.0 Users list (admin), 6.1 row actions (Edit / Remove), 6.2 Remove user modal, 6.3 Business details, 6.4 Multiple roles modal |
| 2. User Profile | `460:36486` | 6.5 Users list (default user, avatar menu → Profile), 6.6 My profile, 6.7 inline edit + uploaded photo, 6.8 field error, 6.9 Remove image modal |
| 3. Invite user (SH) | `460:36742` | 6.9 list with Pending invitation rows, 6.10 Invite member modal (empty), 6.11 filled (role → permission categories), 6.12 Invitation sent, 6.13 reopen |
| 4. Roles | `460:35697` | Roles list, create / edit role, permission chips per category, role saved modal, delete |
| 5. Invite user (SE), Invite tab | `460:37038` | Invite People modal over SX Onboarding: emails + role, errors, edit permissions, view only, Grant SMART Hub access confirmation |
| 5.1. Invite user (SE), Members tab | `460:37646` | Members list, edit expanded, Edit permissions modal, check / uncheck SMART Hub, Remove user modal |

Before coding, screenshot each section frame (one `get_screenshot` per section, not per state) and list
every state. Ask Andrian if a state is unclear. Despite "OLD?" in the name, **this page is the version
used in production** (Andrian, 2026-11-10), so follow it.

## Where it lives
- Pages: `src/pages/dashboard/user-management.html` (tabs Users | Roles, `?tab=roles`),
  `user-profile.html` (My profile and other users' profiles via `?id=`), and `src/pages/invite/accept.html`
  (the page the email link opens).
- Scripts: `src/scripts/user-management.js` (list, row actions, roles), `um-invite.js` (invite modal,
  shared by SH and SE), `um-store.js` (state), `um-email.js` (sending).
- Nav: set `href` on the `user-management` item in `src/data/nav.json` and `src/scripts/app-plans.js`.
  Use `<app-nav>` / `<app-topbar>`; never copy the shell markup.
- Data: seed `src/data/user-management.json` (users, roles, permission categories). Use fictional
  names only (Jane Cooper, Big Kahuna Burger), never client names.

## State (no backend)
`um-store.js` reads the seed and keeps changes in `localStorage` (`sx_um_v1`): users, invitations
(`id, email, firstName, lastName, phone, roleIds, message, status: pending|accepted|expired|revoked,
sentAt, expiresAt`), roles. Add a **Reset demo data** action. The same store backs the SH page and the SE modal.

## Invite by real email
GitHub Pages is static, so send from the browser with **EmailJS** (`@emailjs/browser`, exact version, from
cdn.jsdelivr.net/npm).

**Vasile connects the email account later.** Build everything now with `enabled: false` and empty IDs
in the config. Every invite then goes through the fallback in step 7 (Copy link / mailto:), and the whole
flow, including `accept.html`, must work like that. Turning on real sending must take only filling in
`email-config.json`, with no code change. Write the setup steps for Vasile in `src/emails/README.md`
(EmailJS account, service, template from `invite.html`, allowed origins, config fields).
1. `src/data/email-config.json`: `{ enabled, serviceId, templateId, publicKey, allowedDomains }`. The EmailJS
   public key is meant to be public. In the EmailJS dashboard, restrict the allowed origins to
   `vasileschidu.github.io` and `127.0.0.1` / `localhost`. Never commit a private key.
2. Guard: send only to `allowedDomains` (e.g. `agilepartners.eu`), max 5 sends a minute. Any other address
   still creates the Pending row, but shows "Email not sent (demo allows only …)" plus a Copy link button.
3. The link is `<origin>/src/pages/invite/accept.html?inv=<base64url JSON {id, email, name, roles, business, exp}>`.
   It must work on another device with empty localStorage, so the data travels in the link.
4. Email template (HTML, in EmailJS): logo, "Jane Cooper invited you to Big Kahuna Burger on SMART Hub",
   the personal message, role, an Accept invitation button and the expiry date. Keep a copy in
   `src/emails/invite.html`.
5. `accept.html` shows: valid → Set up your account (name prefilled, password, accept) → Welcome, then
   SMART Hub. Also: expired, revoked and already accepted. On the inviter's browser, accepting turns the
   row Active (via `localStorage` when it is the same browser; otherwise the demo panel offers
   "Mark as accepted").
6. Row actions on Pending: Resend invitation (new `sentAt` / `expiresAt`, sends again) and Revoke.
   Every send shows a loading button, then the Invitation sent modal, or an error toast with a retry.
7. If `enabled:false` or EmailJS fails to load, fall back to the Copy link / mailto: modal so the flow
   never blocks.

## Phases (each one ends with QA + commit, push only when Andrian says so)
1. Seed + store + Users tab (6.0–6.4): table, search, pagination, multiple roles, remove, business details.
2. My profile (6.5–6.9): inline edit, validation, photo upload / remove (data URL in the store).
3. Invite SH (6.9–6.13) + email + `accept.html` + resend / revoke.
4. Roles tab: list, create / edit with permission categories, delete with users assigned → blocked.
5. SE variant: Invite People modal (Invite / Members tabs) on the SX Onboarding information page, same
   `um-invite.js` and store, plus the Grant / Remove SMART Hub access confirmations.
6. Docs: components skill (new patterns), `wiki/products/smart-hub` (module page + changelog),
   `states.json`-style screenshot list, hand-off note.

## Definition of done (every phase)
- Every control has hover, focus-visible, active, disabled, error and loading states, and **dark mode in
  the same change**.
- Responsive at 375 / 768 / 1280: the table becomes cards on phones, and modals become full-height sheets on phones.
- Run `python3 tools/serve.py`, then `npm run qa:code -- --pages <pages> --files <files> --dark` and
  `npm run qa:hover -- --pages <pages> --dark`. Done means 0 major findings and `dark-light-hover 0`.
- Invite flow: copy the invite link, open it in a private window and finish sign-up. Report the result.
  Once Vasile has connected EmailJS, also send one real invite to an `agilepartners.eu` address.
- Bump `?v=` on changed scripts. Report what you checked, which states were not built, and why.
