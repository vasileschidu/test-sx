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
  var STEP_BADGE_NUMBER_CLASS =
    'inline-flex size-5 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-gray-100 text-xs font-medium text-gray-800 dark:border-white/10 dark:bg-white/10 dark:text-gray-300';
  var STEP_BADGE_COMPLETE_CLASS =
    'inline-flex size-5 shrink-0 items-center justify-center rounded-full border border-blue-300 bg-blue-100 text-blue-700 dark:border-blue-500/40 dark:bg-blue-400/15 dark:text-blue-300';
  var STEP_BADGE_CHECK_ICON =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="size-3.5" aria-hidden="true">' +
      '<path fill-rule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clip-rule="evenodd" />' +
    '</svg>';
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
      paid: 'bg-green-50 text-green-700 inset-ring-green-600/20 dark:bg-green-500/10 dark:text-green-400 dark:inset-ring-green-500/20',
      exception: 'bg-red-50 text-red-700 inset-ring-red-600/10 dark:bg-red-400/10 dark:text-red-400 dark:inset-ring-red-400/20',
    };
    var labels = {
      ready_to_pay: 'Unprocessed',
      in_progress: 'In Progress',
      paid: 'Paid',
      exception: 'Failed',
    };
    var key = String(status || 'ready_to_pay');
    el.className = 'inline-flex items-center rounded-md px-2 py-1 text-xs font-medium inset-ring ' + (styles[key] || styles.ready_to_pay);
    el.textContent = String(statusLabel || labels[key] || labels.ready_to_pay);
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
    if (!wrap || !panel || !simpleBtn || !segmentedChip || !dateBtn || !clearBtn || !prev || !next || !grid || !confirmBtn || !chipText || !dateInput || !dateMaskFilled || !dateMaskEmpty) return;

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
    if (selectedMethod === 'ach' || selectedMethod === 'wire') {
      step2Done = !!getSelectedOptionValueByOptionsId('gp-bank-account-select');
    } else if (selectedMethod === 'card') {
      step2Done = !!getSelectedOptionValueByOptionsId('pp-pay-card-options');
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

  function populatePaymentConfirmModal(selection) {
    if (!selection) return;
    setText('pp-confirm-amount', selection.amount);
    setText('pp-confirm-date', formatDate(selection.paymentDateIso));
    setText('pp-confirm-method', selection.methodLabel);
    setText('pp-confirm-origin-name', selection.originName);
    setText('pp-confirm-origin-sub', selection.originSub);
    setText('pp-confirm-recipient-name', selection.recipientName);
    setText('pp-confirm-recipient-sub', selection.recipientAccount !== '--' ? selection.recipientAccount : (selection.recipientRouting !== '--' ? selection.recipientRouting : selection.recipientAddress));
  }

  function populateSubmitSuccessModal(selection) {
    if (!selection) return;
    setText('gp-submit-amount', selection.amount);
    setText('gp-submit-date', formatDate(selection.paymentDateIso));
    setText('gp-submit-method', selection.methodLabel);
    setText('gp-submit-txid', 'TX-' + String(Date.now()).slice(-8));
    var bankRow = document.getElementById('gp-submit-bank-row');
    var checkRow = document.getElementById('gp-submit-check-row');
    if (bankRow) bankRow.classList.toggle('hidden', !(selection.methodId === 'ach' || selection.methodId === 'wire'));
    if (checkRow) checkRow.classList.add('hidden');
    setText('gp-submit-bank-name', selection.recipientBankLabel || selection.recipientName || '--');
  }

  function initPaymentConfirmFlow() {
    var entryBtn = document.getElementById('gp-submit-btn');
    var confirmBtn = document.getElementById('pp-payment-confirm-submit-btn');
    if (!entryBtn || !confirmBtn) return;

    entryBtn.addEventListener('click', function (event) {
      event.preventDefault();
      var selection = getCurrentBankRecipientDetails();
      if (!selection) {
        if (typeof window.showGlobalTopToast === 'function') {
          window.showGlobalTopToast('Select a bank destination to continue.');
        }
        return;
      }
      populatePaymentConfirmModal(selection);
      openDialogById('pp-payment-confirm-dialog');
    });

    confirmBtn.addEventListener('click', function (event) {
      event.preventDefault();
      var selection = getCurrentBankRecipientDetails();
      if (!selection) return;
      populateSubmitSuccessModal(selection);
      closeDialogById('pp-payment-confirm-dialog');
      openDialogById('gp-submit-success-dialog');
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
      selectedEl.innerHTML = '<span class="truncate text-gray-400 dark:text-gray-500">' + escapeHtml(placeholder || 'Select') + '</span>';
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
      var selected = null;
      for (var i = 0; i < list.length; i++) {
        if (String(list[i].id) === String(id)) { selected = list[i]; break; }
      }
      optionsEl.querySelectorAll('el-option').forEach(function (opt) {
        if (String(opt.getAttribute('value') || '') === String(id)) opt.setAttribute('aria-selected', 'true');
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
      apply(option.getAttribute('value'));
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
    if (bankDetails) bankDetails.classList.add('hidden');
    if (checkDetails) checkDetails.classList.add('hidden');
    if (smartDisburseDetails) smartDisburseDetails.classList.add('hidden');
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
          '<span class="inline-flex max-w-full items-center gap-1 rounded-md bg-gray-100 px-2 py-0.5 text-sm font-medium text-gray-700 dark:bg-white/10 dark:text-gray-200">' +
          '  <span class="truncate">' + escapeHtml(tokenText(token)) + '</span>' +
          '  <button type="button" data-token-remove="' + idx + '" class="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-sm text-gray-500 hover:bg-gray-200 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/10 dark:hover:text-gray-200 cursor-pointer" aria-label="Remove destination">' +
          '    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="size-3.5"><path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z"/></svg>' +
          '  </button>' +
          '</span>';
      }).join('');
      combo.setAttribute('data-token-count', String(tokens.length));
      input.placeholder = tokens.length ? '' : (config.placeholder || 'Choose destination');
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
      var removeBtn = event.target.closest('[data-token-remove]');
      if (!removeBtn) return;
      var idx = Number(removeBtn.getAttribute('data-token-remove'));
      if (isNaN(idx) || idx < 0 || idx >= tokens.length) return;
      tokens.splice(idx, 1);
      renderTokens();
      input.focus();
    };

    input.onfocus = function () {
      renderList(input.value);
    };

    input.oninput = function () {
      setInputWeight();
      renderList(input.value);
      updatePayStepStates();
    };

    input.onkeydown = function (event) {
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
  }

  function initSmartDisburseTypeahead(contacts) {
    initDestinationTypeahead({
      comboboxId: 'pp-smart-disburse-contact-combobox',
      tokensId: 'pp-smart-disburse-contact-tokens',
      inputId: 'pp-smart-disburse-contact-input',
      listId: 'pp-smart-disburse-contact-list',
      placeholder: 'Choose destination'
    }, contacts);
  }

  function initSmartExchangeTypeahead(contacts) {
    initDestinationTypeahead({
      comboboxId: 'pp-smart-exchange-contact-combobox',
      tokensId: 'pp-smart-exchange-contact-tokens',
      inputId: 'pp-smart-exchange-contact-input',
      listId: 'pp-smart-exchange-contact-list',
      placeholder: 'Choose destination'
    }, contacts);
  }

  function initPaymentMethodFlow(payeesList, row, fallbackBanks, fallbackAddresses) {
    var detailsWrap = document.getElementById('gp-payment-method-details');
    if (!detailsWrap) return;
    _payContext.row = row || null;
    _payContext.payeeProfile = findPayeeProfile(payeesList, row);
    var normalized = normalizeMethods(_payContext.payeeProfile, fallbackBanks, fallbackAddresses);

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
    if (normalized.card.length) methodItems.push({
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
              var selected = null;
              accounts.forEach(function (a) { if (String(a.id) === String(opt.getAttribute('value'))) selected = a; });
              bankOpts.querySelectorAll('el-option').forEach(function (el) {
                if (el === opt) el.setAttribute('aria-selected', 'true'); else el.removeAttribute('aria-selected');
              });
              if (!selected) return;
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
              updatePayStepStates();
            };
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
          if (cardSel && cardContent && cardOpts) {
            cardOpts.innerHTML = normalized.card.map(function (c) {
              return buildSimpleOptionHtml(c.id, c.label, '');
            }).join('');
            setSelectedContent(cardContent, '', 'Select card');
            cardOpts.onclick = function (ev) {
              var opt = ev.target.closest('el-option');
              if (!opt) return;
              var selected = null;
              normalized.card.forEach(function (c) { if (String(c.id) === String(opt.getAttribute('value'))) selected = c; });
              cardOpts.querySelectorAll('el-option').forEach(function (el) {
                if (el === opt) el.setAttribute('aria-selected', 'true'); else el.removeAttribute('aria-selected');
              });
              if (!selected) return;
              setSelectedContent(cardContent, selected.label, '');
              setText('gp-pmc-card-name', selected.cardholderName || _payContext.row.payeeName);
              setText('gp-pmc-card-address', selected.cardholderAddress || '--');
              updatePayStepStates();
            };
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
              var selected = null;
              normalized.check.forEach(function (c) { if (String(c.id) === String(opt.getAttribute('value'))) selected = c; });
              checkOpts.querySelectorAll('el-option').forEach(function (el) {
                if (el === opt) el.setAttribute('aria-selected', 'true'); else el.removeAttribute('aria-selected');
              });
              if (!selected) return;
              checkSelContent.innerHTML = buildSelectFilledContent({
                label: selected.label || selected.displayName || selected.name || 'Mailing Address',
                icon: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M16.25 2C16.6642 2 17 2.33579 17 2.75C17 3.16421 16.6642 3.5 16.25 3.5H16V16.5H16.25C16.6642 16.5 17 16.8358 17 17.25C17 17.6642 16.6642 18 16.25 18H12.75C12.3358 18 12 17.6642 12 17.25V14.75C12 14.3358 11.6642 14 11.25 14H8.75C8.33579 14 8 14.3358 8 14.75V17.25C8 17.6642 7.66421 18 7.25 18H3.75C3.33579 18 3 17.6642 3 17.25C3 16.8358 3.33579 16.5 3.75 16.5H4V3.5H3.75C3.33579 3.5 3 3.16421 3 2.75C3 2.33579 3.33579 2 3.75 2H16.25ZM7.5 9C7.22386 9 7 9.22386 7 9.5V10.5C7 10.7761 7.22386 11 7.5 11H8.5C8.77614 11 9 10.7761 9 10.5V9.5C9 9.22386 8.77614 9 8.5 9H7.5ZM11.5 9C11.2239 9 11 9.22386 11 9.5V10.5C11 10.7761 11.2239 11 11.5 11H12.5C12.7761 11 13 10.7761 13 10.5V9.5C13 9.22386 12.7761 9 12.5 9H11.5ZM7.5 5C7.22386 5 7 5.22386 7 5.5V6.5C7 6.77614 7.22386 7 7.5 7H8.5C8.77614 7 9 6.77614 9 6.5V5.5C9 5.22386 8.77614 5 8.5 5H7.5ZM11.5 5C11.2239 5 11 5.22386 11 5.5V6.5C11 6.77614 11.2239 7 11.5 7H12.5C12.7761 7 13 6.77614 13 6.5V5.5C13 5.22386 12.7761 5 12.5 5H11.5Z" fill="#6B7280" /></svg>',
                selectedIcon: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M16.25 2C16.6642 2 17 2.33579 17 2.75C17 3.16421 16.6642 3.5 16.25 3.5H16V16.5H16.25C16.6642 16.5 17 16.8358 17 17.25C17 17.6642 16.6642 18 16.25 18H12.75C12.3358 18 12 17.6642 12 17.25V14.75C12 14.3358 11.6642 14 11.25 14H8.75C8.33579 14 8 14.3358 8 14.75V17.25C8 17.6642 7.66421 18 7.25 18H3.75C3.33579 18 3 17.6642 3 17.25C3 16.8358 3.33579 16.5 3.75 16.5H4V3.5H3.75C3.33579 3.5 3 3.16421 3 2.75C3 2.33579 3.33579 2 3.75 2H16.25ZM7.5 9C7.22386 9 7 9.22386 7 9.5V10.5C7 10.7761 7.22386 11 7.5 11H8.5C8.77614 11 9 10.7761 9 10.5V9.5C9 9.22386 8.77614 9 8.5 9H7.5ZM11.5 9C11.2239 9 11 9.22386 11 9.5V10.5C11 10.7761 11.2239 11 11.5 11H12.5C12.7761 11 13 10.7761 13 10.5V9.5C13 9.22386 12.7761 9 12.5 9H11.5ZM7.5 5C7.22386 5 7 5.22386 7 5.5V6.5C7 6.77614 7.22386 7 7.5 7H8.5C8.77614 7 9 6.77614 9 6.5V5.5C9 5.22386 8.77614 5 8.5 5H7.5ZM11.5 5C11.2239 5 11 5.22386 11 5.5V6.5C11 6.77614 11.2239 7 11.5 7H12.5C12.7761 7 13 6.77614 13 6.5V5.5C13 5.22386 12.7761 5 12.5 5H11.5Z" fill="#6B7280" /></svg>'
              });
              setText('gp-pmc-check-name', selected.name || _payContext.row.payeeName);
              setText('gp-pmc-check-address', selected.address || '--');
              var details = document.getElementById('gp-pmc-check-details');
              if (details) details.classList.remove('hidden');
              updatePayStepStates();
            };
          }
          updatePayStepStates();
          return;
        }

        if (item.id === 'smart_disburse') {
          var sdPanel = document.getElementById('gp-pmc-smart-disburse');
          var sdDetailsPanel = document.getElementById('gp-pmc-smart-disburse-details');
          if (sdPanel) sdPanel.classList.remove('hidden');
          var activeSdContacts = collectSmartDisburseContacts(normalized.smartDisburse);
          initSmartDisburseTypeahead(activeSdContacts);
          if (sdDetailsPanel) sdDetailsPanel.classList.remove('hidden');
          updatePayStepStates();
          return;
        }

        if (item.id === 'smart_exchange') {
          var sxPanel = document.getElementById('gp-pmc-smart-exchange');
          var sxDetailsPanel = document.getElementById('gp-pmc-smart-exchange-details');
          if (sxPanel) sxPanel.classList.remove('hidden');
          var sxContacts = collectSmartDisburseContacts(normalized.smartDisburse);
          initSmartExchangeTypeahead(sxContacts);
          if (sxDetailsPanel) sxDetailsPanel.classList.remove('hidden');
          updatePayStepStates();
          return;
        }
      }
    );

    hideAllPaymentMethodPanels();
    applyMethod('');
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
      window.location.href = './bills-and-payables.html';
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

  function initOriginationAccountSelector(accounts) {
    var list = Array.isArray(accounts) ? accounts.filter(function (a) { return a && a.id; }) : [];
    var selectEl = document.getElementById('pp-orig-bank-select');
    var optionsEl = document.getElementById('pp-orig-bank-options');
    var selectedEl = document.getElementById('pp-orig-bank-selected');
    if (!selectEl || !optionsEl || !selectedEl) return;

    optionsEl.innerHTML = list.map(buildBankOptionHtml).join('');

    function resetSelection() {
      selectedEl.innerHTML = '<span class="truncate text-gray-400 dark:text-gray-500">Select origination account</span>';
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
      applySelection(option.getAttribute('value'));
    });

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

    setText('gp-submit-amount', formatMoney(row.amount, row.currency));
    setText('gp-submit-date', formatDate(row.dueDate));
    setStatusBadge(row.status, row.statusLabel);
    renderPillAttachments(row);
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
    initPaymentConfirmFlow();
    var params = new URLSearchParams(window.location.search || '');
    Promise.all([
      loadJsonWithFallbacks(JSON_PATH_FALLBACKS),
      loadJsonWithFallbacks(PAYEES_PATH_FALLBACKS).catch(function () { return { data: [] }; }),
      loadJsonWithFallbacks(PAYMENT_PREFERENCES_DATA_PATHS).catch(function () { return null; }),
      loadJsonWithFallbacks(BANK_ACCOUNTS_PATHS).catch(function () { return null; }),
      loadJsonWithFallbacks(CHECK_ADDRESSES_PATHS).catch(function () { return []; }),
    ])
      .then(function (results) {
        var payload = results[0];
        var payeesPayload = results[1];
        var prefs = results[2];
        var banksFallback = results[3];
        var checkAddresses = results[4];
        var payeesList = getPayeesArray(payeesPayload);
        var row = findSelectedPayable(payload && payload.data, params);
        var payeeProfile = findPayeeProfile(payeesList, row);
        populatePage(row, payeeProfile);
        var bankAccounts = (prefs && Array.isArray(prefs.bankAccounts) ? prefs.bankAccounts : null) || (Array.isArray(banksFallback) ? banksFallback : []);
        initOriginationAccountSelector(bankAccounts);
        initPaymentMethodFlow(payeesList, row, bankAccounts, Array.isArray(checkAddresses) ? checkAddresses : []);
        updatePayStepStates();
      })
      .catch(function () {
        setText('gp-amount', '$0.00');
        setText('gp-currency', 'USD');
        setText('gp-date', '--');
        setText('gp-customer', '--');
        setText('gp-invoice', '--');
        setStatusBadge('ready_to_pay', 'Unprocessed');
        initOriginationAccountSelector([]);
        initPaymentMethodFlow([], null, [], []);
        updatePayStepStates();
      });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
