---
title: Glossary
type: suite
status: draft
last_reviewed: 2026-10-19
---

# Glossary

Shared vocabulary. If a term is used differently in one product, say so in that entry.

| Term | Meaning |
|---|---|
| **AP (Accounts Payable)** | Money the organization owes and pays out (to suppliers, consumers). Handled in SMART Hub. |
| **AR (Accounts Receivable)** | Money owed to the organization and collected. Handled in SMART Hub. |
| **Standard** | The latest version of a product on `main`. The default for all work. |
| **Variant** | One client's customizations to one product, recorded as deltas vs a standard version. |
| **Delta** | A single difference between a variant and the standard. |
| **Based on** | The standard version a variant diverged from. |
| **Upstream / upstreamed** | Taking a client delta into standard. Decided by humans. |
| **Plan** | Portal-shell setting that decides which modules a business sees (`src/scripts/app-plans.js`). |
| **Balance Account** | Holding account that SMART Disburse funds move into until the recipient claims the token. |
| **Origination account** | The payer bank account a Hub payment is sent from. |
| **Supplier Portal** | Name used in the code and nav for SMART Exchange. TODO(confirm). |
| **Filter category** | One group of options in the table filter (e.g. Status). Always named exactly like the column it filters. See [table filter](../design-system/table-filter.md). |
| **Client code** | Anonymous identifier for a client (`c001`). Used instead of real names. |
| **Token** | TODO: what a token is exactly (link? one-time code? how long it is valid?) |
| **Supplier** | A business receiving payments, via Exchange. |
| **Consumer** | An individual receiving payments, via Consumer Portal. |
| **Enrollment** | TODO: what enrolling means (who, what is verified, what access results) |

## Terminology not yet agreed

The Figma audit (16 Oct 2026) found the same thing named differently across files. Until a human decides,
**do not pick one silently**. Use what the source-of-truth file uses and flag it in your PR.

| Concept | Variants in use | Decision |
|---|---|---|
| Option to get paid by the payer’s card | Accept Payer’s Card · Accept Card Payment · Quick Pay · Payer’s Card | TODO |
| The organization entity | Company · Business · Organisation | TODO (fields say Business, nav says Company) |
| Cards from payers section | Payers’ Cards · My Customers’ Cards · Cards on File from Customers | TODO |
| Removing an item | Delete · Remove | TODO |
| Bank account re-entry field | Confirm Account Number · Verify Account Number | Audit suggests **Confirm Account Number** |
| Bank account holder field | Name on Account · Account Holder Name | TODO |
| Payment method list | Payment Methods · Payment Accounts (AR) | Audit suggests **Payment Methods** |
| Counterparty on the receiving side | payer · customer · buyer | TODO |
| Password minimum length | 8 · 12 · 15 characters | TODO (a rule, not just wording) |
| Ready-to-pay badge | Unprocessed (code, R2) · "Unproccesed" (typo in older files) | **Unprocessed** |
