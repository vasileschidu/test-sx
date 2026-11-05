# STP walkthrough (client demo) — plan and status

Branch: `stp-walkthrough`. Figma: `9DRzbyv7FDCDYFYN5ZGuwZ` ([R3] SMART Exchange), page `↳ STP`.

## Resume here (state at 2026-11-05, end of session)
- **Batches 1–4 done and committed** on `stp-walkthrough` (last commit `e6e8db7`). Branch is **not pushed**, no PR yet.
  `main` = `74f732d` (all other branches — ai-setup, andrian-sandbox, figma-match — already merged and pushed earlier).
- **Test links** (serve with `python3 tools/serve.py` → port **8899**; port 8935 belongs to another project):
  - Launcher: http://localhost:8899/src/pages/demo/stp-case.html → Create case →
  - Case ready: http://localhost:8899/src/pages/demo/stp-case-ready.html (Start enrolment / Open Supplier Portal open in new tabs,
    Change case → launcher, Reset demo).
  - Enrolment: `src/pages/sx-enroll/index.html?case=<id>`; final "Go to SMART Exchange" opens the portal instance in a new tab.
- **Waiting on Vasile (ask before acting):**
  1. Redeploy the Cloudflare worker (`cd workers/sd-sx-token-service && npx wrangler deploy`) so real B emails use STP copy —
     outward-facing, needs explicit OK.
  2. Update worker email template to Figma 36525:46232 (with the redeploy).
  3. Case has no bank account, yet STP ends via micro-deposit verification — add a bank account to the case, or keep "No Bank Accounts"?
  4. Review-documents modal width: capped 1048px vs full width.
  5. "New flow with scenarios in new tab" — implemented as Start enrolment in a new tab; per-scenario picker offered as alternative.
- **Batch 5 (next):** hand click-through of every scenario at desktop + phone width (incl. B signer page and portal
  "Send it to <signer>", both untested by click), `qa:code` / `qa:hover` (use `--init tools/ui-qa/init/sx-demo-case.js`),
  wiki entry, PR from `stp-walkthrough`. `gh` is installed but not logged in — Vasile must run `! gh auth login --web --git-protocol https`.
- **Vasile's feedback / rules from this session (keep applying):**
  - Scenario selection is the main launcher use case; case details stay in one "Edit case information" modal
    (Catalyst-style page scroll, hugging textareas, section separators, title `type-title-section`, sections `type-title-card`, no description).
  - No "All prototypes" link. Case ready is its own page.
  - Enrolment: stepper labels one line (sidebar `px-12`, done in sx-enroll.js — don't edit Andrian's shared SD sidebar script);
    SX logo from Figma (`src/assets/sx-enroll/sx-menu-logo.svg`); Confirm Business Details has no Edit; signature step "leave as is".
  - Portal: steps modal one step at a time (done steps checked, no CTA); Payment Preferences shows only case data; SX side menu
    per Figma 34510:42009; switcher = case business only.
  - Never push to `main` directly (one-time exception was the branch merge). No real client names. Don't hand-edit design-tokens.js.

## Goal
A demo walkthrough of SX + STP (Automatic Card Processing), like the Consumer Portal walkthrough:
create a **case** (one payment) → supplier **enrols** with that payment → lands in a **Supplier Portal
instance with only that payment** and the details entered during enrolment.

## Decisions (2026-11-05, Vasile)
- Enrolment = **new flow `src/pages/sx-enroll/`**, reusing SD scripts (OBSign, OBConsents, OBModal,
  stepper, context). Do NOT edit Andrian's `src/pages/onboarding/` pages.
- Other signer: **same browser** is enough (real email via `STPState.sendAgreementEmail` → worker →
  Brevo, allowlist in `src/data/public-runtime-config.json`; signing syncs via storage events).
- Case launcher fields: supplier & contact, payer & amount, signer email, starting scenario.
- MID/TID are simulated (generated when the card is processed).

## Flow
Enrolment steps: Confirm Identity → Confirm Business Details → Review Documents → Provide Signature →
Confirm Payment → **Automatic Card Processing** → Create SMART Exchange → Summary → Final screen.

