/**
 * smart-enroll/submission.js
 * SMART Enroll — Submission (TCDM-5251, T11): blockers, the 4-step Submit modal and the authorized signer (D-1, D-2, D-13).
 * Spec: wiki/products/smart-enroll/flows/submission.md. Figma [R1] SMART Enroll jLooCmHwqJcYV5p5d8BHnO:
 *   blocker 28676:95729 · Step 1 28676:94186 · Step 2 28676:94333 / 28676:95586 (connections incomplete) / 28676:132706 ·
 *   Step 3 28676:95204 + v2 29621:11095 (Are you authorized to sign? · Provide additional details 29991:55520) · Step 4 28676:94930 ·
 *   signer 29624:11989 (email 29624:12852, review 29624:11990 … acknowledgement 29624:12732).
 *
 * Two pages load this file:
 *   application.html  listens to the shell's cancelable `submit` (Next Step on the last tab) and calls preventDefault():
 *                     required fields missing → "Important Information Missing!" (lists the tabs, I understand → first one);
 *                     else the Submit modal: 1 "Hey, there is more!" (skipped when no add-on is left and Connectors is complete)
 *                     → 2 "One Final Step" (connections warning only, D-13; read-only accordion per tab, Edit → tab)
 *                     → 3 "Accept the terms" (Are you authorized to sign? Yes → Provide additional details + DDA + terms → Confirm;
 *                       No → Send to an authorized signatory → Request sent) → 4 "Your information has been received!" →
 *                     SmartEnroll.setStatus('pending-approval').
 *                     While a signer request is open: amber "Waiting for signature" box under the status box (Resend, demo email
 *                     link) and Next Step on the last tab is aria-disabled with the reason as tooltip.
 *   sign.html         the signer's secure link (?token=…, ?view=email for the demo email). Review → Confirm → name → Confirm
 *                     Acceptance → Acknowledgement Complete. The applicant's tab follows through the `storage` event and sets
 *                     Pending Approval (also on the next load: the shell keeps the status in sessionStorage).
 *
 * Storage:
 *   localStorage   se_sign_v1         { requests: { <token>: { token, businessId, businessName, signer: { firstName, lastName, email },
 *                                       note, requestedBy: { name, role, email }, sentAt, summary: [{ title, rows: [[label, value]] }],
 *                                       status: 'pending' | 'signed' | 'void', signedBy, confirmedAt, applied } } }
 *                                     localStorage (not sessionStorage) so the signer's tab and the applicant's tab share it.
 *   sessionStorage se_submission_v1   { <businessId>: { choice: 'yes' | 'no', details, dda, reviewed: {terms, privacy},
 *                                       agreed: {terms, privacy}, submittedAt } }
 *
 * API: window.SmartEnrollSubmission = { open(), missingTabs(), request(), reset() } (application page only).
 * Needs (application): shell.js, onboarding-modal.js (OBModal), onboarding-field.js (OBField), file-upload.js, connectors.js,
 * shared.js (data-tooltip, toast), @tailwindplus/elements (selects), checkbox.css. (sign.html): onboarding-field.js, shared.js.
 */
