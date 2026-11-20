---
title: SMART Enroll — current standard
type: standard
status: draft
last_reviewed: 2026-11-18
product: smart-enroll
version: "R1"
figma: https://www.figma.com/design/jLooCmHwqJcYV5p5d8BHnO/-R1--SMART-Enroll
source: drafted from the R1 Figma file jLooCmHwqJcYV5p5d8BHnO (inventory .claude/handoff/2026-11-17-smart-enroll.md) with decisions D-1…D-14 accepted 2026-11-18; needs human review
---

# SMART Enroll — current standard (R1)

SMART Enroll is the **enrollment portal for the SMART Suite**: a business signs up, fills an application, connects its
data and bank, and submits it to compliance. When it is approved, the business gets SMART Hub.
Client differences are **not** here; see [variants/](variants/README.md).

Status: designed in Figma, **not built yet**. Code will live in `src/pages/smart-enroll/` (its own shell; not
`src/pages/sx-enroll/`, which is SMART Exchange supplier enrollment).

## Areas (one page each)

| Area | What it covers | Page |
|---|---|---|
| Sign in | email + code, Microsoft, Choose a Business, Select Platform | [flows/sign-in.md](flows/sign-in.md) |
| Speedy Sign up | 3-step account creation for a new business | [flows/speedy-sign-up.md](flows/speedy-sign-up.md) |
| Application shell | top bar, left panel, products, tabs, progress, statuses, invite | [flows/application-shell.md](flows/application-shell.md) |
| Business Information | company details, Org ID, DBA, applicant | [flows/business-information.md](flows/business-information.md) |
| Ownership | owners breakdown to 100%, details for 20%+ | [flows/ownership.md](flows/ownership.md) |
| Connectors | AP/AR data source (ERP / Batch / API), bank accounts | [flows/connectors.md](flows/connectors.md) |
| Configuration | SMART Exchange payment preferences | [flows/configuration.md](flows/configuration.md) |
| Merchant Services (add-on) | processor, Financial, Business Plan | [flows/merchant-services.md](flows/merchant-services.md) |
| Cross-Border Payments (add-on) | Transactional, FX provider | [flows/cross-border.md](flows/cross-border.md) |
| Submission | blockers, 4-step Submit modal, authorized signer | [flows/submission.md](flows/submission.md) |

## Products
- **AP/AR Payments** — base, always on.
- **Merchant Services**, **Cross-Border Payments** — add-ons, added or removed from the left panel.
- **Supply Chain Financing** — listed as "Coming soon", disabled.

## Decisions (R1)
Proposed in the Batch 1 audit, accepted as defaults on 2026-11-18. Each is a candidate to confirm with the designer.

| # | Decision |
|---|---|
| D-1 | Submission standard = v1 (4-step modal). From v2 only the "Are you authorized to sign?" step is taken; the co-branded v2 shell is a client variant. |
| D-2 | If the applicant isn't an authorized signer, the application waits for the signer. The signer uses a secure link, no sign-in. |
| D-3 | BlueSnap replaces Prysym USA as the preferred Merchant Services processor; "use your own processor" stays. |
| D-4 | The "line of credit with a lender" copy in the Merchant attestation was pasted by mistake; neutral copy is used. |
| D-5 | The new Ownership design (breakdown to 100%) applies everywhere; the old YES/NO design is outdated. |
| D-6 | Ownership total must be exactly 100%, validated as the user types; extra details only for 20%+; no nested owners. |
| D-7 | Sign in = email + 6-digit code for everyone; the Microsoft picker only for Microsoft-linked accounts. |
| D-8 | Select Platform only when the business is Approved; Choose a Business only with 2+ businesses; Set Up a New Business → Speedy Sign up. |
| D-9 | Speedy Sign up has 3 steps; "No, this isn't my business" → Step 3 + manual review flag. |
| D-10 | Supply Chain Financing shown disabled, "Coming soon". |
| D-11 | Add-ons can be removed after an "Information will be discarded" confirmation. |
| D-12 | Progress % = required fields filled ÷ all required; status set by compliance (simulated); editable only before submission and in Pending enrollment data. |
| D-13 | Connectors are not required to submit — warning only; payments stay blocked until connected. |
| D-14 | Invite people reuses the User Management Invite modal; invitee = Contributor on this application (no submit / sign). |

Also settled by Figma comments: TIN only inside Organization Identification Type; "Date of going live" removed; ownership
total validated in real time; uploads take one file (multi-file in R2) except the Business or Service License.

## Statuses and lifecycle
Not submitted → Pending Approval → Approved / Declined / Pending enrollment data (→ resubmit). Approved ↔ Suspended.
Details and copy: [application-shell.md](flows/application-shell.md#statuses-d-12).

## Known limitations (R1)
- Figma is desktop only (1728). Tablet (768) and mobile (375) are derived by us; see the shell page.
- Multi-file uploads (except Business License) are R2.
- Support phone and email differ between frames — one placeholder is used until confirmed.
- Typos in Figma are fixed in the build ("ne square", "Fictitous", "transcations", "Do yo accept", "Competed",
  "Number of Employeesis required", "Invite someone tohHelp").
