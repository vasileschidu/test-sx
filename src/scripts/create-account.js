/**
 * create-account.js
 * Supplier portal account creation — onboarding step 6.
 *
 * Name and email arrive prefilled from the vendor master record; the password
 * is checked live against the rule list, each rule turning green as it is met.
 * Next stays disabled until every field is filled, every rule passes and the
 * two passwords match.
 */
(function () {
  'use strict';

  var STATE_KEY = 'sd-onboarding-state';
  var NEXT_URL = 'complete.html';

  var RULES = {
    length: function (value) { return value.length >= 8; },
    upper: function (value) { return /[A-Z]/.test(value); },
    lower: function (value) { return /[a-z]/.test(value); },
    number: function (value) { return /[0-9]/.test(value); },
    special: function (value) { return /[^A-Za-z0-9]/.test(value); },
    // Runs like 1234 or abcd — the design's own examples are four long, so a
    // run of four is already too many.
    sequence: function (value) { return !hasRun(value, 4); }
  };

  /** True when `value` contains a step-by-one run (either direction) of `len`. */
  function hasRun(value, len) {
    var run = 1;
    var direction = 0;
    for (var i = 1; i < value.length; i += 1) {
      var delta = value.charCodeAt(i) - value.charCodeAt(i - 1);
      if (delta === 1 || delta === -1) {
        if (delta === direction) run += 1;
        else { direction = delta; run = 2; }
        if (run >= len) return true;
      } else {
        direction = 0;
        run = 1;
      }
    }
    return false;
  }

  function readState() {
    try {
      return JSON.parse(sessionStorage.getItem(STATE_KEY) || '{}');
    } catch (error) {
      return {};
    }
  }

  function writeState(patch) {
    var next = Object.assign(readState(), patch || {});
    try {
      sessionStorage.setItem(STATE_KEY, JSON.stringify(next));
    } catch (error) {
      /* storage is best-effort in the prototype */
    }
    return next;
  }

  document.addEventListener('DOMContentLoaded', function () {
    var fields = {
      firstName: document.getElementById('firstName'),
      lastName: document.getElementById('lastName'),
      username: document.getElementById('username'),
      password: document.getElementById('password'),
      confirmPassword: document.getElementById('confirmPassword')
    };
    var nextButton = document.getElementById('next-button');
    var ruleList = document.getElementById('ca-rules');
    var customerName = document.getElementById('ca-customer-name');
    if (!nextButton || !ruleList) return;

    function value(name) {
      return fields[name] ? String(fields[name].value || '').trim() : '';
    }

    function paintRules(password) {
      var allPass = true;
      Object.keys(RULES).forEach(function (key) {
        var row = ruleList.querySelector('[data-rule="' + key + '"]');
        if (!row) return;
        var passed = RULES[key](password);
        if (!passed) allPass = false;
        var icon = row.querySelector('[data-rule-icon]');
        if (icon) {
          icon.classList.toggle('text-green-600', passed);
          icon.classList.toggle('text-gray-400', !passed);
        }
        row.classList.toggle('text-gray-900', passed);
        row.classList.toggle('text-gray-700', !passed);
      });
      return allPass;
    }

    function sync() {
      var password = fields.password ? String(fields.password.value || '') : '';
      var rulesPass = paintRules(password);
      var filled = ['firstName', 'lastName', 'username', 'password', 'confirmPassword']
        .every(function (name) { return value(name) !== ''; });
      var matches = password === (fields.confirmPassword ? fields.confirmPassword.value : '');
      nextButton.disabled = !(filled && rulesPass && matches);
    }

    Object.keys(fields).forEach(function (name) {
      var input = fields[name];
      if (!input) return;
      input.addEventListener('input', sync);
      input.addEventListener('change', sync);
    });

    nextButton.addEventListener('click', function () {
      if (nextButton.disabled) return;
      writeState({
        supplierAccount: {
          firstName: value('firstName'),
          lastName: value('lastName'),
          username: value('username'),
          createdAt: new Date().toISOString()
        }
      });
      if (window.OnboardingTransitions && window.OnboardingTransitions.navigate) {
        window.OnboardingTransitions.navigate(NEXT_URL);
      } else {
        window.location.href = NEXT_URL;
      }
    });

    // Prefill from the vendor master record, the way a real invite would.
    Promise.resolve(
      window.SDOnboardingContext && window.SDOnboardingContext.bootstrap
        ? window.SDOnboardingContext.bootstrap()
        : null
    ).catch(function () {}).then(function () {
      var context = (readState().payableContext) || {};
      var account = context.accountInformation || {};
      var contact = context.contact || {};
      if (fields.firstName) fields.firstName.value = account.firstName || contact.firstName || '';
      if (fields.lastName) fields.lastName.value = account.lastName || contact.lastName || '';
      if (fields.username) fields.username.value = account.email || contact.email || '';
      if (customerName && context.senderName) customerName.textContent = context.senderName;
      sync();
    });

    sync();
  });
})();
