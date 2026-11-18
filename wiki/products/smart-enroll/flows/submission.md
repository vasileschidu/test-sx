---
title: SMART Enroll — Submission and authorized signer
type: flow
status: draft
last_reviewed: 2026-11-18
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

After signing, the applicant's Step 3 shows "Signed by <name> on <date>" and they can submit. The same signer flow serves the
Merchant Services BlueSnap terms ([merchant-services.md](merchant-services.md)).
TODO(confirm): link expiry and resend; prototype: Resend from the status box, no expiry.
