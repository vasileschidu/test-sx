/**
 * onboarding-modal.js
 * Shared dialog shell for the SMART Disburse onboarding flow, plus the
 * "Contact Us" dialog (Figma "Contact", node 19652:53918).
 *
 * OBModal  – opens one dialog at a time over the blurred page: close (X) button,
 *            Escape, backdrop click, focus trap, focus restored on close. Also
 *            renders the client's contact card (name, phone, email, reference
 *            with copy buttons), used by Contact Us and declined.html.
 * OBContact – the Contact Us dialog; opened from the sidebar button and the
 *            mobile menu (see onboarding-sidebar.js).
 *
 * Client contact details live in src/data/sd-client-contact.json.
 */
window.OBModal = (function () {
  'use strict';

  var ASSETS = '../../assets/onboarding/';
  var CONTACT_PATH = '../../data/sd-client-contact.json';
  var cache = {};
  var current = null;

  var BUTTON = 'flex w-full cursor-pointer items-center justify-center rounded-[10px] px-[25px] py-4 text-base leading-6 font-medium shadow-xs focus-visible:outline-2 focus-visible:outline-offset-2';

  function validateData(data, requiredFields) {
    if (!data) return false;
    return requiredFields.every(function (field) { return data[field] != null; });
  }

  /** Fetches a JSON data file once, validates it, and resolves to null on failure. */
  function loadJson(path, requiredFields) {
    if (!cache[path]) {
      cache[path] = fetch(path, { cache: 'no-cache' })
        .then(function (res) { return res.json(); })
        .then(function (data) {
          if (!validateData(data, requiredFields)) throw new Error(path + ' is missing fields');
          return data;
        })
        .catch(function (error) {
          console.error('[OBModal]', error);
          delete cache[path];
          return null;
        });
    }
    return cache[path];
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (ch) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
    });
  }

  function getState() {
    return window.SDOnboardingContext ? window.SDOnboardingContext.getState() : {};
  }

  function clientName() {
    return getState().senderName || 'Horizon Inc.';
  }

  function loadContact() {
    return loadJson(CONTACT_PATH, ['phone', 'email']);
  }

  /** Icon in a 48px tinted circle, as in the design's "Modals/Illustration". */
  function illustration(file, tint) {
    return '<div class="flex size-12 shrink-0 items-center justify-center rounded-full ' + tint + '">' +
      '<img src="' + ASSETS + file + '" alt="" width="24" height="24" class="size-6">' +
    '</div>';
  }

  // ---- Contact card ---------------------------------------------------------

  function copyRow(label, valueHtml, copyValue) {
    return '<div class="flex flex-col gap-0.5">' +
      '<dt class="text-sm leading-5 text-gray-600">' + label + '</dt>' +
      '<dd class="flex items-center gap-3.5">' +
        '<span class="min-w-0 flex-1 truncate">' + valueHtml + '</span>' +
        '<button type="button" data-ob-copy="' + escapeHtml(copyValue) + '" ' +
          'class="relative flex size-[18px] shrink-0 cursor-pointer items-center justify-center rounded hover:opacity-70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600">' +
          '<span class="sr-only">Copy ' + label + '</span>' +
          '<img src="' + ASSETS + 'icon-duplicate.svg" alt="" width="18" height="18" class="size-[18px]">' +
          '<span data-ob-copied role="status" class="pointer-events-none absolute right-full mr-2 hidden whitespace-nowrap text-xs font-medium text-green-600">Copied</span>' +
        '</button>' +
      '</dd>' +
    '</div>';
  }

  /** Client name + phone / email / reference rows (Figma "Summary Description" list). */
  function contactCard(contact) {
    var state = getState();
    var ctx = state.payableContext || {};
    var phone = (contact && contact.phone) || '';
    var email = (contact && contact.email) || '';
    var reference = ctx.billNumber || state.billNumber || '';
    var link = 'text-sm leading-5 font-medium text-[#2563eb] hover:underline';

    return '<dl class="flex w-full flex-col gap-2">' +
      '<div><dt class="sr-only">Company</dt>' +
        '<dd class="text-base leading-6 font-semibold text-gray-900">' + escapeHtml(clientName()) + '</dd></div>' +
      copyRow('Phone Number', phone
        ? '<a href="tel:' + escapeHtml(phone.replace(/[^\d+]/g, '')) + '" class="' + link + '">' + escapeHtml(phone) + '</a>'
        : '<span class="text-sm text-gray-500">—</span>', phone) +
      copyRow('Email Address', email
        ? '<a href="mailto:' + escapeHtml(email) + '" class="' + link + '">' + escapeHtml(email) + '</a>'
        : '<span class="text-sm text-gray-500">—</span>', email) +
      copyRow('Reference', '<span class="text-sm leading-5 font-medium text-gray-900">' + escapeHtml(reference || '—') + '</span>', reference) +
    '</dl>';
  }

  document.addEventListener('click', function (event) {
    var btn = event.target.closest('[data-ob-copy]');
    if (!btn) return;
    var value = btn.getAttribute('data-ob-copy');
    if (!value || !navigator.clipboard) return;
    navigator.clipboard.writeText(value).then(function () {
      var note = btn.querySelector('[data-ob-copied]');
      note.classList.remove('hidden');
      setTimeout(function () { note.classList.add('hidden'); }, 1500);
    });
  });

  // ---- Dialog shell -----------------------------------------------------------

  /**
   * Opens a dialog. `body` is the HTML below the close button; `labelledBy`
   * names the heading id. Returns the backdrop element.
   */
  /**
   * opts.panelClass replaces the default 512px panel classes; opts.bare skips
   * the built-in close (X) row for dialogs that bring their own header.
   */
  function open(body, labelledBy, opts) {
    opts = opts || {};
    if (current) close();
    var lastFocus = document.activeElement;
    var wrap = document.createElement('div');
    wrap.innerHTML =
      '<div data-ob-modal class="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/75 p-4 backdrop-blur-[5px] lg:py-12">' +
        '<div role="dialog" aria-modal="true" tabindex="-1" data-ob-modal-dialog aria-labelledby="' + labelledBy + '" ' +
          'class="' + (opts.panelClass || 'relative flex w-full max-w-[512px] flex-col rounded-lg bg-white shadow-xl') + ' focus:outline-none">' +
          (opts.bare ? '' :
          '<div class="flex h-14 shrink-0 items-end px-4 pt-4">' +
            '<button type="button" data-ob-modal-close class="flex size-10 cursor-pointer items-center justify-center rounded-full hover:bg-gray-100 focus-visible:outline-2 focus-visible:outline-blue-600">' +
              '<span class="sr-only">Close</span>' +
              '<img src="' + ASSETS + 'icon-x-lined.svg" alt="" width="24" height="24" class="size-6">' +
            '</button>' +
          '</div>') +
          body +
        '</div>' +
      '</div>';
    var backdrop = wrap.firstElementChild;
    var dialog = backdrop.querySelector('[data-ob-modal-dialog]');

    function onKeydown(event) {
      // A dialog marked busy (e.g. "processing") can't be dismissed.
      if (event.key === 'Escape') { if (!backdrop.hasAttribute('data-busy')) close(); return; }
      if (event.key !== 'Tab') return;
      // Keep focus inside the dialog.
      var focusable = Array.prototype.filter.call(
        dialog.querySelectorAll('a[href], button, textarea, [tabindex="0"]'),
        function (el) { return el.offsetParent !== null; }
      );
      if (!focusable.length) return;
      var first = focusable[0];
      var last = focusable[focusable.length - 1];
      if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog)) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }

    backdrop.addEventListener('click', function (event) {
      if (backdrop.hasAttribute('data-busy')) return;
      if (event.target === backdrop || event.target.closest('[data-ob-modal-close]')) close();
    });

    current = { backdrop: backdrop, onKeydown: onKeydown, lastFocus: lastFocus };
    document.body.appendChild(backdrop);
    document.documentElement.style.overflow = 'hidden';
    document.addEventListener('keydown', onKeydown);
    // Focus the dialog itself so no field looks active until the user picks one.
    dialog.focus();
    return backdrop;
  }

  function close() {
    if (!current) return;
    var closing = current;
    current = null;
    closing.backdrop.remove();
    document.documentElement.style.overflow = '';
    document.removeEventListener('keydown', closing.onKeydown);
    if (closing.lastFocus && closing.lastFocus.focus) closing.lastFocus.focus();
  }

  return {
    BUTTON: BUTTON,
    validateData: validateData,
    loadJson: loadJson,
    escapeHtml: escapeHtml,
    clientName: clientName,
    loadContact: loadContact,
    illustration: illustration,
    contactCard: contactCard,
    open: open,
    close: close
  };
})();

window.OBContact = (function () {
  'use strict';

  var M = window.OBModal;

  function open() {
    M.loadContact().then(function (contact) {
      M.open(
        '<div class="flex flex-col items-center gap-6 px-6 pb-6">' +
          '<div class="flex w-full flex-col items-center gap-4">' +
            M.illustration('icon-menu-lined.svg', 'bg-[#eff6ff]') +
            '<h2 id="ob-contact-title" class="w-full text-center text-lg leading-6 font-medium text-gray-900">Contact Us</h2>' +
          '</div>' +
          M.contactCard(contact) +
        '</div>' +
        '<div class="flex flex-col px-6 pb-6">' +
          '<button type="button" data-ob-modal-close class="' + M.BUTTON + ' bg-[#2563eb] text-white hover:bg-[#3b82f6] focus-visible:outline-[#2563eb]">OK</button>' +
        '</div>',
        'ob-contact-title'
      );
    });
  }

  return { open: open };
})();
