---
title: Card Manager
type: module
status: draft
last_reviewed: 2026-11-17
product: smart-hub
module: card-manager
version: "R1"
figma: https://www.figma.com/design/9we1YVhB41SNAHXULwJJUZ/-REVIEW--VC-%7C-ICCP---Line-of-Credit-Cards?node-id=10671-65397
jira_epic: TODO
source: drafted from Figma 9we1YVhB41SNAHXULwJJUZ node 10671:65397 on 2026-11-17, with designer answers in Figma comments (2026-11-17); needs human review
---

# Card Manager (SMART Hub, R1)

The module for a business's payment cards in SMART Hub. It has two tabs in R1:
- **SMART Cards**: virtual cards the business creates and funds.
- **Linked Credit Cards**: external cards the business adds as funding sources.

> Drafted from Figma. Nothing is built in the prototype yet: the nav item `card-manager` in `src/data/nav.json` points to `#`.
> Lines marked `TODO(confirm)` are not decided yet. Each one links to an open question in [§10](#10-open-questions).

Figma links below use the base `FIG = https://www.figma.com/design/9we1YVhB41SNAHXULwJJUZ/?node-id=`.

## 1. Purpose

- Create virtual **SMART Cards** (with cashback) for paying suppliers.
- Fund them, move money between them, and download statements.
- Lock, close or remove them.
- Keep **linked external credit cards** as origination (funding) accounts.

## 2. Users and roles

| Role | Can see | Can do |
|---|---|---|
| Business user with the `payables` capability | Card Manager | Everything in this page. TODO(confirm): is a per-role permissions matrix needed (e.g. view-only users)? Check against User Management roles. |

## 3. Entry points

| From | To |
|---|---|
| Sidebar item `card-manager` (`src/data/nav.json`). Label **"Cards"** per the designer. TODO(confirm) [F-5](#10-open-questions): the code currently says "Card Manager". | SMART Cards tab |
| Card row click | Card details |
| Pay flow (manual card) | TODO(confirm) [Q-2](#10-open-questions): "fund this card at the transaction level when you are about to pay an invoice" |

**Page shell:**
- Title **Manage Cards**, breadcrumb Home › Manage Cards › *tab name*.
- Full-width tabs with count badges: **SMART Cards (n)** · **Linked Credit Cards (n)**.
- The **Line of Credit Accounts** tab is **out of scope for R1** (designer, 2026-11-17). Hide it.

## 4. Screens

Layout family: Portal (see [layouts](../../../suite/layouts.md#1-portal-hub-exchange-consumer-portal)).
Shell: `<app-nav>` + `<app-topbar>`. Content sits in the page card.

### 4.1 SMART Cards: list

Figma:
- Empty state [`8007:126803`](https://www.figma.com/design/9we1YVhB41SNAHXULwJJUZ/?node-id=8007-126803)
- List: the designer chose the **older** layout, [`8016:156603`](https://www.figma.com/design/9we1YVhB41SNAHXULwJJUZ/?node-id=8016-156603), without the Reconciliation columns.

Header: title **SMART Cards**, description "Instantly generate and fund cards with cashback for customer payments.", primary button **+ Create New**.

| Column | Content | Sort |
|---|---|---|
| Card Number | network logo + `••••` last 4 | — |
| Card Name | name + status badge next to it (except Active?). TODO(confirm) [F-1](#10-open-questions) | yes |
| Expires | `MM/YYYY` | yes |
| Available Balance | `$2,950.00 USD` (right-aligned) | — |

TODO(confirm) [F-1](#10-open-questions): the newer layout [`10001:272320`](https://www.figma.com/design/9we1YVhB41SNAHXULwJJUZ/?node-id=10001-272320) also has **Created** and **Status** (with filter) columns.

**Statuses (SMART card):**

| Status | Badge colour | Row |
|---|---|---|
| Active | emerald | normal |
| Blocked | amber | normal |
| Expired | red | greyed |
| Closed | gray | greyed |

"Inactive" is **not** a SMART card status (designer).

**States:**
- Empty: "Create your First SMART Card" / "Instantly generate and fund cards with cashback for customer payments." / **Create**.
- Loading: table skeleton.
- Pagination: Rows per Page plus "Showing x - y of n results".

| Element | Component |
|---|---|
| Tabs with count badges | nearest table tabs (`bills-payables-table.js`) + Badge |
| Table, sort, pagination, skeleton | `TableUi`, `TableSkeleton`, Bills table patterns |
| Status badge | Badge (components skill) |
| Empty state | **NEW COMPONENT** (if none exists: icon + title + text + button) |

### 4.2 Create a Card (modal)

Figma:
- Balance section expanded [`8007:156738`](https://www.figma.com/design/9we1YVhB41SNAHXULwJJUZ/?node-id=8007-156738)
- Balance section collapsed [`8007:160992`](https://www.figma.com/design/9we1YVhB41SNAHXULwJJUZ/?node-id=8007-160992)

| Element | Type | Rule |
|---|---|---|
| Card Holder Details | read-only details card: Name on Card, Address (from the company profile) | `@details card` + description list |
| Card Name | text input with an info tooltip | required. TODO(confirm): max length, and the tooltip text (Figma shows lorem ipsum) |
| "Would you like to assign a balance to the card?" | collapsible section, **Optional** | collapsed by default. Copy when collapsed: "You can fund this card at the transaction level when you are about to pay an invoice." |
| Origination Account | select (bank accounts / cards, with an icon) | required if the section is open |
| Amount | `$` input | > 0 if the section is open (BR-3) |
| Cancel / Create | secondary / primary, full width | |

- **No vendor assignment** (designer, Q-3).
- TODO(confirm) [Q-2](#10-open-questions): Figma calls the two variants "manual" and "auto". Is that only "with / without initial balance"?

**Success, "Card created!"** [`8007:156840`](https://www.figma.com/design/9we1YVhB41SNAHXULwJJUZ/?node-id=8007-156840):
- Card visual: balance, masked number, VALID THRU, name.
- Name on Card, Card Name, Number `•••• 3204`, CVC2 `•••`, Expires, Address.
- **Reveal Details** and **Done**.
- The new card then appears in the list.

### 4.3 Card details

Figma: [`8014:104715`](https://www.figma.com/design/9we1YVhB41SNAHXULwJJUZ/?node-id=8014-104715)

**Header:**
- ← back to the list, then the card name and status badge.
- Buttons: **Add Funds** (primary), **Export** (on the history tabs) and **⋯** menu.

**⋯ menu by status:**

| Card status | Menu items | Header buttons |
|---|---|---|
| Active | Transfer Funds, Export Monthly Statements, Lock, Close, Remove | Add Funds |
| Blocked | Unlock Card, Close, Remove | TODO(confirm): is Add Funds hidden? |
| Expired | Remove only | — |
| Closed | TODO(confirm): read-only? | — |

**Sub-tabs:** Card Details · **Bill History** · Transaction History. "Card Reconciliation" is **out of R1**: reconciliation is not part of the product yet (designer).

**Card Details tab:**
- Card visual.
- Card Number / Expires / CVC, masked, with **Reveal Details**.
- Available Balance and Current Balance.
- Admin Number, Name on Card, Card Name, Created (`12 Apr 2023, 12:28`), Payment Network, Address.

| Element | Component |
|---|---|
| Card visual (mini card) | `PPComponents.createMiniCardComponent`; check it against the Figma card |
| Reveal Details | Gray button ("Reveal Card Details", `sx-enroll/complete.html`) |
| Info rows | `@details card` + description list |
| ⋯ menu | `el-dropdown` / `el-menu` as in the table row actions |

### 4.4 Add Funds (modal)

Figma: section [`8014:99273`](https://www.figma.com/design/9we1YVhB41SNAHXULwJJUZ/?node-id=8014-99273)

| Element | Rule |
|---|---|
| Transfer from | grouped select. **Card** group: name •••• last4, "Expires MM/YYYY", Balance. **Bank Account** group: name, bank ••••last4, Balance. Helper "Available balance: $X USD" |
| Enter Amount | `$` input + "Max amount" |
| Confirm checkbox | "Transfer $X from <source> to <card>". Must be ticked (BR-5) |
| Cancel / **Add to balance** | |

**Errors (exact text):**
- "Amount must be greater than 0." ([`8014:105019`](https://www.figma.com/design/9we1YVhB41SNAHXULwJJUZ/?node-id=8014-105019))
- "Available balance: $X USD (Insufficient Funds)" ([`8014:105067`](https://www.figma.com/design/9we1YVhB41SNAHXULwJJUZ/?node-id=8014-105067))
- "First, confirm this transfer by ticking the box" ([`8014:104880`](https://www.figma.com/design/9we1YVhB41SNAHXULwJJUZ/?node-id=8014-104880))

**Success:** "Funding Transaction Submitted": "You've successfully sent $X from <source> to <card>" / **Done**.

### 4.5 Transfer Funds (modal)

Figma: section [`8014:121934`](https://www.figma.com/design/9we1YVhB41SNAHXULwJJUZ/?node-id=8014-121934)

Same pattern as Add Funds:
- Select, Enter Amount with "Use max amount", the confirm checkbox, then Cancel / **Transfer**.
- Success: "Transfer Transaction Submitted".
- The same three errors.

TODO(confirm) [F-2](#10-open-questions): which way does the money move? Figma labels the select "Send to", but the confirm text says "from <other> to <this card>". The designer thinks it may be "From", which would duplicate Add Funds.

### 4.6 Export Monthly Statements (modal)

Figma: section [`8014:133821`](https://www.figma.com/design/9we1YVhB41SNAHXULwJJUZ/?node-id=8014-133821). The frames are misnamed "Transfer Funds".

- Title: **Download Monthly Statements**.
- Text: "A monthly statement is a written record prepared by a financial institution, usually once a month, listing all credit card transactions for an account, including purchases, payments, fees and finance charges."
- **Select Month**: list of months, newest first.
- **Format: PDF or CSV** (designer).
- Buttons: Cancel / **Download**.

### 4.7 Lock / Unlock

Figma:
- Dialog [`8015:143240`](https://www.figma.com/design/9we1YVhB41SNAHXULwJJUZ/?node-id=8015-143240)
- Locked card [`8016:145592`](https://www.figma.com/design/9we1YVhB41SNAHXULwJJUZ/?node-id=8016-145592)

Flow:
- Dialog "Lock your card temporarily?": "You can temporarily lock your card to restrict its usage without permanently closing it." Buttons Cancel / **Yes, lock the card**.
- After locking, the status becomes **Blocked** and the menu shows **Unlock Card**.
- TODO(confirm): does Unlock need a confirmation, and which toast or text appears after Lock / Unlock?

### 4.8 Close card

Figma: section [`8016:146107`](https://www.figma.com/design/9we1YVhB41SNAHXULwJJUZ/?node-id=8016-146107)

| Case | Dialog | Result |
|---|---|---|
| Balance = $0 | "Close your card?": "You are about to close this card. You'll be able to access past transaction history, but you can't undo this action." Cancel / **Yes, close the card** (destructive) | "Card Closed": "Your card <name> was closed." Card stays in the list as **Closed** |
| Balance > $0 | "You can't close this card right now": "You have some funds on this card. If you want to close this card you have to transfer all amount to another account". **Choose destination account to unload funds** (same grouped select as Add Funds). Checkbox "Transfer $X from <card> to selected account, and agree to close this card". Back / **Transfer and Close Card** (red) | "Card Closed": "The card balance of $X was transferred to <destination> and your <name> was closed." |

### 4.9 Remove card

Figma: section [`8016:157241`](https://www.figma.com/design/9we1YVhB41SNAHXULwJJUZ/?node-id=8016-157241)

| Case | Dialog | Result |
|---|---|---|
| Balance = $0 | **"Remove this card?"** (designer: use this title for SMART cards): "You're about to remove this card. All sensitive information will be removed, you won't be able to use this card and you can't undo this action." Cancel / **Yes, remove the card** | "Card Removed": "Your card <name> was removed." Card **leaves the list** |
| Balance > $0 | Same as Close with balance, worded for remove: "You can't remove this card right now", "…and agree to **remove** this card", **Transfer and Remove Card**. One Figma frame says "close"; that is a copy bug. | "The card balance of $X was transferred to <destination> and your <name> was removed." |
| Expired card | Only Remove is available. Same dialog as Balance = $0. | Same |

### 4.10 Bill History tab

Figma:
- Empty [`8019:119866`](https://www.figma.com/design/9we1YVhB41SNAHXULwJJUZ/?node-id=8019-119866)
- List [`8019:120161`](https://www.figma.com/design/9we1YVhB41SNAHXULwJJUZ/?node-id=8019-120161)
- Export [`8019:121111`](https://www.figma.com/design/9we1YVhB41SNAHXULwJJUZ/?node-id=8019-121111)

The bills paid with this card. It reuses the **Bills & Payables** table and its expandable row:
- Columns: Amount, Bill Reference, Payee, Payment Type, Source, Due Date, Status.
- Expanded row: Notes, Attachments, Actions (Cancel Payment), Payment method details, Activity log.
- Empty state: "No Bill History" / "You don't have any bills".
- Export: Figma shows a confirm "You're about to export N row(s) from Bill History. (in CSV format)". In code, use the shared `TableExport` menu.

### 4.11 Transaction History tab

Figma:
- Empty [`8024:124353`](https://www.figma.com/design/9we1YVhB41SNAHXULwJJUZ/?node-id=8024-124353)
- List [`8024:126638`](https://www.figma.com/design/9we1YVhB41SNAHXULwJJUZ/?node-id=8024-126638)

**Info banner:** "For dispute request you can contact: 800-890-3128 or dispute-ticket@transcard.com".

| Column | Sort |
|---|---|
| Transaction ID | — |
| Date/Time | yes |
| Merchant Name | — |
| Amount | — |
| Status (Settled, …) | — |
| Description | — |

- Expanded row, "Transaction Details": Transaction Code, Response Code, Response Description, Merchant Category Code, Transaction Type, Merchant Location, Fee. Some rows show an "Externally Added" badge.
- Empty state: "No Transaction History" / "You don't have any transactions".
- Export: same as Bill History.
- TODO(confirm): the full list of transaction statuses, and what "Externally Added" means.

### 4.12 Linked Credit Cards

Figma:
- Empty [`10001:257248`](https://www.figma.com/design/9we1YVhB41SNAHXULwJJUZ/?node-id=10001-257248)
- Add [`10001:257969`](https://www.figma.com/design/9we1YVhB41SNAHXULwJJUZ/?node-id=10001-257969)
- Details [`10001:268754`](https://www.figma.com/design/9we1YVhB41SNAHXULwJJUZ/?node-id=10001-268754)
- Remove [`10001:269476`](https://www.figma.com/design/9we1YVhB41SNAHXULwJJUZ/?node-id=10001-269476)
- List [`10001:269861`](https://www.figma.com/design/9we1YVhB41SNAHXULwJJUZ/?node-id=10001-269861)

**List:**
- Header: title **Linked Credit Cards**, "Add your external cards for quick access and better financial management.", buttons **Filter** and **+ Add New**.
- Info banner: "Linked cards act only as origination accounts and cannot be used as payment methods."
- Columns: Card Number, Card Name, Expires, Payment Network, Created, Status (all sortable).
- Statuses: Active, Inactive. TODO(confirm) [F-3](#10-open-questions): when does a linked card become Inactive?
- Empty state: same text plus **Add Card**.

**Add new card (modal).** Field rules: BR-9.

| Field | Required |
|---|---|
| Card number `0000 0000 0000 0000` | yes |
| Expiry `MM / YY` | yes |
| CVC (with "More info") | yes |
| Optional section: Name on Card (Full Name), Country, Address Line 1, Address Line 2, City, State, ZIP Code | Optional as a block. If Name on Card is changed, the address fields become required, **except Address Line 2** |

Buttons: Back / submit. TODO(confirm): the submit label, and the validation messages.

**Details:**
- Header: holder name, status badge, action **Remove from view**.
- Sub-tabs: Card Details · **Bill History** (Figma says "Bills History"; the designer chose "Bill History").

**Remove dialog:**
- "Are you sure you want to remove this card?": "By removing this card, it will be removed from the list, though your card data will remain intact. However, sensitive information will be deleted, and consequently, you won't have access to bills or transaction history associated with the card." Buttons Cancel / **Yes, remove the card**.
- After removal, the card **is no longer in the list**.

## 5. Flows

1. **Create:**
   1. Cards tab → **Create New** (or **Create** in the empty state) → modal.
   2. Enter Card Name, and optionally open the balance section (Origination Account + Amount).
   3. **Create** → "Card created!" → **Done** → list with the new card, Active.
2. **Add Funds:** details → **Add Funds** → pick the source → enter the amount → tick the confirm box → **Add to balance** → "Funding Transaction Submitted" → balances refresh.
   - Errors: amount ≤ 0, insufficient funds, box not ticked.
3. **Transfer Funds:** same as Add Funds. Direction TODO(confirm) [F-2](#10-open-questions).
4. **Export statement:** ⋯ → Export Monthly Statements → month + format → **Download**.
5. **Lock:** ⋯ → Lock → confirm → status Blocked. **Unlock:** ⋯ → Unlock Card → Active.
6. **Close:**
   - Balance = 0: ⋯ → Close → confirm → Closed. The card stays in the list.
   - Balance > 0: ⋯ → Close → pick a destination → tick the box → **Transfer and Close Card** → Closed. Balance moved.
7. **Remove:** same two paths as Close. Result: the card is gone from the list. If it was the last one, the empty state shows.
8. **Linked card:**
   1. Linked tab → **Add New** / **Add Card** → form → submit → list.
   2. Details → **Remove from view** → confirm → gone from the list.

## 6. Business rules and validations

- **BR-1:** The card holder (Name on Card, Address) comes from the business profile and can't be edited in Create.
- **BR-2:** A card is created without a vendor. There is no vendor assignment.
- **BR-3:** Amount (Create, Add Funds, Transfer) must be > 0: "Amount must be greater than 0."
- **BR-4:** Amount can't exceed the source's available balance: "Available balance: $X USD (Insufficient Funds)".
- **BR-5:** Money moves only after the user ticks the confirm checkbox: "First, confirm this transfer by ticking the box".
- **BR-6:** A card with a balance > 0 can't be closed or removed without first moving the whole balance to another account, chosen by the user.
- **BR-7:** Close keeps the card (status Closed, history still available) and can't be undone. Remove deletes sensitive data, takes the card off the list, and can't be undone.
- **BR-8:** Statuses and actions:
  - Active: all actions.
  - Blocked: Unlock, Close, Remove.
  - Expired: Remove only.
  - Closed: none. TODO(confirm)
- **BR-9:** Linked card:
  - Card number, expiry and CVC are required.
  - If Name on Card is changed, the address becomes required, except Address Line 2.
  - TODO(confirm): card number format check (e.g. Luhn) and expiry in the future.
- **BR-10:** Linked cards are origination accounts only and can't be used as payment methods.
- **BR-11:** Card numbers and CVC are masked until **Reveal Details**.

## 7. Data

Proposed `src/data/card-manager.json`. Fake data only:

```json
{
  "smartCards": [
    { "id": "sc_3204", "last4": "3204", "network": "mastercard", "name": "Corporate Card LTD",
      "holder": { "name": "ABC Corporation", "address": "1 Chapel Hill Rd\nHeswall, Short Hills\nNJ 07078, US" },
      "status": "active", "availableBalance": 2950.00, "currentBalance": 23050.00, "currency": "USD",
      "expires": "2026-05", "createdAt": "2023-04-12T12:28:00", "adminNumber": "12874972394853",
      "bills": [], "transactions": [] }
  ],
  "linkedCards": [
    { "id": "lc_4708", "last4": "4708", "network": "mastercard", "name": "Johnny Anderson",
      "status": "active", "expires": "2026-01", "createdAt": "2023-12-01" }
  ],
  "fundingSources": [
    { "id": "ba_1010", "type": "bank", "name": "Secondary Bank Account", "bank": "Bank AG", "last4": "1010", "balance": 111921.02 }
  ],
  "statementMonths": ["2024-01", "2023-12", "2023-11"]
}
```

- `status` is one of `active` | `blocked` | `expired` | `closed` for SMART cards, and `active` | `inactive` for linked cards.
- Fund moves and status changes are simulated in the browser (the prototype has no backend).

## 8. Integrations

- **Bills & Payables:** a SMART card can pay a bill. The bills it paid appear in Bill History.
  - TODO(confirm) [Q-2](#10-open-questions): "fund at the transaction level" in the Pay flow.
- **Payment Preferences / bank accounts:** the funding sources (bank accounts, linked cards) are the same accounts.
- Cross-product: none for R1. Line of Credit and Purchase Card are out of R1.

## 9. Out of scope (R1)

- **Line of Credit Accounts** tab and anything LoC (designer, 2026-11-17).
- **Card Reconciliation** tab and the Reconciliation columns. Reconciliation is not part of the product yet.
- **Create Purchase Card / Spend Controls** (limits, country, merchant categories, presets, multiple vendors). TODO(confirm) [F-4](#10-open-questions).
- Vendor assignment on cards.
- Phone and tablet designs: Figma is desktop-only. Build responsive using the shared patterns.

## 10. Open questions

All asked in Figma comments to the designer on 2026-11-17.

| # | Question |
|---|---|
| Q-2 | "Manual" vs "auto" card: what is it for the user? Chosen on Create, or set by plan/config? Only reconciliation-related? |
| F-1 | Card list = older layout without Reconciliation: no Created column and no Status column (status as a badge next to the name)? |
| F-2 | Transfer Funds direction. If it's "From" another account, how does it differ from Add Funds? |
| F-3 | When does a linked card become Inactive? |
| F-4 | Purchase Card + Spend Controls: R1 or later? |
| F-5 | Sidebar label "Cards", page title "Manage Cards"? |
| — | Smaller items, marked inline: Card Name max length + tooltip, Closed card actions, Unlock confirmation, transaction statuses, "Externally Added", linked-card submit label and validation messages, permissions per role. |

**Answered on 2026-11-17** (kept for the record):
- Q-1: old list, no Reconciliation.
- Q-3: no vendor.
- Q-4: Blocked is right, no Inactive for SMART cards.
- Q-6: PDF + CSV, no Amount field.
- Q-7: "Remove this card?" for SMART cards.
- Q-8: "Bill History".
- Q-9: required fields (see BR-9).
- Q-10: a removed card leaves the list.
- Q-11/12: LoC and Reconciliation are out of R1.
- Q-13: label "Cards".

## 11. File ownership

Files this module **owns**. Stories in the Card Manager epic only touch these:

| File | What |
|---|---|
| `src/pages/dashboard/card-manager*.html` | SMART Cards list, card details, linked cards (one page with tabs, or one page per tab) |
| `src/scripts/card-manager*.js` | list, details, modals, linked cards |
| `src/data/card-manager*.json` | fake data |

**Shared files.** Change these only in the "Module scaffold" story, or in a dedicated story:

| File | Why |
|---|---|
| `src/data/nav.json` | point `card-manager` to the page, set the label |
| `src/scripts/app-plans.js` | only if the capability changes |
| `.claude/skills/components/SKILL.md` | new components: Empty state, card visual if it differs, grouped account select |
| `src/scripts/bills-payables-table.js` / `table-export.js` | only if Bill History needs a hook to reuse them. Otherwise, call them read-only. |
