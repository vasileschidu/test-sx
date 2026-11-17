# Hand-off — SMART Enroll, Batch 1 (Figma inventory) — 2026-11-17

Master prompt: `wiki/module-master-prompt.md`, **product mode**. Branch `wiki/smart-enroll` (based on PR #30's branch).
Figma: [R1] SMART Enroll `jLooCmHwqJcYV5p5d8BHnO` (figma-b). Link pattern:
`https://www.figma.com/design/jLooCmHwqJcYV5p5d8BHnO/-R1--SMART-Enroll?node-id=<id with - instead of :>`

Code: nothing exists yet. `src/pages/sx-enroll/` is **SMART Exchange supplier enrollment**, not SMART Enroll.
SMART Enroll gets its own folder `src/pages/smart-enroll/` (greenfield, no conflict with anyone).

Sample data in Figma (business names, people, addresses) is demo data — never copy it into the wiki; use neutral
placeholders. A partner co-brand logo appears in the newest Submission frames — don't name it in the wiki.

## Pages in the file

| Page | id | In scope? |
|---|---|---|
| ↳ Speedy Sign up | 28003:23012 | yes |
| ↳ Sign in/Sign up | 28003:23013 | yes |
| ↳ AP/AR Payments (Starting point) | 28003:44893 | yes — base product, all tabs |
| ↳ ⊕ Merchant Services | 28003:46286 | yes — add-on |
| ↳ ⊕ Cross-Border Payments | 28598:246304 | yes — add-on |
| ↳ Submission | 28676:83254 | yes |
| ↳ Errors ⚠️ | 28632:79121 | yes — required-field states per tab |
| For Review, In Development, Unchanged, Changelog | — | empty |
| Drafts, Cover | — | no (old work) |

All frames are desktop 1728 wide. No tablet/mobile.

## A. Inventory by area

### A1. Sign in / Sign up (page 28003:23013) — layout: centred card, "SMART Suite · Powered by Transcard"
| Frame | id | Content |
|---|---|---|
| Sign into SMART Suite | 28429:27507 | Email field, **Sign in**; "Don't have an account? **Enroll now**"; footer Terms of Use • Privacy Policy |
| Enter the 6 digit code | 28437:29823 | "A one-time passcode has been sent to <email>"; 6 boxes; **Submit**; **Resend Code** |
| Pick an account (Microsoft) | 28437:30146, hover 28456:32031 | Microsoft account picker |
| Select Platform | 28437:30376 | "Hi <first name>, For edits to your enrollment please select SMART Enroll. To begin managing your payments, select SMART Hub:" two cards: **SMART Enroll** "Onboarding portal for SMART Suite access" → *Go to Onboarding Portal*; **SMART Hub** "Portal to initiate and manage payments" → *Go to SMART Hub* |
| Choose a Business | 28456:32053 | "Choose a Business to continue with Onboarding"; Search business; list (initials avatar, name, ID, inviter email); **Set Up a New Business**; **Sign Out** |
| SMART Loading (Spinner) | 28465:1005, 28465:1238 | full-page loader |
| Errors | 28682:80726, 28682:80802, 28682:81133, 28682:82192, 28682:81210 | "Email address is required"; "The code is required"; "Your email address does not exist in our records, please click on the 'Enroll now'."; "Your account has been locked due to multiple unsuccessful login attempts… contact … support@smart-enroll.com…"; "Code is invalid or expired." |

### A2. Speedy Sign up (page 28003:23012) — layout: top bar (SMART Hub logo, "Not sure where to start? Contact a Transcard SMART Specialist to help", **Contact Us**), centred 960 column, step dots
| Frame | id | Content |
|---|---|---|
| Step 1 of 3 (frame name says "of 4") | 28400:43229 · filled 28400:43289 · checkbox 28400:43349 / 28400:43409 · error 28667:87991 | "First things first: Tell us about your business" · Business Information · "We need some information to verify the authenticity of your company before you can start using SMART Hub. The information you provide will be reviewed by our compliance team." Fields: Main Business Email Address, Main Business Phone Number, Zip / Postal Code, City, State / Province, Country (default United States), Business Legal Address, Business Legal Name. Terms: "Must review Terms and Conditions and Privacy Policy before proceeding to the next step." two rows "I've read and consent to the Terms of Use." / "…Privacy Policy." each with **Review** (checkbox appears after review). Footer "Only two more steps to go!" **Next Step** |
| Step 2 of 3 | 28416:1664 · selected 28416:7482 | "Is this your business? If so, click on the link below." · "Here's what our search found. Don't worry if we didn't find your business, you can input the information that we need for our onboarding process." Info: "If the address for your company record is outdated you'll be able to update it at a later stage." List of matches (name + address). **No, this isn't my business.** + "Manual procedure may extend processing time". **Back** / **Next Step** |
| Step 3 of 3 | 28416:7678 · filled 28416:8156 · error 28667:88052 | "Tell us how to contact you" · Your Contact Information · "Let our onboarding team know how to get in touch with you…" Fields: First Name, Last Name, What's your role within the business?, Email Address, Phone Number |
Errors: "<Field> is required" for every field (no trailing period here; the tabs use a period).

### A3. Application shell (all tabs) — Menu anatomy 28107:8955; standard frame 28471:37074
- **Top bar:** SMART Hub logo · **Invite people** (+ info icon) · avatars of people on the application · business switcher (name + chevrons) · **Next Step** (primary).
- **Left panel:** "Application Progress" + % badge + bar · status box · "What are you looking to do?" list: AP/AR Payments (selected, base), Supply Chain Financing, Merchant Services, Cross-Border Payments (each with ⊕ to add, info icon) · "Help from Transcard" (collapsible; anatomy shows "SMART Suite Knowledge Base — To view all SMART Suite FAQs and Transcard User Guides…") · footer Powered by Transcard, Terms of Use • Privacy Policy.
- **Main card:** tabs with status icon (✓ done, spinner = in progress): Business Information · Ownership · [Financial] · [Transactional] · [Business Plan] · Connectors · Configuration. Card header: title + description + Invite people + avatars. Footer: ‹ previous tab / next tab ›.
- **Statuses** (section 28370:15445):
  | Status | frame | Text |
  |---|---|---|
  | Pending enrollment data (amber) | 28471:32962 | "Your application is under review and additional information is needed. You should have received an email from our customer service team indicating that information, if you have not received an email, please contact our Customer Service team at 800-890-3128" |
  | Pending Approval | 28471:31765 | "We are completing our final checks and setups for you to use SMART Hub. You'll receive an email soon when the process is complete. If you have any questions, please contact our Customer Service team at 800-890-3128" |
  | Approved | 28471:33991 | "Your application to use SMART Hub has been approved. You should have received an email with your SMART Hub URL. If you did not receive an email, please contact our Customer Service team at 800-890-3128" |
  | Declined | 28471:35020 | "Unfortunately, your application has been declined based on the information that we received as part of the enrollment process. If you believe that our decision was made in error, please contact a member of our Customer Service team at 800-890-3128" |
  | Suspended | 28471:36047 | "Your SMART Hub account has been suspended following an internal review. If you believe this to be an error, please contact a member of our Customer Service team at 800-890-3128" |

### A4. Business Information tab (section 28495:22778)
Frames: Initial 28471:37074 · DBA = YES 28570:55462 / 28570:56408 · Dropdowns 28476:47758, Org ID more 28476:50922 · Errors 28632:81938.
"Please provide your information below." Banner "Not your business? **Change**" (dismissible ×).
Fields: Business Legal Name · Reference ID (Optional, info: "Please enter any internal identifier in this field. This number is used for your internal tracking and reference purposes.") · Business Icon (Optional; "Icon must ne square shaped and at least 16x16 pixels." [sic]; Upload) · Business Logo (Optional; "Logo must be 512 pixels in height…"; Upload) · Business Structure (select: Sole Proprietorship, General Partnership, Corporations (C-Corp and S-Corp), Limited Liability Company (LLC)…) · Stock Symbol (Optional) · Country (disabled, United States) · Legal Address · Address Line 2 (Optional) · City · ZIP / Postal Code · State / Province (select) · Main Business Phone Number · Main Business Email Address · Business Website URL (http:// prefix) · grey box "Your Customer Service Contact": Email, Phone Number · Organization Identification Type (select: Tax Identification Number, Bank Party Identification, Central Bank Identification Number, Legal entity identification, Business identification code, GS1GLN Identifier, Employer Identification Number, Data Universal Numbering System, Country Identification Code, Certificate Of Incorporation Number, Clearing Identification Number, Customer Number, Business Number…) · ID number · "Do you operate under a fictitious name / Doing Business As (DBA)?" YES / NO → YES: "Please input your Fictitious / Doing Business As (DBA) name:" DBA Name + "Fictitous / DBA business name statement" upload (PDF, Excel (.xls, .xlsx), CSV up to 8MB); delete confirm "Are you sure you want to do this?" Delete / Cancel.
Applicant Information (read-only, from Speedy Sign up): Applicant Name, Applicant Business Role, Applicant Email, Applicant Phone Number.
Errors: "<Field> is required." per field.
Comments: TIN stays **only** as an option in the Org ID Type dropdown (decided 2026-10-20, overrides the 2026-10-07 note to add a separate TIN field).

### A5. Ownership tab (section 29777:35602) — newest design (2026-04)
- Initial 29761:29724: "Beneficial Ownership — Please provide information on all owners of the business." Empty box "Add owners to provide the business ownership breakdown — The total must be of 100%." **+ Add Owner** · "Total breakdown 0 / 100%". Legal Entity: "Please provide the documents related to your business organization." Attach the Organization Document ("Articles of Incorporation, Articles of Association or Articles of Organization"), upload PNG, JPG, GIF up to 10MB.
- Owner form (Individual 29767:30351…, Legal 30219:58052…): Owner N · Entity Type (Individual / Legal Entity) · First Name · Last Name (Legal: name) · "Is the ownership share equal or higher than 20%?" No / Yes · Ownership Share or Voting Rights (0.00) · **Save**.
- ≥ 20% Individual → "Additional Details" (30219:54511): Date of Birth (MM-DD-YYYY), Nationality, Address Line 1, City, State / Province, Zip / Postal Code, Phone Number, Email, ID (select: Passport, Driver's License, SSN, Other government issued ID — 30219:74341), ID Number, ID Issuing Country, Government Issued Identification upload ("Legible and not expired, one of: Passport, Drive License, ID card").
- ≥ 20% Legal (30219:68324): Address, Building, Apt., City, State, ZIP, Business Contact Number, Business Email, Country of Incorporation.
- Saved owner collapses to a row "Name — N% ownership" with expand / Save changes; total updates (e.g. 10 → 75 → 80 → 100). Total 100% frame 30219:75173. Remove owner confirm 30219:79063 (**Confirm**).
- Errors (section 30198:47456): "First Name is required.", "Last Name is required.", "Please select an option.", "Ownership Share or Voting Rights is required.", "Enter an ownership share of 20% or more." (answered Yes but < 20), "Enter an ownership share below 20%" (answered No but ≥ 20), plus "<Field> is required." for each additional detail.
- Comment (2026-04-10): total validation is **real time** while typing; error if the total would exceed 100.
- **Older design** still used in Merchant/Cross-Border Ownership tabs (28570:62749, 28598:278194), Errors page (28632:82094, 28632:82256) and Submission review (28676:133867): "Does the company have owners with a share 20% or higher? YES/NO" then owner cards with SSN etc. → conflicts with the new design (Q-5).

### A6. Connectors tab (section 28276:88185)
- Initial 28511:32098: "Connections for Integration — Connect your source for AP/AR data and bank accounts to make and receive payments in SMART Hub."
- **Data Source Preferences** (+ Invite someone to help): "By selecting one of the options below, you will allow us to establish a connection to your AP/AR data that will be managed and configured through SMART Hub." Three options (one at a time, "Current connection" tag): **ERP/Accounting Software** (Select), **Batch Data Upload** (Select), **API Connection** (Select).
  - ERP (28513:33218): modal "Enable ERP/Accounting Software" → Connect Step 1 of 3 "Select from one of these providers": Sage Intacct, QuickBooks, Acumatica, KNNX, Guide ClaimCenter, Oracle NetSuite; "Your ERP is not listed? Let us know…" → Step 2 of 3 Sign in (User ID, Password, Company; "See the Integration Guide") → Step 3 of 3 "Pending Verification — Confirmation of connection required … needs a token confirmation…" **Validate Connection**; then table "Your ERP/Software accounts" (Account, ERP, status), Refresh connection, View Details / Edit; Switch to Another Connection → "Information will be lost — Once you change the option your current progress will be discarded. Do you wish to continue?"
  - Batch (28555:37865): explainer modal, "You will be given details on how to upload a data file within the platform." Continue / Cancel; then "Current connection", Learn More.
  - API (28555:38922): explainer; "View accounts ->"; "API Keys and Credentials": Client ID; View Details: Client Secret (masked), Scope, Access Token URL, Payable Key, Party Key, **Generate New Client Secret** → confirm → "Client Secret Created — Please copy the new client secret and save it somewhere safe. For security reasons, we cannot show it to you again." Done; Disconnect → "Are you sure you want to disconnect?"
- **Bank Account** (28555:40542): "By connecting to your bank account, SMART Hub can draw the funds necessary to originate payments and deposit payments directly into your bank account." Empty "No bank account added yet — Connect your bank account and get started, invite someone from your team to help." **Connect** →
  "Connect Your Bank Account — Who do you bank with?" (Bank of America, JP Morgan Chase & Co., Goldman Sachs, US Bank, Wells Fargo, Jack Henry; "Don't see your bank listed?") → Sign In to Your Account Step 1 of 2 (Name as it appears on the bank account, Address, State, ZIP, Country, Account type Savings/Checking, ACH Routing Number, Account Number, ACH Company ID; cheque illustration) → Step 2 of 2 "Sign in with Your Treasury Services Banking Credentials" (bank-specific API fields, e.g. ProviderIdReporting…ClientId; optional Treasury Services Credentials upload; link "Set up a Funding Account →") → "Name Your Bank Account" (Skip) → "Please wait".
  "Set up a Funding Account" path: "Our implementation team will contact you…" confirm contact details or other (Email, Phone, Add a note) → **Send Request** → "Your request has been received!" Got it.
  Connected: table "Your Bank Accounts" (Bank, Routing number, account number masked, status Connected) + Add. Action Required: "Bank account name missing — Your ERP connector is missing the Bank Account Name…" **Add bank account name** / Refresh Connection; View Details, Edit, Disconnect.

### A7. Configuration tab (section 28566:45739)
28566:45740: "This is the first step to configuring your SMART Hub and adjacent payment solutions. You'll be able to change these in the SMART Hub portal as well." **SMART Exchange Payment Preferences** — "SMART Exchange is an option you can enable for instant payments. What is SMART Exchange?" (toggle) · Select Default Receiving Account (select bank account + "Add New Bank Account", 28615:40095) · "Please set the minimum and maximum value of each invoice that you would like to be eligible for payment through SMART Exchange. If no values are entered, all invoices will be eligible." Min. invoice amount / Max. invoice amount · **Save**.

### A8. Merchant Services add-on (page 28003:46286)
Annotations: "Financial Tab appears when Merchant Services is selected" · "Business Plan Tab appears when Merchant Services is selected".
- **Financial** (section 28582:53698; YES/NO variants; errors 28665:78897 / 28665:80967 / 28665:82835): Business and Financial Information (Parent Company, Date of Incorporation, product line description, Industry, Business Sales Volume/Turnover USD, Operating Status, Number of Employees, revenue/funding sources, MCC Code, Currency, "Current option: Prysym USA"); Processing Information (regulated activity Y/N → Business or Service License multi-upload; geographic % split USA/EU/Canada/Mexico/Japan/South Korea/Other; card payments in last 24 months → Visa/Mastercard/AMEX/Discover per period; breach Y/N → description; violation notice Y/N; current processors Y/N → statements uploads; chargeback/refund history, average/highest ticket, delivery period; PCI compliant → Level 1–4 / Not Compliant / I do not know / Self certify + expected date); Merchant Transactional Data & Reserve Calculation (12-month volume; 3-year table Volume, Count, Average, Highest, Refund %, Chargeback %; orders in advance → delayed-payment % 1w…12m; purchase process; subscription → How often? Monthly…Yearly; T&Cs public → upload); Proofing Documents (Shareholder Register, Bank Account Statement, Financial Statements, Proof of Federal Tax ID/VAT, Certificate of Good Standing, Evidence for the Source of Funds, ID for the account signatory, Interim Financials, voided check/ABA-DDA letter — some optional); Authorized Signatory Attestation ("Are you authorized to sign?" Yes / No, send to an authorized signer).
- Attestation Yes (30243:53172): "Accept the terms" — consent rows for BlueSnap T&Cs and Privacy (each **Review** opens a browser-tab mock), **Accept Terms**. No (30251:71007): "Send to an authorized signatory" First Name, Last Name, Email, Note (max 100) → Sending → "Request sent to an authorized signer … continue with the application for a line of credit with OatFi…" [copy looks reused from LoC].
- Changing payment processor (28582:56003): "Select a payments processor — Onboard with our preferred provider, Prysym USA (Recommended)… Or use your own payments processor" search (EMV processors list) → processor-specific fields (MCC Code, Maximum Monthly Amount, Account Number, Processor Description, Settlement Platform, Merchant Number, Sort Code, Duplicate Checking (+ seconds, override), Default Industry Classification retail/ecommerce/moto), Merchant Service Details (contact), Payment Details (use existing bank account vs set up new settlement account; Capture more than was Pre-Authorized), VAR Sheet. Switching back: "Information will be discarded — Changing payment processor will discard all information from Merchant Service tab!"
- **Business Plan** (28141:35114): "Please attach your business plan…" upload (.PDF or .DOCS); "Need help with your business plan? Answer some simple questions to create a lean business plan — **Get Started Now**". Uploaded 28579:53239.
- **BlueSnap** section (30397:63675, newest, 2026-10): Business Information 30397:61468 and Financial 30397:62328 with 3 extra Y/N questions: "Has your company been placed in any Fraud/Risk Monitoring Program?", "Previously terminated by a processor/institution due to fraud, laundering, or high chargebacks?", "Subject of an FTC/consumer-protection complaint or Assurance of Voluntary Compliance?". Open comments: "Add Merchant Tax ID #"; BlueSnap T&Cs must be signed with timestamp + signer.
- Comments: "Date of going live" removed (2025-08-28) but still drawn in error frame 28665:78897. "Upload another" overrides the previous file today → multi-file is R2 (only Business License takes multiple).

### A9. Cross-Border Payments add-on (page 28598:246304)
Annotations: "Transactional Tab appears when Cross-Border Payments is selected"; "Cross-Border FX Provider appears in Connectors when Cross-Border Payments is selected".
- **Transactional** 28603:49485 (errors 28665:83864): "Cross Border Transactions — Give us a few details on the nature of your cross-border transactions and expected volume split by foreign currencies." Highest transaction value · Estimated number of transcations [sic] for the next 12 months · Average transaction value · Purpose of Transactions · "Are you involved in any of the following activities?" Dealer of precious stones / weapons / virtual currency / Controlled substances related / Are you a financial institution.
- **Cross-Border FX Provider** in Connectors (28603:106195): "Choose one or more preferred FX providers…" card Monex (phone, email) **Begin Setup** ▾ Already have an account / Don't have an account → In Progress (View details / Cancel) · linking steps 1–3 · disclaimer "Transcard connects you with [Monex]… We are not a licensed money transmitter…" · Cancel request · "Set up with Monex".

### A10. Submission (page 28676:83254) — **two versions**
- **v1 "Submit" modal, 4 steps** (2025): Step 1 28676:94186 "Hey, there is more!" add-on offer + Connectors summary (Accounting Software Pending Verification → Validate Connection; Bank Accounts Action Required; Add bank account). Step 2 28676:94333 "One Final Step — Make sure everything is in order": accordion per tab with "% complete" (expanded 28676:132706, 28676:133867; variants for Merchant 28676:138062 and Merchant + Cross-Border 28676:139259). Step 3 28676:95204 "Accept the terms": attestation, DDA consent ("…in compliance with Canadian banking regulations"), T&Cs + Privacy (Review), Authorized Signatory, **Confirm**. Step 4 28676:94930 "Your information has been received!" Go back to onboarding / Done. Edge: "Your connections are incomplete" 28676:95586; "Important Information Missing!" 28676:95729 (I understand).
- **v2 "Submit -> Step 3", 3 steps** (section 29621:11095, 2026-04, partner co-branded shell with a different left panel: "Business Information Collection / Acceptance of Terms / Application Submission"; products "Line of Credit / Working Capital Orchestration / Cross-Border Disbursements"): Authorized Signatory Attestation "Are you authorized to sign?" Yes → Provide additional details (Full Name, DOB, Nationality, Government ID Number, Upload Government ID, address, contact) → Edit Details; T&C / Privacy tab mocks; DDA accepted; all checked. No → section 29621:29286 Send to an authorized signatory → "Request sent… line of credit with OatFi".
- **Authorized signer pages** (29624:11989): email "Action Required: Sign the Application" from SMART Enroll (FirstName/LastName placeholders, [CustomText], **Review and Acknowledge**) → "Review & Sign Application" over a Hub dashboard → E-Sign Consent → enter first/last name → **Confirm Acceptance** → "Acknowledgement Complete — Status Competed [sic], Signed by, Confirmed at".

### A11. Errors page (28632:79121)
Covered per area above. Configuration (28635:87032) and "Missing Information Error" (28632:82383) have no unique text (visual only).

## B. Conflicts and stale frames spotted
1. Speedy Sign up frame named "Step 1 of 4" but shows "Step 1 of 3".
2. Ownership: new 100%-breakdown design vs old YES/NO design still in add-on pages, Errors and Submission review.
3. Submission v1 (4 steps) vs v2 (3 steps, co-branded, LoC wording).
4. Merchant processor: Prysym USA (recommended) vs new BlueSnap section and BlueSnap T&Cs.
5. "Date of going live" removed by comment, still in an error frame.
6. "Request sent… line of credit with OatFi" copy in the Merchant Services attestation.
7. Email domain: support@smart-enroll.com (locked) vs support@transcard.com (v2 submission).
8. Typos to fix in build: "Icon must ne square", "Fictitous", "transcations", "Do yo accept", "Competed", "Number of Employeesis required", "Invite someone tohHelp".

## C. Open questions → see chat table (Q-1…Q-14); answers go here.

## Next batch
Batch 2 after answers: `wiki/products/smart-enroll/standard.md` (index) + `wiki/products/smart-enroll/flows/<area>.md`
(sign-in, speedy-sign-up, application-shell, business-information, ownership, connectors, configuration,
merchant-services, cross-border, submission), manifest, changelog, PR.
