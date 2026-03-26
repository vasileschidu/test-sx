# Icon System Audit

This audit defines which icons should default to Heroicons in React, and which should remain custom or require review.

## Use Heroicon

These are shared system controls and standard UI actions:

- close / dismiss
- chevron up / down / left / right
- back arrow
- refresh
- plus / add
- check / success
- info
- warning
- edit / pencil
- delete / trash
- ellipsis / overflow menu
- reveal / hide
- copy

## Keep Custom

These should not be blindly swapped:

- branded card / network marks
- payment method illustrations
- workflow-specific icons users already recognize
- custom product status icons
- decorative or non-generic illustrations

## Needs Review

These can use Heroicons as temporary placeholders in the design-system preview, but should not be rolled out until they are checked against the current product:

- bank / account icons
- generic card icons used in payment method rows
- any icon that currently has a distinctive filled treatment in Payables / Payment Preferences / SMART Exchange

## Recommended First React Icon Set

Default Heroicon-backed system set:

- `arrowLeft`
- `refresh`
- `check`
- `chevronDown`
- `chevronLeft`
- `chevronRight`
- `chevronUp`
- `close`
- `copy`
- `danger`
- `edit`
- `ellipsis`
- `eye`
- `eyeSlash`
- `info`
- `plus`
- `trash`

Review-only placeholders:

- `bank`
- `card`

## Rollout Guidance

Start with:

1. buttons
2. icon buttons
3. dialogs
4. dropdown triggers
5. inline reveal / copy / close actions

Do later, after visual review:

1. payment method rows
2. bank / card surfaces
3. branded or domain-specific flows
