---
title: Figma files — where to look
type: guide
status: draft
last_reviewed: 2026-10-19
source: SMART Figma Audit, 16 Oct 2026 (src/pages/reports/figma-audit.html)
---

# Figma files — where to look

Links are `https://www.figma.com/design/<key>`. Full audit with every difference: `src/pages/reports/figma-audit.html`.

Figma folders: **SD** SMART Disburse · **CP** Consumer Portal · **SP** Supplier Portal (= SMART Exchange) ·
**SH** SMART Hub · **SS** SMART System (library).

## Source of truth per module

Use the source-of-truth file. "Carry over" files hold newer states that the source of truth does not have yet.

| Module | Source of truth | Key | Carry over (not merged yet) |
|---|---|---|---|
| Get Paid (portal family) | [R3] SMART Exchange | `9DRzbyv7FDCDYFYN5ZGuwZ` | [REVIEW] Account Validation `Wly5obgdOOghT9KKlQLzpa`: verification states |
| Get Paid (Disburse claimant) | [LAUNCHED] Default Flow | `4WZgq8XswZFkHcI6bzOIiK` | regional/rail files below |
| Payment Preferences | [R3] SMART Exchange | `9DRzbyv7FDCDYFYN5ZGuwZ` | Account Validation (verify states); [REVIEW] Vendor Profile (validated check, last validation date); [R2] SMART Exchange `N5TbrshbXZd8yR3odWMFv0` ("cannot remove primary method" guard) |
| Login & verification | Disburse: Default Flow + OTP from [DEV] SD \| Addition of OTP `ns4uggM7ml8O53mcfRmQXq` · Portals: [R3] SMART Exchange | | |
| Bills / Payables | [R2] SH - Accounts Payable | `DyBC356t1jIcoPrKjf9Ra8` | [R1] SH - Accounts Payable `XqVQvzcU3G9MipfyKpsjpR` (calendar filter, multi-select, empty state, filter tags, "Payment re-submitted"); [REVIEW] Dual Approval Flow `8c9VrlB1Sw7Ul8IrdELYFB` (Pending Approval tab) |
| Pay Page | [R2] SH - Accounts Payable | `DyBC356t1jIcoPrKjf9Ra8` | Pay Page / Dashboard / Login still only in [R1] AP |
| Company Profile | [R3] SMART Exchange | `9DRzbyv7FDCDYFYN5ZGuwZ` | [WIP] Multiple Businesses/Organization `B3Ey6QqkxSDTixWSbQsYM7` |
| Vendor Profile | [REVIEW] Vendor Profile | `uL1CzwiGZr4w89LQ8TPwCt` | [REVIEW] SX Configurable Items `oLZRTLd2UkmROpy7BtA4W8` (shell, payment methods); [R1] AP (network invite/link flow) |
| User Management | [REVIEW] User Management | `qiy6GvUHQMhdbC7hkXCCyb` | |
| Card Manager | [REVIEW] VC \| ICCP / Line of Credit Cards | `9we1YVhB41SNAHXULwJJUZ` | [REVIEW] VC \| Reconciliation Process `iesYL2M85wJyb6OLveVgmW`; [REVIEW] Cardholder Site `AcZDWKoZKuqGY1LBLqqqlN` |

## Main files per product

| Product | File | Key | Note |
|---|---|---|---|
| SMART Hub (AP) | [R2] SH - Accounts Payable | `DyBC356t1jIcoPrKjf9Ra8` | TODO(confirm): Figma says R2, code release is R1.0 |
| SMART Hub (AR) | [R1] SH - Accounts Receivable | `XFMJMeQS3eUBB51yisl6AL` | AR pages not built in code yet |
| SMART Exchange | [R3] SMART Exchange | `9DRzbyv7FDCDYFYN5ZGuwZ` | Matches code release R3 |
| Consumer Portal | [R1] Consumer Portal (SD) | `tK3Ex3e3fDSOebc4I6onyM` | Reuses the supplier Get Paid page almost verbatim; audit says rebuild on R3 chrome |
| SMART Disburse | [LAUNCHED] Default Flow | `4WZgq8XswZFkHcI6bzOIiK` | |
| SMART Enroll | [REVIEW] Concept Enroll in Hub | `NrJlWBQph0rLI4yKzgktK2` | Also [REVIEW] Update Data Connector \| Enroll `7z25wNPHEsF4eskrKhxAB2`, and a partner co-branded Enroll file `ZnpMkKsAyNjaNM0eNFLsrT`. TODO(confirm) which is current |
| SMART Collect | — | | No dedicated file found. AR Pay Page mentions a "Standard SMART Collect" workflow |
| Design system | 🛠 SMART System | `PdvEp0MAIlof6O8MYaXCcy` | Library |

## Disburse: regional and rail flows

These exist as separate Figma files. TODO(confirm): are they **standard** capabilities (country/config-driven)
or **client variants**? This decides whether they go in Disburse `standard.md` or in `variants/`.

| Flow | Key | Tag |
|---|---|---|
| 🇬🇧 UK Expansion | `HHw1hEtPqLR8ashOaxBts5` | (matches `src/pages/sd-uk/` in code) |
| Canada Expansion | `XDcelCnq5XK0o88q9PILKc` | DEV |
| Cross-Border (SWIFT/IBAN) | `7K2fcxPx56S6q1aReCuI8V` | LAUNCHED |
| Interac e-Transfer rail | `13BB577QY5aeG4oOvhyarj` | DEV |
| Zelle rail | `8CBfYNoooz1kgmHVhZ8iKH` | DEV |
| Multi Party Payments | `i6zeMN5gTivOw5aCO29nrO` | LAUNCHED |
| Multi Party Endorsers | `Wwjci03SjRzSa3TZaDqq33` | LAUNCHED |
| Lienholder Flows | `luAimFZTK0kAV3pS91b3gJ` | — |

## Do not use as reference

[SAMPLE] Supplier Portal `rfKhGCutnTCaja7Ba13pYo`, [R2] SMART Exchange (older subset of R3, except the
carry-over above), [REVIEW] VC | ICCP / LoC (Prototype) `oQk85gEasJ2WTXlklmtSLo`, Customer Portal
`64DXe1DgK9XPEIrrGIAtFY` (method dropdown flow superseded), Design QA boards (`PATqcgmeQqEWM7AEvLwnYJ`,
`BccM25W0D6wPle09BKW5o4`).
