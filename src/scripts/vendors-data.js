(function () {
  'use strict';

  var PAYEES_PATHS = [
    '../../../src/data/payees.json',
    '/src/data/payees.json',
    './src/data/payees.json'
  ];
  var PAYABLES_PATHS = [
    '../../../src/data/bills-payables.json',
    '/src/data/bills-payables.json',
    './src/data/bills-payables.json'
  ];
  var VENDOR_PROFILES_PATHS = [
    '../../../src/data/vendor-profiles.json',
    '/src/data/vendor-profiles.json',
    './src/data/vendor-profiles.json'
  ];

  var vendorCachePromise = null;

  function loadJsonWithFallbacks(paths) {
    var index = 0;
    function tryNext() {
      if (index >= paths.length) {
        return Promise.reject(new Error('Failed to load vendor data.'));
      }
      var path = paths[index++];
      return fetch(path, { cache: 'no-store' })
        .then(function (response) {
          if (!response.ok) throw new Error('HTTP ' + response.status + ' for ' + path);
          return response.json();
        })
        .catch(function () {
          return tryNext();
        });
    }
    return tryNext();
  }

  function formatMoney(amount, currency) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(Number(amount || 0));
  }

  function formatDate(value) {
    if (!value) return '--';
    var normalized = String(value).slice(0, 10);
    var date = new Date(normalized + 'T00:00:00');
    if (isNaN(date.getTime())) return value;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function formatDateTime(value) {
    if (!value) return '--';
    var date = new Date(value);
    if (isNaN(date.getTime())) return value;
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function getDigits(value) {
    return String(value || '').replace(/\D/g, '');
  }

  function toMethodLabel(type) {
    var map = {
      ach: 'ACH',
      wire: 'Wire',
      card: 'Card',
      check: 'Check',
      smartDisburse: 'SMART Disburse',
      smartExchange: 'SMART Exchange',
      smart_disburse: 'SMART Disburse',
      smart_exchange: 'SMART Exchange'
    };
    return map[type] || type;
  }

  function uniqueValues(values) {
    var seen = {};
    return (values || []).filter(function (value) {
      var normalized = String(value || '').trim();
      if (!normalized) return false;
      var key = normalized.toLowerCase();
      if (seen[key]) return false;
      seen[key] = true;
      return true;
    }).map(function (value) {
      return String(value || '').trim();
    });
  }

  function collectRemittanceContacts(paymentMethods, type) {
    var results = [];
    ['smartDisburse', 'smartExchange'].forEach(function (methodKey) {
      var entries = paymentMethods && Array.isArray(paymentMethods[methodKey]) ? paymentMethods[methodKey] : [];
      entries.forEach(function (entry) {
        var contacts = Array.isArray(entry && entry.contacts) ? entry.contacts : [];
        contacts.forEach(function (contact) {
          if (contact && contact.type === type && contact.value) {
            results.push(contact.value);
          }
        });
      });
    });
    return uniqueValues(results);
  }

  function buildAddress(accountInformation) {
    if (!accountInformation) return null;
    return {
      label: 'Primary Address',
      line1: accountInformation.addressLine1 || '',
      line2: accountInformation.addressLine2 || '',
      city: accountInformation.city || '',
      state: accountInformation.state || '',
      zipCode: accountInformation.zipCode || '',
      country: accountInformation.country || '',
      formatted: [
        accountInformation.addressLine1,
        accountInformation.addressLine2,
        [accountInformation.city, accountInformation.state].filter(Boolean).join(', ') +
          ((accountInformation.zipCode && (accountInformation.city || accountInformation.state)) ? ' ' + accountInformation.zipCode : accountInformation.zipCode || ''),
        accountInformation.country
      ].filter(Boolean).join('\n')
    };
  }

  function buildBankAccounts(methods) {
    return (Array.isArray(methods && methods.ach) ? methods.ach : []).map(function (item) {
      return {
        id: item.id,
        label: item.label,
        bankName: item.bankName,
        maskedAccount: item.maskedAccount,
        maskedRouting: item.maskedRouting
      };
    });
  }

  function buildCards(methods) {
    return (Array.isArray(methods && methods.card) ? methods.card : []).map(function (item) {
      var label = String(item.label || '');
      var match = label.match(/(Visa|Mastercard|Amex|American Express)/i);
      var brand = item.brand || item.cardBrand || item.network || (match ? match[1] : 'Card');
      var cardDigits = getDigits(item.fullNumber || item.cardNumber || item.pan || label);
      var last4 = cardDigits.slice(-4) || getDigits(label).slice(-4) || '0000';
      return {
        id: item.id,
        label: item.label,
        brand: brand,
        last4: last4,
        fullNumber: item.fullNumber || item.cardNumber || item.pan || '',
        cardNumber: item.cardNumber || item.fullNumber || item.pan || '',
        expDate: item.expDate || item.expiry || item.expiration || '',
        expiry: item.expiry || item.expDate || item.expiration || '',
        cvc2: item.cvc2 || item.cvv || item.cvc || '',
        cvv: item.cvv || item.cvc2 || item.cvc || '',
        cardholderName: item.cardholderName || '',
        cardholderAddress: item.cardholderAddress || ''
      };
    });
  }

  function buildChecks(methods) {
    return (Array.isArray(methods && methods.check) ? methods.check : []).map(function (item) {
      return {
        id: item.id,
        label: item.label,
        name: item.name,
        address: item.address
      };
    });
  }

  function buildPaymentMethodSummary(vendor) {
    var methods = [];
    if (vendor.bankAccounts.length) {
      var bank = vendor.bankAccounts[0];
      methods.push({
        type: 'ACH',
        title: bank.bankName || 'Bank account',
        detail: bank.maskedAccount + ' / ' + bank.maskedRouting
      });
    }
    if (vendor.cards.length) {
      var card = vendor.cards[0];
      methods.push({
        type: 'Card',
        title: card.brand,
        detail: '•••• ' + card.last4
      });
    }
    if (vendor.checks.length) {
      methods.push({
        type: 'Check',
        title: vendor.checks[0].label || 'Mailing address',
        detail: vendor.checks[0].address || ''
      });
    }
    if (vendor.supportedPaymentMethods.indexOf('SMART Disburse') !== -1) {
      methods.push({
        type: 'SMART Disburse',
        title: 'Token delivery enabled',
        detail: vendor.remittanceEmails[0] || vendor.remittancePhones[0] || '--'
      });
    }
    if (vendor.supportedPaymentMethods.indexOf('SMART Exchange') !== -1) {
      methods.push({
        type: 'SMART Exchange',
        title: 'Profile enabled',
        detail: vendor.primaryContact.email || '--'
      });
    }
    return methods;
  }

  function deriveRecentPaymentActivity(rows) {
    return rows
      .filter(function (row) {
        return row.status === 'paid' || row.status === 'in_progress' || row.status === 'exception';
      })
      .map(function (row) {
        var latestLog = row.details && Array.isArray(row.details.activityLog) && row.details.activityLog.length
          ? row.details.activityLog[0]
          : null;
        return {
          timestamp: (latestLog && latestLog.timestamp) || row.processedDate || row.adDate || '',
          title: (latestLog && (latestLog.title || latestLog.label)) || ((row.statusLabel || row.status || '') + ' update'),
          description: (latestLog && latestLog.description) || (row.billNumber + ' for ' + formatMoney(row.amount, row.currency))
        };
      })
      .sort(function (a, b) {
        return String(b.timestamp || '').localeCompare(String(a.timestamp || ''));
      })
      .slice(0, 5);
  }

  function buildVendor(payee, profile, payables) {
    var paymentMethods = payee.paymentMethods || {};
    var supportedPaymentMethods = (profile.supportedPaymentMethods || Object.keys(paymentMethods).filter(function (key) {
      return Array.isArray(paymentMethods[key]) && paymentMethods[key].length;
    }).map(toMethodLabel));
    var linkedPayables = payables
      .filter(function (row) {
        return row.payeeId === payee.id || row.payeeName === payee.name;
      })
      .sort(function (a, b) {
        return String(b.dueDate || '').localeCompare(String(a.dueDate || ''));
      });

    var paidRows = linkedPayables.filter(function (row) { return row.status === 'paid'; });
    var readyRows = linkedPayables.filter(function (row) { return row.status === 'ready_to_pay'; });
    var inProgressRows = linkedPayables.filter(function (row) { return row.status === 'in_progress'; });
    var exceptionRows = linkedPayables.filter(function (row) { return row.status === 'exception'; });

    var totalPaid = paidRows.reduce(function (sum, row) { return sum + Number(row.amount || 0); }, 0);
    var outstandingAmount = readyRows.reduce(function (sum, row) { return sum + Number(row.amount || 0); }, 0);
    var lastPaymentDate = paidRows
      .map(function (row) { return row.processedDate || row.adDate || ''; })
      .filter(Boolean)
      .sort()
      .slice(-1)[0] || '';

    var remittanceEmails = uniqueValues(
      (profile.remittanceEmails || [])
        .concat(collectRemittanceContacts(paymentMethods, 'email'))
        .concat(payee.contact && payee.contact.email ? [payee.contact.email] : [])
    );
    var remittancePhones = uniqueValues(
      (profile.remittancePhones || [])
        .concat(collectRemittanceContacts(paymentMethods, 'phone'))
        .concat(payee.contact && payee.contact.phone ? [payee.contact.phone] : [])
    );

    var vendor = {
      id: payee.id,
      payeeId: payee.id,
      vendorId: payee.vendorId,
      name: payee.name,
      legalName: profile.legalName || payee.name,
      displayName: profile.displayName || payee.name,
      status: profile.status || 'active',
      statusLabel: profile.statusLabel || 'Active',
      onboardingStatus: profile.onboardingStatus || 'completed',
      onboardingStatusLabel: profile.onboardingStatusLabel || 'Onboarding Complete',
      verificationStatus: profile.verificationStatus || 'verified',
      verificationStatusLabel: profile.verificationStatusLabel || 'Verified',
      riskStatus: profile.riskStatus || 'low',
      riskStatusLabel: profile.riskStatusLabel || 'Low Risk',
      sourceSystem: profile.sourceSystem || 'ERP Sync',
      paymentTerms: profile.paymentTerms || 'Net 30',
      defaultPaymentMethod: toMethodLabel(profile.defaultPaymentMethod || supportedPaymentMethods[0] || ''),
      supportedPaymentMethods: supportedPaymentMethods,
      primaryContact: {
        name: (payee.contact && payee.contact.name) || '',
        email: (payee.contact && payee.contact.email) || '',
        phone: (payee.contact && payee.contact.phone) || ''
      },
      remittanceEmails: remittanceEmails,
      remittancePhones: remittancePhones,
      addresses: [buildAddress(payee.accountInformation)].filter(Boolean),
      taxInfo: profile.taxInfo || {},
      bankAccounts: buildBankAccounts(paymentMethods),
      cards: buildCards(paymentMethods),
      checks: buildChecks(paymentMethods),
      totalPaid: totalPaid,
      outstandingAmount: outstandingAmount,
      openBillsCount: readyRows.length,
      inProgressBillsCount: inProgressRows.length,
      exceptionBillsCount: exceptionRows.length,
      lastPaymentDate: lastPaymentDate,
      linkedPayables: linkedPayables,
      documents: profile.documents || [],
      notes: profile.notes || '',
      auditLog: profile.activityLog || [],
      recentPaymentActivity: deriveRecentPaymentActivity(linkedPayables)
    };

    vendor.paymentMethodSummary = buildPaymentMethodSummary(vendor);
    return vendor;
  }

  function loadVendors() {
    if (!vendorCachePromise) {
      vendorCachePromise = Promise.all([
        loadJsonWithFallbacks(PAYEES_PATHS),
        loadJsonWithFallbacks(PAYABLES_PATHS),
        loadJsonWithFallbacks(VENDOR_PROFILES_PATHS)
      ]).then(function (payloads) {
        var payees = payloads[0] && Array.isArray(payloads[0].data) ? payloads[0].data : [];
        var payables = payloads[1] && Array.isArray(payloads[1].data) ? payloads[1].data : [];
        var profiles = payloads[2] && Array.isArray(payloads[2].data) ? payloads[2].data : [];
        var profilesByPayeeId = {};
        profiles.forEach(function (profile) {
          if (profile && profile.payeeId) profilesByPayeeId[profile.payeeId] = profile;
        });

        var vendors = payees.map(function (payee) {
          return buildVendor(payee, profilesByPayeeId[payee.id] || {}, payables);
        });

        return vendors.sort(function (a, b) {
          return a.displayName.localeCompare(b.displayName);
        });
      });
    }
    return vendorCachePromise;
  }

  function getVendorById(id) {
    return loadVendors().then(function (vendors) {
      return vendors.find(function (vendor) { return vendor.id === id; }) || null;
    });
  }

  window.VendorsData = {
    loadVendors: loadVendors,
    getVendorById: getVendorById,
    formatMoney: formatMoney,
    formatDate: formatDate,
    formatDateTime: formatDateTime,
    escapeHtml: escapeHtml
  };
})();