Automatic Card Processing (Figma 36525:48445 / 8.1 36525:50666 / 8.2 36525:48634):
- A. self-sign: 36861:55811 (8.3 yes 36525:49670, filled 49888, loading 50103, ack complete 50319)
- B. other signer: 36861:55808 (8.3 no 36525:48843, filled 49057, loading 49271, waiting 49486)
  → signer static page "Review & sign agreement" section 36525:45392 (email 36525:46232 + 6 states),
  Link expired 37764:150589
- C. skip: 33456:53115 (opt-out 33456:53560, are-you-sure 33456:53422)
Create SX / Summary / Final: section 36861:55810 (9. 33456:52815, 10. 33456:52896, 11. 33456:52931,
final big screen with card details 33456:52985).

Portal outcomes:
- Scenario 1 (STP on + card processed in enrolment, MID/TID known): section 33456:53696
- Scenario 2 (STP on, user skipped processing → process in portal, mark paid → MID/TID): 34510:34059
- Scenario 4 (STP skipped → opt in later from portal, pending payment used): 33456:60434
  (Step 1 agreement self 36800:73898 / other 36800:73897, Step 2 process 36800:73907,
  Step 3 micro deposit 36800:73908, Opted in 36800:73913, Payment Preferences 36800:73914)
- Out of scope for now: Scenario 3 (36554:210506), 5 ($0 card, 33650:60214), 6 (Get paid, 33456:57524).

## Reuse map
- STP state machine: `src/scripts/stp-state.js` (`STPState`, keys `sx_global_stp_state_v3`,
  `sx_stp_agreement_request_v1`), banners in `topbar-component.js`, dialogs in
  `payment-preferences-page.js`, wiki spec `wiki/products/smart-exchange/standard.md`.
- Portal: `exchanges-table.js` (`EXCHANGES_TABLE_CONFIG`, `gp-*` dialogs, overrides key
  `sx_exchange_entry_overrides_v1`), tenants `app-plans.js`.
- Enrolment building blocks: `src/pages/onboarding/*`, `sd-onboarding-context.js`, `onboarding-*.js`.

## Batches
1. Foundation — case model `SXDemoCase`, launcher page, demo tenant, portal loads only the case
   payment, reset. **(done 2026-11-05)**
   - `src/scripts/sx-demo-case.js` → `window.SXDemoCase`: `ready()` (promise; loads
     `defaultTestRecipient` for the signer email — await before `defaults()`/`create()`), `defaults()`,
     `get()`, `create(fields)`, `update(patch)` (deep merge), `reset()`, `isPortalInstance()`,
     `toPaymentRow([case])`, `urls([case])` → `{ enrol, portal, launcher }` (root-relative, resolved from
     the script src). Constants `STORAGE_KEY` (`sx_demo_case_v1`), `CHANGE_EVENT` (`sx-demo-case:change`,
     detail `{ case }`, also fired from `storage` events in other tabs; `case` is null after reset).
   - `create()`/`reset()` clear the STP keys, `sx_exchange_entry_overrides_v1` and sessionStorage `sx-enroll*`.
   - `urls().portal` = `supplier-portal.html?case=<id>&tab=action-required` (a pending card row is
     "Pending Your Action" on that tab; once marked paid it moves to Paid).
   - Portal hook: `EXCHANGES_TABLE_CONFIG.transformData(json) → json` (exchanges-table.js,
     `fetchExchangesData`). supplier-portal.html sets it only when `isPortalInstance()`.
   - Tenant `sx-demo` (app-plans.js, plan `supplier-portal`) exists only when a case exists AND
     `sx-demo-case.js` loaded before `app-plans.js`; active on `?case=` pages. Topbar
     `applyProfileData` uses the case supplier name + contact name/email on the instance.
   - Open: the instance is only recognised with `?case=` in the URL — nav links (Payment Preferences,
     reload via sidebar) drop it. Batch 4 must carry `?case=` (or make the instance sticky per tab) and
     load `sx-demo-case.js` (before `app-plans.js`) on payment-preferences.html too.
   - Launcher: `src/pages/demo/stp-case.html` (linked from root `index.html`).
