---
title: SMART Enroll — Connectors tab
type: flow
status: draft
last_reviewed: 2026-11-18
product: smart-enroll
area: connectors
version: "R1"
figma: https://www.figma.com/design/jLooCmHwqJcYV5p5d8BHnO/-R1--SMART-Enroll?node-id=28276-88185
source: drafted from Figma jLooCmHwqJcYV5p5d8BHnO section 28276:88185 on 2026-11-17; decision D-13 (defaults accepted 2026-11-18); needs human review
---

# Connectors tab

Always shown. Index: [standard.md](../standard.md).
Figma: [initial 28511:32098](https://www.figma.com/design/jLooCmHwqJcYV5p5d8BHnO/-R1--SMART-Enroll?node-id=28511-32098).
"Connections for Integration — Connect your source for AP/AR data and bank accounts to make and receive payments in SMART Hub."

**Not required to submit** (D-13): an application can be submitted without a data source or bank account; the Submit
modal shows "Your connections are incomplete" and payments in SMART Hub stay blocked until both are connected.
For progress %, Connectors counts as complete when one data source is selected and one bank account is Connected.

## 1. Data Source Preferences
"By selecting one of the options below, you will allow us to establish a connection to your AP/AR data that will be managed
and configured through SMART Hub." + Invite someone to help. Three cards, **one active at a time** ("Current connection" tag).
Switching → "Information will be lost — Once you change the option your current progress will be discarded. Do you wish to continue?"

### ERP/Accounting Software — [28513:33218](https://www.figma.com/design/jLooCmHwqJcYV5p5d8BHnO/-R1--SMART-Enroll?node-id=28513-33218)
Modal "Enable ERP/Accounting Software":
1. Step 1 of 3 — "Select from one of these providers": Sage Intacct, QuickBooks, Acumatica, KNNX, Guide ClaimCenter,
   Oracle NetSuite. "Your ERP is not listed? Let us know…"
2. Step 2 of 3 — Sign in: User ID, Password, Company; "See the Integration Guide".
3. Step 3 of 3 — "Pending Verification — Confirmation of connection required … needs a token confirmation…" **Validate Connection**.

Then table "Your ERP/Software accounts" (Account, ERP, status), Refresh connection, View Details / Edit, Switch to Another Connection.

### Batch Data Upload — [28555:37865](https://www.figma.com/design/jLooCmHwqJcYV5p5d8BHnO/-R1--SMART-Enroll?node-id=28555-37865)
Explainer modal: "You will be given details on how to upload a data file within the platform." Continue / Cancel → "Current connection", Learn More.

### API Connection — [28555:38922](https://www.figma.com/design/jLooCmHwqJcYV5p5d8BHnO/-R1--SMART-Enroll?node-id=28555-38922)
Explainer; "View accounts →". **API Keys and Credentials**: Client ID; View Details: Client Secret (masked), Scope,
Access Token URL, Payable Key, Party Key. **Generate New Client Secret** → confirm → "Client Secret Created — Please copy
the new client secret and save it somewhere safe. For security reasons, we cannot show it to you again." Done.
Disconnect → "Are you sure you want to disconnect?"

## 2. Bank Account — [28555:40542](https://www.figma.com/design/jLooCmHwqJcYV5p5d8BHnO/-R1--SMART-Enroll?node-id=28555-40542)
"By connecting to your bank account, SMART Hub can draw the funds necessary to originate payments and deposit payments
directly into your bank account." Empty: "No bank account added yet — Connect your bank account and get started, invite
someone from your team to help." **Connect** →

1. "Connect Your Bank Account — Who do you bank with?" — bank tiles (Bank of America, JP Morgan Chase & Co., Goldman Sachs,
   US Bank, Wells Fargo, Jack Henry); "Don't see your bank listed?"
2. Sign In to Your Account, Step 1 of 2 — Name as it appears on the bank account, Address, State, ZIP, Country,
   Account type (Savings / Checking), ACH Routing Number, Account Number, ACH Company ID (cheque illustration).
3. Step 2 of 2 — "Sign in with Your Treasury Services Banking Credentials" (bank-specific API fields; optional credentials
   upload; link "Set up a Funding Account →").
4. "Name Your Bank Account" (Skip) → "Please wait" → table.

**Set up a Funding Account**: "Our implementation team will contact you…" confirm contact details or enter others
(Email, Phone, Add a note) → **Send Request** → "Your request has been received!" Got it.

**Your Bank Accounts** table: Bank, Routing number, Account number (masked), status (Connected / Action Required) + Add.
Action Required: "Bank account name missing — Your ERP connector is missing the Bank Account Name…"
**Add bank account name** / Refresh Connection. Row actions: View Details, Edit, Disconnect.

## 3. Cross-Border FX Provider
Only with Cross-Border Payments — see [cross-border.md](cross-border.md#fx-provider).

## Prototype notes
All connections are simulated: no real ERP or bank calls; Validate Connection succeeds after a short delay.
