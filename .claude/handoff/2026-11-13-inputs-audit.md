# Inputs audit, 2026-11-13 (read-only, no product files edited)

Script: /private/tmp/claude-502/-Users-user-Desktop-test-sx-repo/8723f64a-1125-425a-a61d-059537aeaa19/scratchpad/audit.py (rows in rows.json next to it).
Regex-based; JS strings that concatenate `OBField.INPUT` / `F.TEXTAREA` have no literal class and count as "OBField-built" (compliant by inheritance).

## Totals
- In scope: **255** (214 input, 10 textarea, 31 el-select trigger). dashboard 204, scripts 29, demo 17, tools 4, wiki 1.
- Excluded (separate): **43** (sd-uk 28, onboarding 7, SD-only scripts 8). smart-disburse/ has none.
- ~24 of the 255 are JS-built from OBField.INPUT/TEXTAREA or a local copy of it.
- Literal-class inputs: 100% have `rounded-md` except 4 `rounded-xl` (tools); 0 use ring/hex colours.

## Signature groups (H=hover, F=focus, D=dark, X=disabled, E=error; lowercase = missing)
| Count | Signature | Missing | Example |
|---|---|---|---|
| ~155 | "Dashboard classic": outline-1 gray-300, hover gray-400 (+dark), focus 2px blue-600, dark bg/text/outline, `py-1.5 text-base sm:text-sm/6` | disabled, error, dark focus blue-500, ~88 lack dark:placeholder, no shadow-xs | payment-program-configuration.html:277 `pp-name`; consumer-payment-preferences.html (40) |
| ~51 | "h-10 OB-like": `h-10 px-3 text-base font-medium shadow-xs`, hover+focus+dark | disabled, error, dark focus, dark placeholder | payments pages `h-10 ... hover:outline-gray-400` |
| 31 | el-select triggers | **hover on all 31**, error on 29, 8 use `focus-visible:outline-indigo-600` (copied from the components skill snippet), 9 are `h-8 text-sm` | payment-preferences.html (8), consumer-payment-preferences.html (7) |
| 17 | demo stp-case: aria-invalid + hover + focus + dark | disabled, dark placeholder, dark focus | demo/stp-case.html:97 `f-supplier-name` |
| 19 | search/filter inputs: `h-[33px]`, `border border-gray-300`, `shadow-[0px_1px_1px_rgba(0,0,0,0.05)]`, hover:not-focus:border | outline model, raw px/shadow, no error | supplier-portal.html:1695 |
| ~24 | OBField-built (JS) | none by design (full state set) | um-invite.js:78, bank-details.js:59 |
| 4 | tools token-test: `rounded-xl border`, `focus:border-blue-500`, outline-none | hover, focus ring, radius, font | tools/sd-sx-token-test.html:82 |
| 4 | disabled/readonly or inline borderless | see defects | payables-pay.html:1838, consumer-payment-preferences.html:1339 |
| 1 | no class at all | everything | user-management.html:217 `umr-description` |

Global: only **4** fields have any `disabled:` styles; only **20** have an aria-invalid style (17 are stp-case); **0** native `disabled` inputs lack styling but also none of ~230 would show disabled look.

## Defects, by impact
1. **Textarea with no classes** (unstyled, no focus/dark): user-management.html:217 `umr-description`.
2. **No focus ring**: `focus:outline-none` with nothing replacing it: payables-pay.html:1321, 2055, 2103; payment-preferences.html:510, 5175; consumer-my-cards.html:79; consumer-my-cards.js:540; stp-state.js:1157. Borderless amount inputs with no focus: payables-pay.html:1838, 1852. tools token-test (82, 114, 130, 209) only `focus:border-blue-500` + outline-none.
3. **Local copies of OBField classes missing hover**: consumer-my-profile.js:81-82 (INPUT, MODAL_INPUT; also no dark placeholder / `font-normal`). stp-state.js:1032 SETUP_INPUT_CLASS (ok on hover, no dark focus). vendors-page.js:884 INPUT_CLASS (no error, no disabled). Fix: use `OBField.INPUT`. 
4. **Missing disabled state**: ~250/255 (only payables-pay.html:1216, 1838, 1852 and my-company-profile.html:620 have `disabled:`). consumer-payment-preferences.html:1339 hand-codes `cursor-not-allowed bg-gray-50` (no dark).
5. **Missing error state** (no aria-invalid style): 233 (every field outside stp-case, payables-pay x2, um-accept). Includes selects (29/31), required fields on payments/profile pages.
6. **Select triggers have no hover** (31, all) and 8 use indigo focus: supplier-portal.html:843, 1054; consumer-payment-preferences.html:345, 491, 597; consumer-payments-received.html:398, 519, 658. Skill snippet itself says indigo-600 and no hover: fix the doc too.
7. **Dark mode gaps**: 88 inputs lack `dark:placeholder:text-gray-500` (consumer-payment-preferences 31, consumer-payments-received 20, stp-case 17, my-company-profile 16, ...); 247 lack `dark:focus:outline-blue-500` (all of the classic group; OBField uses blue-400, skill says blue-500: pick one).
8. **Raw px / arbitrary values**: `shadow-[0px_1px_1px_rgba(0,0,0,0.05)]` x19 (payables-pay 6, supplier-portal 5, bills-and-payables 4, consumer-payments-received 4: lines 139, 334, 407, 414 / 1507, 1695, 1738, 1802, 1809 / 519, 720, 956, 1124, 1395, 1569 / 944, 1013, 1039, 1046); `h-[33px]` x4 (supplier-portal.html:1695, 1738; bills-and-payables.html:334; consumer-payments-received.html:1013); `w-[160px]` payables-pay.html:1321, 2055, 2103; `pl-[76px]` virtual-card.js:168; `h-[126px]` vendors-page.js:1201.
9. **Off-scale height/radius/font**: 
   - `h-10` plus `py-1.5`/`py-2` conflicting: 19 (payables-pay 7, bills-and-payables 6, user-management 2, supplier-portal 2, vendors.html 1, vendor-profile-page.js 1).
   - Height mix: py-1.5 (~74+), h-10 (~93), h-8 (15; payment-preferences 6, consumer-payment-preferences 4), py-2.5 (8), one h-9 (wiki/index.html:63), `h-[33px]` (4).
   - Font: `text-base` only (68), `text-base sm:text-sm/6` (85+17), `text-sm` only (22); 17 in payment-preferences.html repeat `text-base` twice.
   - `rounded-xl`: tools/sd-sx-token-test.html:82, 114, 130, 209.
   - `px-4 py-2.5 text-sm`: payment-preferences.html:3263, 3276, 3291, 3305, 3324.
