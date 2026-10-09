/**
 * confirm-business-details.js
 * Step 2 "Confirm Identity" (Figma "2. Confirm Identity", node 19468:87018).
 *
 * Renders the identity questions from src/data/sd-identity.json and handles:
 *   - Next enabled only once every answer is complete;
 *   - "… is required" under a field left empty after the user touched it;
 *   - a wrong submission: red card + fields and a red info box with the
 *     attempts left; out of attempts → revoked.html.
 *
 * Prototype rule: any complete answers pass, except an answer made only of
 * zeros, which counts as incorrect so the error state can be shown on demand.
 */
(function () {
  'use strict';

  var DATA_PATH = '../../data/sd-identity.json';
  var ASSETS = '../../assets/onboarding/';
  var NEXT_URL = 'review-documents.html';
  var REVOKED_URL = 'revoked.html';

  // Inputs are the SMART System "Text Field [New]" (see onboarding-field.js).
  var F = window.OBField;

  function validateData(data, requiredFields) {
    if (!data) return false;
    return requiredFields.every(function (field) { return data[field] != null; });
  }

  function getState() {
    return window.SDOnboardingContext ? window.SDOnboardingContext.getState() : {};
  }
  function saveState(patch) {
    if (window.SDOnboardingContext) window.SDOnboardingContext.saveState(patch);
  }

  function fieldMarkup(field) {
    var id = 'identity-' + field.id;
    return '<div class="flex w-full flex-col gap-1" data-identity-field="' + field.id + '">' +
      '<label for="' + id + '" class="' + F.LABEL + '">' + field.label + '</label>' +
      '<div class="relative">' +
        '<input id="' + id + '" type="text" inputmode="numeric" autocomplete="off" maxlength="' + field.maxLength + '" ' +
          'placeholder="' + field.placeholder + '" aria-invalid="false" aria-describedby="' + id + '-error" class="' + F.INPUT + '">' +
        '<img data-identity-icon src="' + ASSETS + 'icon-exclamation-circle-error.svg" alt="" width="20" height="20" ' +
          'class="pointer-events-none absolute top-1/2 right-3 hidden size-5 -translate-y-1/2">' +
      '</div>' +
      '<p id="' + id + '-error" data-identity-error class="hidden ' + F.ERROR_TEXT + '"></p>' +
    '</div>';
  }

  function init(config) {
    var form = document.getElementById('identity-form');
    var card = document.querySelector('[data-identity-card]');
    var alertBox = document.querySelector('[data-identity-alert]');
    var nextBtn = document.querySelector('[data-identity-next]');
    var max = config.maxAttempts;
    var attemptsUsed = (getState().identity || {}).attemptsUsed || 0;

    if (attemptsUsed >= max) {
      window.location.replace(REVOKED_URL);
      return;
    }

    card.innerHTML = config.fields.map(fieldMarkup).join('');
    document.querySelector('[data-identity-max]').textContent = max;

    var fields = config.fields.map(function (field) {
      var wrap = card.querySelector('[data-identity-field="' + field.id + '"]');
      return {
        config: field,
        input: wrap.querySelector('input'),
        icon: wrap.querySelector('[data-identity-icon]'),
        error: wrap.querySelector('[data-identity-error]'),
        touched: false
      };
    });

    function complete(f) { return f.input.value.length >= Math.max(1, f.config.minLength); }

    function setInvalid(f, invalid, message) {
      f.input.setAttribute('aria-invalid', invalid ? 'true' : 'false');
      f.icon.classList.toggle('hidden', !invalid);
      f.error.textContent = message || '';
      f.error.classList.toggle('hidden', !message);
    }

    function setCardError(on) {
      card.classList.toggle('border-[#ef4444]', on);
      card.classList.toggle('border-[#e8e8e8]', !on);
    }

    function updateNext() {
      nextBtn.disabled = !fields.every(complete);
    }

    fields.forEach(function (f) {
      f.input.addEventListener('input', function () {
        f.input.value = f.input.value.replace(/\D/g, '').slice(0, f.config.maxLength);
        // Editing clears the wrong-answer look on this field.
        if (f.input.value) setInvalid(f, false);
        if (fields.every(function (x) { return x.input.getAttribute('aria-invalid') !== 'true'; })) setCardError(false);
        updateNext();
      });
      f.input.addEventListener('blur', function () {
        f.touched = true;
        if (!f.input.value) setInvalid(f, true, f.config.requiredMessage);
      });
    });

    form.addEventListener('submit', function (event) {
      event.preventDefault();
      if (nextBtn.disabled) return;
      var wrong = fields.filter(function (f) { return /^0+$/.test(f.input.value); });
      if (wrong.length) {
        attemptsUsed += 1;
        saveState({ identity: { attemptsUsed: attemptsUsed } });
        if (attemptsUsed >= max) {
          saveState({ revokedReason: 'Exhausted attempts to confirm identity' });
          window.OBGo(REVOKED_URL);
          return;
        }
        // As designed: every answer is flagged, without saying which one was wrong.
        fields.forEach(function (f) { setInvalid(f, true); });
        setCardError(true);
        document.querySelector('[data-identity-remaining]').textContent = max - attemptsUsed;
        alertBox.classList.remove('hidden');
        alertBox.classList.add('flex');
        return;
      }
      saveState({ identity: { attemptsUsed: 0, confirmedAt: new Date().toISOString() } });
      window.OBGo(NEXT_URL);
    });

    // "To collect your $487.00, …" — the amount from the welcome screen.
    var paymentEl = document.querySelector('[data-identity-payment]');
    var ctx = window.SDOnboardingContext;
    Promise.resolve(ctx && ctx.bootstrap ? ctx.bootstrap() : null).then(function (state) {
      var payable = (state && state.payableContext) || {};
      if (!paymentEl) return;
      if (payable.amountFormatted) paymentEl.textContent = payable.amountFormatted;
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    var ready = fetch(DATA_PATH, { cache: 'no-cache' })
      .then(function (res) { return res.json(); })
      .then(function (data) {
        if (!validateData(data, ['maxAttempts', 'fields'])) throw new Error('sd-identity.json is missing fields');
        init(data);
      })
      .catch(function (error) {
        console.error('[identity]', error);
        var card = document.querySelector('[data-identity-card]');
        if (card) card.textContent = 'Identity questions are unavailable right now. Please try again later.';
      });
    if (window.OnboardingTransitions && window.OnboardingTransitions.waitFor) window.OnboardingTransitions.waitFor(ready);
  });
})();