2. Enrolment pages `src/pages/sx-enroll/` **(done 2026-11-05)**
   - Pages: `index` → `confirm-identity` → `confirm-business-details` → `review-documents` → `signature` → `payment` →
     `card-processing` → `create-account` → `summary` → `complete` (all `?case=<id>`; missing/unknown case → notice + launcher link).
   - Scripts: `sx-enroll.js` (`window.SXEnroll`, steps, SD adapters: `OB_FLOW_STEPS`, `OB_MOBILE_MENU`, `SDOnboardingContext`
     shim on sessionStorage `sx-enroll-state`, `OBGo` wrapper), `sx-enroll-acp.js` (step 6), `sx-enroll-complete.js`. SD files untouched.
   - Case fields written: `supplier.*` (Confirm details Edit; contactFirst/Last from Create account), `signer.*` (B form),
     `enrol.stp` `'on'|'skipped'`, `enrol.signer` `'self'|'other'|null`, `enrol.agreementSigned` (bool),
     `enrol.agreement` = A `{ signedBy, confirmedAt }` / B `{ delegatedTo, email, note, sentAt, delivered }` / C `null`,
     `enrol.account = { username, firstName, lastName, createdAt }`, `enrol.completedAt`, `enrol.cardProcessed`,
     `stp = { mid, tid, processedAt }`.
   - STP per branch: A → `in_progress / terminal_completed_tid_mid_received` (wiki: "Review + agree + Confirm → EligibilityPending");
     B → `sendAgreementEmail` → `agreement_signature_pending` (+ `sx_stp_agreement_request_v1`; non-allowlisted = test mode, no fetch);
     C → `opt_in_required` (disabled; nothing stored if it already was).
   - `SXDemoCase.markCardProcessed()` (new): override `{status:'paid', …, activityLog + complete event}` in
     `sx_exchange_entry_overrides_v1[invoice]`, fake MID (15 digits) / TID (8 chars), `enrol.cardProcessed = true`; if
     `enrol.stp==='on'` and the agreement is signed (`signer==='self'` or `agreementSigned===true`) and STP is at
     `terminal_completed_tid_mid_received` → `bank_verification_required` (same as Get paid). `urls().portal` now opens
     `&tab=paid` once `enrol.cardProcessed`, else `&tab=action-required`.
   - **Batch 3 must know:** the B email's `verifyBaseUrl` is the page that sent it (`/src/pages/sx-enroll/card-processing.html`),
     so the token link lands there — route it to the signer page (wrap, don't change the worker). When the signer signs, set
     `enrol.agreementSigned = true`, `enrol.agreement.signedBy/confirmedAt` and STP → `terminal_completed_tid_mid_received`;
     the enrolment tab re-renders on `sx-demo-case:change` only on the final page (ACP page reads the case on load).
   - QA: `--init tools/ui-qa/init/sx-demo-case.js` seeds case `SX-QA` for code/hover audits.
3. Signer side — email link → Review & Sign page (+ expired) → advances STP state. **(done 2026-11-05)**
   - Page `src/pages/sx-enroll/sign-agreement.html` + `src/scripts/sx-sign-agreement.js` (no step menu; loads sx-enroll.js +
     sx-enroll-acp.js only for helpers / `SXEnroll.agreementArticle()`): document → Confirm → loading → "Agreement was confirmed"
     + First/Last (prefilled from `case.signer`) → Confirm Acceptance → loading → Acknowledgement Complete. Invalid link = "This link
     has expired" (no case / reset, `?case=` or `?email=` mismatch, not B, `agreement.sentAt` null after Change signer, already
     signed, STP not at `agreement_signature_pending`); also flips live while open.
   - Link routing is client-side: `STPState.sendAgreementEmail({ linkUrl })` (default still = sending page, so Payment Preferences is
     unchanged). The worker strips the query, so the email opens `sign-agreement.html?stpAgreement=review&email=&token=` and the page uses
     the stored case (same browser). Token is not verified (demo). `SXDemoCase.urls().sign` = `sign-agreement.html?case=<id>`.
   - Waiting card (ACP) shows "Open signer's link" (new tab, `?case=&email=`) when the email was not delivered (test mode).
   - On sign: `SXDemoCase.signAgreement(signedBy)` → `STPState.markAgreementSigned` (request kept with `status:'signed'`,
     `signedBy`, `signedAt`), STP → `terminal_completed_tid_mid_received`, or `bank_verification_required` if `enrol.cardProcessed`
     (MID/TID kept); case `enrol.agreementSigned = true`, `enrol.agreement.{signedBy, confirmedAt, via:'email'}`.
   - Live: ACP "Waiting" → "Acknowledgement Complete" on `sx-demo-case:change` (acknowledged() = `agreementSigned && confirmedAt`, A and B);
     portal banner already followed via `STPState` storage listener (agreement → eligibility banner, no change needed).
   - Presenter real-email opt-in: launcher checkbox "Send real emails to this address" → localStorage `sx_extra_allowed_emails_v1`
     (kept on case reset); `STPState.isAllowlistedEmail` / `sendAgreementEmail` accept it; `isConfigAllowlistedEmail` = config only.
   - QA seed for the pending B state: `--init tools/ui-qa/init/sx-demo-case-b.js` (case `SX-QA-B`).
   - Open: the deployed worker is older than `workers/sd-sx-token-service/src` (`/preview-email?flow=stp` returns the SD email) — redeploy
     with `cd workers/sd-sx-token-service && npx wrangler deploy` before a real-email demo; worker email copy differs from Figma 36525:46232
     (subject "Action Required: …", delegator name, note, "Review and Acknowledge" CTA) — needs a worker change + deploy.
   - **Batch 4 must know:** a B case may reach the portal with STP still `agreement_signature_pending` (signer hasn't signed) — the
     agreement banner shows; once signed in another tab the portal flips to the eligibility (or bank verification) banner live.
     Portal Scenario 4 "Step 1 agreement other" (36800:73897) can reuse `sendAgreementEmail({ linkUrl: SXDemoCase.urls().sign path })`
     and `SXDemoCase.signAgreement`.
4. Portal Scenarios 1, 2, 4 — banners, process payment → MID/TID, micro deposit → Opted in,
   Payment Preferences shows MID/TID. **(done 2026-11-05)**
   - Instance kept across pages: links to `/pages/dashboard/*.html` get `?case=` (click capture in sx-demo-case.js);
     payment-preferences + my-company-profile load sx-demo-case.js before app-plans.js. `SXDemoCase.applyPageConfig(file)`
     (inline + shell-navigation `configurePage`) sets the table `transformData` / `onMarkedPaid` and PP
     `transformSharedData` (only the case card, case business as profile + check address, payer as only customer, no bank
     → empty state) / `storagePrefix sxdemo_<id>_pp_` / `getStpIds`. `getMyCompanyProfile` (shared.js) returns the case business.
   - Shell: plan `sx-instance` (Figma 34510:42009) — Insights, AP/AR (Upgrade), SMART Exchange, Settings (open) › My Company
     Profile / Payment Preferences / User Management, no Help / Account Information; switcher = case business only. The
     `sx-demo` tenant now exists only on the instance (plain pages: unchanged, pixel-compare identical).
   - State: `SXDemoCase.syncStp()` (instance load + every STP/case change, forward only): C → opt_in_required; B unsigned →
     agreement_signature_pending; A/B signed → terminal_completed (Scenario 2) or bank_verification_required if
     `enrol.cardProcessed` (Scenario 1); signed + processed → deposit. Mark as paid on the case row → `markCardProcessed`
     (MID/TID; STP terminal → bank verification regardless of branch). Deposit: any amount (demo note) → completed.
   - Scenario 4: Opt in (topbar / PP) on the instance always opens the inline agreement dialog: Confirm = self-sign
     (`SXDemoCase.optIn({self:true})`), "Send it to <signer>" = Batch 3 email + sign-agreement.html (`optIn({self:false})`).
   - Set-up steps modal (`openSetupStepsModal`) is state-driven, one step at a time (also PP's opt-in "next steps").
   - Verify / success dialogs (inline + PP) use Figma 35801:48256 / 33600:39743 copy ($ add-on, "Not seeing it yet?" box).
   - Batch 5 notes: no "Auto" badge on the Paid row (Figma 36867:140075 shows it for later auto-processed payments; the case
     payment is processed manually); Figma's 2-step Enable modal ("How it works → Next → Review & Sign Agreement" with
     self/other radios, 36752:79631 / 80444) is approximated by the existing inline dialog + "Send it to" link; default PP
     shows fallback "Customer" cards because `normalizeCards` throws (pre-existing, left as is).
5. Polish — scenario picker, QA (qa:code / qa:hover), wiki, PR.
