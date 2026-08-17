window.SDOnboardingContext = (function () {
  var KEY = 'sd-onboarding-state';
  var SKELETON_STYLE_ID = 'sd-context-skeleton-style';
  var PAYABLE_PATHS = [
    '../../../src/data/bills-payables.json',
    '/src/data/bills-payables.json',
    './src/data/bills-payables.json'
  ];
  var PAYEE_PATHS = [
    '../../../src/data/payees.json',
    '/src/data/payees.json',
    './src/data/payees.json'
  ];
  var bootstrapPromise = null;

  function getState() {
    try {
      return JSON.parse(sessionStorage.getItem(KEY) || '{}');
    } catch (error) {
      return {};
    }
  }

  function saveState(patch) {
    var current = getState();
    var next = Object.assign({}, current, patch || {});
    sessionStorage.setItem(KEY, JSON.stringify(next));
    return next;
  }

  function loadJsonWithFallbacks(paths) {
    var index = 0;
    function tryNext() {
      if (index >= paths.length) return Promise.reject(new Error('Failed to load onboarding data.'));
      var path = paths[index++];
      return fetch(path, { cache: 'no-store' }).then(function (response) {
        if (!response.ok) throw new Error('HTTP ' + response.status + ' for ' + path);
        return response.json();
      }).catch(function () {
        return tryNext();
      });
    }
    return tryNext();
  }

  function getArray(payload) {
    if (Array.isArray(payload)) return payload;
    if (payload && Array.isArray(payload.data)) return payload.data;
    return [];
  }

  function splitName(name) {
    var cleaned = String(name || '').trim().replace(/\s+/g, ' ');
    if (!cleaned) return { firstName: '', lastName: '' };
    var parts = cleaned.split(' ');
    if (parts.length === 1) return { firstName: cleaned, lastName: '' };
    return {
      firstName: parts.shift(),
      lastName: parts.join(' ')
    };
  }

  function parseAddressBlock(value) {
    var lines = String(value || '')
      .split('\n')
      .map(function (part) { return String(part || '').trim(); })
      .filter(Boolean);
    var addressLine1 = lines[0] || '';
    var addressLine2 = '';
    var city = '';
    var state = '';
    var zipCode = '';
    var country = lines[lines.length - 1] || 'United States';
    var locationLine = lines.length > 1 ? lines[lines.length - 2] : '';
    var locationMatch = locationLine.match(/^(.+?),\s*([A-Z]{2})\s+([\w-]+)$/);
    if (lines.length > 3) addressLine2 = lines.slice(1, lines.length - 2).join(', ');
    else if (lines.length === 3) addressLine2 = lines[1] && !locationMatch ? lines[1] : '';
    if (locationMatch) {
      city = locationMatch[1];
      state = locationMatch[2];
      zipCode = locationMatch[3];
    }
    return {
      addressLine1: addressLine1,
      addressLine2: addressLine2,
      city: city,
      state: state,
      zipCode: zipCode,
      country: country
    };
  }

  function formatMoney(amount, currency) {
    var numeric = Number(amount || 0);
    if (!Number.isFinite(numeric)) numeric = 0;
    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency || 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(numeric);
    } catch (error) {
      return '$' + numeric.toFixed(2);
    }
  }

  function findPayable(payables, params, state) {
    var payableId = String(params.get('payableId') || state.payableId || state.payableContext && state.payableContext.payableId || '').trim();
    var billNumber = String(params.get('bill') || state.billNumber || state.payableContext && state.payableContext.billNumber || '').trim();
    var rows = Array.isArray(payables) ? payables : [];
    if (payableId) {
      for (var i = 0; i < rows.length; i += 1) {
        if (rows[i] && String(rows[i].id) === payableId) return rows[i];
      }
    }
    if (billNumber) {
      for (var j = 0; j < rows.length; j += 1) {
        if (rows[j] && String(rows[j].billNumber) === billNumber) return rows[j];
      }
    }
    // No link parameters and nothing saved yet: fall back to the first payable
    // so the flow always opens with vendor data, the way a real invite would.
    for (var k = 0; k < rows.length; k += 1) {
      if (rows[k] && rows[k].payeeId) return rows[k];
    }
    return null;
  }

  function findPayee(payees, params, state, payable) {
    var payeeId = String(params.get('payeeId') || state.payeeId || payable && payable.payeeId || '').trim();
    var payeeName = String(payable && payable.payeeName || '').trim();
    var list = Array.isArray(payees) ? payees : [];
    if (payeeId) {
      for (var i = 0; i < list.length; i += 1) {
        if (list[i] && String(list[i].id) === payeeId) return list[i];
      }
    }
    if (payeeName) {
      for (var j = 0; j < list.length; j += 1) {
        if (list[j] && String(list[j].name) === payeeName) return list[j];
      }
    }
    return null;
  }

  function buildContext(payable, payee, params, state) {
    if (!payable || !payee) return null;
    var contact = payee.contact || {};
    var accountInfo = payee.accountInformation || {};
    var ach = (payee.paymentMethods && payee.paymentMethods.ach && payee.paymentMethods.ach[0]) || {};
    var fallbackAddress = parseAddressBlock(
      (payee.paymentMethods && payee.paymentMethods.ach && payee.paymentMethods.ach[0] && payee.paymentMethods.ach[0].address) ||
      (payee.paymentMethods && payee.paymentMethods.check && payee.paymentMethods.check[0] && payee.paymentMethods.check[0].address) ||
      ''
    );
    var fallbackName = splitName(contact.name || (payee.paymentMethods && payee.paymentMethods.smartDisburse && payee.paymentMethods.smartDisburse[0] && payee.paymentMethods.smartDisburse[0].contactPerson) || payee.name);
    var normalizedAccountInfo = Object.assign({}, fallbackAddress, {
      firstName: accountInfo.firstName || fallbackName.firstName,
      lastName: accountInfo.lastName || fallbackName.lastName,
      email: accountInfo.email || contact.email || '',
      phoneNumber: accountInfo.phoneNumber || contact.phone || ''
    }, accountInfo);

    return {
      payableId: String(payable.id || '').trim(),
      billNumber: String(payable.billNumber || '').trim(),
      amount: Number(payable.amount || 0),
      amountFormatted: formatMoney(payable.amount, payable.currency),
      currency: String(payable.currency || 'USD').trim(),
      paymentDate: String(payable.adDate || payable.dueDate || '').trim(),
      dueDate: String(payable.dueDate || '').trim(),
      payeeId: String(payee.id || '').trim(),
      payeeName: String(payee.name || payable.payeeName || '').trim(),
      vendorId: String(payee.vendorId || '').trim(),
      senderName: String(params.get('sender') || state.senderName || 'SMART Hub').trim(),
      recipientEmail: String(params.get('email') || state.recipientEmail || '').trim(),
      attachments: payable.details && Array.isArray(payable.details.attachments) ? payable.details.attachments : [],
      summary: payable.details && payable.details.summary ? String(payable.details.summary) : '',
      notes: payable.details && payable.details.notes ? String(payable.details.notes) : '',
      contact: {
        name: String(contact.name || (fallbackName.firstName + (fallbackName.lastName ? ' ' + fallbackName.lastName : ''))).trim(),
        firstName: String(contact.firstName || fallbackName.firstName).trim(),
        lastName: String(contact.lastName || fallbackName.lastName).trim(),
        email: String(contact.email || '').trim(),
        phone: String(contact.phone || '').trim()
      },
      accountInformation: normalizedAccountInfo,
      // Standing bank details from the vendor master record, so the bank step
      // opens prefilled rather than as an empty form.
      bankAccount: {
        accountType: 'checking',
        accountHolderName: String(ach.accountName || payee.name || '').trim(),
        bankName: String(ach.bankName || '').trim(),
        routingNumber: String(ach.routingNumber || '').trim(),
        accountNumber: String(ach.accountNumber || '').trim(),
        verifyAccountNumber: String(ach.accountNumber || '').trim()
      }
    };
  }

  function bootstrap() {
    if (bootstrapPromise) return bootstrapPromise;
    bootstrapPromise = Promise.all([
      loadJsonWithFallbacks(PAYABLE_PATHS),
      loadJsonWithFallbacks(PAYEE_PATHS)
    ]).then(function (results) {
      var state = getState();
      var params = new URLSearchParams(window.location.search || '');
      var payable = findPayable(getArray(results[0]), params, state);
      var payee = findPayee(getArray(results[1]), params, state, payable);
      var context = buildContext(payable, payee, params, state);
      if (!context) return getState();
      return saveState({
        payableId: context.payableId,
        billNumber: context.billNumber,
        payeeId: context.payeeId,
        senderName: context.senderName,
        recipientEmail: context.recipientEmail,
        amount: context.amount,
        paymentAmount: context.amount,
        paymentCurrency: context.currency,
        payableContext: context
      });
    }).catch(function () {
      return getState();
    });
    return bootstrapPromise;
  }

  function ensureSkeletonStyles() {
    if (document.getElementById(SKELETON_STYLE_ID)) return;
    var style = document.createElement('style');
    style.id = SKELETON_STYLE_ID;
    style.textContent = [
      // Same flat tone, radius and pulse as onboarding-transitions.js, so a page
      // never shows two different kinds of placeholder side by side.
      '.sd-context-skeleton-target{position:relative;overflow:hidden;color:transparent !important;caret-color:transparent;border-radius:var(--ob-skel-radius,0.375rem) !important;}',
      // Nested spans carry their own colour, so transparent text is not enough.
      '.sd-context-skeleton-target>*{visibility:hidden !important;}',
      '.sd-context-skeleton-target::after{content:"";position:absolute;inset:0;border-radius:inherit;background:var(--ob-skel-bg,#e8eaed);pointer-events:none;}',
      // Replaced elements grow no ::before/::after boxes, so form controls are
      // masked with their own background instead of a pseudo-element overlay.
      '.sd-context-skeleton-input{color:transparent !important;-webkit-text-fill-color:transparent !important;border-color:transparent !important;box-shadow:none !important;outline:none !important;appearance:none !important;-webkit-appearance:none !important;background:var(--ob-skel-bg,#e8eaed) !important;border-radius:var(--ob-skel-radius,0.375rem) !important;}',
      '.sd-context-skeleton-input::placeholder{color:transparent !important;}',
      '.sd-context-skeleton-hide{visibility:hidden !important;}',
      '.sd-context-skeleton-target,.sd-context-skeleton-input{animation:sdContextPulse 1.6s ease-in-out infinite;}',
      '@keyframes sdContextPulse{0%,100%{opacity:1}50%{opacity:.55}}',
      '@media (prefers-reduced-motion: reduce){.sd-context-skeleton-target,.sd-context-skeleton-input{animation:none;}}'
    ].join('');
    document.head.appendChild(style);
  }

  function createLoadingOverlay(options) {
    ensureSkeletonStyles();
    var targets = [];
    var selectors = options && Array.isArray(options.targets) ? options.targets : [];
    selectors.forEach(function (selector) {
      if (!selector) return;
      var nodes = document.querySelectorAll(selector);
      for (var i = 0; i < nodes.length; i += 1) {
        var node = nodes[i];
        if (!node || node.getAttribute('data-sd-skeleton') === 'true') continue;
        node.setAttribute('data-sd-skeleton', 'true');
        node.classList.add('sd-context-skeleton-target');
        if (node.tagName === 'INPUT' || node.tagName === 'TEXTAREA' || node.tagName === 'SELECT') {
          node.classList.add('sd-context-skeleton-input');
          node.setAttribute('readonly', 'readonly');
        }
        if (node.tagName === 'SELECT' && node.parentElement) {
          // The chevron is a sibling svg and would float over the placeholder.
          var chevrons = node.parentElement.querySelectorAll(':scope > svg');
          for (var c = 0; c < chevrons.length; c += 1) {
            chevrons[c].classList.add('sd-context-skeleton-hide');
            targets.push(chevrons[c]);
          }
        }
        targets.push(node);
      }
    });
    return {
      done: function () {
        targets.forEach(function (node) {
          node.classList.remove('sd-context-skeleton-target');
          node.classList.remove('sd-context-skeleton-input');
          node.classList.remove('sd-context-skeleton-hide');
          node.removeAttribute('data-sd-skeleton');
          if ((node.tagName === 'INPUT' || node.tagName === 'TEXTAREA' || node.tagName === 'SELECT') && node.hasAttribute('readonly')) {
            node.removeAttribute('readonly');
          }
        });
      }
    };
  }

  return {
    getState: getState,
    saveState: saveState,
    bootstrap: bootstrap,
    createLoadingOverlay: createLoadingOverlay
  };
})();
