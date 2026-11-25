---
title: SMART Enroll — Sign in
type: flow
status: draft
last_reviewed: 2026-11-24
product: smart-enroll
area: sign-in
version: "R1"
figma: https://www.figma.com/design/jLooCmHwqJcYV5p5d8BHnO/-R1--SMART-Enroll?node-id=28003-23013
source: drafted from Figma jLooCmHwqJcYV5p5d8BHnO page 28003:23013 on 2026-11-17; decisions D-7, D-8 (defaults accepted 2026-11-18); needs human review
---

# Sign in

How a returning applicant gets back into SMART Enroll, and how they reach SMART Hub once approved.
Index: [standard.md](../standard.md). Layout: centred card on a plain page, "SMART Suite · Powered by Transcard",
footer Terms of Use • Privacy Policy.

## Steps

| # | Screen | Figma | What happens |
|---|---|---|---|
| 1 | Sign into SMART Suite | [28429:27507](https://www.figma.com/design/jLooCmHwqJcYV5p5d8BHnO/-R1--SMART-Enroll?node-id=28429-27507) | Email field, **Sign in**. "Don't have an account? **Enroll now**" opens [Speedy Sign up](speedy-sign-up.md). |
| 2 | Enter the 6 digit code | [28437:29823](https://www.figma.com/design/jLooCmHwqJcYV5p5d8BHnO/-R1--SMART-Enroll?node-id=28437-29823) | "A one-time passcode has been sent to <email>". Six boxes, **Submit**, **Resend Code**. |
| 2b | Pick an account (Microsoft) | [28437:30146](https://www.figma.com/design/jLooCmHwqJcYV5p5d8BHnO/-R1--SMART-Enroll?node-id=28437-30146) | Only for accounts linked to Microsoft (D-7), instead of the code. |
| 3 | Choose a Business | [28456:32053](https://www.figma.com/design/jLooCmHwqJcYV5p5d8BHnO/-R1--SMART-Enroll?node-id=28456-32053) | Only when the user belongs to more than one business (D-8). Search, list (initials avatar, name, ID, who invited them), **Set Up a New Business** → Speedy Sign up, **Sign Out**. |
| 4 | Select Platform | [28437:30376](https://www.figma.com/design/jLooCmHwqJcYV5p5d8BHnO/-R1--SMART-Enroll?node-id=28437-30376) | Only when the chosen business is **Approved** (D-8). "Hi <first name>, For edits to your enrollment please select SMART Enroll. To begin managing your payments, select SMART Hub:" Two cards: **SMART Enroll** "Onboarding portal for SMART Suite access" → *Go to Onboarding Portal*; **SMART Hub** "Portal to initiate and manage payments" → *Go to SMART Hub*. |
| — | Loading | [28465:1005](https://www.figma.com/design/jLooCmHwqJcYV5p5d8BHnO/-R1--SMART-Enroll?node-id=28465-1005) | Full-page spinner between steps. |

Otherwise the user lands on the [application](application-shell.md) at the first incomplete tab.

## Errors

| Case | Message | Figma |
|---|---|---|
| Empty email | Email address is required | [28682:80726](https://www.figma.com/design/jLooCmHwqJcYV5p5d8BHnO/-R1--SMART-Enroll?node-id=28682-80726) |
| Empty code | The code is required | [28682:80802](https://www.figma.com/design/jLooCmHwqJcYV5p5d8BHnO/-R1--SMART-Enroll?node-id=28682-80802) |
| Unknown email | Your email address does not exist in our records, please click on the 'Enroll now'. | [28682:81133](https://www.figma.com/design/jLooCmHwqJcYV5p5d8BHnO/-R1--SMART-Enroll?node-id=28682-81133) |
| Locked after repeated failures | Your account has been locked due to multiple unsuccessful login attempts… contact support | [28682:82192](https://www.figma.com/design/jLooCmHwqJcYV5p5d8BHnO/-R1--SMART-Enroll?node-id=28682-82192) |
| Wrong or expired code | Code is invalid or expired. | [28682:81210](https://www.figma.com/design/jLooCmHwqJcYV5p5d8BHnO/-R1--SMART-Enroll?node-id=28682-81210) |

TODO(confirm): support address — Figma shows two different domains (locked-account message vs the Submission v2 page).
The prototype uses a single placeholder support address.

## Prototype notes
Page: `src/pages/smart-enroll/sign-in.html` (script `src/scripts/smart-enroll/sign-in.js`, data
`src/data/smart-enroll-sign-in.json`). Built in TCDM-5242.
- No real auth: any email works and any 6 digits pass, except for the demo emails below.
- Number of failed attempts before locking: TODO(confirm); the prototype uses 5 (`failedAttemptsBeforeLock`). The lock lasts
  for the browser tab (sessionStorage `se_signin_v1`).
- Demo emails (also listed under "Demo emails" below the page footer):

| Email | What happens |
|---|---|
| any other email | one Not submitted business → application |
| `multi@smart-enroll.demo` | 5 businesses → Choose a Business; Northwind (Approved) → Select Platform, the others → application with their status |
| `approved@smart-enroll.demo` | one Approved business → Select Platform |
| `microsoft@smart-enroll.demo` | Microsoft account picker instead of the code, then Choose a Business |
| `locked@smart-enroll.demo` | every code is wrong ("Code is invalid or expired."); the 5th locks the account |
| `unknown@smart-enroll.demo` | "Your email address does not exist in our records…" |

- Review links: `?step=email|code|microsoft|business|platform|locked&email=<demo email>`.
- Entering the application stores the business id in sessionStorage `se_business_v1` and opens
  `application.html?status=<business status>`. Businesses that are not in `smart-enroll.json` (Harbor, Cedar, Lumen) show the
  shell's first business name.
- TODO(confirm): the code info-circle tooltip text (not in Figma; the User Management invite copy is reused) and the ⋮ menu on
  the Microsoft account row (not built; the screen is a bitmap in Figma). Empty email / code only: Figma has no "invalid
  email format" message, so any non-empty email is accepted.
