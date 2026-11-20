---
title: Card Manager
type: module
status: draft
last_reviewed: 2026-11-17
product: smart-hub
module: card-manager
version: "R1"
figma: https://www.figma.com/design/9we1YVhB41SNAHXULwJJUZ/-REVIEW--VC-%7C-ICCP---Line-of-Credit-Cards?node-id=10671-65397
jira_epic: TCDM-5217
source: drafted from Figma 9we1YVhB41SNAHXULwJJUZ node 10671:65397 on 2026-11-17, with designer answers in Figma comments (2026-11-17); needs human review
---

# Card Manager (SMART Hub, R1)

**Jira:** Epic [TCDM-5217](https://agilepartners.atlassian.net/browse/TCDM-5217), stories in the [backlog](card-manager-backlog.md).

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
| Sidebar item `card-manager` (`src/data/nav.json`), label **"Cards Manager"** (decided 2026-11-17; the code still says "Card Manager", fixed in the scaffold story) | SMART Cards tab |
| Card row click | Card details |
| Pay flow | A card without a balance can be funded when paying an invoice (copy in Create). TODO(confirm): Pay-flow screens are not in this Figma section |

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
- List: [`10001:272320`](https://www.figma.com/design/9we1YVhB41SNAHXULwJJUZ/?node-id=10001-272320). The older layout [`8016:156603`](https://www.figma.com/design/9we1YVhB41SNAHXULwJJUZ/?node-id=8016-156603) only differs by its Reconciliation columns, which are out of R1. The designer left the final choice to us (decided 2026-11-17).

Header: title **SMART Cards**, description "Instantly generate and fund virtual cards with cashback for customer payments.". On the right: a **Search** field (filters live by card number, name, network and status) and the primary button **+ Create New**, both 40 px tall. There is no general Filter button; the only filter is the funnel on the Status column.

| Column | Content | Sort |
|---|---|---|
| Card Number | `•••• 7780`, medium weight, no logo | yes |
| Card Name | name, medium weight | yes |
| Expires | `MM/YYYY` | yes |
| Payment Network | brand flag (24×16, 4 px radius, same as the card page) + "Mastercard" | yes |
| Created | `MM/YYYY` | yes |
| Status | badge, left-aligned | yes + funnel filter (shared table filter) |

The Available Balance column of the older layout is gone (it is on the card page). **Order:** with no sort chosen, Active cards are listed first. Once a column is sorted, every card follows that sort. The list does not open with a sort selected. An applied Status filter shows as a chip row above the table, aligned right.

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
- There is **no manual / auto card type** (designer, Q-2). The Figma "manual" and "auto" frames are the same modal with the balance section open or closed.

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
- Card visual: the same as My Cards in the Consumer Portal (flat `#142435`, white 30 % border, Roboto Mono). The details panel tucks 16 px under the card.
- Card Number / Expires / CVC, masked, with **Reveal Details** (same panel as Consumer My Cards). No copy icon here.
- Available Balance and Current Balance (Current is muted gray, as in Consumer).
- Admin Number (with a **copy icon**: gray, copies the number, "Copied" tooltip; same as Consumer My Cards), Name on Card, Card Name, Created (`12 Apr 2023, 12:28`), Payment Network (flag with 4 px radius, Mastercard and Visa alike), Address.

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

**Add Funds puts money ON this card. Transfer Funds sends money FROM this card** to another card or bank account (decided 2026-11-17).

- **From**: same grouped select as Add Funds (cards + bank accounts), excluding this card.
- **Enter Amount** with "Max amount" on the label row, right-aligned, as in Add Funds (= this card's available balance; the wording was "Use max amount" before, Figma shows "Max amount"). Helper "Available balance: $X USD" shows **this card's** balance.
- Confirm checkbox: "Send $X from <this card> to <destination>".
- Cancel / **Transfer**.
- Success: "Transfer Transaction Submitted": "You've successfully sent $X from <this card> to <destination>" / **Done**.
- The same three errors as Add Funds. Insufficient funds is checked against this card's balance.

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
- Columns: Amount, Bill Reference, Payee, Payment Type, Source, Due Date, Status. Amount, Payee, Payment Type and Source use the medium weight of Bills & Payables.
- Filters: a funnel on **Payment Type** and on **Source** only. Each opens a single-column panel (same as the Status filter on the SMART Cards list: Select all, checkbox list with counts, Reset / Apply). Reset clears only the open column. Applied filters show as chips above the table.
- Expanded row: Notes, Attachments, Actions (Cancel Payment), Payment method details, Activity log.
- Empty state: "No Bill History" / "You don't have any bills".
- Export: header **Export** button (Bill and Transaction History tabs only, disabled when the tab is empty) opens the confirm "You're about to export N row(s) from Bill History. (in CSV format)" with Cancel / Export; Export downloads a CSV of the filtered rows. Built exactly as Figma draws it (not the shared `TableExport` format menu).

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

- Merchant Name and Amount use the medium weight of Bills & Payables.
- Expanded row, "Transaction Details": Transaction Code, Response Code, Response Description, Merchant Category Code, Transaction Type, Merchant Location, Fee. Some rows show an "Externally Added" badge.
- Empty state: "No Transaction History" / "You don't have any transactions".
- Export: same as Bill History (confirm names "Transaction History").
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
- Sub-tabs: Card Details · **Bills History** (Figma 10001:268787).

**Remove dialog:**
- "Are you sure you want to remove this card?": "By removing this card, it will be removed from the list, though your card data will remain intact. However, sensitive information will be deleted, and consequently, you won't have access to bills or transaction history associated with the card." Buttons Cancel / **Yes, remove the card**.
- After removal, the card **is no longer in the list**.

## 5. Flows

1. **Create:**
   1. Cards tab → **Create New** (or **Create** in the empty state) → modal.
   2. Enter Card Name, and optionally open the balance section (Origination Account + Amount).
   3. **Create** → "Card created!" → **Done** → list with the new card, Active.
2. **Add Funds** (money onto this card): details → **Add Funds** → pick the source → enter the amount → tick the confirm box → **Add to balance** → "Funding Transaction Submitted" → balances refresh.
   - Errors: amount ≤ 0, insufficient funds, box not ticked.
3. **Transfer Funds** (money off this card): ⋯ → Transfer Funds → pick the destination → amount → tick → **Transfer** → "Transfer Transaction Submitted".
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
- **BR-3:** Amount (Create, Add Funds, Transfer Funds) must be > 0: "Amount must be greater than 0."
- **BR-4:** Amount can't exceed the available balance of the account the money leaves (Add Funds: the source; Transfer Funds: this card): "Available balance: $X USD (Insufficient Funds)".
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
  - A card with no balance can be funded at payment time. TODO(confirm): Pay-flow design.
- **Payment Preferences / bank accounts:** the funding sources (bank accounts, linked cards) are the same accounts.
- Cross-product: none for R1. Line of Credit and Purchase Card are out of R1.

## 9. Out of scope (R1)

- **Line of Credit Accounts** tab and anything LoC (designer, 2026-11-17).
- **Card Reconciliation** tab and the Reconciliation columns. Reconciliation is not part of the product yet.
- **Create Purchase Card / Spend Controls** (limits, country, merchant categories, presets, multiple vendors). Out of R1 (decided 2026-11-17).
- Vendor assignment on cards.
- Phone and tablet designs: Figma is desktop-only. Build responsive using the shared patterns.

## 10. Open questions

| # | Question |
|---|---|
| F-3 | When does a linked card become Inactive? (asked in Figma) |
| — | Smaller items, marked inline: Card Name max length + tooltip, Closed card actions, Unlock confirmation, transaction statuses, "Externally Added", linked-card submit label and validation messages, permissions per role, Pay-flow funding design. |

**Decided on 2026-11-17** (designer in Figma comments, then the team):
- Q-1/F-1: list [`10001:272320`](https://www.figma.com/design/9we1YVhB41SNAHXULwJJUZ/?node-id=10001-272320), no Reconciliation columns.
- Q-2: there is no manual/auto card type.
- Q-3: no vendor.
- Q-4: Blocked is right; no Inactive for SMART cards.
- Q-5/F-2: Add Funds = money onto the card; Transfer Funds = money from the card to another account.
- Q-6: PDF + CSV, no Amount field.
- Q-7: "Remove this card?" for SMART cards.
- Q-8: "Bill History".
- Q-9: required fields (see BR-9).
- Q-10: a removed card leaves the list.
- Q-11/12, F-4: LoC, Reconciliation and Purchase Card / Spend Controls are out of R1.
- Q-13/F-5: sidebar label "Cards Manager", page title "Manage Cards".

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
