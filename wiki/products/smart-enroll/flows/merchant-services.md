---
title: SMART Enroll — Merchant Services add-on
type: flow
status: draft
last_reviewed: 2026-11-18
product: smart-enroll
area: merchant-services
version: "R1"
figma: https://www.figma.com/design/jLooCmHwqJcYV5p5d8BHnO/-R1--SMART-Enroll?node-id=28003-46286
source: drafted from Figma jLooCmHwqJcYV5p5d8BHnO page 28003:46286 (incl. BlueSnap section 30397:63675) and comments on 2026-11-17; decisions D-2, D-3, D-4 (defaults accepted 2026-11-18); needs human review
---

# Merchant Services add-on

Added from the left panel (⊕). Adds the **Financial** and **Business Plan** tabs. Removing it discards both.
Index: [standard.md](../standard.md).

## Payment processor (D-3)
**BlueSnap is the preferred processor** in R1 and replaces Prysym USA
([old 28582:56003](https://www.figma.com/design/jLooCmHwqJcYV5p5d8BHnO/-R1--SMART-Enroll?node-id=28582-56003) is outdated for the default).
"Use your own payments processor" stays.

- Default: "Current option: BlueSnap" in Financial. BlueSnap section:
  [30397:63675](https://www.figma.com/design/jLooCmHwqJcYV5p5d8BHnO/-R1--SMART-Enroll?node-id=30397-63675)
  (Business Information [30397:61468](https://www.figma.com/design/jLooCmHwqJcYV5p5d8BHnO/-R1--SMART-Enroll?node-id=30397-61468),
  Financial [30397:62328](https://www.figma.com/design/jLooCmHwqJcYV5p5d8BHnO/-R1--SMART-Enroll?node-id=30397-62328)).
- **Change processor** → "Select a payments processor — Onboard with our preferred provider, BlueSnap (Recommended)… Or use
  your own payments processor": search of EMV processors → processor-specific fields (MCC Code, Maximum Monthly Amount,
  Account Number, Processor Description, Settlement Platform, Merchant Number, Sort Code, Duplicate Checking + seconds +
  override, Default Industry Classification retail / ecommerce / moto), Merchant Service Details (contact), Payment Details
  (use existing bank account vs set up a new settlement account; Capture more than was Pre-Authorized), VAR Sheet.
- Switching processor → "Information will be discarded — Changing payment processor will discard all information from Merchant Service tab!"

## Financial tab
Figma: [section 28582:53698](https://www.figma.com/design/jLooCmHwqJcYV5p5d8BHnO/-R1--SMART-Enroll?node-id=28582-53698) ·
errors [28665:78897](https://www.figma.com/design/jLooCmHwqJcYV5p5d8BHnO/-R1--SMART-Enroll?node-id=28665-78897),
[28665:80967](https://www.figma.com/design/jLooCmHwqJcYV5p5d8BHnO/-R1--SMART-Enroll?node-id=28665-80967),
[28665:82835](https://www.figma.com/design/jLooCmHwqJcYV5p5d8BHnO/-R1--SMART-Enroll?node-id=28665-82835)

1. **Business and Financial Information** — Parent Company, Date of Incorporation, product line description, Industry,
   Business Sales Volume / Turnover (USD), Operating Status, Number of Employees, revenue / funding sources, MCC Code,
   Currency, **Merchant Tax ID #** (new, from Figma comment), current processor.
   "Date of going live" is **removed** (comment 2025-08-28; still drawn in an error frame — ignore).
2. **Processing Information** — regulated activity Y/N → Business or Service License (**multi-file** upload, the only one in R1);
   geographic % split (USA, EU, Canada, Mexico, Japan, South Korea, Other); card payments in the last 24 months Y/N →
   Visa / Mastercard / AMEX / Discover per period; data breach Y/N → description; violation notice Y/N;
   current processors Y/N → statements upload; chargeback / refund history, average / highest ticket, delivery period;
   PCI compliant → Level 1–4 / Not Compliant / I do not know / Self certify + expected date.
   BlueSnap adds three Y/N questions: "Has your company been placed in any Fraud/Risk Monitoring Program?",
   "Previously terminated by a processor/institution due to fraud, laundering, or high chargebacks?",
   "Subject of an FTC/consumer-protection complaint or Assurance of Voluntary Compliance?".
3. **Merchant Transactional Data & Reserve Calculation** — 12-month volume; 3-year table (Volume, Count, Average, Highest,
   Refund %, Chargeback %); orders in advance Y/N → delayed-payment % (1 week … 12 months); purchase process;
   subscription Y/N → How often? (Monthly … Yearly); T&Cs public Y/N → upload.
4. **Proofing Documents** — Shareholder Register, Bank Account Statement, Financial Statements, Proof of Federal Tax ID / VAT,
   Certificate of Good Standing, Evidence for the Source of Funds, ID for the account signatory, Interim Financials,
   voided check / ABA-DDA letter. TODO(confirm) which are optional (Figma marks some).
5. **Authorized Signatory Attestation** — "Are you authorized to sign?"
   - **Yes** ([30243:53172](https://www.figma.com/design/jLooCmHwqJcYV5p5d8BHnO/-R1--SMART-Enroll?node-id=30243-53172)):
     "Accept the terms" — BlueSnap Terms & Conditions and Privacy rows, each **Review** (opens the document), **Accept Terms**.
     Acceptance is stored with **timestamp and signer name** (Figma comment).
   - **No** ([30251:71007](https://www.figma.com/design/jLooCmHwqJcYV5p5d8BHnO/-R1--SMART-Enroll?node-id=30251-71007)):
     "Send to an authorized signatory" — First Name, Last Name, Email, Note (max 100) → Sending →
     "Request sent to an authorized signer — We'll let you know when they accept the terms. You can continue with your
     application in the meantime." (D-4: replaces the drawn line-of-credit copy.) The signer follows the
     [signer flow](submission.md#authorized-signer).

All uploads: one file each, "Upload another" replaces it (multi-file is R2), except the Business or Service License.

## Business Plan tab
Figma: [28141:35114](https://www.figma.com/design/jLooCmHwqJcYV5p5d8BHnO/-R1--SMART-Enroll?node-id=28141-35114) ·
[uploaded 28579:53239](https://www.figma.com/design/jLooCmHwqJcYV5p5d8BHnO/-R1--SMART-Enroll?node-id=28579-53239)

"Please attach your business plan…" upload (.PDF or .DOCX). "Need help with your business plan? Answer some simple
questions to create a lean business plan — **Get Started Now**". TODO(confirm): what Get Started Now opens (not drawn);
prototype: a "Coming soon" toast.
