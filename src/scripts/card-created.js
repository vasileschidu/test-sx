/**
 * card-created.js
 * Step 5 "Complete Payment" for the Instant Virtual Card (Figma "5. Complete
 * Payment", node 19484:120301).
 *
 *   - Fills the card (payment amount, number, CVC, expiry, holder) and the
 *     receipt from the details saved by virtual-card.js.
 *   - Download Receipt opens the "Get your receipt" dialog. "Send and
 *     Continue" needs a valid email, saves it and downloads; "Skip" just
 *     downloads; X cancels.
 *     "Terms of Use" shows the terms, then comes back to the dialog.
 *   - The Bank Account flow's "Successfully Submitted!" (Figma node
 *     19555:96979, bank-submitted.html, data-cc-variant="bank") is the same
 *     page with the payment amount card in place of the Virtual Card and the
 *     bank details at the top of the receipt. The check flow's "Check Request
 *     Submitted!" (node 20325:93858, check-submitted.html,
 *     data-cc-variant="check") lists the check request, adds "How this works"
 *     and has Finish / Download Receipt / Share Receipt: Share sends the PDF
 *     to the device's share sheet, or opens the "Get your receipt" email
 *     dialog where files can't be shared. The debit card flow's version
 *     (debit-submitted.html, data-cc-variant="debit") starts the receipt with
 *     the card.
 *   - Trademark Disclaimer toggles its text; "How to use this card" opens the
 *     sample Virtual Card dialog (onboarding-vc-how.js).
 *   - The download saves "Card Created!" + card + receipt as a PDF file
 *     (html-to-image + jsPDF, loaded on first use); Finish and Close leaves
 *     the flow.
 * Content: src/data/sd-card-created.json (+ sd-virtual-card.json for state
 * codes and the terms).
 */
