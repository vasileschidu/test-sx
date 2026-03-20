window.SDOnboardingContext = (function () {
  var KEY = 'sd-onboarding-state';
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
      accountInformation: normalizedAccountInfo
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

  return {
    getState: getState,
    saveState: saveState,
    bootstrap: bootstrap
  };
})();
