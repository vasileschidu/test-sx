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

**States and dialogs from SE (In Progress) Figma, TCDM-5246** (flow stays R1):
- ERP step 2 **Connect** opens "Please wait — This may take a few moments." (SE 120:45846), then step 3 (Pending Verification).
- **Demo trigger for a failed connection: enter the password `fail`** (any case) in the ERP sign-in. After "Please wait" the
  "Failed Connection" dialog opens (SE 120:45848): "Call our support team at [TranscardNumber] for further assistance."
  Primary **Try again** returns to the sign-in step with the entered values; Cancel / X close the wizard.
  TODO(confirm): the support number (SE shows the placeholder) and the button label (SE shows "Button text").
- ERP row menu: Refresh connection, View Details, **Disconnect** → red confirm "Disconnect ERP — Are you sure you want to
  disconnect the ERP?" (SE 2099:425572) → back to the empty ERP state (the ERP card stays the selected source).
- Status badges follow SE Connector Status (4515:353665): h20, radius 4, 1px border; Connected green-100/200/800;
  Pending Verification uses the "In progress" blue family; Action Required yellow.
- Field errors: red outline + red (!) icon + "<Field> is required" (SE 5360:343203). Info-box dismiss X is blue.
- The Connectors tab shows the error icon (shell tab status) while a bank account is Action Required.

Prototype: `src/scripts/smart-enroll/connectors.js` (TCDM-5246, T6), demo `?tab=connectors&connectors=demo|api|reset`.
The FX Provider section (T9) goes into the empty `[data-se-fx-slot]` under Bank Account (`SmartEnrollConnectors.fxSlot()` /
event `smart-enroll:connectors-rendered`); the Submit warning (T11) reads `SmartEnrollConnectors.isComplete()` /
`incompleteMessage()` — API in the components skill.
