---
title: SMART Enroll — Business Information tab
type: flow
status: draft
last_reviewed: 2026-11-18
product: smart-enroll
area: business-information
version: "R1"
figma: https://www.figma.com/design/jLooCmHwqJcYV5p5d8BHnO/-R1--SMART-Enroll?node-id=28495-22778
source: drafted from Figma jLooCmHwqJcYV5p5d8BHnO section 28495:22778 and comments (TIN decision 2026-10-20) on 2026-11-17; needs human review
---

# Business Information tab

First tab, always shown. Index: [standard.md](../standard.md).
Figma: [initial 28471:37074](https://www.figma.com/design/jLooCmHwqJcYV5p5d8BHnO/-R1--SMART-Enroll?node-id=28471-37074) ·
[DBA = YES 28570:55462](https://www.figma.com/design/jLooCmHwqJcYV5p5d8BHnO/-R1--SMART-Enroll?node-id=28570-55462) ·
[dropdowns 28476:47758](https://www.figma.com/design/jLooCmHwqJcYV5p5d8BHnO/-R1--SMART-Enroll?node-id=28476-47758) ·
[errors 28632:81938](https://www.figma.com/design/jLooCmHwqJcYV5p5d8BHnO/-R1--SMART-Enroll?node-id=28632-81938)

"Please provide your information below." Dismissible banner "Not your business? **Change**" (→ Speedy Sign up Step 2).
Fields pre-filled from [Speedy Sign up](speedy-sign-up.md) are editable here.

## Fields

| Field | Required | Notes |
|---|---|---|
| Business Legal Name | yes | |
| Reference ID | no | info: "Please enter any internal identifier in this field. This number is used for your internal tracking and reference purposes." |
| Business Icon | no | upload; "Icon must be square shaped and at least 16x16 pixels." (Figma typo "ne" fixed) |
| Business Logo | no | upload; "Logo must be 512 pixels in height…" |
| Business Structure | yes | select: Sole Proprietorship, General Partnership, Corporations (C-Corp and S-Corp), Limited Liability Company (LLC), … |
| Stock Symbol | no | |
| Country | — | disabled, United States |
| Legal Address | yes | |
| Address Line 2 | no | |
| City | yes | |
| ZIP / Postal Code | yes | |
| State / Province | yes | select |
| Main Business Phone Number | yes | |
| Main Business Email Address | yes | |
| Business Website URL | yes | `http://` prefix |
| Your Customer Service Contact — Email, Phone Number | yes | grey box |
| Organization Identification Type | yes | select: Tax Identification Number, Bank Party Identification, Central Bank Identification Number, Legal entity identification, Business identification code, GS1GLN Identifier, Employer Identification Number, Data Universal Numbering System, Country Identification Code, Certificate Of Incorporation Number, Clearing Identification Number, Customer Number, Business Number, … |
| ID number | yes | |
| Do you operate under a fictitious name / Doing Business As (DBA)? | yes | YES / NO |

**TIN** is only an option of Organization Identification Type — no separate TIN field (decided in Figma comments 2026-10-20).

### DBA = YES
"Please input your Fictitious / Doing Business As (DBA) name:" DBA Name (required) + "Fictitious / DBA business name
statement" upload (PDF, Excel .xls/.xlsx, CSV, up to 8 MB). Delete file → confirm "Are you sure you want to do this?" Delete / Cancel.

### Applicant Information (read-only)
Applicant Name, Applicant Business Role, Applicant Email, Applicant Phone Number — from Speedy Sign up Step 3.

## Rules
- Errors: "<Field> is required." under each empty required field, on Next Step / Submit.
- Uploads take **one file**; "Upload another" replaces it (multi-file is R2).
