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
| **Claimant** | A person receiving a SMART Disburse payment (for example an insurance claimant). Suppliers go through the same flow. Both are the "payee" in Hub. |
| **Co-payee / party** | One of several people sharing a SMART Disburse Multi-Party payment. |
| **Primary party** | The co-payee who can dispute the total, and who receives the whole payment as a fallback if it expires or is revoked. |
| **Allocation** | How a Multi-Party payment is split between the parties. Every change is logged, and everyone must accept the current one. |
| **One Final Step** | The summary at the end of each SMART Disburse payment method: details, consents, then sign and submit. |
| **Revoked (Disburse)** | The payment is cancelled because the payee ran out of attempts (verification code, identity questions or bank verification). |
| **Declined (Disburse)** | The payee chose not to accept the payment, giving a reason. |
| **Origination account** | The payer bank account a Hub payment is sent from. |
| **Supplier Portal** | Name used in the code and nav for SMART Exchange. TODO(confirm). |
| **Due Date** | When a bill is due. SMART Hub AP only. |
| **Date Initiated** | When a payment was started. On by default while a payment is in flight (In Progress / Processing, Scheduled) and on Exceptions; off by default on Pending and Paid tabs (switch on in Manage columns). |
| **Payment Date** | When a Hub AP payment completed. Paid tab. SMART Exchange and Consumer Portal call the same thing **Date Processed**. |
| **Date Processed** | When a payment completed, in SMART Exchange and Consumer Portal. Paid tab. See Payment Date. |
| **Filter category** | One group of options in the table filter (e.g. Status). Always named exactly like the column it filters. See [table filter](../design-system/table-filter.md). |
| **Client code** | Anonymous identifier for a client (`c001`). Used instead of real names. |
| **Token** | TODO: what a token is exactly (link? one-time code? how long it is valid?) |
| **Supplier** | A business receiving payments, via Exchange. |
| **STP / Straight Through Processing** | A SMART Exchange card option: a supplier with its own card processor opts in, and card payments on that rail are processed automatically to its merchant account instead of being keyed in by hand. Called **Automatic Card Processing** in the UI (the opt-in banner says "Automated"). See [STP](../products/smart-exchange/stp.md). |
| **Authorized Signer** | A person allowed to sign the card network agreement (in the code, the Visa AR Manager Participation Agreement) for the supplier, needed to turn STP on. TODO(confirm): who qualifies and whether it is checked; the prototype doesn't ask. |
| **Penny test** | Micro-deposit verification: a small amount is deposited in the supplier's bank account, and the supplier confirms the exact amount (**Verify now**). Last step of the STP opt-in. |
| **Merchant account / processor** | The supplier's own card acceptance setup: the **processor** runs card payments (for example through the supplier's terminal) and settles them to the **merchant account**. STP sends card payments there automatically. Identified by a Merchant ID (MID) and Terminal ID (TID). |
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
