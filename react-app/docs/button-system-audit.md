# Button System Audit

This audit defines the first canonical React button system for the product.

The source of truth is the current static app, not Catalyst.

## Findings

The product does not use dozens of truly different button styles. Most usage collapses into a small set of repeated patterns:

1. Primary action
- Typical classes:
  - `rounded-md bg-blue-600 px-2.5 py-1.5 text-sm font-semibold text-white shadow-xs hover:bg-blue-500`
  - `rounded-md bg-blue-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-blue-500`
- Common contexts:
  - filter apply buttons
  - modal confirm actions
  - next/continue/confirm buttons
  - primary CTA buttons

2. Secondary action
- Typical classes:
  - `rounded-md bg-white px-2.5 py-1.5 text-sm font-semibold text-gray-900 shadow-xs inset-ring inset-ring-gray-300 hover:bg-gray-50`
  - `rounded-md bg-white px-3.5 py-2.5 text-sm font-semibold text-gray-700 shadow-xs ring-1 ring-inset ring-gray-300 hover:bg-gray-50`
- Common contexts:
  - cancel buttons
  - export/view buttons
  - modal secondary actions
  - form back actions

3. Gray utility button
- Typical classes:
  - `rounded-md bg-gray-100 px-2.5 py-1.5 text-sm font-semibold text-gray-700 hover:bg-gray-200`
- Common contexts:
  - refresh
  - schedule/cancel utility controls
  - compact header tools

4. Destructive action
- Typical classes:
  - `rounded-md bg-red-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-red-500`
- Common contexts:
  - destructive confirms in dialogs

5. Blue text / reveal / inline action
- Typical classes:
  - `inline-flex items-center gap-2 rounded-md px-2.5 py-1.5 text-sm font-semibold text-blue-600 hover:bg-blue-600/10`
- Common contexts:
  - reveal details
  - add payer
  - review/inline secondary action

6. Icon-only button
- Typical classes:
  - `inline-flex h-8 w-8 items-center justify-center rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-500`
  - `inline-flex size-6 items-center justify-center rounded-md bg-gray-100 text-gray-700`
- Common contexts:
  - close buttons
  - back buttons
  - row/tool icons

7. Copy controls
- Typical classes:
  - `copy-btn -ml-1 inline-flex w-fit items-center gap-1.5 rounded-md px-1.5 py-0.5 text-gray-700 transition-colors hover:bg-gray-200`
- Common contexts:
  - copyable IDs
  - copyable bank/card/account fields

## Canonical decision

The first button system should be:

- `Button`
- `IconButton`

Copy controls should remain a special-purpose control for now, not part of the main button API.

Reason:
- they are semantically different
- they are much smaller
- they often depend on copy-enabled/disabled state and inline text layouts

## Canonical API

### Button

Supported props:
- `tone`
  - `primary`
  - `secondary`
  - `secondaryStrong`
  - `utility`
  - `danger`
  - `link`
- `size`
  - `sm`
  - `md`
- `href`
- `type`
- `disabled`
- `block`
- `className`

Not included yet:
- `loading`
- `iconOnly`
- `fullWidth` as separate prop

Reason:
- `block` is enough for current usage
- icon-only is better as `IconButton`
- loading exists conceptually but is not repeated enough yet to standardize

### IconButton

Supported props:
- `tone`
  - `plain`
  - `subtle`
- `size`
  - `xs`
  - `sm`
  - `md`
- `href`
- `type`
- `disabled`
- `className`

## Mapping

Use these mappings during migration:

- blue CTA / confirm / next / apply -> `Button tone="primary"`
- white outline/inset action -> `Button tone="secondary"` or `secondaryStrong`
- gray utility -> `Button tone="utility" size="sm"`
- destructive confirm -> `Button tone="danger" size="md"`
- reveal / review / add inline action -> `Button tone="link" size="sm"`
- close/back/action icon -> `IconButton tone="plain"` or `subtle`

## Migration order

1. Replace repeated modal footer buttons
2. Replace compact header utility buttons
3. Replace repeated primary/secondary form actions
4. Replace inline reveal/review actions
5. Replace icon-only actions
6. Leave copy buttons for a dedicated `CopyButton` abstraction later

## Components that should stay separate for now

- copy buttons
- segmented chips that look button-like
- menu triggers with custom split layouts
- filter shell triggers if they need special widths/anchoring

## Guardrail

If replacing a button with the wrapper changes spacing, width, or visual density, keep the current markup and revisit after more variants are proven.
