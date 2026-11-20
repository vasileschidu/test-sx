---
title: Card Manager — backlog (R1)
type: backlog
status: draft
last_reviewed: 2026-11-17
product: smart-hub
module: card-manager
jira_epic: TCDM-5217
source: Batch 3 of wiki/module-master-prompt.md, from modules/card-manager.md on main @ c7243cb; not yet in Jira
---

# Card Manager — backlog (R1)

The Jira plan for [Card Manager](card-manager.md). Created in Jira on 2026-11-17: Epic [TCDM-5217](https://agilepartners.atlassian.net/browse/TCDM-5217), 16 stories with "is blocked by" links. The Epic relates to the earlier design task TCDM-4340.

- **Order:** S0 first. Then C1. Then the rest, in parallel, following the "Depends on" column.
- **Conflicts:** each story owns its own files (the "Owns" column). Only S0 touches shared files. Two stories never own the same file.
- **Links:** "Wiki" means the matching section of [card-manager.md](card-manager.md). Figma node links use the base `https://www.figma.com/design/9we1YVhB41SNAHXULwJJUZ/?node-id=`.

## Epic

**Title:** Cards Manager | SMART Hub (R1) — [TCDM-5217](https://agilepartners.atlassian.net/browse/TCDM-5217)

**Description:**
- Build the Cards Manager module in the SMART Hub prototype:
  - SMART Cards: list, create, details, Add / Transfer Funds, statements, Lock, Close, Remove, Bill History and Transaction History.
  - Linked Credit Cards: list, add, details, remove.
- Spec: `wiki/products/smart-hub/modules/card-manager.md`. Figma: `9we1YVhB41SNAHXULwJJUZ`, node `10671:65397`.
- Out of R1: Line of Credit, Reconciliation, Purchase Card / Spend Controls.
- Includes the working rules in [§ Working rules](#working-rules-put-in-the-epic).

## Overview

| # / Jira | Story | Owns | Depends on | Size |
|---|---|---|---|---|
| [S0](https://agilepartners.atlassian.net/browse/TCDM-5218) TCDM-5218 | Module scaffold | `card-manager.html`, `card-manager.js`, `card-manager.json` + **shared** `nav.json` | — | S |
| [C1](https://agilepartners.atlassian.net/browse/TCDM-5219) TCDM-5219 | Account picker (grouped select) — new component | `card-manager-account-picker.js` + components skill | S0 | S |
| [S1](https://agilepartners.atlassian.net/browse/TCDM-5220) TCDM-5220 | SMART Cards list | `card-manager-list.js` | S0 | M |
| [S2](https://agilepartners.atlassian.net/browse/TCDM-5221) TCDM-5221 | Create a Card | `card-manager-create.js` | S1 | M |
| [S3](https://agilepartners.atlassian.net/browse/TCDM-5222) TCDM-5222 | Card details page | `card-manager-details.js` | S1 | M |
| [S4](https://agilepartners.atlassian.net/browse/TCDM-5223) TCDM-5223 | Add Funds | `card-manager-funds.js` | S3, C1 | M |
| [S5](https://agilepartners.atlassian.net/browse/TCDM-5224) TCDM-5224 | Transfer Funds | `card-manager-funds.js` (after S4 merged) | S4 | S |
| [S6](https://agilepartners.atlassian.net/browse/TCDM-5225) TCDM-5225 | Export Monthly Statements | `card-manager-statements.js` | S3 | S |
| [S7](https://agilepartners.atlassian.net/browse/TCDM-5226) TCDM-5226 | Lock / Unlock | `card-manager-status.js` | S3 | S |
| [S8](https://agilepartners.atlassian.net/browse/TCDM-5227) TCDM-5227 | Close card | `card-manager-close.js` | S3, C1 | M |
| [S9](https://agilepartners.atlassian.net/browse/TCDM-5228) TCDM-5228 | Remove card | `card-manager-close.js` (after S8 merged) | S8 | S |
| [S10](https://agilepartners.atlassian.net/browse/TCDM-5229) TCDM-5229 | Bill History tab | `card-manager-bills.js` | S3 | M |
| [S11](https://agilepartners.atlassian.net/browse/TCDM-5230) TCDM-5230 | Transaction History tab | `card-manager-transactions.js` | S3 | M |
| [S12](https://agilepartners.atlassian.net/browse/TCDM-5231) TCDM-5231 | Linked Credit Cards list | `card-manager-linked.js` | S0 | S |
| [S13](https://agilepartners.atlassian.net/browse/TCDM-5232) TCDM-5232 | Add linked card | `card-manager-linked-add.js` | S12 | M |
| [S14](https://agilepartners.atlassian.net/browse/TCDM-5233) TCDM-5233 | Linked card details + Remove | `card-manager-linked-details.js` | S12, S10 | S |

**Paths:**
- Pages: `src/pages/dashboard/`.
- Scripts: `src/scripts/`.
- Data: `src/data/`.

The data file `card-manager.json` is created in S0 with **all** fake data. Later stories only *read* it. If a story needs new data, it adds its own `card-manager-<story>.json`, so two stories never edit the same JSON file.

**Definition of done (every story):**
- `CLAUDE.md` "Definition of done (UI)": `qa:code` + `qa:hover --dark` with 0 major findings.
- Dark mode in every state.
- Keyboard and focus-visible.
- Works at 375 / 768 / 1280.
- `?v=` bumped on the story's own scripts.
- The wiki page is updated in the same PR if behaviour changed.
- The PR is linked to the ticket.

---

## S0 ([TCDM-5218](https://agilepartners.atlassian.net/browse/TCDM-5218)) — [card-manager] Module scaffold

- **Type:** Story · **Label:** card-manager · **Epic:** Cards Manager
- **User story:** As a Hub user, I want a Cards Manager item in the sidebar that opens the module, so that I can reach my cards.
- **Context:** The sidebar item `card-manager` points to `#` today, and its label says "Card Manager". Wiki §3 (Entry points), §11 (File ownership).
- **Scope:**
  - Owns: `src/pages/dashboard/card-manager.html`, `src/scripts/card-manager.js`, `src/data/card-manager.json`.
  - Touches shared: `src/data/nav.json` (href + label). This is the only story allowed to touch it.
- **Reuse:** `<app-nav>`, `<app-topbar>`, `shared.js`, page card, tabs with count badges (Bills table tabs), Badge, `DataSource.load`.
- **Acceptance criteria:**
  - AC-1: Given a business with the `payables` capability, when I open the sidebar, then I see **Cards Manager** and it opens `card-manager.html`.
  - AC-2: The page shows the title **Manage Cards**, breadcrumb Home › Manage Cards › <tab>, and two tabs **SMART Cards (n)** · **Linked Credit Cards (n)**. The counts come from the data. There is **no** Line of Credit tab.
  - AC-3: The active tab is in the URL (`?tab=smart|linked`). Reload and back / forward keep it.
  - AC-4: `card-manager.json` contains every card from wiki §7: 6 SMART cards covering every status, with bills and transactions; 1+ linked cards; funding sources; statement months.
  - AC-5: `card-manager.js` exposes `window.CardManager = { data, route, on(event, fn) }` so the later stories plug in without editing this file. An empty mount point is ready for each tab and for the details view.
  - AC-6: Light and dark. No console errors.
- **Out of scope:** the content of the tabs.
- **Depends on:** —
- **AI brief:**
  > Read `wiki/products/smart-hub/modules/card-manager.md` §3, §7, §11 and `.claude/skills/components/SKILL.md` (Shell).
  > Create `card-manager.html` from the shell of `bills-and-payables.html`: `<app-nav>`, `<app-topbar>`, page card.
  > Add the two count-badge tabs (copy the Bills tabs markup).
  > Point `nav.json` id `card-manager` to the page, with the label "Cards Manager".
  > Create `card-manager.json` with the data shape in §7, and `card-manager.js` with the `window.CardManager` hooks.
  > Light + dark. Run qa:code and qa:hover --dark.

## C1 ([TCDM-5219](https://agilepartners.atlassian.net/browse/TCDM-5219)) — [card-manager] Account picker (grouped select) — new component

- **Type:** Story · **Label:** card-manager, component
- **User story:** As a user moving money, I want to pick an account from a list grouped into Cards and Bank Accounts, with each balance shown, so that I choose the right one.
- **Context:** Used by Add Funds ("Transfer from"), Transfer Funds ("From") and Close / Remove ("Choose destination account"). Figma [`8014:104764`](https://www.figma.com/design/9we1YVhB41SNAHXULwJJUZ/?node-id=8014-104764), [`8016:152677`](https://www.figma.com/design/9we1YVhB41SNAHXULwJJUZ/?node-id=8016-152677). Wiki §4.4.
- **Scope:**
  - Owns: `src/scripts/card-manager-account-picker.js`.
  - Touches shared: `.claude/skills/components/SKILL.md` (adds the component entry).
- **Reuse:** `el-select` trigger (`@input field`), `el-option` two-line pattern (MEMORY: el-option pattern), network logo and bank icon from Payment Preferences.
- **Acceptance criteria:**
  - AC-1: `CardManagerAccountPicker.mount(el, { sources, exclude, placeholder, onChange })` renders an `el-select`.
  - AC-2: The options are grouped under the headers **Card** and **Bank Account**.
    - Card row: logo, name •••• last4, "Expires MM/YYYY", "Balance" + amount.
    - Bank row: bank icon, name, bank ••••last4, "Balance" + amount.
  - AC-3: The selected value shows on one line (name •••• last4, plus the expiry for cards). The placeholder is "Select account".
  - AC-4: `exclude` hides an account. Used to hide the current card.
  - AC-5: States: default, hover, focus-visible, open, selected, disabled, error (red outline + message slot). Every state works in dark mode.
  - AC-6: Keyboard: open, arrow through the options, Enter, Esc.
  - AC-7: The components skill has the new entry, with its markup and API.
- **Depends on:** S0
- **AI brief:**
  > Build a grouped account select as in Figma 8014:104764, using el-select / el-option exactly as in the components skill.
  > API: `CardManagerAccountPicker.mount(el, opts)`.
  > Every state, light + dark.
  > Add it to `.claude/skills/components/SKILL.md`.

## S1 ([TCDM-5220](https://agilepartners.atlassian.net/browse/TCDM-5220)) — [card-manager] SMART Cards list

- **Type:** Story · **Label:** card-manager
- **User story:** As a Hub user, I want to see all my SMART cards with their balance, expiry and status, so that I know what I have.
- **Context:** Wiki §4.1. Figma: list [`10001:272320`](https://www.figma.com/design/9we1YVhB41SNAHXULwJJUZ/?node-id=10001-272320), empty [`8007:126803`](https://www.figma.com/design/9we1YVhB41SNAHXULwJJUZ/?node-id=8007-126803). Rules BR-8.
- **Scope:** Owns `src/scripts/card-manager-list.js`. Touches shared: none.
- **Reuse:** Bills table patterns (sort, pagination), `TableSkeleton`, `TableUi.emptyState`, shared table filter (`wiki/design-system/table-filter.md`), Badge.
- **Acceptance criteria:**
  - AC-1: The header shows **SMART Cards**, "Instantly generate and fund virtual cards with cashback for customer payments.", a Search field and **+ Create New** (both 40 px tall).
  - AC-2: The columns are Card Number (`•••• last4`), Card Name, Expires, Payment Network (flag + name), Created, Status. All are sortable. With no sort chosen, Active cards come first.
  - AC-3: Status badges: Active = emerald, Blocked = amber, Expired = red, Closed = gray. Expired and Closed rows are greyed.
  - AC-4: The Status filter uses the shared filter. Its category is labelled exactly "Status".
  - AC-5: Pagination shows "Rows per Page" and "Showing x - y of n results".
  - AC-6: Loading shows the table skeleton.
  - AC-7: Given no cards, the empty state shows "Create your First SMART Card" / "Instantly generate and fund cards with cashback for customer payments." with a **Create** button.
  - AC-8: Clicking a row opens that card's details (`?card=<id>`). Keyboard: Enter on the focused row.
  - AC-9: The table is responsive at 375 (horizontal scroll inside the card) and has a dark mode.
- **Depends on:** S0
- **AI brief:**
  > Implement the SMART Cards table in `card-manager-list.js`, mounted through `window.CardManager`.
  > Copy the table / sort / pagination / skeleton / empty state from `bills-payables-table.js` and `TableUi`. Don't invent new ones.
  > Columns and badges as in wiki §4.1.
  > The Status filter uses the shared filter spec.

## S2 ([TCDM-5221](https://agilepartners.atlassian.net/browse/TCDM-5221)) — [card-manager] Create a Card

- **Type:** Story · **Label:** card-manager
- **User story:** As a Hub user, I want to create a SMART card, with an optional starting balance, so that I can pay suppliers with it.
- **Context:** Wiki §4.2, BR-1, BR-2, BR-3. Figma [`8007:156738`](https://www.figma.com/design/9we1YVhB41SNAHXULwJJUZ/?node-id=8007-156738), [`8007:160992`](https://www.figma.com/design/9we1YVhB41SNAHXULwJJUZ/?node-id=8007-160992), success [`8007:156840`](https://www.figma.com/design/9we1YVhB41SNAHXULwJJUZ/?node-id=8007-156840).
- **Scope:** Owns `src/scripts/card-manager-create.js`.
- **Reuse:** `OBModal` dialog shell, `@details card` + description list, `@input field`, information circle + tooltip, input with leading `$`, primary / secondary buttons, card visual (`PPComponents.createMiniCardComponent`, adapted only if needed), Gray "Reveal Details" button.
- **Acceptance criteria:**
  - AC-1: **Create New** (or **Create** in the empty state) opens the "Create a Card" modal.
  - AC-2: Card Holder Details shows Name on Card and Address from the business profile. They are read-only (BR-1).
  - AC-3: Card Name is required. Submitting empty shows an error under the field. TODO(confirm): message text and max length.
  - AC-4: The section "Would you like to assign a balance to the card?" (Optional) is collapsed by default and shows "You can fund this card at the transaction level when you are about to pay an invoice." Opening it shows Origination Account and Amount.
  - AC-5: If the section is open, an Amount ≤ 0 shows "Amount must be greater than 0." and blocks Create (BR-3).
  - AC-6: There is no vendor field and no manual / auto choice (BR-2).
  - AC-7: Create shows "Card created!": card visual, Name on Card, Card Name, Number •••• last4, CVC2 •••, Expires, Address. **Reveal Details** shows the full number and CVC. **Done** closes it, and the new card is in the list as Active, with the balance from the form (or $0).
  - AC-8: Cancel, ×, and Esc close it without creating. Focus is trapped inside the modal and returns to the trigger.
  - AC-9: Every state works in dark mode.
- **Depends on:** S1
- **AI brief:**
  > Build the Create a Card modal in `card-manager-create.js` with `OBModal`.
  > Use the details card, el-select and `$` input from the components skill.
  > On submit, add the card to `CardManager.data` (in memory) and refresh the list via `CardManager.on`.
  > Copy the text exactly from wiki §4.2.

## S3 ([TCDM-5222](https://agilepartners.atlassian.net/browse/TCDM-5222)) — [card-manager] Card details page

- **Type:** Story · **Label:** card-manager
- **User story:** As a Hub user, I want to open a card and see its details and the actions I can take, so that I can manage it.
- **Context:** Wiki §4.3, BR-8, BR-11. Figma [`8014:104715`](https://www.figma.com/design/9we1YVhB41SNAHXULwJJUZ/?node-id=8014-104715), ⋯ menu [`8014:127731`](https://www.figma.com/design/9we1YVhB41SNAHXULwJJUZ/?node-id=8014-127731), locked [`8016:145592`](https://www.figma.com/design/9we1YVhB41SNAHXULwJJUZ/?node-id=8016-145592), expired [`8018:168968`](https://www.figma.com/design/9we1YVhB41SNAHXULwJJUZ/?node-id=8018-168968).
- **Scope:** Owns `src/scripts/card-manager-details.js`.
- **Reuse:** card visual, `@details card` + description list, Gray Reveal button, `el-dropdown` / `el-menu` (table row actions), Badge, sub-tabs (Bills tab style).
- **Acceptance criteria:**
  - AC-1: `?card=<id>` shows the header: ← back to the list, card name, status badge, **Add Funds**, ⋯.
  - AC-2: The ⋯ menu depends on the status:
    - Active: Transfer Funds, Export Monthly Statements, Lock, Close, Remove.
    - Blocked: Unlock Card, Close, Remove.
    - Expired: Remove only, and no Add Funds.
    - Closed: no actions. TODO(confirm).
  - AC-3: Sub-tabs: Card Details · Bill History · Transaction History. The active sub-tab is in the URL.
  - AC-4: The Card Details tab shows the card visual; Card Number / Expires / CVC masked; **Reveal Details** (toggles to Hide); Available Balance and Current Balance; Admin Number, Name on Card, Card Name, Created (`12 Apr 2023, 12:28`), Payment Network, Address.
  - AC-5: Each menu item fires `CardManager` events (`add-funds`, `transfer`, `statements`, `lock`, `unlock`, `close`, `remove`). The modals come from their own stories.
  - AC-6: Back returns to the list with its sort and page kept.
  - AC-7: Light and dark, keyboard (menu, tabs), responsive.
- **Depends on:** S1
- **AI brief:**
  > Build the details view in `card-manager-details.js` as in wiki §4.3.
  > The menu items only emit `CardManager` events. Don't build the modals here.
  > Reuse the details card, the Gray button and el-menu from the components skill.

## S4 ([TCDM-5223](https://agilepartners.atlassian.net/browse/TCDM-5223)) — [card-manager] Add Funds

- **Type:** Story · **Label:** card-manager
- **User story:** As a Hub user, I want to put money onto a card from another card or a bank account, so that the card can pay.
- **Context:** Wiki §4.4, BR-3, BR-4, BR-5. Figma section [`8014:99273`](https://www.figma.com/design/9we1YVhB41SNAHXULwJJUZ/?node-id=8014-99273).
- **Scope:** Owns `src/scripts/card-manager-funds.js`.
- **Reuse:** `OBModal`, C1 account picker, `$` input, checkbox, toast.
- **Acceptance criteria:**
  - AC-1: **Add Funds** opens the modal: **Transfer from** (C1, excluding this card) with the helper "Available balance: $X USD" for the selected source; **Enter Amount** with "Max amount"; the confirm checkbox "Transfer $X from <source> to <this card>"; Cancel / **Add to balance**.
  - AC-2: The checkbox text updates live with the amount and the source.
  - AC-3: Amount ≤ 0 → "Amount must be greater than 0." (BR-3).
  - AC-4: Amount > the source's balance → helper "Available balance: $X USD (Insufficient Funds)" in red (BR-4).
  - AC-5: Box not ticked → "First, confirm this transfer by ticking the box" (BR-5).
  - AC-6: On success: "Funding Transaction Submitted" / "You've successfully sent $X from <source> to <this card>" / **Done**. The card's balances and the source's balance update.
  - AC-7: Every error and state works in dark mode. Keyboard and focus trap.
- **Depends on:** S3, C1
- **AI brief:**
  > Build the Add Funds modal in `card-manager-funds.js`, listening to the `add-funds` event.
  > Use the C1 picker.
  > Copy the text exactly from wiki §4.4.
  > Keep the modal generic (`mode: 'add' | 'transfer'`) so S5 only adds the transfer mode.

## S5 ([TCDM-5224](https://agilepartners.atlassian.net/browse/TCDM-5224)) — [card-manager] Transfer Funds

- **Type:** Story · **Label:** card-manager
- **User story:** As a Hub user, I want to send money from a card to another card or bank account, so that I can move unused funds.
- **Context:** Wiki §4.5. **Add Funds = money onto the card; Transfer Funds = money from the card.** Figma section [`8014:121934`](https://www.figma.com/design/9we1YVhB41SNAHXULwJJUZ/?node-id=8014-121934). The wording was fixed on 2026-11-17.
- **Scope:** Owns `src/scripts/card-manager-funds.js` (start after S4 is merged).
- **Reuse:** the S4 modal in `transfer` mode.
- **Acceptance criteria:**
  - AC-1: ⋯ › Transfer Funds opens the modal: **From** (C1, excluding this card); **Enter Amount** with "Max amount" (= this card's available balance); the helper shows **this card's** available balance; the checkbox "Send $X from <this card> to <destination>"; Cancel / **Transfer**.
  - AC-2: The same three errors as S4. Insufficient funds is checked against this card.
  - AC-3: On success: "Transfer Transaction Submitted" / "You've successfully sent $X from <this card> to <destination>" / **Done**. Balances update.
  - AC-4: Light and dark, keyboard.
- **Depends on:** S4
- **AI brief:**
  > Add `transfer` mode to the S4 modal, as in wiki §4.5.
  > The money leaves this card.

## S6 ([TCDM-5225](https://agilepartners.atlassian.net/browse/TCDM-5225)) — [card-manager] Export Monthly Statements

- **Type:** Story · **Label:** card-manager
- **User story:** As a Hub user, I want to download a card's statement for a month, as PDF or CSV, so that I can reconcile in accounting.
- **Context:** Wiki §4.6. Figma section [`8014:133821`](https://www.figma.com/design/9we1YVhB41SNAHXULwJJUZ/?node-id=8014-133821).
- **Scope:** Owns `src/scripts/card-manager-statements.js`.
- **Reuse:** `OBModal`, `@input field` select, `table-export.js` file builders (CSV / PDF), toast.
- **Acceptance criteria:**
  - AC-1: ⋯ › Export Monthly Statements opens "Download Monthly Statements" with the explanation text from wiki §4.6.
  - AC-2: **Select Month** lists the months, newest first. The newest is preselected.
  - AC-3: **Format**: PDF or CSV. There is no Amount field.
  - AC-4: **Download** produces a file named `<card name> - <Mon YYYY>.<ext>` holding that month's transactions, then closes and shows a success toast.
  - AC-5: Cancel, ×, Esc. Light and dark.
- **Depends on:** S3
- **AI brief:**
  > Build the statements modal.
  > Generate the file from the card's transactions for the chosen month, reusing the CSV / PDF builders in `table-export.js` read-only.

## S7 ([TCDM-5226](https://agilepartners.atlassian.net/browse/TCDM-5226)) — [card-manager] Lock / Unlock

- **Type:** Story · **Label:** card-manager
- **User story:** As a Hub user, I want to lock a card for a while and unlock it later, so that I can stop its use without closing it.
- **Context:** Wiki §4.7, BR-8. Figma [`8015:143240`](https://www.figma.com/design/9we1YVhB41SNAHXULwJJUZ/?node-id=8015-143240), [`8016:145592`](https://www.figma.com/design/9we1YVhB41SNAHXULwJJUZ/?node-id=8016-145592).
- **Scope:** Owns `src/scripts/card-manager-status.js`.
- **Reuse:** `OBModal` confirm pattern, toast, Badge.
- **Acceptance criteria:**
  - AC-1: ⋯ › Lock shows "Lock your card temporarily?" / "You can temporarily lock your card to restrict its usage without permanently closing it." / Cancel / **Yes, lock the card**.
  - AC-2: Confirming sets the status to **Blocked** (amber badge, in the details and the list). The menu becomes Unlock Card, Close, Remove.
  - AC-3: ⋯ › Unlock Card sets it back to Active. TODO(confirm): is a confirmation needed? Default: none, with a toast "Card unlocked."
  - AC-4: Light and dark, keyboard.
- **Depends on:** S3

## S8 ([TCDM-5227](https://agilepartners.atlassian.net/browse/TCDM-5227)) — [card-manager] Close card

- **Type:** Story · **Label:** card-manager
- **User story:** As a Hub user, I want to close a card I no longer need, moving any balance off it first, so that it can't be used but its history stays.
- **Context:** Wiki §4.8, BR-6, BR-7. Figma section [`8016:146107`](https://www.figma.com/design/9we1YVhB41SNAHXULwJJUZ/?node-id=8016-146107).
- **Scope:** Owns `src/scripts/card-manager-close.js`.
- **Reuse:** `OBModal`, C1 picker, checkbox, destructive (red) button style, toast or success dialog.
- **Acceptance criteria:**
  - AC-1: Balance = $0. ⋯ › Close shows "Close your card?" with the text from §4.8. Buttons: Cancel / **Yes, close the card** (red).
  - AC-2: Balance > $0. ⋯ › Close shows "You can't close this card right now" plus its text:
    - **Choose destination account to unload funds** (C1, placeholder "Select account").
    - Checkbox "Transfer $X from <card> to <selected account | selected account>, and agree to close this card".
    - Buttons: Back / **Transfer and Close Card** (red).
  - AC-3: With a balance, Transfer and Close is blocked until an account is picked and the box is ticked. The errors show inline.
  - AC-4: On success:
    - Balance = $0: "Card Closed" / "Your card <name> was closed."
    - Balance > $0: "The card balance of $X was transferred to <destination> and your <name> was closed."
    - In both cases: **Done**, the status becomes Closed, the card stays in the list (greyed), and its history is still viewable.
  - AC-5: Light and dark, keyboard.
- **Depends on:** S3, C1

## S9 ([TCDM-5228](https://agilepartners.atlassian.net/browse/TCDM-5228)) — [card-manager] Remove card

- **Type:** Story · **Label:** card-manager
- **User story:** As a Hub user, I want to remove a card permanently, so that it and its sensitive data are gone.
- **Context:** Wiki §4.9, BR-6, BR-7. Figma section [`8016:157241`](https://www.figma.com/design/9we1YVhB41SNAHXULwJJUZ/?node-id=8016-157241), expired [`8018:178726`](https://www.figma.com/design/9we1YVhB41SNAHXULwJJUZ/?node-id=8018-178726).
- **Scope:** Owns `src/scripts/card-manager-close.js` (start after S8 is merged; add `mode: 'remove'`).
- **Acceptance criteria:**
  - AC-1: Balance = $0 (also Expired cards). The dialog is **"Remove this card?"** with the text from §4.9. Buttons: Cancel / **Yes, remove the card**.
  - AC-2: Balance > $0. Same flow as S8 AC-2/3, with the words "You can't remove this card right now", "…and agree to **remove** this card" and **Transfer and Remove Card**.
  - AC-3: On success: "Card Removed" / "Your card <name> was removed." (or the transferred-balance version) / **Done**. The card is **gone from the list**. If it was the last card, the empty state shows.
  - AC-4: Light and dark, keyboard.
- **Depends on:** S8

## S10 ([TCDM-5229](https://agilepartners.atlassian.net/browse/TCDM-5229)) — [card-manager] Bill History tab

- **Type:** Story · **Label:** card-manager
- **User story:** As a Hub user, I want to see the bills a card paid, so that I can track what it was used for.
- **Context:** Wiki §4.10. Figma [`8019:120161`](https://www.figma.com/design/9we1YVhB41SNAHXULwJJUZ/?node-id=8019-120161), empty [`8019:119866`](https://www.figma.com/design/9we1YVhB41SNAHXULwJJUZ/?node-id=8019-119866).
- **Scope:** Owns `src/scripts/card-manager-bills.js`. It reuses `bills-payables-table.js` **read-only**. If it needs a hook there, open a separate ticket.
- **Acceptance criteria:**
  - AC-1: The columns are Amount, Bill Reference, Payee, Payment Type, Source, Due Date, Status, with the same badges, formats and font weights as Bills & Payables. Filters: funnel on Payment Type and Source only, each a single-column panel.
  - AC-2: The expanded row shows Notes, Attachments, Actions (Cancel Payment), Payment method details and Activity log, exactly as in Bills & Payables.
  - AC-3: The empty state shows "No Bill History" / "You don't have any bills" (`TableUi.emptyState`).
  - AC-4: **Export** in the header uses `TableExport` for this tab's rows.
  - AC-5: Light and dark, responsive.
- **Depends on:** S3

## S11 ([TCDM-5230](https://agilepartners.atlassian.net/browse/TCDM-5230)) — [card-manager] Transaction History tab

- **Type:** Story · **Label:** card-manager
- **User story:** As a Hub user, I want to see every transaction on a card, with its details, so that I can check or dispute a charge.
- **Context:** Wiki §4.11. Figma [`8024:126638`](https://www.figma.com/design/9we1YVhB41SNAHXULwJJUZ/?node-id=8024-126638), empty [`8024:124353`](https://www.figma.com/design/9we1YVhB41SNAHXULwJJUZ/?node-id=8024-124353).
- **Scope:** Owns `src/scripts/card-manager-transactions.js`.
- **Reuse:** table + expandable row (Bills), info banner, Badge, `TableUi.emptyState`, `TableExport`.
- **Acceptance criteria:**
  - AC-1: The info banner reads "For dispute request you can contact: 800-890-3128 or dispute-ticket@transcard.com".
  - AC-2: The columns are Transaction ID, Date/Time (sortable), Merchant Name, Amount, Status, Description.
  - AC-3: The expanded "Transaction Details" shows Transaction Code, Response Code, Response Description, Merchant Category Code, Transaction Type, Merchant Location, Fee. Rows with `externallyAdded` show the "Externally Added" badge.
  - AC-4: The empty state shows "No Transaction History" / "You don't have any transactions".
  - AC-5: Export via `TableExport`. Light and dark, responsive.
- **Depends on:** S3

## S12 ([TCDM-5231](https://agilepartners.atlassian.net/browse/TCDM-5231)) — [card-manager] Linked Credit Cards list

- **Type:** Story · **Label:** card-manager
- **User story:** As a Hub user, I want to see the external cards I linked, so that I know which funding sources I have.
- **Context:** Wiki §4.12, BR-10. Figma [`10001:269861`](https://www.figma.com/design/9we1YVhB41SNAHXULwJJUZ/?node-id=10001-269861), empty [`10001:257248`](https://www.figma.com/design/9we1YVhB41SNAHXULwJJUZ/?node-id=10001-257248).
- **Scope:** Owns `src/scripts/card-manager-linked.js`.
- **Acceptance criteria:**
  - AC-1: The header shows **Linked Credit Cards**, "Add your external cards for quick access and better financial management.", **Filter** and **+ Add New**.
  - AC-2: The info banner reads "Linked cards act only as origination accounts and cannot be used as payment methods."
  - AC-3: The columns are Card Number, Card Name, Expires, Payment Network (logo + name), Created, Status (Active = emerald, Inactive = gray). All are sortable. Filter = shared filter.
  - AC-4: The empty state shows the same text plus **Add Card**.
  - AC-5: A row click opens the linked card details (`?tab=linked&card=<id>`).
  - AC-6: Light and dark, responsive.
- **Depends on:** S0

## S13 ([TCDM-5232](https://agilepartners.atlassian.net/browse/TCDM-5232)) — [card-manager] Add linked card

- **Type:** Story · **Label:** card-manager
- **User story:** As a Hub user, I want to add an external credit card, so that I can use it as a funding source.
- **Context:** Wiki §4.12, BR-9. Figma [`10001:257969`](https://www.figma.com/design/9we1YVhB41SNAHXULwJJUZ/?node-id=10001-257969).
- **Scope:** Owns `src/scripts/card-manager-linked-add.js`.
- **Reuse:** `OBModal`, text inputs and the country select from existing forms, information circle + tooltip ("More info"), `OBField` validation if it fits.
- **Acceptance criteria:**
  - AC-1: The fields are:
    - Card number (`0000 0000 0000 0000`, auto-spaced)
    - Expiry (`MM / YY`)
    - CVC (with a "More info" tooltip)
    - Optional block: Name on Card (Full Name), Country, Address Line 1, Address Line 2, City, State, ZIP Code
  - AC-2: Card number, Expiry and CVC are required. Each one shows an inline error when it is empty or invalid. TODO(confirm): the error texts, and the number check (e.g. Luhn).
  - AC-3: If Name on Card is changed, Country, Address Line 1, City, State and ZIP become required. Address Line 2 stays optional (BR-9).
  - AC-4: Submit adds the card to the list as Active and updates the tab count. TODO(confirm): the submit label (default "Add Card").
  - AC-5: Back, ×, Esc close it without saving. Light and dark, keyboard.
- **Depends on:** S12

## S14 ([TCDM-5233](https://agilepartners.atlassian.net/browse/TCDM-5233)) — [card-manager] Linked card details + Remove

- **Type:** Story · **Label:** card-manager
- **User story:** As a Hub user, I want to see a linked card's details and remove it from view, so that I keep only the cards I use.
- **Context:** Wiki §4.12. Figma [`10001:268754`](https://www.figma.com/design/9we1YVhB41SNAHXULwJJUZ/?node-id=10001-268754), [`10001:269476`](https://www.figma.com/design/9we1YVhB41SNAHXULwJJUZ/?node-id=10001-269476).
- **Scope:** Owns `src/scripts/card-manager-linked-details.js`. Mounts the S10 Bill History read-only.
- **Acceptance criteria:**
  - AC-1: The header shows the holder name, status badge and **Remove from view**. The sub-tabs are Card Details · **Bill History**.
  - AC-2: Card Details shows the card visual, Card Number / Expires / CVC (masked, Reveal Details), Card Name, Created, Payment Network, Address.
  - AC-3: Remove from view shows "Are you sure you want to remove this card?" with the text from §4.12. Buttons: Cancel / **Yes, remove the card**.
  - AC-4: Confirming returns to the list, without the card, and updates the count.
  - AC-5: Light and dark, keyboard.
- **Depends on:** S12, S10
- **Open:** F-3 (when a linked card becomes Inactive) doesn't block this story.

---

## Working rules (put in the Epic)

- One branch per ticket: `feature/<JIRA-KEY>-<short-slug>`, from the latest `main`. One PR per ticket, linked to the ticket.
- Only edit the files the ticket owns. A change to a shared file (`nav.json`, `bills-payables-table.js`, `table-export.js`, the components skill, `design-tokens.js`) needs its own ticket. The exceptions are S0 (`nav.json`) and C1 (components skill).
- S5 and S9 share a file with S4 and S8: start them only after S4 / S8 are merged.
- Rebase on `main` before opening the PR. Bump `?v=` only on your own scripts.
- If behaviour changes while building, update `card-manager.md` in the same PR (only the sections you changed).
- Use the copy from the wiki exactly. If Figma and the wiki disagree, the wiki wins. Ask in the ticket.
