/**
 * virtual-card.js
 * Instant Virtual Card · Account Information (Figma "4.1. Virtual Card",
 * node 19484:94823).
 *
 *   - Renders the three field groups (personal, address, contact) with the
 *     design-system text field (onboarding-field.js), prefilled from the
 *     payee record or from what was entered before.
 *   - Masks: date of birth "MM - DD - YYYY", SSN "AAA - GG - SSSS",
 *     phone "+1 (555) 000-0000", 5-digit ZIP.
 *   - Next validates everything ("… is required", allowed characters, formats);
 *     after that, fields re-check as they change. Valid → virtual-card-summary.html.
 *   - "How this works" opens the sample Virtual Card dialog (onboarding-vc-how.js).
 *
 * The Bank Account flow's "Review Account Information" (Figma node
 * 19555:47201) is the same form with other groups: <form data-vc-variant="bank">
 * (address + date of birth + SSN, then contact), saved as bankAccountInfo and
 * followed by bank-summary.html. "Send me a Check" (node 20322:74110) is the
 * card form as is (data-vc-variant="check"), saved as checkRequest and
 * followed by check-summary.html. The debit card flow's account information
 * (data-vc-variant="debit") uses the bank grouping, saved as debitAccountInfo.
 * Lists, messages and agreement text: src/data/sd-virtual-card.json.
 */