(function () {
  "use strict";

  var SIGN_KEY = "se_sign_v1";
  var SUB_KEY = "se_submission_v1";
  var CONNECTORS_DATA = "../../data/smart-enroll-connectors.json";
  var TERMS = [
    { id: "terms", label: "Terms and Conditions", href: "https://smart-enroll.com/terms-of-use/EN" },
    { id: "privacy", label: "Privacy Policy", href: "https://smart-enroll.com/privacy-policy/EN" },
  ];

  /* ---------- classes (components skill; SMART System button sizes, as in connectors.js / merchant-services.js) ---------- */

  var FOCUS = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:focus-visible:outline-blue-400";
  var PRIMARY =
    "inline-flex cursor-pointer items-center justify-center gap-1.5 bg-blue-600 font-semibold text-white shadow-xs hover:bg-blue-500 " + FOCUS +
    " disabled:cursor-not-allowed disabled:bg-blue-300 dark:bg-blue-500 dark:shadow-none dark:hover:bg-blue-400 dark:disabled:bg-blue-500/40 dark:disabled:text-white/60";
  var SECONDARY =
    "inline-flex cursor-pointer items-center justify-center gap-1.5 bg-white font-semibold text-gray-900 shadow-xs inset-ring inset-ring-gray-300 hover:bg-gray-50 " + FOCUS +
    " disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white/10 dark:text-white dark:shadow-none dark:inset-ring-white/10 dark:hover:bg-white/20";
  var DANGER =
    "inline-flex cursor-pointer items-center justify-center gap-1.5 bg-red-600 font-semibold text-white shadow-xs hover:bg-red-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 dark:bg-red-500 dark:shadow-none dark:hover:bg-red-400 dark:focus-visible:outline-red-400";
  var MD = " rounded-md px-2.5 py-1.5 text-sm";
  var LG = " rounded-md px-3 py-2 text-base";
  var XL = " rounded-md px-3.5 py-2.5 text-base";
  var XS = " rounded-sm px-2 py-1 text-xs";
  var BTN = {
    secondaryXs: SECONDARY + XS,
    primaryLg: PRIMARY + LG, primaryXl: PRIMARY + XL,
    secondaryMd: SECONDARY + MD, secondaryLg: SECONDARY + LG, secondaryXl: SECONDARY + XL,
    dangerMd: DANGER + MD,
  };
  var LINK = "inline-flex cursor-pointer items-center gap-1.5 rounded-sm type-link text-blue-600 hover:text-blue-700 transition-colors " + FOCUS + " dark:text-blue-400 dark:hover:text-blue-300";
  var LINK_INLINE = "rounded-sm font-medium text-blue-600 hover:text-blue-700 hover:underline " + FOCUS + " dark:text-blue-400 dark:hover:text-blue-300";
  // Previous / next text button (shell.js BTN_NAV) — "Go back to onboarding".
  var BTN_NAV =
    "inline-flex cursor-pointer items-center gap-1 rounded-md px-2 py-1 type-button text-gray-700 hover:bg-gray-100 hover:text-gray-900 " + FOCUS + " dark:text-gray-300 dark:hover:bg-white/10 dark:hover:text-white";
  // Tailwind Plus small badge (connectors.js), + gray.
  var BADGE = "inline-flex shrink-0 items-center gap-1 rounded-md px-1.5 py-0.5 text-xs/4 font-medium inset-ring ";
  var BADGE_TONE = {
    gray: "bg-gray-50 text-gray-600 inset-ring-gray-500/10 dark:bg-gray-400/10 dark:text-gray-400 dark:inset-ring-gray-400/20",
    blue: "bg-blue-50 text-blue-700 inset-ring-blue-700/10 dark:bg-blue-400/10 dark:text-blue-400 dark:inset-ring-blue-400/30",
    green: "bg-green-50 text-green-700 inset-ring-green-600/20 dark:bg-green-400/10 dark:text-green-400 dark:inset-ring-green-500/20",
    red: "bg-red-50 text-red-700 inset-ring-red-600/10 dark:bg-red-400/10 dark:text-red-400 dark:inset-ring-red-400/20",
    yellow: "bg-yellow-100 text-yellow-800 inset-ring-yellow-200 dark:bg-yellow-400/10 dark:text-yellow-500 dark:inset-ring-yellow-400/20",
    amber: "bg-yellow-50 text-yellow-800 inset-ring-yellow-600/20 dark:bg-yellow-400/10 dark:text-yellow-500 dark:inset-ring-yellow-400/20",
  };
  // Status card badge "Completed" (sx-sign-agreement.js BADGE_DONE).
  var BADGE_DONE =
    "inline-flex w-fit items-center gap-1 rounded px-2 py-0.5 text-xs/4 font-medium border border-emerald-200 bg-emerald-100 text-emerald-800 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-400";
  // Radio (sx-onboarding-acp.js RADIO) and radio card label row (merchant-services.js).
  var RADIO =
    "relative size-4 shrink-0 cursor-pointer appearance-none rounded-full border border-gray-300 dark:border-white/10 bg-white dark:bg-white/5 before:absolute before:inset-1 before:rounded-full before:bg-white not-checked:before:hidden checked:border-blue-600 dark:checked:border-blue-500 checked:bg-blue-600 dark:checked:bg-blue-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:focus-visible:outline-blue-400 disabled:cursor-not-allowed disabled:border-gray-300 dark:disabled:border-white/10 disabled:bg-gray-100 dark:disabled:bg-white/10 disabled:before:bg-gray-400 dark:disabled:before:bg-white/30";
  var RADIO_ROW =
    "flex min-w-0 flex-1 cursor-pointer items-center gap-3 px-4 py-3 text-gray-900 hover:bg-gray-50 dark:text-white dark:hover:bg-white/5";
  // Select trigger at Text Field height (merchant-services.js SELECT_TRIGGER) + options.
  var SELECT_TRIGGER =
    "group/select grid h-10 w-full cursor-default grid-cols-[minmax(0,1fr)] items-center rounded-md bg-white py-0 pr-2 pl-3 text-left text-base/6 text-gray-900 shadow-xs " +
    "outline-1 -outline-offset-1 outline-gray-300 hover:outline-gray-400 " +
    "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-blue-600 " +
    "aria-expanded:outline-2 aria-expanded:-outline-offset-2 aria-expanded:outline-blue-600 " +
    "aria-invalid:outline-red-300 aria-invalid:focus-visible:outline-red-600 " +
    "dark:bg-white/5 dark:text-white dark:outline-white/10 dark:hover:outline-white/20 " +
    "dark:focus-visible:outline-blue-500 dark:aria-expanded:outline-blue-500 " +
    "dark:aria-invalid:outline-red-400/50 dark:aria-invalid:focus-visible:outline-red-500";
  var OPTIONS =
    "max-h-60 w-(--button-width) overflow-auto rounded-md bg-white py-1 text-base shadow-lg outline-1 outline-black/5 [--anchor-gap:--spacing(1)] " +
    "transition transition-discrete data-closed:opacity-0 data-enter:duration-100 data-enter:ease-out data-leave:duration-100 data-leave:ease-in motion-reduce:transition-none " +
    "sm:text-sm dark:bg-gray-800 dark:shadow-none dark:-outline-offset-1 dark:outline-white/10";
  var OPTION =
    "group/option relative block cursor-default py-2 pr-9 pl-3 text-gray-900 select-none focus:bg-blue-600 focus:text-white focus:outline-hidden dark:text-white dark:focus:bg-blue-500";
  var CARD = "rounded-lg border border-gray-200 dark:border-white/10";
  var RULE = '<div aria-hidden="true" class="h-px w-full bg-gray-200 lg:max-w-4xl dark:bg-white/10"></div>';
  // Product row (shell.js ROW).
  var ROW = "flex items-center gap-2 rounded-md border border-gray-200 bg-white p-2.5 dark:border-white/10 dark:bg-gray-900";

  /* ---------- icons ---------- */

  var ICON = {
    flag: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true" class="hidden size-6 shrink-0 text-gray-400 sm:block dark:text-gray-500"><path stroke-linecap="round" stroke-linejoin="round" d="M3 3v1.5M3 21v-6m0 0 2.77-.693a9 9 0 0 1 6.208.682l.108.054a9 9 0 0 0 6.086.71l3.114-.732a48.524 48.524 0 0 1-.005-10.499l-3.11.732a9 9 0 0 1-6.085-.711l-.108-.054a9 9 0 0 0-6.208-.682L3 4.5M3 15V4.5" /></svg>',
    triangle: function (cls) { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true" class="' + cls + '"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" /></svg>'; },
    checkCircle: function (cls) { return '<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" class="' + cls + '"><path fill-rule="evenodd" clip-rule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z" /></svg>'; },
    xCircle: function (cls) { return '<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" class="' + cls + '"><path fill-rule="evenodd" clip-rule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16ZM8.28 7.22a.75.75 0 0 0-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 1 0 1.06 1.06L10 11.06l1.72 1.72a.75.75 0 1 0 1.06-1.06L11.06 10l1.72-1.72a.75.75 0 0 0-1.06-1.06L10 8.94 8.28 7.22Z" /></svg>'; },
    warnMini: function (cls) { return '<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" class="' + cls + '"><path fill-rule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495ZM10 5a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 10 5Zm0 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clip-rule="evenodd" /></svg>'; },
    dashed: function (cls) { return '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-dasharray="2.6 2.6" aria-hidden="true" class="' + cls + '"><circle cx="10" cy="10" r="7.25" /></svg>'; },
    chevronLeft: '<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" class="size-5"><path fill-rule="evenodd" d="M11.78 5.22a.75.75 0 0 1 0 1.06L8.06 10l3.72 3.72a.75.75 0 1 1-1.06 1.06l-4.25-4.25a.75.75 0 0 1 0-1.06l4.25-4.25a.75.75 0 0 1 1.06 0Z" clip-rule="evenodd" /></svg>',
    chevronRight: '<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" class="size-5"><path fill-rule="evenodd" d="M8.22 5.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L11.94 10 8.22 6.28a.75.75 0 0 1 0-1.06Z" clip-rule="evenodd" /></svg>',
    chevronDown: '<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" class="size-5 transition-transform group-aria-expanded/acc:rotate-180 motion-reduce:transition-none"><path fill-rule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clip-rule="evenodd" /></svg>',
    plus: '<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" class="size-5"><path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" /></svg>',
    plusSm: '<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" class="size-4"><path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" /></svg>',
    minus: '<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" class="size-5"><path fill-rule="evenodd" d="M4 10a.75.75 0 0 1 .75-.75h10.5a.75.75 0 0 1 0 1.5H4.75A.75.75 0 0 1 4 10Z" clip-rule="evenodd" /></svg>',
    pencil: '<svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" class="size-4"><path d="M13.488 2.513a1.75 1.75 0 0 0-2.475 0L6.75 6.774a2.75 2.75 0 0 0-.596.892l-.848 2.047a.75.75 0 0 0 .98.98l2.047-.848a2.75 2.75 0 0 0 .892-.596l4.261-4.262a1.75 1.75 0 0 0 0-2.474Z" /><path d="M4.75 3.5c-.69 0-1.25.56-1.25 1.25v6.5c0 .69.56 1.25 1.25 1.25h6.5c.69 0 1.25-.56 1.25-1.25V9A.75.75 0 0 1 14 9v2.25A2.75 2.75 0 0 1 11.25 14h-6.5A2.75 2.75 0 0 1 2 11.25v-6.5A2.75 2.75 0 0 1 4.75 2H7a.75.75 0 0 1 0 1.5H4.75Z" /></svg>',
    info: '<svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" class="mt-0.5 size-4 shrink-0 text-gray-400 dark:text-gray-500"><path fill-rule="evenodd" d="M15 8A7 7 0 1 1 1 8a7 7 0 0 1 14 0ZM9 5a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM6.75 8a.75.75 0 0 0 0 1.5h.75v1.75a.75.75 0 0 0 1.5 0v-2.5A.75.75 0 0 0 8.25 8h-1.5Z" clip-rule="evenodd" /></svg>',
    infoTip: '<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" class="size-4.5"><path fill-rule="evenodd" clip-rule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-7-4a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM9 9a.75.75 0 0 0 0 1.5h.253a.25.25 0 0 1 .244.304l-.459 2.066A1.75 1.75 0 0 0 10.747 15H11a.75.75 0 0 0 0-1.5h-.253a.25.25 0 0 1-.244-.304l.459-2.066A1.75 1.75 0 0 0 9.253 9H9Z" /></svg>',
    phone: '<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" class="pointer-events-none absolute top-1/2 right-3 size-5 -translate-y-1/2 text-gray-400 peer-aria-[invalid=true]:hidden dark:text-gray-500"><path fill-rule="evenodd" d="M2 3.5A1.5 1.5 0 0 1 3.5 2h1.148a1.5 1.5 0 0 1 1.465 1.175l.513 2.31a1.5 1.5 0 0 1-1.02 1.756l-.75.25a.75.75 0 0 0-.429 1.036 10.53 10.53 0 0 0 4.787 4.787.75.75 0 0 0 1.036-.43l.25-.75a1.5 1.5 0 0 1 1.756-1.02l2.31.514A1.5 1.5 0 0 1 18 13.352V14.5a1.5 1.5 0 0 1-1.5 1.5H15c-1.149 0-2.263-.15-3.326-.43A13.022 13.022 0 0 1 2.43 6.326 13.019 13.019 0 0 1 2 3.5Z" clip-rule="evenodd" /></svg>',
    externalLink: '<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" class="size-4"><path fill-rule="evenodd" d="M4.25 5.5a.75.75 0 0 0-.75.75v8.5c0 .414.336.75.75.75h8.5a.75.75 0 0 0 .75-.75v-4a.75.75 0 0 1 1.5 0v4A2.25 2.25 0 0 1 12.75 17h-8.5A2.25 2.25 0 0 1 2 14.75v-8.5A2.25 2.25 0 0 1 4.25 4h5a.75.75 0 0 1 0 1.5h-5Z" clip-rule="evenodd" /><path fill-rule="evenodd" d="M6.194 12.753a.75.75 0 0 0 1.06.053L16.5 4.44v2.81a.75.75 0 0 0 1.5 0v-4.5a.75.75 0 0 0-.75-.75h-4.5a.75.75 0 0 0 0 1.5h2.553l-9.056 8.194a.75.75 0 0 0-.053 1.06Z" clip-rule="evenodd" /></svg>',
    spinner: '<svg class="size-4 animate-spin motion-reduce:animate-none" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4Z"></path></svg>',
    // Connectors glyphs (connectors.js ICON.document / bank, 24 outline).
    software: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true" class="size-5 shrink-0 text-blue-600 dark:text-blue-400"><path stroke-linecap="round" stroke-linejoin="round" d="M9 17.25v1.007a3 3 0 0 1-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0 1 15 18.257V17.25m6-12V15a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 15V5.25m18 0A2.25 2.25 0 0 0 18.75 3H5.25A2.25 2.25 0 0 0 3 5.25m18 0V12a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 12V5.25" /></svg>',
    bank: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true" class="size-5 shrink-0 text-blue-600 dark:text-blue-400"><path stroke-linecap="round" stroke-linejoin="round" d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0 0 12 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18M12 6.75h.008v.008H12V6.75Z" /></svg>',
    plusDashed: '<span aria-hidden="true" class="inline-flex size-7 shrink-0 items-center justify-center rounded-full border border-dashed border-gray-300 text-gray-400 group-hover/add:border-blue-400 group-hover/add:text-blue-600 dark:border-white/20 dark:text-gray-500 dark:group-hover/add:border-blue-400 dark:group-hover/add:text-blue-400"><svg viewBox="0 0 20 20" fill="currentColor" class="size-4"><path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" /></svg></span>',
    selector: '<svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" class="col-start-1 row-start-1 size-5 self-center justify-self-end text-gray-500 group-hover/select:text-gray-700 sm:size-4 dark:text-gray-400 dark:group-hover/select:text-gray-200"><path d="M5.22 10.22a.75.75 0 0 1 1.06 0L8 11.94l1.72-1.72a.75.75 0 1 1 1.06 1.06l-2.25 2.25a.75.75 0 0 1-1.06 0l-2.25-2.25a.75.75 0 0 1 0-1.06ZM10.78 5.78a.75.75 0 0 1-1.06 0L8 4.06 6.28 5.78a.75.75 0 0 1-1.06-1.06l2.25-2.25a.75.75 0 0 1 1.06 0l2.25 2.25a.75.75 0 0 1 0 1.06Z" clip-rule="evenodd" fill-rule="evenodd" /></svg>',
    checkSelected: '<span class="absolute inset-y-0 right-0 flex items-center pr-3 text-blue-600 group-not-aria-selected/option:hidden group-focus/option:text-white in-[el-selectedcontent]:hidden dark:text-blue-400"><svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" class="size-5"><path fill-rule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clip-rule="evenodd" /></svg></span>',
  };

  /* ---------- shared helpers ---------- */

  function esc(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function readJson(kind, key) {
    try { return JSON.parse(window[kind].getItem(key)); } catch (e) { return null; }
  }

  function writeJson(kind, key, value) {
    try { window[kind].setItem(key, JSON.stringify(value)); } catch (e) { /* private mode */ }
  }

  function readSign() {
    var s = readJson("localStorage", SIGN_KEY);
    return s && s.requests ? s : { requests: {} };
  }

  function writeSign(s) { writeJson("localStorage", SIGN_KEY, s); }

  function stamp(iso) {
    var d = iso ? new Date(iso) : null;
    return d && !isNaN(d) ? d.toLocaleString("en-US") : "";
  }

  function fullName(p) {
    return [p && p.firstName, p && p.lastName].filter(Boolean).join(" ").trim();
  }

  function toast(message, tone) {
    if (typeof window.showGlobalTopToast === "function") window.showGlobalTopToast(message, { tone: tone || "success" });
  }

  function F() { return window.OBField; }

  function errorLine(id) {
    return '<p id="' + id + '-error" class="hidden ' + F().ERROR_TEXT + '"></p>';
  }

  // OBField text field (label row + input + (!) + error line).
  function textField(o) {
    var f = F();
    var label = '<div class="flex items-center justify-between gap-2"><label for="' + o.id + '" class="' + f.LABEL + '">' + esc(o.label) + "</label>" +
      (o.optional ? '<span class="' + f.HELPER + '">Optional</span>' : "") + "</div>";
    var input = o.textarea
      ? '<textarea id="' + o.id + '" rows="2" maxlength="' + (o.maxlength || 100) + '" aria-describedby="' + o.id + '-help" class="' + f.TEXTAREA + ' resize-y">' + esc(o.value || "") + "</textarea>"
      : '<input id="' + o.id + '" type="' + (o.type || "text") + '" autocomplete="' + (o.autocomplete || "off") + '"' +
        (o.inputmode ? ' inputmode="' + o.inputmode + '"' : "") +
        (o.placeholder ? ' placeholder="' + esc(o.placeholder) + '"' : "") +
        (o.maxlength ? ' maxlength="' + o.maxlength + '"' : "") +
        ' value="' + esc(o.value || "") + '" aria-invalid="false" aria-describedby="' + o.id + '-error" class="peer ' + f.INPUT + (o.icon ? " pr-10" : "") + '">';
    return (
      '<div class="flex flex-col gap-1">' + label +
      '<div class="relative">' + input + (o.textarea ? "" : f.errorIcon()) + (o.icon || "") + "</div>" +
      (o.textarea ? '<p id="' + o.id + '-help" class="' + f.HELPER + '">Maximum 100 characters</p>' : errorLine(o.id)) +
      "</div>"
    );
  }

  function setFieldError(input, message) {
    F().setError(input, !!message, document.getElementById(input.id + "-error"), message || "");
    return !message;
  }

  /* =====================================================================================================
   * sign.html — the authorized signer's secure link
   * ===================================================================================================== */

  function initSignPage() {
    var params = new URLSearchParams(window.location.search);
    var token = params.get("token") || "";
    var emailEl = document.querySelector("[data-sign-email]");
    var pageEl = document.querySelector("[data-sign-page]");
    var expiredEl = document.querySelector("[data-sign-expired]");
    var panel = document.querySelector("[data-sign-panel]");
    var actions = document.querySelector("[data-sign-actions]");
    var confirmBtn = document.querySelector("[data-sign-confirm]");
    var LOADER =
      '<div role="status" class="absolute inset-0 flex items-center justify-center rounded-lg bg-white/70 dark:bg-gray-900/70">' +
      '<img src="../../assets/onboarding/loader.svg" alt="" width="44" height="44" class="size-11 animate-spin motion-reduce:animate-none">' +
      '<span class="sr-only">Loading…</span></div>';

    function rec() { return readSign().requests[token] || null; }
    function valid() { var r = rec(); return !!(r && r.status === "pending"); }

    var r0 = rec();
    var view = params.get("view") === "email" && r0 ? "email" : valid() ? "document" : "expired";
    var form = { first: (r0 && r0.signer.firstName) || "", last: (r0 && r0.signer.lastName) || "" };
    var busy = false;
    var doneRec = null;

    function documentView() {
      var r = rec();
      var sections = (r.summary || []).map(function (s) {
        return (
          '<section class="flex flex-col gap-3"><h3 class="type-title-small text-default">' + esc(s.title) + "</h3>" +
          '<dl class="flex flex-col gap-2">' + s.rows.map(function (row) {
            return '<div class="grid grid-cols-1 gap-0.5 sm:grid-cols-2 sm:gap-4"><dt class="type-label text-default">' + esc(row[0]) + '</dt><dd class="type-body text-secondary break-words">' + esc(row[1] || "—") + "</dd></div>";
          }).join("") + "</dl></section>"
        );
      }).join('<div aria-hidden="true" class="h-px bg-gray-200 dark:bg-white/10"></div>');
      return (
        '<div class="relative">' +
        '<div tabindex="0" aria-label="Application summary and E-Sign Consent" class="flex h-96 flex-col gap-5 overflow-y-auto rounded-lg border border-gray-200 bg-gray-50 p-4 lg:h-150 dark:border-white/10 dark:bg-white/5 ' + FOCUS + '">' +
        '<p class="type-description text-tertiary">Application for <span class="font-medium text-default">' + esc(r.businessName) + "</span>, sent by " + esc(r.requestedBy.name) + " on " + esc(stamp(r.sentAt)) + ".</p>" +
        sections +
        '<div aria-hidden="true" class="h-px bg-gray-200 dark:bg-white/10"></div>' +
        // TODO(confirm) E-Sign Consent copy: not in Figma (the frame shows a Terms of Use document); neutral prototype text.
        '<section id="se-sign-consent" class="flex flex-col gap-2"><h3 class="type-title-small text-default">E-Sign Consent</h3>' +
        '<p class="type-body text-secondary">By confirming, you agree to review and sign this application electronically. Your electronic signature has the same effect as a handwritten signature. You authorize Transcard and its agents to investigate and access the business and credit information, as well as records of the company, for purposes related to payment initiation and integrated banking services.</p>' +
        '<p class="type-body text-secondary">You can ask for a paper copy of this application or withdraw your consent by contacting Transcard Customer Service before you confirm.</p></section>' +
        "</div>" + (busy ? LOADER : "") + "</div>"
      );
    }

    function formView() {
      return (
        '<div class="relative flex flex-col gap-4 rounded-lg border border-gray-200 bg-white p-4 dark:border-white/10 dark:bg-gray-900">' +
        '<div class="flex items-center gap-3 rounded-md bg-green-50 px-4 py-3 dark:bg-green-500/10">' + ICON.checkCircle("size-5 shrink-0 text-green-500 dark:text-green-400") +
        '<p class="min-w-0 flex-1 type-label text-default">Agreement was confirmed</p></div>' +
        '<fieldset data-sign-fieldset class="flex min-w-0 flex-col gap-4"' + (busy ? " disabled" : "") + ">" +
        '<legend class="sr-only">Your name</legend>' +
        textField({ id: "se-sign-first", label: "First Name", value: form.first, autocomplete: "given-name", placeholder: "Enter first name" }) +
        textField({ id: "se-sign-last", label: "Last Name", value: form.last, autocomplete: "family-name", placeholder: "Enter last name" }) +
        '<div><button type="button" data-sign-accept class="' + PRIMARY + MD + '">Confirm Acceptance</button></div>' +
        "</fieldset>" + (busy ? LOADER : "") + "</div>"
      );
    }

    // Status card (components skill). Figma 29624:12732 says "Competed" — fixed to "Completed" (DS-035).
    function doneView() {
      var r = doneRec || rec() || {};
      return (
        '<section aria-labelledby="se-sign-done-title" class="overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-white/10 dark:bg-gray-900">' +
        '<h2 id="se-sign-done-title" tabindex="-1" class="border-b border-gray-200 px-4 py-3 type-title-small text-default focus:outline-hidden dark:border-white/10">Acknowledgement Complete</h2>' +
        '<dl class="flex flex-col gap-2 p-4">' +
        '<div class="grid grid-cols-2 gap-4"><dt class="type-label text-default">Status</dt><dd><span class="' + BADGE_DONE + '">Completed</span></dd></div>' +
        '<div class="grid grid-cols-2 gap-4"><dt class="type-label text-default">Signed by</dt><dd class="type-body text-secondary break-words">' + esc(r.signedBy) + "</dd></div>" +
        '<div class="grid grid-cols-2 gap-4"><dt class="type-label text-default">Confirmed at</dt><dd class="type-body text-secondary">' + esc(stamp(r.confirmedAt)) + "</dd></div>" +
        "</dl></section>"
      );
    }

    function renderEmail() {
      var r = rec();
      document.querySelector("[data-sign-email-to]").textContent = r.signer.email;
      document.querySelector("[data-sign-email-signer]").textContent = fullName(r.signer);
      document.querySelector("[data-sign-email-from]").textContent = r.requestedBy.name;
      document.querySelector("[data-sign-email-contact]").textContent = r.requestedBy.name + (r.requestedBy.email ? " (" + r.requestedBy.email + ")" : "");
      var note = document.querySelector("[data-sign-email-note]");
      note.hidden = !r.note;
      document.querySelector("[data-sign-email-note-text]").textContent = r.note || "";
      document.querySelector("[data-sign-email-cta]").setAttribute("href", "sign.html?token=" + encodeURIComponent(token));
    }

    function render() {
      emailEl.hidden = view !== "email";
      pageEl.hidden = view === "email" || view === "expired";
      expiredEl.hidden = view !== "expired";
      document.title = (view === "email" ? "Action Required: Sign the Application" : view === "expired" ? "Link expired" : "Review & Sign Application") + " · SMART Enroll";
      if (view === "email") { renderEmail(); return; }
      if (view === "expired") return;
      actions.hidden = view !== "document";
      confirmBtn.disabled = busy;
      if (busy) confirmBtn.setAttribute("aria-busy", "true");
      else confirmBtn.removeAttribute("aria-busy");
      panel.innerHTML = view === "document" ? documentView() : view === "form" ? formView() : doneView();
      if (view === "form") bindForm();
    }

    function filled() { return !!(form.first.trim() && form.last.trim()); }

    function bindForm() {
      var first = document.getElementById("se-sign-first");
      var last = document.getElementById("se-sign-last");
      var accept = panel.querySelector("[data-sign-accept]");
      accept.disabled = busy || !filled();
      [[first, "first", "First Name"], [last, "last", "Last Name"]].forEach(function (t) {
        t[0].addEventListener("input", function () {
          form[t[1]] = t[0].value;
          accept.disabled = !filled();
          if (t[0].value.trim()) setFieldError(t[0], "");
        });
        t[0].addEventListener("blur", function () {
          if (!busy && pageEl.contains(t[0])) setFieldError(t[0], t[0].value.trim() ? "" : t[2] + " is required.");
        });
      });
      accept.addEventListener("click", function () {
        if (!filled() || busy) return;
        if (!valid()) { view = "expired"; render(); return; }
        busy = true;
        render();
        window.setTimeout(function () {
          var s = readSign();
          var r = s.requests[token];
          r.status = "signed";
          r.signedBy = (form.first.trim() + " " + form.last.trim()).trim();
          r.confirmedAt = new Date().toISOString();
          writeSign(s);
          doneRec = r;
          busy = false;
          view = "done";
          render();
          var h = document.getElementById("se-sign-done-title");
          if (h) h.focus({ preventScroll: true });
        }, 1500);
      });
    }

    confirmBtn.addEventListener("click", function () {
      if (busy) return;
      busy = true;
      render();
      window.setTimeout(function () {
        busy = false;
        view = valid() ? "form" : "expired";
        render();
        var input = document.getElementById("se-sign-first");
        if (input) input.focus({ preventScroll: true });
      }, 1200);
    });

    // The applicant cancels / resends to someone else, or the request is signed in another tab → this link is used up.
    window.addEventListener("storage", function (e) {
      if (e.key !== SIGN_KEY || busy || view === "done" || view === "expired") return;
      if (!valid()) { view = "expired"; render(); }
    });

    render();
  }

  /* =====================================================================================================
   * application.html — blockers, Submit modal, waiting box
   * ===================================================================================================== */

  function initApplication() {
    var SE = window.SmartEnroll;
    var M = function () { return window.OBModal; };
    var data = null;
    var conn = null; // smart-enroll-connectors.json (provider / source / bank names)
    var ui = { step: 1, view: "step", open: {}, skipped: false, from: null };
    var details = null; // working copy while the "Provide additional details" view is open
    var govUpload = null;

    function bizId() {
      return readJson("sessionStorage", "se_business_v1") || ((data.businesses || [])[0] || {}).id;
    }

    function business() {
      var id = bizId();
      return (data.businesses || []).filter(function (b) { return b.id === id; })[0] || (data.businesses || [])[0] || {};
    }

    function applicant() {
      var a = data.applicant || {};
      var person = (data.people || []).filter(function (p) { return p.id === a.id; })[0] || {};
      return { name: fullName(a), role: a.role || "", email: a.email || "", phone: a.phone || "", photo: person.photo || "" };
    }

    function sub() {
      var all = readJson("sessionStorage", SUB_KEY) || {};
      return all[bizId()] || { choice: null, details: null, dda: false, reviewed: {}, agreed: {} };
    }

    function saveSub(s) {
      var all = readJson("sessionStorage", SUB_KEY) || {};
      all[bizId()] = s;
      writeJson("sessionStorage", SUB_KEY, all);
    }

    /** The open (or signed, not yet applied) signer request for this business. */
    function request() {
      var reqs = readSign().requests;
      var id = bizId();
      return Object.keys(reqs).map(function (k) { return reqs[k]; })
        .filter(function (r) { return r.businessId === id && r.status !== "void"; })
        .sort(function (a, b) { return a.sentAt < b.sentAt ? 1 : -1; })[0] || null;
    }

    function editable() {
      var s = (data.statuses || []).filter(function (x) { return x.id === SE.getStatus(); })[0];
      return !!(s && s.editable);
    }

    function waiting() {
      var r = request();
      return !!(r && r.status === "pending" && editable());
    }

    /* ---------- what's missing (blocker) ---------- */

    function missingTabs() {
      var p = SE.getProgress().tabs || {};
      return SE.getTabs().filter(function (t) {
        if (t.id === "connectors") return false; // D-13: connectors only warn
        var c = p[t.id] || { required: 0, filled: 0 };
        return c.required > 0 && c.filled < c.required;
      }).map(function (t) {
        var c = p[t.id];
        return { id: t.id, title: t.title, missing: c.required - c.filled, required: c.required, filled: c.filled };
      });
    }

    function openBlocker(list) {
      var rows = list.map(function (t) {
        return '<li class="flex items-center justify-between gap-3 px-4 py-3">' +
          '<button type="button" data-sub-go="' + esc(t.id) + '" class="' + LINK + ' min-w-0 text-left">' + ICON.warnMini("size-4 shrink-0 text-amber-500 dark:text-amber-400") +
          '<span class="truncate">' + esc(t.title) + "</span></button>" +
          '<span class="shrink-0 type-caption text-tertiary">' + t.missing + (t.missing === 1 ? " required field missing" : " required fields missing") + "</span></li>";
      }).join("");
      var backdrop = M().open(
        '<div class="flex flex-col items-center gap-4 px-6 pb-6 text-center">' + ICON.triangle("size-10 text-amber-500 dark:text-amber-400") +
        '<div class="flex flex-col gap-2"><h2 id="se-sub-missing-title" class="type-title-modal text-default">Important Information Missing!</h2>' +
        '<p class="type-description text-tertiary">Required fields are left uncompleted. Please make sure to complete all required inputs. We will guide you on what\'s missing.</p></div>' +
        '<ul role="list" aria-label="Sections with missing information" class="w-full divide-y divide-gray-200 rounded-md border border-gray-200 text-left dark:divide-white/10 dark:border-white/10">' + rows + "</ul>" +
        "</div>",
        "se-sub-missing-title",
        {
          footer: '<div class="flex flex-col gap-3 px-6 pb-6"><button type="button" data-sub-go="' + esc(list[0].id) + '" class="' + BTN.primaryXl + ' w-full">I understand</button></div>',
        }
      );
      backdrop.addEventListener("click", function (e) {
        var go = e.target.closest && e.target.closest("[data-sub-go]");
        if (!go) return;
        goTo(go.getAttribute("data-sub-go"));
      });
    }

    function goTo(tabId) {
      M().close();
      SE.goToTab(tabId);
      var main = document.getElementById("se-main");
      if (main && main.getBoundingClientRect().top < 0) main.scrollIntoView({ block: "start" });
      var tab = document.getElementById("se-tab-" + tabId);
      if (tab) tab.focus({ preventScroll: true });
    }

    /* ---------- summaries (Step 2 accordions + the signer's read-only copy) ---------- */

    function connState() {
      return window.SmartEnrollConnectors ? window.SmartEnrollConnectors.getState() : { source: null, erp: null, api: null, banks: [] };
    }

    function connComplete() {
      return window.SmartEnrollConnectors ? window.SmartEnrollConnectors.isComplete() : true;
    }

    function nameOf(list, id) {
      var x = ((conn || {})[list] || []).filter(function (i) { return i.id === id; })[0];
      return x ? x.name : id || "";
    }

    function bankLabel(b) {
      var acc = String(b.account || "");
      return (b.name || nameOf("banks", b.bankId)) + (acc ? ", ending in " + acc.slice(-4) : "");
    }

    function bankStatus(b) {
      return b.status === "connected" ? "Connected" : b.status === "action" ? "Action Required" : "Pending Verification";
    }

    function accountLabel(id) {
      var list = (readJson("sessionStorage", SE.storageKey("connectors")) || {}).bankAccounts || data.bankAccounts || [];
      var a = list.filter(function (x) { return x.id === id; })[0];
      return a ? (a.name || "") + (a.last4 ? " •••• " + a.last4 : "") : id || "";
    }

    function summaryRows(tabId) {
      var b = business();
      if (tabId === "business-information") {
        var m = (readJson("sessionStorage", SE.storageKey(tabId)) || {})[bizId()] || {};
        var addr = [m.address, m.address2, m.city, [m.state, m.zip].filter(Boolean).join(" ")].filter(Boolean).join(", ");
        return [
          ["Business Legal Name", m.legalName || b.legalName],
          ["Business Structure", m.structure || b.structure],
          ["Legal Address", addr || b.legalAddress],
          ["Main Business Phone Number", m.phone || b.phone],
          ["Main Business Email Address", m.email || b.email],
          ["Organization Identification", [m.orgIdType || b.orgIdType, m.orgIdNumber || b.orgIdNumber].filter(Boolean).join(" · ")],
          ["Applicant", [applicant().name, applicant().role].filter(Boolean).join(", ")],
        ];
      }
      if (tabId === "ownership") {
        var o = readJson("sessionStorage", SE.storageKey(tabId)) || {};
        var owners = (o.owners || []).map(function (x) {
          return [x.type === "legal" ? x.legalName : fullName(x), (x.share ? x.share + "%" : "—") + " ownership"];
        });
        return owners.length ? owners : [["Owners", "None added yet"]];
      }
      if (tabId === "connectors") {
        var s = connState();
        var rows = [["Data source", s.source ? nameOf("sources", s.source) + (s.erp ? " · " + nameOf("providers", s.erp.provider) : "") : "Not started"]];
        if (!s.banks.length) rows.push(["Bank accounts", "Not started"]);
        s.banks.forEach(function (x) { rows.push([bankLabel(x), bankStatus(x)]); });
        return rows;
      }
      if (tabId === "configuration") {
        var c = readJson("sessionStorage", SE.storageKey(tabId));
        if (!c) return [["Default receiving account", "", true]];
        return [
          ["Default receiving account", accountLabel(c.account)],
          ["Min. invoice amount", c.min ? "$" + c.min : "—", false],
          ["Max. invoice amount", c.max ? "$" + c.max : "—", false],
        ];
      }
      var p = (SE.getProgress().tabs || {})[tabId] || { required: 0, filled: 0 };
      return [["Required fields", p.filled + " of " + p.required + " completed"]];
    }

    function percentOf(tabId) {
      var p = (SE.getProgress().tabs || {})[tabId] || { required: 0, filled: 0 };
      return p.required ? Math.floor((Math.min(p.filled, p.required) / p.required) * 100) : 100;
    }

    function addedProducts() {
      var addons = SE.getAddons();
      return (data.products || []).filter(function (p) { return p.kind === "base" || (p.kind === "addon" && addons[p.id]); });
    }

    function summarySnapshot() {
      var out = [{ title: "Products", rows: addedProducts().map(function (p) { return [p.name, "Requested"]; }) }];
      SE.getTabs().forEach(function (t) { out.push({ title: t.title, rows: summaryRows(t.id) }); });
      return out;
    }

    /* ---------- dialog frame ---------- */

    // Information circle + tooltip (components skill; shell.js infoTip, end-aligned so it stays inside a narrow row).
    function infoTip(id, label, text, align) {
      var pos = align === "start"
        ? "left-0 -ml-1 before:left-1.5"
        : "right-0 -mr-1 before:right-1.5";
      return (
        '<span class="group/info relative inline-flex size-5 shrink-0 items-center justify-center">' +
        '<span tabindex="0" role="button" aria-describedby="' + esc(id) + '" class="inline-flex cursor-help rounded-full text-gray-400 hover:text-gray-900 focus-visible:text-gray-900 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-blue-600 dark:text-gray-500 dark:hover:text-white dark:focus-visible:text-white dark:focus-visible:outline-blue-400">' +
        '<span class="sr-only">' + esc(label) + "</span>" + ICON.infoTip + "</span>" +
        '<span id="' + esc(id) + '" role="tooltip" class="pointer-events-none invisible absolute top-full z-30 mt-3 w-max max-w-64 sm:max-w-[343px] rounded-lg bg-gray-900 p-3 text-left text-sm/5 font-normal text-gray-100 opacity-0 shadow-xs transition-opacity duration-150 group-hover/info:visible group-hover/info:opacity-100 group-has-focus-visible/info:visible group-has-focus-visible/info:opacity-100 before:absolute before:-top-1 before:size-3 before:rotate-45 before:rounded-[2px] before:bg-inherit dark:bg-gray-950 dark:ring-1 dark:ring-white/10 ' + pos + '">' +
        esc(text) + "</span></span>"
      );
    }

    function header(title) {
      return (
        '<div data-sub-header class="flex items-center gap-3 border-b border-gray-200 px-4 py-4 sm:px-6 dark:border-white/10">' +
        (title === "Submit" ? ICON.flag : "") +
        '<h2 id="se-sub-title" class="min-w-0 flex-1 truncate type-title-modal text-default">' + esc(title) + "</h2>" +
        M().closeButton("data-ob-modal-close", "shrink-0") +
        "</div>"
      );
    }

    function stepper(n) {
      var dots = "";
      for (var i = 1; i <= 4; i++) {
        dots += i < n
          ? ICON.checkCircle("size-5 text-blue-600 dark:text-blue-400")
          : i === n
            ? '<span class="inline-flex size-5 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-400/20"><span class="size-2 rounded-full bg-blue-600 dark:bg-blue-400"></span></span>'
            : '<span class="inline-flex size-5 items-center justify-center"><span class="size-2 rounded-full bg-gray-300 dark:bg-white/20"></span></span>';
      }
      return '<div class="flex items-center gap-3"><span class="type-label text-default">Step ' + n + " of 4</span>" +
        '<span aria-hidden="true" class="flex items-center gap-1">' + dots + "</span></div>";
    }

    function stepTitle(title, text) {
      return '<div class="flex flex-col gap-1"><h3 id="se-sub-step-title" tabindex="-1" class="type-title-section text-default focus:outline-hidden">' + esc(title) + "</h3>" +
        (text ? '<p class="type-description text-tertiary">' + esc(text) + "</p>" : "") + "</div>";
    }

    function sectionTitle(id, title, html) {
      return '<div class="flex flex-col gap-1"><h4 id="' + id + '" class="type-title-card text-default">' + esc(title) + "</h4>" +
        (html ? '<p class="type-description text-tertiary">' + html + "</p>" : "") + "</div>";
    }

    function footer(left, right) {
      return '<div class="flex flex-col-reverse gap-3 border-t border-gray-200 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 dark:border-white/10">' +
        '<div class="flex">' + (left || "") + '</div><div class="flex flex-col gap-3 sm:flex-row">' + (right || "") + "</div></div>";
    }

    var PANEL = "relative flex w-full max-w-250 flex-col rounded-lg bg-white shadow-xl dark:bg-gray-900 dark:ring-1 dark:ring-white/10";
    var PANEL_NARROW = "relative flex w-full max-w-lg flex-col rounded-lg bg-white shadow-xl dark:bg-gray-900 dark:ring-1 dark:ring-white/10";

    var dialog = null;

    function isOpen() {
      var current = document.querySelector("[data-ob-modal-dialog]");
      return !!(dialog && current === dialog && dialog.isConnected && !dialog.hasAttribute("data-leave"));
    }

    /** Opens the Submit dialog or swaps its header / body / footer in place (connectors.js wideDialog). */
    function show(title, body, foot, narrow, focusSel) {
      if (isOpen()) {
        dialog.querySelector("[data-sub-header]").outerHTML = header(title);
        dialog.querySelector("[data-ob-modal-body]").innerHTML = body;
        dialog.querySelector("[data-ob-modal-footer]").innerHTML = foot;
        dialog.className = dialog.className.replace(/\bmax-w-(250|lg)\b/, narrow ? "max-w-lg" : "max-w-250");
        var scroller = dialog.closest("[data-ob-modal]");
        if (scroller) scroller.scrollTop = 0;
      } else {
        var backdrop = M().open(body, "se-sub-title", { bare: true, header: header(title), footer: foot, panelClass: narrow ? PANEL_NARROW : PANEL });
        dialog = backdrop.querySelector("[data-ob-modal-dialog]");
        bindDialog(backdrop);
      }
      var target = dialog.querySelector(focusSel || "#se-sub-step-title");
      if (target) setTimeout(function () { target.focus({ preventScroll: true }); }, 30);
    }

    /* ---------- Step 1: Hey, there is more! ---------- */

    function availableAddons() {
      var addons = SE.getAddons();
      return (data.products || []).filter(function (p) { return p.kind === "addon" && !addons[p.id]; });
    }

    function step1Needed() {
      return !SE.isReadOnly() && (availableAddons().length > 0 || !connComplete());
    }

    function addonRow(p) {
      return '<li class="' + ROW + ' w-full sm:w-64">' +
        '<button type="button" data-sub-addon="' + esc(p.id) + '" class="group/add flex min-w-0 flex-1 cursor-pointer items-center gap-2 rounded-sm text-left text-blue-600 hover:text-blue-700 ' + FOCUS + ' dark:text-blue-400 dark:hover:text-blue-300">' + ICON.plusDashed +
        '<span class="min-w-0 truncate type-label text-blue-600 group-hover/add:text-blue-700 dark:text-blue-400 dark:group-hover/add:text-blue-300"><span class="sr-only">Add </span>' + esc(p.name) + "</span></button>" +
        infoTip("se-sub-tip-" + p.id, "About " + p.name, p.info) + "</li>";
    }

    function badge(tone, label, icon) {
      return '<span class="' + BADGE + BADGE_TONE[tone] + '">' + (icon || "") + esc(label) + "</span>";
    }

    function connStatusBadge(status) {
      if (status === "connected") return badge("green", "Connected", ICON.checkCircle("size-3"));
      if (status === "action") return badge("amber", "Action Required", ICON.warnMini("size-3"));
      return badge("red", "Pending Verification", ICON.warnMini("size-3"));
    }

    function initialsTile(name, tone) {
      var ini = String(name || "").split(/\s+/).filter(Boolean).slice(0, 2).map(function (w) { return w.charAt(0).toUpperCase(); }).join("");
      return '<span aria-hidden="true" class="inline-flex size-8 shrink-0 items-center justify-center rounded-full ' + tone + ' type-label-small text-white">' + esc(ini) + "</span>";
    }

    function connectorsCard() {
      var s = connState();
      var b = business();
      var software;
      if (!s.source) {
        software = '<p class="type-body text-tertiary">No data source connected yet.</p>' +
          '<div><button type="button" data-sub-go="connectors" class="' + BTN.secondaryMd + '">' + ICON.plusSm + "Connect a data source</button></div>";
      } else if (s.source === "erp" && s.erp) {
        var provider = nameOf("providers", s.erp.provider);
        software = '<div class="flex items-center gap-3 rounded-lg bg-gray-100 p-3 dark:bg-white/5">' + initialsTile(b.legalName || b.name, "bg-orange-500") +
          '<div class="flex min-w-0 flex-col gap-0.5"><div class="flex flex-wrap items-center gap-2"><span class="type-label text-default">' + esc(b.legalName || b.name) + "</span>" + connStatusBadge(s.erp.status) + "</div>" +
          '<span class="truncate type-caption text-tertiary">' + esc(s.erp.email || provider) + "</span></div></div>" +
          (s.erp.status === "connected" ? "" :
            '<div class="flex gap-3 rounded-md bg-red-50 p-4 dark:bg-red-500/10">' + ICON.warnMini("mt-0.5 size-5 shrink-0 text-red-400") +
            '<div class="flex min-w-0 flex-col items-start gap-2"><p class="type-label text-red-800 dark:text-red-200">Confirmation of connection required</p>' +
            '<p class="type-body text-red-700 dark:text-red-300">Your ' + esc(provider) + " ERP connection needs a validation to be usable in the SMART Hub.</p>" +
            '<button type="button" data-sub-go="connectors" class="' + BTN.dangerMd + '">Validate Connection</button></div></div>');
      } else {
        software = '<div class="flex items-center gap-3 rounded-lg bg-gray-100 p-3 dark:bg-white/5">' + ICON.software +
          '<span class="type-label text-default">' + esc(nameOf("sources", s.source)) + "</span>" + badge("green", "Selected", ICON.checkCircle("size-3")) + "</div>";
      }
      var banks = s.banks.map(function (x) {
        var action = x.status === "action";
        return '<li class="flex items-center gap-3 rounded-lg border p-3 ' + (action ? "border-yellow-300 bg-yellow-50 dark:border-yellow-400/30 dark:bg-yellow-400/10" : "border-gray-200 bg-white dark:border-white/10 dark:bg-gray-900") + '">' +
          initialsTile(nameOf("banks", x.bankId), "bg-gray-800 dark:bg-white/20") +
          '<div class="flex min-w-0 flex-col gap-0.5"><div class="flex flex-wrap items-center gap-2"><span class="type-label text-default">' + esc(x.holder || b.legalName || b.name) + "</span>" + connStatusBadge(x.status) + "</div>" +
          '<span class="truncate type-caption text-tertiary">' + esc(bankLabel(x)) + "</span></div></li>";
      }).join("");
      return (
        '<section aria-labelledby="se-sub-conn-title" class="flex flex-col gap-4 rounded-lg border border-amber-300 p-4 sm:p-5 dark:border-amber-400/40">' +
        sectionTitle("se-sub-conn-title", "Connectors", "Once connected, you'll also be able to quickly validate your business legal details and complete the onboarding process.") +
        '<div class="grid grid-cols-1 gap-4 md:grid-cols-2">' +
        '<div class="flex flex-col gap-3"><h5 class="type-label text-default">Accounting Software</h5><div class="flex flex-1 flex-col gap-3 rounded-lg bg-gray-50 p-3 dark:bg-white/5">' + software + "</div></div>" +
        '<div class="flex flex-col gap-3"><h5 class="type-label text-default">Bank Accounts</h5><div class="flex flex-1 flex-col gap-3 rounded-lg bg-gray-50 p-3 dark:bg-white/5">' +
        (banks ? '<ul role="list" class="flex flex-col gap-2">' + banks + "</ul>" : '<p class="type-body text-tertiary">No bank account added yet.</p>') +
        '<div class="mt-auto"><button type="button" data-sub-go="connectors" class="' + BTN.secondaryMd + '">' + ICON.plusSm + "Add bank account</button></div></div></div>" +
        "</div></section>"
      );
    }

    function renderStep1() {
      var addons = availableAddons();
      var body =
        '<div class="flex flex-col gap-6 px-4 py-5 sm:px-6">' + stepper(1) + stepTitle("Hey, there is more!") +
        (addons.length
          ? '<section aria-labelledby="se-sub-more-title" class="flex flex-col gap-4">' +
            sectionTitle("se-sub-more-title", "Take advantage of more payment capabilities and features", "You can opt in for additional capabilities below, or at a later date by accessing SMART Hub through your ERP or accounting software.") +
            RULE + '<ul role="list" class="flex flex-wrap gap-3">' + addons.map(addonRow).join("") + "</ul></section>"
          : "") +
        (connComplete() ? "" : connectorsCard()) +
        "</div>";
      show("Submit", body, footer("", '<button type="button" data-sub-next class="' + BTN.primaryXl + ' sm:w-50">Next' + ICON.chevronRight + "</button>"));
    }

    /* ---------- Step 2: One Final Step ---------- */

    function connChip(icon, label, state) {
      var b = state === "connected" ? badge("green", "Connected", ICON.checkCircle("size-3"))
        : state === "progress" ? badge("blue", "In progress", ICON.dashed("size-3"))
        : badge("gray", "Not Started", ICON.xCircle("size-3"));
      return '<li class="flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2 dark:bg-white/5">' + icon + '<span class="type-label text-default">' + esc(label) + "</span>" + b + "</li>";
    }

    function connStates() {
      var s = connState();
      var sw = !s.source ? "none" : s.source === "erp" && s.erp && s.erp.status !== "connected" ? "progress" : "connected";
      var bank = !s.banks.length ? "none" : s.banks.some(function (x) { return x.status === "connected"; }) ? "connected" : "progress";
      return { software: sw, bank: bank };
    }

    // SE Review Info Drops 5280:338651: header (white / open gray-50 / missing yellow) with chevron; Edit sits in the header.
    function accordion(t) {
      var open = !!ui.open[t.id];
      var pct = percentOf(t.id);
      var missing = pct < 100;
      var rows = summaryRows(t.id).map(function (r) {
        var miss = r[2] === undefined ? !r[1] : r[2];
        return '<div class="grid grid-cols-1 gap-0.5 rounded-sm px-2 py-1.5 sm:grid-cols-2 sm:gap-4"><dt class="type-label ' + (miss ? "flex items-center gap-1.5 text-amber-800 dark:text-amber-300" : "text-default") + '">' +
          (miss ? ICON.warnMini("size-4 shrink-0 text-amber-500 dark:text-amber-400") : "") + esc(r[0]) + '</dt><dd class="type-body break-words ' + (miss ? "text-amber-800 dark:text-amber-300" : "text-secondary") + '">' + esc(r[1] || "--") + "</dd></div>";
      }).join("");
      var hdr = missing
        ? "border-yellow-300 bg-yellow-50 dark:border-yellow-400/30 dark:bg-yellow-400/10"
        : open ? "border-gray-300 bg-gray-50 dark:border-white/15 dark:bg-white/10" : "border-gray-300 bg-white dark:border-white/15 dark:bg-white/5";
      return (
        '<li class="' + CARD.replace("border-gray-200", "border-transparent") + ' flex flex-col gap-2">' +
        '<h4 class="flex items-center gap-3 rounded-md border px-3 py-2 ' + hdr + '">' +
        '<button type="button" data-sub-acc="' + esc(t.id) + '" aria-expanded="' + open + '" aria-controls="se-sub-acc-' + esc(t.id) + '" class="group/acc flex min-w-0 flex-1 cursor-pointer items-center gap-3 rounded-sm text-left ' + FOCUS + '">' +
        '<span class="min-w-0 flex-1 truncate type-body-large text-default">' + esc(t.title) + "</span>" +
        (missing ? badge("yellow", "Missing required information", ICON.warnMini("size-3")) : badge("gray", pct + "% complete")) +
        '<span class="text-gray-500 group-hover/acc:text-gray-700 dark:text-gray-400 dark:group-hover/acc:text-gray-200">' + ICON.chevronDown + "</span></button>" +
        '<button type="button" data-sub-go="' + esc(t.id) + '" class="' + BTN.secondaryXs + '">' + ICON.pencil + "Edit" + '<span class="sr-only"> ' + esc(t.title) + "</span></button></h4>" +
        '<div id="se-sub-acc-' + esc(t.id) + '"' + (open ? "" : " hidden") + ' class="rounded-md bg-gray-50 p-2 dark:bg-white/5">' +
        '<dl class="flex flex-col gap-0.5">' + rows + "</dl></div></li>"
      );
    }

    function productChip(p) {
      return '<li class="' + ROW + ' w-full sm:w-64"><img src="../../assets/illustrations/smart-hub-tile.svg?v=20261111" alt="" width="28" height="28" class="size-7 shrink-0 rounded-full" />' +
        '<span class="min-w-0 flex-1 truncate type-label text-default">' + esc(p.name) + "</span>" + infoTip("se-sub-ptip-" + p.id, "About " + p.name, p.info) + "</li>";
    }

    function renderStep2() {
      var cs = connStates();
      var warn = "";
      if (!connComplete()) {
        var parts = [];
        if (cs.software !== "connected") parts.push("<strong class=\"font-semibold text-default\">Accounting Software</strong>");
        if (cs.bank !== "connected") parts.push("<strong class=\"font-semibold text-default\">Bank Account</strong>");
        warn = sectionTitle("se-sub-conn-warn", "Your connections are incomplete",
          "Your " + parts.join(" and ") + (parts.length > 1 ? " are" : " is") + " not connected. You can't initiate payments from your accounts until you connect your accounting software and bank account.") + RULE;
      }
      var body =
        '<div class="flex flex-col gap-6 px-4 py-5 sm:px-6">' + stepper(2) +
        stepTitle("One Final Step", "Confirm the information you provided.") +
        '<section aria-label="Connections" class="flex flex-col gap-4">' + warn +
        '<ul role="list" class="flex flex-wrap gap-3">' + connChip(ICON.software, "Accounting Software", cs.software) + connChip(ICON.bank, "Bank Account", cs.bank) + "</ul></section>" +
        '<section aria-labelledby="se-sub-order-title" class="flex flex-col gap-4">' +
        sectionTitle("se-sub-order-title", "Make sure everything is in order", "Below are the solutions and capabilities you're eligible for and the data you provided. Please review and make sure everything is accurate.") + RULE +
        '<ul role="list" class="flex flex-wrap gap-3">' + addedProducts().map(productChip).join("") + "</ul>" +
        '<ul role="list" class="flex flex-col gap-3">' + SE.getTabs().map(accordion).join("") + "</ul></section>" +
        "</div>";
      var back = ui.skipped ? "" : '<button type="button" data-sub-back class="' + BTN.secondaryXl + ' w-full sm:w-50">' + ICON.chevronLeft + "Back</button>";
      show("Submit", body, footer(back, '<button type="button" data-sub-next class="' + BTN.primaryXl + ' sm:w-50">Next' + ICON.chevronRight + "</button>"));
    }

    /* ---------- Step 3: Accept the terms (+ v2 "Are you authorized to sign?") ---------- */

    function radioCard(value, label, extra) {
      var s = sub();
      var checked = s.choice === value;
      return (
        '<div class="flex items-center overflow-hidden rounded-lg border border-gray-200 bg-white has-checked:bg-gray-50 dark:border-white/10 dark:bg-gray-900 dark:has-checked:bg-white/5">' +
        '<label class="' + RADIO_ROW + '">' +
        '<input type="radio" name="se-sub-signer" value="' + value + '" data-sub-signer' + (checked ? " checked" : "") + ' class="' + RADIO + '">' +
        '<span class="type-label text-default">' + esc(label) + "</span></label>" + (extra || "") + "</div>"
      );
    }

    function termsRows(s) {
      return TERMS.map(function (t) {
        var cid = "se-sub-agree-" + t.id;
        var reviewed = s.reviewed && s.reviewed[t.id];
        var link = '<a href="' + esc(t.href) + '" target="_blank" rel="noopener noreferrer" data-sub-review="' + t.id + '" class="' + LINK_INLINE + '">' + esc(t.label) + '<span class="sr-only"> (opens in a new tab)</span></a>';
        var text = "Agree and consent to the " + link + " for SMART Suite.";
        var right = reviewed
          ? '<input type="checkbox" id="' + cid + '" data-sub-agree="' + t.id + '"' + (s.agreed && s.agreed[t.id] ? " checked" : "") + " />"
          : '<a href="' + esc(t.href) + '" target="_blank" rel="noopener noreferrer" data-sub-review="' + t.id + '" class="' + LINK + ' shrink-0 text-xs">Review<span class="sr-only"> the ' + esc(t.label) + " (opens in a new tab)</span></a>";
        return '<li class="flex items-center justify-between gap-3 px-3 py-2.5">' +
          (reviewed ? '<label for="' + cid + '" class="type-description text-secondary">' + text + "</label>" : '<p class="type-description text-secondary">' + text + "</p>") + right + "</li>";
      }).join("");
    }

    function canConfirm(s) {
      return s.choice === "yes" && !!s.details && !!s.dda && TERMS.every(function (t) { return s.agreed && s.agreed[t.id]; });
    }

    function renderStep3() {
      var s = sub();
      var a = applicant();
      var yesExtra = s.choice === "yes" && s.details
        ? '<button type="button" data-sub-edit-details class="' + LINK + ' mr-4 shrink-0">' + ICON.pencil + "Edit Details</button>"
        : "";
      var yesBlock = "";
      if (s.choice === "yes" && s.details) {
        var person = a.photo
          ? '<img src="../../' + esc(a.photo) + '" alt="" class="size-10 shrink-0 rounded-full object-cover" />'
          : initialsTile(s.details.fullName, "bg-gray-500");
        yesBlock =
          '<ul role="list" class="max-w-2xl divide-y divide-gray-200 rounded-md border border-gray-200 bg-white dark:divide-white/10 dark:border-white/10 dark:bg-white/5">' +
          '<li class="flex items-center justify-between gap-3 px-3 py-2.5"><label for="se-sub-dda" class="type-description text-secondary">Agree and consent to Transcard and its Subsidiaries opening a virtual DDA account on your behalf.</label>' +
          '<span class="flex shrink-0 items-center gap-2">' +
          // TODO(confirm) Figma tooltip mentions "Canadian banking regulations" (copied text): neutral wording here.
          infoTip("se-sub-dda-tip", "About the DDA account", "A Demand Deposit Account (DDA) allows for electronic funds transfers and is used to facilitate Money Movement on your behalf in compliance with banking regulations.") +
          '<input type="checkbox" id="se-sub-dda" data-sub-dda' + (s.dda ? " checked" : "") + " /></span></li></ul>" +
          '<div class="flex flex-wrap items-center gap-x-6 gap-y-2">' +
          '<div class="flex items-center gap-3">' + person + '<div class="flex min-w-0 flex-col"><span class="type-label text-default">' + esc(s.details.fullName) + "</span>" +
          '<span class="type-caption text-tertiary">' + esc(a.role) + "</span></div></div>" +
          '<span class="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-2.5 py-1 type-label-small text-green-700 dark:bg-green-400/10 dark:text-green-400">' + ICON.checkCircle("size-4 text-green-500 dark:text-green-400") + "Authorized Signatory</span></div>" +
          RULE +
          // v1 28676:95204: the terms rows sit under the step title "Accept the terms" (no second heading).
          '<section aria-label="Terms" class="flex max-w-2xl flex-col gap-3">' +
          '<ul role="list" class="divide-y divide-gray-200 rounded-md border border-gray-200 bg-white dark:divide-white/10 dark:border-white/10 dark:bg-white/5">' + termsRows(s) + "</ul>" +
          '<p class="flex gap-1.5 type-caption text-tertiary">' + ICON.info + "Must review Terms and Conditions and Privacy Policy before proceeding to the next step.</p></section>" +
          '<p class="type-caption text-tertiary">By clicking “Confirm,” you consent to the Terms with Transcard and its Subsidiaries. You agree to allow us to access your data to provide payment solutions by initiating a payment order from your payment account held by a third-party payment service provider utilising Integrated Banking Services.</p>';
      }
      var body =
        '<div class="flex flex-col gap-6 px-4 py-5 sm:px-6">' + stepper(3) +
        stepTitle("Accept the terms", "Please confirm that you consent to the terms and conditions by checking the boxes and signing below.") +
        '<section aria-labelledby="se-sub-att-title" class="flex flex-col gap-4">' +
        sectionTitle("se-sub-att-title", "Authorized Signatory Attestation", "By signing and consenting to this application, I authorize Transcard and its agents to investigate and access the business and credit information, as well as records of the company, for purposes related to payment initiation and integrated banking services.") +
        '<fieldset class="flex max-w-2xl min-w-0 flex-col gap-2"><legend class="mb-2 type-label text-default">Are you authorized to sign?</legend>' +
        radioCard("yes", "Yes, I am authorized to sign", yesExtra) +
        radioCard("no", "No, send to an authorized signer") +
        "</fieldset></section>" + yesBlock + "</div>";
      show("Submit", body, footer(
        '<button type="button" data-sub-back class="' + BTN.secondaryXl + ' w-full sm:w-50">' + ICON.chevronLeft + "Back</button>",
        '<button type="button" data-sub-confirm class="' + BTN.primaryXl + ' sm:w-50"' + (canConfirm(s) ? "" : " disabled") + ">Confirm</button>"
      ));
    }

    /* ---------- Step 3 sub-view: Provide additional details (v2 29991:55520, in place of a second dialog) ---------- */

    var COUNTRIES = [["US", "USA", "flag-us"], ["CA", "Canada", "flag-ca"], ["MX", "Mexico", "flag-mx"]];
    var STATES = ["Alabama", "California", "Colorado", "Florida", "Georgia", "Illinois", "Massachusetts", "New York", "Oregon", "Texas", "Washington"];

    function flag(code) {
      var c = COUNTRIES.filter(function (x) { return x[0] === code; })[0];
      return c ? '<img src="../../assets/smart-enroll/' + c[2] + '.svg" alt="" class="h-3.75 w-5 shrink-0 rounded-xs ring-1 ring-black/10" />' : "";
    }

    function selectField(id, label, value, options, placeholder) {
      var opts = options.map(function (o) {
        return '<el-option value="' + esc(o.value) + '" class="' + OPTION + '"><span class="flex items-center gap-2">' + (o.icon || "") +
          '<span class="block truncate font-normal group-aria-selected/option:font-semibold">' + esc(o.label) + "</span></span>" + ICON.checkSelected + "</el-option>";
      }).join("");
      return (
        '<div class="flex flex-col gap-1"><label for="' + id + '" class="' + F().LABEL + '">' + esc(label) + "</label>" +
        '<el-select id="' + id + '-select" data-sub-select="' + id + '" name="' + id + '"' + (value ? ' value="' + esc(value) + '"' : "") + ' class="block">' +
        '<button type="button" id="' + id + '" aria-invalid="false" aria-describedby="' + id + '-error" class="' + SELECT_TRIGGER + '">' +
        '<el-selectedcontent class="col-start-1 row-start-1 flex min-w-0 items-center gap-2 pr-6 text-gray-900 dark:text-white">' +
        (value ? "" : '<span class="truncate text-gray-400 dark:text-gray-500">' + esc(placeholder || "Select") + "</span>") + "</el-selectedcontent>" + ICON.selector + "</button>" +
        '<el-options anchor="bottom start" popover class="' + OPTIONS + '">' + opts + "</el-options></el-select>" + errorLine(id) + "</div>"
      );
    }

    function group(title, html) {
      return '<section class="overflow-hidden rounded-lg border border-gray-200 dark:border-white/10">' +
        '<h4 class="border-b border-gray-200 bg-gray-50 px-3 py-2 type-title-small text-default dark:border-white/10 dark:bg-white/5">' + esc(title) + "</h4>" +
        '<div class="flex flex-col gap-4 p-3">' + html + "</div></section>";
    }

    var DETAIL_FIELDS = [
      { key: "fullName", label: "Full Name" }, { key: "dob", label: "Date of Birth" }, { key: "nationality", label: "Nationality" },
      { key: "govIdNumber", label: "Government ID Number" }, { key: "country", label: "Country", select: true },
      { key: "address1", label: "Address Line 1" }, { key: "city", label: "City" }, { key: "state", label: "State / Province", select: true },
      { key: "zip", label: "Zip / Postal Code" }, { key: "phone", label: "Phone Number" },
    ];

    function renderDetails() {
      var a = applicant();
      var saved = sub().details;
      details = JSON.parse(JSON.stringify(saved || { fullName: a.name, dob: "", nationality: "", govIdNumber: "", govId: [], country: "US", address1: "", address2: "", city: "", state: "", zip: "", phone: a.phone }));
      var body =
        '<form id="se-sub-details" novalidate class="flex flex-col gap-4 px-4 py-5 sm:px-5">' +
        group("Personal Details",
          textField({ id: "se-sub-fullName", label: "Full Name", value: details.fullName, placeholder: "e.g. Johnny Anderson", autocomplete: "name" }) +
          textField({ id: "se-sub-dob", label: "Date of Birth", value: details.dob, placeholder: "mm-dd-yyyy", inputmode: "numeric", maxlength: 10, autocomplete: "bday" }) +
          textField({ id: "se-sub-nationality", label: "Nationality", value: details.nationality, placeholder: "e.g. American" }) +
          textField({ id: "se-sub-govIdNumber", label: "Government ID Number", value: details.govIdNumber, placeholder: "AAA-GG-SSSS" }) +
          '<div class="flex flex-col gap-1"><p id="se-sub-govid-label" class="flex items-baseline gap-2"><span class="' + F().LABEL + '">Upload Government ID</span><span class="' + F().HELPER + '">Passport, DL</span></p>' +
          '<div data-sub-govid></div></div>') +
        group("Address",
          selectField("se-sub-country", "Country", details.country, COUNTRIES.map(function (c) { return { value: c[0], label: c[1], icon: flag(c[0]) }; })) +
          textField({ id: "se-sub-address1", label: "Address Line 1", value: details.address1, autocomplete: "address-line1" }) +
          textField({ id: "se-sub-address2", label: "Address Line 2", value: details.address2, optional: true, autocomplete: "address-line2" }) +
          textField({ id: "se-sub-city", label: "City", value: details.city, autocomplete: "address-level2" }) +
          '<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">' +
          selectField("se-sub-state", "State / Province", details.state, STATES.map(function (s) { return { value: s, label: s }; }), "Select") +
          textField({ id: "se-sub-zip", label: "Zip / Postal Code", value: details.zip, autocomplete: "postal-code" }) + "</div>") +
        group("Contact",
          textField({ id: "se-sub-phone", label: "Phone Number", value: details.phone, placeholder: "+1 (000) 000-0000", type: "tel", autocomplete: "tel", icon: ICON.phone })) +
        "</form>";
      show("Provide additional details", body, footer("",
        '<button type="button" data-sub-details-cancel class="' + BTN.secondaryLg + '">Cancel</button>' +
        '<button type="submit" form="se-sub-details" class="' + BTN.primaryLg + '">Save</button>'
      ), true, "#se-sub-fullName");
      var mount = dialog.querySelector("[data-sub-govid]");
      if (window.FileUpload && mount) {
        govUpload = window.FileUpload.mount(mount, {
          id: "se-sub-govid", name: "govId", label: "Upload Government ID", accept: ".pdf,.doc,.docx", acceptLabel: "PDF or DOCS file up to 10MB", maxSizeMb: 10,
          files: details.govId || [],
          onChange: function (files) { details.govId = files; if (files.length) govUpload.setError(null); },
        });
      }
    }

    function detailInput(key) { return document.getElementById("se-sub-" + key); }

    function readDetails() {
      DETAIL_FIELDS.concat([{ key: "address2" }]).forEach(function (f) {
        if (f.select) {
          var sel = dialog.querySelector('[data-sub-select="se-sub-' + f.key + '"]');
          details[f.key] = sel ? sel.value || "" : "";
        } else {
          var el = detailInput(f.key);
          if (el) details[f.key] = el.value.trim();
        }
      });
      details.govId = govUpload ? govUpload.getFiles() : details.govId;
    }

    function validateDetail(f) {
      var el = detailInput(f.key);
      if (!el) return true;
      var v = f.select ? (dialog.querySelector('[data-sub-select="se-sub-' + f.key + '"]') || {}).value : el.value.trim();
      var msg = v ? "" : f.label + " is required.";
      if (!msg && f.key === "dob" && !/^\d{2}-\d{2}-\d{4}$/.test(v)) msg = "Enter the date as MM-DD-YYYY.";
      return setFieldError(el, msg);
    }

    function saveDetails() {
      readDetails();
      var ok = DETAIL_FIELDS.map(validateDetail).every(Boolean);
      if (!details.govId || !details.govId.length) {
        if (govUpload) govUpload.setError("Government ID is required.");
        ok = false;
      }
      if (!ok) {
        var bad = dialog.querySelector('#se-sub-details [aria-invalid="true"]');
        if (bad) M().revealField(bad, document.getElementById(bad.id + "-error"));
        return;
      }
      var s = sub();
      s.choice = "yes";
      s.details = details;
      saveSub(s);
      if (govUpload) { govUpload.destroy(); govUpload = null; }
      ui.view = "step";
      renderStep3();
      focusAfter('[data-sub-signer][value="yes"]');
    }

    function focusAfter(sel) {
      setTimeout(function () { var el = dialog && dialog.querySelector(sel); if (el) el.focus({ preventScroll: true }); }, 40);
    }

    /* ---------- Step 3 sub-view: Send to an authorized signatory (merchant-services.js signer form) ---------- */

    function renderSigner() {
      var body =
        '<form id="se-sub-signer-form" novalidate class="flex flex-col gap-4 px-4 py-5 sm:px-6">' +
        '<p class="type-description text-tertiary">We\'ll email them a secure link to review and sign the application. They don\'t need to sign in.</p>' +
        textField({ id: "se-sub-signer-first", label: "First Name", autocomplete: "off" }) +
        textField({ id: "se-sub-signer-last", label: "Last Name", autocomplete: "off" }) +
        textField({ id: "se-sub-signer-email", label: "Email", type: "email", autocomplete: "off" }) +
        textField({ id: "se-sub-signer-note", label: "Note", textarea: true }) +
        "</form>";
      show("Send to an authorized signatory", body, footer("",
        '<button type="button" data-sub-signer-cancel class="' + BTN.secondaryLg + '">Cancel</button>' +
        '<button type="submit" form="se-sub-signer-form" data-sub-send class="' + BTN.primaryLg + '">Send</button>'
      ), true, "#se-sub-signer-first");
    }

    function signerValidate(input) {
      var v = input.value.trim();
      if (input.id === "se-sub-signer-email") {
        return setFieldError(input, !v ? "Email is required." : /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? "" : "Enter a valid email address.");
      }
      return setFieldError(input, v ? "" : (input.id === "se-sub-signer-first" ? "First Name" : "Last Name") + " is required.");
    }

    function token() {
      var a = new Uint8Array(12);
      (window.crypto || {}).getRandomValues ? window.crypto.getRandomValues(a) : a.forEach(function (_, i) { a[i] = Math.floor(Math.random() * 256); });
      return Array.prototype.map.call(a, function (b) { return ("0" + b.toString(16)).slice(-2); }).join("");
    }

    function sendRequest() {
      var form = dialog.querySelector("#se-sub-signer-form");
      var inputs = ["first", "last", "email"].map(function (k) { return form.querySelector("#se-sub-signer-" + k); });
      var ok = inputs.map(signerValidate).every(Boolean);
      if (!ok) {
        var bad = inputs.filter(function (i) { return i.getAttribute("aria-invalid") === "true"; })[0];
        if (bad) M().revealField(bad, document.getElementById(bad.id + "-error"));
        return;
      }
      var send = dialog.querySelector("[data-sub-send]");
      var backdrop = dialog.closest("[data-ob-modal]");
      backdrop.setAttribute("data-busy", "");
      send.disabled = true;
      send.innerHTML = ICON.spinner + "Sending…";
      var a = applicant();
      var b = business();
      var rec = {
        token: token(),
        businessId: bizId(),
        businessName: b.legalName || b.name,
        signer: { firstName: inputs[0].value.trim(), lastName: inputs[1].value.trim(), email: inputs[2].value.trim() },
        note: form.querySelector("#se-sub-signer-note").value.trim(),
        requestedBy: { name: a.name, role: a.role, email: a.email },
        sentAt: new Date().toISOString(),
        summary: summarySnapshot(),
        status: "pending",
      };
      setTimeout(function () {
        var s = readSign();
        // One open request per business: an older pending one is voided (its link expires).
        Object.keys(s.requests).forEach(function (k) {
          var r = s.requests[k];
          if (r.businessId === rec.businessId && r.status === "pending") r.status = "void";
        });
        s.requests[rec.token] = rec;
        writeSign(s);
        var st = sub();
        st.choice = "no";
        saveSub(st);
        backdrop.removeAttribute("data-busy");
        ui.view = "sent";
        renderSent();
        renderWaiting();
        gateNext();
      }, 900);
    }

    function emailLink(r, cls) {
      return '<a data-sub-email-link href="sign.html?token=' + encodeURIComponent(r.token) + '&amp;view=email" target="_blank" rel="noopener" class="' + (cls || LINK) + '">Open the email (demo)' + ICON.externalLink + '<span class="sr-only">(opens in a new tab)</span></a>';
    }

    // "Request sent" (not drawn in Figma: TODO(confirm) copy) — the components skill result dialog look.
    function renderSent() {
      var r = request();
      var body =
        '<div class="flex flex-col items-center gap-4 px-6 py-8 text-center">' + ICON.checkCircle("size-10 text-green-500 dark:text-green-400") +
        '<div class="flex flex-col gap-2"><h3 id="se-sub-step-title" tabindex="-1" class="type-title-modal text-default focus:outline-hidden">Request sent</h3>' +
        '<p class="type-description text-tertiary"><span class="font-medium text-default">' + esc(fullName(r.signer)) + "</span> will receive an email with a secure link to review and sign the application. We'll submit it for approval as soon as they sign.</p></div>" +
        emailLink(r) + "</div>";
      show("Submit", body, footer("", '<button type="button" data-ob-modal-close class="' + BTN.primaryXl + ' sm:w-50">Done</button>'), true);
    }

    /* ---------- Step 4: Your information has been received! ---------- */

    function renderStep4() {
      var body =
        '<div class="flex flex-col items-center gap-4 px-6 py-12 text-center sm:py-24">' + ICON.checkCircle("size-10 text-green-500 dark:text-green-400") +
        '<div class="flex max-w-lg flex-col gap-2"><h3 id="se-sub-step-title" tabindex="-1" class="type-title-section text-default focus:outline-hidden">Your information has been received!</h3>' +
        "<p class=\"type-description text-tertiary\">The data you provided has been securely transferred to the relevant department. If there'll be additional queries, we'll contact you via the email and phone you provided. Please check back in to view the status of your application.</p></div>" +
        '<button type="button" data-ob-modal-close class="' + BTN_NAV + '">' + ICON.chevronLeft + "Go back to onboarding</button></div>";
      show("Submit", body, footer("", '<button type="button" data-ob-modal-close class="' + BTN.primaryXl + ' sm:w-50">Done</button>'));
    }

    function submitSelf() {
      var s = sub();
      s.submittedAt = new Date().toISOString();
      saveSub(s);
      ui.step = 4;
      renderStep4();
      SE.setStatus("pending-approval");
    }

    /* ---------- dialog events ---------- */

    function goStep(n) {
      ui.step = n;
      ui.view = "step";
      if (n === 1) renderStep1();
      else if (n === 2) renderStep2();
      else if (n === 3) renderStep3();
      else renderStep4();
    }

    function bindDialog(backdrop) {
      guardSelectEsc(backdrop);
      backdrop.addEventListener("click", function (e) {
        var t = e.target;
        if (!t.closest) return;
        var el;
        if (t.closest("[data-sub-next]")) { goStep(ui.step + 1); return; }
        if (t.closest("[data-sub-back]")) { goStep(ui.step - 1); return; }
        if ((el = t.closest("[data-sub-go]"))) { goTo(el.getAttribute("data-sub-go")); return; }
        if ((el = t.closest("[data-sub-addon]"))) {
          var id = el.getAttribute("data-sub-addon");
          var p = (data.products || []).filter(function (x) { return x.id === id; })[0];
          M().close();
          SE.addAddon(id);
          if (p && p.tabs && p.tabs[0]) SE.goToTab(p.tabs[0]);
          return;
        }
        if ((el = t.closest("[data-sub-acc]"))) {
          var tid = el.getAttribute("data-sub-acc");
          ui.open[tid] = !ui.open[tid];
          el.setAttribute("aria-expanded", String(ui.open[tid]));
          document.getElementById("se-sub-acc-" + tid).hidden = !ui.open[tid];
          return;
        }
        if ((el = t.closest("[data-sub-review]"))) {
          // The document opens in a new tab (Figma v2 29621:11705); the row then shows its checkbox.
          var rid = el.getAttribute("data-sub-review");
          var s = sub();
          if (!(s.reviewed || {})[rid]) {
            s.reviewed = s.reviewed || {};
            s.reviewed[rid] = true;
            saveSub(s);
            setTimeout(function () { renderStep3(); focusAfter("#se-sub-agree-" + rid); }, 0);
          }
          return;
        }
        if (t.closest("[data-sub-edit-details]")) { ui.view = "details"; renderDetails(); return; }
        if (t.closest("[data-sub-details-cancel]")) {
          if (govUpload) { govUpload.destroy(); govUpload = null; }
          ui.view = "step";
          renderStep3();
          focusAfter("[data-sub-signer]:checked, [data-sub-signer]");
          return;
        }
        if (t.closest("[data-sub-signer-cancel]")) {
          ui.view = "step";
          renderStep3();
          focusAfter("[data-sub-signer]:checked, [data-sub-signer]");
          return;
        }
        if (t.closest("[data-sub-confirm]")) {
          if (canConfirm(sub())) submitSelf();
          return;
        }
      });

      backdrop.addEventListener("change", function (e) {
        var t = e.target;
        if (t.matches("[data-sub-signer]")) {
          if (t.value === "yes") {
            if (sub().details) { var s = sub(); s.choice = "yes"; saveSub(s); renderStep3(); focusAfter('[data-sub-signer][value="yes"]'); }
            else { ui.view = "details"; renderDetails(); }
          } else {
            ui.view = "signer";
            renderSigner();
          }
          return;
        }
        if (t.matches("[data-sub-dda]") || t.matches("[data-sub-agree]")) {
          var st = sub();
          if (t.matches("[data-sub-dda]")) st.dda = t.checked;
          else { st.agreed = st.agreed || {}; st.agreed[t.getAttribute("data-sub-agree")] = t.checked; }
          saveSub(st);
          var c = dialog.querySelector("[data-sub-confirm]");
          if (c) c.disabled = !canConfirm(st);
          return;
        }
        if (t.matches("el-select[data-sub-select]")) {
          var trigger = document.getElementById(t.getAttribute("data-sub-select"));
          if (trigger && t.value) setFieldError(trigger, "");
        }
      });

      backdrop.addEventListener("submit", function (e) {
        e.preventDefault();
        if (e.target.id === "se-sub-details") saveDetails();
        if (e.target.id === "se-sub-signer-form") sendRequest();
      });

      backdrop.addEventListener("input", function (e) {
        var t = e.target;
        if (t.id === "se-sub-dob") {
          var d = t.value.replace(/\D/g, "").slice(0, 8);
          t.value = d.length > 4 ? d.slice(0, 2) + "-" + d.slice(2, 4) + "-" + d.slice(4) : d.length > 2 ? d.slice(0, 2) + "-" + d.slice(2) : d;
        }
        if (t.getAttribute("aria-invalid") !== "true") return;
        if (/^se-sub-signer-(first|last|email)$/.test(t.id)) signerValidate(t);
        else {
          var f = DETAIL_FIELDS.filter(function (x) { return "se-sub-" + x.key === t.id; })[0];
          if (f) validateDetail(f);
        }
      });

      backdrop.addEventListener("focusout", function (e) {
        var t = e.target;
        if (!t.id || !dialog || !dialog.contains(t) || t.tagName !== "INPUT") return;
        if (/^se-sub-signer-(first|last|email)$/.test(t.id)) { signerValidate(t); return; }
        var f = DETAIL_FIELDS.filter(function (x) { return "se-sub-" + x.key === t.id && !x.select; })[0];
        if (f) validateDetail(f);
      });

      // OBModal has no close callback: drop the upload widget and re-render the waiting box when the dialog leaves.
      var observer = new MutationObserver(function () {
        if (backdrop.isConnected && !backdrop.hasAttribute("aria-hidden")) return;
        observer.disconnect();
        if (govUpload) { govUpload.destroy(); govUpload = null; }
        dialog = null;
      });
      observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["aria-hidden"] });
    }

    // Esc inside an open el-select list closes the list only (connectors.js guardSelectEsc).
    function guardSelectEsc(backdrop) {
      var listOpen = false;
      backdrop.addEventListener("keydown", function (event) {
        if (event.key !== "Escape") return;
        listOpen = Array.prototype.some.call(backdrop.querySelectorAll("el-options"), function (o) {
          try { return o.matches(":popover-open"); } catch (e) { return false; }
        });
      }, true);
      backdrop.addEventListener("keydown", function (event) {
        if (event.key === "Escape" && listOpen) event.stopPropagation();
      });
    }

    /* ---------- entry ---------- */

    function open() {
      if (SE.isReadOnly() || SE.getRole() === "contributor") return;
      if (waiting()) {
        var r = request();
        toast("Waiting for " + fullName(r.signer) + " to sign the application.", "info");
        return;
      }
      var missing = missingTabs();
      if (missing.length) { openBlocker(missing); return; }
      ui = { step: 1, view: "step", open: {}, skipped: false };
      if (step1Needed()) goStep(1);
      else { ui.skipped = true; goStep(2); }
    }

    /* ---------- waiting for the signer (left panel) + Next Step gate ---------- */

    function waitingReason() {
      var r = request();
      return r ? "Waiting for " + fullName(r.signer) + " to sign the application" : "";
    }

    function renderWaiting() {
      var anchor = document.querySelector("[data-se-status-box]");
      if (!anchor) return;
      var box = document.querySelector("[data-se-signer-box]");
      if (!box) {
        box = document.createElement("div");
        box.setAttribute("data-se-signer-box", "");
        anchor.insertAdjacentElement("afterend", box);
      }
      if (!waiting()) { box.className = "hidden"; box.innerHTML = ""; return; }
      var r = request();
      // Shell status box markup (amber tone + dashed ring). Label "Waiting for signature" is TODO(confirm): not drawn.
      box.className = "flex gap-2 rounded-md bg-amber-50 p-3 dark:bg-amber-400/10";
      box.innerHTML =
        ICON.dashed("mt-0.5 size-5 shrink-0 text-amber-500 dark:text-amber-400") +
        '<div class="flex min-w-0 flex-col gap-1 text-amber-700 dark:text-amber-300">' +
        '<p class="type-label">Waiting for signature</p>' +
        '<p class="type-body">We sent the application to <span class="font-medium">' + esc(fullName(r.signer)) + '</span> (<span class="break-all">' + esc(r.signer.email) + "</span>) on " + esc(stamp(r.sentAt)) +
        ". We'll submit it for approval as soon as they sign. You can keep editing in the meantime.</p>" +
        '<div class="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1">' +
        '<button type="button" data-sub-resend class="' + LINK + '">Resend</button>' + emailLink(r) +
        "</div></div>";
    }

    function gateNext() {
      var btn = document.querySelector("[data-se-next]");
      if (!btn || SE.getRole() === "contributor") return;
      var tabs = SE.getTabs();
      var last = tabs.length && tabs[tabs.length - 1].id === SE.getActiveTab();
      if (last && waiting()) {
        btn.setAttribute("aria-disabled", "true");
        btn.setAttribute("data-tooltip", waitingReason());
      } else if (btn.getAttribute("data-tooltip") && btn.getAttribute("data-tooltip").indexOf("Waiting for ") === 0) {
        btn.setAttribute("aria-disabled", "false");
        btn.removeAttribute("data-tooltip");
      }
    }

    /** A signer finished (this tab or another): the application goes to Pending Approval once. */
    function applySigned() {
      var r = request();
      if (!r || r.status !== "signed" || r.applied) return;
      var s = readSign();
      s.requests[r.token].applied = true;
      writeSign(s);
      if (editable()) {
        if (isOpen()) M().close();
        SE.setStatus("pending-approval");
        toast(r.signedBy + " signed the application. It's now pending approval.");
      }
    }

    function refresh() {
      applySigned();
      renderWaiting();
      gateNext();
    }

    document.addEventListener("click", function (e) {
      var t = e.target;
      if (!t.closest) return;
      if (t.closest("[data-sub-resend]")) {
        var s = readSign();
        var r = request();
        if (!r) return;
        s.requests[r.token].sentAt = new Date().toISOString();
        writeSign(s);
        renderWaiting();
        toast("Email sent again to " + r.signer.email + ".");
        var again = document.querySelector("[data-sub-resend]");
        if (again) again.focus();
      }
    });

    window.addEventListener("storage", function (e) { if (e.key === SIGN_KEY && data) refresh(); });

    SE.on("submit", function (detail, event) {
      event.preventDefault();
      if (data) open();
    });
    ["tab-change", "status-change", "addon-change", "business-change", "readonly-change"].forEach(function (n) {
      SE.on(n, function () { if (data) { renderWaiting(); gateNext(); } });
    });

    Promise.all([SE.ready, window.DataSource.load(CONNECTORS_DATA).catch(function () { return null; })]).then(function (res) {
      data = res[0];
      conn = res[1];
      refresh();
      // Demo / QA: ?submit=open opens the Submit flow once the tabs have reported their progress.
      var demo = new URLSearchParams(window.location.search).get("submit");
      if (demo === "open") setTimeout(open, 400);
    });

    window.SmartEnrollSubmission = {
      open: function () { if (data) open(); },
      missingTabs: function () { return data ? missingTabs() : []; },
      request: function () { return data ? request() : null; },
      reset: function () {
        var s = readSign();
        Object.keys(s.requests).forEach(function (k) { if (s.requests[k].businessId === bizId()) delete s.requests[k]; });
        writeSign(s);
        var all = readJson("sessionStorage", SUB_KEY) || {};
        delete all[bizId()];
        writeJson("sessionStorage", SUB_KEY, all);
        refresh();
      },
    };
  }

  function boot() {
    if (document.body && document.body.hasAttribute("data-se-sign")) initSignPage();
    else if (window.SmartEnroll) initApplication();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