10. **Border-based (not outline) group** (18, payables-pay 6, token-test 4, supplier-portal 3, bills 2, payments-received 2): different dark border (`white/15`) from outline `white/10`.
11. No `shadow-xs` on 154 (all of the "classic" group); the skill says shadow-xs on inputs.

## Files holding most
consumer-payment-preferences.html (40), consumer-payments-received.html (37), payables-pay.html (33), payment-preferences.html (33), supplier-portal.html (23), demo/stp-case.html (17), my-company-profile.html (16). In JS: vendors-page.js, um-invite.js, um-accept.js, consumer-my-profile.js.

## Proposed canonical variants (all from OBField / components skill)
1. Default input (use `data-ob-input` or `OBField.INPUT`):
`block h-10 px-3 aria-invalid:pr-10 w-full rounded-md bg-white dark:bg-white/5 text-base leading-6 font-medium text-gray-900 dark:text-white shadow-xs outline-1 -outline-offset-1 outline-gray-300 dark:outline-white/10 placeholder:font-normal placeholder:text-gray-400 dark:placeholder:text-gray-500 not-aria-[invalid=true]:hover:not-focus:not-disabled:outline-gray-400 dark:not-aria-[invalid=true]:hover:not-focus:not-disabled:outline-white/20 aria-[invalid=true]:hover:not-focus:not-disabled:outline-red-400 focus:outline-2 focus:-outline-offset-2 focus:outline-blue-600 dark:focus:outline-blue-400 disabled:cursor-not-allowed disabled:bg-gray-50 dark:disabled:bg-white/10 disabled:text-gray-500 dark:disabled:text-gray-400 aria-invalid:text-red-900 dark:aria-invalid:text-red-300 aria-invalid:outline-red-300 aria-invalid:focus:outline-red-500` (= OBField.INPUT, the full string lives in onboarding-field.js:25-35)
2. Leading $ / icon: variant 1 + `pl-10` (icon: `pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-gray-400`), wrapper `relative`; `$` prefix: same with a `text-gray-500` span, input `pl-7`.
3. Textarea: `OBField.TEXTAREA` = variant 1 with `block px-3 py-2` instead of `h-10 px-3 aria-invalid:pr-10`, plus `min-h-24 resize-y`.
4. Select trigger: components-skill trigger, normalised to the input model: `grid h-10 w-full cursor-default grid-cols-1 items-center rounded-md bg-white pr-2 pl-3 text-left text-base/6 font-medium text-gray-900 shadow-xs outline-1 -outline-offset-1 outline-gray-300 hover:outline-gray-400 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-blue-600 aria-invalid:outline-red-300 dark:bg-white/5 dark:text-white dark:outline-white/10 dark:hover:outline-white/20 dark:focus-visible:outline-blue-400` (adds hover, swaps indigo for blue; both already used by the shipped h-10 selects).
5. Small filter input (h-9, search with leading icon): variant 1 with `h-9 text-sm leading-5 pl-9` (replaces the `h-[33px] border shadow-[...]` group; needs a skill row for the small size, nothing like it exists yet).

## Open questions for the owner
- Dark focus colour: OBField uses blue-400, spec says blue-500, 4 files use blue-500.
- `h-8 text-sm` selects in preferences pages: keep as a "compact" size or move to h-9/h-10?
