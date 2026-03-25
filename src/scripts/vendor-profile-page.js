(function () {
  'use strict';

  var STATUS_STYLES = {
    active: 'bg-green-50 text-green-700 inset-ring-green-600/20 dark:bg-green-500/10 dark:text-green-400 dark:inset-ring-green-500/20',
    needs_verification: 'bg-amber-50 text-amber-700 inset-ring-amber-600/20 dark:bg-amber-500/10 dark:text-amber-300 dark:inset-ring-amber-400/20',
    exception: 'bg-red-50 text-red-700 inset-ring-red-600/10 dark:bg-red-400/10 dark:text-red-400 dark:inset-ring-red-400/20',
    inactive: 'bg-gray-50 text-gray-600 inset-ring-gray-500/10 dark:bg-white/10 dark:text-gray-300 dark:inset-ring-white/15',
    blocked: 'bg-red-50 text-red-700 inset-ring-red-600/10 dark:bg-red-400/10 dark:text-red-400 dark:inset-ring-red-400/20'
  };

  var VERIFICATION_STYLES = {
    verified: 'bg-green-50 text-green-700 inset-ring-green-600/20 dark:bg-green-500/10 dark:text-green-400 dark:inset-ring-green-500/20',
    pending: 'bg-amber-50 text-amber-700 inset-ring-amber-600/20 dark:bg-amber-500/10 dark:text-amber-300 dark:inset-ring-amber-400/20',
    action_required: 'bg-red-50 text-red-700 inset-ring-red-600/10 dark:bg-red-400/10 dark:text-red-400 dark:inset-ring-red-400/20'
  };

  function qs(id) {
    return document.getElementById(id);
  }

  function escapeHtml(value) {
    return window.VendorsData.escapeHtml(value);
  }

  function formatMoney(value) {
    return window.VendorsData.formatMoney(value, 'USD');
  }

  function formatDate(value) {
    return window.VendorsData.formatDate(value);
  }

  function formatLongDate(value) {
    if (!value) return '--';
    var normalized = String(value).slice(0, 10);
    var date = new Date(normalized + 'T00:00:00');
    if (isNaN(date.getTime())) return value;
    return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  }

  function formatDateTime(value) {
    return window.VendorsData.formatDateTime(value);
  }

  function getStatusBadge(status, label) {
    return '<span class="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium inset-ring ' + (STATUS_STYLES[status] || STATUS_STYLES.active) + '">' + escapeHtml(label) + '</span>';
  }

  function getVerificationBadge(status, label) {
    return '<span class="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium inset-ring ' + (VERIFICATION_STYLES[status] || VERIFICATION_STYLES.verified) + '">' + escapeHtml(label) + '</span>';
  }

  function buildDefinitionRow(label, value, isMultiline) {
    return '<div class="px-4 py-6 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0"><dt class="text-sm/6 font-medium text-gray-900 dark:text-white">' + escapeHtml(label) + '</dt><dd class="mt-1 text-sm/6 text-gray-700 dark:text-gray-300 sm:col-span-2 sm:mt-0' + (isMultiline ? ' whitespace-pre-line' : '') + '">' + value + '</dd></div>';
  }

  function buildMethodDetailRow(label, value, isMultiline) {
    return '<div class="grid grid-cols-2 gap-4 self-stretch' + (isMultiline ? ' items-start' : '') + '">' +
      '<span class="text-sm font-medium text-gray-900 dark:text-gray-100">' + escapeHtml(label) + '</span>' +
      '<span class="text-sm font-normal text-gray-700 dark:text-gray-300' + (isMultiline ? ' whitespace-pre-line' : '') + '">' + value + '</span>' +
    '</div>';
  }

  function buildBankMethodIcon() {
    return '<span class="flex size-10 items-center justify-center rounded-full bg-gray-100 text-gray-500 dark:bg-white/10 dark:text-gray-300">' +
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="size-5"><path d="M10.75 3.818a1.5 1.5 0 0 0-1.5 0l-6 3.6A1.5 1.5 0 0 0 4 10.182V15h-.25a.75.75 0 0 0 0 1.5h12.5a.75.75 0 0 0 0-1.5H16v-4.818a1.5 1.5 0 0 0 .75-2.764l-6-3.6ZM6.5 10.5a.75.75 0 0 1 .75.75V15H5.75v-3.75a.75.75 0 0 1 .75-.75Zm4.25 0a.75.75 0 0 1 .75.75V15H10v-3.75a.75.75 0 0 1 .75-.75Zm3.5.75A.75.75 0 0 0 13.5 10.5a.75.75 0 0 0-.75.75V15h1.5v-3.75Z"/></svg>' +
    '</span>';
  }

  function buildCardMethodIcon() {
    return '<span class="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 dark:bg-white/10">' +
      '<svg width="24" height="16" viewBox="0 0 24 16" fill="none" xmlns="http://www.w3.org/2000/svg">' +
      '<rect width="24" height="16" rx="1.2" fill="#1F3B8F"/>' +
      '<path d="M12.309 7.05313C12.2987 7.85651 13.0305 8.30487 13.5818 8.57141C14.1483 8.84493 14.3385 9.0203 14.3364 9.26485C14.3321 9.6392 13.8845 9.80438 13.4656 9.81081C12.7349 9.82208 12.3101 9.61506 11.9722 9.45846L11.709 10.6807C12.0479 10.8357 12.6754 10.9708 13.3262 10.9767C14.8536 10.9767 15.853 10.2286 15.8584 9.06857C15.8644 7.5964 13.8061 7.51489 13.8202 6.85684C13.8251 6.65733 14.0169 6.44442 14.4374 6.39025C14.6455 6.3629 15.2201 6.34198 15.8714 6.63963L16.127 5.45708C15.7768 5.33051 15.3266 5.2093 14.7661 5.2093C13.3283 5.2093 12.3171 5.96764 12.309 7.05313ZM18.5836 5.3112C18.3047 5.3112 18.0696 5.47263 17.9647 5.7204L15.7827 10.8899H17.3091L17.6129 10.057H19.4781L19.6543 10.8899H20.9996L19.8257 5.3112H18.5836ZM18.7971 6.81822L19.2376 8.91304H18.0312L18.7971 6.81822ZM10.4583 5.3112L9.25517 10.8899H10.7096L11.9122 5.3112H10.4583ZM8.3066 5.3112L6.79266 9.10825L6.18028 5.87969C6.1084 5.51929 5.82464 5.3112 5.50953 5.3112H3.03459L3 5.47317C3.50807 5.58257 4.08532 5.75902 4.43502 5.9478C4.64906 6.0631 4.71013 6.16393 4.7804 6.43798L5.9403 10.8899H7.47747L9.83404 5.3112H8.3066Z" fill="white"/>' +
      '</svg>' +
    '</span>';
  }

  function buildMethodAccordionRow(iconHtml, title, subtitle, bodyHtml, open) {
    return '<details class="group rounded-md"' + (open ? ' open' : '') + '>' +
      '<summary class="flex list-none items-center justify-between gap-3 rounded-md border border-gray-200 bg-white px-4 py-3 cursor-pointer dark:border-white/10 dark:bg-white/5">' +
        '<div class="flex min-w-0 items-center gap-3">' +
          iconHtml +
          '<div class="min-w-0">' +
            '<p class="truncate text-sm font-semibold text-gray-900 dark:text-gray-100">' + title + '</p>' +
            '<p class="mt-0.5 truncate text-sm text-gray-500 dark:text-gray-400">' + subtitle + '</p>' +
          '</div>' +
        '</div>' +
        '<span class="shrink-0 text-gray-400 transition-transform group-open:rotate-180 dark:text-gray-500">' +
          '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="size-5"><path fill-rule="evenodd" d="M5.22 7.22a.75.75 0 0 1 1.06 0L10 10.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 8.28a.75.75 0 0 1 0-1.06Z" clip-rule="evenodd" /></svg>' +
        '</span>' +
      '</summary>' +
      '<div class="mt-3 flex flex-col items-start self-stretch">' +
        bodyHtml +
      '</div>' +
    '</details>';
  }

  function renderAlert(vendor) {
    var alert = qs('vendor-profile-alert');
    if (!alert) return;
    if (vendor.status === 'active') {
      alert.className = 'hidden';
      alert.innerHTML = '';
      return;
    }
    var tone = vendor.status === 'exception'
      ? 'border-red-200 bg-red-50 text-red-800 dark:border-red-400/20 dark:bg-red-500/10 dark:text-red-200'
      : 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-400/20 dark:bg-amber-500/10 dark:text-amber-200';
    var body = vendor.status === 'exception'
      ? 'Recent payment exceptions require review before the next release.'
      : 'Vendor verification is still in progress. Payments can continue only where policy allows it.';
    alert.className = 'rounded-xl border px-4 py-3 text-sm ' + tone;
    alert.innerHTML = '<div class="flex items-start justify-between gap-4"><div><p class="font-semibold">' + escapeHtml(vendor.statusLabel) + '</p><p class="mt-1">' + escapeHtml(body) + '</p></div><button type="button" class="shrink-0 rounded-md bg-white/60 px-2.5 py-1.5 text-sm font-semibold text-current dark:bg-white/10">' + escapeHtml(vendor.status === 'exception' ? 'Review exceptions' : 'Retry verification') + '</button></div>';
  }

  function renderHero(vendor) {
    qs('vendor-profile-name').textContent = vendor.displayName;
    qs('vendor-profile-legal-name').textContent = vendor.legalName;
    qs('vendor-profile-vendor-id').textContent = vendor.vendorId;
    var vendorIdCopySource = qs('vendor-profile-vendor-id-copy-source');
    if (vendorIdCopySource) vendorIdCopySource.textContent = vendor.vendorId;
    renderAlert(vendor);
  }

  function renderOverview(vendor) {
    var overview = qs('vendor-profile-overview');
    if (!overview) return;
    var onboardedSince = (vendor.auditLog || [])
      .map(function (entry) { return entry && entry.timestamp ? String(entry.timestamp) : ''; })
      .filter(Boolean)
      .sort()[0] || '';
    var primaryAddress = vendor.addresses && vendor.addresses.length ? vendor.addresses[0] : null;
    var addressValue = primaryAddress && primaryAddress.formatted
      ? escapeHtml(primaryAddress.formatted).replace(/\n/g, '<br>')
      : '--';
    var entityType = vendor.taxInfo && String(vendor.taxInfo.classification || '').toLowerCase() === 'individual'
      ? 'Individual'
      : 'Business';
    var tinValue = vendor.taxInfo && vendor.taxInfo.einMasked
      ? '<span class="inline-flex items-center rounded-md bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700 inset-ring inset-ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-300 dark:inset-ring-emerald-400/20">Present</span>'
      : '--';
    var idValue =
      '<button type="button" data-copy-id="vendor-profile-vendor-id-copy-source" class="copy-btn -ml-1 inline-flex w-fit items-center gap-1.5 rounded-md px-1.5 py-0.5 text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/10 cursor-pointer" aria-label="Copy vendor ID">' +
        '<span class="text-sm/6 font-normal">' + escapeHtml(vendor.vendorId || '--') + '</span>' +
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="size-4 text-gray-400 dark:text-gray-500">' +
            '<path d="M7 3.5A1.5 1.5 0 0 1 8.5 2h3.879a1.5 1.5 0 0 1 1.06.44l3.122 3.12A1.5 1.5 0 0 1 17 6.622V12.5a1.5 1.5 0 0 1-1.5 1.5h-1v-3.379a3 3 0 0 0-.879-2.121L10.5 5.379A3 3 0 0 0 8.379 4.5H7v-1Z" />' +
            '<path d="M4.5 6A1.5 1.5 0 0 0 3 7.5v9A1.5 1.5 0 0 0 4.5 18h7a1.5 1.5 0 0 0 1.5-1.5v-5.879a1.5 1.5 0 0 0-.44-1.06L9.44 6.439A1.5 1.5 0 0 0 8.378 6H4.5Z" />' +
        '</svg>' +
      '</button>';
    overview.innerHTML =
      '<div class="rounded-xl border border-gray-200 p-4 dark:border-white/10 sm:p-6 lg:p-8">' +
        '<div class="px-4 sm:px-0"><h3 class="text-base/7 font-semibold text-gray-900 dark:text-white">Details</h3><p class="mt-1 max-w-2xl text-sm/6 text-gray-500 dark:text-gray-400">Business details and application.</p></div>' +
        '<div class="mt-6 border-t border-gray-100 dark:border-white/10"><dl class="divide-y divide-gray-100 dark:divide-white/10">' +
          buildDefinitionRow('Entity Type', escapeHtml(entityType)) +
          buildDefinitionRow('Business Name', escapeHtml(vendor.displayName || vendor.legalName || '--')) +
          buildDefinitionRow('ID', idValue) +
          buildDefinitionRow('Onboarded Since', escapeHtml(formatLongDate(onboardedSince))) +
          buildDefinitionRow('Billing Address', addressValue, true) +
          buildDefinitionRow('Payment Terms', escapeHtml(vendor.paymentTerms || '--')) +
          buildDefinitionRow('TIN', tinValue) +
        '</dl></div>' +
      '</div>';
  }

  function renderContactInformation(vendor) {
    var contact = qs('vendor-profile-contact');
    if (!contact) return;
    contact.innerHTML =
      '<div class="pb-8 xl:border-b xl:border-gray-200 xl:dark:border-white/10">' +
        '<div class="px-4 sm:px-0"><h3 class="text-base/7 font-semibold text-gray-900 dark:text-white">Contact Information</h3><p class="mt-1 max-w-2xl text-sm/6 text-gray-500 dark:text-gray-400">Primary vendor contacts used for operations and remittance.</p></div>' +
        '<div class="mt-6 border-t border-gray-100 dark:border-white/10"><dl class="divide-y divide-gray-100 dark:divide-white/10">' +
          buildDefinitionRow('Primary contact', escapeHtml(vendor.primaryContact.name)) +
          buildDefinitionRow('Email address', escapeHtml(vendor.primaryContact.email)) +
          buildDefinitionRow('Phone number', escapeHtml(vendor.primaryContact.phone)) +
          buildDefinitionRow('Remittance emails', escapeHtml(vendor.remittanceEmails.join(', ') || '--')) +
          buildDefinitionRow('Remittance phones', escapeHtml(vendor.remittancePhones.join(', ') || '--')) +
        '</dl></div>' +
      '</div>';
  }

  function renderPaymentMethods(vendor) {
    var wrap = qs('vendor-profile-methods');
    if (!wrap) return;
    var cards = [];

    (vendor.cards || []).forEach(function (card) {
      cards.push(
        buildMethodAccordionRow(
          buildCardMethodIcon(),
          escapeHtml(card.cardholderName || vendor.displayName || 'Card'),
          escapeHtml('••••' + (card.last4 || '0000')),
          '<div class="flex items-center justify-between self-stretch rounded-t-md border border-gray-200 bg-gray-100 px-4 py-2 dark:border-white/10 dark:bg-white/10">' +
            '<span class="text-sm font-semibold text-gray-900 dark:text-gray-100">Card Details</span>' +
          '</div>' +
          '<div class="flex flex-col items-start gap-2 self-stretch rounded-b-md border-r border-b border-l border-gray-200 bg-gray-50 p-4 dark:border-white/10 dark:bg-white/5">' +
            buildMethodDetailRow('Name', escapeHtml(card.cardholderName || vendor.displayName || '--')) +
            buildMethodDetailRow('Card Number', escapeHtml('•••• ' + (card.last4 || '0000'))) +
            buildMethodDetailRow('Brand', escapeHtml(card.brand || 'Card')) +
            buildMethodDetailRow('Cardholder Address', escapeHtml(card.cardholderAddress || '--'), true) +
          '</div>',
          false
        )
      );
    });

    (vendor.bankAccounts || []).forEach(function (bank) {
      cards.push(
        buildMethodAccordionRow(
          buildBankMethodIcon(),
          escapeHtml(bank.bankName || 'Bank Account'),
          escapeHtml(bank.maskedAccount || '--'),
          '<div class="flex items-center justify-between self-stretch rounded-t-md border border-gray-200 bg-gray-100 px-4 py-2 dark:border-white/10 dark:bg-white/10">' +
            '<span class="text-sm font-semibold text-gray-900 dark:text-gray-100">Bank Details</span>' +
          '</div>' +
          '<div class="flex flex-col items-start gap-2 self-stretch rounded-b-md border-r border-b border-l border-gray-200 bg-gray-50 p-4 dark:border-white/10 dark:bg-white/5">' +
            buildMethodDetailRow('Name', escapeHtml(bank.bankName || '--')) +
            buildMethodDetailRow('Account Number', escapeHtml(bank.maskedAccount || '--')) +
            buildMethodDetailRow('Routing Number', escapeHtml(bank.maskedRouting || '--')) +
            buildMethodDetailRow('Address', escapeHtml((vendor.addresses && vendor.addresses[0] && vendor.addresses[0].formatted) || '--'), true) +
          '</div>',
          true
        )
      );
    });

    (vendor.checks || []).forEach(function (check) {
      cards.push(
        buildMethodAccordionRow(
          buildBankMethodIcon(),
          escapeHtml(check.name || check.label || 'Check Address'),
          escapeHtml(check.label || 'Mailing address'),
          '<div class="flex items-center justify-between self-stretch rounded-t-md border border-gray-200 bg-gray-100 px-4 py-2 dark:border-white/10 dark:bg-white/10">' +
            '<span class="text-sm font-semibold text-gray-900 dark:text-gray-100">Check Details</span>' +
          '</div>' +
          '<div class="flex flex-col items-start gap-2 self-stretch rounded-b-md border-r border-b border-l border-gray-200 bg-gray-50 p-4 dark:border-white/10 dark:bg-white/5">' +
            buildMethodDetailRow('Name', escapeHtml(check.name || '--')) +
            buildMethodDetailRow('Address', escapeHtml(check.address || '--'), true) +
          '</div>',
          false
        )
      );
    });

    var methodCards = cards.length
      ? cards.join('')
      : '<div class="rounded-md border border-dashed border-gray-300 px-4 py-6 text-sm text-gray-500 dark:border-white/10 dark:text-gray-400">No payment methods on file.</div>';
    wrap.innerHTML =
      '<div class="rounded-xl border border-gray-200 p-4 dark:border-white/10 sm:p-6 lg:p-8">' +
        '<div class="px-4 sm:px-0"><h3 class="text-base/7 font-semibold text-gray-900 dark:text-white">Payment Methods</h3><p class="mt-1 text-sm/6 text-gray-500 dark:text-gray-400">Receiving party account details for payment.</p></div>' +
        '<div class="mt-6 flex flex-col gap-4">' + methodCards + '</div>' +
      '</div>';
  }

  function renderTaxAndCompliance(vendor) {
    var wrap = qs('vendor-profile-tax');
    if (!wrap) return;
    wrap.innerHTML =
      '<div class="border-t border-gray-200 pt-8 dark:border-white/10">' +
        '<div class="px-4 sm:px-0"><h3 class="text-base/7 font-semibold text-gray-900 dark:text-white">Tax & Compliance</h3><p class="mt-1 max-w-2xl text-sm/6 text-gray-500 dark:text-gray-400">Core tax identity and compliance posture.</p></div>' +
        '<div class="mt-6 border-t border-gray-100 dark:border-white/10"><dl class="divide-y divide-gray-100 dark:divide-white/10">' +
          buildDefinitionRow('EIN', escapeHtml(vendor.taxInfo.einMasked || '--')) +
          buildDefinitionRow('Classification', escapeHtml(vendor.taxInfo.classification || '--')) +
          buildDefinitionRow('W-9 status', escapeHtml(vendor.taxInfo.w9Status || '--')) +
          buildDefinitionRow('TIN match', escapeHtml(vendor.taxInfo.tinMatchStatus || '--')) +
          buildDefinitionRow('Risk status', escapeHtml(vendor.riskStatusLabel || '--')) +
        '</dl></div>' +
      '</div>';
  }

  function renderRemittance(vendor) {
    var wrap = qs('vendor-profile-remittance');
    if (!wrap) return;
    var emailList = vendor.remittanceEmails.length
      ? vendor.remittanceEmails.map(function (value) {
          return '<li class="flex items-center justify-between gap-4 py-3 pr-4 pl-4 text-sm"><span class="truncate font-medium text-gray-900 dark:text-white">' + escapeHtml(value) + '</span><span class="text-gray-500 dark:text-gray-400">Email</span></li>';
        }).join('')
      : '<li class="py-3 pr-4 pl-4 text-sm text-gray-500 dark:text-gray-400">No remittance emails configured.</li>';
    var phoneList = vendor.remittancePhones.length
      ? vendor.remittancePhones.map(function (value) {
          return '<li class="flex items-center justify-between gap-4 py-3 pr-4 pl-4 text-sm"><span class="truncate font-medium text-gray-900 dark:text-white">' + escapeHtml(value) + '</span><span class="text-gray-500 dark:text-gray-400">Phone</span></li>';
        }).join('')
      : '<li class="py-3 pr-4 pl-4 text-sm text-gray-500 dark:text-gray-400">No remittance phones configured.</li>';
    wrap.innerHTML =
      '<div class="border-t border-gray-200 pt-8 dark:border-white/10">' +
        '<div class="flex items-start justify-between gap-4"><div><h3 class="text-base/7 font-semibold text-gray-900 dark:text-white">Remittance Settings</h3><p class="mt-1 text-sm/6 text-gray-500 dark:text-gray-400">Destinations currently used for payment notifications and token delivery.</p></div><button type="button" class="inline-flex items-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-xs inset-ring inset-ring-gray-300 hover:bg-gray-50 dark:bg-white/5 dark:text-white dark:inset-ring-white/10 dark:hover:bg-white/10">Add remittance contact</button></div>' +
        '<div class="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">' +
          '<div><p class="mb-3 text-sm font-semibold text-gray-900 dark:text-white">Email destinations</p><ul class="divide-y divide-gray-100 rounded-md border border-gray-200 dark:divide-white/10 dark:border-white/10">' + emailList + '</ul></div>' +
          '<div><p class="mb-3 text-sm font-semibold text-gray-900 dark:text-white">Phone destinations</p><ul class="divide-y divide-gray-100 rounded-md border border-gray-200 dark:divide-white/10 dark:border-white/10">' + phoneList + '</ul></div>' +
        '</div>' +
      '</div>';
  }

  function renderLinkedPayables(vendor) {
    var wrap = qs('vendor-profile-payables');
    if (!wrap) return;
    var rows = vendor.linkedPayables.slice(0, 8).map(function (row) {
      return '<tr class="hover:bg-gray-50 dark:hover:bg-white/5"><td class="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">' + escapeHtml(row.billNumber) + '</td><td class="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">' + escapeHtml(window.VendorsData.formatMoney(row.amount, row.currency)) + '</td><td class="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">' + escapeHtml(window.VendorsData.formatDate(row.dueDate)) + '</td><td class="px-4 py-3">' + getStatusBadge(row.status, row.statusLabel || row.status) + '</td><td class="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">' + escapeHtml(row.paymentMethod || '--') + '</td></tr>';
    }).join('');
    wrap.innerHTML =
      '<div class="border-t border-gray-200 pt-8 dark:border-white/10">' +
        '<div class="flex items-start justify-between gap-4"><div><h3 class="text-base/7 font-semibold text-gray-900 dark:text-white">Linked Payables</h3><p class="mt-1 text-sm/6 text-gray-500 dark:text-gray-400">Open and recent bills associated with this vendor.</p></div><a href="bills-and-payables.html" class="inline-flex items-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-xs inset-ring inset-ring-gray-300 hover:bg-gray-50 dark:bg-white/5 dark:text-white dark:inset-ring-white/10 dark:hover:bg-white/10">View payables</a></div>' +
        '<div class="mt-6 overflow-x-auto"><table class="min-w-full divide-y divide-gray-200 dark:divide-white/10"><thead><tr><th class="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">Bill #</th><th class="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">Amount</th><th class="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">Due date</th><th class="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">Status</th><th class="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">Payment method</th></tr></thead><tbody class="divide-y divide-gray-200 dark:divide-white/10">' + rows + '</tbody></table></div>' +
      '</div>';
  }

  function renderDocuments(vendor) {
    var wrap = qs('vendor-profile-documents');
    if (!wrap) return;
    var items = vendor.documents.map(function (doc) {
      return '<li class="flex items-center justify-between gap-4 py-4 pr-5 pl-4 text-sm"><div class="min-w-0"><button type="button" class="truncate font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300 cursor-pointer">' + escapeHtml(doc.name) + '</button><p class="mt-1 text-xs text-gray-500 dark:text-gray-400">' + escapeHtml(doc.type) + ' · ' + escapeHtml(doc.size) + '</p></div><button type="button" class="shrink-0 font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300 cursor-pointer">Download</button></li>';
    }).join('');
    wrap.innerHTML =
      '<div class="border-t border-gray-200 pt-8 dark:border-white/10">' +
        '<div class="px-4 sm:px-0"><h3 class="text-base/7 font-semibold text-gray-900 dark:text-white">Documents</h3><p class="mt-1 max-w-2xl text-sm/6 text-gray-500 dark:text-gray-400">Vendor files used for onboarding, tax, and banking review.</p></div>' +
        '<div class="mt-6"><ul role="list" class="divide-y divide-gray-100 rounded-md border border-gray-200 dark:divide-white/10 dark:border-white/10">' + items + '</ul></div>' +
      '</div>';
  }

  function renderAuditLog(vendor) {
    var wrap = qs('vendor-profile-audit-log');
    if (!wrap) return;
    var items = vendor.auditLog.length
      ? vendor.auditLog.map(function (item, index) {
          var line = index < vendor.auditLog.length - 1 ? '<div class="mt-[6px] flex-1 w-px bg-gray-200 dark:bg-white/10"></div>' : '';
          return '<div class="flex gap-3"><div class="flex w-6 flex-none self-stretch flex-col items-center pt-[6px]"><div class="size-1.5 rounded-full bg-gray-300 dark:bg-gray-500"></div>' + line + '</div><div class="min-w-0 pb-4"><p class="text-sm font-medium text-gray-900 dark:text-white">' + escapeHtml(item.title) + '</p><p class="mt-2 text-sm text-gray-700 dark:text-gray-300">' + escapeHtml(item.description) + '<span class="mx-1.5">&middot;</span>' + escapeHtml(formatDateTime(item.timestamp)) + '</p></div></div>';
        }).join('')
      : '<p class="text-sm text-gray-500 dark:text-gray-400">No audit events available.</p>';
    wrap.innerHTML =
      '<div class="border-t border-gray-200 pt-8 dark:border-white/10">' +
        '<div class="px-4 sm:px-0"><h3 class="text-base/7 font-semibold text-gray-900 dark:text-white">Audit Log</h3><p class="mt-1 max-w-2xl text-sm/6 text-gray-500 dark:text-gray-400">Administrative updates to the vendor record.</p></div>' +
        '<div class="mt-6 rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-white/10 dark:bg-white/5">' + items + '</div>' +
      '</div>';
  }

  function renderNotes(vendor) {
    var wrap = qs('vendor-profile-notes');
    if (!wrap) return;
    wrap.innerHTML =
      '<div class="border-t border-gray-200 pt-8 dark:border-white/10">' +
        '<div class="px-4 sm:px-0"><h3 class="text-base/7 font-semibold text-gray-900 dark:text-white">Internal Notes</h3><p class="mt-1 max-w-2xl text-sm/6 text-gray-500 dark:text-gray-400">Operational guidance for teams managing this vendor.</p></div>' +
        '<div class="mt-6 rounded-lg border border-gray-200 bg-gray-50 px-4 py-4 text-sm text-gray-700 dark:border-white/10 dark:bg-white/5 dark:text-gray-300">' + escapeHtml(vendor.notes || 'No internal notes available.') + '</div>' +
      '</div>';
  }

  function renderRightRail(vendor) {
    var health = qs('vendor-profile-health');
    var addresses = qs('vendor-profile-addresses');
    var activity = qs('vendor-profile-recent-activity');
    if (health) {
      health.innerHTML =
        '<div class="pb-8">' +
          '<h3 class="text-base/7 font-semibold text-gray-900 dark:text-white">Vendor Health</h3>' +
          '<div class="mt-4 space-y-3">' +
            '<div class="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 dark:border-white/10 dark:bg-white/5"><p class="text-sm text-gray-500 dark:text-gray-400">Status</p><div class="mt-2">' + getStatusBadge(vendor.status, vendor.statusLabel) + '</div></div>' +
            '<div class="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 dark:border-white/10 dark:bg-white/5"><p class="text-sm text-gray-500 dark:text-gray-400">Verification</p><div class="mt-2">' + getVerificationBadge(vendor.verificationStatus, vendor.verificationStatusLabel) + '</div></div>' +
            '<div class="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 dark:border-white/10 dark:bg-white/5"><p class="text-sm text-gray-500 dark:text-gray-400">Default payment</p><p class="mt-2 text-sm font-semibold text-gray-900 dark:text-white">' + escapeHtml(vendor.defaultPaymentMethod || '--') + '</p></div>' +
          '</div>' +
        '</div>';
    }
    if (addresses) {
      var address = vendor.addresses[0];
      addresses.innerHTML =
        '<div class="border-t border-gray-200 pt-8 dark:border-white/10">' +
          '<h3 class="text-base/7 font-semibold text-gray-900 dark:text-white">Addresses</h3>' +
          '<div class="mt-4 rounded-lg border border-gray-200 bg-gray-50 px-4 py-4 dark:border-white/10 dark:bg-white/5"><p class="text-sm font-medium text-gray-900 dark:text-white">' + escapeHtml(address ? address.label : 'Primary Address') + '</p><p class="mt-2 whitespace-pre-line text-sm text-gray-600 dark:text-gray-300">' + escapeHtml(address ? address.formatted : '--') + '</p></div>' +
        '</div>';
    }
    if (activity) {
      var items = vendor.recentPaymentActivity.length
        ? vendor.recentPaymentActivity.map(function (item) {
            return '<div class="flex gap-3"><div class="pt-1"><div class="size-1.5 rounded-full bg-blue-300 dark:bg-blue-400"></div></div><div class="min-w-0 pb-4"><p class="text-sm font-medium text-gray-900 dark:text-white">' + escapeHtml(item.title) + '</p><p class="mt-1 text-sm text-gray-600 dark:text-gray-300">' + escapeHtml(item.description) + '<span class="mx-1.5">&middot;</span>' + escapeHtml(formatDateTime(item.timestamp)) + '</p></div></div>';
          }).join('')
        : '<p class="text-sm text-gray-500 dark:text-gray-400">No recent payment activity.</p>';
      activity.innerHTML =
        '<div class="border-t border-gray-200 pt-8 dark:border-white/10">' +
          '<h3 class="text-base/7 font-semibold text-gray-900 dark:text-white">Recent Payment Activity</h3>' +
          '<div class="mt-4">' + items + '</div>' +
        '</div>';
    }
  }

  function renderVendor(vendor) {
    renderHero(vendor);
    renderOverview(vendor);
    renderContactInformation(vendor);
    renderPaymentMethods(vendor);
    renderRemittance(vendor);
    renderTaxAndCompliance(vendor);
    renderLinkedPayables(vendor);
    renderDocuments(vendor);
    renderNotes(vendor);
    renderAuditLog(vendor);
    renderRightRail(vendor);
  }

  function renderNotFound() {
    var main = qs('vendor-profile-main');
    if (!main) return;
    main.innerHTML = '<div class="rounded-xl border border-dashed border-gray-300 bg-white px-6 py-12 text-center dark:border-white/10 dark:bg-gray-900"><h2 class="text-lg font-semibold text-gray-900 dark:text-white">Vendor not found</h2><p class="mt-2 text-sm text-gray-500 dark:text-gray-400">The requested vendor record is unavailable.</p><div class="mt-6"><a href="vendors.html" class="inline-flex items-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-500">Back to Vendors</a></div></div>';
  }

  function init() {
    var params = new URLSearchParams(window.location.search);
    var vendorId = params.get('id');
    if (!vendorId) {
      renderNotFound();
      return;
    }
    window.VendorsData.getVendorById(vendorId)
      .then(function (vendor) {
        if (!vendor) {
          renderNotFound();
          return;
        }
        renderVendor(vendor);
      })
      .catch(function () {
        renderNotFound();
      });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