(function () {
  'use strict';

  var DATA_PATH = '../../data/sd-card-created.json';
  var VC_DATA_PATH = '../../data/sd-virtual-card.json';
  var ASSETS = '../../assets/onboarding/';
  var FORM_URL = 'instant-virtual-card.html';
  var EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  function getState() {
    return window.SDOnboardingContext ? window.SDOnboardingContext.getState() : {};
  }
  function saveState(patch) {
    if (window.SDOnboardingContext) window.SDOnboardingContext.saveState(patch);
  }
  function esc(v) { return window.OBModal.escapeHtml(v); }
  function $(sel) { return document.querySelector(sel); }

  function money(value, currency) {
    try {
      return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency || 'USD' }).format(Number(value || 0));
    } catch (error) {
      return '$' + Number(value || 0).toFixed(2);
    }
  }

  /** → "Wed, Jul 01 2022 01:12:01 PM (ET)" */
  function receiptDate(date) {
    var parts = {};
    new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/New_York', weekday: 'short', month: 'short', day: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true
    }).formatToParts(date).forEach(function (p) { parts[p.type] = p.value; });
    return parts.weekday + ', ' + parts.month + ' ' + parts.day + ' ' + parts.year + ' ' +
      parts.hour + ':' + parts.minute + ':' + parts.second + ' ' + parts.dayPeriod + ' (ET)';
  }

  /** Expiry "MM/YY", `years` from the day the card was created. */
  function validThru(date, years) {
    return String(date.getMonth() + 1).padStart(2, '0') + '/' + String((date.getFullYear() + years) % 100).padStart(2, '0');
  }

  function transactionId() {
    var chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789';
    var out = '';
    for (var i = 0; i < 20; i += 1) out += chars.charAt(Math.floor(Math.random() * chars.length));
    return out;
  }

  function stateCode(name, codes) {
    for (var code in codes) if (codes[code] === name) return code;
    return name;
  }

  // ---- Receipt details -------------------------------------------------------

  var LINE = '<img src="' + ASSETS + 'cc-line-dashed.svg" alt="" width="268" height="1" class="block h-px w-full">';
  var LINE_SOLID = '<img src="' + ASSETS + 'cc-line-solid.svg" alt="" width="268" height="1" class="block h-px w-full">';

  function item(label, lines) {
    return '<div class="flex flex-col">' +
      '<dt class="text-xs leading-4 font-medium text-[#6b7280]">' + esc(label) + '</dt>' +
      lines.filter(Boolean).map(function (l) {
        return '<dd class="text-base leading-6 break-words text-[#111827]"><span data-ob-skeleton>' + esc(l) + '</span></dd>';
      }).join('') +
    '</div>';
  }

  // ---- Download (PDF) ----------------------------------------------------------

  var LIBS = [
    'https://cdnjs.cloudflare.com/ajax/libs/html-to-image/1.11.11/html-to-image.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'
  ];
  var libsReady = null;
  var fileName = 'Receipt.pdf';

  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      var tag = document.createElement('script');
      tag.src = src;
      tag.onload = resolve;
      tag.onerror = function () { reject(new Error('Could not load ' + src)); };
      document.head.appendChild(tag);
    });
  }

  var fontCss = null;

  /**
   * The capture is drawn from an SVG, which can't load web fonts by URL, so
   * the page's Google Fonts (Latin subset) are inlined as data URLs once.
   */
  function embedFonts() {
    var link = document.querySelector('link[href^="https://fonts.googleapis.com/css2"]');
    if (!link) return Promise.resolve('');
    fontCss = fontCss || fetch(link.href).then(function (res) { return res.text(); }).then(function (css) {
      var faces = css.split('@font-face').slice(1).filter(function (block, i, all) {
        // Google labels each block with the subset in a comment before it.
        var before = i === 0 ? css.split('@font-face')[0] : all[i - 1];
        return /\/\*\s*latin\s*\*\/\s*$/.test(before);
      });
      return Promise.all(faces.map(function (block) {
        var url = (block.match(/url\(([^)]+)\)/) || [])[1];
        if (!url) return '';
        return fetch(url).then(function (res) { return res.blob(); }).then(function (blob) {
          return new Promise(function (resolve) {
            var reader = new FileReader();
            reader.onload = function () { resolve('@font-face' + block.replace(url, reader.result).replace(/\/\*[^*]*\*\/\s*$/, '')); };
            reader.readAsDataURL(blob);
          });
        });
      })).then(function (rules) { return rules.join('\n'); });
    }).catch(function () { return ''; });
    return fontCss;
  }

  /**
   * Renders the success header, amount/card and receipt into an A4 PDF (jsPDF).
   * `keepLinks` leaves the in-page links in, for builds that run unprompted
   * (hiding them would make the page jump).
   */
  function buildPdf(keepLinks) {
    var hidden = keepLinks ? [] : Array.prototype.slice.call(document.querySelectorAll('[data-cc-no-pdf]'));
    libsReady = libsReady || Promise.all(LIBS.map(loadScript));
    return Promise.all([libsReady, embedFonts()]).then(function (all) {
      // Hidden for the capture only (a filtered node would still leave its space).
      hidden.forEach(function (el) { el.classList.add('hidden'); });
      return window.htmlToImage.toJpeg($('[data-cc-capture]'), {
        quality: 0.92,
        pixelRatio: 2,
        backgroundColor: '#ffffff',
        fontEmbedCSS: all[1]
      });
    }).then(function (jpeg) {
      hidden.forEach(function (el) { el.classList.remove('hidden'); });
      var img = new Image();
      img.src = jpeg;
      return img.decode().then(function () { return img; });
    }).then(function (img) {
      var pdf = new window.jspdf.jsPDF({ unit: 'pt', format: 'a4', compress: true });
      var pageW = pdf.internal.pageSize.getWidth();
      var pageH = pdf.internal.pageSize.getHeight();
      var margin = 32;
      var scale = Math.min((pageW - margin * 2) / img.width, (pageH - margin * 2) / img.height);
      var w = img.width * scale;
      var h = img.height * scale;
      pdf.addImage(img.src, 'JPEG', (pageW - w) / 2, margin, w, h);
      return pdf;
    }).catch(function (error) {
      hidden.forEach(function (el) { el.classList.remove('hidden'); });
      libsReady = null;
      throw error;
    });
  }

  /** Runs `work` with `btn` disabled until it settles. */
  function busy(btn, work) {
    if (btn) btn.disabled = true;
    return work().catch(function (error) {
      if (!error || error.name !== 'AbortError') console.error('[card-created]', error);
    }).then(function () {
      if (btn) btn.disabled = false;
    });
  }

  /** Saves the receipt PDF. */
  function download() {
    busy($('[data-cc-download]'), function () {
      return buildPdf().then(function (pdf) { pdf.save(fileName); });
    });
  }

  var shareFile = null;

  /**
   * Builds the PDF for Share ahead of time: the browser only opens the share
   * sheet straight after a click, which is too short to render a PDF in.
   */
  function prepareShare() {
    if (!navigator.share) return;
    buildPdf(true).then(function (pdf) {
      shareFile = new File([pdf.output('blob')], fileName, { type: 'application/pdf' });
    }).catch(function () { shareFile = null; });
  }

  /**
   * Shares the receipt PDF with the device's share sheet; where that isn't
   * possible (no Web Share, files not supported, PDF not ready), `fallback`
   * opens the "Get your receipt" email dialog instead.
   */
  function share(fallback) {
    if (!navigator.share || !shareFile || (navigator.canShare && !navigator.canShare({ files: [shareFile] }))) {
      fallback();
      return;
    }
    navigator.share({ files: [shareFile], title: 'Payment receipt' }).catch(function (error) {
      if (error && error.name === 'AbortError') return;  // closed by the user
      fallback();
    });
  }

  // ---- "Get your receipt" dialog ---------------------------------------------

  var CHECKBOX = '<span class="relative mt-0.5 flex size-4 shrink-0">' +
      '<input type="checkbox" id="cc-receipt-consent" data-cc-consent class="peer size-4 cursor-pointer appearance-none rounded border border-gray-300 bg-white not-checked:hover:border-gray-400 checked:border-[#2563eb] checked:bg-[#2563eb] checked:hover:border-[#1d4ed8] checked:hover:bg-[#1d4ed8] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2563eb]">' +
      '<img src="' + ASSETS + 'icon-checkbox-check.svg" alt="" width="12" height="12" class="pointer-events-none absolute top-1/2 left-1/2 hidden size-3 -translate-x-1/2 -translate-y-1/2 peer-checked:block">' +
    '</span>';

  /** `after` runs once the dialog is done (Send or Skip); by default the download. */
  function openReceipt(data, vcData, draft, after) {
    after = after || download;
    var M = window.OBModal;
    var F = window.OBField;
    var r = data.receipt;
    draft = draft || { email: '', consent: false, checked: false };

    var backdrop = M.open(
      '<div class="flex flex-col items-center gap-6 px-6 pb-6">' +
        '<div class="flex w-full flex-col items-center gap-4">' +
          M.illustration('icon-mail-notification.svg', 'bg-[#2b61df]/10') +
          '<div class="flex w-full flex-col items-center gap-2 text-center">' +
            '<h2 id="cc-receipt-title" class="text-lg leading-6 font-medium text-[#111827]">' + esc(r.title) + '</h2>' +
            '<p class="text-sm leading-5 text-[#6b7280]">' + esc(r.text) + '</p>' +
          '</div>' +
        '</div>' +
        '<div class="flex w-full flex-col gap-1">' +
          '<label for="cc-receipt-email" class="' + F.LABEL + '">Email</label>' +
          '<div class="relative">' +
            '<input id="cc-receipt-email" data-cc-email type="email" autocomplete="email" inputmode="email" value="' + esc(draft.email) + '" aria-invalid="false" aria-describedby="cc-receipt-email-error" class="' + F.INPUT + '">' +
            F.errorIcon() +
          '</div>' +
          '<p id="cc-receipt-email-error" data-cc-email-error class="hidden ' + F.ERROR_TEXT + '"></p>' +
        '</div>' +
        '<div class="flex w-full items-start gap-3">' +
          CHECKBOX +
          '<p class="text-xs leading-4 text-[#374151]"><label for="cc-receipt-consent" class="cursor-pointer">' + esc(r.consent) + '</label> ' +
            '<button type="button" data-cc-terms class="cursor-pointer rounded text-[#2563eb] hover:underline focus-visible:outline-2 focus-visible:outline-blue-600">' + esc(r.consentLink) + '</button>.</p>' +
        '</div>' +
      '</div>' +
      '<div class="flex flex-col gap-4 px-6 pb-6">' +
        '<button type="button" data-cc-send class="' + M.BUTTON + ' bg-[#2563eb] text-white hover:bg-[#3b82f6] focus-visible:outline-[#2563eb]">Send and Continue</button>' +
        '<button type="button" data-cc-skip class="' + M.BUTTON + ' border border-[#d1d5db] bg-white text-[#374151] hover:bg-gray-50 focus-visible:outline-blue-600">Skip</button>' +
      '</div>',
      'cc-receipt-title'
    );

    var input = backdrop.querySelector('[data-cc-email]');
    var error = backdrop.querySelector('[data-cc-email-error]');
    var consent = backdrop.querySelector('[data-cc-consent]');
    consent.checked = !!draft.consent;

    function message() {
      var v = input.value.trim();
      if (!v) return r.requiredMessage;
      if (!EMAIL_PATTERN.test(v)) return r.invalidMessage;
      return '';
    }
    function check() {
      var msg = message();
      F.setError(input, !!msg, error, msg);
      return !msg;
    }
    if (draft.checked) check();
    input.addEventListener('input', function () {
      if (draft.checked) check();
    });

    backdrop.querySelector('[data-cc-send]').addEventListener('click', function () {
      draft.checked = true;
      if (!check()) { input.focus(); return; }
      saveState({ receiptEmail: input.value.trim(), receiptEmailConsent: consent.checked });
      M.close();
      after();
    });
    backdrop.querySelector('[data-cc-skip]').addEventListener('click', function () {
      M.close();
      after();
    });

    // The terms replace this dialog for a moment, then bring it back as it was.
    backdrop.querySelector('[data-cc-terms]').addEventListener('click', function () {
      var terms = vcData.agreements[0];
      var keep = { email: input.value, consent: consent.checked, checked: draft.checked };
      var termsBackdrop = M.open(
        '<div class="flex flex-col gap-4 px-6 pb-6">' +
          '<h2 id="cc-terms-title" class="text-lg leading-6 font-medium text-[#111827]">' + esc(terms.title) + '</h2>' +
          '<div class="max-h-[50vh] space-y-3 overflow-y-auto text-sm leading-5 text-[#374151]">' +
            terms.body.map(function (p) { return '<p>' + esc(p) + '</p>'; }).join('') +
          '</div>' +
          '<button type="button" data-cc-terms-back class="' + M.BUTTON + ' bg-[#2563eb] text-white hover:bg-[#3b82f6] focus-visible:outline-[#2563eb]">OK</button>' +
        '</div>',
        'cc-terms-title'
      );
      termsBackdrop.querySelector('[data-cc-terms-back]').addEventListener('click', function () {
        openReceipt(data, vcData, keep, after);
      });
    });
  }

  // ---- "How this works" (check) ---------------------------------------------

  function openCheckHow(how) {
    var M = window.OBModal;
    M.open(
      '<div class="flex flex-col items-center gap-6 px-6 pb-6">' +
        '<div class="flex w-full flex-col items-center gap-4">' +
          M.illustration('icon-mail-notification.svg', 'bg-[#2b61df]/10') +
          '<h2 id="cc-check-how-title" class="text-center text-lg leading-6 font-medium text-[#111827]">' + esc(how.title) + '</h2>' +
        '</div>' +
        '<ul class="w-full list-disc space-y-2 rounded-md bg-[#f9fafb] py-4 pr-4 pl-9 text-sm leading-5 text-[#374151]">' +
          how.items.map(function (item) { return '<li>' + esc(item) + '</li>'; }).join('') +
        '</ul>' +
        '<button type="button" data-ob-modal-close class="' + M.BUTTON + ' bg-[#2563eb] text-white hover:bg-[#3b82f6] focus-visible:outline-[#2563eb]">OK</button>' +
      '</div>',
      'cc-check-how-title'
    );
  }

  // ---- Page ------------------------------------------------------------------

  function addressLines(info, codes) {
    return [
      info.address1 + (info.address2 ? ' ' + info.address2 : ''),
      info.city + ' ' + stateCode(info.state, codes) + ' ' + info.zip
    ];
  }
  function lastFour(v) { return 'ending in ' + String(v || '').replace(/\D/g, '').slice(-4); }

  /** One record per payment: keep its date and transaction ID across reloads. */
  function record(state, key, signature) {
    var created = state[key];
    if (!created) {
      created = { at: (signature && signature.signedAt) || new Date().toISOString(), transactionId: transactionId() };
      var patch = {};
      patch[key] = created;
      saveState(patch);
    }
    return created;
  }

  function init(data, vcData) {
    var state = getState();
    var variantEl = $('[data-cc-variant]');
    var variantName = variantEl ? variantEl.getAttribute('data-cc-variant') : 'card';
    var bankVariant = variantName === 'bank';
    var amountCard = variantName === 'bank' || variantName === 'check' || variantName === 'debit';
    var created, rows;

    if (bankVariant) {
      var bank = state.bankAccount;
      var info = state.bankAccountInfo;
      if (!bank || !info) {
        window.location.replace('bank-details.html');
        return;
      }
      created = record(state, 'bankSubmitted', state.bankSignature);
      rows =
        item('Full Name', [bank.holder]) +
        item('Routing Number', [lastFour(bank.routing)]) +
        item('Account Number', [lastFour(bank.account)]) +
        LINE +
        item('Billing Address', addressLines(info, vcData.stateCodes)) +
        item('Date of Birth', [info.dob]) +
        item('SSN (Social Security Number)', [lastFour(info.ssn)]) +
        LINE +
        item('Contact Info', [info.phone, info.email]);
    } else if (variantName === 'debit') {
      var card = state.debitCard;
      var debitInfo = state.debitAccountInfo;
      if (!card || !debitInfo) {
        window.location.replace('debit-card-details.html');
        return;
      }
      created = record(state, 'debitSubmitted', state.debitSignature);
      var cardLines = window.OBDebit.cardLines(card);
      rows =
        '<div><dt class="sr-only">Debit card</dt>' +
          '<dd class="flex flex-col items-start gap-3">' + window.OBDebit.badge(card.brand, true) +
            '<span class="flex flex-col gap-0.5">' +
              '<span class="text-base leading-6 text-[#111827]"><span data-ob-skeleton>' + esc(cardLines[0]) + '</span></span>' +
              '<span class="text-xs leading-4 font-medium text-[#6b7280]">' + esc(cardLines[1]) + '</span>' +
              '<span class="text-xs leading-4 font-medium text-[#6b7280]">' + esc(cardLines[2]) + '</span>' +
            '</span>' +
          '</dd></div>' +
        LINE +
        item('Billing Address', addressLines(debitInfo, vcData.stateCodes)) +
        item('Date of Birth', [debitInfo.dob]) +
        item('SSN (Social Security Number)', [lastFour(debitInfo.ssn)]) +
        LINE +
        item('Contact Info', [debitInfo.phone, debitInfo.email]);
    } else if (variantName === 'check') {
      var check = state.checkRequest;
      if (!check) {
        window.location.replace('check-request.html');
        return;
      }
      created = record(state, 'checkSubmitted', state.checkSignature);
      rows =
        item('Full Name', [(check.firstName + ' ' + check.lastName).trim()]) +
        item('Date of Birth', [check.dob]) +
        item('SSN (Social Security Number)', [lastFour(check.ssn)]) +
        LINE +
        item('Mailing Address', addressLines(check, vcData.stateCodes)) +
        LINE +
        item('Contact Info', [check.phone, check.email]);
    } else {
      var vc = state.virtualCard;
      if (!vc) {
        window.location.replace(FORM_URL);
        return;
      }
      created = record(state, 'virtualCardCreated', state.virtualCardSignature);
      var holder = (vc.firstName + ' ' + vc.lastName).trim();
      var cardDate = new Date(created.at);

      // Card
      $('[data-cc-number]').textContent = data.card.number;
      $('[data-cc-cvc]').textContent = data.card.cvc;
      $('[data-cc-type]').textContent = data.card.type;
      $('[data-cc-valid]').textContent = validThru(cardDate, data.card.validYears);
      $('[data-cc-holder]').textContent = holder;
      $('[data-cc-trademark-text]').textContent = data.trademark;

      rows =
        item('Full Name', [holder]) +
        item('Date of Birth', [vc.dob]) +
        item('SSN (Social Security Number)', [lastFour(vc.ssn)]) +
        LINE +
        item('Mailing Address', addressLines(vc, vcData.stateCodes)) +
        LINE +
        item('Contact Info', [vc.phone, vc.email]);
    }
    var createdAt = new Date(created.at);
    fileName = 'Receipt-' + created.transactionId + '.pdf';

    // Receipt
    $('[data-cc-details]').innerHTML = rows +
      LINE +
      item('Receipt Date', [receiptDate(createdAt)]) +
      LINE +
      item('Transaction ID', [created.transactionId]) +
      LINE_SOLID +
      '<div><dt class="sr-only">Paid by</dt><dd class="text-base leading-6 font-semibold text-[#111827]"><span data-ob-skeleton>' + esc(window.OBModal.clientName()) + '</span></dd></div>';

    // Amount: the payment amount from the start of the flow.
    var ctx = window.SDOnboardingContext;
    var amountReady = Promise.resolve(ctx && ctx.bootstrap ? ctx.bootstrap() : null).then(function (s) {
      var payable = (s && s.payableContext) || {};
      var amount = money(payable.amount || (s && s.amount), payable.currency);
      if (amountCard) {
        var m = amount.match(/^(.*?)(\.\d{2})$/) || [amount, amount, ''];
        $('[data-cc-integer]').textContent = m[1];
        $('[data-cc-decimal]').textContent = m[2];
      } else {
        $('[data-cc-amount]').textContent = amount;
        $('[data-cc-loaded]').textContent = amount;
      }
    });

    // Trademark Disclaimer (Virtual Card only)
    var tmBtn = $('[data-cc-trademark]');
    if (tmBtn) tmBtn.addEventListener('click', function () {
      var open = tmBtn.getAttribute('aria-expanded') !== 'true';
      tmBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
      $('[data-cc-trademark-text]').hidden = !open;
    });

    var how = $('[data-cc-how]');
    if (how) how.addEventListener('click', function () { window.OBVirtualCardHow.open(vcData); });
    $('[data-cc-download]').addEventListener('click', function () { openReceipt(data, vcData); });
    $('[data-cc-finish]').addEventListener('click', function () { window.OBGo(data.finishUrl); });

    // Check flow: Share Receipt and "How this works".
    var shareBtn = $('[data-cc-share]');
    if (shareBtn) {
      shareBtn.addEventListener('click', function () {
        share(function () { openReceipt(data, vcData, null, function () {}); });
      });
      // Once the page has settled (no skeletons), so the PDF shows real values.
      var T = window.OnboardingTransitions;
      if (T && T.whenReady) T.whenReady(function () { setTimeout(prepareShare, 300); });
      else prepareShare();
    }
    var checkHow = $('[data-cc-check-how]');
    if (checkHow) checkHow.addEventListener('click', function () { openCheckHow(data.checkHow); });

    return amountReady;
  }

  document.addEventListener('DOMContentLoaded', function () {
    var M = window.OBModal;
    var ready = Promise.all([
      M.loadJson(DATA_PATH, ['card', 'trademark', 'receipt', 'finishUrl']),
      M.loadJson(VC_DATA_PATH, ['agreements', 'stateCodes'])
    ]).then(function (all) {
      if (all[0] && all[1]) return init(all[0], all[1]);
    }).catch(function (error) {
      console.error('[card-created]', error);
    });
    if (window.OnboardingTransitions && window.OnboardingTransitions.waitFor) window.OnboardingTransitions.waitFor(ready);
  });
})();
