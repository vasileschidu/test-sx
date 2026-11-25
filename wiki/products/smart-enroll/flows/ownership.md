---
title: SMART Enroll — Ownership tab
type: flow
status: draft
last_reviewed: 2026-11-18
product: smart-enroll
area: ownership
version: "R1"
figma: https://www.figma.com/design/jLooCmHwqJcYV5p5d8BHnO/-R1--SMART-Enroll?node-id=29777-35602
source: drafted from Figma jLooCmHwqJcYV5p5d8BHnO section 29777:35602 (2026-04 design) and comments on 2026-11-17; decisions D-5, D-6 (defaults accepted 2026-11-18); needs human review
---

# Ownership tab

Always shown. Index: [standard.md](../standard.md).
Figma (current design, D-5): [section 29777:35602](https://www.figma.com/design/jLooCmHwqJcYV5p5d8BHnO/-R1--SMART-Enroll?node-id=29777-35602) ·
[initial 29761:29724](https://www.figma.com/design/jLooCmHwqJcYV5p5d8BHnO/-R1--SMART-Enroll?node-id=29761-29724) ·
[errors 30198:47456](https://www.figma.com/design/jLooCmHwqJcYV5p5d8BHnO/-R1--SMART-Enroll?node-id=30198-47456) ·
[total 100% 30219:75173](https://www.figma.com/design/jLooCmHwqJcYV5p5d8BHnO/-R1--SMART-Enroll?node-id=30219-75173)

The older "owners with a share 20% or higher? YES/NO" design (e.g. [28632:82094](https://www.figma.com/design/jLooCmHwqJcYV5p5d8BHnO/-R1--SMART-Enroll?node-id=28632-82094))
is **outdated** everywhere — add-on pages, Errors page and Submission review use this design too (D-5).

## Beneficial Ownership
"Please provide information on all owners of the business." Empty state: "Add owners to provide the business ownership
breakdown — The total must be of 100%." **+ Add Owner**. Counter "Total breakdown N / 100%".

### Owner form (Owner N)
| Field | Rule |
|---|---|
| Entity Type | Individual / Legal Entity |
| First Name, Last Name (Individual) · Name (Legal Entity) | required |
| Is the ownership share equal or higher than 20%? | No / Yes, required |
| Ownership Share or Voting Rights | required, 0.00–100.00 |

**Save** collapses the owner to a row "Name — N% ownership" (expand to edit, **Save changes**).
Remove → confirm ([30219:79063](https://www.figma.com/design/jLooCmHwqJcYV5p5d8BHnO/-R1--SMART-Enroll?node-id=30219-79063)) **Confirm**.

### Additional Details — only when the share is 20% or more (D-6)
- **Individual** ([30219:54511](https://www.figma.com/design/jLooCmHwqJcYV5p5d8BHnO/-R1--SMART-Enroll?node-id=30219-54511)):
  Date of Birth (MM-DD-YYYY), Nationality, Address Line 1, City, State / Province, Zip / Postal Code, Phone Number, Email,
  ID (Passport, Driver's License, SSN, Other government issued ID), ID Number, ID Issuing Country,
  Government Issued Identification upload ("Legible and not expired, one of: Passport, Drive License, ID card").
- **Legal Entity** ([30219:68324](https://www.figma.com/design/jLooCmHwqJcYV5p5d8BHnO/-R1--SMART-Enroll?node-id=30219-68324)):
  Address, Building, Apt., City, State, ZIP, Business Contact Number, Business Email, Country of Incorporation.
  No nested owners of the legal entity in R1 (D-6).

## Legal Entity documents
"Please provide the documents related to your business organization." Attach the Organization Document
("Articles of Incorporation, Articles of Association or Articles of Organization"), PNG, JPG, GIF up to 10 MB. Required.

## Rules (D-6)
- The total must be **exactly 100%** for the tab to be complete. It is validated **as the user types**; a value that
  would take the total above 100 shows an error and the owner can't be saved.
- Errors: "First Name is required.", "Last Name is required.", "Please select an option.",
  "Ownership Share or Voting Rights is required.", "Enter an ownership share of 20% or more." (answered Yes, share < 20),
  "Enter an ownership share below 20%" (answered No, share ≥ 20), "<Field> is required." for each additional detail.
- TODO(confirm): error text for total > 100 (not drawn); prototype: "The total ownership can't exceed 100%."
