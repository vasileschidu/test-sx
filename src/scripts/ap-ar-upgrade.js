/**
 * ap-ar-upgrade.js
 * AP/AR Payments upgrade page.
 *
 * The unlock list is not hardcoded — it is the set of modules the business
 * would gain by moving to the full plan, read from the plan model. Enrolling
 * moves the business onto that plan and the sidebar re-renders in place.
 */
(function () {
  'use strict';

  var TRIAL_DAYS = 90;

  var BLURBS = {
    bills: 'Manage all your bills and invoices efficiently',
    vendors: 'Keep track of vendor details and transactions',
    'card-manager': 'Manage all your payment cards in one place',
    invoices: 'Manage your invoices and receivables efficiently',
    customers: 'Maintain detailed customer records and interactions'
  };
  var LABELS = { bills: 'Bills & Invoices', 'card-manager': 'Cards Manager' };

  function iconFor() {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true" class="size-5 shrink-0 text-blue-600 dark:text-blue-400">' +
      '<path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5A3.375 3.375 0 0 0 10.125 2.25H8.25m5.231 13.481L15 17.25m-4.5-15H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" /></svg>';
  }

  /** Modules this business would gain from its own plan's upgrade. */
  function modulesGained() {
    var plans = window.AppPlans;
    if (!plans) return [];
    var business = plans.getActiveBusiness();
    var current = plans.getPlan();
    var grants = (plans.plans[business.plan] || {}).upgradeGrants || [];
    return plans.modules.filter(function (m) {
      return grants.indexOf(m.capability) !== -1 &&
             current.capabilities.indexOf(m.capability) === -1 &&
             m.id !== 'ap-ar';
    });
  }

  function renderUnlocks() {
    var list = document.getElementById('ap-ar-unlocks');
    if (!list) return;
    var gained = modulesGained();
    if (!gained.length) {
      list.innerHTML = '<li class="text-sm text-gray-500 dark:text-gray-400">This business already has every module.</li>';
      return;
    }
    list.innerHTML = gained.map(function (m) {
      var label = LABELS[m.id] || m.nav.label;
      var blurb = BLURBS[m.id] || '';
      return '<li class="flex items-start gap-3">' + iconFor() +
        '<span><span class="block text-sm font-semibold text-gray-900 dark:text-white">' + label + '</span>' +
        '<span class="block text-xs text-gray-600 dark:text-gray-400">' + blurb + '</span></span></li>';
    }).join('');
  }

  function renderTrialEnd() {
    var node = document.getElementById('ap-ar-trial-end');
    if (!node) return;
    var end = new Date();
    end.setDate(end.getDate() + TRIAL_DAYS);
    node.textContent = '(' + end.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) + ')';
  }

  document.addEventListener('DOMContentLoaded', function () {
    renderUnlocks();
    renderTrialEnd();
    if (window.AppPlans && window.AppPlans.onChange) {
      window.AppPlans.onChange(function () { renderUnlocks(); });
    }

    var start = document.getElementById('ap-ar-start-trial');
    var dialog = document.getElementById('ap-ar-trial-dialog');
    if (start && dialog) {
      start.addEventListener('click', function () {
        if (typeof dialog.showModal === 'function' && !dialog.open) dialog.showModal();
      });
    }

    var enroll = document.getElementById('ap-ar-enroll');
    if (enroll) {
      enroll.addEventListener('click', function () {
        if (window.AppPlans && window.AppPlans.upgradeActiveBusiness) {
          window.AppPlans.upgradeActiveBusiness();
        }
        if (dialog && dialog.open) dialog.close();
        window.location.reload();
      });
    }
  });
})();
