# Card Manager — Batch 1: Figma inventory (2026-11-17)

Master prompt: `wiki/module-master-prompt.md` (PR #26). Batch 1 done; waiting at **Gate 1** (scope + current frames).

- Figma file `9we1YVhB41SNAHXULwJJUZ` ([REVIEW] VC | ICCP – Line of Credit Cards), connection **figma-b**.
- Page `↔ Cards Manager` (`43:818`). Linked node: section **SMART Cards** `10671:65397`.
- All frames are 1920 desktop. No tablet or phone frames, no dark mode.
- Prototype shell: use `<app-nav>`/`<app-topbar>`. Ignore the Figma sidebar, which has an older nav: Dashboard, Recurring Payments, "Cards Manager".

## A. Linked section `10671:65397` — 75 frames

### Module shell (all screens)
- Page title **Manage Cards**. Breadcrumb: Home › Manage Cards › SMART Cards.
- 3 full-width tabs with count badges:
  - **SMART Cards**
  - **Linked Credit Cards**
  - **Line of Credit Accounts**: no frames in this section. See B.

### A1. SMART Cards — list + create (`8007:125589`, `10001:272319`)
| Frame | Node | What it shows |
|---|---|---|
| Empty state | `8007:126803` | "Create your First SMART Card" / "Instantly generate and fund cards with cashback for customer payments." / **Create** |
| Create a Card (manual) | `8007:156738` | Modal "Create a Card". Read-only "Card Holder Details" card (Name on Card, Address). **Card Name** input with an info tooltip. Collapsible "Would you like to assign a balance to the card?" (Optional), expanded: **Origination Account** select, **Amount** ($). Buttons Cancel / Create. |
| Card created (manual) | `8007:156840` | "Card created!": card visual ($2,950.00, masked number, VALID THRU, name), Name on Card, Card Name, Number, CVC2, Expires, Address, **Reveal Details**, **Done** |
| List of Cards (manual) | `8007:156995` | Same as the list below, 1 row |
| Create a VC (auto) | `8007:160992` | Same modal, balance section collapsed. Copy: "You can fund this card at the transaction level when you are about to pay an invoice." |
| Create a VC (auto – Select a Vendor) | `8007:161095` | **No vendor field visible** (see Q-3) |
| Create a VC (auto – Assigned Vendor) | `8007:161212` | Card Name "Personal card". No vendor visible. |
| Card created (auto) | `8007:161315` | Same as manual |
| List of Cards (auto) | `8007:161477` | 1 row |
| **List of Cards** (newest) | `10001:272320` | Columns: CARD NUMBER (sort, network logo + ••••), CARD NAME (sort), AVAILABLE BALANCE (+ "USD"), EXPIRES (sort), CREATED (sort), STATUS (sort + filter). Statuses: **Active, Blocked, Expired, Closed**. Expired and Closed rows are greyed. Pagination: Rows per Page, "Showing 1 - 1 of 6 results". Button **+ Create New**. |

### A2. Card details (base for all actions below)
- Header: ← back, card name. Buttons **Add Funds** (primary) and a **⋯** menu with: Transfer Funds, Export Monthly Statements, Lock, Close, Remove.
- Sub-tabs: **Card Details** · **Bill History** · **Transaction History** · **Card Reconciliation** (the last one appears only on the history frames and has no frames of its own).
- Card Details content:
  - Card visual, plus Card Number / Expires / CVC (masked) with **Reveal Details**.
  - Available Balance, Current Balance.
  - Admin Number, Name on Card, Card Name, Created ("12 Apr 2023, 12:28"), Payment Network, Address.

### A3. Add Funds (`8014:99273`)
- Modal fields:
  - **Transfer from**: grouped select. The "Card" group lists name •••• last4, Expires, Balance. The "Bank Account" group lists name, bank ••••last4, Balance.
  - Helper "Available balance: $X USD".
  - **Enter Amount** with "Max amount".
  - A confirm checkbox: "Transfer $X from <source> to <card>".
  - Buttons Cancel / **Add to balance**.

| Frame | Node | State |
|---|---|---|
| Add Funds | `8014:104715` | Default |
| Select Transfer from | `8014:104764` | Source dropdown open |
| Enter Amount | `8014:104831` | Amount entered |
| Confirm checkbox error | `8014:104880` | Error "First, confirm this transfer by ticking the box" |
| Add to balance | `8014:104932` | Ready to submit |
| Submitted | `8014:104983` | Success "Funding Transaction Submitted": "You've successfully sent $300.00 from … to …" / Done |
| Amount error | `8014:105019` | "Amount must be greater than 0." |
| Insufficient funds | `8014:105067` | "Available balance: $21.02 USD (Insufficient Funds)" |
| Card Details (Auto) | `8014:128273` | Details page for an auto card |

### A4. Transfer Funds (`8014:121934`)
- Same pattern as A3, but the select is **Send to**. Adds a "Use max amount" link. Button **Transfer**. Success "Transfer Transaction Submitted".
- Same three errors as A3.
- Frames: `8014:121935`, `121984`, `122051`, `122100`, `122152`, `122203`, `122239`, `122287`. The ⋯ menu is open in `8014:127731`.

### A5. Export Monthly Statements (`8014:133821`)
- Modal **Download Monthly Statements**. Copy: "A monthly statement is a written record prepared by a financial institution, usually once a month, listing all credit card transactions for an account, including purchases, payments, fees and finance charges."
- **Select Month** dropdown (Jan 2024 … Jan 2023). Buttons Cancel / **Download**.
- Frames: `8014:133822`, `133867` (dropdown), `133937` (typing). The ⋯ menu is open in `134207`.
- ⚠ The frames are misnamed "Transfer Funds…". An "Amount 0.00" field also appears in the text (Q-6).

### A6. Lock (`8015:143239`)
- Dialog "Lock your card temporarily?": "You can temporarily lock your card to restrict its usage without permanently closing it." Buttons Cancel / **Yes, lock the card**. Frame `8015:143240`, ⋯ menu in `143408`.
- Locked card `8016:145592`: status badge **Blocked**. The menu shows **Unlock Card**, Close, Remove.

### A7. Close (`8016:146107`)
| Frame | Node | State |
|---|---|---|
| Close, no balance | `8016:155287` | Dialog "Close your card?": "You are about to close this card. You'll be able to access past transaction history, but you can't undo this action." Buttons Cancel / **Yes, close the card** (destructive) |
| Closed | `8016:155926` | Success "Card Closed": "Your card Corporate Card LTD was closed." The card stays in the list as **Closed**. |
| Close, with balance | `8016:146108` | "You can't close this card right now": "You have some funds on this card. If you want to close this card you have to transfer all amount to another account". Field **Choose destination account to unload funds** (Select account). Checkbox "Transfer $1,734.58 from … to selected account, and agree to close this card". Buttons Back / **Transfer and Close Card** (red). |
| Destination dropdown | `8016:152677` | Dropdown open |
| Destination filled | `8016:153177` | Destination selected |
| Closed after transfer | `8016:153677` | "The card balance of $1734.58 was transferred to … and your … was closed." |
| ⋯ menu, with balance | `8016:146144` | |
| ⋯ menu, without balance | `8016:154745` | |
| List after closing (auto) | `8016:156603` | See Q-1 |

### A8. Remove (`8016:157241`)
- Remove, no balance:
  - Dialog "Remove this card?" `8016:157315`: "You're about to remove this card. All sensitive information will be removed, you won't be able to use this card and you can't undo this action." Buttons Cancel / **Yes, remove the card**.
  - "Card Removed" `8016:157351`: the card **disappears** from the list, which goes back to the empty state.
- Remove, with balance:
  - Same flow as Close: `8016:157242`, `157387` (dropdown), `157460`, done `157517`, ⋯ menus `157587` and `157553`.
  - Button **Transfer and Remove Card**.
  - ⚠ The checkbox copy in `157387` says "agree to **close** this card".

### A9. Expired (`8018:168656`)
- Expired card `8018:168968`: badge **Expired**. The only action is **Remove**.
- Remove dialog `8018:178726` uses the title "Are you sure you want to remove this card?". This differs from A8 (Q-7). Done frame `8018:179198`.

### A10. Bill History (`8019:118312`)
- Header buttons: **Export**, Add Funds. Empty state `8019:119866`: "No Bill History" / "You don't have any bills".
- List `8019:120161`, columns:
  - amount
  - bill reference
  - payee
  - payment type (ACH, Cross-border, Card, Wire, SMART Disburse, Check, Multi-Party, RTP)
  - source
  - Due Date
  - status (Processing, Past Due, Pending Initiation, Initiated)
- Expandable row shows:
  - Notes and Attachments.
  - Actions: Cancel Payment.
  - Payment method details: Bank Name, Account Holder Name, Routing Number, Account Number, Address.
  - Activity log with Show More.
- Export `8019:121111`: "You're about to export 10 row(s) from Bill History. (in CSV format)". Buttons Cancel / Export.

### A11. Transaction History (`8024:124352`)
- Empty state `8024:124353` (misnamed "No Bill History"): "No Transaction History" / "You don't have any transactions".
- List `8024:126638`:
  - Info banner: "For dispute request you can contact: 800-890-3128 or dispute-ticket@transcard.com".
  - Columns: TRANSACTION ID, DATE/TIME (sort), MERCHANT NAME, AMOUNT, STATUS (Settled), DESCRIPTION.
  - Expandable "Transaction Details": Transaction Code, Response Code, Response Description, Merchant Category Code, Transaction Type, Merchant Location, Fee. There is also an "Externally Added" badge.
- Export `8024:127454`: same pattern as A10.

### A12. Linked Credit Cards (`10001:255254`, `268017`, `269114`, `183691`)
- Empty state `10001:257248`: "Add your external cards for quick access and better financial management." Button **Add Card**.
- Add new card `10001:257969`. Fields:
  - Card number "0000 0000 0000 0000"
  - Expiry "MM / YY"
  - CVC (More info)
  - Name on Card (Full Name)
  - Country, Address Line 1, Address Line 2, City, State, ZIP Code
  - One field is marked Optional (Q-9). Buttons Back / (submit).
- Card Details `10001:268754`:
  - Header: holder name, **Active** badge, action **Remove from view**.
  - Sub-tabs: Card Details · **Bills History**. The SMART tab says "Bill History" (Q-8).
- Remove dialog `10001:269476`: "Are you sure you want to remove this card?": "By removing this card, it will be removed from the list, though your card data will remain intact. However, sensitive information will be deleted, and consequently, you won't have access to bills or transaction history associated with the card."
- After removal `10001:269861`: the card **stays in the list as Inactive** (Q-10).
  - Info banner: "Linked cards act only as origination accounts and cannot be used as payment methods."
  - Columns: CARD NUMBER, CARD NAME, EXPIRES, PAYMENT NETWORK, CREATED, STATUS.
  - Buttons **Filter** and **+ Add New**.
- Bill History `10005:183692`: same table as A10.

## B. Same page, outside the linked node (not inventoried in detail)
| Section | Node | Frames |
|---|---|---|
| Line of Credit Accounts | `10079:68523` | 5: No Cards Added, One Card, Multiple accounts (dropdown), Multiple Cards, Status dropdown |
| Empty State (LoC) | `10023:60244` | 1 |
| Create Purchase Card | `11117:198290` | 7: empty, create, select vendor, card type (Reloadable), created, card details, edit spend controls |
| Set Spend Controls → Spend Limit | `11094:147906` | 10 |
| Country | `11094:154299` | 5 |
| Merchant Categories | `11116:186168` | 6 (incl. "Lock-in on first use") |
| Using Preset / Save Preset | `11120:301746`, `11120:310954` | 4 + 1. Note: "When ANY changes are made to the Set Spend Controls section, the system will prompt the user with a confirmation dialog asking if they want to save the current settings as a preset for future use." |
| Card for multiple vendors | `11175:320042` | 3 |
| ICCP / Line of Credit Cards | `11717:103989` | header only, empty |

Other pages in the file:
- `▶️ LoC (Proto)` `11505:115898`
- `↔ (SE) Connect Your LoC Account` `10001:182694`
- `↔ Initiate a Payment Flow` `10001:182693`
- Draft, Local Components

## Duplicates and conflicts: which frame is current
- **Two list layouts.**
  - `10001:272320`: Balance, Expires, Created, Status columns. It is the newest, judging by node id.
  - `8016:155926`/`156603`: Status shown as a badge next to the name, plus **Reconciliation (Auto)** and **Reconciliation status (0 unmatched)** columns.
  - → Proposal: current = `10001:272320`, adding the Reconciliation columns if they are confirmed (Q-1).
- **Manual vs auto** are two variants of the same Create modal, not two screens. → Document as one modal with the balance section optional.
- Fake-data mismatches, to ignore when documenting:
  - card •••• 3923 vs 3204;
  - "transferred to Secondary Bank Account ***1010" when the user picked Online Purchases;
  - direction of "Send $X from … to …" flips between Transfer frames (Q-5).

## Open questions (for Gate 1 / product owner)
- Q-1 Which list is current? Are the Reconciliation and Reconciliation status columns in R1?
- Q-2 What do manual vs auto (reconciliation) mean for the user? Is it a choice in the Create modal, or set by the plan or configuration?
- Q-3 "Select a Vendor" and "Assigned Vendor" frames show no vendor field. Is vendor assignment part of Create (SMART Cards), or only of Purchase Card (section B)?
- Q-4 Card statuses: Active, Blocked (= locked), Expired, Closed. Is "Blocked" the right label for a card the user locked? Is there an "Inactive" status for SMART cards?
- Q-5 Transfer Funds direction: does it move money **from this card to** another account? The copy contradicts itself across frames.
- Q-6 Export Monthly Statements: is the "Amount" field a leftover? Which file format is downloaded (PDF/CSV)?
- Q-7 Remove dialog title: "Remove this card?" vs "Are you sure you want to remove this card?" (expired, linked). Pick one.
- Q-8 Tab name: "Bill History" or "Bills History"?
- Q-9 Add new card (linked): which field is Optional? What is the submit button label? What validations apply (Luhn, expiry in the future)?
- Q-10 Linked card "Remove" leaves the row as Inactive, but the copy says "removed from the list". Which is right?
- Q-11 Card Reconciliation tab: is there a design? Or is it out of scope for R1?
- Q-12 Line of Credit Accounts tab and Purchase Card / Spend Controls (section B): same module R1, or separate later epics?
- Q-13 Nav label: "Cards Manager" (Figma) or "Card Manager" (`src/data/nav.json`)?

## Next
After Gate 1 → Batch 2: write `wiki/products/smart-hub/modules/card-manager.md` on branch `wiki/card-manager`.
Screenshots of key frames (local only): `/private/tmp/claude-502/-Users-user-Desktop-test-sx/a3c5db45-8b0c-45f2-aef0-5a4b3e58eb78/scratchpad/cm/`.

## Answers from Cristian (Figma comments, 2026-11-17)
| Q | Answer | Status |
|---|---|---|
| Q-1 | "Use old list, Reconciliation not yet part of the product" (on `8016:156603`) | Answered. Follow-up F-1: old list *without* the Reconciliation columns, so Created + Status column are dropped and status shows as a badge next to the name? |
| Q-2 | — | **No answer** (manual vs auto) |
| Q-3 | "There is no Vendor assignment" | Answered: no vendor in Create |
| Q-4 | "Blocked is right, Inactive isn't a status yet" | Answered: SMART statuses Active, Blocked, Expired, Closed |
| Q-5 | (RO) "Either something is missing or it's wrong. If it's Send to, then the text below is wrong. I assume this is transfer funds from another account, so it would be From" | Not decided. Follow-up F-2: if it's "From", how is it different from Add Funds? |
| Q-6 | (RO) "I don't see Amount, but both PDF and CSV" | Answered: Select Month + format PDF/CSV. The Amount text is in a hidden or clipped layer, so ignore it. |
| Q-7 | "Use this for SMART Cards" (on "Remove this card?") | Answered: SMART = "Remove this card?". Linked keeps "Are you sure you want to remove this card?" |
| Q-8 | "Bill History" | Answered |
| Q-9 | "Card number, expiry and CVC are mandatory. If the user changes Name on card (part of an optional section) they have to provide the other required information, whereas Address Line 2 remains Optional." | Answered |
| Q-10 | "No mistake: the removed card is not visible anymore, it's a different card in the list" | Answered: Remove takes the card off the list. Linked cards *can* be Inactive (F-3: when?) |
| Q-11/12 | "LoC is out of scope for R1" | LoC out. Reconciliation out (from Q-1). F-4: is Purchase Card / Spend Controls in or out of R1? |
| Q-13 | "Cards" | F-5: is the nav label "Cards", and does the page title stay "Manage Cards"? |
