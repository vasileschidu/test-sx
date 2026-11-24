---
title: SMART Enroll — Speedy Sign up
type: flow
status: draft
last_reviewed: 2026-11-18
product: smart-enroll
area: speedy-sign-up
version: "R1"
figma: https://www.figma.com/design/jLooCmHwqJcYV5p5d8BHnO/-R1--SMART-Enroll?node-id=28003-23012
source: drafted from Figma jLooCmHwqJcYV5p5d8BHnO page 28003:23012 on 2026-11-17; decision D-9 (defaults accepted 2026-11-18); needs human review
---

# Speedy Sign up

A new business creates its account in **3 steps**, then lands in the [application](application-shell.md).
Entry: "Enroll now" on [Sign in](sign-in.md), or "Set Up a New Business" on Choose a Business.

Layout: top bar (SMART Hub logo · "Not sure where to start? Contact a Transcard SMART Specialist to help" · **Contact Us**),
centred 960 px column, step dots. The Figma frame is named "Step 1 of 4" but shows 3 steps; **3 is correct** (D-9).

## Step 1 of 3 — Business Information
Figma: [empty 28400:43229](https://www.figma.com/design/jLooCmHwqJcYV5p5d8BHnO/-R1--SMART-Enroll?node-id=28400-43229) ·
[filled 28400:43289](https://www.figma.com/design/jLooCmHwqJcYV5p5d8BHnO/-R1--SMART-Enroll?node-id=28400-43289) ·
[errors 28667:87991](https://www.figma.com/design/jLooCmHwqJcYV5p5d8BHnO/-R1--SMART-Enroll?node-id=28667-87991)

Title "First things first: Tell us about your business". Intro: "We need some information to verify the authenticity of
your company before you can start using SMART Hub. The information you provide will be reviewed by our compliance team."

| Field | Rule |
|---|---|
| Main Business Email Address | required, email |
| Main Business Phone Number | required |
| Zip / Postal Code | required |
| City | required |
| State / Province | required, select |
| Country | required, default United States |
| Business Legal Address | required |
| Business Legal Name | required |

Consent: "Must review Terms and Conditions and Privacy Policy before proceeding to the next step." Two rows —
"I've read and consent to the Terms of Use." / "…Privacy Policy." — each with **Review**. The checkbox becomes available
only after Review was opened ([28400:43349](https://www.figma.com/design/jLooCmHwqJcYV5p5d8BHnO/-R1--SMART-Enroll?node-id=28400-43349)).
Footer: "Only two more steps to go!" **Next Step**.

## Step 2 of 3 — Is this your business?
Figma: [28416:1664](https://www.figma.com/design/jLooCmHwqJcYV5p5d8BHnO/-R1--SMART-Enroll?node-id=28416-1664) ·
[selected 28416:7482](https://www.figma.com/design/jLooCmHwqJcYV5p5d8BHnO/-R1--SMART-Enroll?node-id=28416-7482)

"Here's what our search found. Don't worry if we didn't find your business, you can input the information that we need
for our onboarding process." Info: "If the address for your company record is outdated you'll be able to update it at a
later stage." Radio list of matches (name + address). Last option **No, this isn't my business.** with
"Manual procedure may extend processing time". **Back** / **Next Step**.

- Picking a match pre-fills Business Information.
- "No, this isn't my business" goes to Step 3 and flags the application for **manual review** (D-9).

## Step 3 of 3 — Your Contact Information
Figma: [28416:7678](https://www.figma.com/design/jLooCmHwqJcYV5p5d8BHnO/-R1--SMART-Enroll?node-id=28416-7678) ·
[filled 28416:8156](https://www.figma.com/design/jLooCmHwqJcYV5p5d8BHnO/-R1--SMART-Enroll?node-id=28416-8156) ·
[errors 28667:88052](https://www.figma.com/design/jLooCmHwqJcYV5p5d8BHnO/-R1--SMART-Enroll?node-id=28667-88052)

"Tell us how to contact you". Fields (all required): First Name, Last Name, What's your role within the business?,
Email Address, Phone Number. Submit → loader → application at Business Information.

## Errors
"<Field> is required" under each empty field (here without a full stop; the tabs use one — keep both as drawn).

## Prototype (TCDM-5243)
Page `src/pages/smart-enroll/sign-up.html` (`?step=1|2|3`, never past the furthest step reached; browser Back works),
script `src/scripts/smart-enroll/sign-up.js`, matches `src/data/smart-enroll-sign-up.json` (invented; the demo search
always returns this list). US states and the Terms of Use / Privacy Policy text come from `sd-virtual-card.json`.

- Field order follows Figma (Legal Name · Legal Address · Country · City + State · Zip · Email + Phone), not the table above.
- Next Step on Step 1 stays disabled until both consents are accepted (Review → scroll → Accept, `OBConsents`); then empty
  fields show "<Field> is required" and focus goes to the first one. Errors clear as fields are fixed.
- Step 3 Email Address = Step 1 Main Business Email, read-only (Figma 28416:7678); Phone Number starts with the Step 1 phone.
- Next Step on Step 3 → spinner → `application.html?tab=business-information&status=not-submitted`.

### Hand-off to the application: sessionStorage `se_signup_v1`
`window.SmartEnrollSignUp.STORAGE_KEY` / `.getState()` on the sign-up page. JSON:

| Key | Value |
|---|---|
| `version` | `1` |
| `step`, `reached` | current step / furthest step reached (1–3) |
| `business` | Step 1 as typed: `legalName, legalAddress, country, city, state, zip, email, phone` |
| `consents` | `{ terms: bool, privacy: bool }` |
| `matchId`, `match` | Step 2 pick (`{ id, name, legalAddress, city, state, zip, country }`) or `null` |
| `manualReview` | `true` after "No, this isn't my business." (D-9); a later pick sets it back to `false` |
| `contact` | Step 3: `firstName, lastName, role, email, phone` (= Applicant Information) |
| `prefill` | what Business Information shows: the match's name and address over Step 1, Step 1 email and phone |
| `submittedAt` | ISO time of the last Step 3 submit, else `null` |

### TODO(confirm)
- Next Step on Step 2 with nothing picked: Figma shows no state; the prototype shows "Select your business, or choose “No, this isn't my business.”".
- Invalid email on Step 1: Figma shows only "is required"; the prototype says "Enter a valid email address".
- Contact Us: no SMART Enroll frame; the prototype opens a dialog with the support phone / email from `smart-enroll.json` (copy buttons).
- "Sign in": Figma has no Sign in link on these steps; the SMART Hub logo links to `sign-in.html`.
- Figma error text "Zip/ Postal Code is required" is shipped as "Zip / Postal Code is required" (same as the label).
- Title / subtitle text styles differ from the `type-*` roles: DS-010; "No, this isn't my business." button colour: DS-011.
