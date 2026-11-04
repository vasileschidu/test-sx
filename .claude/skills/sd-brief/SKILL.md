---
name: sd-brief
description: Turn Andrian's short SMART Disburse requests (Romanian or English, often a screenshot or Figma link with few words) into a precise brief — what, where (sandbox / Figma / both, pages or frames, phone/tablet/desktop), expected result — and pick who executes (me directly or sd-sandbox / sd-figma / sd-qa / sd-flow-mapper). Apply automatically to every SD request; `/sd-brief <request>` shows the full brief and waits for confirmation before starting.
---

# sd-brief: from Andrian's message to a clear task

Two modes, same steps:

- **Automatic** (every SD request): build the brief in your head. If the request is small and clear, just do
  it. If it is big or ambiguous, write **one line** first — `Înțeleg: <ce> · <unde> · <rezultat>. Pornesc?` — and
  ask about anything genuinely unclear in that same line. No question rounds, no rewriter agent.
- **`/sd-brief <request>`**: always show the full brief below (in the language Andrian wrote in) and **wait for confirmation**
  before touching Figma or code.

Rules, sizes and structures come from `sd-design-rules`; this skill only decides *what is asked* and *who does it*.

## 1. Read the request with its context

1. Use the whole conversation: "ca înainte", "cum am făcut", "ca la 6.6" point to something earlier — find it.
2. Open what was attached: Figma link → `node-id` (`-` → `:`), screenshot → which page, breakpoint and element.
3. A screenshot with no text means "this is wrong — find out why and propose a fix". Diagnose, don't guess.
4. Check memory and `sd-design-rules` for a rule that already answers the question.

## 2. Phrase dictionary

Andrian writes in Romanian or English; the English equivalents in brackets mean the same.

| Andrian writes | Means |
|---|---|
| "pentru ambele", "sandbox și figma" ("for both") | change both sandbox and Figma, keep them in sync |
| Figma link + "repară" / "fă ca aici" ("fix", "like here") | change in **Figma** (the link is the target or the reference) |
| "ca în sandbox" ("like the sandbox") | the sandbox is the reference; Figma must match it |
| "fă pentru unul", "dă să facem pentru un modal" ("do one first") | **pilot** one item, send it for review, stop |
| "treci peste toate", "fă la toate" ("apply to all") | roll the approved pilot out to every similar item |
| "hai 1", "1", "da" after options | the first / proposed option |
| "lasă cum era", "readu" ("put it back", "revert") | restore the previous version (check git or the Figma version first) |
| "transmite link", "dă-mi link" ("send the link") | local sandbox URL `http://localhost:8080/...` of the affected page |
| "fă push" ("push") | run **`sd-ship`**: cache-buster, regression check, commit, push to **`andrian-sandbox` only** (Vasile merges into main) |
| "verifică", "vezi te rog" ("check", "look at") | inspect and report first; fix only what was asked |
| "telefon / tabletă / desktop" | 375 / 768 / 1280 (breakpoints ≤767, 768–1023, ≥1024) |
| a person's name ("ce a făcut Alina") | **`sd-regression`**: `changes.mjs --since … --author …` (+ `--commit X --visual`); report only, change nothing |
| "s-a stricat ceva?", "verifică tot" ("did anything break?") | **`sd-regression`** for the sandbox, prototype audit (`figma-sd-techniques` §4c) for Figma |

Not sure a phrase fits? Say how you read it in the confirmation line.

## 3. Brief

```
Ce:        <the change, one sentence>
Unde:      sandbox / Figma / ambele · <pages, scripts or frames + node ids> · telefon / tabletă / desktop
Referință: <Figma node, sandbox page, screenshot, or earlier decision>
Rezultat:  <how we know it is done: render at 375/768/1280, prototype behaviour, QA pass>
Execută:   eu direct / sd-sandbox / sd-figma / sd-qa / sd-flow-mapper (+ order)
Pași:      pilot → review Andrian → rollout   (only for multi-item work)
```

## 4. Who executes

| Work | Executor |
|---|---|
| A handful of tool calls, a lookup, a one-file fix | **me, directly** — don't spawn an agent |
| Code changes across several pages or scripts | `sd-sandbox` |
| Figma changes across many frames, arrows, tablet frames | `sd-figma` (pilot by me or by it first) |
| Sandbox vs Figma comparison, regression check after a change | `sd-qa` |
| New arrows or screens, "does Figma match the flow?" | `sd-flow-mapper` first, then `sd-figma` |
| Sandbox **and** Figma | `sd-sandbox` and `sd-figma` in parallel, then `sd-qa` |

Agents live in `repo/.claude/agents/`. If the session did not start in `repo`, spawn a general-purpose agent and
tell it to read its role file plus `sd-design-rules`. Give it the brief, not just Andrian's words.

## 5. Scope guards (say so in the brief if a request crosses one)

- SD scope is **US Default + US Multi-Party** only. SD-UK and dashboard/shared code: report, don't change.
- Never edit `repo/wiki` (Cristian's) — report gaps.
- Don't move or redraw Andrian's own Figma arrows without approval.
- Work in small steps; check in after each pilot.
