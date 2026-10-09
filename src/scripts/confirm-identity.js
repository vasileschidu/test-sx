/**
 * confirm-identity.js
 * Step 1 "Verification Step": one-time code verification
 * (Figma "1. Verification Step", node 19447:65397).
 *
 * States, as designed:
 *   1. intro    – agree to receive codes, then Request Code.
 *   2. code     – "Check your email/phone"; enter the code before it expires.
 *                 Request New Code unlocks when the timer runs out.
 *   3. errors   – incorrect code, or code expired; each uses one attempt.
 *   4. revoked  – no attempts left: the user is sent to revoked.html.
 *
 * Prototype rules (src/data/sd-verification.json): any 6-digit code passes
 * except `incorrectDemoCode`, so the error state can be shown on demand.
 * The channel is email unless the link carries ?channel=phone.
 */
(function () {
  'use strict';

  var DATA_PATH = '../../data/sd-verification.json';
  var REQUIRED = ['channel', 'codeLength', 'validitySeconds', 'maxAttempts', 'incorrectDemoCode'];
  var ASSETS = '../../assets/onboarding/';
  var NEXT_URL = 'confirm-business-details.html';
  var REVOKED_URL = 'revoked.html';

  var CHANNELS = {
    email: { icon: 'icon-envelope-solid.svg', label: 'email address', check: 'Check your email' },
    phone: { icon: 'icon-device-phone.svg', label: 'phone number', check: 'Check your phone' }
  };

  function validateData(data, requiredFields) {
    if (!data) return false;
    return requiredFields.every(function (field) { return data[field] != null; });
  }

  /** "rachel.morris@example.com" → "rach****@example.com" (as in the design: john****@mail.eu) */
  function maskEmail(email) {
    var parts = String(email || '').split('@');
    if (parts.length !== 2) return email || '';
    return parts[0].slice(0, Math.min(4, parts[0].length)) + '****@' + parts[1];
  }

  /** "+1 (512) 555-0182" → "+151****82" */
  function maskPhone(phone) {
    var digits = String(phone || '').replace(/\D/g, '');
    if (digits.length < 6) return phone || '';
    return '+' + digits.slice(0, 3) + '****' + digits.slice(-2);
  }

  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function clock(seconds) { return pad(Math.floor(seconds / 60)) + ':' + pad(seconds % 60); }

  function getState() {
    return window.SDOnboardingContext ? window.SDOnboardingContext.getState() : {};
  }
  function saveState(patch) {
    if (window.SDOnboardingContext) window.SDOnboardingContext.saveState(patch);
  }

  function init(config) {
    var $ = function (sel) { return document.querySelector(sel); };
    var form = $('#verify-form');
    var icon = $('[data-verify-icon]');
    var title = $('[data-verify-title]');
    var intro = $('[data-verify-intro]');
    var ready = $('[data-verify-ready]');
    var channelLabel = $('[data-verify-channel-label]');
    var contactEl = $('[data-verify-contact]');
    var field = $('[data-verify-field]');
    var input = $('#verify-code');
    var errorIcon = $('[data-verify-error-icon]');
    var errorEl = $('[data-verify-error]');
    var timerLine = $('[data-verify-timer-line]');
    var timerEl = $('[data-verify-timer]');
    var expiredEl = $('[data-verify-expired]');
    var consent = $('[data-verify-consent]');
    var consentInput = $('[data-verify-consent-input]');
    var requestBtn = $('[data-verify-request]');
    var submitBtn = $('[data-verify-submit]');

    var params = new URLSearchParams(window.location.search);
    var channelKey = params.get('channel') === 'phone' ? 'phone' : (config.channel === 'phone' ? 'phone' : 'email');
    var channel = CHANNELS[channelKey];
    var max = config.maxAttempts;
    var attemptsUsed = (getState().verification || {}).attemptsUsed || 0;
    var timer = null;
    var secondsLeft = 0;
    var expired = false;

    icon.src = ASSETS + channel.icon;
    channelLabel.textContent = channel.label;
    input.maxLength = config.codeLength;
    input.placeholder = new Array(config.codeLength + 1).join('0');
    $('[data-verify-max]').textContent = max;

    function remaining() { return Math.max(0, max - attemptsUsed); }

    // Already out of attempts (e.g. came back with the browser's Back button).
    if (remaining() === 0) {
      window.location.replace(REVOKED_URL);
      return;
    }

    function fillContact() {
      var ctx = getState().payableContext || {};
      var info = ctx.accountInformation || {};
      var contact = ctx.contact || {};
      var value = channelKey === 'phone'
        ? maskPhone(contact.phone || info.phoneNumber)
        : maskEmail(contact.email || info.email);
      if (value) contactEl.textContent = value;
    }

    /** One attempt gone; out of attempts means the payment is revoked. */
    function useAttempt() {
      attemptsUsed += 1;
      saveState({ verification: { attemptsUsed: attemptsUsed } });
      if (remaining() === 0) {
        clearInterval(timer);
        saveState({ revokedReason: 'Exhausted attempts to provide Verification Code' });
        window.location.href = REVOKED_URL;
        return false;
      }
      return true;
    }

    function setError(message) {
      var on = !!message;
      errorEl.innerHTML = message || '';
      errorEl.classList.toggle('hidden', !on);
      errorIcon.classList.toggle('hidden', !on);
      input.setAttribute('aria-invalid', on ? 'true' : 'false');
    }

    function updateSubmit() {
      // An incorrect code stays on screen but can't be resubmitted unchanged.
      submitBtn.disabled = expired || input.getAttribute('aria-invalid') === 'true' ||
        input.value.length !== config.codeLength;
    }

    function tick() {
      secondsLeft -= 1;
      timerEl.textContent = clock(Math.max(0, secondsLeft));
      requestBtn.textContent = 'Request New Code in ' + clock(Math.max(0, secondsLeft));
      if (secondsLeft > 0) return;
      clearInterval(timer);
      // The code ran out before it was used: that costs an attempt.
      if (!useAttempt()) return;
      expired = true;
      setError('');
      timerLine.classList.add('hidden');
      $('[data-verify-remaining]').textContent = remaining();
      expiredEl.classList.remove('hidden');
      requestBtn.textContent = 'Request Code';
      requestBtn.disabled = false;
      updateSubmit();
    }

    function sendCode() {
      expired = false;
      secondsLeft = config.validitySeconds;
      input.value = '';
      setError('');
      title.textContent = channel.check;
      intro.innerHTML = 'We have sent a verification code to the ' + channel.label + ' ' +
        '<span class="font-semibold text-gray-900">' + contactEl.textContent + '</span>.';
      ready.classList.add('hidden');
      consent.classList.add('hidden');
      field.classList.remove('hidden');
      field.classList.add('flex');
      expiredEl.classList.add('hidden');
      timerLine.classList.remove('hidden');
      timerEl.textContent = clock(secondsLeft);
      requestBtn.disabled = true;
      requestBtn.textContent = 'Request New Code in ' + clock(secondsLeft);
      updateSubmit();
      clearInterval(timer);
      timer = setInterval(tick, 1000);
      input.focus();
    }

    consentInput.addEventListener('change', function () {
      requestBtn.disabled = !consentInput.checked;
    });

    requestBtn.addEventListener('click', function () {
      if (!requestBtn.disabled) sendCode();
    });

    input.addEventListener('input', function () {
      input.value = input.value.replace(/\D/g, '').slice(0, config.codeLength);
      // Typing a new code clears the "incorrect" state.
      if (input.getAttribute('aria-invalid') === 'true') setError('');
      updateSubmit();
    });

    form.addEventListener('submit', function (event) {
      event.preventDefault();
      if (submitBtn.disabled) return;
      if (input.value === config.incorrectDemoCode) {
        if (!useAttempt()) return;
        setError('The code entered is incorrect. Please try again.<br>You have ' + remaining() + ' out of ' + max + ' attempts remaining.');
        input.focus();
        updateSubmit();
        return;
      }
      clearInterval(timer);
      saveState({ verification: { attemptsUsed: 0, verifiedAt: new Date().toISOString() } });
      window.location.href = NEXT_URL;
    });

    var ctx = window.SDOnboardingContext;
    Promise.resolve(ctx && ctx.bootstrap ? ctx.bootstrap() : null).then(fillContact, fillContact);
  }

  document.addEventListener('DOMContentLoaded', function () {
    fetch(DATA_PATH, { cache: 'no-cache' })
      .then(function (res) { return res.json(); })
      .then(function (data) {
        if (!validateData(data, REQUIRED)) throw new Error('sd-verification.json is missing fields');
        init(data);
      })
      .catch(function (error) {
        console.error('[verification]', error);
        var intro = document.querySelector('[data-verify-intro]');
        if (intro) intro.textContent = 'Verification is unavailable right now. Please try again later.';
      });
  });
})();