(function () {
  'use strict';

  var DATA_PATH = '../../data/sd-virtual-card.json';
  var ASSETS = '../../assets/onboarding/';

  var SECTIONS = [
    { id: 'personal', fields: [
      { id: 'firstName', label: 'First Name', placeholder: 'First Name', allowed: true, autocomplete: 'given-name' },
      { id: 'lastName', label: 'Last Name', placeholder: 'Last Name', allowed: true, autocomplete: 'family-name' },
      { id: 'dob', label: 'Date of Birth', placeholder: 'MM - DD - YYYY', mask: 'dob', inputmode: 'numeric', autocomplete: 'bday' },
      { id: 'ssn', label: 'SSN (Social Security Number)', placeholder: 'AAA - GG - SSSS', mask: 'ssn', inputmode: 'numeric', autocomplete: 'off' }
    ] },
    { id: 'address', fields: [
      { id: 'address1', label: 'Address Line 1', placeholder: 'Address Line 1', allowed: true, autocomplete: 'address-line1' },
      { id: 'address2', label: 'Address Line 2', optional: true, allowed: true, autocomplete: 'address-line2' },
      { id: 'city', label: 'City', placeholder: 'City', allowed: true, autocomplete: 'address-level2' },
      { id: 'state', label: 'State', type: 'select', options: 'states', placeholder: 'State' },
      { id: 'zip', label: 'ZIP Code', placeholder: 'ZIP Code', mask: 'zip', inputmode: 'numeric', autocomplete: 'postal-code' },
      { id: 'country', label: 'Country', type: 'select', options: 'countries', flag: true }
    ] },
    { id: 'contact', fields: [
      { id: 'phone', label: 'Phone Number', placeholder: '+1 (555) 000-0000', mask: 'phone', inputmode: 'tel', prefix: 'US', autocomplete: 'tel' },
      { id: 'email', label: 'Email', placeholder: 'sample@mail.com', type: 'email', autocomplete: 'email' }
    ] }
  ];

  // The bank form reuses the same fields, grouped differently.
  function pick(ids) {
    var byId = {};
    SECTIONS.forEach(function (s) { s.fields.forEach(function (f) { byId[f.id] = f; }); });
    return ids.map(function (id) { return byId[id]; });
  }

  var VARIANTS = {
    card: { sections: SECTIONS, stateKey: 'virtualCard', method: 'instant-virtual-card', next: 'virtual-card-summary.html' },
    bank: {
      sections: [
        { id: 'address', fields: pick(['address1', 'address2', 'city', 'state', 'zip', 'country', 'dob', 'ssn']) },
        { id: 'contact', fields: pick(['phone', 'email']) }
      ],
      stateKey: 'bankAccountInfo', method: 'bank-account', next: 'bank-summary.html'
    },
    check: { sections: SECTIONS, stateKey: 'checkRequest', method: 'check', next: 'check-summary.html' },
    debit: {
      sections: [
        { id: 'address', fields: pick(['address1', 'address2', 'city', 'state', 'zip', 'country', 'dob', 'ssn']) },
        { id: 'contact', fields: pick(['phone', 'email']) }
      ],
      stateKey: 'debitAccountInfo', method: 'debit-card', next: 'debit-summary.html'
    }
  };

  function getState() {
    return window.SDOnboardingContext ? window.SDOnboardingContext.getState() : {};
  }
  function saveState(patch) {
    if (window.SDOnboardingContext) window.SDOnboardingContext.saveState(patch);
  }
  function esc(v) { return window.OBModal.escapeHtml(v); }

  // ---- Masks ---------------------------------------------------------------

  function digits(v) { return String(v || '').replace(/\D/g, ''); }

  var MASKS = {
    dob: function (v) {
      var d = digits(v).slice(0, 8);
      return [d.slice(0, 2), d.slice(2, 4), d.slice(4, 8)].filter(Boolean).join(' - ');
    },
    ssn: function (v) {
      var d = digits(v).slice(0, 9);
      return [d.slice(0, 3), d.slice(3, 5), d.slice(5, 9)].filter(Boolean).join(' - ');
    },
    zip: function (v) { return digits(v).slice(0, 5); },
    phone: function (v) {
      var d = digits(v);
      if (d.length === 11 && d[0] === '1') d = d.slice(1);
      d = d.slice(0, 10);
      if (!d) return '';
      // ")" only once the area code is complete and more digits follow, so
      // Backspace never gets stuck on it.
      var out = '+1 (' + d.slice(0, 3);
      if (d.length > 3) out += ') ' + d.slice(3, 6);
      if (d.length > 6) out += '-' + d.slice(6);
      return out;
    }
  };

  // ---- Validation ----------------------------------------------------------

  function validate(field, value, data) {
    var v = String(value || '').trim();
    if (!v) return field.optional ? '' : field.label + ' is required';
    if (field.allowed && !new RegExp(data.allowedPattern).test(v)) return data.allowedMessage;
    if (field.mask === 'dob') {
      var p = digits(v);
      if (p.length !== 8) return 'Enter your date of birth as MM - DD - YYYY';
      var m = Number(p.slice(0, 2)), d = Number(p.slice(2, 4)), y = Number(p.slice(4));
      var date = new Date(y, m - 1, d);
      if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d || y < 1900) return 'Enter a valid date of birth';
      var adult = new Date(y + 18, m - 1, d);
      if (adult > new Date()) return 'You must be at least 18 years old';
    }
    if (field.mask === 'ssn' && digits(v).length !== 9) return 'Enter all 9 digits of your SSN';
    if (field.mask === 'zip' && digits(v).length !== 5) return 'Enter a 5-digit ZIP Code';
    if (field.mask === 'phone' && digits(v).length !== 11) return 'Enter a 10-digit phone number';
    if (field.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) return 'Enter a valid email address';
    return '';
  }

  // ---- Markup --------------------------------------------------------------

  function flagMarkup() {
    return '<span aria-hidden="true" class="pointer-events-none absolute top-1/2 left-3 block h-[15px] w-5 -translate-y-1/2 overflow-hidden rounded-[1.5px] drop-shadow-[0px_1px_1.5px_rgba(0,0,0,0.1)]">' +
      '<img src="' + ASSETS + 'flag-us.svg" alt="" width="20" height="15" class="block size-full">' +
      '<span class="absolute inset-0 bg-gradient-to-b from-white/70 to-black/30 mix-blend-overlay"></span>' +
    '</span>';
  }

  function fieldMarkup(field, data) {
    var F = window.OBField;
    var id = 'vc-' + field.id;
    var label = '<div class="flex items-start gap-1">' +
      '<label for="' + id + '" class="' + F.LABEL + '">' + esc(field.label) + '</label>' +
      (field.optional ? '<span class="flex-1 text-right text-sm leading-5 font-medium text-[#9ca3af]">Optional</span>' : '') +
    '</div>';
    var describedBy = ' aria-describedby="' + id + '-error"';
    var control;

    if (field.type === 'select') {
      var list = data[field.options] || [];
      var opts = (field.placeholder ? '<option value="">' + esc(field.placeholder) + '</option>' : '') +
        list.map(function (o) { return '<option>' + esc(o) + '</option>'; }).join('');
      control = '<select id="' + id + '" name="' + field.id + '" data-vc-field="' + field.id + '" data-ob-skeleton' + describedBy + ' aria-invalid="false" ' +
          'class="' + F.INPUT + ' cursor-pointer appearance-none pr-10 aria-invalid:pr-16 data-[empty=true]:font-normal data-[empty=true]:text-[#9ca3af] aria-invalid:data-[empty=true]:text-[#fca5a5]' + (field.flag ? ' pl-10' : '') + '">' + opts + '</select>' +
        (field.flag ? flagMarkup() : '') +
        '<img src="' + ASSETS + 'icon-chevron-down-select.svg" alt="" width="20" height="20" class="pointer-events-none absolute top-1/2 right-3 size-5 -translate-y-1/2">' +
        F.errorIcon('right-10!');
    } else {
      control = (field.prefix
          ? '<span aria-hidden="true" class="pointer-events-none absolute top-1/2 left-3 flex -translate-y-1/2 items-center gap-1 text-base leading-6 text-[#6b7280]">' +
              esc(field.prefix) + '<img src="' + ASSETS + 'icon-chevron-down-addon.svg" alt="" width="20" height="20" class="size-5"></span>'
          : '') +
        '<input id="' + id + '" name="' + field.id + '" data-vc-field="' + field.id + '" data-ob-skeleton type="' + (field.type === 'email' ? 'email' : 'text') + '"' +
          (field.inputmode ? ' inputmode="' + field.inputmode + '"' : '') +
          ' autocomplete="' + (field.autocomplete || 'off') + '"' +
          (field.placeholder ? ' placeholder="' + esc(field.placeholder) + '"' : '') +
          describedBy + ' aria-invalid="false" class="' + F.INPUT + (field.prefix ? ' pl-[76px]' : '') + '">' +
        F.errorIcon();
    }

    return '<div class="flex w-full flex-col gap-1">' + label +
      '<div class="relative">' + control + '</div>' +
      '<p id="' + id + '-error" data-vc-error="' + field.id + '" class="hidden ' + F.ERROR_TEXT + '"></p>' +
    '</div>';
  }

  // ---- Page ----------------------------------------------------------------

  function init(data) {
    var F = window.OBField;
    var form = document.getElementById('vc-form');
    var variant = VARIANTS[form.getAttribute('data-vc-variant')] || VARIANTS.card;
    var sectionsEl = document.querySelector('[data-vc-sections]');
    sectionsEl.innerHTML = variant.sections.map(function (section) {
      return '<fieldset id="vc-section-' + section.id + '" class="flex w-full scroll-mt-6 flex-col gap-4 rounded-lg border border-[#d1d5db] px-4 pt-6 pb-4">' +
        section.fields.map(function (f) { return fieldMarkup(f, data); }).join('') +
      '</fieldset>';
    }).join('');

    var all = [];
    variant.sections.forEach(function (s) { s.fields.forEach(function (f) { all.push(f); }); });
    var el = {};
    all.forEach(function (f) { el[f.id] = sectionsEl.querySelector('[data-vc-field="' + f.id + '"]'); });
    var submitted = false;

    // An unchosen dropdown shows its placeholder in placeholder colours.
    function markEmpty() {
      all.forEach(function (f) {
        if (f.type === 'select') el[f.id].setAttribute('data-empty', el[f.id].value ? 'false' : 'true');
      });
    }
    markEmpty();

    function check(field) {
      var message = validate(field, el[field.id].value, data);
      F.setError(el[field.id], !!message, sectionsEl.querySelector('[data-vc-error="' + field.id + '"]'), message);
      return !message;
    }

    all.forEach(function (field) {
      var input = el[field.id];
      var evt = input.tagName === 'SELECT' ? 'change' : 'input';
      input.addEventListener(evt, function () {
        if (field.mask && MASKS[field.mask]) input.value = MASKS[field.mask](input.value);
        markEmpty();
        if (submitted) check(field);
      });
    });

    // Prefill: what was entered before, else the payee record.
    function prefill(state) {
      // The bank form starts from what the card form had, and vice versa.
      var saved = state[variant.stateKey] || state.virtualCard || state.checkRequest || state.bankAccountInfo || state.debitAccountInfo || {};
      var ctx = state.payableContext || {};
      var info = ctx.accountInformation || {};
      var contact = ctx.contact || {};
      var values = {
        firstName: saved.firstName || info.firstName || contact.firstName,
        lastName: saved.lastName || info.lastName || contact.lastName,
        dob: saved.dob, ssn: saved.ssn,
        address1: saved.address1 || info.addressLine1,
        address2: saved.address2 != null ? saved.address2 : info.addressLine2,
        city: saved.city || info.city,
        state: saved.state || data.stateCodes[info.state] || info.state,
        zip: saved.zip || info.zipCode,
        country: saved.country || 'United States',
        phone: saved.phone || info.phoneNumber || contact.phone,
        email: saved.email || info.email || contact.email
      };
      all.forEach(function (f) {
        var v = values[f.id];
        if (v == null || v === '') return;
        el[f.id].value = f.mask && MASKS[f.mask] ? MASKS[f.mask](v) : v;
      });
      markEmpty();
      var amountEl = document.querySelector('[data-vc-amount]');
      if (amountEl && ctx.amountFormatted) amountEl.textContent = ctx.amountFormatted;
      // Coming back from the summary's Edit link: jump to that group.
      var target = document.getElementById('vc-section-' + window.location.hash.slice(1));
      if (target) {
        target.scrollIntoView({ block: 'start' });
        var first = target.querySelector('[data-vc-field]');
        if (first) first.focus({ preventScroll: true });
      }
    }
    var ctx = window.SDOnboardingContext;
    Promise.resolve(ctx && ctx.bootstrap ? ctx.bootstrap() : getState()).then(function (state) { prefill(state || getState()); });

    form.addEventListener('submit', function (event) {
      event.preventDefault();
      submitted = true;
      var firstBad = null;
      all.forEach(function (f) { if (!check(f) && !firstBad) firstBad = el[f.id]; });
      if (firstBad) {
        firstBad.focus();
        return;
      }
      var values = {};
      all.forEach(function (f) { values[f.id] = el[f.id].value.trim(); });
      var patch = { paymentMethod: variant.method };
      patch[variant.stateKey] = values;
      saveState(patch);
      window.OBGo(variant.next);
    });

    var how = document.querySelector('[data-vc-how]');
    if (how) how.addEventListener('click', function () { window.OBVirtualCardHow.open(data); });

    var bank = document.querySelector('[data-vc-bank]');
    if (bank) bank.addEventListener('click', function () {
      saveState({ paymentMethod: 'bank-account' });
      window.OBGo('bank-details.html');
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    // The form is built from data: the page skeleton waits for it.
    var ready = window.OBModal.loadJson(DATA_PATH, ['allowedPattern', 'allowedMessage', 'states', 'countries', 'agreements']).then(function (data) {
      if (data) init(data);
      else document.querySelector('[data-vc-sections]').textContent = 'The form is unavailable right now. Please try again later.';
    });
    if (window.OnboardingTransitions && window.OnboardingTransitions.waitFor) window.OnboardingTransitions.waitFor(ready);
  });
})();
