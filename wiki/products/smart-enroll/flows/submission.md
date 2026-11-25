---
title: SMART Enroll — Submission and authorized signer
type: flow
status: draft
last_reviewed: 2026-11-24
product: smart-enroll
area: submission
version: "R1"
figma: https://www.figma.com/design/jLooCmHwqJcYV5p5d8BHnO/-R1--SMART-Enroll?node-id=28676-83254
source: drafted from Figma jLooCmHwqJcYV5p5d8BHnO page 28676:83254 (v1 2025, v2 2026-04, signer 29624:11989) on 2026-11-17; decisions D-1, D-2, D-13 (defaults accepted 2026-11-18); needs human review
---

# Submission

Opened by **Next Step** on the last tab (or a Submit button once progress is 100%). Index: [standard.md](../standard.md).

**Standard = v1, the 4-step Submit modal** (D-1). From v2 we take only the authorized-signer question in Step 3.
The v2 co-branded shell (different left panel, line-of-credit products, partner logo) is a **client variant**, not the standard —
record it under [variants/](../variants/README.md) with a client code when it's needed.

## Before the modal: blockers
- Required fields missing → "Important Information Missing!"
  ([28676:95729](https://www.figma.com/design/jLooCmHwqJcYV5p5d8BHnO/-R1--SMART-Enroll?node-id=28676-95729)) lists the tabs, **I understand** → first incomplete tab. Can't submit.
- Connectors incomplete → "Your connections are incomplete"
  ([28676:95586](https://www.figma.com/design/jLooCmHwqJcYV5p5d8BHnO/-R1--SMART-Enroll?node-id=28676-95586)) — warning only, can continue (D-13).

## Submit modal (4 steps)
| Step | Figma | Content |
|---|---|---|
| 1 "Hey, there is more!" | [28676:94186](https://www.figma.com/design/jLooCmHwqJcYV5p5d8BHnO/-R1--SMART-Enroll?node-id=28676-94186) | Offer of the add-ons not yet added (⊕ adds and returns to the new tabs) + Connectors summary (Accounting Software Pending Verification → Validate Connection; Bank Accounts Action Required; Add bank account). Skip if nothing to show. |
| 2 "One Final Step — Make sure everything is in order" | [28676:94333](https://www.figma.com/design/jLooCmHwqJcYV5p5d8BHnO/-R1--SMART-Enroll?node-id=28676-94333) | Read-only accordion per tab with "% complete" ([expanded 28676:132706](https://www.figma.com/design/jLooCmHwqJcYV5p5d8BHnO/-R1--SMART-Enroll?node-id=28676-132706); with add-ons [28676:138062](https://www.figma.com/design/jLooCmHwqJcYV5p5d8BHnO/-R1--SMART-Enroll?node-id=28676-138062), [28676:139259](https://www.figma.com/design/jLooCmHwqJcYV5p5d8BHnO/-R1--SMART-Enroll?node-id=28676-139259)). Ownership uses the new design. Edit links jump to the tab. |
| 3 "Accept the terms" | [28676:95204](https://www.figma.com/design/jLooCmHwqJcYV5p5d8BHnO/-R1--SMART-Enroll?node-id=28676-95204) + [v2 29621:11095](https://www.figma.com/design/jLooCmHwqJcYV5p5d8BHnO/-R1--SMART-Enroll?node-id=29621-11095) | "Are you authorized to sign?" (from v2). **Yes** → Provide additional details (Full Name, DOB, Nationality, Government ID Number, Upload Government ID, address, contact; Edit Details), attestation, DDA consent, T&Cs + Privacy (each **Review**), **Confirm**. **No** → "Send to an authorized signatory" (First Name, Last Name, Email, Note) → Request sent. |
| 4 "Your information has been received!" | [28676:94930](https://www.figma.com/design/jLooCmHwqJcYV5p5d8BHnO/-R1--SMART-Enroll?node-id=28676-94930) | Go back to onboarding / Done. Status becomes **Pending Approval**. |

TODO(confirm): DDA consent text mentions "Canadian banking regulations" — likely copied; prototype uses neutral wording.

## Authorized signer (D-2)
Figma: [29624:11989](https://www.figma.com/design/jLooCmHwqJcYV5p5d8BHnO/-R1--SMART-Enroll?node-id=29624-11989)

When the applicant answers **No**, the application **waits for the signer**: status box "Waiting for signature" (TODO(confirm) label — not drawn),
Submit disabled, the applicant can still edit. The signer **does not sign in** — they use a secure, single-use link.

1. Email "Action Required: Sign the Application" from SMART Enroll (signer name, custom note, **Review and Acknowledge**).
2. "Review & Sign Application" page — read-only summary of the application.
3. E-Sign Consent → type First and Last Name → **Confirm Acceptance**.
4. "Acknowledgement Complete" — Status Completed (Figma typo "Competed" fixed), Signed by, Confirmed at.

**Signing completes the application** (TCDM-5251 brief, 2026-11-24): once the signer confirms, the application goes to
**Pending Approval** on its own — the applicant does not submit again. (The earlier draft said the applicant's Step 3 shows
"Signed by <name> on <date>" and they submit; changed with the T11 brief — TODO(confirm) with product.) The same signer flow
serves the Merchant Services BlueSnap terms ([merchant-services.md](merchant-services.md)).
TODO(confirm): link expiry and resend; prototype: Resend from the status box, no expiry; a new request voids the previous link.

## Prototype (T11, TCDM-5251)
- Code: `src/scripts/smart-enroll/submission.js` (application + signer page), `src/pages/smart-enroll/sign.html`; components skill
  "SMART Enroll Submission". Discrepancies DS-032 … DS-036.
- Blocker lists the incomplete tabs (link + "N required fields missing"; Connectors excluded, D-13) instead of Figma's illustration.
- Step 1 is skipped when every add-on is added and Connectors is complete (the stepper still reads "Step 2 of 4"). ⊕ adds the add-on
  and opens its first tab. Connectors actions (Validate Connection, Add bank account, Connect a data source) close the dialog and open
  the Connectors tab.
- Step 2 accordions are a read-only summary per tab (description list) + **Edit** — not the embedded form drawn in 28676:132706.
- Step 3: "Provide additional details" and "Send to an authorized signatory" open **in place** inside the Submit dialog (one dialog
  at a time); Cancel returns to Step 3 with the previous answer. Review opens the document in a new tab, then the row shows its
  checkbox. **Confirm** needs details + DDA + both terms → Step 4 and status **Pending Approval**.
- **No** → Send → "Request sent" (TODO(confirm) copy) with the demo link; the left panel shows the amber **Waiting for signature**
  box (Resend, "Open the email (demo)") and Next Step on the last tab is `aria-disabled` with the reason as tooltip.
- Signer page: `sign.html?token=<token>` (`&view=email` = the demo email). The review box shows a snapshot of the application
  taken when the request was sent + the E-Sign Consent text (TODO(confirm) copy; Figma shows a Terms of Use document). A used or
  unknown token shows "This link has expired".
- State: localStorage `se_sign_v1` (shared by the applicant's tab and the signer's tab, so the applicant's tab turns Pending Approval
  as soon as the signer confirms), sessionStorage `se_submission_v1` (Step 3 answers), status via the shell (`se_status_v1`).
  Contributors (`?role=contributor`) still cannot submit (T10).
