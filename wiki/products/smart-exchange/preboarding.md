---
title: SMART Exchange — Preboarding (token, new user)
type: guide
status: draft
last_reviewed: 2026-10-17
product: smart-exchange
version: "R3"
source: built from Figma [R3] SMART Exchange (9DRzbyv7FDCDYFYN5ZGuwZ), page "↳ Preboarding (w/ and no token)", section "w/ Token Flow" → "EMAIL DOESN'T EXIST" (38223:39783), and the product owner's decisions of 2026-11-27 (TCDM-5263); prototype src/pages/sx-preboarding/
---

# Preboarding (token, new user)

**Preboarding** invites a supplier to SMART Exchange **with no payment attached**. The supplier confirms
identity and business, picks a **preferred payment method** (saved as the default), creates an account and
lands in the SMART Exchange portal. It runs next to [onboarding with payment](standard.md) (TCDM-5262), it is
not a version of it: there is no Confirm Payment, no Decline Payment and no signature.

Prototype: `src/pages/sx-preboarding/` (launcher row "Preboarding" under SMART Exchange), scripts
`sx-preboarding.js` + `sx-preboarding-forms.js`, sample `src/data/sx-preboarding.json`.

## Scope (TCDM-5263)

- In: token flow, **email doesn't exist** branch (Create an Account is shown).
- Out (later): email exists branch (skip Create an Account), non-token cases N1–N3, Language Notice /
  Attestation, the partner co-branded section, the emails (invite, token expired).

## Steps

| # | Stepper | Page | Figma |
|---|---|---|---|
| — | (welcome) | `index.html` "Hi, [Business]", Learn more dialog, "Already have an account? Sign in" | 38223:36208, 36261 |
| 1 | Confirm Identity | `confirm-identity.html` Tax ID + Your Vendor ID, attempts | 38223:36414, 36386, 36442 |
| — | — | `too-many-attempts.html` | 38223:36596 |
| 2 | Business Details | `business-details.html` "Business Information on File" form | 38223:36606, 36819 |
| 3 | Payment Preference | `payment-preference.html` Card / Bank / Check, or "I'll choose it later" | 38223:36887, 36966, 37042 |
| 3 | ↳ | `accept-card.html` / `bank-account.html` / `paper-check.html` | 38223:37370 · 39297:245663 · 39297:276923 |
| 4 | Create an Account | `create-account.html` (username = email, password rules, "email already exists") | 38223:45848 … 45745 |
| 5 | Complete | `summary.html` "Almost Done" + consents → "We're processing your request" | 38223:38613 · 39301:278851 · 39301:281113 · 38728:48548 |
| — | — | `complete.html` "Account Created Successfully!" → Go to SMART Hub (Supplier Portal) | 39702:152173 |
| — | — | `issue.html` "We have run into an issue." | 38663:300068 |

Methods are the TCDM-5262 set: Accept Payer's Card, Send to Bank Account, Request a Paper Check. The card
path has **no Automatic Card Processing** step: Figma's preboarding card path has none (no payment to process).

## Where the method ends up

On Submit the flow writes `localStorage`:
- `sx_preboarding_v1`: `{ business, method, bankAccount?, checkAddress?, completedAt }`;
- `pp_default_methods_v1`: the Global Preferences order, slot 1 = `payers-card`, the new bank account id or the
  new check address id.

Payment Preferences (Supplier Portal, `payment-preferences-page.js`) adds the bank account / check address to
Payment Methods and restores slot 1 of **Global Preferences → Set Default Payment Methods** from
`pp_default_methods_v1`. Its Save now writes the same key, so the order survives a reload. Other instances
(Consumer Portal, STP `?case=`) use their own prefix and are not affected.

## Demo rules

- Confirm Identity: any answer is accepted except one made only of zeros (e.g. `0000`), which costs an attempt
  (3 attempts, as SMART Disburse). The last one leads to "Too many attempts have been made".
- Create an Account: `taken@example.com` shows "An account with this email already exists".
- `summary.html?fail=1`: Submit ends on "We have run into an issue." (TODO(confirm) the real trigger).
- State is per tab (`sessionStorage` `sx-preboarding-state`, `sx-preboarding-sample`).

## Open points — TODO(confirm)

- "I'll choose it later": no Figma frame; the flow skips to Create an Account, no default is saved, the
  summary shows no method box.
- Bank "Set as default for future payments": shown as in Figma; it only sets the bank account's own default
  flag, the chosen method is the default anyway ("This will be set as the default option").
- Doing Business As (DBA) is not marked Optional in Figma, so it is required (the checkbox fills it).
- "Sign in" opens the Supplier Portal (no SMART Exchange sign-in page in the prototype); Figma shows it on
  desktop only.
- Feedback card on the success page: no state after a rating in Figma ("Thank you for your feedback!").

## Figma vs ticket / prototype differences

- Welcome copy is Figma's "Enrolling in the new process is fast and easy…", not "Step 1: Confirm your business
  information…" from the brief.
- Success text: desktop "Access the SMART Hub to view payment details.", mobile "Access the portal …"; the
  prototype uses the desktop text everywhere.
- Figma's desktop sidebar has no Contact Us card and puts Powered by / Terms under the content; the prototype
  keeps the shared shell (Contact Us only, no Decline).
- Consent rows use the shared OBConsents wording ("I've read and consent to the Terms of Use."), not Figma's
  "Review and agree to the Terms of Use for SMART Suite."
- Mobile Business Details has no "This isn't my business" button in Figma; the prototype keeps it.
