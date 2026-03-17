/**
 * payables-pay.js
 * Populates Pay page using selected payable record.
 */
(function () {
  'use strict';

  var JSON_PATH_FALLBACKS = [
    '../../../src/data/bills-payables.json',
    '/src/data/bills-payables.json',
    './src/data/bills-payables.json',
  ];
  var PAYMENT_PREFERENCES_DATA_PATHS = [
    '../../../src/data/payment-preferences-data.json',
    '/src/data/payment-preferences-data.json',
    './src/data/payment-preferences-data.json',
  ];
  var BANK_ACCOUNTS_PATHS = [
    '../../../src/data/bank-accounts.json',
    '/src/data/bank-accounts.json',
    './src/data/bank-accounts.json',
  ];
  var PAYEES_PATH_FALLBACKS = [
    '../../../src/data/payees.json',
    '/src/data/payees.json',
    './src/data/payees.json',
  ];
  var CHECK_ADDRESSES_PATHS = [
    '../../../src/data/check-addresses.json',
    '/src/data/check-addresses.json',
    './src/data/check-addresses.json',
  ];
  var CARDS_DATA_PATHS = [
    '../../../src/data/cards.json',
    '/src/data/cards.json',
    './src/data/cards.json',
  ];
  var PUBLIC_RUNTIME_CONFIG_PATHS = [
    '../../../src/data/public-runtime-config.json',
    '/src/data/public-runtime-config.json',
    './src/data/public-runtime-config.json',
  ];
  var PAYABLE_ROW_OVERRIDES_STORAGE_KEY = 'bp-row-overrides-v1';
  var PAY_PAGE_VIEW_CONTEXT_STORAGE_KEY = 'bp-pay-page-view-context-v1';
  var PAYABLE_CARDS_STORAGE_KEY = 'bp-cards-dataset-v1';
  var TOKEN_SERVICE_CONFIG_STORAGE_KEY = 'sd-sx-token-test-config-v1';
  var _tokenServiceConfigPromise = null;
  var _origDetailsState = {
    account: null,
    expanded: false,
    revealed: false,
    bound: false,
  };
  var _payContext = {
    row: null,
    payeeProfile: null,
  };
  var _payInfoState = {
    collapsedMobile: true,
    bound: false,
  };
  var _schedulePickerState = {
    open: false,
    monthCursor: null,
    selectedDate: null,
    confirmedDate: null,
    bound: false,
  };
  var _cardFundingState = {
    cards: [],
    cardSource: '',
    selectedCardId: '',
    pendingNewCard: null,
    fundingMethod: '',
    fundingAmount: '',
    sendingMethod: 'on_file',
  };
  var _smartTestEmailState = {
    smart_disburse: { sending: false },
    smart_exchange: { sending: false },
  };
  var STEP_BADGE_NUMBER_CLASS =
    'inline-flex size-5 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-gray-100 text-xs font-medium text-gray-800 dark:border-white/10 dark:bg-white/10 dark:text-gray-300';
  var STEP_BADGE_COMPLETE_CLASS =
    'inline-flex size-5 shrink-0 items-center justify-center rounded-full border border-blue-300 bg-blue-100 text-blue-700 dark:border-blue-500/40 dark:bg-blue-400/15 dark:text-blue-300';
  var STEP_BADGE_CHECK_ICON =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="size-3.5" aria-hidden="true">' +
      '<path fill-rule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clip-rule="evenodd" />' +
    '</svg>';
  var CARD_ICON_VISA = '<svg class="size-5 shrink-0 rounded-[2px]" height="20" width="20" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><g fill="none" fill-rule="evenodd"><path d="M0 0h32v32H0z" fill="#00579f"></path><g fill="#fff" fill-rule="nonzero"><path d="M13.823 19.876H11.8l1.265-7.736h2.023zm7.334-7.546a5.036 5.036 0 0 0-1.814-.33c-1.998 0-3.405 1.053-3.414 2.56-.016 1.11 1.007 1.728 1.773 2.098.783.379 1.05.626 1.05.963-.009.518-.633.757-1.216.757-.808 0-1.24-.123-1.898-.411l-.267-.124-.283 1.737c.475.213 1.349.403 2.257.411 2.123 0 3.505-1.037 3.521-2.641.008-.881-.532-1.556-1.698-2.107-.708-.354-1.141-.593-1.141-.955.008-.33.366-.667 1.165-.667a3.471 3.471 0 0 1 1.507.297l.183.082zm2.69 4.806.807-2.165c-.008.017.167-.452.266-.74l.142.666s.383 1.852.466 2.239h-1.682zm2.497-4.996h-1.565c-.483 0-.85.14-1.058.642l-3.005 7.094h2.123l.425-1.16h2.597c.059.271.242 1.16.242 1.16h1.873zm-16.234 0-1.982 5.275-.216-1.07c-.366-1.234-1.515-2.575-2.797-3.242l1.815 6.765h2.14l3.18-7.728z"></path><path d="M6.289 12.14H3.033L3 12.297c2.54.641 4.221 2.189 4.912 4.049l-.708-3.556c-.116-.494-.474-.633-.915-.65z"></path></g></g></svg>';
  var CARD_ICON_MASTERCARD = '<img src="../../../src/assets/illustrations/ma_symbol.svg" alt="Mastercard" class="size-5 shrink-0" />';
  var _refreshHalfTurns = 0;

  function setText(id, value, fallback) {
    var el = document.getElementById(id);
    if (!el) return;
    var text = value == null || value === '' ? (fallback || '--') : String(value);
    el.textContent = text;
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function setStatusBadge(status, statusLabel) {
    var el = document.getElementById('gp-status-badge');
    if (!el) return;
    var styles = {
      ready_to_pay: 'bg-gray-50 text-gray-600 inset-ring-gray-500/10 dark:bg-gray-400/10 dark:text-gray-400 dark:inset-ring-gray-400/20',
      in_progress: 'bg-blue-50 text-blue-700 inset-ring-blue-700/10 dark:bg-blue-400/10 dark:text-blue-400 dark:inset-ring-blue-400/30',
      scheduled: 'bg-gray-100 text-gray-700 inset-ring-gray-500/10 dark:bg-white/10 dark:text-gray-300 dark:inset-ring-white/15',
      paid: 'bg-green-50 text-green-700 inset-ring-green-600/20 dark:bg-green-500/10 dark:text-green-400 dark:inset-ring-green-500/20',
      exception: 'bg-red-50 text-red-700 inset-ring-red-600/10 dark:bg-red-400/10 dark:text-red-400 dark:inset-ring-red-400/20',
    };
    var labels = {
      ready_to_pay: 'Unprocessed',
      in_progress: 'In Progress',
      scheduled: 'Scheduled',
      paid: 'Paid',
      exception: 'Failed',
    };
    var key = String(status || 'ready_to_pay');
    el.className = 'inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium inset-ring ' + (styles[key] || styles.ready_to_pay);
    el.innerHTML = key === 'scheduled'
      ? '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="size-4 shrink-0" aria-hidden="true"><path fill-rule="evenodd" d="M4 1.75a.75.75 0 0 1 1.5 0V3h5V1.75a.75.75 0 0 1 1.5 0V3a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2V1.75ZM4.5 6a1 1 0 0 0-1 1v4.5a1 1 0 0 0 1 1h7a1 1 0 0 0 1-1V7a1 1 0 0 0-1-1h-7Z" clip-rule="evenodd" /></svg><span class="leading-none">' + escapeHtml(String(statusLabel || labels[key] || labels.ready_to_pay)) + '</span>'
      : escapeHtml(String(statusLabel || labels[key] || labels.ready_to_pay));
  }

  function getDisplayStatus(row) {
    var status = String((row && row.status) || 'ready_to_pay');
    var statusType = String((row && row.statusType) || '').toLowerCase();
    if (status === 'scheduled' || (status === 'in_progress' && statusType === 'scheduled')) {
      return { key: 'scheduled', label: 'Scheduled' };
    }
    if (status === 'in_progress') {
      return { key: 'in_progress', label: 'Processing' };
    }
    if (status === 'paid') {
      return { key: 'paid', label: 'Paid' };
    }
    if (status === 'exception') {
      return { key: 'exception', label: 'Failed' };
    }
    return { key: 'ready_to_pay', label: 'Unprocessed' };
  }

  function isConfirmedPayableRow(row) {
    if (!row) return false;
    var status = String(row.status || '').toLowerCase();
    return status === 'in_progress' || status === 'scheduled' || status === 'paid';
  }

  function isScheduledPayableRow(row) {
    if (!row) return false;
    var status = String(row.status || '').toLowerCase();
    var statusType = String(row.statusType || '').toLowerCase();
    return status === 'scheduled' || (status === 'in_progress' && statusType === 'scheduled');
  }

  function formatMoney(amount, currency) {
    var numeric = Number(amount || 0);
    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency || 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(numeric);
    } catch (err) {
      return '$' + numeric.toFixed(2);
    }
  }

  function formatDate(value) {
    if (!value) return '--';
    var date = new Date(String(value) + 'T00:00:00');
    if (isNaN(date.getTime())) return String(value);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function getHeaderDateMeta(row) {
    if (!row) return '--';
    var status = String(row.status || '').toLowerCase();
    var statusType = String(row.statusType || '').toLowerCase();
    if (status === 'paid') return '';
    if (status === 'exception') return 'Failed on ' + formatDate(row.adDate || row.dueDate);
    if (status === 'scheduled' || status === 'in_progress') return '';
    return '';
  }

  function cloneJson(value) {
    if (value == null) return value;
    return JSON.parse(JSON.stringify(value));
  }

  function getStoredPayableOverrides() {
    try {
      var raw = window.localStorage.getItem(PAYABLE_ROW_OVERRIDES_STORAGE_KEY);
      if (!raw) return {};
      var parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch (err) {
      return {};
    }
  }

  function persistPayableOverride(row) {
    if (!row || row.id == null) return;
    try {
      var overrides = getStoredPayableOverrides();
      overrides[String(row.id)] = cloneJson(row);
      window.localStorage.setItem(PAYABLE_ROW_OVERRIDES_STORAGE_KEY, JSON.stringify(overrides));
    } catch (err) {
      // Ignore storage failures so the flow still completes.
    }
  }

  function applyStoredPayableOverrides(rows) {
    var overrides = getStoredPayableOverrides();
    return (Array.isArray(rows) ? rows : []).map(function (row) {
      if (!row || row.id == null) return row;
      var override = overrides[String(row.id)];
      return override ? cloneJson(override) : row;
    });
  }

  function normalizeCardsDataset(payload) {
    var list = Array.isArray(payload) ? payload : ((payload && Array.isArray(payload.data)) ? payload.data : []);
    return list.map(function (card, idx) {
      var next = cloneJson(card) || {};
      next.id = String(next.id || ('card_' + String(idx + 1).padStart(3, '0')));
      next.cardName = String(next.cardName || ('Virtual Card #' + (idx + 1)));
      next.brand = String(next.brand || (idx % 2 === 0 ? 'visa' : 'mastercard')).toLowerCase();
      next.last4 = getDigits(next.last4).slice(-4) || String(1000 + idx).slice(-4);
      next.expDate = String(next.expDate || '12/2027');
      next.currentBalance = Number(next.currentBalance || 0);
      next.projectedBalance = Number(next.projectedBalance != null ? next.projectedBalance : next.currentBalance || 0);
      next.currency = String(next.currency || 'USD');
      next.payments = Array.isArray(next.payments) ? next.payments : [];
      return next;
    });
  }

  function getStoredCardsDataset(seedCards) {
    var fallback = normalizeCardsDataset(seedCards);
    try {
      var raw = window.localStorage.getItem(PAYABLE_CARDS_STORAGE_KEY);
      if (!raw) return fallback;
      return normalizeCardsDataset(JSON.parse(raw)).filter(function (card) {
        return !(Number(card.currentBalance || 0) === 0 && Number(card.projectedBalance || 0) === 0 && (!Array.isArray(card.payments) || !card.payments.length));
      });
    } catch (err) {
      return fallback;
    }
  }

  function persistCardsDataset(cards) {
    try {
      window.localStorage.setItem(PAYABLE_CARDS_STORAGE_KEY, JSON.stringify(normalizeCardsDataset(cards)));
    } catch (err) {
      // Ignore storage failures.
    }
  }

  function getCardBrandIcon(brand) {
    return String(brand || '').toLowerCase() === 'mastercard' ? CARD_ICON_MASTERCARD : CARD_ICON_VISA;
  }

  function getCardBrandLogoMarkup(brand, size) {
    var normalized = String(brand || '').toLowerCase();
    if (normalized === 'mastercard') {
      var mcSizeClass = size === 'large' ? 'h-[18px] w-[28px]' : (size === 'medium' ? 'h-4 w-6' : 'h-4 w-4');
      return '<img src="../../../src/assets/illustrations/ma_symbol.svg" alt="Mastercard" class="' + mcSizeClass + '" />';
    }
    if (size === 'large') {
      return '<svg xmlns="http://www.w3.org/2000/svg" width="59" height="18" viewBox="0 0 59 18" fill="none" aria-label="Visa" role="img"><path d="M49.0149 11.5661L50.911 6.68624C50.8879 6.73859 51.3015 5.67937 51.5423 5.02376L51.8689 6.53035L52.9693 11.5632H49.0117V11.5661H49.0149ZM11.5564 9.78621L12.0496 12.209L16.7013 0.317736H21.7424L14.2524 17.7318H9.22275L5.1113 2.98625C5.04534 2.74336 4.8883 2.53396 4.67367 2.40225C3.19221 1.6366 1.6228 1.05585 0 0.672661L0.0638636 0.305067H7.72453C8.76417 0.347157 9.60175 0.672659 9.88025 1.78224L11.5543 9.79564V9.78621H11.5564ZM23.6395 0.170012H28.399L25.4215 17.6176H20.6682L23.6395 0.164774V0.170012ZM54.8874 0.317736H51.2167C50.0744 0.317736 49.2138 0.631828 48.7155 1.76465L41.6568 17.7558H46.6509L47.6496 15.1331L53.7451 15.1397C53.8885 15.7531 54.3293 17.7558 54.3293 17.7558H58.7339L54.8874 0.317736ZM42.6954 0.737259C41.3312 0.239948 39.8885 -0.00985909 38.4353 0.000297546C33.7375 0.000297546 30.4197 2.36666 30.3956 5.76397C30.3663 8.25994 32.7534 9.66602 34.5594 10.5002C36.4125 11.3579 37.0313 11.8982 37.0261 12.6645C37.0145 13.8297 35.5456 14.3585 34.1804 14.3585C32.3042 14.3585 31.2792 14.0968 29.7025 13.4424L29.1183 13.1693L28.4524 17.0807C29.5947 17.5559 31.653 17.9644 33.7784 18C38.7734 18 42.0379 15.6473 42.0766 12.0331C42.1175 10.0385 40.8255 8.53309 38.1065 7.28825C36.4534 6.48009 35.4284 5.93986 35.4284 5.12113C35.4284 4.39558 36.3068 3.62093 38.1421 3.62093C39.3629 3.59151 40.5763 3.81975 41.7029 4.29287L42.1437 4.4896L42.8106 0.71035L42.6954 0.737259Z" fill="white"/></svg>';
    }
    if (size === 'medium') {
      return '<svg width="24" height="16" viewBox="0 0 24 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="Visa" role="img"><rect width="24" height="16" rx="1.2" fill="url(#visa-grad-pay-modal)" /><path d="M12.309 7.05313C12.2987 7.85651 13.0305 8.30487 13.5818 8.57141C14.1483 8.84493 14.3385 9.0203 14.3364 9.26485C14.3321 9.6392 13.8845 9.80438 13.4656 9.81081C12.7349 9.82208 12.3101 9.61506 11.9722 9.45846L11.709 10.6807C12.0479 10.8357 12.6754 10.9708 13.3262 10.9767C14.8536 10.9767 15.853 10.2286 15.8584 9.06857C15.8644 7.5964 13.8061 7.51489 13.8202 6.85684C13.8251 6.65733 14.0169 6.44442 14.4374 6.39025C14.6455 6.3629 15.2201 6.34198 15.8714 6.63963L16.127 5.45708C15.7768 5.33051 15.3266 5.2093 14.7661 5.2093C13.3283 5.2093 12.3171 5.96764 12.309 7.05313ZM18.5836 5.3112C18.3047 5.3112 18.0696 5.47263 17.9647 5.7204L15.7827 10.8899H17.3091L17.6129 10.057H19.4781L19.6543 10.8899H20.9996L19.8257 5.3112H18.5836ZM18.7971 6.81822L19.2376 8.91304H18.0312L18.7971 6.81822ZM10.4583 5.3112L9.25517 10.8899H10.7096L11.9122 5.3112H10.4583ZM8.3066 5.3112L6.79266 9.10825L6.18028 5.87969C6.1084 5.51929 5.82464 5.3112 5.50953 5.3112H3.03459L3 5.47317C3.50807 5.58257 4.08532 5.75902 4.43502 5.9478C4.64906 6.0631 4.71013 6.16393 4.7804 6.43798L5.9403 10.8899H7.47747L9.83404 5.3112H8.3066Z" fill="white" /><defs><linearGradient id="visa-grad-pay-modal" x1="10.7812" y1="16" x2="15.6708" y2="0.32624" gradientUnits="userSpaceOnUse"><stop stop-color="#222357" /><stop offset="1" stop-color="#254AA5" /></linearGradient></defs></svg>';
    }
    return '<svg class="h-4 w-8 rounded-[2px]" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M0 0h32v32H0z" fill="#00579f"></path><g fill="#fff" fill-rule="nonzero"><path d="M13.823 19.876H11.8l1.265-7.736h2.023zm7.334-7.546a5.036 5.036 0 0 0-1.814-.33c-1.998 0-3.405 1.053-3.414 2.56-.016 1.11 1.007 1.728 1.773 2.098.783.379 1.05.626 1.05.963-.009.518-.633.757-1.216.757-.808 0-1.24-.123-1.898-.411l-.267-.124-.283 1.737c.475.213 1.349.403 2.257.411 2.123 0 3.505-1.037 3.521-2.641.008-.881-.532-1.556-1.698-2.107-.708-.354-1.141-.593-1.141-.955.008-.33.366-.667 1.165-.667a3.471 3.471 0 0 1 1.507.297l.183.082zm2.69 4.806.807-2.165c-.008.017.167-.452.266-.74l.142.666s.383 1.852.466 2.239h-1.682zm2.497-4.996h-1.565c-.483 0-.85.14-1.058.642l-3.005 7.094h2.123l.425-1.16h2.597c.059.271.242 1.16.242 1.16h1.873zm-16.234 0-1.982 5.275-.216-1.07c-.366-1.234-1.515-2.575-2.797-3.242l1.815 6.765h2.14l3.18-7.728z"></path><path d="M6.289 12.14H3.033L3 12.297c2.54.641 4.221 2.189 4.912 4.049l-.708-3.556c-.116-.494-.474-.633-.915-.65z"></path></g></svg>';
  }

  function getCardDisplayLabel(card) {
    if (!card) return '';
    return String(card.cardName || 'Virtual Card').trim() + ' •••• ' + String(card.last4 || '').trim();
  }

  function getCardSearchDisplayLabel(card) {
    if (!card) return '';
    return getCardDisplayLabel(card) + ' ' + String(card.expDate || '').trim();
  }

  function cardMatchesSearch(card, query) {
    var normalizedQuery = String(query || '').trim().toLowerCase();
    if (!normalizedQuery) return true;
    var compactQuery = normalizedQuery.replace(/[^a-z0-9]/g, '');
    var haystack = [
      String(card && card.cardName || ''),
      String(card && card.last4 || ''),
      String(card && card.expDate || ''),
      String(card && card.expDate || '').replace(/[^0-9]/g, ''),
      getCardDisplayLabel(card),
      getCardSearchDisplayLabel(card)
    ].join(' ').toLowerCase();
    var compactHaystack = haystack.replace(/[^a-z0-9]/g, '');
    return haystack.indexOf(normalizedQuery) !== -1 || (!!compactQuery && compactHaystack.indexOf(compactQuery) !== -1);
  }

  function buildCardSelectContent(card) {
    if (!card) return '';
    return '' +
      '<span class="inline-flex min-w-0 items-center justify-between gap-4 w-full pr-6">' +
        '<span class="inline-flex min-w-0 items-center gap-3">' +
        '<span class="shrink-0">' + getCardBrandIcon(card.brand) + '</span>' +
        '<span class="flex min-w-0 items-center gap-3">' +
          '<span class="truncate font-medium">' + escapeHtml(getCardDisplayLabel(card)) + '</span>' +
          '<span class="shrink-0 text-sm font-medium text-gray-700 dark:text-gray-300">' + escapeHtml(String(card.expDate || '').trim()) + '</span>' +
        '</span>' +
        '</span>' +
        '<span class="shrink-0 text-sm font-semibold text-gray-700 dark:text-gray-300">' + escapeHtml(formatMoney(card.currentBalance, card.currency || 'USD')) + '</span>' +
      '</span>';
  }

  function buildPendingNewCardSummary(card) {
    var brand = String((card && card.brand) || 'visa').toLowerCase();
    var message = 'A new virtual card will be created after you confirm and submit this payment.';
    var brandIcon = brand === 'mastercard'
      ? '<img src="../../../src/assets/illustrations/ma_symbol.svg" alt="Mastercard" class="h-4 w-4 shrink-0" />'
      : '<svg class="h-4 w-6 shrink-0 rounded-[2px]" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M0 0h32v32H0z" fill="#00579f"></path><g fill="#fff" fill-rule="nonzero"><path d="M13.823 19.876H11.8l1.265-7.736h2.023zm7.334-7.546a5.036 5.036 0 0 0-1.814-.33c-1.998 0-3.405 1.053-3.414 2.56-.016 1.11 1.007 1.728 1.773 2.098.783.379 1.05.626 1.05.963-.009.518-.633.757-1.216.757-.808 0-1.24-.123-1.898-.411l-.267-.124-.283 1.737c.475.213 1.349.403 2.257.411 2.123 0 3.505-1.037 3.521-2.641.008-.881-.532-1.556-1.698-2.107-.708-.354-1.141-.593-1.141-.955.008-.33.366-.667 1.165-.667a3.471 3.471 0 0 1 1.507.297l.183.082zm2.69 4.806.807-2.165c-.008.017.167-.452.266-.74l.142.666s.383 1.852.466 2.239h-1.682zm2.497-4.996h-1.565c-.483 0-.85.14-1.058.642l-3.005 7.094h2.123l.425-1.16h2.597c.059.271.242 1.16.242 1.16h1.873zm-16.234 0-1.982 5.275-.216-1.07c-.366-1.234-1.515-2.575-2.797-3.242l1.815 6.765h2.14l3.18-7.728z"></path><path d="M6.289 12.14H3.033L3 12.297c2.54.641 4.221 2.189 4.912 4.049l-.708-3.556c-.116-.494-.474-.633-.915-.65z"></path></g></svg>';
    return '' +
      '<div class="flex items-center gap-4">' +
        '<div class="flex h-[46px] w-[86px] flex-col items-end justify-between rounded-md bg-gray-950 p-2 text-gray-200 font-[\'Roboto_Mono\'] text-[10px] leading-3">' +
          '<div class="self-end">' + brandIcon + '</div>' +
          '<div class="w-full whitespace-nowrap text-left">•••• ••••</div>' +
        '</div>' +
        '<div class="min-w-0">' +
          '<p class="text-sm font-medium leading-5 text-gray-700 dark:text-gray-200">' + escapeHtml(message) + '</p>' +
        '</div>' +
      '</div>';
  }

  function buildCardOptionHtml(card) {
    return (
      '<el-option value="' + escapeHtml(String(card.id || '')) + '" class="group/option relative block cursor-default select-none border-b border-gray-200 py-2.5 pr-4 pl-3 text-gray-900 aria-selected:bg-gray-100 focus:bg-gray-100 focus:outline-hidden dark:border-white/10 dark:text-white dark:aria-selected:bg-white/10 dark:focus:bg-white/10">' +
        '<div class="flex items-center justify-between gap-4 pr-8">' +
          '<span class="flex min-w-0 items-center gap-3">' +
            '<span class="shrink-0 self-start">' + getCardBrandIcon(card.brand) + '</span>' +
            '<span class="min-w-0 flex items-center gap-3">' +
              '<span class="truncate font-medium group-aria-selected/option:font-semibold">' + escapeHtml(getCardDisplayLabel(card)) + '</span>' +
              '<span class="shrink-0 text-sm font-medium text-gray-700 dark:text-gray-300">' + escapeHtml(String(card.expDate || '').trim()) + '</span>' +
            '</span>' +
          '</span>' +
          '<span class="shrink-0 text-sm font-semibold text-gray-700 dark:text-gray-300">' + escapeHtml(formatMoney(card.currentBalance, card.currency || 'USD')) + '</span>' +
        '</div>' +
        '<span class="absolute inset-y-0 right-0 flex items-center pr-3 text-blue-600 group-not-aria-selected/option:hidden">' +
          '<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" class="size-5"><path d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clip-rule="evenodd" fill-rule="evenodd" /></svg>' +
        '</span>' +
      '</el-option>'
    );
  }

  function getCurrentPayableAmountNumber() {
    return Number((_payContext.row && _payContext.row.amount) || 0);
  }

  function parseMoneyInput(value) {
    var raw = String(value == null ? '' : value).replace(/[^0-9.]/g, '');
    if (!raw) return 0;
    var parts = raw.split('.');
    var normalized = parts.shift();
    if (parts.length) normalized += '.' + parts.join('').slice(0, 2);
    var numeric = Number(normalized);
    return isNaN(numeric) ? 0 : numeric;
  }

  function formatMoneyInputValue(value) {
    var numeric = Number(value || 0);
    return numeric ? numeric.toFixed(2) : '0.00';
  }

  function renderCardOptionsList(cardOpts, query) {
    if (!cardOpts) return;
    var filteredCards = (_cardFundingState.cards || []).filter(function (card) {
      return cardMatchesSearch(card, query);
    });
    cardOpts.innerHTML = filteredCards.map(function (card) {
      return buildCardOptionHtml(card);
    }).join('');
    var selectedId = String(_cardFundingState.selectedCardId || '');
    if (selectedId) {
      cardOpts.querySelectorAll('el-option').forEach(function (el) {
        if (String(el.getAttribute('value') || '') === selectedId) el.setAttribute('aria-selected', 'true');
      });
    }
  }

  function getCardById(cardId) {
    var id = String(cardId || '');
    for (var i = 0; i < _cardFundingState.cards.length; i += 1) {
      if (String(_cardFundingState.cards[i].id) === id) return _cardFundingState.cards[i];
    }
    return null;
  }

  function getRowCardLast4(row) {
    var digits = getDigits((row && (row.cardLast4 || row.paymentMethodEnding || row.paymentMethod)) || '');
    return digits ? digits.slice(-4) : '';
  }

  function getRowCardBrand(row) {
    var network = String((row && (row.cardNetwork || row.paymentMethod)) || '').trim().toLowerCase();
    if (network.indexOf('master') !== -1) return 'mastercard';
    if (network.indexOf('visa') !== -1) return 'visa';
    return '';
  }

  function resolveStoredCardForRow(row, preferredCardId) {
    var preferred = getCardById(preferredCardId);
    if (preferred) return preferred;

    var cards = Array.isArray(_cardFundingState.cards) ? _cardFundingState.cards : [];
    if (!cards.length) return null;

    var last4 = getRowCardLast4(row);
    var brand = getRowCardBrand(row);
    var matched = null;

    if (last4) {
      for (var i = 0; i < cards.length; i += 1) {
        if (String(cards[i] && cards[i].last4 || '').trim() !== last4) continue;
        if (brand && String(cards[i] && cards[i].brand || '').trim().toLowerCase() !== brand) continue;
        matched = cards[i];
        break;
      }
    }

    if (!matched && brand) {
      for (var j = 0; j < cards.length; j += 1) {
        if (String(cards[j] && cards[j].brand || '').trim().toLowerCase() === brand) {
          matched = cards[j];
          break;
        }
      }
    }

    return matched || getDeterministicListItem(cards, row, 43);
  }

  function getActiveCard() {
    if (String(_cardFundingState.cardSource || '') === 'new') return _cardFundingState.pendingNewCard;
    return getCardById(_cardFundingState.selectedCardId);
  }

  function showCardOptionsPopover(cardOpts) {
    if (!cardOpts || typeof cardOpts.matches !== 'function') return;
    if (cardOpts.matches(':popover-open')) return;
    if (typeof cardOpts.showPopover === 'function') {
      try {
        cardOpts.showPopover();
      } catch (err) {
        return;
      }
    }
  }

  function hideCardOptionsPopover(cardOpts) {
    if (!cardOpts || typeof cardOpts.matches !== 'function') return;
    if (!cardOpts.matches(':popover-open')) return;
    if (typeof cardOpts.hidePopover === 'function') {
      try {
        cardOpts.hidePopover();
      } catch (err) {
        return;
      }
    }
  }

  function getCardFundingMethodMeta(card) {
    var payableAmount = getCurrentPayableAmountNumber();
    var currentBalance = Number((card && card.currentBalance) || 0);
    return [
      {
        id: 'add_funds',
        label: 'Add Funds',
        subtitle: 'Fund this card with another specific amount.',
        disabled: false,
        badge: ''
      },
      {
        id: 'spend_balance',
        label: 'Spend Balance',
        subtitle: 'Make payment with existing money on the card.',
        disabled: !card || currentBalance < payableAmount,
        badge: (!card || currentBalance < payableAmount) ? 'Not enough funds' : ''
      }
    ];
  }

  function getCardProjectedBalance(card) {
    var currentBalance = Number((card && card.currentBalance) || 0);
    var fundingMethod = String(_cardFundingState.fundingMethod || '');
    var fundingAmount = fundingMethod === 'spend_balance' ? 0 : parseMoneyInput(_cardFundingState.fundingAmount);
    return currentBalance + fundingAmount;
  }

  function getCardAvailableBalanceForPayment(card) {
    var projected = getCardProjectedBalance(card);
    if (String(_cardFundingState.fundingMethod || '') === 'spend_balance') {
      return Number((card && card.currentBalance) || 0);
    }
    return projected;
  }

  function syncCardProgressiveReveal() {
    var existingWrap = document.getElementById('pp-card-existing-selector-wrap');
    var createdWrap = document.getElementById('pp-card-created-summary');
    var fundingMethodWrap = document.getElementById('pp-card-funding-method-wrap');
    var fundingDetailsWrap = document.getElementById('pp-card-funding-details-wrap');
    var fundingAmountWrap = document.getElementById('pp-card-funding-amount-wrap');
    var sendingWrap = document.getElementById('pp-card-sending-methods');
    var hasCard = !!getActiveCard();
    var hasFundingMethod = !!String(_cardFundingState.fundingMethod || '');

    if (existingWrap) existingWrap.classList.toggle('hidden', _cardFundingState.cardSource !== 'existing');
    if (createdWrap) createdWrap.classList.toggle('hidden', !(_cardFundingState.cardSource === 'new' && hasCard));
    if (fundingMethodWrap) fundingMethodWrap.classList.toggle('hidden', !hasCard);
    if (fundingDetailsWrap) fundingDetailsWrap.classList.toggle('hidden', !hasFundingMethod);
    if (fundingAmountWrap) fundingAmountWrap.classList.toggle('hidden', !hasFundingMethod);
    if (sendingWrap) sendingWrap.classList.toggle('hidden', !hasFundingMethod);
  }

  function renderCardBalanceSummary() {
    var projectedEl = document.getElementById('pp-card-projected-balance');
    var warningEl = document.getElementById('pp-card-projected-warning');
    var panelEl = document.getElementById('pp-card-balance-panel');
    var card = getActiveCard();
    var hasFundingMethod = !!String(_cardFundingState.fundingMethod || '');
    if (!projectedEl || !warningEl || !panelEl) return;
    panelEl.classList.toggle('hidden', !(card && hasFundingMethod));
    if (!card || !hasFundingMethod) {
      projectedEl.textContent = '$0.00';
      warningEl.classList.add('hidden');
      return;
    }
    projectedEl.textContent = formatMoney(getCardProjectedBalance(card), card.currency || 'USD');
    warningEl.classList.toggle('hidden', getCardAvailableBalanceForPayment(card) >= getCurrentPayableAmountNumber());
    syncCardProgressiveReveal();
  }

  function syncFundingAmountInput() {
    var input = document.getElementById('pp-card-funding-amount');
    var info = document.getElementById('pp-card-funding-amount-info');
    if (!input) return;
    var disabled = String(_cardFundingState.fundingMethod || '') === 'spend_balance';
    input.disabled = disabled;
    input.classList.toggle('cursor-not-allowed', disabled);
    input.classList.toggle('bg-gray-50', disabled);
    input.classList.toggle('text-gray-500', disabled);
    input.classList.toggle('outline-gray-200', disabled);
    if (info) {
      info.classList.toggle('invisible', !disabled);
      info.classList.toggle('opacity-0', !disabled);
      info.classList.toggle('pointer-events-none', !disabled);
    }
    if (_cardFundingState.fundingMethod === 'add_funds' && !parseMoneyInput(_cardFundingState.fundingAmount)) {
      _cardFundingState.fundingAmount = formatMoneyInputValue(getCurrentPayableAmountNumber());
    } else if (_cardFundingState.fundingMethod === 'spend_balance') {
      _cardFundingState.fundingAmount = '0.00';
    }
    input.value = _cardFundingState.fundingAmount;
    syncCardProgressiveReveal();
  }

  function renderCardFundingMethodOptions() {
    var optionsEl = document.getElementById('pp-card-funding-method-radios');
    if (!optionsEl) return;
    var items = getCardFundingMethodMeta(getActiveCard());
    optionsEl.innerHTML = items.map(function (item) {
      var checked = String(_cardFundingState.fundingMethod || '') === String(item.id || '');
      return (
        '<div class="flex items-center' + (item.disabled ? ' opacity-60' : '') + '">' +
          '<input id="pp-card-funding-method-' + escapeHtml(String(item.id || '')) + '" type="radio" name="pp-card-funding-method" value="' + escapeHtml(item.id) + '" data-base-disabled="' + (item.disabled ? 'true' : 'false') + '" ' + (checked ? 'checked ' : '') + (item.disabled ? 'disabled ' : '') + 'class="relative size-4 appearance-none rounded-full border border-gray-300 bg-white before:absolute before:inset-1 before:rounded-full before:bg-white not-checked:before:hidden checked:border-blue-600 checked:bg-blue-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:border-gray-300 disabled:bg-gray-100 disabled:before:bg-gray-400 forced-colors:appearance-auto forced-colors:before:hidden" />' +
          '<label for="pp-card-funding-method-' + escapeHtml(String(item.id || '')) + '" class="ml-3 block text-sm/6 font-medium text-gray-900 dark:text-white">' + escapeHtml(item.label) + '</label>' +
          (item.badge ? '<span class="ml-2 inline-flex shrink-0 items-center rounded-md bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700 ring-1 ring-inset ring-amber-200 dark:bg-amber-400/10 dark:text-amber-300 dark:ring-amber-400/20">' + escapeHtml(item.badge) + '</span>' : '') +
        '</div>'
      );
    }).join('');
    optionsEl.querySelectorAll('input[name="pp-card-funding-method"]').forEach(function (input) {
      input.addEventListener('click', function (event) {
        if (input.disabled) return;
        var optionValue = String(input.value || '');
        var currentValue = String(optionsEl.getAttribute('data-selected-value') || '');
        if (currentValue && optionValue === currentValue) {
          event.preventDefault();
          _cardFundingState.fundingMethod = '';
          _cardFundingState.fundingAmount = '';
          optionsEl.setAttribute('data-selected-value', '');
          input.checked = false;
          syncFundingAmountInput();
          renderCardBalanceSummary();
          updatePayStepStates();
        }
      });
      input.addEventListener('change', function () {
        if (!input.checked || input.disabled) return;
        var optionValue = String(input.value || '');
        _cardFundingState.fundingMethod = optionValue;
        if (optionValue === 'add_funds' && !parseMoneyInput(_cardFundingState.fundingAmount)) {
          _cardFundingState.fundingAmount = formatMoneyInputValue(getCurrentPayableAmountNumber());
        }
        optionsEl.setAttribute('data-selected-value', optionValue);
        syncFundingAmountInput();
        renderCardBalanceSummary();
        updatePayStepStates();
      });
    });
    if (!_cardFundingState.fundingMethod) {
      optionsEl.setAttribute('data-selected-value', '');
      return;
    }
    var selectedMeta = items.filter(function (item) { return item.id === _cardFundingState.fundingMethod && !item.disabled; })[0];
    if (!selectedMeta) {
      _cardFundingState.fundingMethod = '';
      _cardFundingState.fundingAmount = '';
      optionsEl.setAttribute('data-selected-value', '');
      syncFundingAmountInput();
      return;
    }
    optionsEl.setAttribute('data-selected-value', _cardFundingState.fundingMethod);
    syncCardProgressiveReveal();
  }

  function createNewVirtualCard() {
    var nextIndex = _cardFundingState.cards.length + 1;
    var rowSeed = getRowSeed(_payContext.row) + nextIndex * 17;
    var month = String(((nextIndex % 12) || 12)).padStart(2, '0');
    var year = String(2028 + (nextIndex % 3));
    var card = {
      id: 'pending_card_' + String(Date.now()),
      cardName: 'Virtual Card #' + nextIndex,
      brand: nextIndex % 2 === 0 ? 'visa' : 'mastercard',
      last4: '',
      expDate: month + '/' + year,
      currentBalance: 0,
      projectedBalance: 0,
      currency: String((_payContext.row && _payContext.row.currency) || 'USD'),
      payments: []
    };
    _cardFundingState.cardSource = 'new';
    _cardFundingState.selectedCardId = '';
    _cardFundingState.pendingNewCard = card;
    _cardFundingState.fundingMethod = '';
    _cardFundingState.fundingAmount = '';
    return card;
  }

  function getSavedPayPageState(row) {
    var state = row && row.details && row.details.payPageState;
    return state && typeof state === 'object' ? state : null;
  }

  function getStoredPayPageViewContext() {
    try {
      var raw = window.sessionStorage.getItem(PAY_PAGE_VIEW_CONTEXT_STORAGE_KEY);
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? parsed : null;
    } catch (err) {
      return null;
    }
  }

  function applyStoredPayPageViewContext(row, params) {
    var context = getStoredPayPageViewContext();
    if (!context || !row) return row;
    var id = String(params.get('id') || '').trim();
    var bill = String(params.get('bill') || '').trim();
    var sameId = id && String(context.id || '') === id && String(row.id || '') === id;
    var sameBill = bill && String(context.billNumber || '') === bill && String(row.billNumber || '') === bill;
    // The normalized row from the current dataset is the source of truth for
    // payment method and status, so don't let stale session context override it.
    if (sameId || sameBill) return row;
    return row;
  }

  function getRowSeed(row) {
    var source = String((row && (row.id || row.billNumber || row.payeeName)) || '');
    var seed = 0;
    for (var i = 0; i < source.length; i += 1) seed += source.charCodeAt(i);
    return seed;
  }

  function getDeterministicListItem(list, row, offset) {
    var items = Array.isArray(list) ? list.filter(Boolean) : [];
    if (!items.length) return null;
    var seed = getRowSeed(row) + Number(offset || 0);
    return items[((seed % items.length) + items.length) % items.length] || null;
  }

  function getDigits(value) {
    return String(value == null ? '' : value).replace(/\D/g, '');
  }

  function normalizePayableRowsForPage(rows, payeesList) {
    var methods = ['card', 'ach', 'wire', 'smart_disburse', 'smart_exchange'];
    var byId = {};
    var byName = {};
    (Array.isArray(payeesList) ? payeesList : []).forEach(function (payee) {
      if (!payee || typeof payee !== 'object') return;
      if (payee.id) byId[String(payee.id)] = payee;
      if (payee.name) byName[String(payee.name)] = payee;
    });

    return (Array.isArray(rows) ? rows : []).map(function (row, idx) {
      var next = cloneJson(row) || {};
      var payee = (next.payeeId && byId[next.payeeId]) || (next.payeeName && byName[next.payeeName]) || null;
      if (payee) {
        next.payeeId = next.payeeId || payee.id;
        next.payeeName = payee.name || next.payeeName;
      }

      var methodType = String(next.paymentMethodType || '').trim().toLowerCase();
      if (!methodType) methodType = methods[idx % methods.length];
      next.paymentMethodType = methodType;

      if (methodType === 'card') {
        var network = String(next.cardNetwork || (idx % 2 === 0 ? 'Visa' : 'Mastercard'));
        var cardLast4 = getDigits(next.cardLast4 || next.paymentMethodEnding || String(4100 + (idx % 9000))).slice(-4);
        next.cardNetwork = network;
        next.cardLast4 = cardLast4;
        next.paymentMethod = network + ' •••• ' + cardLast4;
      } else if (methodType === 'ach' || methodType === 'wire') {
        var bankLast4 = getDigits(next.bankLast4 || next.paymentMethodEnding || String(1200 + (idx % 8000))).slice(-4);
        next.bankLast4 = bankLast4;
        next.paymentMethod = (methodType === 'wire' ? 'Wire' : 'Bank') + ' •••• ' + bankLast4;
      } else if (methodType === 'smart_exchange') {
        next.paymentMethod = 'SMART Exchange';
      } else if (methodType === 'smart_disburse') {
        next.paymentMethod = 'SMART Disburse';
      } else {
        next.paymentMethodType = 'smart_disburse';
        next.paymentMethod = 'SMART Disburse';
      }

      if (next.status === 'in_progress') {
        var statusType = next.statusType;
        if (!statusType) {
          statusType = (idx % 3 === 0) ? 'scheduled' : 'processing';
        }
        next.statusType = statusType;
        if (statusType === 'scheduled') {
          if (!next.scheduledFor) {
            var day = 14 + (idx % 10);
            var minute = idx % 2 === 0 ? '45' : '15';
            next.scheduledFor = '2026-07-' + String(day).padStart(2, '0') + 'T00:' + minute + ':00';
          }
          next.statusLabel = 'Scheduled';
        } else {
          next.statusLabel = 'Processing';
        }
      }

      return next;
    });
  }

  function inferRowMethodType(row) {
    var explicitType = String((row && row.paymentMethodType) || '').trim().toLowerCase();
    if (explicitType) return explicitType;
    var text = String((row && row.paymentMethod) || '').trim().toLowerCase();
    if (text.indexOf('smart exchange') !== -1) return 'smart_exchange';
    if (text.indexOf('smart disburse') !== -1) return 'smart_disburse';
    if (text.indexOf('wire') !== -1) return 'wire';
    if (text.indexOf('bank') !== -1 || text.indexOf('ach') !== -1) return 'ach';
    if (text.indexOf('visa') !== -1 || text.indexOf('mastercard') !== -1 || text.indexOf('card') !== -1) return 'card';
    if (text.indexOf('check') !== -1) return 'check';
    return '';
  }

  function buildFallbackOriginationState(row, accounts) {
    var selected = getDeterministicListItem(accounts, row, 7);
    if (!selected) return null;
    return {
      originationAccountId: String(selected.id || ''),
      originationExpanded: false,
      originationRevealed: false,
    };
  }

  function formatActivityDateTime(value) {
    if (!value) return '--';
    var str = String(value);
    var normalized = str.indexOf('T') === -1 ? (str + 'T00:00:00') : str;
    var date = new Date(normalized);
    if (isNaN(date.getTime())) return str;
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  }

  function getNowIsoDateTime() {
    var date = new Date();
    var year = date.getFullYear();
    var month = String(date.getMonth() + 1).padStart(2, '0');
    var day = String(date.getDate()).padStart(2, '0');
    var hours = String(date.getHours()).padStart(2, '0');
    var minutes = String(date.getMinutes()).padStart(2, '0');
    var seconds = String(date.getSeconds()).padStart(2, '0');
    return year + '-' + month + '-' + day + 'T' + hours + ':' + minutes + ':' + seconds;
  }

  function getMonthStart(date) {
    return new Date(date.getFullYear(), date.getMonth(), 1);
  }

  function shiftMonths(date, delta) {
    return new Date(date.getFullYear(), date.getMonth() + delta, 1);
  }

  function toIsoDate(date) {
    var year = date.getFullYear();
    var month = String(date.getMonth() + 1).padStart(2, '0');
    var day = String(date.getDate()).padStart(2, '0');
    return year + '-' + month + '-' + day;
  }

  function isoStringToDate(iso) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(iso || ''))) return null;
    var date = new Date(String(iso) + 'T00:00:00');
    return Number.isNaN(date.getTime()) ? null : date;
  }

  function formatIsoAsUsInput(iso) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(iso || ''))) return '';
    return iso.slice(5, 7) + ' / ' + iso.slice(8, 10) + ' / ' + iso.slice(0, 4);
  }

  function partsToIso(mm, dd, yyyy) {
    var mmNum = parseInt(mm, 10);
    var ddNum = parseInt(dd, 10);
    var yyyyNum = parseInt(yyyy, 10);
    if (!mm || !dd || !yyyy || Number.isNaN(mmNum) || Number.isNaN(ddNum) || Number.isNaN(yyyyNum)) return '';
    if (yyyy.length !== 4 || mm.length !== 2 || dd.length !== 2) return '';
    if (mmNum < 1 || mmNum > 12) return '';
    if (ddNum < 1 || ddNum > 31) return '';
    if (yyyyNum < 1900 || yyyyNum > 2099) return '';
    return yyyy + '-' + mm.padStart(2, '0') + '-' + dd.padStart(2, '0');
  }

  function sanitizeUsDateDigits(value) {
    var rawDigits = String(value || '').replace(/\D/g, '').slice(0, 8);
    var accepted = '';
    for (var i = 0; i < rawDigits.length; i++) {
      var ch = rawDigits.charAt(i);
      var ok = false;
      if (accepted.length === 0) {
        ok = ch === '0' || ch === '1';
      } else if (accepted.length === 1) {
        var monthTens = accepted.charAt(0);
        if (monthTens === '0') ok = ch >= '1' && ch <= '9';
        else if (monthTens === '1') ok = ch >= '0' && ch <= '2';
      } else if (accepted.length === 2) {
        ok = ch >= '0' && ch <= '3';
      } else if (accepted.length === 3) {
        var dayTens = accepted.charAt(2);
        if (dayTens === '0') ok = ch >= '1' && ch <= '9';
        else if (dayTens === '1' || dayTens === '2') ok = ch >= '0' && ch <= '9';
        else if (dayTens === '3') ok = ch >= '0' && ch <= '1';
      } else if (accepted.length === 4) {
        ok = ch === '1' || ch === '2';
      } else if (accepted.length === 5) {
        var yearThousands = accepted.charAt(4);
        if (yearThousands === '1') ok = ch === '9';
        else if (yearThousands === '2') ok = ch === '0';
      } else if (accepted.length === 6 || accepted.length === 7) {
        ok = ch >= '0' && ch <= '9';
      }
      if (ok) accepted += ch;
    }
    return accepted;
  }

  function formatUsInput(value) {
    var digits = sanitizeUsDateDigits(value);
    if (!digits) return '';
    if (digits.length <= 1) return digits;
    if (digits.length === 2) return digits + ' / ';
    if (digits.length === 3) return digits.slice(0, 2) + ' / ' + digits.slice(2);
    if (digits.length === 4) return digits.slice(0, 2) + ' / ' + digits.slice(2, 4) + ' / ';
    return digits.slice(0, 2) + ' / ' + digits.slice(2, 4) + ' / ' + digits.slice(4);
  }

  function usInputToIso(value) {
    var digits = sanitizeUsDateDigits(value);
    if (digits.length !== 8) return '';
    return partsToIso(digits.slice(0, 2), digits.slice(2, 4), digits.slice(4, 8));
  }

  function renderInputMaskDisplay(inputValue, filledEl, emptyEl) {
    var template = 'MM / DD / YYYY';
    var filled = String(inputValue || '');
    var clamped = filled.length > template.length ? filled.slice(0, template.length) : filled;
    if (filledEl) filledEl.textContent = clamped;
    if (emptyEl) emptyEl.textContent = template.slice(clamped.length);
  }

  function isSameDay(a, b) {
    if (!a || !b) return false;
    return (
      a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate()
    );
  }

  function setScheduleDropdownOpen(open) {
    var wrap = document.getElementById('pp-schedule-wrap');
    var panel = document.getElementById('pp-schedule-dropdown');
    var simpleBtn = document.getElementById('pp-schedule-simple-btn');
    var dateBtn = document.getElementById('pp-schedule-chip-date-btn');
    if (!wrap || !panel) return;
    _schedulePickerState.open = !!open;
    if (simpleBtn) simpleBtn.setAttribute('aria-expanded', _schedulePickerState.open ? 'true' : 'false');
    if (dateBtn) dateBtn.setAttribute('aria-expanded', _schedulePickerState.open ? 'true' : 'false');
    panel.classList.toggle('pointer-events-none', !_schedulePickerState.open);
    panel.classList.toggle('invisible', !_schedulePickerState.open);
    panel.classList.toggle('opacity-0', !_schedulePickerState.open);
    panel.classList.toggle('scale-95', !_schedulePickerState.open);
    panel.classList.toggle('pointer-events-auto', _schedulePickerState.open);
    panel.classList.toggle('opacity-100', _schedulePickerState.open);
    panel.classList.toggle('scale-100', _schedulePickerState.open);
  }

  function applyConfirmedScheduleDate(iso) {
    var parsed = isoStringToDate(iso);
    var simpleBtn = document.getElementById('pp-schedule-simple-btn');
    var segmentedChip = document.getElementById('pp-schedule-segmented-chip');
    var chipText = document.getElementById('pp-schedule-chip-text');
    var clearBtn = document.getElementById('pp-schedule-chip-clear-btn');
    var dateInput = document.getElementById('pp-schedule-date-input');
    var dateMaskFilled = document.getElementById('pp-schedule-date-mask-filled');
    var dateMaskEmpty = document.getElementById('pp-schedule-date-mask-empty');
    if (!simpleBtn || !segmentedChip || !chipText || !dateInput || !dateMaskFilled || !dateMaskEmpty) return;

    _schedulePickerState.selectedDate = parsed ? new Date(parsed.getTime()) : null;
    _schedulePickerState.confirmedDate = parsed ? new Date(parsed.getTime()) : null;
    _schedulePickerState.monthCursor = getMonthStart(parsed || new Date());
    _schedulePickerState.draftInput = parsed ? formatIsoAsUsInput(toIsoDate(parsed)) : '';

    dateInput.value = _schedulePickerState.draftInput;
    renderInputMaskDisplay(_schedulePickerState.draftInput, dateMaskFilled, dateMaskEmpty);
    renderScheduleCalendar();

    if (parsed) {
      simpleBtn.classList.add('hidden');
      simpleBtn.style.display = 'none';
      simpleBtn.setAttribute('aria-hidden', 'true');
      segmentedChip.classList.remove('hidden');
      segmentedChip.classList.add('inline-flex');
      segmentedChip.style.display = '';
      segmentedChip.setAttribute('aria-hidden', 'false');
      chipText.textContent = formatDate(toIsoDate(parsed));
      if (clearBtn) clearBtn.classList.add('hidden');
    } else {
      simpleBtn.classList.remove('hidden');
      simpleBtn.style.display = '';
      simpleBtn.setAttribute('aria-hidden', 'false');
      segmentedChip.classList.remove('inline-flex');
      segmentedChip.classList.add('hidden');
      segmentedChip.style.display = 'none';
      segmentedChip.setAttribute('aria-hidden', 'true');
      chipText.textContent = '--';
      if (clearBtn) clearBtn.classList.remove('hidden');
    }

    setScheduleDropdownOpen(false);
  }

  function getScheduledPaymentDateIso(row) {
    var savedState = getSavedPayPageState(row);
    if (savedState && savedState.paymentDateIso) return String(savedState.paymentDateIso);
    var scheduledFor = String((row && row.scheduledFor) || '').trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(scheduledFor)) return scheduledFor.slice(0, 10);
    if (row && (row.status === 'scheduled' || (row.status === 'in_progress' && String(row.statusType || '').toLowerCase() === 'scheduled')) && row.dueDate) {
      return String(row.dueDate);
    }
    return '';
  }

  function renderScheduleCalendar() {
    var label = document.getElementById('pp-schedule-month-label');
    var grid = document.getElementById('pp-schedule-grid');
    if (!label || !grid) return;

    var monthStart = _schedulePickerState.monthCursor || getMonthStart(new Date());
    _schedulePickerState.monthCursor = getMonthStart(monthStart);
    label.textContent = _schedulePickerState.monthCursor.toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric',
    });

    var startWeekdayMondayFirst = (_schedulePickerState.monthCursor.getDay() + 6) % 7;
    var firstVisibleDate = new Date(_schedulePickerState.monthCursor);
    firstVisibleDate.setDate(firstVisibleDate.getDate() - startWeekdayMondayFirst);

    var today = new Date();
    var html = '';
    for (var i = 0; i < 42; i += 1) {
      var cellDate = new Date(firstVisibleDate);
      cellDate.setDate(firstVisibleDate.getDate() + i);
      var isCurrentMonth = cellDate.getMonth() === _schedulePickerState.monthCursor.getMonth();
      var isToday = isSameDay(cellDate, today);
      var isSelected = _schedulePickerState.selectedDate && isSameDay(cellDate, _schedulePickerState.selectedDate);
      var iso = toIsoDate(cellDate);

      var buttonClasses = [
        'cursor-pointer py-1.5',
        isCurrentMonth ? 'bg-white text-gray-900 hover:bg-gray-100 dark:bg-gray-900 dark:text-gray-100 dark:hover:bg-white/10' : 'bg-gray-50 text-gray-400 hover:bg-gray-100 dark:bg-black/20 dark:text-gray-500 dark:hover:bg-white/10',
      ].join(' ');
      var timeClasses = [
        'mx-auto flex size-7 items-center justify-center rounded-full',
        isSelected ? 'bg-blue-600 font-semibold text-white' : '',
        !isSelected && isToday ? 'font-semibold text-blue-600 dark:text-blue-400' : '',
      ].join(' ').trim();

      html += '' +
        '<button type="button" class="' + buttonClasses + '" data-schedule-date="' + iso + '">' +
          '<time datetime="' + iso + '" class="' + timeClasses + '">' + cellDate.getDate() + '</time>' +
        '</button>';
    }
    grid.innerHTML = html;
  }

  function initScheduleDropdown() {
    // Always start from clean state on page init.
    _schedulePickerState.open = false;
    _schedulePickerState.selectedDate = null;
    _schedulePickerState.confirmedDate = null;
    _schedulePickerState.monthCursor = getMonthStart(new Date());
    _schedulePickerState.draftInput = '';
    if (_schedulePickerState.bound) {
      var existingChipText = document.getElementById('pp-schedule-chip-text');
      var existingSimple = document.getElementById('pp-schedule-simple-btn');
      var existingSegmented = document.getElementById('pp-schedule-segmented-chip');
      if (existingChipText) existingChipText.textContent = '--';
      if (existingSimple) existingSimple.classList.remove('hidden');
      if (existingSegmented) {
        existingSegmented.classList.remove('inline-flex');
        existingSegmented.classList.add('hidden');
      }
      return;
    }
    _schedulePickerState.bound = true;

    var wrap = document.getElementById('pp-schedule-wrap');
    var panel = document.getElementById('pp-schedule-dropdown');
    var simpleBtn = document.getElementById('pp-schedule-simple-btn');
    var segmentedChip = document.getElementById('pp-schedule-segmented-chip');
    var dateBtn = document.getElementById('pp-schedule-chip-date-btn');
    var clearBtn = document.getElementById('pp-schedule-chip-clear-btn');
    var prev = document.getElementById('pp-schedule-prev');
    var next = document.getElementById('pp-schedule-next');
    var grid = document.getElementById('pp-schedule-grid');
    var confirmBtn = document.getElementById('pp-schedule-confirm-btn');
    var chipText = document.getElementById('pp-schedule-chip-text');
    var dateInput = document.getElementById('pp-schedule-date-input');
    var dateMaskFilled = document.getElementById('pp-schedule-date-mask-filled');
    var dateMaskEmpty = document.getElementById('pp-schedule-date-mask-empty');
    if (!wrap || !panel || !simpleBtn || !segmentedChip || !dateBtn || !prev || !next || !grid || !confirmBtn || !chipText || !dateInput || !dateMaskFilled || !dateMaskEmpty) return;

    function getCaretIndexFromDigitsCount(count, formatted) {
      if (!formatted) return 0;
      var map = [0, 1, 5, 6, 10, 11, 12, 13, 14];
      var safeCount = Math.max(0, Math.min(8, count));
      var idx = map[safeCount];
      return Math.max(0, Math.min(idx, formatted.length));
    }

    function renderScheduleDateInput() {
      var iso = _schedulePickerState.selectedDate ? toIsoDate(_schedulePickerState.selectedDate) : '';
      var display = _schedulePickerState.draftInput || formatIsoAsUsInput(iso);
      dateInput.value = display;
      renderInputMaskDisplay(display, dateMaskFilled, dateMaskEmpty);
    }

    function renderScheduleChip() {
      if (_schedulePickerState.confirmedDate) {
        simpleBtn.classList.add('hidden');
        simpleBtn.style.display = 'none';
        simpleBtn.setAttribute('aria-hidden', 'true');
        segmentedChip.classList.remove('hidden');
        segmentedChip.classList.add('inline-flex');
        segmentedChip.style.display = '';
        segmentedChip.setAttribute('aria-hidden', 'false');
        chipText.textContent = formatDate(toIsoDate(_schedulePickerState.confirmedDate));
      } else {
        simpleBtn.classList.remove('hidden');
        simpleBtn.style.display = '';
        simpleBtn.setAttribute('aria-hidden', 'false');
        segmentedChip.classList.remove('inline-flex');
        segmentedChip.classList.add('hidden');
        segmentedChip.style.display = 'none';
        segmentedChip.setAttribute('aria-hidden', 'true');
        chipText.textContent = '--';
      }
    }

    function setScheduleDateFromInput(rawInput) {
      var formatted = formatUsInput(rawInput);
      var iso = usInputToIso(formatted);
      _schedulePickerState.draftInput = formatted;
      if (!formatted) {
        _schedulePickerState.selectedDate = null;
        _schedulePickerState.monthCursor = getMonthStart(new Date());
      } else if (iso) {
        var parsed = isoStringToDate(iso);
        if (parsed) {
          _schedulePickerState.selectedDate = parsed;
          _schedulePickerState.monthCursor = getMonthStart(parsed);
          _schedulePickerState.draftInput = formatIsoAsUsInput(iso);
        }
      }
      return formatted;
    }

    _schedulePickerState.monthCursor = getMonthStart(new Date());
    _schedulePickerState.draftInput = '';
    renderScheduleCalendar();
    renderScheduleDateInput();
    renderScheduleChip();
    setScheduleDropdownOpen(false);

    function onScheduleTriggerClick(event) {
      event.preventDefault();
      event.stopPropagation();
      setScheduleDropdownOpen(!_schedulePickerState.open);
      if (_schedulePickerState.open) {
        if (!_schedulePickerState.selectedDate && _schedulePickerState.confirmedDate) {
          _schedulePickerState.selectedDate = new Date(_schedulePickerState.confirmedDate.getTime());
          _schedulePickerState.draftInput = formatIsoAsUsInput(toIsoDate(_schedulePickerState.selectedDate));
          _schedulePickerState.monthCursor = getMonthStart(_schedulePickerState.selectedDate);
        }
        renderScheduleCalendar();
        renderScheduleDateInput();
      }
    }

    simpleBtn.addEventListener('click', onScheduleTriggerClick);
    dateBtn.addEventListener('click', onScheduleTriggerClick);

    prev.addEventListener('click', function (event) {
      event.preventDefault();
      event.stopPropagation();
      _schedulePickerState.monthCursor = shiftMonths(_schedulePickerState.monthCursor, -1);
      renderScheduleCalendar();
    });

    next.addEventListener('click', function (event) {
      event.preventDefault();
      event.stopPropagation();
      _schedulePickerState.monthCursor = shiftMonths(_schedulePickerState.monthCursor, 1);
      renderScheduleCalendar();
    });

    grid.addEventListener('click', function (event) {
      var target = event.target;
      if (!target) return;
      var btnNode = target.closest('button[data-schedule-date]');
      if (!btnNode) return;
      var iso = btnNode.getAttribute('data-schedule-date');
      if (!iso) return;
      _schedulePickerState.selectedDate = new Date(iso + 'T00:00:00');
      _schedulePickerState.draftInput = formatIsoAsUsInput(iso);
      renderScheduleDateInput();
      renderScheduleCalendar();
    });

    dateInput.addEventListener('click', function (event) {
      event.stopPropagation();
    });
    dateInput.addEventListener('focus', function () {
      if (!String(dateInput.value || '').trim()) {
        _schedulePickerState.monthCursor = getMonthStart(new Date());
        renderScheduleCalendar();
      }
    });

    dateInput.addEventListener('keydown', function (event) {
      if (event.key !== 'Backspace') return;
      var start = typeof dateInput.selectionStart === 'number' ? dateInput.selectionStart : 0;
      var end = typeof dateInput.selectionEnd === 'number' ? dateInput.selectionEnd : 0;
      if (start !== end || start <= 0) return;
      var value = String(dateInput.value || '');
      var prevChar = value.charAt(start - 1);
      if (prevChar !== ' ' && prevChar !== '/') return;
      var removeIdx = -1;
      for (var i = start - 1; i >= 0; i -= 1) {
        if (/\d/.test(value.charAt(i))) {
          removeIdx = i;
          break;
        }
      }
      if (removeIdx < 0) return;
      event.preventDefault();
      dateInput.value = value.slice(0, removeIdx) + value.slice(removeIdx + 1);
      try {
        dateInput.setSelectionRange(removeIdx, removeIdx);
      } catch (err) {
        // Ignore selection errors on unsupported input states.
      }
      dateInput.dispatchEvent(new Event('input', { bubbles: true }));
    });

    dateInput.addEventListener('input', function () {
      var selectionStart = typeof dateInput.selectionStart === 'number' ? dateInput.selectionStart : dateInput.value.length;
      var digitsBeforeCaret = String(dateInput.value || '').slice(0, selectionStart).replace(/\D/g, '').length;
      var formatted = setScheduleDateFromInput(dateInput.value);
      dateInput.value = formatted;
      renderInputMaskDisplay(formatted, dateMaskFilled, dateMaskEmpty);
      renderScheduleCalendar();
      var nextCaret = getCaretIndexFromDigitsCount(digitsBeforeCaret, formatted);
      try {
        dateInput.setSelectionRange(nextCaret, nextCaret);
      } catch (err) {
        // Ignore selection errors on unsupported input states.
      }
    });

    confirmBtn.addEventListener('click', function (event) {
      event.preventDefault();
      event.stopPropagation();
      if (!_schedulePickerState.selectedDate) {
        _schedulePickerState.selectedDate = new Date();
      }
      _schedulePickerState.confirmedDate = new Date(_schedulePickerState.selectedDate.getTime());
      _schedulePickerState.monthCursor = getMonthStart(_schedulePickerState.selectedDate);
      _schedulePickerState.draftInput = formatIsoAsUsInput(toIsoDate(_schedulePickerState.selectedDate));
      renderScheduleDateInput();
      renderScheduleCalendar();
      renderScheduleChip();
      setScheduleDropdownOpen(false);
    });

    if (clearBtn) {
      clearBtn.addEventListener('click', function (event) {
        event.preventDefault();
        event.stopPropagation();
        _schedulePickerState.selectedDate = null;
        _schedulePickerState.confirmedDate = null;
        _schedulePickerState.draftInput = '';
        _schedulePickerState.monthCursor = getMonthStart(new Date());
        renderScheduleDateInput();
        renderScheduleCalendar();
        renderScheduleChip();
        setScheduleDropdownOpen(false);
      });
    }

    panel.addEventListener('click', function (event) {
      event.stopPropagation();
    });

    document.addEventListener('click', function (event) {
      if (!_schedulePickerState.open) return;
      if (!wrap.contains(event.target)) {
        setScheduleDropdownOpen(false);
      }
    });

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && _schedulePickerState.open) {
        setScheduleDropdownOpen(false);
      }
    });
  }

  function setPayStepBadgeById(badgeId, displayNumber, isComplete) {
    var badge = document.getElementById(badgeId);
    if (!badge) return;
    if (isComplete) {
      badge.className = STEP_BADGE_COMPLETE_CLASS;
      badge.innerHTML = STEP_BADGE_CHECK_ICON;
      badge.setAttribute('aria-label', 'Step ' + displayNumber + ' complete');
    } else {
      badge.className = STEP_BADGE_NUMBER_CLASS;
      badge.textContent = String(displayNumber);
      badge.setAttribute('aria-label', 'Step ' + displayNumber);
    }
  }

  function getSelectedOptionValueFromOptions(optionsEl) {
    if (!optionsEl) return '';
    var selected = optionsEl.querySelector('el-option[aria-selected="true"]');
    return selected ? String(selected.getAttribute('value') || '') : '';
  }

  function getSelectedOptionValueByOptionsId(optionsId) {
    var optionsEl = document.getElementById(optionsId);
    return getSelectedOptionValueFromOptions(optionsEl);
  }

  function buildSelectFilledContent(item) {
    if (!item || !item.label) return '';
    var iconSvg = item.selectedIcon || item.icon || '';
    if (!iconSvg) {
      return '<span class="truncate font-medium">' + escapeHtml(item.label) + '</span>';
    }
    return '' +
      '<span class="inline-flex min-w-0 items-center gap-2">' +
      '  <span class="shrink-0 text-gray-500 dark:text-gray-400">' + iconSvg + '</span>' +
      '  <span class="truncate font-medium">' + escapeHtml(item.label) + '</span>' +
      '</span>';
  }

  function updatePayStepStates() {
    var step1Done = !!_origDetailsState.account;
    var selectedMethod = getSelectedOptionValueByOptionsId('pp-pay-method-options');
    var step2Done = false;
    if (selectedMethod === 'card' && isConfirmedPayableRow(_payContext.row)) {
      step2Done = true;
    } else
    if (selectedMethod === 'ach' || selectedMethod === 'wire') {
      step2Done = !!getSelectedOptionValueByOptionsId('gp-bank-account-select');
    } else if (selectedMethod === 'card') {
      var sourceChosen = !!String(_cardFundingState.cardSource || '');
      var selectedCard = !!getActiveCard();
      var fundingMethod = !!String(_cardFundingState.fundingMethod || '');
      var sendingMethod = !!String(_cardFundingState.sendingMethod || '');
      var deliveryWrap = document.getElementById('pp-card-delivery-contact-combobox');
      var deliveryInput = document.getElementById('pp-card-delivery-contact-input');
      var deliveryTokenCount = deliveryWrap ? Number(deliveryWrap.getAttribute('data-token-count') || '0') : 0;
      var deliveryReady = _cardFundingState.sendingMethod === 'delivery_website'
        ? (deliveryTokenCount > 0 || !!(deliveryInput && String(deliveryInput.value || '').trim()))
        : true;
      var fundingValid = _cardFundingState.fundingMethod === 'spend_balance'
        ? true
        : parseMoneyInput(_cardFundingState.fundingAmount) > 0;
      var projectedValid = selectedCard ? getCardAvailableBalanceForPayment(getActiveCard()) >= getCurrentPayableAmountNumber() : false;
      step2Done = sourceChosen && selectedCard && fundingMethod && sendingMethod && deliveryReady && fundingValid && projectedValid;
    } else if (selectedMethod === 'check') {
      step2Done = !!getSelectedOptionValueByOptionsId('gp-check-address-select');
    } else if (selectedMethod === 'smart_disburse') {
      var sdWrap = document.getElementById('pp-smart-disburse-contact-combobox');
      var sdInput = document.getElementById('pp-smart-disburse-contact-input');
      var tokenCount = sdWrap ? Number(sdWrap.getAttribute('data-token-count') || '0') : 0;
      step2Done = tokenCount > 0 || !!(sdInput && String(sdInput.value || '').trim());
    } else if (selectedMethod === 'smart_exchange') {
      var sxWrap = document.getElementById('pp-smart-exchange-contact-combobox');
      var sxInput = document.getElementById('pp-smart-exchange-contact-input');
      var sxTokenCount = sxWrap ? Number(sxWrap.getAttribute('data-token-count') || '0') : 0;
      step2Done = sxTokenCount > 0 || !!(sxInput && String(sxInput.value || '').trim());
    }

    // Visual order on Pay page:
    // 1 = Origination Account (gp-step-1-badge)
    // 2 = Payment Method + details (gp-step-2-badge)
    setPayStepBadgeById('gp-step-1-badge', 1, step1Done);
    setPayStepBadgeById('gp-step-2-badge', 2, step2Done);

    var canSubmit = step1Done && step2Done;
    var payBtn = document.getElementById('gp-submit-btn');
    var scheduleBtn = document.getElementById('pp-schedule-simple-btn') || document.getElementById('pp-schedule-chip-date-btn');
    if (payBtn) payBtn.disabled = !canSubmit;
    if (scheduleBtn) scheduleBtn.disabled = false;
    updateSmartTestEmailUi('smart_disburse');
    updateSmartTestEmailUi('smart_exchange');

    if (isConfirmedPayableRow(_payContext.row)) {
      applyConfirmedPayPageReadOnlyState(_payContext.row);
    }
  }

  function getCurrentCardPaymentSelection() {
    var card = getActiveCard();
    var fundingMethod = String(_cardFundingState.fundingMethod || '');
    if (!card || !fundingMethod) return null;
    if (fundingMethod !== 'spend_balance' && parseMoneyInput(_cardFundingState.fundingAmount) <= 0) return null;
    if (getCardAvailableBalanceForPayment(card) < getCurrentPayableAmountNumber()) return null;
    var origin = _origDetailsState && _origDetailsState.account ? _origDetailsState.account : null;
    var fundingLabels = {
      match_payment: 'Match Payment',
      add_funds: 'Add Funds',
      spend_balance: 'Spend Balance'
    };
    var sendingLabels = {
      on_file: 'Card on file with vendor',
      delivery_website: 'Delivery Website'
    };
    var deliveryTokens = getSelectedDestinationTokens('pp-card-delivery-contact-tokens', 'pp-card-delivery-contact-input');
    var deliveryBadgeTexts = getSmartBadgeTexts(deliveryTokens);
    var formattedProjectedBalance = formatMoney(getCardProjectedBalance(card), card.currency || 'USD');
    var formattedFundingAmount = formatMoney(fundingMethod === 'spend_balance' ? 0 : parseMoneyInput(_cardFundingState.fundingAmount), card.currency || 'USD');
    return {
      methodId: 'card',
      methodLabel: 'Pay with a Card',
      amount: formatMoney(_payContext.row && _payContext.row.amount, (_payContext.row && _payContext.row.currency) || 'USD'),
      payeeName: String((_payContext.row && _payContext.row.payeeName) || 'Payee').trim(),
      paymentDateIso: getEffectivePaymentDateIso(),
      originName: origin ? String(origin.displayName || origin.name || origin.bankName || 'Origination account').trim() : 'Origination account',
      originSub: origin ? ('••••' + getAccountLast4(origin)) : '--',
      recipientName: String(_cardFundingState.cardSource || '') === 'new' ? String(card.cardName || 'Virtual Card').trim() + ' •••• ••••' : getCardDisplayLabel(card),
      recipientSub: String(_cardFundingState.cardSource || '') === 'new' ? 'New card will be created after confirmation' : ('Expires ' + String(card.expDate || '').trim()),
      confirmTitle: String(_cardFundingState.cardSource || '') === 'new'
        ? ('Create and fund new card with ' + formatMoney(_payContext.row && _payContext.row.amount, (_payContext.row && _payContext.row.currency) || 'USD'))
        : ('Confirm ' + formatMoney(_payContext.row && _payContext.row.amount, (_payContext.row && _payContext.row.currency) || 'USD') + ' payment'),
      cardId: card.id,
      cardName: card.cardName,
      cardBrand: card.brand,
      cardLast4: card.last4,
      cardExpDate: card.expDate,
      cardSource: String(_cardFundingState.cardSource || ''),
      fundingMethod: fundingMethod,
      fundingMethodLabel: fundingLabels[fundingMethod] || 'Funding',
      fundingAmount: fundingMethod === 'spend_balance' ? 0 : parseMoneyInput(_cardFundingState.fundingAmount),
      fundingAmountText: formattedFundingAmount,
      isSpendBalance: fundingMethod === 'spend_balance',
      sendingMethod: String(_cardFundingState.sendingMethod || 'on_file'),
      sendingMethodLabel: sendingLabels[String(_cardFundingState.sendingMethod || 'on_file')] || 'Card on file with vendor',
      deliveryTokens: deliveryTokens,
      cardDeliveryBadgeTexts: deliveryBadgeTexts,
      projectedBalance: getCardProjectedBalance(card),
      projectedBalanceText: formattedProjectedBalance,
      availableBalance: getCardAvailableBalanceForPayment(card)
    };
  }

  function getResolvedPayablesCardSelection() {
    if (!_payContext.row || inferRowMethodType(_payContext.row) !== 'card') return null;
    var liveSelection = getCurrentCardPaymentSelection();
    if (liveSelection) return liveSelection;

    var savedState = getSavedPayPageState(_payContext.row) || {};
    var card = getActiveCard() || resolveStoredCardForRow(_payContext.row, savedState.cardId || _cardFundingState.selectedCardId);
    if (!card) return null;

    var currency = String((_payContext.row && _payContext.row.currency) || card.currency || 'USD');
    var fundingMethod = String(savedState.cardFundingMethod || _cardFundingState.fundingMethod || 'add_funds');
    var rawFundingAmount = fundingMethod === 'spend_balance'
      ? 0
      : parseMoneyInput(savedState.cardFundingAmount || _cardFundingState.fundingAmount || formatMoneyInputValue(Number((_payContext.row && _payContext.row.amount) || 0)));
    var projectedBalance = Number((card && card.currentBalance) || 0);

    return {
      methodId: 'card',
      methodLabel: 'Pay with a Card',
      amount: formatMoney(_payContext.row && _payContext.row.amount, currency),
      payeeName: String((_payContext.row && _payContext.row.payeeName) || '').trim(),
      paymentDateIso: String(savedState.paymentDateIso || (_payContext.row && (_payContext.row.adDate || _payContext.row.dueDate)) || ''),
      originName: _origDetailsState && _origDetailsState.account
        ? String(_origDetailsState.account.displayName || _origDetailsState.account.name || _origDetailsState.account.bankName || 'Origination account').trim()
        : 'Origination account',
      originSub: _origDetailsState && _origDetailsState.account ? ('••••' + getAccountLast4(_origDetailsState.account)) : '--',
      recipientName: getCardDisplayLabel(card),
      recipientSub: 'Expires ' + String(card.expDate || '').trim(),
      confirmTitle: 'Confirm ' + formatMoney(_payContext.row && _payContext.row.amount, currency) + ' payment',
      cardId: String(card.id || ''),
      cardName: String(card.cardName || 'Virtual Card').trim(),
      cardBrand: String(card.brand || getRowCardBrand(_payContext.row) || 'visa').toLowerCase(),
      cardLast4: String(card.last4 || getRowCardLast4(_payContext.row) || ''),
      cardExpDate: String(card.expDate || '').trim(),
      cardSource: 'existing',
      fundingMethod: fundingMethod,
      fundingMethodLabel: fundingMethod === 'spend_balance' ? 'Spend Balance' : 'Add Funds',
      fundingAmount: rawFundingAmount,
      fundingAmountText: formatMoney(rawFundingAmount, currency),
      isSpendBalance: fundingMethod === 'spend_balance',
      sendingMethod: String(savedState.cardSendingMethod || _cardFundingState.sendingMethod || 'on_file'),
      sendingMethodLabel: String(savedState.cardSendingMethod || _cardFundingState.sendingMethod || 'on_file') === 'delivery_website'
        ? 'Delivery Website'
        : 'Card on file with vendor',
      deliveryTokens: Array.isArray(savedState.cardDeliveryTokens) ? savedState.cardDeliveryTokens : [],
      cardDeliveryBadgeTexts: getSmartBadgeTexts(Array.isArray(savedState.cardDeliveryTokens) ? savedState.cardDeliveryTokens : []),
      projectedBalance: projectedBalance,
      projectedBalanceText: formatMoney(projectedBalance, currency),
      availableBalance: projectedBalance
    };
  }

  function setPaySelectDisabled(selectEl, disabled) {
    if (!selectEl) return;
    var button = selectEl.querySelector('button, [data-select-control]');
    var selectedContent = selectEl.querySelector('el-selectedcontent');
    if (button) {
      button.classList.toggle('pointer-events-none', disabled);
      button.classList.toggle('cursor-not-allowed', disabled);
      button.classList.toggle('bg-white', !disabled);
      button.classList.toggle('dark:bg-white/5', !disabled);
      button.classList.toggle('bg-gray-50', disabled);
      button.classList.toggle('text-gray-900', !disabled);
      button.classList.toggle('text-gray-500', disabled);
      button.classList.toggle('outline-gray-300', !disabled);
      button.classList.toggle('outline-gray-200', disabled);
      button.classList.toggle('dark:text-white', !disabled);
      button.classList.toggle('dark:text-gray-400', disabled);
    }
    if (selectedContent) {
      selectedContent.classList.toggle('text-gray-900', !disabled);
      selectedContent.classList.toggle('text-gray-500', disabled);
      selectedContent.classList.toggle('dark:text-white', !disabled);
      selectedContent.classList.toggle('dark:text-gray-400', disabled);
    }
    selectEl.setAttribute('aria-disabled', disabled ? 'true' : 'false');
  }

  function applyConfirmedPayPageReadOnlyState(row) {
    var isConfirmed = isConfirmedPayableRow(row);
    var isScheduled = isScheduledPayableRow(row);
    var originationSelect = document.getElementById('pp-orig-bank-select');
    var methodSelect = document.getElementById('pp-pay-method-select');
    var bankRecipientSelect = document.getElementById('gp-bank-account-select');
    var cardSelect = document.getElementById('pp-pay-card-select');
    var cardSearchInput = document.getElementById('pp-pay-card-search-input');
    var cardFundingAmount = document.getElementById('pp-card-funding-amount');
    var bankEditBtn = document.getElementById('gp-edit-bank-btn');
    var checkEditBtn = document.getElementById('gp-edit-check-btn');
    var submitBtn = document.getElementById('gp-submit-btn');
    var headerCancelBtn = document.getElementById('pp-header-cancel-btn');
    var scheduleWrap = document.getElementById('pp-schedule-wrap');
    var simpleScheduleBtn = document.getElementById('pp-schedule-simple-btn');
    var segmentedChip = document.getElementById('pp-schedule-segmented-chip');
    var chipDateBtn = document.getElementById('pp-schedule-chip-date-btn');
    var chipClearBtn = document.getElementById('pp-schedule-chip-clear-btn');
    var chipText = document.getElementById('pp-schedule-chip-text');
    var cardSectionTitle = document.getElementById('pp-card-section-title');
    var cardSectionDescription = document.getElementById('pp-card-section-description');
    var cardSourceRadios = document.getElementById('pp-card-source-radios');
    var hasScheduledDate = !!getScheduledPaymentDateIso(row);
    var isConfirmedCard = isConfirmed && getSelectedOptionValueByOptionsId('pp-pay-method-options') === 'card';

    setPaySelectDisabled(originationSelect, isConfirmed);
    setPaySelectDisabled(methodSelect, isConfirmed);
    setPaySelectDisabled(bankRecipientSelect, isConfirmed);
    setPaySelectDisabled(cardSelect, isConfirmed);
    if (cardSearchInput) cardSearchInput.disabled = !!isConfirmed;
    if (cardFundingAmount) {
      cardFundingAmount.disabled = !!isConfirmed || String(_cardFundingState.fundingMethod || '') === 'spend_balance';
      cardFundingAmount.classList.toggle('cursor-not-allowed', !!isConfirmed || String(_cardFundingState.fundingMethod || '') === 'spend_balance');
      cardFundingAmount.classList.toggle('bg-gray-50', !!isConfirmed || String(_cardFundingState.fundingMethod || '') === 'spend_balance');
      cardFundingAmount.classList.toggle('text-gray-500', !!isConfirmed || String(_cardFundingState.fundingMethod || '') === 'spend_balance');
      cardFundingAmount.classList.toggle('outline-gray-200', !!isConfirmed || String(_cardFundingState.fundingMethod || '') === 'spend_balance');
    }
    document.querySelectorAll('input[name="pp-card-sending-method"]').forEach(function (input) {
      input.disabled = !!isConfirmed;
      input.classList.toggle('cursor-not-allowed', !!isConfirmed);
    });
    document.querySelectorAll('input[name="pp-card-source"]').forEach(function (input) {
      input.disabled = !!isConfirmed;
      input.classList.toggle('cursor-not-allowed', !!isConfirmed);
    });
    document.querySelectorAll('input[name="pp-card-funding-method"]').forEach(function (input) {
      var shouldDisable = !!isConfirmed || input.getAttribute('data-base-disabled') === 'true';
      input.disabled = shouldDisable;
      input.classList.toggle('cursor-not-allowed', shouldDisable);
    });
    if (bankEditBtn) {
      bankEditBtn.classList.toggle('hidden', isConfirmed);
      bankEditBtn.style.display = isConfirmed ? 'none' : '';
    }
    if (checkEditBtn) {
      checkEditBtn.classList.toggle('hidden', isConfirmed);
      checkEditBtn.style.display = isConfirmed ? 'none' : '';
    }

    if (submitBtn) submitBtn.classList.toggle('hidden', isConfirmed);
    if (headerCancelBtn) headerCancelBtn.classList.toggle('hidden', !isScheduled);

    if (scheduleWrap) {
      if (isConfirmed && !hasScheduledDate) {
        scheduleWrap.classList.add('hidden');
      } else {
        scheduleWrap.classList.remove('hidden');
      }
    }

    if (simpleScheduleBtn) {
      simpleScheduleBtn.disabled = !!isConfirmed;
      if (isConfirmed) {
        simpleScheduleBtn.classList.add('hidden');
        simpleScheduleBtn.style.display = 'none';
        simpleScheduleBtn.setAttribute('aria-hidden', 'true');
      }
    }

    if (segmentedChip) {
      if (isConfirmed && !hasScheduledDate) {
        segmentedChip.classList.remove('inline-flex');
        segmentedChip.classList.add('hidden');
        segmentedChip.style.display = 'none';
        segmentedChip.setAttribute('aria-hidden', 'true');
      }
    }

    if (chipDateBtn) {
      chipDateBtn.disabled = !!isConfirmed;
      chipDateBtn.classList.toggle('pointer-events-none', isConfirmed);
      chipDateBtn.classList.toggle('cursor-not-allowed', isConfirmed);
      chipDateBtn.classList.toggle('text-blue-600', !isConfirmed);
      chipDateBtn.classList.toggle('dark:text-blue-400', !isConfirmed);
      chipDateBtn.classList.toggle('text-gray-700', isConfirmed);
      chipDateBtn.classList.toggle('dark:text-gray-300', isConfirmed);
    }
    if (chipText) {
      chipText.classList.toggle('text-blue-600', !isConfirmed);
      chipText.classList.toggle('dark:text-blue-400', !isConfirmed);
      chipText.classList.toggle('text-gray-700', isConfirmed);
      chipText.classList.toggle('dark:text-gray-300', isConfirmed);
    }
    if (chipClearBtn) {
      chipClearBtn.disabled = !!isConfirmed;
      chipClearBtn.classList.toggle('pointer-events-none', isConfirmed);
      chipClearBtn.classList.toggle('cursor-not-allowed', isConfirmed);
      chipClearBtn.classList.toggle('hidden', isConfirmed);
    }
    if (cardSectionTitle) cardSectionTitle.textContent = isConfirmedCard ? 'My Cards' : 'Select a card to pay with';
    if (cardSectionDescription) {
      cardSectionDescription.textContent = isConfirmedCard
        ? 'This payment was completed with the card below.'
        : 'Choose whether to use an existing virtual card or create a new one for this payment.';
    }
    if (cardSourceRadios) cardSourceRadios.classList.toggle('hidden', isConfirmedCard);
    syncPaidCardRevealSection();
  }

  function movePayableBackToReady(row) {
    if (!row || row.id == null) return null;
    var updated = cloneJson(row) || {};
    updated.status = 'ready_to_pay';
    updated.statusType = '';
    updated.statusLabel = 'Unprocessed';
    updated.processingStep = '';
    updated.scheduledFor = '';
    updated.adDate = '';
    updated.details = Object.assign({}, updated.details || {});
    delete updated.details.payPageState;
    updated.details.activityLog = [];
    persistPayableOverride(updated);
    return updated;
  }

  function getPaymentMethodLabel(methodId) {
    var labels = {
      ach: 'Send to a Bank Account',
      wire: 'Wire',
      card: 'Pay with a Card',
      check: 'Check',
      smart_disburse: 'SMART Disburse',
      smart_exchange: 'SMART Exchange',
    };
    return labels[String(methodId || '')] || 'Payment Method';
  }

  function ensureMethodItemPresent(methodItems, methodId) {
    var id = String(methodId || '').trim().toLowerCase();
    if (!id) return methodItems;
    var items = Array.isArray(methodItems) ? methodItems.slice() : [];
    for (var i = 0; i < items.length; i += 1) {
      if (String(items[i] && items[i].id || '') === id) return items;
    }

    var fallbackMap = {
      smart_disburse: {
        id: 'smart_disburse',
        label: 'SMART Disburse',
        subtitle: 'Send a disbursement choice to payee',
        icon: '<svg width="20" height="20" viewBox="0 0 30 30" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M0 15C0 8.42504 0 5.13755 1.81592 2.92485C2.14835 2.51978 2.51978 2.14835 2.92485 1.81592C5.13755 0 8.42504 0 15 0C21.575 0 24.8624 0 27.0751 1.81592C27.4802 2.14835 27.8516 2.51978 28.1841 2.92485C30 5.13755 30 8.42504 30 15C30 21.575 30 24.8624 28.1841 27.0751C27.8516 27.4802 27.4802 27.8516 27.0751 28.1841C24.8624 30 21.575 30 15 30C8.42504 30 5.13755 30 2.92485 28.1841C2.51978 27.8516 2.14835 27.4802 1.81592 27.0751C0 24.8624 0 21.575 0 15Z" fill="#406AFF"/><g clip-path="url(#clip0_1_52615)"><path fill-rule="evenodd" clip-rule="evenodd" d="M17.1957 12.1938C17.3572 11.7655 17.7672 11.4819 18.225 11.4819L25.0389 11.4819L25.0389 14.0119L19.2141 14.0119L15.3171 24.3468L8.87305 24.3468V21.8168L13.5672 21.8168L17.1957 12.1938Z" fill="white"/><path d="M24.7528 10.5068L30.6071 10.5068L27.4891 18.7759H21.6348L24.7528 10.5068Z" fill="#406AFF"/><path d="M11.2713 18.3096L14.9017 18.3096L11.8374 26.4361H8.20703L8.58516 21.7889L10.0421 21.7445L11.2713 18.3096Z" fill="#406AFF"/><path fill-rule="evenodd" clip-rule="evenodd" d="M12.7711 17.8057C12.6096 18.234 12.1996 18.5176 11.7418 18.5176L4.92787 18.5176L4.92787 15.9876L10.7527 15.9876L14.6497 5.65271L21.0938 5.65271L21.0938 8.18271L16.3996 8.18271L12.7711 17.8057Z" fill="white"/><path d="M5.21403 19.4927L-0.640302 19.4927L2.47769 11.2236L8.33203 11.2236L5.21403 19.4927Z" fill="#406AFF"/><path d="M18.7942 10.832L15.0651 11.6899L18.1293 3.5634L21.7598 3.5634L21.4343 8.25497L19.9247 8.25497L18.7942 10.832Z" fill="#406AFF"/></g><defs><clipPath id="clip0_1_52615"><rect width="22" height="22" fill="white" transform="translate(4 4)"/></clipPath></defs></svg>',
        selectedIcon: '<svg width="20" height="20" viewBox="0 0 30 30" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M0 15C0 8.42504 0 5.13755 1.81592 2.92485C2.14835 2.51978 2.51978 2.14835 2.92485 1.81592C5.13755 0 8.42504 0 15 0C21.575 0 24.8624 0 27.0751 1.81592C27.4802 2.14835 27.8516 2.51978 28.1841 2.92485C30 5.13755 30 8.42504 30 15C30 21.575 30 24.8624 28.1841 27.0751C27.8516 27.4802 27.4802 27.8516 27.0751 28.1841C24.8624 30 21.575 30 15 30C8.42504 30 5.13755 30 2.92485 28.1841C2.51978 27.8516 2.14835 27.4802 1.81592 27.0751C0 24.8624 0 21.575 0 15Z" fill="#374151"/><g clip-path="url(#clip0_1_52615)"><path fill-rule="evenodd" clip-rule="evenodd" d="M17.1957 12.1938C17.3572 11.7655 17.7672 11.4819 18.225 11.4819L25.0389 11.4819L25.0389 14.0119L19.2141 14.0119L15.3171 24.3468L8.87305 24.3468V21.8168L13.5672 21.8168L17.1957 12.1938Z" fill="white"/><path d="M24.7528 10.5068L30.6071 10.5068L27.4891 18.7759H21.6348L24.7528 10.5068Z" fill="#374151"/><path d="M11.2713 18.3096L14.9017 18.3096L11.8374 26.4361H8.20703L8.58516 21.7889L10.0421 21.7445L11.2713 18.3096Z" fill="#374151"/><path fill-rule="evenodd" clip-rule="evenodd" d="M12.7711 17.8057C12.6096 18.234 12.1996 18.5176 11.7418 18.5176L4.92787 18.5176L4.92787 15.9876L10.7527 15.9876L14.6497 5.65271L21.0938 5.65271L21.0938 8.18271L16.3996 8.18271L12.7711 17.8057Z" fill="white"/><path d="M5.21403 19.4927L-0.640302 19.4927L2.47769 11.2236L8.33203 11.2236L5.21403 19.4927Z" fill="#374151"/><path d="M18.7942 10.832L15.0651 11.6899L18.1293 3.5634L21.7598 3.5634L21.4343 8.25497L19.9247 8.25497L18.7942 10.832Z" fill="#374151"/></g><defs><clipPath id="clip0_1_52615"><rect width="22" height="22" fill="white" transform="translate(4 4)"/></clipPath></defs></svg>'
      },
      smart_exchange: {
        id: 'smart_exchange',
        label: 'SMART Exchange',
        subtitle: 'Pay inside SMART Exchange',
        icon: '<svg width="20" height="20" viewBox="0 0 30 30" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M0 15C0 8.42504 0 5.13755 1.81592 2.92485C2.14835 2.51978 2.51978 2.14835 2.92485 1.81592C5.13755 0 8.42504 0 15 0C21.575 0 24.8624 0 27.0751 1.81592C27.4802 2.14835 27.8516 2.51978 28.1841 2.92485C30 5.13755 30 8.42504 30 15C30 21.575 30 24.8624 28.1841 27.0751C27.8516 27.4802 27.4802 27.8516 27.0751 28.1841C24.8624 30 21.575 30 15 30C8.42504 30 5.13755 30 2.92485 28.1841C2.51978 27.8516 2.14835 27.4802 1.81592 27.0751C0 24.8624 0 21.575 0 15Z" fill="#F5B842"/><g clip-path="url(#clip0_1_52857)"><path fill-rule="evenodd" clip-rule="evenodd" d="M10.9763 14.5594L4.7793 14.5594L4.7793 17.0894L13.839 17.0894C14.2234 17.0894 14.4893 16.705 14.3536 16.3453L9.71431 4.04161L7.34701 4.93424L10.9763 14.5594Z" fill="white"/><rect width="10.7121" height="4.21913" transform="matrix(-1 0 0 1 17.5586 1.46387)" fill="#F5B842"/><path d="M4.67241 12.4575H2.14395L4.8856 19.7285H7.41406L4.67241 12.4575Z" fill="#F5B842"/><path fill-rule="evenodd" clip-rule="evenodd" d="M19.0237 15.4387L25.2207 15.4387L25.2207 12.9087L16.161 12.9087C15.7766 12.9087 15.5107 13.293 15.6464 13.6527L20.2857 25.9564L22.653 25.0638L19.0237 15.4387Z" fill="white"/><rect width="10.7121" height="4.21913" transform="matrix(1 1.74846e-07 1.74846e-07 -1 12.4414 28.5342)" fill="#F5B842"/><path d="M25.3276 17.5405L27.8561 17.5405L25.1144 10.2695L22.5859 10.2695L25.3276 17.5405Z" fill="#F5B842"/></g><defs><clipPath id="clip0_1_52857"><rect width="22" height="22" fill="white" transform="translate(4 3.99902)"/></clipPath></defs></svg>',
        selectedIcon: '<svg width="20" height="20" viewBox="0 0 30 30" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M0 15C0 8.42504 0 5.13755 1.81592 2.92485C2.14835 2.51978 2.51978 2.14835 2.92485 1.81592C5.13755 0 8.42504 0 15 0C21.575 0 24.8624 0 27.0751 1.81592C27.4802 2.14835 27.8516 2.51978 28.1841 2.92485C30 5.13755 30 8.42504 30 15C30 21.575 30 24.8624 28.1841 27.0751C27.8516 27.4802 27.4802 27.8516 27.0751 28.1841C24.8624 30 21.575 30 15 30C8.42504 30 5.13755 30 2.92485 28.1841C2.51978 27.8516 2.14835 27.4802 1.81592 27.0751C0 24.8624 0 21.575 0 15Z" fill="#374151"/><g clip-path="url(#clip0_1_52857)"><path fill-rule="evenodd" clip-rule="evenodd" d="M10.9763 14.5594L4.7793 14.5594L4.7793 17.0894L13.839 17.0894C14.2234 17.0894 14.4893 16.705 14.3536 16.3453L9.71431 4.04161L7.34701 4.93424L10.9763 14.5594Z" fill="white"/><rect width="10.7121" height="4.21913" transform="matrix(-1 0 0 1 17.5586 1.46387)" fill="#374151"/><path d="M4.67241 12.4575H2.14395L4.8856 19.7285H7.41406L4.67241 12.4575Z" fill="#374151"/><path fill-rule="evenodd" clip-rule="evenodd" d="M19.0237 15.4387L25.2207 15.4387L25.2207 12.9087L16.161 12.9087C15.7766 12.9087 15.5107 13.293 15.6464 13.6527L20.2857 25.9564L22.653 25.0638L19.0237 15.4387Z" fill="white"/><rect width="10.7121" height="4.21913" transform="matrix(1 1.74846e-07 1.74846e-07 -1 12.4414 28.5342)" fill="#374151"/><path d="M25.3276 17.5405L27.8561 17.5405L25.1144 10.2695L22.5859 10.2695L25.3276 17.5405Z" fill="#374151"/></g><defs><clipPath id="clip0_1_52857"><rect width="22" height="22" fill="white" transform="translate(4 3.99902)"/></clipPath></defs></svg>'
      }
    };

    if (fallbackMap[id]) items.unshift(fallbackMap[id]);
    return items;
  }

  function getEffectivePaymentDateIso() {
    if (_schedulePickerState && _schedulePickerState.confirmedDate) {
      return toIsoDate(_schedulePickerState.confirmedDate);
    }
    return toIsoDate(new Date());
  }

  function openDialogById(id) {
    var dialog = document.getElementById(id);
    if (!dialog || typeof dialog.showModal !== 'function') return false;
    if (!dialog.open) dialog.showModal();
    return true;
  }

  function closeDialogById(id) {
    var dialog = document.getElementById(id);
    if (!dialog || typeof dialog.close !== 'function') return;
    if (dialog.open) dialog.close();
  }

  function getCurrentBankRecipientDetails() {
    var methodId = getSelectedOptionValueByOptionsId('pp-pay-method-options');
    if (methodId !== 'ach' && methodId !== 'wire') return null;
    if (!getSelectedOptionValueByOptionsId('gp-bank-account-select')) return null;
    var bankSelected = document.querySelector('#gp-bank-account-select el-selectedcontent');
    var origin = _origDetailsState && _origDetailsState.account ? _origDetailsState.account : null;
    var originName = origin ? String(origin.displayName || origin.name || origin.bankName || 'My account').trim() : 'My account';
    var originSub = origin ? ('••••' + getAccountLast4(origin)) : '--';
    var recipientName = String((document.getElementById('gp-pmc-bank-name-val') || {}).textContent || '').trim() || '--';
    var recipientAccount = String((document.getElementById('gp-pmc-bank-acct') || {}).textContent || '').trim() || '--';
    var recipientRouting = String((document.getElementById('gp-pmc-bank-routing') || {}).textContent || '').trim() || '--';
    var recipientAddress = String((document.getElementById('gp-pmc-bank-address') || {}).textContent || '').trim() || '--';

    return {
      methodId: methodId,
      methodLabel: getPaymentMethodLabel(methodId),
      amount: formatMoney(_payContext.row && _payContext.row.amount, (_payContext.row && _payContext.row.currency) || 'USD'),
      payeeName: String((_payContext.row && _payContext.row.payeeName) || recipientName || 'Payee').trim(),
      paymentDateIso: getEffectivePaymentDateIso(),
      originName: originName,
      originSub: originSub,
      recipientName: recipientName,
      recipientAccount: recipientAccount,
      recipientRouting: recipientRouting,
      recipientAddress: recipientAddress,
      recipientBankLabel: bankSelected ? String(bankSelected.textContent || '').trim() : '--',
    };
  }

  function getCurrentCheckRecipientDetails() {
    var methodId = getSelectedOptionValueByOptionsId('pp-pay-method-options');
    if (methodId !== 'check') return null;
    if (!getSelectedOptionValueByOptionsId('gp-check-address-select')) return null;
    var origin = _origDetailsState && _origDetailsState.account ? _origDetailsState.account : null;
    var originName = origin ? String(origin.displayName || origin.name || origin.bankName || 'My account').trim() : 'My account';
    var originSub = origin ? ('••••' + getAccountLast4(origin)) : '--';
    var recipientName = String((document.getElementById('gp-pmc-check-name') || {}).textContent || '').trim() || String((_payContext.row && _payContext.row.payeeName) || 'Payee');
    var recipientAddress = String((document.getElementById('gp-pmc-check-address') || {}).textContent || '').trim() || '--';
    var attentionTo = String((document.getElementById('gp-pmc-check-attention') || {}).value || (document.getElementById('gp-pmc-check-attention-mobile') || {}).value || recipientName).trim() || '--';
    var printDate = String((document.getElementById('gp-pmc-check-print-date') || {}).value || (document.getElementById('gp-pmc-check-print-date-mobile') || {}).value || formatDate(getEffectivePaymentDateIso())).trim() || '--';
    var memo = String((document.getElementById('gp-pmc-check-memo') || {}).value || (document.getElementById('gp-pmc-check-memo-mobile') || {}).value || '').trim() || '--';
    var amount = formatMoney(_payContext.row && _payContext.row.amount, (_payContext.row && _payContext.row.currency) || 'USD');
    var billNumber = String((_payContext.row && _payContext.row.billNumber) || '').trim();

    return {
      methodId: methodId,
      methodLabel: getPaymentMethodLabel(methodId),
      amount: amount,
      payeeName: recipientName,
      paymentDateIso: getEffectivePaymentDateIso(),
      originName: originName,
      originSub: originSub,
      recipientName: recipientName,
      recipientAddress: recipientAddress,
      checkNumber: billNumber ? ('#' + billNumber) : '--',
      checkCompany: recipientName,
      checkAddress: recipientAddress,
      checkAttentionTo: attentionTo,
      checkAmount: amount,
      checkPrintDate: printDate,
      checkMemo: memo,
    };
  }

  function getSelectedDestinationTokens(tokensId, inputId) {
    var tokens = [];
    var host = document.getElementById(tokensId);
    var input = document.getElementById(inputId);
    var fallbackLabel = String((_payContext.row && _payContext.row.payeeName) || 'Payee').trim();

    if (host) {
      host.querySelectorAll('[data-token-value]').forEach(function (el) {
        var value = String(el.getAttribute('data-token-value') || '').trim();
        if (!value) return;
        tokens.push({
          label: String(el.getAttribute('data-token-label') || '').trim() || fallbackLabel,
          value: value,
          type: String(el.getAttribute('data-token-type') || '').trim() || 'custom'
        });
      });
    }

    if (input) {
      var pendingValue = String(input.value || '').trim();
      if (pendingValue) {
        tokens.push({
          label: fallbackLabel,
          value: pendingValue,
          type: pendingValue.indexOf('@') !== -1 ? 'email' : 'custom'
        });
      }
    }

    return tokens;
  }

  function getGroupedRecipientContacts(tokens) {
    var groups = [];
    (Array.isArray(tokens) ? tokens : []).forEach(function (token) {
      var name = String((token && token.label) || '').trim() || 'Payee';
      var value = String((token && token.value) || '').trim();
      if (!value) return;
      var existing = null;
      for (var i = 0; i < groups.length; i++) {
        if (groups[i].name.toLowerCase() === name.toLowerCase()) {
          existing = groups[i];
          break;
        }
      }
      if (!existing) {
        existing = { name: name, values: [] };
        groups.push(existing);
      }
      if (existing.values.indexOf(value) === -1) existing.values.push(value);
    });
    return groups.map(function (group) {
      return {
        name: group.name,
        sub: group.values.join(' · ')
      };
    });
  }

  function getSmartBadgeTexts(tokens) {
    return (Array.isArray(tokens) ? tokens : []).map(function (token) {
      var label = String((token && token.label) || '').trim();
      var value = String((token && token.value) || '').trim();
      if (label && value && label !== value) return label + ' · ' + value;
      return value || label;
    }).filter(Boolean);
  }

  function normalizeServiceBaseUrl(value) {
    return String(value || '').trim().replace(/\/+$/, '');
  }

  function getStoredTokenServiceConfig() {
    try {
      var raw = window.localStorage.getItem(TOKEN_SERVICE_CONFIG_STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (err) {
      return {};
    }
  }

  function getTokenServiceConfig() {
    if (!_tokenServiceConfigPromise) {
      _tokenServiceConfigPromise = loadJsonWithFallbacks(PUBLIC_RUNTIME_CONFIG_PATHS)
        .catch(function () { return {}; })
        .then(function (runtimeConfig) {
          var storedConfig = getStoredTokenServiceConfig();
          return {
            tokenServiceBaseUrl: normalizeServiceBaseUrl(
              (storedConfig && storedConfig.tokenServiceBaseUrl) ||
              (runtimeConfig && runtimeConfig.tokenServiceBaseUrl) ||
              ''
            )
          };
        });
    }
    return _tokenServiceConfigPromise;
  }

  function isValidEmailAddress(value) {
    var email = String(value || '').trim();
    if (!email) return false;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  function getSmartTestEmailUi(methodId) {
    if (methodId === 'smart_disburse') {
      return {
        buttonId: 'pp-smart-disburse-send-test-email-btn',
        helpId: 'pp-smart-disburse-send-test-email-help',
        resultId: 'pp-smart-disburse-send-test-email-result',
        flow: 'sd',
        label: 'SMART Disburse'
      };
    }
    if (methodId === 'smart_exchange') {
      return {
        buttonId: 'pp-smart-exchange-send-test-email-btn',
        helpId: 'pp-smart-exchange-send-test-email-help',
        resultId: 'pp-smart-exchange-send-test-email-result',
        flow: 'sx',
        label: 'SMART Exchange'
      };
    }
    return null;
  }

  function getSmartTestEmailDestination(methodId) {
    var isDisburse = methodId === 'smart_disburse';
    var isExchange = methodId === 'smart_exchange';
    if (!isDisburse && !isExchange) return null;
    var tokens = getSelectedDestinationTokens(
      isDisburse ? 'pp-smart-disburse-contact-tokens' : 'pp-smart-exchange-contact-tokens',
      isDisburse ? 'pp-smart-disburse-contact-input' : 'pp-smart-exchange-contact-input'
    );
    for (var i = 0; i < tokens.length; i += 1) {
      var token = tokens[i];
      var value = String((token && token.value) || '').trim();
      if (!isValidEmailAddress(value)) continue;
      return {
        email: value,
        label: String((token && token.label) || (_payContext.row && _payContext.row.payeeName) || 'Payee').trim()
      };
    }
    return null;
  }

  function setSmartTestEmailResult(methodId, type, lines) {
    var config = getSmartTestEmailUi(methodId);
    if (!config) return;
    var resultEl = document.getElementById(config.resultId);
    if (!resultEl) return;
    var palette = {
      success: 'border-green-200 bg-green-50 text-green-800 dark:border-green-500/30 dark:bg-green-500/10 dark:text-green-200',
      error: 'border-red-200 bg-red-50 text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200',
      info: 'border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-200'
    };
    resultEl.className = 'mt-3 rounded-md border px-3 py-2 text-sm ' + (palette[type] || palette.info);
    resultEl.innerHTML = (Array.isArray(lines) ? lines : [String(lines || '')])
      .filter(Boolean)
      .map(function (line) { return '<p>' + String(line) + '</p>'; })
      .join('');
    resultEl.classList.remove('hidden');
  }

  function updateSmartTestEmailUi(methodId) {
    var config = getSmartTestEmailUi(methodId);
    if (!config) return;
    var button = document.getElementById(config.buttonId);
    var help = document.getElementById(config.helpId);
    if (!button || !help) return;
    var state = _smartTestEmailState[methodId] || { sending: false };
    var selectedMethod = getSelectedOptionValueByOptionsId('pp-pay-method-options');
    var destination = getSmartTestEmailDestination(methodId);
    var isConfirmed = isConfirmedPayableRow(_payContext.row);
    var isActive = selectedMethod === methodId;
    button.disabled = !isActive || !destination || isConfirmed || !!state.sending;
    button.textContent = state.sending ? 'Sending...' : 'Send test email';
    if (isConfirmed) {
      help.textContent = 'Test email sending is available before the payment is confirmed.';
    } else if (state.sending) {
      help.textContent = 'Sending test email request...';
    } else if (destination) {
      help.textContent = 'Send a test token email to ' + destination.email + '.';
    } else {
      help.textContent = 'Enter one valid email destination to send a test token.';
    }
  }

  function bindSmartTestEmailButton(methodId) {
    var config = getSmartTestEmailUi(methodId);
    if (!config) return;
    var button = document.getElementById(config.buttonId);
    if (!button) return;
    button.onclick = function () {
      var destination = getSmartTestEmailDestination(methodId);
      if (!destination) {
        setSmartTestEmailResult(methodId, 'error', 'Enter one valid email destination before sending a test email.');
        updateSmartTestEmailUi(methodId);
        return;
      }

      _smartTestEmailState[methodId].sending = true;
      updateSmartTestEmailUi(methodId);

      getTokenServiceConfig()
        .then(function (serviceConfig) {
          var baseUrl = normalizeServiceBaseUrl(serviceConfig && serviceConfig.tokenServiceBaseUrl);
          if (!baseUrl) throw new Error('Token service is not configured for this environment.');
          return fetch(baseUrl + '/send-test-token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              flow: config.flow,
              email: destination.email,
              recipientName: destination.label,
              sandbox: false
            })
          });
        })
        .then(function (response) {
          return response.json()
            .catch(function () { return {}; })
            .then(function (payload) {
              if (!response.ok || payload.ok === false) {
                throw new Error(payload.error || ('Request failed with ' + response.status));
              }
              return payload;
            });
        })
        .then(function (payload) {
          var lines = [
            config.label + ' test email request accepted.',
            'Recipient: ' + escapeHtml(payload.email || destination.email)
          ];
          if (payload.delivery === 'preview_only' || payload.mode === 'sandbox') {
            lines.push('Live email sending is not enabled for this environment yet. A preview link was generated instead.');
          } else {
            lines.push('Test email sent successfully.');
          }
          if (payload.previewUrl) {
            lines.push('Preview link: <a class="font-medium underline" href="' + escapeHtml(payload.previewUrl) + '" target="_blank" rel="noreferrer">Open verification page</a>');
          }
          setSmartTestEmailResult(methodId, 'success', lines);
          if (typeof window.showGlobalTopToast === 'function') {
            window.showGlobalTopToast(payload.delivery === 'preview_only' || payload.mode === 'sandbox'
              ? (config.label + ' preview link generated for ' + (payload.email || destination.email))
              : (config.label + ' test email sent to ' + (payload.email || destination.email)));
          }
        })
        .catch(function (error) {
          setSmartTestEmailResult(methodId, 'error', error && error.message ? error.message : 'Failed to send test email.');
          if (typeof window.showGlobalTopToast === 'function') {
            window.showGlobalTopToast('Failed to send ' + config.label + ' test email');
          }
        })
        .finally(function () {
          _smartTestEmailState[methodId].sending = false;
          updateSmartTestEmailUi(methodId);
        });
    };
  }

  function getCurrentSmartRecipientDetails(methodId) {
    var isDisburse = methodId === 'smart_disburse';
    var isExchange = methodId === 'smart_exchange';
    if (!isDisburse && !isExchange) return null;

    var tokens = getSelectedDestinationTokens(
      isDisburse ? 'pp-smart-disburse-contact-tokens' : 'pp-smart-exchange-contact-tokens',
      isDisburse ? 'pp-smart-disburse-contact-input' : 'pp-smart-exchange-contact-input'
    );
    if (!tokens.length) return null;

    var groups = getGroupedRecipientContacts(tokens);
    if (!groups.length) return null;

    var origin = _origDetailsState && _origDetailsState.account ? _origDetailsState.account : null;
    var originName = origin ? String(origin.displayName || origin.name || origin.bankName || 'My account').trim() : 'My account';
    var originSub = origin ? ('••••' + getAccountLast4(origin)) : '--';
    var amount = formatMoney(_payContext.row && _payContext.row.amount, (_payContext.row && _payContext.row.currency) || 'USD');

    return {
      methodId: methodId,
      methodLabel: getPaymentMethodLabel(methodId),
      amount: amount,
      payeeName: String((_payContext.row && _payContext.row.payeeName) || groups[0].name || 'Payee').trim(),
      paymentDateIso: getEffectivePaymentDateIso(),
      originName: originName,
      originSub: originSub,
      recipientName: groups[0].name,
      recipientSub: groups[0].sub,
      recipientSecondaryName: groups[1] ? groups[1].name : '',
      recipientSecondarySub: groups[1] ? groups[1].sub : '',
      confirmTitle: 'Send payment link for ' + amount,
      smartBadgeTexts: getSmartBadgeTexts(tokens)
    };
  }

  function getCurrentPaymentConfirmSelection() {
    var methodId = getSelectedOptionValueByOptionsId('pp-pay-method-options');
    if (methodId === 'card') return getCurrentCardPaymentSelection();
    if (methodId === 'ach' || methodId === 'wire') return getCurrentBankRecipientDetails();
    if (methodId === 'check') return getCurrentCheckRecipientDetails();
    if (methodId === 'smart_disburse' || methodId === 'smart_exchange') return getCurrentSmartRecipientDetails(methodId);
    return null;
  }

  function buildFallbackPaidPayPageState(row, normalized, accounts) {
    if (!row || row.status !== 'paid') return null;

    var methodId = inferRowMethodType(row);
    var availableMethods = [];
    if (normalized && normalized.smartDisburse && normalized.smartDisburse.length) availableMethods.push('smart_disburse');
    if (normalized && normalized.smartExchange && normalized.smartExchange.length) availableMethods.push('smart_exchange');
    if (normalized && normalized.ach && normalized.ach.length) availableMethods.push('ach');
    if (normalized && normalized.wire && normalized.wire.length) availableMethods.push('wire');
    if (normalized && normalized.card && normalized.card.length) availableMethods.push('card');
    if (normalized && normalized.check && normalized.check.length) availableMethods.push('check');
    if (!methodId || availableMethods.indexOf(methodId) === -1) {
      methodId = availableMethods.length ? availableMethods[getRowSeed(row) % availableMethods.length] : '';
    }
    if (!methodId) return null;

    var paymentDateIso = String((row && (row.adDate || row.dueDate)) || '');
    var state = Object.assign({
      paymentDateIso: '',
      originationAccountId: '',
      originationExpanded: false,
      originationRevealed: false,
      methodId: methodId,
      bankAccountId: '',
      cardId: '',
      checkAddressId: '',
      checkAttention: String((row && row.payeeName) || '').trim(),
      checkPrintDate: paymentDateIso ? formatDate(paymentDateIso) : '',
      checkMemo: row && row.billNumber ? ('Bill # ' + String(row.billNumber).trim()) : '',
      smartTokens: [],
      cardFundingMethod: '',
      cardFundingAmount: '',
      cardSendingMethod: '',
      cardDeliveryTokens: [],
    }, buildFallbackOriginationState(row, accounts) || {});

    if (methodId === 'ach' || methodId === 'wire') {
      var bankEntry = getDeterministicListItem(methodId === 'wire' ? normalized.wire : normalized.ach, row, 13);
      if (bankEntry) state.bankAccountId = String(bankEntry.id || '');
    } else if (methodId === 'card') {
      var storedCard = resolveStoredCardForRow(row, '');
      var cardEntry = storedCard || getDeterministicListItem(normalized.card, row, 19);
      if (cardEntry) state.cardId = String(cardEntry.id || '');
      state.cardFundingMethod = 'add_funds';
      state.cardFundingAmount = formatMoneyInputValue(Number((row && row.amount) || 0));
      state.cardSendingMethod = 'on_file';
    } else if (methodId === 'check') {
      var checkEntry = getDeterministicListItem(normalized.check, row, 23);
      if (checkEntry) state.checkAddressId = String(checkEntry.id || '');
    } else if (methodId === 'smart_disburse' || methodId === 'smart_exchange') {
      var contacts = collectSmartDisburseContacts(methodId === 'smart_exchange' ? normalized.smartExchange : normalized.smartDisburse);
      var primary = getDeterministicListItem(contacts, row, 29);
      var secondary = getDeterministicListItem(contacts, row, 31);
      var tokens = [];
      if (primary) {
        tokens.push({
          id: String(primary.id || 'saved-primary'),
          label: String(primary.label || row.payeeName || 'Payee'),
          value: String(primary.value || primary.destination || ''),
          type: String(primary.type || '').trim() || 'custom'
        });
      }
      if (secondary && primary && String(secondary.id || '') !== String(primary.id || '')) {
        tokens.push({
          id: String(secondary.id || 'saved-secondary'),
          label: String(secondary.label || row.payeeName || 'Payee'),
          value: String(secondary.value || secondary.destination || ''),
          type: String(secondary.type || '').trim() || 'custom'
        });
      }
      state.smartTokens = tokens.filter(function (token) { return token && token.value; });
    }

    return state;
  }

  function reconcileSavedPayPageState(row, savedState) {
    if (!savedState || !row) return savedState;
    var rowMethodId = inferRowMethodType(row);
    if (rowMethodId && String(savedState.methodId || '') === rowMethodId) {
      if (rowMethodId === 'card' && isConfirmedPayableRow(row)) {
        var nextCardState = Object.assign({}, savedState);
        if (!String(nextCardState.cardId || '').trim()) {
          var resolvedCard = resolveStoredCardForRow(row, nextCardState.cardId);
          if (resolvedCard) nextCardState.cardId = String(resolvedCard.id || '');
        }
        if (!String(nextCardState.cardFundingMethod || '').trim()) nextCardState.cardFundingMethod = 'add_funds';
        if (!String(nextCardState.cardFundingAmount || '').trim()) nextCardState.cardFundingAmount = formatMoneyInputValue(Number((row && row.amount) || 0));
        if (!String(nextCardState.cardSendingMethod || '').trim()) nextCardState.cardSendingMethod = 'on_file';
        return nextCardState;
      }
      return savedState;
    }

    var nextState = Object.assign({}, savedState, {
      methodId: rowMethodId,
      bankAccountId: '',
      cardId: '',
      checkAddressId: '',
      smartTokens: [],
      cardFundingMethod: '',
      cardFundingAmount: '',
      cardSendingMethod: '',
      cardDeliveryTokens: [],
    });

    if (rowMethodId !== 'check') {
      nextState.checkAttention = '';
      nextState.checkPrintDate = '';
      nextState.checkMemo = '';
    }

    return nextState;
  }

  function buildConfirmedPayPageState(selection) {
    var methodId = String((selection && selection.methodId) || getSelectedOptionValueByOptionsId('pp-pay-method-options') || '');
    var state = {
      paymentDateIso: (_schedulePickerState && _schedulePickerState.confirmedDate && selection && selection.paymentDateIso)
        ? String(selection.paymentDateIso)
        : '',
      originationAccountId: _origDetailsState && _origDetailsState.account ? String(_origDetailsState.account.id || '') : '',
      originationExpanded: !!(_origDetailsState && _origDetailsState.expanded),
      originationRevealed: !!(_origDetailsState && _origDetailsState.revealed),
      methodId: methodId,
      bankAccountId: '',
      cardId: '',
      checkAddressId: '',
      checkAttention: '',
      checkPrintDate: '',
      checkMemo: '',
      smartTokens: [],
      cardFundingMethod: '',
      cardFundingAmount: '',
      cardSendingMethod: '',
      cardDeliveryTokens: [],
    };

    if (methodId === 'ach' || methodId === 'wire') {
      state.bankAccountId = getSelectedOptionValueByOptionsId('gp-bank-account-select');
    } else if (methodId === 'card') {
      state.cardId = String((selection && selection.cardId) || getSelectedOptionValueByOptionsId('pp-pay-card-options') || (_cardFundingState.pendingNewCard && _cardFundingState.pendingNewCard.id) || '');
      state.cardFundingMethod = String(_cardFundingState.fundingMethod || '');
      state.cardFundingAmount = String(_cardFundingState.fundingAmount || '');
      state.cardSendingMethod = String(_cardFundingState.sendingMethod || 'on_file');
      state.cardDeliveryTokens = getSelectedDestinationTokens('pp-card-delivery-contact-tokens', 'pp-card-delivery-contact-input');
    } else if (methodId === 'check') {
      state.checkAddressId = getSelectedOptionValueByOptionsId('gp-check-address-select');
      state.checkAttention = String((document.getElementById('gp-pmc-check-attention') || {}).value || '').trim();
      state.checkPrintDate = String((document.getElementById('gp-pmc-check-print-date') || {}).value || '').trim();
      state.checkMemo = String((document.getElementById('gp-pmc-check-memo') || {}).value || '').trim();
    } else if (methodId === 'smart_disburse' || methodId === 'smart_exchange') {
      state.smartTokens = getSelectedDestinationTokens(
        methodId === 'smart_disburse' ? 'pp-smart-disburse-contact-tokens' : 'pp-smart-exchange-contact-tokens',
        methodId === 'smart_disburse' ? 'pp-smart-disburse-contact-input' : 'pp-smart-exchange-contact-input'
      );
    }

    return state;
  }

  function populatePaymentConfirmModal(selection) {
    if (!selection) return;
    var defaultMethodCheckbox = document.getElementById('pp-confirm-default-method');
    var defaultMethodLabel = document.getElementById('pp-confirm-default-method-label');
    var confirmCopy = document.getElementById('pp-payment-confirm-copy');
    var sendToWrap = document.getElementById('pp-confirm-sendto-wrap');
    var sendToBadges = document.getElementById('pp-confirm-sendto-badges');
    var headerGrid = document.getElementById('pp-confirm-header-grid');
    var originLabel = document.getElementById('pp-confirm-origin-label');
    var originWrap = document.getElementById('pp-confirm-origin-wrap');
    var originCard = document.getElementById('pp-confirm-origin-card');
    var originPlaceholder = document.getElementById('pp-confirm-origin-placeholder');
    var arrowWrap = document.getElementById('pp-confirm-arrow-wrap');
    var arrowIcon = document.getElementById('pp-confirm-arrow-icon');
    var recipientLabel = document.getElementById('pp-confirm-recipient-label');
    var recipientNewCardBadge = document.getElementById('pp-confirm-recipient-new-card-badge');
    var recipientMobileLabel = document.getElementById('pp-confirm-recipient-mobile-label');
    var recipientMobileNewCardBadge = document.getElementById('pp-confirm-recipient-mobile-new-card-badge');
    var smartBadges = document.getElementById('pp-confirm-smart-badges');
    var recipientCardsLabel = document.getElementById('pp-confirm-recipient-cards-label');
    var recipientCards = document.getElementById('pp-confirm-recipient-cards');
    var dateLabel = document.getElementById('pp-confirm-date-label');
    var dateIcon = document.getElementById('pp-confirm-date-icon');
    var genericDetails = document.getElementById('pp-confirm-generic-details');
    var checkDetails = document.getElementById('pp-confirm-check-details');
    var payeeRow = document.getElementById('pp-confirm-payee-row');
    var methodRow = document.getElementById('pp-confirm-method-row');
    var recipientIcon = document.getElementById('pp-confirm-recipient-icon');
    var recipientSecondaryCard = document.getElementById('pp-confirm-recipient-secondary-card');
    var recipientSecondaryIcon = document.getElementById('pp-confirm-recipient-secondary-icon');
    var amountEl = document.getElementById('pp-confirm-amount');
    var amountInfo = document.getElementById('pp-confirm-amount-info');
    var projectedRow = document.getElementById('pp-confirm-projected-row');
    var projectedBalanceEl = document.getElementById('pp-confirm-projected-balance');
    var isScheduled = !!(_schedulePickerState && _schedulePickerState.confirmedDate);
    var isCheck = selection.methodId === 'check';
    var isSmart = selection.methodId === 'smart_disburse' || selection.methodId === 'smart_exchange';
    var isCard = selection.methodId === 'card';
    var isSpendBalance = isCard && (selection.fundingMethod === 'spend_balance');
    var isCardSecure = isCard && selection.sendingMethod === 'delivery_website';
    var isNewCard = isCard && String(selection.cardSource || '') === 'new';
    var buildingIconSvg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="size-5"><path fill-rule="evenodd" d="M4 16.5v-13h-.25a.75.75 0 0 1 0-1.5h12.5a.75.75 0 0 1 0 1.5H16v13h.25a.75.75 0 0 1 0 1.5h-3.5a.75.75 0 0 1-.75-.75v-2.5a.75.75 0 0 0-.75-.75h-2.5a.75.75 0 0 0-.75.75v2.5a.75.75 0 0 1-.75.75h-3.5a.75.75 0 0 1 0-1.5H4Zm3-11a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5v-1ZM7.5 9a.5.5 0 0 0-.5.5v1a.5.5 0 0 0 .5.5h1a.5.5 0 0 0 .5-.5v-1a.5.5 0 0 0-.5-.5h-1ZM11 5.5a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5v-1Zm.5 3.5a.5.5 0 0 0-.5.5v1a.5.5 0 0 0 .5.5h1a.5.5 0 0 0 .5-.5v-1a.5.5 0 0 0-.5-.5h-1Z" clip-rule="evenodd" /></svg>';
    var contactIconSvg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="size-5"><path d="M10 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM3.465 14.493a1.23 1.23 0 0 0 .41 1.412A9.957 9.957 0 0 0 10 18c2.31 0 4.438-.784 6.131-2.1.43-.333.604-.903.408-1.41a7.002 7.002 0 0 0-13.074.003Z" /></svg>';
    var cardIconSvg = isCard ? getCardBrandIcon(selection.cardBrand) : '';
    if (defaultMethodCheckbox) defaultMethodCheckbox.checked = false;
    if (defaultMethodLabel) defaultMethodLabel.textContent = 'Make this the default payment method for ' + selection.payeeName;
    if (confirmCopy) confirmCopy.textContent = isSmart
      ? 'Review who will receive the payment link before you continue.'
      : (isCard
          ? (isCardSecure
              ? 'Review who will receive the secure card-delivery link, the selected card, and the payment details before you continue.'
              : 'Review the origination account, selected card, and payment details before you continue.')
          : 'Review your account and recipient details before you continue.');
    if (headerGrid) {
      headerGrid.classList.toggle('hidden', false);
      headerGrid.classList.toggle('sm:grid', !isSmart);
      headerGrid.classList.toggle('grid-cols-1', isSmart);
      headerGrid.classList.toggle('sm:grid-cols-1', isSmart);
      headerGrid.classList.toggle('sm:grid-cols-[minmax(0,1fr)_56px_minmax(0,1fr)]', !isSmart);
    }
    if (sendToWrap) sendToWrap.classList.toggle('hidden', !(isSmart || isCardSecure));
    if (sendToBadges) {
      var sendToBadgeTexts = isSmart ? (selection.smartBadgeTexts || []) : (selection.cardDeliveryBadgeTexts || []);
      sendToBadges.innerHTML = (isSmart || isCardSecure) ? sendToBadgeTexts.map(function (text) {
        return '<span class="inline-flex max-w-full items-center rounded-md bg-gray-100 px-2 py-0.5 text-sm font-medium text-gray-700 dark:bg-white/10 dark:text-gray-200"><span class="truncate">' + escapeHtml(text) + '</span></span>';
      }).join('') : '';
    }
    if (sendToWrap) sendToWrap.classList.toggle('mb-5', isCardSecure || isSmart);
    if (originLabel) originLabel.textContent = 'Origination Account';
    if (originWrap) originWrap.classList.toggle('hidden', isSmart);
    if (originCard) originCard.classList.toggle('hidden', isSpendBalance);
    if (originPlaceholder) originPlaceholder.classList.toggle('hidden', !isSpendBalance);
    if (arrowWrap) {
      arrowWrap.classList.toggle('hidden', isSmart);
      arrowWrap.classList.toggle('sm:flex', !isSmart);
    }
    if (arrowIcon) {
      arrowIcon.classList.toggle('invisible', isSpendBalance);
      arrowIcon.classList.toggle('opacity-0', isSpendBalance);
    }
    if (recipientLabel) recipientLabel.textContent = isSmart ? '' : (isCard ? 'Card' : 'Recipient');
    if (recipientMobileLabel) recipientMobileLabel.textContent = isCard ? 'Card' : (isSmart ? 'Send to' : 'Recipient');
    if (recipientNewCardBadge) recipientNewCardBadge.classList.toggle('hidden', !isNewCard);
    if (recipientMobileNewCardBadge) recipientMobileNewCardBadge.classList.toggle('hidden', !isNewCard);
    if (recipientCards) {
      recipientCards.classList.toggle('sm:flex-row', isSmart);
      recipientCards.classList.toggle('sm:flex-wrap', isSmart);
      recipientCards.classList.toggle('sm:items-start', isSmart);
      recipientCards.classList.toggle('sm:justify-start', isSmart);
      recipientCards.classList.remove('mt-3', 'sm:mt-3');
    }
    if (payeeRow) payeeRow.classList.toggle('hidden', isSmart);
    if (methodRow) methodRow.classList.remove('hidden');
    if (dateLabel) dateLabel.textContent = isScheduled ? 'Scheduled for' : (isSmart ? 'Send on' : 'Payment date');
    if (dateIcon) dateIcon.classList.toggle('hidden', !isScheduled);
    if (genericDetails) {
      genericDetails.classList.toggle('hidden', isCheck);
      genericDetails.classList.toggle('mt-3', !isSmart);
      genericDetails.classList.toggle('mt-6', isSmart);
    }
    if (checkDetails) checkDetails.classList.toggle('hidden', !isCheck);
    if (smartBadges) {
      var showRecipientChips = isSmart;
      var badgeTexts = isSmart ? (selection.smartBadgeTexts || []) : [];
      smartBadges.classList.toggle('hidden', !showRecipientChips);
      smartBadges.classList.toggle('flex', showRecipientChips);
      smartBadges.innerHTML = showRecipientChips ? badgeTexts.map(function (text) {
        return '<span class="inline-flex max-w-full items-center rounded-md bg-gray-100 px-2 py-0.5 text-sm font-medium text-gray-700 dark:bg-white/10 dark:text-gray-200"><span class="truncate">' + escapeHtml(text) + '</span></span>';
      }).join('') : '';
    }
    if (recipientCardsLabel) {
      recipientCardsLabel.classList.add('hidden');
      recipientCardsLabel.textContent = 'Card';
    }
    if (recipientCards) recipientCards.classList.toggle('hidden', isSmart);
    if (recipientIcon) recipientIcon.innerHTML = isSmart ? contactIconSvg : (isCard ? cardIconSvg : buildingIconSvg);
    if (recipientSecondaryIcon) recipientSecondaryIcon.innerHTML = isSmart ? contactIconSvg : (isCard ? contactIconSvg : buildingIconSvg);
    if (recipientSecondaryCard) {
      recipientSecondaryCard.classList.toggle('hidden', !selection.recipientSecondaryName);
      recipientSecondaryCard.classList.toggle('flex', !!selection.recipientSecondaryName);
    }
    setText('pp-payment-confirm-title', selection.confirmTitle || ('Confirm ' + selection.amount + ' payment'));
    if (amountEl) amountEl.textContent = isCard ? String(selection.fundingAmountText || '--') : String(selection.amount || '--');
    if (amountInfo) {
      amountInfo.classList.toggle('invisible', !isSpendBalance);
      amountInfo.classList.toggle('opacity-0', !isSpendBalance);
      amountInfo.classList.toggle('pointer-events-none', !isSpendBalance);
    }
    setText('pp-confirm-payee', selection.payeeName);
    setText('pp-confirm-date', formatDate(selection.paymentDateIso));
    setText('pp-confirm-method', selection.methodLabel);
    setText('pp-confirm-origin-name', selection.originName);
    setText('pp-confirm-origin-sub', selection.originSub);
    setText('pp-confirm-recipient-name', selection.recipientName);
    setText('pp-confirm-recipient-sub', selection.recipientSub || (isCheck ? selection.recipientAddress : (selection.recipientAccount !== '--' ? selection.recipientAccount : (selection.recipientRouting !== '--' ? selection.recipientRouting : selection.recipientAddress))));
    setText('pp-confirm-recipient-secondary-name', selection.recipientSecondaryName || '--');
    setText('pp-confirm-recipient-secondary-sub', selection.recipientSecondarySub || '--');
    if (projectedRow) projectedRow.classList.toggle('hidden', !isCard);
    if (projectedBalanceEl) projectedBalanceEl.textContent = isCard ? String(selection.projectedBalanceText || '--') : '--';
    if (isCheck) {
      setText('pp-confirm-check-number', selection.checkNumber);
      setText('pp-confirm-check-company', selection.checkCompany);
      setText('pp-confirm-check-address', selection.checkAddress);
      setText('pp-confirm-check-attention', selection.checkAttentionTo);
      setText('pp-confirm-check-amount', selection.checkAmount);
      setText('pp-confirm-check-print-date', selection.checkPrintDate);
      setText('pp-confirm-check-memo', selection.checkMemo);
    }
  }

  function populateSubmitSuccessModal(selection) {
    if (!selection) return;
    var isScheduled = !!(_schedulePickerState && _schedulePickerState.confirmedDate);
    var isCheck = selection.methodId === 'check';
    var isSmart = selection.methodId === 'smart_disburse' || selection.methodId === 'smart_exchange';
    var isCard = selection.methodId === 'card';
    var successCopy = document.getElementById('gp-submit-success-copy');
    var progressBar = document.getElementById('gp-submit-progress-bar');
    var stage1 = document.getElementById('gp-submit-stage-1');
    var stage2 = document.getElementById('gp-submit-stage-2');
    var stage3 = document.getElementById('gp-submit-stage-3');
    var successCardSummary = document.getElementById('gp-submit-success-card-summary');
    var successCardBrand = document.getElementById('gp-submit-success-card-brand');
    var successCardLast4 = document.getElementById('gp-submit-success-card-last4');

    function setStageState(el, label, active) {
      if (!el) return;
      el.textContent = label;
      el.classList.toggle('text-blue-600', !!active);
      el.classList.toggle('dark:text-blue-400', !!active);
    }

    if (successCardSummary) successCardSummary.classList.toggle('hidden', !isCard);
    if (successCardBrand) successCardBrand.innerHTML = isCard ? getSuccessCardBrandLogo(selection.cardBrand) : '';
    if (successCardLast4) successCardLast4.textContent = isCard ? String(getResolvedCardLast4(selection) || '0000') : '';

    if (isCard) {
      populatePayablesCardDetailsModal(selection);
    }

    if (isScheduled) {
      if (isSmart) {
        setText('gp-submit-success-title', 'Payment Link Scheduled!');
        setText('gp-submit-success-copy', 'Your payment link will be sent on ' + formatDate(selection.paymentDateIso) + '. The payee will choose how to pay after opening the link.');
        setText('gp-submit-progress-title', 'Payment link send is scheduled for ' + formatDate(selection.paymentDateIso) + '.');
        if (progressBar) progressBar.style.width = '12.5%';
        setStageState(stage1, 'Link Scheduled', true);
        setStageState(stage2, 'Pending Payee Action', false);
        setStageState(stage3, 'Paid', false);
        return;
      }
      setText('gp-submit-success-title', 'Payment Scheduled!');
      setText('gp-submit-success-copy', 'Your payment has been scheduled for ' + formatDate(selection.paymentDateIso) + '. If there are additional actions for you to take, you\'ll be notified.');
      setText('gp-submit-progress-title', 'Payment initiation is scheduled for ' + formatDate(selection.paymentDateIso) + '.');
      if (progressBar) progressBar.style.width = '12.5%';
      setStageState(stage1, 'Payment Initiation', true);
      setStageState(stage2, 'In Progress', false);
      setStageState(stage3, 'Paid', false);
      return;
    }

    if (isCard) {
      setText('gp-submit-success-title', selection.cardSource === 'new' ? 'New Card Created and Funded!' : 'Card Ready to Use!');
      setText('gp-submit-success-copy', selection.sendingMethod === 'delivery_website'
        ? ('Your virtual card for ' + selection.payeeName + ' is ready and the secure delivery has been completed.')
        : ('Your virtual card for ' + selection.payeeName + ' is funded and ready to be used.'));
      setText('gp-submit-progress-title', selection.cardSource === 'new'
        ? (selection.amount + ' has been loaded onto the new card and is ready.')
        : (selection.amount + ' has been loaded onto the selected card and is ready.'));
      if (progressBar) progressBar.style.width = '100%';
      setStageState(stage1, selection.cardSource === 'new' ? 'Card Created' : 'Card Selected', true);
      setStageState(stage2, 'Funded', true);
      setStageState(stage3, selection.sendingMethod === 'delivery_website' ? 'Delivered' : 'Ready to Use', true);
      return;
    }

    if (isSmart) {
      setText('gp-submit-success-title', 'Payment Link Sent!');
      setText('gp-submit-success-copy', 'Your payee has been notified. They still need to open the link and choose how to pay before funds can be collected.');
      setText('gp-submit-progress-title', 'Waiting for payee action...');
      if (progressBar) progressBar.style.width = '50%';
      setStageState(stage1, 'Link Sent', true);
      setStageState(stage2, 'Pending Payee Action', true);
      setStageState(stage3, 'Paid', false);
      return;
    }

    setText('gp-submit-success-title', 'Payment Submitted!');
    setText('gp-submit-success-copy', 'Your payment is in progress. Check back later for status updates. If there are additional actions for you to take, you\'ll be notified.');
    setText('gp-submit-progress-title', isCheck ? 'Check payment is in progress...' : (selection.amount + ' to ' + selection.payeeName + ' is in progress...'));
    if (progressBar) progressBar.style.width = '50%';
    setStageState(stage1, 'Payment Initiation', true);
    setStageState(stage2, 'In Progress', true);
    setStageState(stage3, 'Paid', false);
  }

  function getResolvedCardLast4(selection) {
    var last4 = String((selection && selection.cardLast4) || '').trim();
    if (last4) return last4;
    var seed = String((selection && selection.cardId) || Date.now()).replace(/\D/g, '');
    return ('0000' + String(1000 + (Number(seed.slice(-6) || 0) % 9000))).slice(-4);
  }

  function getResolvedCardCvv(selection) {
    var seed = String((selection && selection.cardId) || Date.now()).replace(/\D/g, '');
    return ('000' + String(100 + (Number(seed.slice(-5) || 0) % 900))).slice(-3);
  }

  function getResolvedCardNumber(selection) {
    var last4 = getResolvedCardLast4(selection);
    var brand = String((selection && selection.cardBrand) || 'visa').toLowerCase();
    var prefix = brand === 'mastercard' ? '5424 18' : '4111 27';
    var seed = String((selection && selection.cardId) || Date.now()).replace(/\D/g, '');
    var middle = ('000000' + String(Number(seed.slice(-8, -2) || 0) % 1000000)).slice(-6);
    return prefix + ' ' + middle.slice(0, 4) + ' ' + middle.slice(4, 6) + last4.slice(0, 2) + ' ' + last4;
  }

  function getResolvedCardAddress() {
    var row = _payContext && _payContext.row ? _payContext.row : null;
    var payeeProfile = _payContext && _payContext.payeeProfile ? _payContext.payeeProfile : null;
    var address = '';
    if (payeeProfile) {
      address = String(payeeProfile.address || payeeProfile.remittanceAddress || payeeProfile.billingAddress || '').trim();
    }
    if (!address && row && row.details) {
      address = String(row.details.address || row.details.remittanceAddress || '').trim();
    }
    return address || '--';
  }

  function populatePayablesCardDetailsModal(selection) {
    if (!selection || String(selection.methodId || '') !== 'card') return;
    var brandLogo = document.getElementById('gp-vc-brand-logo');
    var typeLogo = document.getElementById('gp-vc-type-logo');
    setText('gp-vc-cvv-pill', 'CVV : ' + getResolvedCardCvv(selection));
    setText('gp-vc-amount', formatMoney((_payContext.row && _payContext.row.amount) || 0, (_payContext.row && _payContext.row.currency) || 'USD'));
    setText('gp-vc-card-number', getResolvedCardNumber(selection));
    setText('gp-vc-expiry', String(selection.cardExpDate || '--'));
    setText('gp-vc-name', String((selection.cardName || selection.payeeName || 'Virtual Card')).toUpperCase());
    setText('gp-vc-pending-amount', formatMoney((_payContext.row && _payContext.row.amount) || 0, (_payContext.row && _payContext.row.currency) || 'USD'));
    setText('gp-vc-holder-name', String(selection.payeeName || selection.cardName || '--'));
    setText('gp-vc-card-address', getResolvedCardAddress());
    setText('gp-vc-full-number', getResolvedCardNumber(selection));
    setText('gp-vc-full-expiry', String(selection.cardExpDate || '--'));
    setText('gp-vc-cvc2', getResolvedCardCvv(selection));
    if (brandLogo) brandLogo.innerHTML = getCardBrandLogoMarkup(selection.cardBrand, 'large');
    if (typeLogo) typeLogo.innerHTML = getCardBrandLogoMarkup(selection.cardBrand, 'medium');
  }

  function initPayablesCardDetailsModalSync() {
    document.addEventListener('click', function (event) {
      var trigger = event.target && event.target.closest('[commandfor="gp-card-details-dialog"]');
      if (!trigger) return;
      var selection = getResolvedPayablesCardSelection();
      if (!selection) return;
      var howContent = document.getElementById('gp-card-how-content');
      var howToggle = document.getElementById('gp-card-how-toggle');
      if (howContent) {
        howContent.classList.add('hidden');
        howContent.classList.remove('flex');
      }
      if (howToggle) {
        var howIcon = howToggle.querySelector('[data-collapse-icon]');
        if (howIcon) howIcon.classList.remove('rotate-180');
      }
      populatePayablesCardDetailsModal(selection);
    });
  }

  function initPayablesCardDetailsHowItWorksToggle() {
    var howToggle = document.getElementById('gp-card-how-toggle');
    var howContent = document.getElementById('gp-card-how-content');
    if (!howToggle || !howContent) return;
    howToggle.addEventListener('click', function () {
      howContent.classList.toggle('hidden');
      howContent.classList.toggle('flex', !howContent.classList.contains('hidden'));
      var icon = howToggle.querySelector('[data-collapse-icon]');
      if (icon) icon.classList.toggle('rotate-180');
    });
  }

  function setInputValue(id, value) {
    var el = document.getElementById(id);
    if (!el) return;
    el.value = value == null ? '' : String(value);
  }

  function populateCheckDetails(selected) {
    var attentionTo = String((selected && selected.name) || (_payContext.row && _payContext.row.payeeName) || 'Payee').trim();
    var amount = formatMoney(_payContext.row && _payContext.row.amount, (_payContext.row && _payContext.row.currency) || 'USD');
    var printDate = formatDate(getEffectivePaymentDateIso());
    var memo = _payContext.row && _payContext.row.billNumber ? ('Bill # ' + String(_payContext.row.billNumber).trim()) : '';

    setInputValue('gp-pmc-check-attention', attentionTo);
    setInputValue('gp-pmc-check-attention-mobile', attentionTo);
    setInputValue('gp-pmc-check-amount', amount);
    setInputValue('gp-pmc-check-amount-mobile', amount);
    setInputValue('gp-pmc-check-print-date', printDate);
    setInputValue('gp-pmc-check-print-date-mobile', printDate);
    setInputValue('gp-pmc-check-memo', memo);
    setInputValue('gp-pmc-check-memo-mobile', memo);
  }

  function buildPayPageActivityLogItem(item, showLine) {
    var dotClassesByType = {
      processing: 'bg-blue-100 ring-1 ring-blue-700/40 dark:bg-blue-400/15 dark:ring-blue-400/30',
      scheduled: 'bg-gray-200 ring-1 ring-gray-400/40 dark:bg-white/15 dark:ring-white/20',
      pending: 'bg-yellow-100 ring-1 ring-yellow-700/40 dark:bg-yellow-400/15 dark:ring-yellow-400/30',
      success: 'bg-green-100 ring-1 ring-green-700/40 dark:bg-green-400/15 dark:ring-green-400/30',
      completed: 'bg-green-100 ring-1 ring-green-700/40 dark:bg-green-400/15 dark:ring-green-400/30',
      failed: 'bg-red-100 ring-1 ring-red-700/40 dark:bg-red-400/15 dark:ring-red-400/30',
      event: 'bg-gray-100 ring-1 ring-gray-300 dark:bg-white/10 dark:ring-white/20',
    };
    var dotClasses = dotClassesByType[item && item.type] || dotClassesByType.event;
    var lineHtml = showLine
      ? '<div class="absolute top-0 -bottom-6 left-0 flex w-6 justify-center"><div class="w-px bg-gray-200 dark:bg-white/10"></div></div>'
      : '';

    return (
      '<div class="relative flex gap-4">' +
        lineHtml +
        '<div class="relative flex size-6 flex-none items-center justify-center bg-white dark:bg-gray-900">' +
          '<div class="size-1.5 rounded-full ' + dotClasses + '"></div>' +
        '</div>' +
        '<div class="flex flex-col gap-1 pb-6">' +
          '<p class="text-base font-medium text-gray-900 dark:text-white">' + escapeHtml((item && item.title) || '') + '</p>' +
          ((item && item.dateLabel) ? '<p class="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">' + escapeHtml(item.dateLabel) + '</p>' : '') +
          '<p class="text-sm text-gray-700 dark:text-gray-300">' + escapeHtml((item && item.description) || '') + '</p>' +
        '</div>' +
      '</div>'
    );
  }

  function renderPayPageActivityLog(row) {
    var content = document.getElementById('gp-activity-content');
    if (!content) return;
    var log = typeof window.getActivityLog === 'function' ? window.getActivityLog(row) : [];
    if (!log.length) {
      content.innerHTML =
        '<div class="rounded-lg border border-dashed border-gray-300 bg-gray-50/70 px-4 py-5 text-center dark:border-white/15 dark:bg-white/5">' +
          '<div class="mx-auto mb-2 inline-flex size-8 items-center justify-center rounded-full bg-white text-gray-500 ring-1 ring-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:ring-white/10">' +
            '<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" class="size-4"><path fill-rule="evenodd" clip-rule="evenodd" d="M10 18C14.4183 18 18 14.4183 18 10C18 5.58172 14.4183 2 10 2C5.58172 2 2 5.58172 2 10C2 14.4183 5.58172 18 10 18ZM10.75 5C10.75 4.58579 10.4142 4.25 10 4.25C9.58579 4.25 9.25 4.58579 9.25 5V10C9.25 10.4142 9.58579 10.75 10 10.75H14C14.4142 10.75 14.75 10.4142 14.75 10C14.75 9.58579 14.4142 9.25 14 9.25H10.75V5Z" fill="#6B7280"/></svg>' +
          '</div>' +
          '<p class="text-sm font-medium text-gray-900 dark:text-white">No activity yet</p>' +
          '<p class="mt-1 text-sm text-gray-500 dark:text-gray-400">Activity entries will show here after you perform payment actions.</p>' +
        '</div>';
      return;
    }
    content.innerHTML = log.map(function (item, idx) {
      return buildPayPageActivityLogItem(item, idx < log.length - 1);
    }).join('');
  }

  function getSelectionTransferLabel(selection) {
    if (!selection) return 'payment';
    var methodId = String(selection.methodId || '').toLowerCase();
    if (methodId === 'ach') return 'ACH transfer';
    if (methodId === 'wire') return 'wire transfer';
    if (methodId === 'card') return 'card payment';
    if (methodId === 'check') return 'check payment';
    if (methodId === 'smart_disburse') return 'SMART Disburse payment';
    if (methodId === 'smart_exchange') return 'SMART Exchange payment';
    return 'payment';
  }

  function persistCardPaymentSelection(updatedRow, selection) {
    if (!selection || String(selection.methodId || '') !== 'card' || !selection.cardId) return;
    var cards = normalizeCardsDataset(_cardFundingState.cards);
    var matched = false;
    for (var i = 0; i < cards.length; i += 1) {
      if (String(cards[i].id) !== String(selection.cardId)) continue;
      matched = true;
      var postPaymentBalance = Number(selection.availableBalance || 0) - Number((updatedRow && updatedRow.amount) || 0);
      cards[i].currentBalance = postPaymentBalance;
      cards[i].projectedBalance = postPaymentBalance;
      if (!Array.isArray(cards[i].payments)) cards[i].payments = [];
      cards[i].payments.unshift({
        payableId: String((updatedRow && (updatedRow.id || updatedRow.billNumber)) || ''),
        vendor: String((updatedRow && updatedRow.payeeName) || ''),
        amount: Number((updatedRow && updatedRow.amount) || 0),
        date: String((updatedRow && updatedRow.adDate) || '')
      });
      break;
    }
    if (!matched) {
      var generatedLast4 = String(selection.cardLast4 || '').trim();
      if (!generatedLast4) {
        var generatedSeed = String(selection.cardId || Date.now()).replace(/\D/g, '');
        generatedLast4 = ('0000' + String(1000 + (Number(generatedSeed.slice(-6) || 0) % 9000))).slice(-4);
      }
      var postPaymentBalanceNew = Number(selection.availableBalance || 0) - Number((updatedRow && updatedRow.amount) || 0);
      cards.unshift({
        id: String(selection.cardId),
        cardName: String(selection.cardName || 'Virtual Card').trim(),
        brand: String(selection.cardBrand || 'visa').toLowerCase(),
        last4: generatedLast4,
        expDate: String(selection.cardExpDate || '').trim(),
        currentBalance: postPaymentBalanceNew,
        projectedBalance: postPaymentBalanceNew,
        currency: String((updatedRow && updatedRow.currency) || 'USD'),
        payments: [{
          payableId: String((updatedRow && (updatedRow.id || updatedRow.billNumber)) || ''),
          vendor: String((updatedRow && updatedRow.payeeName) || ''),
          amount: Number((updatedRow && updatedRow.amount) || 0),
          date: String((updatedRow && updatedRow.adDate) || '')
        }]
      });
    }
    _cardFundingState.cards = cards;
    persistCardsDataset(cards);
  }

  function createUpdatedPayableRow(selection) {
    if (!_payContext.row) return null;
    var updated = cloneJson(_payContext.row) || {};
    var nowIso = getNowIsoDateTime();
    var paymentDateIso = selection && selection.paymentDateIso ? String(selection.paymentDateIso) : '';
    var isScheduled = !!(_schedulePickerState && _schedulePickerState.confirmedDate);
    var isInstantCard = !isScheduled && selection && String(selection.methodId || '') === 'card';
    var transferLabel = getSelectionTransferLabel(selection);
    var payeeName = String((updated && updated.payeeName) || (selection && selection.payeeName) || 'payee').trim();
    var amount = formatMoney(updated.amount, updated.currency || 'USD');

    updated.details = Object.assign({}, updated.details || {});
    updated.adDate = String(nowIso).slice(0, 10);
    updated.paymentMethod = selection && selection.methodLabel ? selection.methodLabel : updated.paymentMethod;
    updated.processingStep = isScheduled ? 'Release scheduled' : (isInstantCard ? 'Payment complete' : 'Processing payment');
    updated.status = isInstantCard ? 'paid' : 'in_progress';
    updated.statusType = isScheduled ? 'scheduled' : (isInstantCard ? '' : 'processing');
    updated.statusLabel = isScheduled ? 'Scheduled' : (isInstantCard ? 'Paid' : 'Processing');
    updated.scheduledFor = isScheduled && paymentDateIso ? (paymentDateIso + 'T09:00:00') : '';
    updated.details.payPageState = buildConfirmedPayPageState(selection);
    updated.details.activityLog = isScheduled
      ? [
          {
            type: 'scheduled',
            title: 'Scheduled',
            description: 'Payment is scheduled for ' + formatDate(paymentDateIso) + '.',
          },
          {
            type: 'event',
            title: 'Payment Confirmed',
            description: amount + ' for ' + payeeName + ' was confirmed on ' + formatActivityDateTime(nowIso) + '.',
          },
          {
            type: 'event',
            title: 'Transfer Queued',
            description: 'The ' + transferLabel + ' is queued to start on ' + formatDate(paymentDateIso) + '.',
          },
          {
            type: 'event',
            title: 'Cancel',
            description: 'This payment can be canceled before ' + formatDate(paymentDateIso) + '.',
          },
        ]
      : isInstantCard
        ? [
            {
              type: 'success',
              title: selection && selection.cardSource === 'new' ? 'New Card Created' : 'Card Ready',
              description: selection && selection.cardSource === 'new'
                ? 'A new virtual card was created and funded for this payment.'
                : 'The selected virtual card was funded and is ready for use.'
            },
            {
              type: 'success',
              title: 'Payment Completed',
              description: amount + ' for ' + payeeName + ' was completed successfully.',
            },
          ]
      : [
          {
            type: 'processing',
            title: 'Processing',
            description: amount + ' for ' + payeeName + ' is now in progress.',
          },
          {
            type: 'event',
            title: 'Payment Confirmed',
            description: 'Payment was confirmed on ' + formatActivityDateTime(nowIso) + '.',
          },
          {
            type: 'event',
            title: 'Transfer Submitted',
            description: 'The ' + transferLabel + ' was submitted and is moving through processing.',
          },
          {
            type: 'event',
            title: 'Cancel',
            description: 'This payment can be canceled until processing completes.',
          },
        ];

    return updated;
  }

  function syncCardPanelAfterConfirm(selection) {
    if (!selection || String(selection.methodId || '') !== 'card') return;
    var cardSelContent = document.getElementById('pp-pay-card-selected');
    var cardOpts = document.getElementById('pp-pay-card-options');
    var createdWrap = document.getElementById('pp-card-created-summary');
    var existingWrap = document.getElementById('pp-card-existing-selector-wrap');
    var card = getCardById(selection.cardId) || {
      id: selection.cardId,
      cardName: selection.cardName,
      brand: selection.cardBrand,
      last4: getResolvedCardLast4(selection),
      expDate: selection.cardExpDate,
      currentBalance: selection.projectedBalance,
      currency: (_payContext.row && _payContext.row.currency) || 'USD'
    };

    _cardFundingState.cardSource = 'existing';
    _cardFundingState.pendingNewCard = null;
    _cardFundingState.selectedCardId = String(selection.cardId || '');

    if (cardOpts) renderCardOptionsList(cardOpts, '');
    if (cardSelContent) cardSelContent.innerHTML = buildCardSelectContent(card);
    if (createdWrap) createdWrap.classList.add('hidden');
    if (existingWrap) existingWrap.classList.remove('hidden');
    renderCardFundingMethodOptions();
    syncFundingAmountInput();
    renderCardBalanceSummary();
    syncCardProgressiveReveal();
    syncPaidCardRevealSection();
  }

  function syncPaidCardRevealSection() {
    var section = document.getElementById('pp-card-paid-reveal-section');
    var existingWrap = document.getElementById('pp-card-existing-selector-wrap');
    var createdWrap = document.getElementById('pp-card-created-summary');
    var fundingWrap = document.getElementById('pp-card-funding-method-wrap');
    var sendingWrap = document.getElementById('pp-card-sending-methods');
    var brand = document.getElementById('pp-card-paid-brand');
    var last4 = document.getElementById('pp-card-paid-last4');
    if (!section || !existingWrap || !createdWrap || !brand || !last4) return;

    var selectedMethod = getSelectedOptionValueByOptionsId('pp-pay-method-options');
    var shouldShow = isConfirmedPayableRow(_payContext.row) && String(selectedMethod || '') === 'card';
    section.classList.toggle('hidden', !shouldShow);
    if (shouldShow) {
      var resolvedCard = resolveStoredCardForRow(_payContext.row, _cardFundingState.selectedCardId);
      if (resolvedCard) {
        _cardFundingState.cardSource = 'existing';
        _cardFundingState.pendingNewCard = null;
        _cardFundingState.selectedCardId = String(resolvedCard.id || '');
        if (_cardFundingState.fundingMethod !== 'spend_balance') {
          _cardFundingState.fundingMethod = String(_cardFundingState.fundingMethod || 'add_funds');
        }
        if (!_cardFundingState.fundingAmount) {
          _cardFundingState.fundingAmount = formatMoneyInputValue(Number((_payContext.row && _payContext.row.amount) || 0));
        }
        _cardFundingState.sendingMethod = String(_cardFundingState.sendingMethod || 'on_file');
      }
      existingWrap.classList.add('hidden');
      createdWrap.classList.add('hidden');
      if (fundingWrap) fundingWrap.classList.remove('hidden');
      if (sendingWrap) sendingWrap.classList.remove('hidden');
      var activeCard = getActiveCard() || getCardById(_cardFundingState.selectedCardId) || resolvedCard;
      var fallbackSelection = getCurrentCardPaymentSelection();
      brand.innerHTML = getCardBrandLogoMarkup(activeCard ? activeCard.brand : (fallbackSelection && fallbackSelection.cardBrand), 'small');
      last4.textContent = String(activeCard && activeCard.last4 ? activeCard.last4 : (fallbackSelection ? getResolvedCardLast4(fallbackSelection) : '0000'));
      return;
    }
    if (String(_cardFundingState.cardSource || '') === 'existing') existingWrap.classList.remove('hidden');
  }

  function initPaymentConfirmFlow() {
    var entryBtn = document.getElementById('gp-submit-btn');
    var confirmBtn = document.getElementById('pp-payment-confirm-submit-btn');
    if (!entryBtn || !confirmBtn) return;

    entryBtn.addEventListener('click', function (event) {
      event.preventDefault();
      var selection = getCurrentPaymentConfirmSelection();
      if (!selection) {
        if (typeof window.showGlobalTopToast === 'function') {
          window.showGlobalTopToast('Complete the payment details to continue.');
        }
        return;
      }
      populatePaymentConfirmModal(selection);
      openDialogById('pp-payment-confirm-dialog');
    });

    confirmBtn.addEventListener('click', function (event) {
      event.preventDefault();
      var selection = getCurrentPaymentConfirmSelection();
      if (!selection) return;
      var updatedRow = createUpdatedPayableRow(selection);
      if (updatedRow) {
        persistCardPaymentSelection(updatedRow, selection);
        _payContext.row = updatedRow;
        persistPayableOverride(updatedRow);
        if (selection.methodId === 'card') syncCardPanelAfterConfirm(selection);
        var updatedStatus = getDisplayStatus(updatedRow);
        setStatusBadge(updatedStatus.key, updatedStatus.label);
        renderPayPageActivityLog(updatedRow);
        applyConfirmedScheduleDate(getScheduledPaymentDateIso(updatedRow));
        applyConfirmedPayPageReadOnlyState(updatedRow);
      }
      populateSubmitSuccessModal(selection);
      closeDialogById('pp-payment-confirm-dialog');
      openDialogById('gp-submit-success-dialog');
    });
  }

  function initHeaderCancelAction() {
    var cancelBtn = document.getElementById('pp-header-cancel-btn');
    var confirmBtn = document.getElementById('pp-schedule-cancel-confirm-btn');
    if (!cancelBtn || !confirmBtn) return;

    function cancelScheduledPayment() {
      if (!isScheduledPayableRow(_payContext.row)) return;
      var updatedRow = movePayableBackToReady(_payContext.row);
      if (!updatedRow) return;
      _payContext.row = updatedRow;
      populatePage(updatedRow, _payContext.payeeProfile);
      applyConfirmedScheduleDate('');
      updatePayStepStates();
      applyConfirmedPayPageReadOnlyState(updatedRow);
    }

    cancelBtn.addEventListener('click', function (event) {
      event.preventDefault();
      if (!isScheduledPayableRow(_payContext.row)) return;
      openDialogById('pp-schedule-cancel-dialog');
    });

    confirmBtn.addEventListener('click', function () {
      cancelScheduledPayment();
      closeDialogById('pp-schedule-cancel-dialog');
    });
  }

  function initPayStepStatusObserver() {
    var signedBadge = document.getElementById('gp-signed-badge');
    if (!signedBadge || typeof MutationObserver === 'undefined') return;
    var observer = new MutationObserver(function () {
      updatePayStepStates();
    });
    observer.observe(signedBadge, { attributes: true, attributeFilter: ['class'] });
  }

  function getAccountLast4(account) {
    if (!account) return '';
    var v = String(account.last4 || '').trim();
    if (v) return v.slice(-4);
    var fromNum = String(account.accountNumber || '').replace(/\D/g, '');
    if (fromNum.length >= 4) return fromNum.slice(-4);
    var fromMask = String(account.maskedAccount || '').replace(/\D/g, '');
    if (fromMask.length >= 4) return fromMask.slice(-4);
    return '';
  }

  function getMaskedValue(value, visibleTail) {
    var raw = String(value == null ? '' : value).trim();
    if (!raw) return '--';
    if (/^[\u2022*Xx.\-\s\d]+$/.test(raw) && /[\u2022*Xx]/.test(raw)) return raw;
    var digits = raw.replace(/\D/g, '');
    var tailSize = Math.max(1, Number(visibleTail || 4));
    if (!digits) return raw;
    if (digits.length <= tailSize) return digits;
    return '•'.repeat(Math.max(4, digits.length - tailSize)) + digits.slice(-tailSize);
  }

  function buildBankOptionHtml(account) {
    var rawLabel = String(account.displayName || account.bankName || 'My Bank Account');
    var cleanLabel = rawLabel.replace(/\s+[•*xX.]{3,}\s*\d{2,6}\s*$/, '').trim();
    var label = escapeHtml(cleanLabel || rawLabel);
    var last4 = getAccountLast4(account);
    var summary = escapeHtml(last4 ? ('••••' + last4) : 'Bank account');
    return (
      '<el-option value="' + escapeHtml(String(account.id || '')) + '" class="group/option relative block cursor-default select-none border-b border-gray-200 py-3 pr-4 pl-3 text-gray-900 aria-selected:bg-gray-100 focus:bg-gray-100 focus:outline-hidden dark:border-white/10 dark:text-white dark:aria-selected:bg-white/10 dark:focus:bg-white/10">' +
        '<div class="flex items-center gap-3">' +
          '<div class="shrink-0 text-gray-500 in-[el-selectedcontent]:text-gray-600 dark:text-gray-400 dark:in-[el-selectedcontent]:text-gray-400">' +
            '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 18 18" fill="none"><path fill-rule="evenodd" clip-rule="evenodd" d="M8.7075 1.86718C8.8929 1.77767 9.10901 1.77767 9.29441 1.86718L15.8194 5.01718C16.1552 5.17925 16.2959 5.58279 16.1339 5.9185C15.9827 6.23168 15.6213 6.37521 15.301 6.26151V14.85H15.526C15.8988 14.85 16.201 15.1523 16.201 15.525C16.201 15.8978 15.8988 16.2 15.526 16.2H2.47594C2.10314 16.2 1.80094 15.8978 1.80094 15.525C1.80094 15.1523 2.10314 14.85 2.47594 14.85H2.70094V6.26151C2.38057 6.37521 2.01925 6.23168 1.86806 5.9185C1.70599 5.58279 1.84676 5.17925 2.18248 5.01718L8.7075 1.86718ZM9.90081 5.40005C9.90081 5.89711 9.49786 6.30005 9.0008 6.30005C8.50375 6.30005 8.1008 5.89711 8.1008 5.40005C8.1008 4.90299 8.50375 4.50005 9.0008 4.50005C9.49786 4.50005 9.90081 4.90299 9.90081 5.40005ZM6.7508 8.77505C6.7508 8.40226 6.44859 8.10005 6.07579 8.10005C5.703 8.10005 5.40079 8.40226 5.40079 8.77505V13.725C5.40079 14.0978 5.703 14.4 6.07579 14.4C6.44859 14.4 6.7508 14.0978 6.7508 13.725V8.77505ZM9.6758 8.77505C9.6758 8.40226 9.3736 8.10005 9.0008 8.10005C8.62801 8.10005 8.3258 8.40226 8.3258 8.77505V13.725C8.3258 14.0978 8.62801 14.4 9.0008 14.4C9.3736 14.4 9.6758 14.0978 9.6758 13.725V8.77505ZM12.6008 8.77505C12.6008 8.40226 12.2986 8.10005 11.9258 8.10005C11.553 8.10005 11.2508 8.40226 11.2508 8.77505V13.725C11.2508 14.0978 11.553 14.4 11.9258 14.4C12.2986 14.4 12.6008 14.0978 12.6008 13.725V8.77505Z" fill="#6B7280"/></svg>' +
          '</div>' +
          '<div class="in-[el-selectedcontent]:hidden">' +
            '<span class="block truncate font-medium group-aria-selected/option:font-semibold">' + label + '</span>' +
            '<span class="block text-sm text-gray-500 dark:text-gray-400">' + summary + '</span>' +
          '</div>' +
          '<span class="hidden in-[el-selectedcontent]:block truncate font-medium">' + label + (last4 ? (' ••••' + last4) : '') + '</span>' +
        '</div>' +
        '<span class="absolute inset-y-0 right-0 flex items-center pr-3 text-blue-600 group-not-aria-selected/option:hidden in-[el-selectedcontent]:hidden">' +
          '<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" class="size-5"><path d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clip-rule="evenodd" fill-rule="evenodd" /></svg>' +
        '</span>' +
      '</el-option>'
    );
  }

  function buildSelectedBankContent(account) {
    var rawLabel = String(account.displayName || account.bankName || 'My Bank Account');
    var cleanLabel = rawLabel.replace(/\s+[•*xX.]{3,}\s*\d{2,6}\s*$/, '').trim();
    var label = escapeHtml(cleanLabel || rawLabel);
    var last4 = getAccountLast4(account);
    var summary = escapeHtml(last4 ? ('••••' + last4) : 'Bank account');
    return (
      '<span class="shrink-0 text-gray-500 dark:text-gray-400">' +
        '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 18 18" fill="none"><path fill-rule="evenodd" clip-rule="evenodd" d="M8.7075 1.86718C8.8929 1.77767 9.10901 1.77767 9.29441 1.86718L15.8194 5.01718C16.1552 5.17925 16.2959 5.58279 16.1339 5.9185C15.9827 6.23168 15.6213 6.37521 15.301 6.26151V14.85H15.526C15.8988 14.85 16.201 15.1523 16.201 15.525C16.201 15.8978 15.8988 16.2 15.526 16.2H2.47594C2.10314 16.2 1.80094 15.8978 1.80094 15.525C1.80094 15.1523 2.10314 14.85 2.47594 14.85H2.70094V6.26151C2.38057 6.37521 2.01925 6.23168 1.86806 5.9185C1.70599 5.58279 1.84676 5.17925 2.18248 5.01718L8.7075 1.86718ZM9.90081 5.40005C9.90081 5.89711 9.49786 6.30005 9.0008 6.30005C8.50375 6.30005 8.1008 5.89711 8.1008 5.40005C8.1008 4.90299 8.50375 4.50005 9.0008 4.50005C9.49786 4.50005 9.90081 4.90299 9.90081 5.40005ZM6.7508 8.77505C6.7508 8.40226 6.44859 8.10005 6.07579 8.10005C5.703 8.10005 5.40079 8.40226 5.40079 8.77505V13.725C5.40079 14.0978 5.703 14.4 6.07579 14.4C6.44859 14.4 6.7508 14.0978 6.7508 13.725V8.77505ZM9.6758 8.77505C9.6758 8.40226 9.3736 8.10005 9.0008 8.10005C8.62801 8.10005 8.3258 8.40226 8.3258 8.77505V13.725C8.3258 14.0978 8.62801 14.4 9.0008 14.4C9.3736 14.4 9.6758 14.0978 9.6758 13.725V8.77505ZM12.6008 8.77505C12.6008 8.40226 12.2986 8.10005 11.9258 8.10005C11.553 8.10005 11.2508 8.40226 11.2508 8.77505V13.725C11.2508 14.0978 11.553 14.4 11.9258 14.4C12.2986 14.4 12.6008 14.0978 12.6008 13.725V8.77505Z" fill="#6B7280"/></svg>' +
      '</span>' +
      '<span class="truncate font-medium">' + label + (last4 ? (' ••••' + escapeHtml(last4)) : '') + '</span>'
    );
  }

  function buildPayeeBankOptionHtml(account) {
    if (!account) return '';
    var mapped = Object.assign({}, account, {
      displayName: account.displayName || account.label || account.bankName || 'Bank Account',
      last4: getAccountLast4(account),
    });
    return buildBankOptionHtml(mapped);
  }

  function setMaskedField(id, masked, revealed, shownRevealed) {
    var el = document.getElementById(id);
    if (!el) return;
    var safeMasked = String(masked == null || masked === '' ? '--' : masked);
    var safeRevealed = String(revealed == null || revealed === '' ? safeMasked : revealed);
    el.setAttribute('data-masked', safeMasked);
    el.setAttribute('data-revealed', safeRevealed);
    el.textContent = shownRevealed ? safeRevealed : safeMasked;
  }

  function buildSimpleOptionHtml(value, label, subtitle, iconSvg, selectedIconSvg) {
    var iconBlock = '';
    if (iconSvg && selectedIconSvg) {
      iconBlock =
        '<div class="shrink-0 in-[el-selectedcontent]:hidden">' + iconSvg + '</div>' +
        '<div class="hidden shrink-0 in-[el-selectedcontent]:block">' + selectedIconSvg + '</div>';
    } else if (iconSvg) {
      iconBlock =
        '<div class="shrink-0 text-blue-600 in-[el-selectedcontent]:text-gray-600 dark:in-[el-selectedcontent]:text-gray-400">' +
          iconSvg +
        '</div>';
    }
    return (
      '<el-option value="' + escapeHtml(value) + '" class="group/option relative block cursor-default select-none border-b border-gray-200 py-3 pr-4 pl-3 text-gray-900 aria-selected:bg-gray-100 focus:bg-gray-100 focus:outline-hidden dark:border-white/10 dark:text-white dark:aria-selected:bg-white/10 dark:focus:bg-white/10">' +
        '<div class="flex items-center gap-3">' +
          iconBlock +
          '<div class="in-[el-selectedcontent]:hidden">' +
            '<span class="block truncate font-normal group-aria-selected/option:font-semibold">' + escapeHtml(label) + '</span>' +
            (subtitle ? '<span class="block text-sm text-gray-500 dark:text-gray-400">' + escapeHtml(subtitle) + '</span>' : '') +
          '</div>' +
          '<span class="hidden in-[el-selectedcontent]:block truncate font-medium">' + escapeHtml(label + (value ? (' • ' + value) : '')) + '</span>' +
        '</div>' +
        '<span class="absolute inset-y-0 right-0 flex items-center pr-3 text-blue-600 group-not-aria-selected/option:hidden in-[el-selectedcontent]:hidden">' +
          '<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" class="size-5"><path d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clip-rule="evenodd" fill-rule="evenodd" /></svg>' +
        '</span>' +
      '</el-option>'
    );
  }

  function buildCheckAddressOptionHtml(address) {
    var displayName = String((address && (address.label || address.displayName || address.name)) || 'Mailing Address');
    var fullAddress = String((address && (address.address || address.summary || '')) || '');
    var iconSolid =
      '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">' +
        '<path d="M16.25 2C16.6642 2 17 2.33579 17 2.75C17 3.16421 16.6642 3.5 16.25 3.5H16V16.5H16.25C16.6642 16.5 17 16.8358 17 17.25C17 17.6642 16.6642 18 16.25 18H12.75C12.3358 18 12 17.6642 12 17.25V14.75C12 14.3358 11.6642 14 11.25 14H8.75C8.33579 14 8 14.3358 8 14.75V17.25C8 17.6642 7.66421 18 7.25 18H3.75C3.33579 18 3 17.6642 3 17.25C3 16.8358 3.33579 16.5 3.75 16.5H4V3.5H3.75C3.33579 3.5 3 3.16421 3 2.75C3 2.33579 3.33579 2 3.75 2H16.25ZM7.5 9C7.22386 9 7 9.22386 7 9.5V10.5C7 10.7761 7.22386 11 7.5 11H8.5C8.77614 11 9 10.7761 9 10.5V9.5C9 9.22386 8.77614 9 8.5 9H7.5ZM11.5 9C11.2239 9 11 9.22386 11 9.5V10.5C11 10.7761 11.2239 11 11.5 11H12.5C12.7761 11 13 10.7761 13 10.5V9.5C13 9.22386 12.7761 9 12.5 9H11.5ZM7.5 5C7.22386 5 7 5.22386 7 5.5V6.5C7 6.77614 7.22386 7 7.5 7H8.5C8.77614 7 9 6.77614 9 6.5V5.5C9 5.22386 8.77614 5 8.5 5H7.5ZM11.5 5C11.2239 5 11 5.22386 11 5.5V6.5C11 6.77614 11.2239 7 11.5 7H12.5C12.7761 7 13 6.77614 13 6.5V5.5C13 5.22386 12.7761 5 12.5 5H11.5Z" fill="#6B7280" />' +
      '</svg>';

    return (
      '<el-option value="' + escapeHtml(String((address && address.id) || '')) + '" class="group/option relative block cursor-default select-none border-b border-gray-200 py-3 pr-4 pl-3 text-gray-900 aria-selected:bg-gray-100 focus:bg-gray-100 focus:outline-hidden dark:border-white/10 dark:text-white dark:aria-selected:bg-white/10 dark:focus:bg-white/10">' +
        '<div class="flex items-center gap-3">' +
          '<div class="shrink-0 text-gray-500 in-[el-selectedcontent]:text-gray-600 dark:text-gray-400 dark:in-[el-selectedcontent]:text-gray-400">' +
            iconSolid +
          '</div>' +
          '<div class="in-[el-selectedcontent]:hidden">' +
            '<span class="block truncate font-medium group-aria-selected/option:font-semibold">' + escapeHtml(displayName) + '</span>' +
            '<span class="block text-sm text-gray-500 dark:text-gray-400">' + escapeHtml(fullAddress) + '</span>' +
          '</div>' +
          '<span class="hidden in-[el-selectedcontent]:block truncate font-medium">' + escapeHtml(displayName) + '</span>' +
        '</div>' +
        '<span class="absolute inset-y-0 right-0 flex items-center pr-3 text-blue-600 group-not-aria-selected/option:hidden in-[el-selectedcontent]:hidden">' +
          '<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" class="size-5"><path d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clip-rule="evenodd" fill-rule="evenodd" /></svg>' +
        '</span>' +
      '</el-option>'
    );
  }

  function setSelectedContent(selectedEl, text, placeholder) {
    if (!selectedEl) return;
    if (!text) {
      selectedEl.innerHTML = '<span class="truncate font-normal text-gray-400 dark:text-gray-500">' + escapeHtml(placeholder || 'Select') + '</span>';
      return;
    }
    selectedEl.innerHTML = '<span class="truncate font-medium">' + escapeHtml(text) + '</span>';
  }

  function initSelect(selectId, selectedId, optionsId, items, placeholder, onChange) {
    var selectedEl = document.getElementById(selectedId);
    var optionsEl = document.getElementById(optionsId);
    if (!selectedEl || !optionsEl) return function () {};

    var list = Array.isArray(items) ? items.slice() : [];
    optionsEl.innerHTML = list.map(function (item) {
      return buildSimpleOptionHtml(String(item.id), item.label, item.subtitle, item.icon, item.selectedIcon);
    }).join('');
    setSelectedContent(selectedEl, '', placeholder);

    function apply(id) {
      var normalizedId = String(id || '');
      var selected = null;
      for (var i = 0; i < list.length; i++) {
        if (String(list[i].id) === normalizedId) { selected = list[i]; break; }
      }
      optionsEl.setAttribute('data-selected-value', selected ? normalizedId : '');
      optionsEl.querySelectorAll('el-option').forEach(function (opt) {
        if (String(opt.getAttribute('value') || '') === normalizedId && selected) opt.setAttribute('aria-selected', 'true');
        else opt.removeAttribute('aria-selected');
      });
      if (!selected) {
        setSelectedContent(selectedEl, '', placeholder);
        if (onChange) onChange(null);
        return;
      }
      var selectedHtml = buildSelectFilledContent(selected);
      if (selectedHtml) {
        selectedEl.innerHTML = selectedHtml;
      } else {
        setSelectedContent(selectedEl, selected.label, placeholder);
      }
      if (onChange) onChange(selected);
    }

    optionsEl.addEventListener('click', function (event) {
      var option = event.target.closest('el-option');
      if (!option) return;
      var optionValue = String(option.getAttribute('value') || '');
      var currentValue = String(optionsEl.getAttribute('data-selected-value') || '');
      if (currentValue && optionValue === currentValue) {
        apply('');
        return;
      }
      apply(optionValue);
    });

    return apply;
  }

  function hideAllPaymentMethodPanels() {
    ['gp-pmc-payers-card', 'gp-pmc-bank-account', 'gp-pmc-paper-check', 'gp-pmc-smart-disburse', 'gp-pmc-smart-exchange'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.classList.add('hidden');
    });
    var detailsWrap = document.getElementById('gp-payment-method-details');
    if (detailsWrap) detailsWrap.classList.add('hidden');
    var bankDetails = document.getElementById('gp-pmc-bank-details');
    var checkDetails = document.getElementById('gp-pmc-check-details');
    var smartDisburseDetails = document.getElementById('gp-pmc-smart-disburse-details');
    var smartExchangeDetails = document.getElementById('gp-pmc-smart-exchange-details');
    if (bankDetails) bankDetails.classList.add('hidden');
    if (checkDetails) checkDetails.classList.add('hidden');
    if (smartDisburseDetails) smartDisburseDetails.classList.add('hidden');
    if (smartExchangeDetails) smartExchangeDetails.classList.add('hidden');
  }

  function setBankCopyVisible(buttonId, visible) {
    var btn = document.getElementById(buttonId);
    if (!btn) return;
    var icon = btn.querySelector('[data-copy-icon="true"]');
    btn.setAttribute('data-copy-enabled', visible ? 'true' : 'false');
    if (visible) {
      btn.classList.remove('pointer-events-none');
      btn.classList.add('cursor-pointer', 'transition-colors', 'hover:bg-gray-200', 'dark:hover:bg-white/20');
      if (icon) icon.classList.remove('hidden');
    } else {
      btn.classList.add('pointer-events-none');
      btn.classList.remove('cursor-pointer', 'transition-colors', 'hover:bg-gray-200', 'dark:hover:bg-white/20');
      if (icon) icon.classList.add('hidden');
    }
  }

  function initBankRevealToggle(account) {
    var btn = document.getElementById('gp-pmc-reveal-btn');
    var acctEl = document.getElementById('gp-pmc-bank-acct');
    var routingEl = document.getElementById('gp-pmc-bank-routing');
    if (!btn || !acctEl || !routingEl) return;

    var revealed = false;
    function render() {
      var revealIcon = btn.querySelector('[data-icon="reveal"]');
      var hideIcon = btn.querySelector('[data-icon="hide"]');
      var txt = document.getElementById('gp-pmc-reveal-text');
      if (revealIcon) revealIcon.classList.toggle('hidden', revealed);
      if (hideIcon) hideIcon.classList.toggle('hidden', !revealed);
      if (txt) txt.textContent = revealed ? 'Hide Details' : 'Reveal Details';
      acctEl.textContent = revealed ? (account.accountNumber || account.maskedAccount || '--') : (account.maskedAccount || '--');
      routingEl.textContent = revealed ? (account.routingNumber || account.maskedRouting || '--') : (account.maskedRouting || '--');
      setBankCopyVisible('gp-pmc-bank-acct-copy-btn', revealed);
      setBankCopyVisible('gp-pmc-bank-routing-copy-btn', revealed);
    }

    btn.onclick = function () {
      revealed = !revealed;
      render();
    };
    render();
  }

  function findPayeeProfile(payeesList, row) {
    var list = Array.isArray(payeesList) ? payeesList : [];
    var payeeId = row && row.payeeId ? String(row.payeeId) : '';
    if (payeeId) {
      for (var j = 0; j < list.length; j++) {
        if (list[j] && String(list[j].id) === payeeId) return list[j];
      }
    }
    for (var i = 0; i < list.length; i++) {
      if (list[i] && String(list[i].name) === String(row && row.payeeName)) return list[i];
    }
    return null;
  }

  function getPayeesArray(payload) {
    if (Array.isArray(payload)) return payload;
    if (payload && Array.isArray(payload.data)) return payload.data;
    return [];
  }

  function normalizeMethods(profile, fallbackBanks, fallbackAddresses) {
    var methods = profile && profile.paymentMethods ? profile.paymentMethods : {};
    var ach = Array.isArray(methods.ach) && methods.ach.length ? methods.ach : (fallbackBanks || []).map(function (b, idx) {
      return {
        id: 'ach-fallback-' + idx,
        label: (b.displayName || b.bankName || 'Bank'),
        accountName: b.name || (_payContext.row && _payContext.row.payeeName) || 'Payee',
        bankName: b.bankName || 'Bank',
        maskedAccount: b.maskedAccount || getMaskedValue(b.accountNumber, 4),
        accountNumber: b.accountNumber || '',
        maskedRouting: b.maskedRouting || getMaskedValue(b.routingNumber, 4),
        routingNumber: b.routingNumber || '',
        address: b.address || '--'
      };
    });
    var wire = Array.isArray(methods.wire) ? methods.wire : [];
    var card = Array.isArray(methods.card) && methods.card.length ? methods.card : [{
      id: 'card-fallback',
      label: 'Visa •••• 5511',
      cardholderName: _payContext.row ? _payContext.row.payeeName : 'Payee',
      cardholderAddress: '--'
    }];
    var check = Array.isArray(methods.check) ? methods.check : [];
    var smartDisburse = Array.isArray(methods.smartDisburse) && methods.smartDisburse.length ? methods.smartDisburse : [{
      id: 'sd-fallback',
      label: 'Default SMART Disburse',
      channel: 'Token',
      destination: 'smart-disburse-endpoint',
      contactPerson: (_payContext.row && _payContext.row.payeeName) || 'Payee',
      contacts: [{
        id: 'sd-fallback-email',
        type: 'email',
        label: (_payContext.row && _payContext.row.payeeName) || 'Payee',
        value: 'ap@payee.example'
      }]
    }];
    var smartExchange = Array.isArray(methods.smartExchange) ? methods.smartExchange : [];

    // Fallback addresses for check (if provided by data and check method exists)
    if (!check.length && methods.check && fallbackAddresses && fallbackAddresses.length) {
      fallbackAddresses.forEach(function (a, idx) {
        check.push({
          id: a.id || ('check-fallback-' + idx),
          label: a.displayName || 'Mailing Address',
          name: a.name || (_payContext.row && _payContext.row.payeeName) || 'Payee',
          address: a.address || a.summary || '--'
        });
      });
    }
    smartDisburse = smartDisburse.map(function (profileEntry, idx) {
      var contactPerson = String((profileEntry && profileEntry.contactPerson) || profileEntry.label || (_payContext.row && _payContext.row.payeeName) || 'Payee');
      var contacts = Array.isArray(profileEntry && profileEntry.contacts) ? profileEntry.contacts : [];
      if (!contacts.length && profileEntry && profileEntry.destination) {
        contacts = [{
          id: String((profileEntry.id || ('sd-contact-' + idx)) + '-default'),
          type: String(profileEntry.channel || '').toLowerCase() === 'sms' ? 'phone' : 'email',
          label: contactPerson,
          value: String(profileEntry.destination)
        }];
      }
      return Object.assign({}, profileEntry, {
        contactPerson: contactPerson,
        contacts: contacts
      });
    });
    smartExchange = smartExchange.map(function (profileEntry, idx) {
      var contactPerson = String((profileEntry && profileEntry.contactPerson) || profileEntry.label || (_payContext.row && _payContext.row.payeeName) || 'Payee');
      var contacts = Array.isArray(profileEntry && profileEntry.contacts) ? profileEntry.contacts : [];
      if (!contacts.length && profileEntry && profileEntry.destination) {
        contacts = [{
          id: String((profileEntry.id || ('sx-contact-' + idx)) + '-default'),
          type: String(profileEntry.channel || '').toLowerCase() === 'sms' ? 'phone' : 'email',
          label: contactPerson,
          value: String(profileEntry.destination)
        }];
      }
      return Object.assign({}, profileEntry, {
        contactPerson: contactPerson,
        contacts: contacts
      });
    });

    return { ach: ach, wire: wire, card: card, check: check, smartDisburse: smartDisburse, smartExchange: smartExchange };
  }

  function getSmartDisburseContactIcon(type) {
    var kind = String(type || '').toLowerCase();
    if (kind === 'phone' || kind === 'sms') {
      return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="size-5"><path d="M10.5 18.75a.75.75 0 0 0 0 1.5h3a.75.75 0 0 0 0-1.5h-3Z" /><path fill-rule="evenodd" d="M8.625.75A3.375 3.375 0 0 0 5.25 4.125v15.75a3.375 3.375 0 0 0 3.375 3.375h6.75a3.375 3.375 0 0 0 3.375-3.375V4.125A3.375 3.375 0 0 0 15.375.75h-6.75ZM7.5 4.125C7.5 3.504 8.004 3 8.625 3H9.75v.375c0 .621.504 1.125 1.125 1.125h2.25c.621 0 1.125-.504 1.125-1.125V3h1.125c.621 0 1.125.504 1.125 1.125v15.75c0 .621-.504 1.125-1.125 1.125h-6.75A1.125 1.125 0 0 1 7.5 19.875V4.125Z" clip-rule="evenodd" /></svg>';
    }
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="size-5"><path d="M1.5 8.67v8.58a3 3 0 0 0 3 3h15a3 3 0 0 0 3-3V8.67l-8.928 5.493a3 3 0 0 1-3.144 0L1.5 8.67Z" /><path d="M22.5 6.908V6.75a3 3 0 0 0-3-3h-15a3 3 0 0 0-3 3v.158l9.714 5.978a1.5 1.5 0 0 0 1.572 0L22.5 6.908Z" /></svg>';
  }

  function buildSmartDisburseContactOptionHtml(contact) {
    var id = String((contact && contact.id) || '');
    var label = String((contact && contact.label) || (contact && contact.contactPerson) || 'Contact');
    var value = String((contact && contact.value) || (contact && contact.destination) || '');
    var icon = getSmartDisburseContactIcon(contact && contact.type);
    return (
      '<button type="button" data-contact-id="' + escapeHtml(id) + '" class="group/option relative block w-full cursor-pointer select-none border-b border-gray-200 py-3 pr-4 pl-3 text-left text-gray-900 hover:bg-gray-100 focus:bg-gray-100 focus:outline-hidden dark:border-white/10 dark:text-white dark:hover:bg-white/10 dark:focus:bg-white/10">' +
        '<div class="flex items-center gap-3">' +
          '<div class="shrink-0 text-gray-500 dark:text-gray-400">' +
            icon +
          '</div>' +
          '<div>' +
            '<span class="block truncate font-medium">' + escapeHtml(label) + '</span>' +
            '<span class="block text-sm text-gray-500 dark:text-gray-400">' + escapeHtml(value) + '</span>' +
          '</div>' +
        '</div>' +
      '</button>'
    );
  }

  function collectSmartDisburseContacts(smartDisburseProfiles) {
    var profiles = Array.isArray(smartDisburseProfiles) ? smartDisburseProfiles : [];
    var contacts = [];
    profiles.forEach(function (profile) {
      var profileContacts = Array.isArray(profile && profile.contacts) ? profile.contacts : [];
      if (!profileContacts.length && profile) {
        profileContacts = [{
          id: String(profile.id || 'sd-contact') + '-fallback',
          type: String(profile.channel || '').toLowerCase() === 'sms' ? 'phone' : 'email',
          label: profile.contactPerson || profile.label || ((_payContext.row && _payContext.row.payeeName) || 'Contact'),
          value: profile.destination || '--'
        }];
      }
      profileContacts.forEach(function (entry, idx) {
        var value = String((entry && (entry.value || entry.destination)) || '').trim();
        if (!value || value === '--') return;
        contacts.push(Object.assign({}, entry, {
          id: String((entry && entry.id) || (profile.id || 'sd') + '-contact-' + idx)
        }));
      });
    });
    contacts.push(
      { id: 'sd-ref-1', type: 'email', label: 'Dorian Ionescu', value: 'dorian.ionescu@example.com' },
      { id: 'sd-ref-2', type: 'phone', label: 'Dorian Ionescu', value: '+1 (415) 555-0117' },
      { id: 'sd-ref-3', type: 'phone', label: 'Ana Dumitru', value: '+1 (415) 555-0199' }
    );
    return contacts;
  }

  function initDestinationTypeahead(config, contacts) {
    var combo = document.getElementById(config.comboboxId);
    var tokenHost = document.getElementById(config.tokensId);
    var input = document.getElementById(config.inputId);
    var list = document.getElementById(config.listId);
    if (!combo || !tokenHost || !input || !list) return;

    var allContacts = Array.isArray(contacts) ? contacts.slice() : [];
    var tokens = [];
    var isReadOnly = isConfirmedPayableRow(_payContext.row);

    function startsWith(value, query) {
      return String(value || '').toLowerCase().indexOf(String(query || '').toLowerCase()) === 0;
    }

    function filterContacts(query) {
      var q = String(query || '').trim();
      if (!q) return allContacts.slice();
      return allContacts.filter(function (contact) {
        var label = String(contact && contact.label || '');
        var val = String(contact && (contact.value || contact.destination) || '');
        return startsWith(label, q) || startsWith(val, q);
      });
    }

    function tokenText(token) {
      return String((token && (token.value || token.destination || token.label)) || '');
    }

    function tokenDisplayText(token) {
      var label = String((token && token.label) || '').trim();
      var value = tokenText(token).trim();
      if (label && value && label !== value) return label + ' · ' + value;
      return value || label;
    }

    function tokenKey(token) {
      return tokenText(token).toLowerCase();
    }

    function setInputWeight() {
      if (String(input.value || '').trim()) input.classList.replace('font-normal', 'font-medium');
      else input.classList.replace('font-medium', 'font-normal');
    }

    function renderTokens() {
      tokenHost.innerHTML = tokens.map(function (token, idx) {
        return '' +
          '<span data-token-label="' + escapeHtml(String((token && token.label) || '')) + '" data-token-value="' + escapeHtml(String((token && (token.value || token.destination || token.label)) || '')) + '" data-token-type="' + escapeHtml(String((token && token.type) || '')) + '" class="inline-flex max-w-full items-center gap-1 rounded-md bg-gray-100 px-2 py-0.5 text-sm font-medium text-gray-700 dark:bg-white/10 dark:text-gray-200">' +
          '  <span class="truncate">' + escapeHtml(tokenDisplayText(token)) + '</span>' +
          (isReadOnly ? '' : (
            '  <button type="button" data-token-remove="' + idx + '" class="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-sm text-gray-500 hover:bg-gray-200 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/10 dark:hover:text-gray-200 cursor-pointer" aria-label="Remove destination">' +
            '    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="size-3.5"><path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z"/></svg>' +
            '  </button>'
          )) +
          '</span>';
      }).join('');
      combo.setAttribute('data-token-count', String(tokens.length));
      input.placeholder = isReadOnly ? '' : (tokens.length ? '' : (config.placeholder || 'Choose destination'));
      input.classList.toggle('hidden', isReadOnly);
      input.disabled = !!isReadOnly;
      input.readOnly = !!isReadOnly;
      if (isReadOnly) {
        input.value = '';
        combo.classList.add('min-h-0');
        combo.classList.remove('min-h-[38px]');
      } else {
        combo.classList.remove('min-h-0');
        combo.classList.add('min-h-[38px]');
      }
      updatePayStepStates();
    }

    function addToken(token) {
      if (!token) return;
      var key = tokenKey(token);
      for (var i = 0; i < tokens.length; i++) {
        if (tokenKey(tokens[i]) === key) return;
      }
      tokens.push(token);
      renderTokens();
    }

    function addFreeToken(rawText) {
      var text = String(rawText || '').trim();
      if (!text) return;
      addToken({ id: 'custom-' + Date.now(), label: '', value: text, type: 'custom' });
    }

    function renderList(query) {
      var items = filterContacts(query);
      if (!items.length) {
        list.innerHTML = '<div class="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">No saved destinations</div>';
        list.classList.remove('hidden');
        return;
      }
      list.innerHTML = items.map(function (contact) {
        return buildSmartDisburseContactOptionHtml(contact);
      }).join('');
      list.classList.remove('hidden');
    }

    function commitSelectedContact(id) {
      var selected = null;
      allContacts.forEach(function (contact) {
        if (String(contact.id) === String(id)) selected = contact;
      });
      if (!selected) return;
      addToken(selected);
      input.value = '';
      list.classList.add('hidden');
      setInputWeight();
    }

    list.onmousedown = function (event) {
      var option = event.target.closest('[data-contact-id]');
      if (!option) return;
      // Commit selection before input blur can hide the list.
      event.preventDefault();
      commitSelectedContact(String(option.getAttribute('data-contact-id') || ''));
      input.focus();
    };

    list.onclick = function () {
      // Selection is handled on mousedown to avoid blur timing issues.
    };

    tokenHost.onclick = function (event) {
      if (isReadOnly) return;
      var removeBtn = event.target.closest('[data-token-remove]');
      if (!removeBtn) return;
      var idx = Number(removeBtn.getAttribute('data-token-remove'));
      if (isNaN(idx) || idx < 0 || idx >= tokens.length) return;
      tokens.splice(idx, 1);
      renderTokens();
      input.focus();
    };

    input.onfocus = function () {
      if (isReadOnly) return;
      renderList(input.value);
    };

    input.oninput = function () {
      if (isReadOnly) return;
      setInputWeight();
      renderList(input.value);
      updatePayStepStates();
    };

    input.onkeydown = function (event) {
      if (isReadOnly) return;
      if ((event.key === 'Enter' || event.key === ',' || event.key === 'Tab') && String(input.value || '').trim()) {
        event.preventDefault();
        addFreeToken(input.value);
        input.value = '';
        setInputWeight();
        renderList('');
        return;
      }
      if (event.key === 'Backspace' && !String(input.value || '').trim() && tokens.length) {
        tokens.pop();
        renderTokens();
      }
    };

    input.onblur = function () {
      if (isReadOnly) {
        list.classList.add('hidden');
        return;
      }
      window.setTimeout(function () {
        if (String(input.value || '').trim()) {
          addFreeToken(input.value);
          input.value = '';
          setInputWeight();
        }
        list.classList.add('hidden');
      }, 120);
    };

    input.value = '';
    tokens = [];
    setInputWeight();
    renderTokens();
    list.classList.add('hidden');

    return {
      setTokens: function (nextTokens) {
        tokens = (Array.isArray(nextTokens) ? nextTokens : []).map(function (token, idx) {
          var value = String((token && (token.value || token.destination || token.label)) || '').trim();
          if (!value) return null;
          return {
            id: String((token && token.id) || ('saved-token-' + idx)),
            label: String((token && token.label) || '').trim(),
            value: value,
            type: String((token && token.type) || '').trim() || (value.indexOf('@') !== -1 ? 'email' : 'custom')
          };
        }).filter(Boolean);
        input.value = '';
        setInputWeight();
        renderTokens();
        list.classList.add('hidden');
      }
    };
  }

  function initSmartDisburseTypeahead(contacts) {
    return initDestinationTypeahead({
      comboboxId: 'pp-smart-disburse-contact-combobox',
      tokensId: 'pp-smart-disburse-contact-tokens',
      inputId: 'pp-smart-disburse-contact-input',
      listId: 'pp-smart-disburse-contact-list',
      placeholder: 'Choose destination'
    }, contacts);
  }

  function initSmartExchangeTypeahead(contacts) {
    return initDestinationTypeahead({
      comboboxId: 'pp-smart-exchange-contact-combobox',
      tokensId: 'pp-smart-exchange-contact-tokens',
      inputId: 'pp-smart-exchange-contact-input',
      listId: 'pp-smart-exchange-contact-list',
      placeholder: 'Choose destination'
    }, contacts);
  }

  function initCardDeliveryTypeahead(contacts) {
    return initDestinationTypeahead({
      comboboxId: 'pp-card-delivery-contact-combobox',
      tokensId: 'pp-card-delivery-contact-tokens',
      inputId: 'pp-card-delivery-contact-input',
      listId: 'pp-card-delivery-contact-list',
      placeholder: 'Choose destination'
    }, contacts);
  }

  function initCardDeliveryTypeahead(contacts) {
    return initDestinationTypeahead({
      comboboxId: 'pp-card-delivery-contact-combobox',
      tokensId: 'pp-card-delivery-contact-tokens',
      inputId: 'pp-card-delivery-contact-input',
      listId: 'pp-card-delivery-contact-list',
      placeholder: 'Choose destination'
    }, contacts);
  }

  function initPaymentMethodFlow(payeesList, row, fallbackBanks, fallbackAddresses, cardsData) {
    var detailsWrap = document.getElementById('gp-payment-method-details');
    if (!detailsWrap) return;
    _payContext.row = row || null;
    _payContext.payeeProfile = findPayeeProfile(payeesList, row);
    _cardFundingState.cards = getStoredCardsDataset(cardsData);
    var normalized = normalizeMethods(_payContext.payeeProfile, fallbackBanks, fallbackAddresses);
    var isReadyToPay = String((row && row.status) || '').toLowerCase() === 'ready_to_pay';
    var savedState = reconcileSavedPayPageState(
      row,
      getSavedPayPageState(row) || (!isReadyToPay ? buildFallbackPaidPayPageState(row, normalized, fallbackBanks) : null)
    );
    bindSmartTestEmailButton('smart_disburse');
    bindSmartTestEmailButton('smart_exchange');

    function applyBankRecipientSelection(accounts, bankSelContent, bankOpts, selectedId, placeholder) {
      var normalizedId = String(selectedId || '');
      var selected = null;
      (Array.isArray(accounts) ? accounts : []).forEach(function (account) {
        if (String(account.id) === normalizedId) selected = account;
      });
      bankOpts.setAttribute('data-selected-value', selected ? normalizedId : '');
      bankOpts.querySelectorAll('el-option').forEach(function (el) {
        if (String(el.getAttribute('value') || '') === normalizedId && selected) el.setAttribute('aria-selected', 'true');
        else el.removeAttribute('aria-selected');
      });
      if (!selected) {
        setSelectedContent(bankSelContent, '', placeholder);
        var hiddenDetails = document.getElementById('gp-pmc-bank-details');
        if (hiddenDetails) hiddenDetails.classList.add('hidden');
        return;
      }
      bankSelContent.innerHTML = buildSelectedBankContent({
        displayName: selected.label || selected.bankName || 'Bank Account',
        bankName: selected.bankName || '',
        last4: getAccountLast4(selected),
        accountNumber: selected.accountNumber || '',
        maskedAccount: selected.maskedAccount || ''
      });
      setText('gp-pmc-bank-name-val', selected.accountName || _payContext.row.payeeName);
      setText('gp-pmc-bank-acct', selected.maskedAccount);
      setText('gp-pmc-bank-routing', selected.maskedRouting);
      setText('gp-pmc-bank-address', selected.address);
      var details = document.getElementById('gp-pmc-bank-details');
      if (details) details.classList.remove('hidden');
      initBankRevealToggle(selected);
    }

    function applyCardSelection(cardOpts, cardContent, selectedId, cardSearchInput) {
      var normalizedId = String(selectedId || '');
      var selected = null;
      _cardFundingState.cards.forEach(function (card) {
        if (String(card.id) === normalizedId) selected = card;
      });
      cardOpts.setAttribute('data-selected-value', selected ? normalizedId : '');
      cardOpts.querySelectorAll('el-option').forEach(function (el) {
        if (String(el.getAttribute('value') || '') === normalizedId && selected) el.setAttribute('aria-selected', 'true');
        else el.removeAttribute('aria-selected');
      });
      if (!selected) {
        setSelectedContent(cardContent, '', 'Select card');
        _cardFundingState.selectedCardId = '';
        _cardFundingState.pendingNewCard = null;
        _cardFundingState.fundingMethod = '';
        _cardFundingState.fundingAmount = '';
        renderCardFundingMethodOptions();
        syncFundingAmountInput();
        renderCardBalanceSummary();
        return;
      }
      _cardFundingState.pendingNewCard = null;
      _cardFundingState.selectedCardId = String(selected.id || '');
      cardContent.innerHTML = buildCardSelectContent(selected);
      if (cardContent) cardContent.classList.remove('hidden');
      if (_cardFundingState.fundingMethod === 'spend_balance' && selected.currentBalance < getCurrentPayableAmountNumber()) {
        _cardFundingState.fundingMethod = '';
      }
      renderCardFundingMethodOptions();
      syncFundingAmountInput();
      renderCardBalanceSummary();
    }

    function syncCardSendingMethodDetails() {
      var deliveryDetails = document.getElementById('pp-card-delivery-details');
      if (!deliveryDetails) return;
      deliveryDetails.classList.toggle('hidden', String(_cardFundingState.sendingMethod || '') !== 'delivery_website');
    }

    function syncCardSendingMethodDetails() {
      var deliveryDetails = document.getElementById('pp-card-delivery-details');
      if (deliveryDetails) {
        deliveryDetails.classList.toggle('hidden', String(_cardFundingState.sendingMethod || '') !== 'delivery_website');
      }
    }

    function applyCheckSelection(checkSelContent, checkOpts, selectedId) {
      var normalizedId = String(selectedId || '');
      var selected = null;
      normalized.check.forEach(function (entry) {
        if (String(entry.id) === normalizedId) selected = entry;
      });
      checkOpts.setAttribute('data-selected-value', selected ? normalizedId : '');
      checkOpts.querySelectorAll('el-option').forEach(function (el) {
        if (String(el.getAttribute('value') || '') === normalizedId && selected) el.setAttribute('aria-selected', 'true');
        else el.removeAttribute('aria-selected');
      });
      if (!selected) {
        setSelectedContent(checkSelContent, '', 'Select mailing address');
        var emptyDetails = document.getElementById('gp-pmc-check-details');
        if (emptyDetails) emptyDetails.classList.add('hidden');
        var emptyFields = document.getElementById('gp-pmc-check-fields');
        if (emptyFields) emptyFields.classList.add('hidden');
        return;
      }
      checkSelContent.innerHTML = buildSelectFilledContent({
        label: selected.label || selected.displayName || selected.name || 'Mailing Address',
        icon: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M16.25 2C16.6642 2 17 2.33579 17 2.75C17 3.16421 16.6642 3.5 16.25 3.5H16V16.5H16.25C16.6642 16.5 17 16.8358 17 17.25C17 17.6642 16.6642 18 16.25 18H12.75C12.3358 18 12 17.6642 12 17.25V14.75C12 14.3358 11.6642 14 11.25 14H8.75C8.33579 14 8 14.3358 8 14.75V17.25C8 17.6642 7.66421 18 7.25 18H3.75C3.33579 18 3 17.6642 3 17.25C3 16.8358 3.33579 16.5 3.75 16.5H4V3.5H3.75C3.33579 3.5 3 3.16421 3 2.75C3 2.33579 3.33579 2 3.75 2H16.25ZM7.5 9C7.22386 9 7 9.22386 7 9.5V10.5C7 10.7761 7.22386 11 7.5 11H8.5C8.77614 11 9 10.7761 9 10.5V9.5C9 9.22386 8.77614 9 8.5 9H7.5ZM11.5 9C11.2239 9 11 9.22386 11 9.5V10.5C11 10.7761 11.2239 11 11.5 11H12.5C12.7761 11 13 10.7761 13 10.5V9.5C13 9.22386 12.7761 9 12.5 9H11.5ZM7.5 5C7.22386 5 7 5.22386 7 5.5V6.5C7 6.77614 7.22386 7 7.5 7H8.5C8.77614 7 9 6.77614 9 6.5V5.5C9 5.22386 8.77614 5 8.5 5H7.5ZM11.5 5C11.2239 5 11 5.22386 11 5.5V6.5C11 6.77614 11.2239 7 11.5 7H12.5C12.7761 7 13 6.77614 13 6.5V5.5C13 5.22386 12.7761 5 12.5 5H11.5Z" fill="#6B7280" /></svg>',
        selectedIcon: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M16.25 2C16.6642 2 17 2.33579 17 2.75C17 3.16421 16.6642 3.5 16.25 3.5H16V16.5H16.25C16.6642 16.5 17 16.8358 17 17.25C17 17.6642 16.6642 18 16.25 18H12.75C12.3358 18 12 17.6642 12 17.25V14.75C12 14.3358 11.6642 14 11.25 14H8.75C8.33579 14 8 14.3358 8 14.75V17.25C8 17.6642 7.66421 18 7.25 18H3.75C3.33579 18 3 17.6642 3 17.25C3 16.8358 3.33579 16.5 3.75 16.5H4V3.5H3.75C3.33579 3.5 3 3.16421 3 2.75C3 2.33579 3.33579 2 3.75 2H16.25ZM7.5 9C7.22386 9 7 9.22386 7 9.5V10.5C7 10.7761 7.22386 11 7.5 11H8.5C8.77614 11 9 10.7761 9 10.5V9.5C9 9.22386 8.77614 9 8.5 9H7.5ZM11.5 9C11.2239 9 11 9.22386 11 9.5V10.5C11 10.7761 11.2239 11 11.5 11H12.5C12.7761 11 13 10.7761 13 10.5V9.5C13 9.22386 12.7761 9 12.5 9H11.5ZM7.5 5C7.22386 5 7 5.22386 7 5.5V6.5C7 6.77614 7.22386 7 7.5 7H8.5C8.77614 7 9 6.77614 9 6.5V5.5C9 5.22386 8.77614 5 8.5 5H7.5ZM11.5 5C11.2239 5 11 5.22386 11 5.5V6.5C11 6.77614 11.2239 7 11.5 7H12.5C12.7761 7 13 6.77614 13 6.5V5.5C13 5.22386 12.7761 5 12.5 5H11.5Z" fill="#6B7280" /></svg>'
      });
      setText('gp-pmc-check-name', selected.name || _payContext.row.payeeName);
      setText('gp-pmc-check-address', selected.address || '--');
      populateCheckDetails(selected);
      if (savedState) {
        setInputValue('gp-pmc-check-attention', savedState.checkAttention || '');
        setInputValue('gp-pmc-check-attention-mobile', savedState.checkAttention || '');
        setInputValue('gp-pmc-check-print-date', savedState.checkPrintDate || '');
        setInputValue('gp-pmc-check-print-date-mobile', savedState.checkPrintDate || '');
        setInputValue('gp-pmc-check-memo', savedState.checkMemo || '');
        setInputValue('gp-pmc-check-memo-mobile', savedState.checkMemo || '');
      }
      var details = document.getElementById('gp-pmc-check-details');
      if (details) details.classList.remove('hidden');
      var fields = document.getElementById('gp-pmc-check-fields');
      if (fields) fields.classList.remove('hidden');
    }

    var methodItems = [];
    if (normalized.smartDisburse.length) methodItems.push({
      id: 'smart_disburse',
      label: 'SMART Disburse',
      subtitle: 'Send a disbursement choice to payee',
      icon: '<svg width="20" height="20" viewBox="0 0 30 30" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M0 15C0 8.42504 0 5.13755 1.81592 2.92485C2.14835 2.51978 2.51978 2.14835 2.92485 1.81592C5.13755 0 8.42504 0 15 0C21.575 0 24.8624 0 27.0751 1.81592C27.4802 2.14835 27.8516 2.51978 28.1841 2.92485C30 5.13755 30 8.42504 30 15C30 21.575 30 24.8624 28.1841 27.0751C27.8516 27.4802 27.4802 27.8516 27.0751 28.1841C24.8624 30 21.575 30 15 30C8.42504 30 5.13755 30 2.92485 28.1841C2.51978 27.8516 2.14835 27.4802 1.81592 27.0751C0 24.8624 0 21.575 0 15Z" fill="#406AFF"/><g clip-path="url(#clip0_1_52615)"><path fill-rule="evenodd" clip-rule="evenodd" d="M17.1957 12.1938C17.3572 11.7655 17.7672 11.4819 18.225 11.4819L25.0389 11.4819L25.0389 14.0119L19.2141 14.0119L15.3171 24.3468L8.87305 24.3468V21.8168L13.5672 21.8168L17.1957 12.1938Z" fill="white"/><path d="M24.7528 10.5068L30.6071 10.5068L27.4891 18.7759H21.6348L24.7528 10.5068Z" fill="#406AFF"/><path d="M11.2713 18.3096L14.9017 18.3096L11.8374 26.4361H8.20703L8.58516 21.7889L10.0421 21.7445L11.2713 18.3096Z" fill="#406AFF"/><path fill-rule="evenodd" clip-rule="evenodd" d="M12.7711 17.8057C12.6096 18.234 12.1996 18.5176 11.7418 18.5176L4.92787 18.5176L4.92787 15.9876L10.7527 15.9876L14.6497 5.65271L21.0938 5.65271L21.0938 8.18271L16.3996 8.18271L12.7711 17.8057Z" fill="white"/><path d="M5.21403 19.4927L-0.640302 19.4927L2.47769 11.2236L8.33203 11.2236L5.21403 19.4927Z" fill="#406AFF"/><path d="M18.7942 10.832L15.0651 11.6899L18.1293 3.5634L21.7598 3.5634L21.4343 8.25497L19.9247 8.25497L18.7942 10.832Z" fill="#406AFF"/></g><defs><clipPath id="clip0_1_52615"><rect width="22" height="22" fill="white" transform="translate(4 4)"/></clipPath></defs></svg>',
      selectedIcon: '<svg width="20" height="20" viewBox="0 0 30 30" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M0 15C0 8.42504 0 5.13755 1.81592 2.92485C2.14835 2.51978 2.51978 2.14835 2.92485 1.81592C5.13755 0 8.42504 0 15 0C21.575 0 24.8624 0 27.0751 1.81592C27.4802 2.14835 27.8516 2.51978 28.1841 2.92485C30 5.13755 30 8.42504 30 15C30 21.575 30 24.8624 28.1841 27.0751C27.8516 27.4802 27.4802 27.8516 27.0751 28.1841C24.8624 30 21.575 30 15 30C8.42504 30 5.13755 30 2.92485 28.1841C2.51978 27.8516 2.14835 27.4802 1.81592 27.0751C0 24.8624 0 21.575 0 15Z" fill="#374151"/><g clip-path="url(#clip0_1_52615)"><path fill-rule="evenodd" clip-rule="evenodd" d="M17.1957 12.1938C17.3572 11.7655 17.7672 11.4819 18.225 11.4819L25.0389 11.4819L25.0389 14.0119L19.2141 14.0119L15.3171 24.3468L8.87305 24.3468V21.8168L13.5672 21.8168L17.1957 12.1938Z" fill="white"/><path d="M24.7528 10.5068L30.6071 10.5068L27.4891 18.7759H21.6348L24.7528 10.5068Z" fill="#374151"/><path d="M11.2713 18.3096L14.9017 18.3096L11.8374 26.4361H8.20703L8.58516 21.7889L10.0421 21.7445L11.2713 18.3096Z" fill="#374151"/><path fill-rule="evenodd" clip-rule="evenodd" d="M12.7711 17.8057C12.6096 18.234 12.1996 18.5176 11.7418 18.5176L4.92787 18.5176L4.92787 15.9876L10.7527 15.9876L14.6497 5.65271L21.0938 5.65271L21.0938 8.18271L16.3996 8.18271L12.7711 17.8057Z" fill="white"/><path d="M5.21403 19.4927L-0.640302 19.4927L2.47769 11.2236L8.33203 11.2236L5.21403 19.4927Z" fill="#374151"/><path d="M18.7942 10.832L15.0651 11.6899L18.1293 3.5634L21.7598 3.5634L21.4343 8.25497L19.9247 8.25497L18.7942 10.832Z" fill="#374151"/></g><defs><clipPath id="clip0_1_52615"><rect width="22" height="22" fill="white" transform="translate(4 4)"/></clipPath></defs></svg>'
    });
    if ((_payContext.payeeProfile && _payContext.payeeProfile.smartExchangeEnabled) && normalized.smartExchange.length) {
      methodItems.push({
        id: 'smart_exchange',
        label: 'SMART Exchange',
        subtitle: 'Pay inside SMART Exchange',
        icon: '<svg width="20" height="20" viewBox="0 0 30 30" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M0 15C0 8.42504 0 5.13755 1.81592 2.92485C2.14835 2.51978 2.51978 2.14835 2.92485 1.81592C5.13755 0 8.42504 0 15 0C21.575 0 24.8624 0 27.0751 1.81592C27.4802 2.14835 27.8516 2.51978 28.1841 2.92485C30 5.13755 30 8.42504 30 15C30 21.575 30 24.8624 28.1841 27.0751C27.8516 27.4802 27.4802 27.8516 27.0751 28.1841C24.8624 30 21.575 30 15 30C8.42504 30 5.13755 30 2.92485 28.1841C2.51978 27.8516 2.14835 27.4802 1.81592 27.0751C0 24.8624 0 21.575 0 15Z" fill="#F5B842"/><g clip-path="url(#clip0_1_52857)"><path fill-rule="evenodd" clip-rule="evenodd" d="M10.9763 14.5594L4.7793 14.5594L4.7793 17.0894L13.839 17.0894C14.2234 17.0894 14.4893 16.705 14.3536 16.3453L9.71431 4.04161L7.34701 4.93424L10.9763 14.5594Z" fill="white"/><rect width="10.7121" height="4.21913" transform="matrix(-1 0 0 1 17.5586 1.46387)" fill="#F5B842"/><path d="M4.67241 12.4575H2.14395L4.8856 19.7285H7.41406L4.67241 12.4575Z" fill="#F5B842"/><path fill-rule="evenodd" clip-rule="evenodd" d="M19.0237 15.4387L25.2207 15.4387L25.2207 12.9087L16.161 12.9087C15.7766 12.9087 15.5107 13.293 15.6464 13.6527L20.2857 25.9564L22.653 25.0638L19.0237 15.4387Z" fill="white"/><rect width="10.7121" height="4.21913" transform="matrix(1 1.74846e-07 1.74846e-07 -1 12.4414 28.5342)" fill="#F5B842"/><path d="M25.3276 17.5405L27.8561 17.5405L25.1144 10.2695L22.5859 10.2695L25.3276 17.5405Z" fill="#F5B842"/></g><defs><clipPath id="clip0_1_52857"><rect width="22" height="22" fill="white" transform="translate(4 3.99902)"/></clipPath></defs></svg>',
        selectedIcon: '<svg width="20" height="20" viewBox="0 0 30 30" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M0 15C0 8.42504 0 5.13755 1.81592 2.92485C2.14835 2.51978 2.51978 2.14835 2.92485 1.81592C5.13755 0 8.42504 0 15 0C21.575 0 24.8624 0 27.0751 1.81592C27.4802 2.14835 27.8516 2.51978 28.1841 2.92485C30 5.13755 30 8.42504 30 15C30 21.575 30 24.8624 28.1841 27.0751C27.8516 27.4802 27.4802 27.8516 27.0751 28.1841C24.8624 30 21.575 30 15 30C8.42504 30 5.13755 30 2.92485 28.1841C2.51978 27.8516 2.14835 27.4802 1.81592 27.0751C0 24.8624 0 21.575 0 15Z" fill="#374151"/><g clip-path="url(#clip0_1_52857)"><path fill-rule="evenodd" clip-rule="evenodd" d="M10.9763 14.5594L4.7793 14.5594L4.7793 17.0894L13.839 17.0894C14.2234 17.0894 14.4893 16.705 14.3536 16.3453L9.71431 4.04161L7.34701 4.93424L10.9763 14.5594Z" fill="white"/><rect width="10.7121" height="4.21913" transform="matrix(-1 0 0 1 17.5586 1.46387)" fill="#374151"/><path d="M4.67241 12.4575H2.14395L4.8856 19.7285H7.41406L4.67241 12.4575Z" fill="#374151"/><path fill-rule="evenodd" clip-rule="evenodd" d="M19.0237 15.4387L25.2207 15.4387L25.2207 12.9087L16.161 12.9087C15.7766 12.9087 15.5107 13.293 15.6464 13.6527L20.2857 25.9564L22.653 25.0638L19.0237 15.4387Z" fill="white"/><rect width="10.7121" height="4.21913" transform="matrix(1 1.74846e-07 1.74846e-07 -1 12.4414 28.5342)" fill="#374151"/><path d="M25.3276 17.5405L27.8561 17.5405L25.1144 10.2695L22.5859 10.2695L25.3276 17.5405Z" fill="#374151"/></g><defs><clipPath id="clip0_1_52857"><rect width="22" height="22" fill="white" transform="translate(4 3.99902)"/></clipPath></defs></svg>'
      });
    }
    if (normalized.ach.length) methodItems.push({
      id: 'ach',
      label: 'Send to a Bank Account',
      subtitle: 'Typically processed in 1-3 business days',
      icon: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M12 21V12.75M15.75 21V12.75M8.25 21V12.75M3 9L12 3L21 9M19.5 21V10.3325C17.0563 9.94906 14.5514 9.75 12 9.75C9.44861 9.75 6.94372 9.94906 4.5 10.3325V21M3 21H21M12 6.75H12.0075V6.7575H12V6.75Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>'
    });
    if (normalized.wire.length) methodItems.push({
      id: 'wire',
      label: 'Wire',
      subtitle: 'Fast bank-to-bank transfer',
      icon: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M12 21V12.75M15.75 21V12.75M8.25 21V12.75M3 9L12 3L21 9M19.5 21V10.3325C17.0563 9.94906 14.5514 9.75 12 9.75C9.44861 9.75 6.94372 9.94906 4.5 10.3325V21M3 21H21M12 6.75H12.0075V6.7575H12V6.75Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>'
    });
    if (_cardFundingState.cards.length) methodItems.push({
      id: 'card',
      label: 'Pay with a Card',
      subtitle: 'No bank account details required',
      icon: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M2.25 8.25H21.75M2.25 9H21.75M5.25 14.25H11.25M5.25 16.5H8.25M21.75 11V6.75C21.75 5.50736 20.7426 4.5 19.5 4.5H4.5C3.25736 4.5 2.25 5.50736 2.25 6.75V17.25C2.25 18.4926 3.25736 19.5 4.5 19.5H14M19.5 19.75L19.8942 18.5673C20.1182 17.8954 20.6454 17.3682 21.3173 17.1442L22.5 16.75L21.3173 16.3558C20.6454 16.1318 20.1182 15.6046 19.8942 14.9327L19.5 13.75L19.1058 14.9327C18.8818 15.6046 18.3546 16.1318 17.6827 16.3558L16.5 16.75L17.6827 17.1442C18.3546 17.3682 18.8818 17.8954 19.1058 18.5673L19.5 19.75Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>'
    });
    if (normalized.check.length) methodItems.push({
      id: 'check',
      label: 'Check',
      subtitle: 'Slowest form of payment (approximately 7-10 days)'
    });

    methodItems = ensureMethodItemPresent(methodItems, inferRowMethodType(row));

    var applyMethod = initSelect(
      'pp-pay-method-select',
      'pp-pay-method-selected',
      'pp-pay-method-options',
      methodItems,
      'Select payment method',
      function (item) {
        hideAllPaymentMethodPanels();
        if (!item) {
          updatePayStepStates();
          return;
        }
        detailsWrap.classList.remove('hidden');

        if (item.id === 'ach' || item.id === 'wire') {
          var panel = document.getElementById('gp-pmc-bank-account');
          if (panel) panel.classList.remove('hidden');
          var accounts = item.id === 'wire' ? normalized.wire : normalized.ach;
          var bankSel = document.getElementById('gp-bank-account-select');
          var bankSelContent = bankSel ? bankSel.querySelector('el-selectedcontent') : null;
          var bankOpts = bankSel ? bankSel.querySelector('el-options') : null;
          if (bankSelContent && bankOpts) {
            bankOpts.innerHTML = accounts.map(function (a) {
              return buildPayeeBankOptionHtml(a);
            }).join('');
            setSelectedContent(bankSelContent, '', item.id === 'wire' ? 'Select wire destination' : 'Select bank account');
            bankOpts.onclick = function (ev) {
              var opt = ev.target.closest('el-option');
              if (!opt) return;
              var optionValue = String(opt.getAttribute('value') || '');
              var currentValue = String(bankOpts.getAttribute('data-selected-value') || '');
              if (currentValue && optionValue === currentValue) {
                applyBankRecipientSelection(
                  accounts,
                  bankSelContent,
                  bankOpts,
                  '',
                  item.id === 'wire' ? 'Select wire destination' : 'Select bank account'
                );
                updatePayStepStates();
                return;
              }
              applyBankRecipientSelection(
                accounts,
                bankSelContent,
                bankOpts,
                optionValue,
                item.id === 'wire' ? 'Select wire destination' : 'Select bank account'
              );
              updatePayStepStates();
            };
            var bankSelectionId = savedState && savedState.methodId === item.id && savedState.bankAccountId
              ? savedState.bankAccountId
              : String(((getDeterministicListItem(accounts, row, item.id === 'wire' ? 41 : 37) || {}).id) || '');
            if (bankSelectionId) {
              applyBankRecipientSelection(
                accounts,
                bankSelContent,
                bankOpts,
                bankSelectionId,
                item.id === 'wire' ? 'Select wire destination' : 'Select bank account'
              );
            }
          }
          updatePayStepStates();
          return;
        }

        if (item.id === 'card') {
          var cardPanel = document.getElementById('gp-pmc-payers-card');
          if (cardPanel) cardPanel.classList.remove('hidden');
          var cardSel = document.getElementById('pp-pay-card-select');
          var cardContent = document.getElementById('pp-pay-card-selected');
          var cardOpts = document.getElementById('pp-pay-card-options');
          var fundingInput = document.getElementById('pp-card-funding-amount');
          var createdLabel = document.getElementById('pp-card-created-label');
          var sourceInputs = cardPanel.querySelectorAll('input[name="pp-card-source"]');
          var cardDeliveryContacts = collectSmartDisburseContacts([].concat(normalized.smartExchange || [], normalized.smartDisburse || []));
          var cardDeliveryApi = initCardDeliveryTypeahead(cardDeliveryContacts);
          if (cardSel && cardContent && cardOpts) {
            _cardFundingState.cardSource = (savedState && savedState.methodId === 'card' && savedState.cardId)
              ? 'existing'
              : '';
            _cardFundingState.sendingMethod = (savedState && savedState.methodId === 'card' && savedState.cardSendingMethod)
              ? (String(savedState.cardSendingMethod) === 'display_details' ? 'on_file' : String(savedState.cardSendingMethod))
              : (!isReadyToPay ? 'on_file' : 'on_file');
            _cardFundingState.fundingMethod = (savedState && savedState.methodId === 'card' && savedState.cardFundingMethod)
              ? String(savedState.cardFundingMethod).replace('match_payment', 'add_funds')
              : (!isReadyToPay ? 'add_funds' : '');
            _cardFundingState.fundingAmount = (savedState && savedState.methodId === 'card' && savedState.cardFundingAmount)
              ? String(savedState.cardFundingAmount)
              : (!isReadyToPay ? formatMoneyInputValue(getCurrentPayableAmountNumber()) : '');
            renderCardOptionsList(cardOpts, '');
            setSelectedContent(cardContent, '', 'Select card');
            cardOpts.onclick = function (ev) {
              var opt = ev.target.closest('el-option');
              if (!opt) return;
              var optionValue = String(opt.getAttribute('value') || '');
              var currentValue = String(cardOpts.getAttribute('data-selected-value') || '');
              if (currentValue && optionValue === currentValue) {
                applyCardSelection(cardOpts, cardContent, '');
                updatePayStepStates();
                return;
              }
              applyCardSelection(cardOpts, cardContent, optionValue);
              updatePayStepStates();
            };
            sourceInputs.forEach(function (input) {
              input.checked = input.value === _cardFundingState.cardSource;
              input.onchange = function () {
                if (!input.checked) return;
                _cardFundingState.cardSource = String(input.value || '');
                _cardFundingState.selectedCardId = '';
                _cardFundingState.pendingNewCard = null;
                _cardFundingState.fundingMethod = '';
                _cardFundingState.fundingAmount = '';
                setSelectedContent(cardContent, '', 'Select card');
                if (_cardFundingState.cardSource === 'new') {
                  var createdCard = createNewVirtualCard();
                  if (createdLabel) createdLabel.innerHTML = buildPendingNewCardSummary(createdCard);
                } else if (createdLabel) {
                  createdLabel.textContent = '--';
                }
                renderCardFundingMethodOptions();
                syncFundingAmountInput();
                renderCardBalanceSummary();
                syncCardProgressiveReveal();
                updatePayStepStates();
              };
            });
            var sendingInputs = cardPanel.querySelectorAll('input[name="pp-card-sending-method"]');
            sendingInputs.forEach(function (input) {
              input.checked = String(input.value || '') === _cardFundingState.sendingMethod;
              input.onchange = function () {
                if (input.checked) {
                  _cardFundingState.sendingMethod = String(input.value || 'on_file');
                  syncCardSendingMethodDetails();
                  updatePayStepStates();
                }
              };
            });
            syncCardSendingMethodDetails();
            var savedDeliveryTokens = savedState && savedState.methodId === 'card' && Array.isArray(savedState.cardDeliveryTokens)
              ? savedState.cardDeliveryTokens
              : [];
            if (cardDeliveryApi) {
              cardDeliveryApi.setTokens(savedDeliveryTokens);
            }
            if (fundingInput) {
              fundingInput.oninput = function () {
                _cardFundingState.fundingAmount = String(fundingInput.value || '').replace(/[^0-9.]/g, '');
                renderCardBalanceSummary();
                updatePayStepStates();
              };
              fundingInput.onblur = function () {
                if (_cardFundingState.fundingMethod !== 'spend_balance') {
                  _cardFundingState.fundingAmount = formatMoneyInputValue(parseMoneyInput(fundingInput.value));
                  fundingInput.value = _cardFundingState.fundingAmount;
                  renderCardBalanceSummary();
                  updatePayStepStates();
                }
              };
            }
            renderCardFundingMethodOptions();
            syncFundingAmountInput();
            renderCardBalanceSummary();
            var cardSelectionId = savedState && savedState.methodId === 'card' && savedState.cardId
              ? savedState.cardId
              : (!isReadyToPay ? String(((getDeterministicListItem(_cardFundingState.cards, row, 43) || {}).id) || '') : '');
            if (cardSelectionId) {
              _cardFundingState.cardSource = 'existing';
              sourceInputs.forEach(function (input) {
                input.checked = input.value === 'existing';
              });
              applyCardSelection(cardOpts, cardContent, cardSelectionId);
            } else {
              if (createdLabel) createdLabel.textContent = '--';
              syncCardProgressiveReveal();
            }
          }
          updatePayStepStates();
          return;
        }

        if (item.id === 'check') {
          var checkPanel = document.getElementById('gp-pmc-paper-check');
          if (checkPanel) checkPanel.classList.remove('hidden');
          var checkSel = document.getElementById('gp-check-address-select');
          var checkSelContent = checkSel ? checkSel.querySelector('el-selectedcontent') : null;
          var checkOpts = checkSel ? checkSel.querySelector('el-options') : null;
          if (checkSelContent && checkOpts) {
            checkOpts.innerHTML = normalized.check.map(function (c) {
              return buildCheckAddressOptionHtml(c);
            }).join('');
            setSelectedContent(checkSelContent, '', 'Select mailing address');
            checkOpts.onclick = function (ev) {
              var opt = ev.target.closest('el-option');
              if (!opt) return;
              var optionValue = String(opt.getAttribute('value') || '');
              var currentValue = String(checkOpts.getAttribute('data-selected-value') || '');
              if (currentValue && optionValue === currentValue) {
                applyCheckSelection(checkSelContent, checkOpts, '');
                updatePayStepStates();
                return;
              }
              applyCheckSelection(checkSelContent, checkOpts, optionValue);
              updatePayStepStates();
            };
            var checkSelectionId = savedState && savedState.methodId === 'check' && savedState.checkAddressId
              ? savedState.checkAddressId
              : String(((getDeterministicListItem(normalized.check, row, 47) || {}).id) || '');
            if (checkSelectionId) {
              applyCheckSelection(checkSelContent, checkOpts, checkSelectionId);
            }
          }
          updatePayStepStates();
          return;
        }

        if (item.id === 'smart_disburse') {
          var sdPanel = document.getElementById('gp-pmc-smart-disburse');
          var sdDetailsPanel = document.getElementById('gp-pmc-smart-disburse-details');
          if (sdPanel) sdPanel.classList.remove('hidden');
          var activeSdContacts = collectSmartDisburseContacts(normalized.smartDisburse);
          var sdApi = initSmartDisburseTypeahead(activeSdContacts);
          if (sdDetailsPanel) sdDetailsPanel.classList.remove('hidden');
          var sdTokens = savedState && savedState.methodId === 'smart_disburse' && Array.isArray(savedState.smartTokens) && savedState.smartTokens.length
            ? savedState.smartTokens
            : (function () {
                var primary = getDeterministicListItem(activeSdContacts, row, 53);
                var secondary = getDeterministicListItem(activeSdContacts, row, 59);
                var tokens = [];
                if (primary) tokens.push(primary);
                if (secondary && primary && String(secondary.id || '') !== String(primary.id || '')) tokens.push(secondary);
                return tokens;
              })();
          if (sdApi && sdTokens && sdTokens.length) {
            sdApi.setTokens(sdTokens);
          }
          updatePayStepStates();
          return;
        }

        if (item.id === 'smart_exchange') {
          var sxPanel = document.getElementById('gp-pmc-smart-exchange');
          var sxDetailsPanel = document.getElementById('gp-pmc-smart-exchange-details');
          if (sxPanel) sxPanel.classList.remove('hidden');
          var sxContacts = collectSmartDisburseContacts(normalized.smartExchange);
          var sxApi = initSmartExchangeTypeahead(sxContacts);
          if (sxDetailsPanel) sxDetailsPanel.classList.remove('hidden');
          var sxTokens = savedState && savedState.methodId === 'smart_exchange' && Array.isArray(savedState.smartTokens) && savedState.smartTokens.length
            ? savedState.smartTokens
            : (function () {
                var primary = getDeterministicListItem(sxContacts, row, 61);
                var secondary = getDeterministicListItem(sxContacts, row, 67);
                var tokens = [];
                if (primary) tokens.push(primary);
                if (secondary && primary && String(secondary.id || '') !== String(primary.id || '')) tokens.push(secondary);
                return tokens;
              })();
          if (sxApi && sxTokens && sxTokens.length) {
            sxApi.setTokens(sxTokens);
          }
          updatePayStepStates();
          return;
        }
      }
    );

    var desiredMethodId = savedState && savedState.methodId
      ? String(savedState.methodId)
      : (isReadyToPay ? '' : String(inferRowMethodType(row) || ''));
    var hasDesiredMethod = false;
    for (var methodIdx = 0; methodIdx < methodItems.length; methodIdx += 1) {
      if (String(methodItems[methodIdx].id) === desiredMethodId) {
        hasDesiredMethod = true;
        break;
      }
    }
    if (!hasDesiredMethod && desiredMethodId) {
      desiredMethodId = methodItems.length
        ? String(methodItems[getRowSeed(row) % methodItems.length].id)
        : '';
    }

    hideAllPaymentMethodPanels();
    if (desiredMethodId) applyMethod(desiredMethodId);
    updatePayStepStates();
  }

  function applyOriginationRevealState() {
    var button = document.getElementById('pp-orig-bank-reveal-btn');
    if (!button) return;
    var revealed = !!_origDetailsState.revealed;
    button.setAttribute('data-revealed', revealed ? 'true' : 'false');
    var revealIcon = button.querySelector('[data-icon="reveal"]');
    var hideIcon = button.querySelector('[data-icon="hide"]');
    var text = document.getElementById('pp-orig-bank-reveal-text');
    if (revealIcon) revealIcon.classList.toggle('hidden', revealed);
    if (hideIcon) hideIcon.classList.toggle('hidden', !revealed);
    if (text) text.textContent = revealed ? 'Hide Details' : 'Reveal Details';

    function setCopyVisible(buttonId, visible) {
      var copyBtn = document.getElementById(buttonId);
      if (!copyBtn) return;
      var icon = copyBtn.querySelector('[data-copy-icon="true"]');
      copyBtn.setAttribute('data-copy-enabled', visible ? 'true' : 'false');
      if (visible) {
        copyBtn.classList.remove('pointer-events-none');
        copyBtn.classList.add('cursor-pointer', 'transition-colors', 'hover:bg-gray-200', 'dark:hover:bg-white/20');
        if (icon) icon.classList.remove('hidden');
      } else {
        copyBtn.classList.add('pointer-events-none');
        copyBtn.classList.remove('cursor-pointer', 'transition-colors', 'hover:bg-gray-200', 'dark:hover:bg-white/20');
        if (icon) icon.classList.add('hidden');
      }
    }

    setCopyVisible('pp-orig-bank-acct-copy-btn', revealed);
    setCopyVisible('pp-orig-bank-routing-copy-btn', revealed);

    setMaskedField('pp-orig-bank-account',
      document.getElementById('pp-orig-bank-account') && document.getElementById('pp-orig-bank-account').getAttribute('data-masked'),
      document.getElementById('pp-orig-bank-account') && document.getElementById('pp-orig-bank-account').getAttribute('data-revealed'),
      revealed
    );
    setMaskedField('pp-orig-bank-routing',
      document.getElementById('pp-orig-bank-routing') && document.getElementById('pp-orig-bank-routing').getAttribute('data-masked'),
      document.getElementById('pp-orig-bank-routing') && document.getElementById('pp-orig-bank-routing').getAttribute('data-revealed'),
      revealed
    );
  }

  function applyOriginationExpandedState() {
    var header = document.getElementById('pp-orig-bank-details-toggle');
    var body = document.getElementById('pp-orig-bank-details-body');
    var chevron = document.getElementById('pp-orig-bank-details-chevron');
    var expanded = !!_origDetailsState.expanded;

    if (header) {
      header.classList.toggle('rounded-md', !expanded);
      header.classList.toggle('rounded-t-md', expanded);
      header.classList.toggle('bg-gray-100', expanded);
      header.classList.toggle('dark:bg-white/10', expanded);
    }
    if (body) {
      body.classList.toggle('max-h-0', !expanded);
      body.classList.toggle('opacity-0', !expanded);
      body.classList.toggle('pointer-events-none', !expanded);
      body.classList.toggle('border-transparent', !expanded);
      body.classList.toggle('max-h-[560px]', expanded);
      body.classList.toggle('opacity-100', expanded);
      body.classList.toggle('pointer-events-auto', expanded);
      body.classList.toggle('border-gray-200', expanded);
      body.classList.toggle('dark:border-white/10', expanded);
    }
    if (chevron) {
      chevron.classList.remove('-rotate-90');
      chevron.classList.toggle('rotate-180', expanded);
    }
  }

  function initOriginationDetailsInteractions() {
    if (_origDetailsState.bound) return;
    _origDetailsState.bound = true;

    var toggleBtn = document.getElementById('pp-orig-bank-details-toggle');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', function () {
        _origDetailsState.expanded = !_origDetailsState.expanded;
        applyOriginationExpandedState();
      });
    }

    var revealBtn = document.getElementById('pp-orig-bank-reveal-btn');
    if (revealBtn) {
      revealBtn.addEventListener('click', function () {
        _origDetailsState.revealed = !_origDetailsState.revealed;
        applyOriginationRevealState();
      });
    }
  }

  function loadJsonWithFallbacks(paths) {
    var i = 0;
    function tryNext() {
      if (i >= paths.length) {
        return Promise.reject(new Error('Failed to load payables JSON from all known paths.'));
      }
      var path = paths[i++];
      return fetch(path, { cache: 'no-store' }).then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status + ' for ' + path);
        return res.json();
      }).catch(function () {
        return tryNext();
      });
    }
    return tryNext();
  }

  function findSelectedPayable(items, params) {
    var id = params.get('id');
    var bill = params.get('bill');
    var rows = Array.isArray(items) ? items : [];
    if (id) {
      for (var i = 0; i < rows.length; i++) {
        if (rows[i] && String(rows[i].id) === String(id)) return rows[i];
      }
    }
    if (bill) {
      for (var j = 0; j < rows.length; j++) {
        if (rows[j] && String(rows[j].billNumber) === String(bill)) return rows[j];
      }
    }
    for (var k = 0; k < rows.length; k++) {
      if (rows[k] && rows[k].status === 'ready_to_pay') return rows[k];
    }
    return rows[0] || null;
  }

  function initBackButton() {
    var backBtn = document.getElementById('get-paid-back');
    if (!backBtn) return;
    backBtn.addEventListener('click', function () {
      var params = new URLSearchParams(window.location.search || '');
      var nextUrl = './bills-and-payables.html';
      var tab = String(params.get('tab') || '').trim();
      if (tab) nextUrl += '?tab=' + encodeURIComponent(tab);
      window.location.href = nextUrl;
    });
  }

  function reorderPaySteps() {
    // Steps are already in final order in markup.
  }

  function setOriginationDetails(account) {
    _origDetailsState.account = account || null;
    _origDetailsState.revealed = false;

    setText('pp-orig-bank-name', account && account.name);
    setText('pp-orig-bank-bank', account && account.bankName);
    setText('pp-orig-bank-address', account && account.address);

    var accountMasked = account ? (account.maskedAccount || getMaskedValue(account.accountNumber, 4)) : '--';
    var accountRevealed = account ? (account.accountNumber || account.maskedAccount || '--') : '--';
    var routingMasked = account ? (account.maskedRouting || getMaskedValue(account.routingNumber, 4)) : '--';
    var routingRevealed = account ? (account.routingNumber || account.maskedRouting || '--') : '--';
    setMaskedField('pp-orig-bank-account', accountMasked, accountRevealed, false);
    setMaskedField('pp-orig-bank-routing', routingMasked, routingRevealed, false);

    var details = document.getElementById('pp-orig-bank-details');
    if (details) details.classList.toggle('hidden', !account);

    if (account) {
      _origDetailsState.expanded = false;
      applyOriginationExpandedState();
      applyOriginationRevealState();
    }
  }

  function initOriginationAccountSelector(accounts, row) {
    var list = Array.isArray(accounts) ? accounts.filter(function (a) { return a && a.id; }) : [];
    var selectEl = document.getElementById('pp-orig-bank-select');
    var optionsEl = document.getElementById('pp-orig-bank-options');
    var selectedEl = document.getElementById('pp-orig-bank-selected');
    var isReadyToPay = String((row && row.status) || '').toLowerCase() === 'ready_to_pay';
    var savedState = getSavedPayPageState(row) || (!isReadyToPay ? buildFallbackOriginationState(row, list) : null);
    if (!selectEl || !optionsEl || !selectedEl) return;

    optionsEl.innerHTML = list.map(buildBankOptionHtml).join('');

    function resetSelection() {
      selectedEl.innerHTML = '<span class="truncate text-gray-400 dark:text-gray-500">Select origination account</span>';
      optionsEl.setAttribute('data-selected-value', '');
      optionsEl.querySelectorAll('el-option').forEach(function (opt) {
        opt.removeAttribute('aria-selected');
      });
      setOriginationDetails(null);
      updatePayStepStates();
    }

    function applySelection(accountId) {
      var selected = null;
      for (var i = 0; i < list.length; i++) {
        if (String(list[i].id) === String(accountId)) {
          selected = list[i];
          break;
        }
      }
      if (!selected) {
        resetSelection();
        return;
      }
      optionsEl.setAttribute('data-selected-value', String(selected.id || ''));
      selectedEl.innerHTML = buildSelectedBankContent(selected);
      setOriginationDetails(selected);
      optionsEl.querySelectorAll('el-option').forEach(function (opt) {
        if (String(opt.getAttribute('value') || '') === String(selected.id)) opt.setAttribute('aria-selected', 'true');
        else opt.removeAttribute('aria-selected');
      });
      updatePayStepStates();
    }

    optionsEl.addEventListener('click', function (event) {
      var option = event.target.closest('el-option');
      if (!option) return;
      var optionValue = String(option.getAttribute('value') || '');
      var currentValue = String(optionsEl.getAttribute('data-selected-value') || '');
      if (currentValue && optionValue === currentValue) {
        resetSelection();
        return;
      }
      applySelection(optionValue);
    });

    if (savedState && savedState.originationAccountId) {
      applySelection(savedState.originationAccountId);
      _origDetailsState.expanded = !!savedState.originationExpanded;
      _origDetailsState.revealed = !!savedState.originationRevealed;
      applyOriginationExpandedState();
      applyOriginationRevealState();
      return;
    }

    resetSelection();
  }

  function populatePage(row, payeeProfile) {
    if (!row) return;
    setText('gp-date-label', 'Due Date');
    setText('gp-customer-label', 'Payee');
    setText('gp-invoice-label', 'Bill #');

    setText('gp-amount', formatMoney(row.amount, row.currency));
    setText('gp-currency', row.currency || 'USD');
    setText('gp-date', formatDate(row.dueDate));
    setText('gp-customer', (payeeProfile && payeeProfile.name) || row.payeeName);
    setText('gp-invoice', row.billNumber);
    var headerMeta = document.getElementById('pp-header-date-meta');
    var statusDateChip = document.getElementById('pp-status-date-chip');
    var statusDateLabel = document.getElementById('pp-status-date-label');
    var statusDateText = document.getElementById('pp-status-date-text');
    var status = String(row.status || '').toLowerCase();
    var statusType = String(row.statusType || '').toLowerCase();
    var isScheduled = status === 'scheduled' || (status === 'in_progress' && statusType === 'scheduled');
    var isProcessing = status === 'in_progress' && statusType !== 'scheduled';
    var isPaid = status === 'paid';
    if (headerMeta) {
      var headerMetaText = getHeaderDateMeta(row);
      headerMeta.textContent = headerMetaText || '';
      headerMeta.classList.toggle('hidden', !headerMetaText);
    }
    if (statusDateChip) {
      var showStatusDateChip = isProcessing || isPaid;
      statusDateChip.classList.toggle('hidden', !showStatusDateChip);
      statusDateChip.classList.toggle('inline-flex', showStatusDateChip);
    }
    if (statusDateLabel) {
      statusDateLabel.textContent = isPaid ? 'Completed on' : 'Initiated on';
    }
    if (statusDateText) {
      statusDateText.textContent = (isProcessing || isPaid) ? formatDate(row.adDate || row.dueDate) : '--';
    }
    if (headerMeta && isScheduled) {
      headerMeta.classList.add('hidden');
    }

    setText('gp-submit-amount', formatMoney(row.amount, row.currency));
    setText('gp-submit-date', formatDate(row.dueDate));
    var displayStatus = getDisplayStatus(row);
    setStatusBadge(displayStatus.key, displayStatus.label);
    renderPillAttachments(row);
    renderPayPageActivityLog(row);
  }

  function renderPillAttachments(row) {
    var attachmentsWrap = document.getElementById('gp-pill-attachments');
    if (!attachmentsWrap) return;
    var attachments = row && row.details && Array.isArray(row.details.attachments) ? row.details.attachments : [];
    if (!attachments.length) {
      attachmentsWrap.innerHTML = '<span class="text-sm font-normal leading-5 text-gray-600 dark:text-gray-400">--</span>';
      return;
    }

    var iconSvg = '<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" class="size-5 shrink-0 text-gray-400 dark:text-gray-500"><path fill-rule="evenodd" clip-rule="evenodd" d="M15.621 4.379a3 3 0 0 0-4.242 0l-7 7a3 3 0 0 0 4.241 4.243h.001l.497-.5a.75.75 0 0 1 1.064 1.057l-.498.501-.002.002a4.5 4.5 0 0 1-6.364-6.364l7-7a4.5 4.5 0 0 1 6.368 6.36l-3.455 3.553A2.625 2.625 0 1 1 9.52 9.52l3.45-3.451a.75.75 0 1 1 1.061 1.06l-3.45 3.451a1.125 1.125 0 0 0 1.587 1.595l3.454-3.553a3 3 0 0 0 0-4.242Z" /></svg>';

    attachmentsWrap.innerHTML = attachments.map(function (att, idx) {
      var name = escapeHtml((att && att.name) || 'Attachment ' + (idx + 1));
      return (
        '<button type="button" command="show-modal" commandfor="gp-review-dialog" data-attachment-index="' + idx + '"' +
          ' class="inline-flex cursor-pointer items-center gap-1.5 rounded border border-gray-200 bg-gray-100 px-2 py-0.5 text-sm font-medium text-gray-800 transition-colors hover:bg-gray-200 dark:border-white/10 dark:bg-white/5 dark:text-gray-200 dark:hover:bg-white/10">' +
          iconSvg +
          '<span class="truncate max-w-[220px]">' + name + '</span>' +
        '</button>'
      );
    }).join('');
  }

  function initSummaryAndActivityToggles() {
    function bindToggle(toggleId, contentId) {
      var toggle = document.getElementById(toggleId);
      var content = document.getElementById(contentId);
      if (!toggle || !content) return;
      toggle.addEventListener('click', function () {
        content.classList.toggle('hidden');
        var icon = toggle.querySelector('[data-collapse-icon]');
        if (icon) icon.classList.toggle('rotate-180');
      });
    }

    bindToggle('gp-receivable-toggle', 'gp-receivable-content');
    bindToggle('gp-activity-toggle', 'gp-activity-content');
  }

  function applyPayInfoCollapsedState() {
    var content = document.getElementById('pp-pay-info-pill');
    var chevron = document.getElementById('pp-pay-info-chevron');
    var toggle = document.getElementById('pp-pay-info-toggle');
    if (!content) return;

    var isDesktop = window.matchMedia('(min-width: 1024px)').matches;
    var collapsed = !isDesktop && _payInfoState.collapsedMobile;

    if (collapsed) {
      content.classList.add('hidden', 'max-h-0', 'opacity-0', 'pointer-events-none', 'p-0');
      content.classList.remove('block', 'max-h-[900px]', 'opacity-100', 'pointer-events-auto', 'p-4');
    } else {
      content.classList.remove('hidden', 'max-h-0', 'opacity-0', 'pointer-events-none', 'p-0');
      content.classList.add('block', 'max-h-[900px]', 'opacity-100', 'pointer-events-auto', 'p-4');
    }

    if (toggle) {
      if (collapsed) {
        toggle.classList.remove('bg-gray-100', 'dark:bg-white/10');
      } else {
        toggle.classList.add('bg-gray-100', 'dark:bg-white/10');
      }
    }

    if (chevron) {
      chevron.classList.remove('-rotate-90');
      chevron.classList.toggle('rotate-180', !collapsed);
    }
    if (toggle) toggle.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
  }

  function initPayInfoToggle() {
    if (_payInfoState.bound) return;
    _payInfoState.bound = true;
    var toggle = document.getElementById('pp-pay-info-toggle');
    if (!toggle) return;

    toggle.addEventListener('click', function () {
      _payInfoState.collapsedMobile = !_payInfoState.collapsedMobile;
      applyPayInfoCollapsedState();
    });

    window.addEventListener('resize', applyPayInfoCollapsedState);
    applyPayInfoCollapsedState();
  }

  function runRefreshAnimation(refreshBtn) {
    var buttons = document.querySelectorAll('.js-pay-refresh-btn');
    var icons = document.querySelectorAll('.js-pay-refresh-btn svg');
    var skeletonTargets = [
      { id: 'gp-amount', classes: ['inline-block', 'rounded-md', 'bg-gray-200', 'text-transparent', 'animate-pulse', 'dark:bg-white/15'] },
      { id: 'gp-currency', classes: ['inline-block', 'rounded-md', 'bg-gray-200', 'text-transparent', 'animate-pulse', 'dark:bg-white/15'] },
      { id: 'gp-status-badge', classes: ['justify-center', 'rounded-md', 'bg-gray-200', 'text-transparent', 'animate-pulse', 'inset-ring-0', 'dark:bg-white/15'] },
      { id: 'gp-date-label', classes: ['inline-block', 'rounded', 'bg-gray-200', 'text-transparent', 'animate-pulse', 'dark:bg-white/15'] },
      { id: 'gp-date', classes: ['inline-block', 'rounded', 'bg-gray-200', 'text-transparent', 'animate-pulse', 'dark:bg-white/15'] },
      { id: 'gp-customer-label', classes: ['inline-block', 'rounded', 'bg-gray-200', 'text-transparent', 'animate-pulse', 'dark:bg-white/15'] },
      { id: 'gp-customer', classes: ['inline-block', 'rounded', 'bg-gray-200', 'text-transparent', 'animate-pulse', 'dark:bg-white/15'] },
      { id: 'gp-invoice-label', classes: ['inline-block', 'rounded', 'bg-gray-200', 'text-transparent', 'animate-pulse', 'dark:bg-white/15'] },
      { id: 'gp-invoice', classes: ['inline-block', 'rounded', 'bg-gray-200', 'text-transparent', 'animate-pulse', 'dark:bg-white/15'] },
      { id: 'gp-submit-btn', classes: ['bg-gray-200', 'text-transparent', 'shadow-none', 'animate-pulse', 'dark:bg-white/15'] },
      { id: 'pp-schedule-simple-btn', classes: ['bg-gray-200', 'text-transparent', 'shadow-none', 'animate-pulse', 'dark:bg-white/15'] },
      { id: 'pp-schedule-segmented-chip', classes: ['bg-gray-200', 'text-transparent', 'shadow-none', 'animate-pulse', 'dark:bg-white/15'], hideChildren: true },
      { id: 'gp-receivable-toggle', classes: ['animate-pulse'] },
      { id: 'gp-activity-toggle', classes: ['animate-pulse'] },
    ];
    var selectTargets = [
      document.getElementById('pp-orig-bank-select'),
      document.getElementById('pp-pay-method-select'),
      document.getElementById('pp-pay-card-select'),
      document.getElementById('pp-smart-exchange-select'),
      document.getElementById('gp-bank-account-select'),
      document.getElementById('gp-check-address-select'),
    ].filter(Boolean);
    var selectSkeletonClasses = ['rounded-md', 'bg-gray-200', 'animate-pulse', 'dark:bg-white/15'];

    function lockSize(el) {
      if (!el || el.getAttribute('data-skeleton-locked') === 'true') return;
      var rect = el.getBoundingClientRect();
      el.setAttribute('data-skeleton-locked', 'true');
      el.setAttribute('data-skeleton-style', el.getAttribute('style') || '');
      if (rect.width > 0) el.style.width = rect.width + 'px';
      if (rect.height > 0) el.style.height = rect.height + 'px';
      if (window.getComputedStyle(el).display === 'inline') el.style.display = 'inline-block';
    }

    function unlockSize(el) {
      if (!el || el.getAttribute('data-skeleton-locked') !== 'true') return;
      var style = el.getAttribute('data-skeleton-style');
      if (style) el.setAttribute('style', style);
      else el.removeAttribute('style');
      el.removeAttribute('data-skeleton-locked');
      el.removeAttribute('data-skeleton-style');
    }

    function hideChildrenForSkeleton(el) {
      if (!el || el.getAttribute('data-skeleton-children-hidden') === 'true') return;
      el.setAttribute('data-skeleton-children-hidden', 'true');
      var children = el.children || [];
      for (var i = 0; i < children.length; i++) {
        var child = children[i];
        child.setAttribute('data-skeleton-prev-opacity', child.style.opacity || '');
        child.style.opacity = '0';
      }
    }

    function showChildrenAfterSkeleton(el) {
      if (!el || el.getAttribute('data-skeleton-children-hidden') !== 'true') return;
      var children = el.children || [];
      for (var i = 0; i < children.length; i++) {
        var child = children[i];
        var prev = child.getAttribute('data-skeleton-prev-opacity');
        if (prev) child.style.opacity = prev;
        else child.style.removeProperty('opacity');
        child.removeAttribute('data-skeleton-prev-opacity');
      }
      el.removeAttribute('data-skeleton-children-hidden');
    }

    function applySkeleton(loading) {
      skeletonTargets.forEach(function (item) {
        var el = document.getElementById(item.id);
        if (!el) return;
        if (loading) {
          lockSize(el);
          if (item.hideChildren) hideChildrenForSkeleton(el);
          el.classList.add.apply(el.classList, item.classes);
        } else {
          el.classList.remove.apply(el.classList, item.classes);
          if (item.hideChildren) showChildrenAfterSkeleton(el);
          unlockSize(el);
        }
      });
      selectTargets.forEach(function (el) {
        if (loading) {
          lockSize(el);
          hideChildrenForSkeleton(el);
          el.classList.add.apply(el.classList, selectSkeletonClasses);
        } else {
          el.classList.remove.apply(el.classList, selectSkeletonClasses);
          showChildrenAfterSkeleton(el);
          unlockSize(el);
        }
      });

      // Attachments: skeleton each badge individually (not one combined block).
      var attachmentsWrap = document.getElementById('gp-pill-attachments');
      if (attachmentsWrap) {
        var items = attachmentsWrap.children || [];
        for (var i = 0; i < items.length; i += 1) {
          var item = items[i];
          if (!item) continue;
          if (loading) {
            lockSize(item);
            hideChildrenForSkeleton(item);
            item.classList.add('rounded-md', 'bg-gray-200', 'animate-pulse', 'dark:bg-white/15');
          } else {
            item.classList.remove('rounded-md', 'bg-gray-200', 'animate-pulse', 'dark:bg-white/15');
            showChildrenAfterSkeleton(item);
            unlockSize(item);
          }
        }
      }
    }

    if (buttons && buttons.length) {
      buttons.forEach(function (btn) { btn.disabled = true; });
    } else if (refreshBtn) {
      refreshBtn.disabled = true;
    }
    applySkeleton(true);
    _refreshHalfTurns += 1;
    if (icons && icons.length) {
      icons.forEach(function (icon) {
        icon.style.transition = 'transform 800ms ease-out';
        icon.style.transform = 'rotate(' + (_refreshHalfTurns * 180) + 'deg)';
      });
    }
    window.setTimeout(function () {
      applySkeleton(false);
      if (icons && icons.length) {
        icons.forEach(function (icon) {
          icon.style.transition = '';
        });
      }
      if (buttons && buttons.length) {
        buttons.forEach(function (btn) { btn.disabled = false; });
      } else if (refreshBtn) {
        refreshBtn.disabled = false;
      }
      if (typeof window.showGlobalTopToast === 'function') {
        window.showGlobalTopToast("Data synced. You're up to date.");
      }
    }, 1000);
  }

  function initRefreshButtons() {
    var buttons = document.querySelectorAll('.js-pay-refresh-btn');
    if (!buttons || !buttons.length) return;
    buttons.forEach(function (btn) {
      btn.addEventListener('click', function () {
        runRefreshAnimation(btn);
      });
    });
  }

  function init() {
    initBackButton();
    reorderPaySteps();
    initOriginationDetailsInteractions();
    initPayStepStatusObserver();
    initSummaryAndActivityToggles();
    initPayInfoToggle();
    initRefreshButtons();
    initScheduleDropdown();
    initPayablesCardDetailsModalSync();
    initPayablesCardDetailsHowItWorksToggle();
    initPaymentConfirmFlow();
    initHeaderCancelAction();
    var params = new URLSearchParams(window.location.search || '');
    Promise.all([
      loadJsonWithFallbacks(JSON_PATH_FALLBACKS),
      loadJsonWithFallbacks(PAYEES_PATH_FALLBACKS).catch(function () { return { data: [] }; }),
      loadJsonWithFallbacks(PAYMENT_PREFERENCES_DATA_PATHS).catch(function () { return null; }),
      loadJsonWithFallbacks(BANK_ACCOUNTS_PATHS).catch(function () { return null; }),
      loadJsonWithFallbacks(CHECK_ADDRESSES_PATHS).catch(function () { return []; }),
      loadJsonWithFallbacks(CARDS_DATA_PATHS).catch(function () { return []; }),
    ])
      .then(function (results) {
        var payload = results[0];
        var payeesPayload = results[1];
        var prefs = results[2];
        var banksFallback = results[3];
        var checkAddresses = results[4];
        var cardsPayload = results[5];
        var payeesList = getPayeesArray(payeesPayload);
        var rows = normalizePayableRowsForPage(applyStoredPayableOverrides((payload && payload.data) || []), payeesList);
        var row = applyStoredPayPageViewContext(findSelectedPayable(rows, params), params);
        var payeeProfile = findPayeeProfile(payeesList, row);
        populatePage(row, payeeProfile);
        var bankAccounts = (prefs && Array.isArray(prefs.bankAccounts) ? prefs.bankAccounts : null) || (Array.isArray(banksFallback) ? banksFallback : []);
        applyConfirmedScheduleDate(getScheduledPaymentDateIso(row));
        initOriginationAccountSelector(bankAccounts, row);
        initPaymentMethodFlow(payeesList, row, bankAccounts, Array.isArray(checkAddresses) ? checkAddresses : [], cardsPayload);
        updatePayStepStates();
        applyConfirmedPayPageReadOnlyState(row);
      })
      .catch(function () {
        setText('gp-amount', '$0.00');
        setText('gp-currency', 'USD');
        setText('gp-date', '--');
        setText('gp-customer', '--');
        setText('gp-invoice', '--');
        setStatusBadge('ready_to_pay', 'Unprocessed');
        applyConfirmedScheduleDate('');
        initOriginationAccountSelector([], null);
        initPaymentMethodFlow([], null, [], [], []);
        updatePayStepStates();
        applyConfirmedPayPageReadOnlyState(null);
      });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
