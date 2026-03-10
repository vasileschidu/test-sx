        (function () {
            var PAYMENT_PREFS_DATA_URL = '../../data/payment-preferences-data.json';
            var exchangesDataUrl = '../../data/exchanges.json';
            var customersFallbackUrl = '../../data/customers.json';
            var bankAccountsFallbackUrl = '../../data/bank-accounts.json';
            var checkAddressesFallbackUrl = '../../data/check-addresses.json';
            var sharedDataPromise = null;

            function getDigits(value) {
                return String(value || '').replace(/\D/g, '');
            }

            function formatCard16(cardDigits) {
                return String(cardDigits || '').slice(0, 16).replace(/(\d{4})(?=\d)/g, '$1 ').trim();
            }

            function getRevealedCardNumber(paymentInfo, fallbackEnding) {
                var fullDigits = getDigits(paymentInfo && paymentInfo.fullCardNumber);
                if (fullDigits.length >= 16) return formatCard16(fullDigits);

                var baseDigits = getDigits(paymentInfo && paymentInfo.cardNumber) || getDigits(fallbackEnding);
                var last4 = baseDigits.slice(-4) || '4242';
                return formatCard16(last4 + last4 + last4 + last4);
            }

            function getRevealedCvc2(paymentInfo) {
                var cvcFull = getDigits(paymentInfo && paymentInfo.cvcFull);
                if (cvcFull.length >= 3) return cvcFull.slice(0, 3);
                var cvc = getDigits(paymentInfo && paymentInfo.cvc);
                if (cvc.length >= 3) return cvc.slice(0, 3);
                return '999';
            }

            function formatCurrency(amount, currency) {
                try {
                    return Number(amount).toLocaleString('en-US', {
                        style: 'currency',
                        currency: currency || 'USD',
                        minimumFractionDigits: 2
                    });
                } catch (error) {
                    return '$' + Number(amount || 0).toFixed(2);
                }
            }

            function extractCardsFromExchanges(exchangePayload) {
                if (!exchangePayload || !Array.isArray(exchangePayload.entries)) return [];
                var cards = [];
                exchangePayload.entries.forEach(function (entry, index) {
                    if (!entry || entry.paymentMethod !== 'Card') return;
                    var details = entry.details && typeof entry.details === 'object' ? entry.details : null;
                    var paymentInfo = details && details.paymentInfo && typeof details.paymentInfo === 'object' ? details.paymentInfo : null;
                    if (!paymentInfo || paymentInfo.type !== 'card') return;

                    var endingDigits = getDigits(paymentInfo.cardNumber || entry.paymentMethodEnding);
                    var last4 = endingDigits.slice(-4) || '0000';
                    cards.push({
                        id: String(entry.invoice || ('card-' + (index + 1))),
                        vendorName: String(entry.customer || paymentInfo.cardholderName || 'Customer'),
                        holderName: String(paymentInfo.cardholderName || entry.customer || ''),
                        fullNumber: String(getRevealedCardNumber(paymentInfo, entry.paymentMethodEnding || '').replace(/\s/g, '')),
                        last4: last4,
                        expiration: String(paymentInfo.expires || ''),
                        expirationFull: String(paymentInfo.expires || ''),
                        cvc2: String(getRevealedCvc2(paymentInfo)),
                        pendingAmount: formatCurrency(entry.amount, entry.currency),
                        billingAddress: String(paymentInfo.cardholderAddress || ''),
                        status: String(entry.status || '').toLowerCase() === 'failed' ? 'inactive' : 'active'
                    });
                });
                return cards;
            }

            window.__ppLoadSharedData = function () {
                if (!sharedDataPromise) {
                    sharedDataPromise = fetch(PAYMENT_PREFS_DATA_URL)
                        .then(function (res) {
                            if (!res.ok) throw new Error('Failed loading shared data');
                            return res.json();
                        })
                        .then(function (payload) {
                            payload = payload && typeof payload === 'object' ? payload : {};
                            return Promise.all([
                                fetch(checkAddressesFallbackUrl).then(function (res) { return res.ok ? res.json() : []; }).catch(function () { return []; }),
                                fetch(exchangesDataUrl).then(function (res) { return res.ok ? res.json() : null; }).catch(function () { return null; })
                            ]).then(function (result) {
                                payload.checkAddresses = Array.isArray(result[0]) ? result[0] : [];
                                payload.cards = extractCardsFromExchanges(result[1]);
                                return payload;
                            });
                        })
                        .catch(function () {
                            return Promise.all([
                                fetch(customersFallbackUrl).then(function (res) { return res.ok ? res.json() : []; }).catch(function () { return []; }),
                                fetch(bankAccountsFallbackUrl).then(function (res) { return res.ok ? res.json() : []; }).catch(function () { return []; }),
                                fetch(checkAddressesFallbackUrl).then(function (res) { return res.ok ? res.json() : []; }).catch(function () { return []; }),
                                fetch(exchangesDataUrl).then(function (res) { return res.ok ? res.json() : null; }).catch(function () { return null; })
                            ]).then(function (result) {
                                return {
                                    customers: Array.isArray(result[0]) ? result[0] : [],
                                    bankAccounts: Array.isArray(result[1]) ? result[1] : [],
                                    checkAddresses: Array.isArray(result[2]) ? result[2] : [],
                                    cards: extractCardsFromExchanges(result[3])
                                };
                            });
                        });
                }
                return sharedDataPromise;
            };
        })();

        (function () {
            window.__ppInitFooterActions = function (config) {
                config = config || {};
                var undoBtn = config.undoBtn || null;
                var saveBtn = config.saveBtn || null;
                var isDirty = false;

                function setDirty(nextDirty) {
                    isDirty = !!nextDirty;
                    if (undoBtn) undoBtn.disabled = !isDirty;
                }

                if (undoBtn) {
                    undoBtn.addEventListener('click', function () {
                        if (typeof config.onUndo === 'function') config.onUndo(setDirty);
                    });
                }

                if (saveBtn) {
                    saveBtn.addEventListener('click', function () {
                        if (typeof config.onSave === 'function') config.onSave(setDirty);
                        else setDirty(false);
                    });
                }

                setDirty(false);
                return {
                    setDirty: setDirty,
                    isDirty: function () { return isDirty; }
                };
            };
        })();

        (function () {
            var cardsListEl = document.getElementById('pp-payer-cards-list');
            var cardsToggleBtn = document.getElementById('pp-payer-cards-toggle');
            var cardsToggleLabel = document.getElementById('pp-payer-cards-toggle-label');
            var cardsToggleIcon = document.getElementById('pp-payer-cards-toggle-icon');
            var cardsSearchInput = document.getElementById('pp-cards-search-input');
            var cardsActiveOnlyInput = document.getElementById('pp-cards-active-only');
            var cardsFilterBtn = document.getElementById('pp-cards-filter-btn');
            var cardsFilterDropdown = document.getElementById('pp-cards-filter-dropdown');
            var cardsFilterMenu = document.getElementById('pp-cards-filter-menu');
            var cardsFilterBackdrop = document.getElementById('pp-cards-filter-backdrop');
            var filterTrack = document.getElementById('pp-cards-filter-track');
            var filterRootPanel = document.getElementById('pp-cards-filter-panel-root');
            var filterDetailSlot = document.getElementById('pp-cards-filter-detail-slot');
            var filterCustomerPanel = document.getElementById('pp-cards-filter-panel-customer');
            var filterStatusPanel = document.getElementById('pp-cards-filter-panel-status');
            var filterCustomersWrap = document.getElementById('pp-cards-filter-customers');
            var filterStatusesWrap = document.getElementById('pp-cards-filter-statuses');
            var filterApplyBtn = document.getElementById('pp-cards-filter-apply-btn');
            var filterApplyStatusBtn = document.getElementById('pp-cards-filter-apply-status-btn');
            var activeFiltersWrap = document.getElementById('pp-cards-active-filters');
            var cardDetailsDialog = document.getElementById('pp-card-details-dialog');
            var vcAmountEl = document.getElementById('pp-vc-amount');
            var vcCardNumberEl = document.getElementById('pp-vc-card-number');
            var vcExpiryEl = document.getElementById('pp-vc-expiry');
            var vcNameEl = document.getElementById('pp-vc-name');
            var vcPendingAmountEl = document.getElementById('pp-vc-pending-amount');
            var vcHolderNameEl = document.getElementById('pp-vc-holder-name');
            var vcCardAddressEl = document.getElementById('pp-vc-card-address');
            var vcFullNumberEl = document.getElementById('pp-vc-full-number');
            var vcFullExpiryEl = document.getElementById('pp-vc-full-expiry');
            var vcCvc2El = document.getElementById('pp-vc-cvc2');
            if (!cardsListEl || !cardsToggleBtn || !cardsToggleLabel || !cardsToggleIcon) return;

            var INITIAL_VISIBLE = 6;
            var allCards = [];
            var filteredCards = [];
            var isExpanded = false;
            var searchTerm = '';
            var selectedCustomers = new Set();
            var selectedStatuses = new Set();
            var isFilterMenuOpen = false;
            var activeFilterPanel = 'root';
            var cardsById = new Map();
            var STATUS_LABELS = { active: 'Active', inactive: 'Inactive' };

            function escapeHtml(value) {
                return String(value || '')
                    .replace(/&/g, '&amp;')
                    .replace(/</g, '&lt;')
                    .replace(/>/g, '&gt;')
                    .replace(/"/g, '&quot;')
                    .replace(/'/g, '&#39;');
            }

            function buildVisaBadge(index) {
                var gradId = 'visa-grad-pp-' + index;
                return '' +
                    '<svg width="24" height="16" viewBox="0 0 24 16" fill="none" xmlns="http://www.w3.org/2000/svg">' +
                    '  <rect width="24" height="16" rx="1.2" fill="url(#' + gradId + ')" />' +
                    '  <path d="M12.309 7.05313C12.2987 7.85651 13.0305 8.30487 13.5818 8.57141C14.1483 8.84493 14.3385 9.0203 14.3364 9.26485C14.3321 9.6392 13.8845 9.80438 13.4656 9.81081C12.7349 9.82208 12.3101 9.61506 11.9722 9.45846L11.709 10.6807C12.0479 10.8357 12.6754 10.9708 13.3262 10.9767C14.8536 10.9767 15.853 10.2286 15.8584 9.06857C15.8644 7.5964 13.8061 7.51489 13.8202 6.85684C13.8251 6.65733 14.0169 6.44442 14.4374 6.39025C14.6455 6.3629 15.2201 6.34198 15.8714 6.63963L16.127 5.45708C15.7768 5.33051 15.3266 5.2093 14.7661 5.2093C13.3283 5.2093 12.3171 5.96764 12.309 7.05313ZM18.5836 5.3112C18.3047 5.3112 18.0696 5.47263 17.9647 5.7204L15.7827 10.8899H17.3091L17.6129 10.057H19.4781L19.6543 10.8899H20.9996L19.8257 5.3112H18.5836ZM18.7971 6.81822L19.2376 8.91304H18.0312L18.7971 6.81822ZM10.4583 5.3112L9.25517 10.8899H10.7096L11.9122 5.3112H10.4583ZM8.3066 5.3112L6.79266 9.10825L6.18028 5.87969C6.1084 5.51929 5.82464 5.3112 5.50953 5.3112H3.03459L3 5.47317C3.50807 5.58257 4.08532 5.75902 4.43502 5.9478C4.64906 6.0631 4.71013 6.16393 4.7804 6.43798L5.9403 10.8899H7.47747L9.83404 5.3112H8.3066Z" fill="white" />' +
                    '  <defs>' +
                    '    <linearGradient id="' + gradId + '" x1="10.7812" y1="16" x2="15.6708" y2="0.32624" gradientUnits="userSpaceOnUse">' +
                    '      <stop stop-color="#222357" />' +
                    '      <stop offset="1" stop-color="#254AA5" />' +
                    '    </linearGradient>' +
                    '  </defs>' +
                    '</svg>';
            }

            function buildCardRow(card, index) {
                var isInactive = card && card.status === 'inactive';
                var rowBgClass = isInactive ? ' bg-gray-100 dark:bg-white/10' : ' bg-gray-50 dark:bg-white/5';
                return '' +
                    '<div class="flex items-center gap-3 p-3 self-stretch rounded-lg' + rowBgClass + '">' +
                    '  <div class="flex items-center gap-3 grow shrink-0 basis-0 min-w-0' + (isInactive ? ' opacity-40' : '') + '">' +
                    '    <div class="flex flex-col items-start p-2">' + buildVisaBadge(index) + '</div>' +
                    '    <div class="flex flex-col gap-1 grow shrink-0 basis-0 min-w-0">' +
                    '      <span class="text-sm font-semibold text-gray-900 dark:text-gray-100">' + escapeHtml(card.vendorName) + ' •••• ' + escapeHtml(card.last4) + '</span>' +
                    '      <span class="text-sm font-normal text-gray-500 dark:text-gray-400">Expiration ' + escapeHtml(card.expiration) + '</span>' +
                    '    </div>' +
                    '  </div>' +
                    '  <el-dropdown class="shrink-0 inline-block">' +
                    '    <button type="button" class="rounded-md p-1.5 text-gray-500 hover:bg-gray-200 hover:text-gray-600 transition-colors dark:text-gray-500 dark:hover:bg-white/10 dark:hover:text-gray-300 cursor-pointer">' +
                    '      <span class="sr-only">Open card actions</span>' +
                    '      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="size-4">' +
                    '        <path d="M10 3a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3ZM10 8.5a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3ZM11.5 15.5a1.5 1.5 0 1 0-3 0 1.5 1.5 0 0 0 3 0Z" />' +
                    '      </svg>' +
                    '    </button>' +
                    '    <el-menu anchor="bottom end" popover class="min-w-56 origin-top-right rounded-md bg-white shadow-lg outline-1 outline-black/5 transition transition-discrete [--anchor-gap:--spacing(2)] data-closed:scale-95 data-closed:transform data-closed:opacity-0 data-enter:duration-100 data-enter:ease-out data-leave:duration-75 data-leave:ease-in dark:bg-gray-800 dark:shadow-none dark:-outline-offset-1 dark:outline-white/10">' +
                    '      <div class="py-1">' +
                    '        <button type="button" data-view-card-details="' + escapeHtml(card.id) + '" class="flex w-full items-center gap-3 px-3 py-2 text-left text-sm font-medium text-gray-700 hover:bg-gray-100 focus:bg-gray-100 focus:text-gray-900 focus:outline-hidden dark:text-gray-300 dark:hover:bg-white/5 dark:focus:bg-white/5 dark:focus:text-white cursor-pointer">' +
                    '          <span>View card details</span>' +
                    '        </button>' +
                    '        <button type="button" data-view-card-payables="' + escapeHtml(card.id) + '" class="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm font-medium text-gray-700 hover:bg-gray-100 focus:bg-gray-100 focus:text-gray-900 focus:outline-hidden dark:text-gray-300 dark:hover:bg-white/5 dark:focus:bg-white/5 dark:focus:text-white cursor-pointer">' +
                    '          <span>View associated payable(s)</span>' +
                    '          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="size-4 text-gray-500 dark:text-gray-400"><path fill-rule="evenodd" d="M8.22 5.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 1 1-1.06-1.06L11.94 10 8.22 6.28a.75.75 0 0 1 0-1.06Z" clip-rule="evenodd" /></svg>' +
                    '        </button>' +
                    '      </div>' +
                    '    </el-menu>' +
                    '  </el-dropdown>' +
                    '</div>';
            }

            function buildFilterCheckbox(id, text, countText, value, checked) {
                return '' +
                    '<label class="group flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 hover:bg-gray-100 group-has-checked:bg-gray-100 dark:hover:bg-white/5 dark:group-has-checked:bg-white/10">' +
                    '  <div class="grid size-4 grid-cols-1">' +
                    '    <input type="checkbox" data-filter-value="' + escapeHtml(value) + '" id="' + escapeHtml(id) + '"' + (checked ? ' checked' : '') +
                    '      class="col-start-1 row-start-1 appearance-none rounded-sm border border-gray-300 bg-white checked:border-blue-600 checked:bg-blue-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:border-white/20 dark:bg-white/5 dark:checked:border-blue-500 dark:checked:bg-blue-500" />' +
                    '    <svg class="pointer-events-none col-start-1 row-start-1 size-3.5 self-center justify-self-center stroke-white" viewBox="0 0 14 14" fill="none">' +
                    '      <path class="opacity-0 group-has-checked:opacity-100" d="M3 8L6 11L11 3.5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />' +
                    '    </svg>' +
                    '  </div>' +
                    '  <span class="text-sm font-medium text-gray-900 dark:text-gray-100">' + escapeHtml(text) + '</span>' +
                    (countText ? ('<span class="text-sm font-normal text-gray-700 dark:text-gray-300">' + escapeHtml(countText) + '</span>') : '') +
                    '</label>';
            }

            function normalizeCards(payload) {
                if (!payload || !Array.isArray(payload.cards)) return [];
                return payload.cards
                    .map(function (card, index) {
                        if (!card || typeof card !== 'object') return null;
                        var fullNumberDigits = String(card.fullNumber || '').replace(/\D/g, '');
                        var last4 = String(card.last4 || fullNumberDigits.slice(-4) || '');
                        return {
                            id: String(card.id || ('card-' + (index + 1))),
                            vendorName: String(card.vendorName || card.holderName || 'Customer'),
                            holderName: String(card.holderName || card.vendorName || 'Customer'),
                            fullNumber: fullNumberDigits || ('424242424242' + (last4 || '4242')).slice(-16),
                            last4: last4 || '0000',
                            expiration: String(card.expiration || ''),
                            expirationFull: String(card.expirationFull || card.expiration || ''),
                            cvc2: String(card.cvc2 || '999'),
                            pendingAmount: String(card.pendingAmount || '$0.00'),
                            billingAddress: String(card.billingAddress || ''),
                            status: String(card.status || 'active').toLowerCase() === 'inactive' ? 'inactive' : 'active'
                        };
                    })
                    .filter(function (card) { return !!card; });
            }

            function normalizeCustomerNames(payload) {
                if (!payload || !Array.isArray(payload.customers)) return [];
                return payload.customers
                    .map(function (customer) {
                        return customer && typeof customer.name === 'string' ? customer.name.trim() : '';
                    })
                    .filter(function (name) { return !!name; });
            }

            function generateFallbackCards(customerNames) {
                var names = customerNames.length ? customerNames : ['Customer'];
                var total = 12;
                var cards = [];
                for (var i = 0; i < total; i++) {
                    var month = String((i % 12) + 1).padStart(2, '0');
                    var year = String(2026 + Math.floor(i / 8));
                    var fullNumber = '4' + String(100000000000000 + ((i * 98765431 + 1234567) % 900000000000000));
                    cards.push({
                        id: 'fallback-card-' + (i + 1),
                        vendorName: names[i % names.length],
                        holderName: names[i % names.length],
                        fullNumber: fullNumber,
                        last4: fullNumber.slice(-4),
                        expiration: month + '/' + year,
                        expirationFull: month + '/' + year,
                        cvc2: String(100 + ((i * 37 + 19) % 900)),
                        pendingAmount: '$' + (125 + i * 37).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
                        billingAddress: '3476 Orphan Road\nSuite 1010\nHayward, Wisconsin 54843\nUnited States',
                        status: (i % 5 === 0 || i % 9 === 0) ? 'inactive' : 'active'
                    });
                }
                return cards;
            }

            function formatCardNumber(number) {
                return String(number || '').replace(/\D/g, '').replace(/(\d{4})(?=\d)/g, '$1 ').trim();
            }

            function populateCardDetailsModal(card) {
                if (!card) return;
                if (vcAmountEl) vcAmountEl.textContent = card.pendingAmount || '$0.00';
                if (vcCardNumberEl) vcCardNumberEl.textContent = formatCardNumber(card.fullNumber);
                if (vcExpiryEl) vcExpiryEl.textContent = card.expiration || '';
                if (vcNameEl) vcNameEl.textContent = (card.holderName || '').toUpperCase();
                if (vcPendingAmountEl) vcPendingAmountEl.textContent = card.pendingAmount || '$0.00';
                if (vcHolderNameEl) vcHolderNameEl.textContent = card.holderName || '';
                if (vcCardAddressEl) vcCardAddressEl.textContent = card.billingAddress || '';
                if (vcFullNumberEl) vcFullNumberEl.textContent = formatCardNumber(card.fullNumber);
                if (vcFullExpiryEl) vcFullExpiryEl.textContent = card.expirationFull || '';
                if (vcCvc2El) vcCvc2El.textContent = card.cvc2 || '';
            }

            function initCardModalCopy() {
                var map = [
                    { valueId: 'pp-vc-full-number', selector: '[data-copy-id="pp-vc-full-number"]' },
                    { valueId: 'pp-vc-full-expiry', selector: '[data-copy-id="pp-vc-full-expiry"]' },
                    { valueId: 'pp-vc-cvc2', selector: '[data-copy-id="pp-vc-cvc2"]' }
                ];
                map.forEach(function (item) {
                    var valueEl = document.getElementById(item.valueId);
                    var btn = document.querySelector(item.selector);
                    if (!valueEl || !btn) return;
                    btn.addEventListener('click', function (event) {
                        event.preventDefault();
                        event.stopPropagation();
                        var text = String(valueEl.textContent || '').trim();
                        if (!text) return;
                        if (window.copyTextWithFeedback) window.copyTextWithFeedback(text, btn);
                    });
                });
            }

            function getCustomerCounts() {
                var counts = new Map();
                allCards.forEach(function (card) {
                    var name = card.vendorName || 'Customer';
                    counts.set(name, (counts.get(name) || 0) + 1);
                });
                return Array.from(counts.entries()).sort(function (a, b) {
                    return a[0].localeCompare(b[0]);
                });
            }

            function renderCustomerFilters() {
                if (!filterCustomersWrap) return;
                var customerEntries = getCustomerCounts();
                filterCustomersWrap.innerHTML = customerEntries
                    .map(function (entry, idx) {
                        return buildFilterCheckbox(
                            'pp-filter-customer-' + idx,
                            entry[0],
                            String(entry[1]),
                            entry[0],
                            selectedCustomers.has(entry[0])
                        );
                    })
                    .join('');
            }

            function renderStatusFilters() {
                if (!filterStatusesWrap) return;
                var activeCount = allCards.filter(function (card) { return card.status === 'active'; }).length;
                var inactiveCount = allCards.filter(function (card) { return card.status === 'inactive'; }).length;
                var rows = [
                    { key: 'active', label: 'Active', count: activeCount },
                    { key: 'inactive', label: 'Inactive', count: inactiveCount }
                ];
                filterStatusesWrap.innerHTML = rows
                    .map(function (row, idx) {
                        return buildFilterCheckbox(
                            'pp-filter-status-' + idx,
                            row.label,
                            String(row.count),
                            row.key,
                            selectedStatuses.has(row.key)
                        );
                    })
                    .join('');
            }

            function applyFilters() {
                var term = searchTerm.trim().toLowerCase();
                filteredCards = allCards.filter(function (card) {
                    var matchesTerm = !term || (card.vendorName || '').toLowerCase().indexOf(term) !== -1;
                    if (!matchesTerm) return false;

                    var matchesCustomer = selectedCustomers.size === 0 || selectedCustomers.has(card.vendorName);
                    if (!matchesCustomer) return false;

                    if (cardsActiveOnlyInput && cardsActiveOnlyInput.checked) {
                        return card.status === 'active';
                    }
                    return selectedStatuses.size === 0 || selectedStatuses.has(card.status);
                });
            }

            function syncApplyButtonState() {
                if (filterApplyBtn) filterApplyBtn.disabled = selectedCustomers.size === 0;
                if (filterApplyStatusBtn) filterApplyStatusBtn.disabled = selectedStatuses.size === 0;
            }

            function renderActiveFilterTags() {
                if (!activeFiltersWrap) return;
                var tags = [];

                var customerValues = Array.from(selectedCustomers)
                    .filter(function (customer) { return customer && customer.trim(); })
                    .sort(function (a, b) { return a.localeCompare(b); });
                if (customerValues.length) {
                    tags.push({
                        type: 'customer',
                        label: 'Customer',
                        value: customerValues.join(', ')
                    });
                }

                var statusValues = Array.from(selectedStatuses)
                    .filter(function (status) { return status && status.trim(); })
                    .sort(function (a, b) { return a.localeCompare(b); });
                if (statusValues.length) {
                    tags.push({
                        type: 'status',
                        label: 'Status',
                        value: statusValues.map(function (status) { return STATUS_LABELS[status] || status; }).join(', ')
                    });
                }

                if (!tags.length) {
                    activeFiltersWrap.innerHTML = '';
                    activeFiltersWrap.classList.add('hidden');
                    return;
                }

                activeFiltersWrap.classList.remove('hidden');
                activeFiltersWrap.innerHTML = tags.map(function (tag) {
                    var byLabel = 'By ' + String(tag.label || '').toLowerCase();
                    return '' +
                        '<span class="relative inline-flex max-w-[360px] items-stretch overflow-hidden rounded-md bg-gray-50 text-xs font-medium text-gray-600 dark:bg-white/10 dark:text-gray-300">' +
                        '  <span class="inline-flex shrink-0 items-center bg-gray-100 px-2 py-1 font-medium text-gray-900 dark:bg-white/15 dark:text-white">' + escapeHtml(byLabel) + '</span>' +
                        '  <button type="button" data-filter-tag-open="' + escapeHtml(tag.type) + '" title="' + escapeHtml(tag.label + ': ' + tag.value) + '"' +
                        '    class="inline-flex min-w-0 items-center border-l border-gray-300 bg-white px-2 py-1 text-left hover:bg-gray-100 dark:border-gray-500/40 dark:bg-white/5 dark:hover:bg-white/15 cursor-pointer">' +
                        '    <span class="truncate font-medium text-gray-900 dark:text-white">' + escapeHtml(tag.value) + '</span>' +
                        '  </button>' +
                        '  <button type="button" data-filter-tag-remove="' + escapeHtml(tag.type) + '"' +
                        '    class="inline-flex w-6 shrink-0 self-stretch items-center justify-center border-l border-gray-300 text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:border-gray-500/40 dark:text-gray-300 dark:hover:bg-white/15 dark:hover:text-white cursor-pointer" aria-label="Remove filter">' +
                        '    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="size-3">' +
                        '      <path fill-rule="evenodd" d="M4.22 4.22a.75.75 0 0 1 1.06 0L10 8.94l4.72-4.72a.75.75 0 1 1 1.06 1.06L11.06 10l4.72 4.72a.75.75 0 1 1-1.06 1.06L10 11.06l-4.72 4.72a.75.75 0 1 1-1.06-1.06L8.94 10 4.22 5.28a.75.75 0 0 1 0-1.06Z" clip-rule="evenodd" />' +
                        '    </svg>' +
                        '  </button>' +
                        '  <span aria-hidden="true" class="pointer-events-none absolute inset-0 rounded-md inset-ring inset-ring-gray-300 dark:inset-ring-gray-500/40"></span>' +
                        '</span>';
                }).join('');
            }

            function setDetailPanelVisibility(panel) {
                if (!filterCustomerPanel || !filterStatusPanel) return;
                filterCustomerPanel.classList.add('hidden');
                filterCustomerPanel.classList.remove('flex');
                filterStatusPanel.classList.add('hidden');
                filterStatusPanel.classList.remove('flex');
                if (panel === 'customer') {
                    filterCustomerPanel.classList.remove('hidden');
                    filterCustomerPanel.classList.add('flex');
                } else if (panel === 'status') {
                    filterStatusPanel.classList.remove('hidden');
                    filterStatusPanel.classList.add('flex');
                }
            }

            function setFilterPanel(panel, immediate) {
                if (!filterTrack || !cardsFilterMenu) return;
                activeFilterPanel = panel;
                var targetPanel = filterRootPanel;
                if (panel === 'customer' || panel === 'status') {
                    setDetailPanelVisibility(panel);
                    if (filterDetailSlot) targetPanel = filterDetailSlot;
                } else {
                    setDetailPanelVisibility('root');
                }
                var offset = targetPanel ? targetPanel.offsetLeft : 0;
                var width = targetPanel ? targetPanel.offsetWidth : 0;
                var height = targetPanel ? targetPanel.offsetHeight : 0;
                var isMobileView = window.matchMedia('(max-width: 639px)').matches;
                if (isMobileView) {
                    filterTrack.style.transform = 'translateX(' + (-offset) + 'px)';
                    cardsFilterMenu.style.width = '100vw';
                    if (height > 0) cardsFilterMenu.style.height = height + 'px';
                    return;
                }
                if (immediate) {
                    filterTrack.style.transform = 'translateX(' + (-offset) + 'px)';
                    if (width > 0) {
                        cardsFilterMenu.style.width = width + 'px';
                    }
                    if (height > 0) cardsFilterMenu.style.height = height + 'px';
                    return;
                }
                var currentRect = cardsFilterMenu.getBoundingClientRect();
                if (!isMobileView && currentRect.width > 0) cardsFilterMenu.style.width = currentRect.width + 'px';
                if (currentRect.height > 0) cardsFilterMenu.style.height = currentRect.height + 'px';
                requestAnimationFrame(function () {
                    filterTrack.style.transform = 'translateX(' + (-offset) + 'px)';
                    if (isMobileView) {
                        cardsFilterMenu.style.width = '100vw';
                    } else if (width > 0) {
                        cardsFilterMenu.style.width = width + 'px';
                    }
                    if (height > 0) cardsFilterMenu.style.height = height + 'px';
                });
            }

            function applyFilterMenuLayout() {
                if (!cardsFilterMenu) return;
                var isMobileView = window.matchMedia('(max-width: 639px)').matches;

                if (isMobileView) {
                    cardsFilterMenu.style.position = 'fixed';
                    cardsFilterMenu.style.left = '0';
                    cardsFilterMenu.style.right = '0';
                    cardsFilterMenu.style.bottom = '0';
                    cardsFilterMenu.style.top = 'auto';
                    cardsFilterMenu.style.marginTop = '0';
                    cardsFilterMenu.style.zIndex = '50';
                    cardsFilterMenu.style.borderBottomLeftRadius = '0';
                    cardsFilterMenu.style.borderBottomRightRadius = '0';
                    cardsFilterMenu.style.width = '100vw';
                    filterTrack.classList.remove('transition-transform', 'duration-250', 'ease-[cubic-bezier(0.22,1,0.36,1)]');
                    cardsFilterMenu.classList.remove('origin-top-right');
                    cardsFilterMenu.classList.add('origin-bottom');
                    if (filterRootPanel) {
                        filterRootPanel.style.width = '100vw';
                        filterRootPanel.style.minWidth = '0';
                    }
                    if (filterDetailSlot) filterDetailSlot.style.width = '100vw';
                    if (filterCustomerPanel) filterCustomerPanel.style.width = '100vw';
                    if (filterStatusPanel) filterStatusPanel.style.width = '100vw';
                } else {
                    cardsFilterMenu.style.position = '';
                    cardsFilterMenu.style.left = '';
                    cardsFilterMenu.style.right = '';
                    cardsFilterMenu.style.bottom = '';
                    cardsFilterMenu.style.top = '';
                    cardsFilterMenu.style.marginTop = '';
                    cardsFilterMenu.style.zIndex = '';
                    cardsFilterMenu.style.borderBottomLeftRadius = '';
                    cardsFilterMenu.style.borderBottomRightRadius = '';
                    cardsFilterMenu.style.width = '';
                    filterTrack.classList.add('transition-transform', 'duration-250', 'ease-[cubic-bezier(0.22,1,0.36,1)]');
                    cardsFilterMenu.classList.remove('origin-bottom');
                    cardsFilterMenu.classList.add('origin-top-right');
                    if (filterRootPanel) {
                        filterRootPanel.style.width = '';
                        filterRootPanel.style.minWidth = '';
                    }
                    if (filterDetailSlot) filterDetailSlot.style.width = '';
                    if (filterCustomerPanel) filterCustomerPanel.style.width = '';
                    if (filterStatusPanel) filterStatusPanel.style.width = '';
                }
            }

            function setFilterMenuOpen(nextOpen) {
                isFilterMenuOpen = !!nextOpen;
                if (!cardsFilterMenu) return;
                applyFilterMenuLayout();
                if (isFilterMenuOpen) {
                    setFilterPanel(activeFilterPanel || 'root', true);
                    cardsFilterMenu.classList.remove('invisible', 'opacity-0', 'pointer-events-none');
                    if (cardsFilterBackdrop && window.matchMedia('(max-width: 639px)').matches) {
                        cardsFilterBackdrop.classList.remove('invisible', 'opacity-0', 'pointer-events-none');
                    }
                } else {
                    cardsFilterMenu.classList.add('invisible', 'opacity-0', 'pointer-events-none');
                    cardsFilterMenu.style.width = '';
                    cardsFilterMenu.style.height = '';
                    if (cardsFilterBackdrop) {
                        cardsFilterBackdrop.classList.add('invisible', 'opacity-0', 'pointer-events-none');
                    }
                }
            }

            function renderCards() {
                applyFilters();
                cardsById.clear();
                allCards.forEach(function (card) { cardsById.set(card.id, card); });
                renderActiveFilterTags();
                var visibleCount = isExpanded ? filteredCards.length : Math.min(INITIAL_VISIBLE, filteredCards.length);
                cardsListEl.innerHTML = filteredCards
                    .slice(0, visibleCount)
                    .map(function (card, index) { return buildCardRow(card, index); })
                    .join('');

                var hiddenCount = Math.max(filteredCards.length - INITIAL_VISIBLE, 0);
                if (!isExpanded && hiddenCount > 0) {
                    cardsToggleBtn.style.display = 'inline-flex';
                    cardsToggleLabel.textContent = 'Show more (' + hiddenCount + ')';
                    cardsToggleIcon.classList.remove('rotate-180');
                } else if (isExpanded && filteredCards.length > INITIAL_VISIBLE) {
                    cardsToggleBtn.style.display = 'inline-flex';
                    cardsToggleLabel.textContent = 'Show less';
                    cardsToggleIcon.classList.add('rotate-180');
                } else {
                    cardsToggleBtn.style.display = 'none';
                }
            }

            cardsToggleBtn.addEventListener('click', function () {
                isExpanded = !isExpanded;
                renderCards();
            });

            cardsListEl.addEventListener('click', function (event) {
                var viewDetailsBtn = event.target.closest('[data-view-card-details]');
                if (viewDetailsBtn) {
                    event.preventDefault();
                    var cardId = viewDetailsBtn.getAttribute('data-view-card-details');
                    var card = cardsById.get(cardId);
                    if (!card || !cardDetailsDialog) return;
                    populateCardDetailsModal(card);
                    cardDetailsDialog.showModal();
                    return;
                }
            });

            if (cardsSearchInput) {
                cardsSearchInput.addEventListener('input', function (event) {
                    searchTerm = event.target.value || '';
                    isExpanded = false;
                    renderCards();
                });
            }

            if (cardsActiveOnlyInput) {
                cardsActiveOnlyInput.addEventListener('change', function () {
                    isExpanded = false;
                    renderCards();
                });
            }

            initCardModalCopy();

            if (cardsFilterBtn) {
                cardsFilterBtn.addEventListener('click', function (event) {
                    event.stopPropagation();
                    var nextOpen = !isFilterMenuOpen;
                    if (nextOpen) activeFilterPanel = 'root';
                    setFilterMenuOpen(nextOpen);
                    syncApplyButtonState();
                });
            }

            if (filterTrack) {
                filterTrack.addEventListener('click', function (event) {
                    event.stopPropagation();
                    var openBtn = event.target.closest('[data-filter-open]');
                    if (openBtn) {
                        event.preventDefault();
                        setFilterPanel(openBtn.getAttribute('data-filter-open'));
                        return;
                    }
                    if (event.target.closest('[data-filter-back]')) {
                        event.preventDefault();
                        setFilterPanel('root');
                        return;
                    }
                });

                filterTrack.addEventListener('change', function (event) {
                    var checkbox = event.target.closest('input[type="checkbox"][data-filter-value]');
                    if (!checkbox) return;
                    var panelEl = checkbox.closest('#pp-cards-filter-customers, #pp-cards-filter-statuses');
                    var value = checkbox.getAttribute('data-filter-value');
                    if (!panelEl || !value) return;
                    if (panelEl.id === 'pp-cards-filter-customers') {
                        if (checkbox.checked) selectedCustomers.add(value);
                        else selectedCustomers.delete(value);
                    } else {
                        if (checkbox.checked) selectedStatuses.add(value);
                        else selectedStatuses.delete(value);
                    }
                    isExpanded = false;
                    renderCards();
                    syncApplyButtonState();
                });
            }

            if (filterApplyBtn) {
                filterApplyBtn.addEventListener('click', function (event) {
                    event.stopPropagation();
                    if (filterApplyBtn.disabled) return;
                    setFilterMenuOpen(false);
                    setFilterPanel('root');
                });
            }

            if (filterApplyStatusBtn) {
                filterApplyStatusBtn.addEventListener('click', function (event) {
                    event.stopPropagation();
                    if (filterApplyStatusBtn.disabled) return;
                    setFilterMenuOpen(false);
                    setFilterPanel('root');
                });
            }

            if (activeFiltersWrap) {
                activeFiltersWrap.addEventListener('click', function (event) {
                    var removeBtn = event.target.closest('[data-filter-tag-remove]');
                    if (removeBtn) {
                        var removeType = removeBtn.getAttribute('data-filter-tag-remove');
                        if (removeType === 'customer') selectedCustomers.clear();
                        else if (removeType === 'status') selectedStatuses.clear();
                        isExpanded = false;
                        renderCustomerFilters();
                        renderStatusFilters();
                        syncApplyButtonState();
                        renderCards();
                        return;
                    }

                    var openBtn = event.target.closest('[data-filter-tag-open]');
                    if (!openBtn) return;
                    var openType = openBtn.getAttribute('data-filter-tag-open');
                    activeFilterPanel = openType === 'status' ? 'status' : 'customer';
                    setFilterMenuOpen(true);
                    setFilterPanel(activeFilterPanel, true);
                });
            }

            document.addEventListener('click', function (event) {
                if (!cardsFilterDropdown || !isFilterMenuOpen) return;
                if (cardsFilterDropdown.contains(event.target)) return;
                setFilterMenuOpen(false);
                setFilterPanel('root');
            });

            if (cardsFilterBackdrop) {
                cardsFilterBackdrop.addEventListener('click', function () {
                    if (!isFilterMenuOpen) return;
                    setFilterMenuOpen(false);
                    setFilterPanel('root');
                });
            }

            window.addEventListener('resize', function () {
                if (!isFilterMenuOpen) return;
                applyFilterMenuLayout();
                setFilterPanel(activeFilterPanel || 'root');
            });

            window.__ppLoadSharedData()
                .then(function (payload) {
                    allCards = normalizeCards(payload);
                    if (!allCards.length) {
                        allCards = generateFallbackCards(normalizeCustomerNames(payload));
                    }
                    renderCustomerFilters();
                    renderStatusFilters();
                    syncApplyButtonState();
                    renderCards();
                })
                .catch(function () {
                    allCards = generateFallbackCards([]);
                    renderCustomerFilters();
                    renderStatusFilters();
                    syncApplyButtonState();
                    renderCards();
                });
        })();

        (function () {
            var emptyState = document.getElementById('pp-adv-empty-state');
            var tableState = document.getElementById('pp-adv-table-state');
            var customizeBtn = document.getElementById('pp-adv-customize-btn');
            var addPayerBtn = document.getElementById('pp-adv-add-payer-btn');
            var undoBtn = document.getElementById('pp-adv-undo-btn');
            var saveBtn = document.getElementById('pp-adv-save-btn');
            var rowsWrap = document.getElementById('pp-adv-rows');
            if (!emptyState || !tableState || !customizeBtn || !rowsWrap) return;
            var customersCache = [];
            var footerActions = window.__ppInitFooterActions({
                undoBtn: undoBtn,
                saveBtn: saveBtn,
                onUndo: function () { window.location.reload(); }
            });

            function setAdvancedDirty(isDirty) {
                footerActions.setDirty(isDirty);
            }

            function escapeHtml(value) {
                return String(value || '')
                    .replace(/&/g, '&amp;')
                    .replace(/</g, '&lt;')
                    .replace(/>/g, '&gt;')
                    .replace(/"/g, '&quot;')
                    .replace(/'/g, '&#39;');
            }

            function normalizeCustomer(raw, index) {
                if (typeof raw === 'string') {
                    return { id: 'customer-' + index, name: raw.trim() };
                }
                if (!raw || typeof raw !== 'object') return null;
                var name = typeof raw.name === 'string' ? raw.name.trim() : '';
                if (!name) return null;
                var id = typeof raw.id === 'string' && raw.id.trim() ? raw.id.trim() : ('customer-' + index);
                var vendorEntries = [];
                if (Array.isArray(raw.vendorEntries)) {
                    vendorEntries = raw.vendorEntries
                        .map(function (entry) { return typeof entry === 'string' ? entry.trim() : ''; })
                        .filter(function (entry) { return !!entry; });
                }
                return { id: id, name: name, vendorEntries: vendorEntries };
            }

            function fetchCustomers() {
                return window.__ppLoadSharedData()
                    .then(function (payload) {
                        payload = payload && typeof payload === 'object' ? payload : {};
                        var customers = Array.isArray(payload.customers) ? payload.customers : [];
                        if (!Array.isArray(customers)) return [];
                        var uniqueByName = new Map();
                        customers.forEach(function (item, index) {
                            var customer = normalizeCustomer(item, index);
                            if (!customer) return;
                            if (!uniqueByName.has(customer.name)) uniqueByName.set(customer.name, customer);
                        });
                        return Array.from(uniqueByName.values());
                    })
                    .catch(function () { return []; });
            }

            function buildPayerOptionsHtml(customers) {
                var html = '';
                customers.forEach(function (customer) {
                    var name = escapeHtml(customer.name);
                    var value = escapeHtml(customer.id);
                    html += '' +
                        '<el-option value="' + value + '" class="group/option relative block cursor-default py-2 pr-9 pl-3 text-gray-900 select-none aria-selected:bg-gray-100 group-aria-selected/option:bg-gray-100 focus:bg-gray-100 focus:outline-hidden dark:text-white dark:aria-selected:bg-white/10 dark:group-aria-selected/option:bg-white/10 dark:focus:bg-white/10">' +
                            '<span class="block truncate font-medium group-aria-selected/option:font-semibold">' + name + '</span>' +
                            '<span class="absolute inset-y-0 right-0 flex items-center pr-3 text-blue-600 group-not-aria-selected/option:hidden in-[el-selectedcontent]:hidden">' +
                                '<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" class="size-5">' +
                                    '<path d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clip-rule="evenodd" fill-rule="evenodd" />' +
                                '</svg>' +
                            '</span>' +
                        '</el-option>';
                });
                return html;
            }

            function buildEntityOptionsHtml(vendorEntries) {
                var html = '' +
                    '<el-option value="all-entities" class="group/option relative block cursor-default py-2 pr-9 pl-3 text-gray-900 select-none aria-selected:bg-gray-100 group-aria-selected/option:bg-gray-100 focus:bg-gray-100 focus:outline-hidden dark:text-white dark:aria-selected:bg-white/10 dark:group-aria-selected/option:bg-white/10 dark:focus:bg-white/10">' +
                        '<span class="block truncate font-medium group-aria-selected/option:font-semibold">All entities</span>' +
                        '<span class="absolute inset-y-0 right-0 flex items-center pr-3 text-blue-600 group-not-aria-selected/option:hidden in-[el-selectedcontent]:hidden">' +
                            '<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" class="size-5">' +
                                '<path d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clip-rule="evenodd" fill-rule="evenodd" />' +
                            '</svg>' +
                        '</span>' +
                    '</el-option>';

                vendorEntries.forEach(function (entry, index) {
                    var label = escapeHtml(entry);
                    var value = escapeHtml('entry-' + index + '-' + entry.toLowerCase().replace(/[^a-z0-9]+/g, '-'));
                    html += '' +
                        '<el-option value="' + value + '" class="group/option relative block cursor-default py-2 pr-9 pl-3 text-gray-900 select-none aria-selected:bg-gray-100 group-aria-selected/option:bg-gray-100 focus:bg-gray-100 focus:outline-hidden dark:text-white dark:aria-selected:bg-white/10 dark:group-aria-selected/option:bg-white/10 dark:focus:bg-white/10">' +
                            '<span class="block truncate font-medium group-aria-selected/option:font-semibold">' + label + '</span>' +
                            '<span class="absolute inset-y-0 right-0 flex items-center pr-3 text-blue-600 group-not-aria-selected/option:hidden in-[el-selectedcontent]:hidden">' +
                                '<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" class="size-5">' +
                                    '<path d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clip-rule="evenodd" fill-rule="evenodd" />' +
                                '</svg>' +
                            '</span>' +
                        '</el-option>';
                });

                return html;
            }

            function getSelectValue(selectEl) {
                if (!selectEl) return '';
                if (typeof selectEl.value === 'string' && selectEl.value) return selectEl.value;
                var selectedOption = selectEl.querySelector('el-option[aria-selected="true"]');
                return selectedOption ? (selectedOption.getAttribute('value') || '') : '';
            }

            function setSelectValue(selectEl, value) {
                if (!selectEl) return;
                if (typeof selectEl.value !== 'undefined') selectEl.value = value || '';
                if (value) selectEl.setAttribute('value', value);
                else selectEl.removeAttribute('value');
                selectEl.dispatchEvent(new Event('change', { bubbles: true }));
            }

            function getCustomerById(customerId) {
                for (var i = 0; i < customersCache.length; i++) {
                    if (customersCache[i].id === customerId) return customersCache[i];
                }
                return null;
            }

            function hydrateEntityForRow(rowEl) {
                var payerSelect = rowEl.querySelector('[data-adv-payer-select]');
                var entitySelect = rowEl.querySelector('[data-adv-entity-select]');
                var entityOptions = rowEl.querySelector('[data-adv-entity-options]');
                if (!entitySelect || !entityOptions) return;

                var payerId = getSelectValue(payerSelect);
                var customer = getCustomerById(payerId);
                var vendorEntries = customer && Array.isArray(customer.vendorEntries) ? customer.vendorEntries : [];
                entityOptions.innerHTML = buildEntityOptionsHtml(vendorEntries);
                setSelectValue(entitySelect, 'all-entities');
            }

            function hydratePayerSelects() {
                var optionsHtml = buildPayerOptionsHtml(customersCache);
                rowsWrap.querySelectorAll('[data-adv-payer-options]').forEach(function (optsEl) {
                    optsEl.innerHTML = optionsHtml;
                });
                rowsWrap.querySelectorAll('.pp-adv-row').forEach(function (rowEl) {
                    hydrateEntityForRow(rowEl);
                });
            }

            function getMethodOptionsTemplateHtml() {
                var source = document.querySelector('el-select[name="gp-default-payment-method-1"] el-options');
                return source ? source.innerHTML : '';
            }

            function hydrateMethodSelects() {
                var optionsHtml = getMethodOptionsTemplateHtml();
                if (!optionsHtml) return;
                rowsWrap.querySelectorAll('[data-adv-method-options]').forEach(function (optsEl) {
                    optsEl.innerHTML = optionsHtml;
                });
                rowsWrap.querySelectorAll('.pp-adv-row').forEach(function (rowEl) {
                    applyRowMethodUniqueness(rowEl);
                });
            }

            function applyRowMethodUniqueness(rowEl) {
                var methodSelects = Array.prototype.slice.call(
                    rowEl.querySelectorAll('[data-adv-method-select]')
                );
                if (!methodSelects.length) return;

                var selectedValues = methodSelects.map(function (selectEl) {
                    return getSelectValue(selectEl);
                });

                methodSelects.forEach(function (selectEl, selectIndex) {
                    var currentValue = selectedValues[selectIndex];
                    var takenInOtherSelects = new Set(
                        selectedValues.filter(function (value, valueIndex) {
                            return value && valueIndex !== selectIndex;
                        })
                    );

                    selectEl.querySelectorAll('el-option').forEach(function (optionEl) {
                        var optionValue = optionEl.getAttribute('value') || '';
                        var shouldHide = takenInOtherSelects.has(optionValue) && optionValue !== currentValue;
                        optionEl.classList.toggle('hidden', shouldHide);
                        optionEl.toggleAttribute('hidden', shouldHide);
                        optionEl.setAttribute('aria-hidden', shouldHide ? 'true' : 'false');
                    });
                });
            }

            function buildRowHtml() {
                return '' +
                    '<div class="pp-adv-row flex w-full items-center gap-4 px-2 py-3">' +
                        '<div class="min-w-0 flex-1">' +
                            '<el-select data-adv-payer-select class="block w-full">' +
                                '<button type="button" class="grid w-full cursor-default grid-cols-1 rounded-md bg-white py-1.5 pr-2 pl-3 text-left font-medium text-gray-900 outline-1 -outline-offset-1 outline-gray-300 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-blue-600 text-base sm:text-sm/6 dark:bg-white/5 dark:text-white dark:outline-white/10">' +
                                    '<el-selectedcontent class="col-start-1 row-start-1 truncate pr-6 font-medium text-gray-900 dark:text-white"><span class="text-gray-400 dark:text-gray-500">Select payer</span></el-selectedcontent>' +
                                    '<svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" class="col-start-1 row-start-1 size-5 self-center justify-self-end text-gray-500 sm:size-4 dark:text-gray-400"><path d="M5.22 10.22a.75.75 0 0 1 1.06 0L8 11.94l1.72-1.72a.75.75 0 1 1 1.06 1.06l-2.25 2.25a.75.75 0 0 1-1.06 0l-2.25-2.25a.75.75 0 0 1 0-1.06ZM10.78 5.78a.75.75 0 0 1-1.06 0L8 4.06 6.28 5.78a.75.75 0 0 1-1.06-1.06l2.25-2.25a.75.75 0 0 1 1.06 0l2.25 2.25a.75.75 0 0 1 0 1.06Z" clip-rule="evenodd" fill-rule="evenodd" /></svg>' +
                                '</button>' +
                                '<el-options anchor="bottom start" popover class="max-h-60 min-w-(--button-width) w-max max-w-[min(36rem,calc(100vw-2rem))] overflow-y-auto overflow-x-hidden rounded-md bg-white py-1 text-base shadow-lg outline-1 outline-black/5 [--anchor-gap:--spacing(1)] data-leave:transition data-leave:transition-discrete data-leave:duration-100 data-leave:ease-in data-closed:data-leave:opacity-0 text-base sm:text-sm dark:bg-gray-800 dark:outline-white/10" data-adv-payer-options></el-options>' +
                            '</el-select>' +
                        '</div>' +
                        '<div class="min-w-0 flex-1">' +
                            '<el-select data-adv-entity-select value="all-entities" class="block w-full">' +
                                '<button type="button" class="grid w-full cursor-default grid-cols-1 rounded-md bg-white py-1.5 pr-2 pl-3 text-left font-medium text-gray-900 outline-1 -outline-offset-1 outline-gray-300 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-blue-600 text-base sm:text-sm/6 dark:bg-white/5 dark:text-white dark:outline-white/10">' +
                                    '<el-selectedcontent class="col-start-1 row-start-1 truncate pr-6 font-medium text-gray-900 dark:text-white">All entities</el-selectedcontent>' +
                                    '<svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" class="col-start-1 row-start-1 size-5 self-center justify-self-end text-gray-500 sm:size-4 dark:text-gray-400"><path d="M5.22 10.22a.75.75 0 0 1 1.06 0L8 11.94l1.72-1.72a.75.75 0 1 1 1.06 1.06l-2.25 2.25a.75.75 0 0 1-1.06 0l-2.25-2.25a.75.75 0 0 1 0-1.06ZM10.78 5.78a.75.75 0 0 1-1.06 0L8 4.06 6.28 5.78a.75.75 0 0 1-1.06-1.06l2.25-2.25a.75.75 0 0 1 1.06 0l2.25 2.25a.75.75 0 0 1 0 1.06Z" clip-rule="evenodd" fill-rule="evenodd" /></svg>' +
                                '</button>' +
                                '<el-options anchor="bottom start" popover class="max-h-60 min-w-(--button-width) w-max max-w-[min(36rem,calc(100vw-2rem))] overflow-y-auto overflow-x-hidden rounded-md bg-white py-1 text-base shadow-lg outline-1 outline-black/5 [--anchor-gap:--spacing(1)] data-leave:transition data-leave:transition-discrete data-leave:duration-100 data-leave:ease-in data-closed:data-leave:opacity-0 text-base sm:text-sm dark:bg-gray-800 dark:outline-white/10" data-adv-entity-options></el-options>' +
                            '</el-select>' +
                        '</div>' +
                        '<div class="min-w-0 flex-1">' +
                            '<el-select data-adv-method-select data-method-slot="1" class="block w-full">' +
                                '<button type="button" class="grid w-full cursor-default grid-cols-1 rounded-md bg-white py-1.5 pr-2 pl-3 text-left font-medium text-gray-900 outline-1 -outline-offset-1 outline-gray-300 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-blue-600 text-base sm:text-sm/6 dark:bg-white/5 dark:text-white dark:outline-white/10">' +
                                    '<el-selectedcontent class="col-start-1 row-start-1 truncate pr-6 font-medium text-gray-900 dark:text-white"><span class="text-gray-400 dark:text-gray-500">Select payment method</span></el-selectedcontent>' +
                                    '<svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" class="col-start-1 row-start-1 size-5 self-center justify-self-end text-gray-500 sm:size-4 dark:text-gray-400"><path d="M5.22 10.22a.75.75 0 0 1 1.06 0L8 11.94l1.72-1.72a.75.75 0 1 1 1.06 1.06l-2.25 2.25a.75.75 0 0 1-1.06 0l-2.25-2.25a.75.75 0 0 1 0-1.06ZM10.78 5.78a.75.75 0 0 1-1.06 0L8 4.06 6.28 5.78a.75.75 0 0 1-1.06-1.06l2.25-2.25a.75.75 0 0 1 1.06 0l2.25 2.25a.75.75 0 0 1 0 1.06Z" clip-rule="evenodd" fill-rule="evenodd" /></svg>' +
                                '</button>' +
                                '<el-options anchor="bottom start" popover class="max-h-60 min-w-(--button-width) w-max max-w-[min(36rem,calc(100vw-2rem))] overflow-y-auto overflow-x-hidden rounded-md bg-white py-1 text-base shadow-lg outline-1 outline-black/5 [--anchor-gap:--spacing(1)] data-leave:transition data-leave:transition-discrete data-leave:duration-100 data-leave:ease-in data-closed:data-leave:opacity-0 text-base sm:text-sm dark:bg-gray-800 dark:outline-white/10" data-adv-method-options></el-options>' +
                            '</el-select>' +
                        '</div>' +
                        '<div class="min-w-0 flex-1">' +
                            '<el-select data-adv-method-select data-method-slot="2" class="block w-full">' +
                                '<button type="button" class="grid w-full cursor-default grid-cols-1 rounded-md bg-white py-1.5 pr-2 pl-3 text-left font-medium text-gray-900 outline-1 -outline-offset-1 outline-gray-300 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-blue-600 text-base sm:text-sm/6 dark:bg-white/5 dark:text-white dark:outline-white/10">' +
                                    '<el-selectedcontent class="col-start-1 row-start-1 truncate pr-6 font-medium text-gray-900 dark:text-white"><span class="text-gray-400 dark:text-gray-500">Select payment method</span></el-selectedcontent>' +
                                    '<svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" class="col-start-1 row-start-1 size-5 self-center justify-self-end text-gray-500 sm:size-4 dark:text-gray-400"><path d="M5.22 10.22a.75.75 0 0 1 1.06 0L8 11.94l1.72-1.72a.75.75 0 1 1 1.06 1.06l-2.25 2.25a.75.75 0 0 1-1.06 0l-2.25-2.25a.75.75 0 0 1 0-1.06ZM10.78 5.78a.75.75 0 0 1-1.06 0L8 4.06 6.28 5.78a.75.75 0 0 1-1.06-1.06l2.25-2.25a.75.75 0 0 1 1.06 0l2.25 2.25a.75.75 0 0 1 0 1.06Z" clip-rule="evenodd" fill-rule="evenodd" /></svg>' +
                                '</button>' +
                                '<el-options anchor="bottom start" popover class="max-h-60 min-w-(--button-width) w-max max-w-[min(36rem,calc(100vw-2rem))] overflow-y-auto overflow-x-hidden rounded-md bg-white py-1 text-base shadow-lg outline-1 outline-black/5 [--anchor-gap:--spacing(1)] data-leave:transition data-leave:transition-discrete data-leave:duration-100 data-leave:ease-in data-closed:data-leave:opacity-0 text-base sm:text-sm dark:bg-gray-800 dark:outline-white/10" data-adv-method-options></el-options>' +
                            '</el-select>' +
                        '</div>' +
                        '<div class="min-w-0 flex-1">' +
                            '<el-select data-adv-method-select data-method-slot="3" class="block w-full">' +
                                '<button type="button" class="grid w-full cursor-default grid-cols-1 rounded-md bg-white py-1.5 pr-2 pl-3 text-left font-medium text-gray-900 outline-1 -outline-offset-1 outline-gray-300 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-blue-600 text-base sm:text-sm/6 dark:bg-white/5 dark:text-white dark:outline-white/10">' +
                                    '<el-selectedcontent class="col-start-1 row-start-1 truncate pr-6 font-medium text-gray-900 dark:text-white"><span class="text-gray-400 dark:text-gray-500">Select payment method</span></el-selectedcontent>' +
                                    '<svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" class="col-start-1 row-start-1 size-5 self-center justify-self-end text-gray-500 sm:size-4 dark:text-gray-400"><path d="M5.22 10.22a.75.75 0 0 1 1.06 0L8 11.94l1.72-1.72a.75.75 0 1 1 1.06 1.06l-2.25 2.25a.75.75 0 0 1-1.06 0l-2.25-2.25a.75.75 0 0 1 0-1.06ZM10.78 5.78a.75.75 0 0 1-1.06 0L8 4.06 6.28 5.78a.75.75 0 0 1-1.06-1.06l2.25-2.25a.75.75 0 0 1 1.06 0l2.25 2.25a.75.75 0 0 1 0 1.06Z" clip-rule="evenodd" fill-rule="evenodd" /></svg>' +
                                '</button>' +
                                '<el-options anchor="bottom start" popover class="max-h-60 min-w-(--button-width) w-max max-w-[min(36rem,calc(100vw-2rem))] overflow-y-auto overflow-x-hidden rounded-md bg-white py-1 text-base shadow-lg outline-1 outline-black/5 [--anchor-gap:--spacing(1)] data-leave:transition data-leave:transition-discrete data-leave:duration-100 data-leave:ease-in data-closed:data-leave:opacity-0 text-base sm:text-sm dark:bg-gray-800 dark:outline-white/10" data-adv-method-options></el-options>' +
                            '</el-select>' +
                        '</div>' +
                        '<div class="shrink-0">' +
                            '<button type="button" data-adv-remove-row class="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-500 dark:hover:bg-white/10 dark:hover:text-gray-300 cursor-pointer">' +
                                '<span class="sr-only">Remove row</span>' +
                                '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="size-5" aria-hidden="true"><path fill-rule="evenodd" d="M6 18L18 6M6 6l12 12" clip-rule="evenodd" /></svg>' +
                            '</button>' +
                        '</div>' +
                    '</div>';
            }

            customizeBtn.addEventListener('click', function () {
                emptyState.classList.add('hidden');
                tableState.classList.remove('hidden');
                setAdvancedDirty(false);
            });

            if (addPayerBtn) {
                addPayerBtn.addEventListener('click', function () {
                    rowsWrap.insertAdjacentHTML('beforeend', buildRowHtml());
                    hydratePayerSelects();
                    hydrateMethodSelects();
                    setAdvancedDirty(true);
                });
            }

            rowsWrap.addEventListener('click', function (event) {
                var removeBtn = event.target.closest('[data-adv-remove-row]');
                if (!removeBtn) return;
                var row = removeBtn.closest('.pp-adv-row');
                if (!row) return;
                row.remove();
                setAdvancedDirty(true);

                if (!rowsWrap.querySelector('.pp-adv-row')) {
                    tableState.classList.add('hidden');
                    emptyState.classList.remove('hidden');
                }
            });

            rowsWrap.addEventListener('change', function (event) {
                var payerSelect = event.target.closest('[data-adv-payer-select]');
                if (payerSelect) {
                    var payerRow = payerSelect.closest('.pp-adv-row');
                    if (payerRow) hydrateEntityForRow(payerRow);
                    setAdvancedDirty(true);
                    return;
                }

                var methodSelect = event.target.closest('[data-adv-method-select]');
                if (methodSelect) {
                    var methodRow = methodSelect.closest('.pp-adv-row');
                    if (methodRow) applyRowMethodUniqueness(methodRow);
                    setAdvancedDirty(true);
                    return;
                }

                var entitySelect = event.target.closest('[data-adv-entity-select]');
                if (entitySelect) setAdvancedDirty(true);
            });

            fetchCustomers().then(function (customers) {
                customersCache = customers;
                hydratePayerSelects();
                hydrateMethodSelects();
            });
            setAdvancedDirty(false);
        })();

        (function () {
            var gpSelects = Array.prototype.slice.call(
                document.querySelectorAll('el-select[name^="gp-default-payment-method-"]')
            );
            var undoBtn = document.getElementById('gp-default-payment-undo-btn');
            var saveBtn = document.getElementById('gp-default-payment-save-btn');
            if (!gpSelects.length) return;
            var savedSnapshot = [];
            var footerActions = window.__ppInitFooterActions({
                undoBtn: undoBtn,
                saveBtn: saveBtn,
                onUndo: function () {
                    window.location.reload();
                },
                onSave: function (setDirty) {
                    savedSnapshot = getSnapshot();
                    setDirty(false);
                }
            });

            function getSelectedValue(selectEl) {
                if (selectEl && typeof selectEl.value === 'string' && selectEl.value) return selectEl.value;
                var selectedOption = selectEl.querySelector('el-option[aria-selected="true"]');
                return selectedOption ? (selectedOption.getAttribute('value') || '') : '';
            }

            function setSelectedValue(selectEl, value) {
                if (typeof selectEl.value !== 'undefined') {
                    selectEl.value = value || '';
                }
                if (value) {
                    selectEl.setAttribute('value', value);
                } else {
                    selectEl.removeAttribute('value');
                }
                selectEl.dispatchEvent(new Event('change', { bubbles: true }));
            }

            function getSnapshot() {
                return gpSelects.map(function (selectEl) {
                    return getSelectedValue(selectEl);
                });
            }

            function snapshotsEqual(a, b) {
                if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
                for (var i = 0; i < a.length; i++) {
                    if ((a[i] || '') !== (b[i] || '')) return false;
                }
                return true;
            }

            function applyUniqueSelection() {
                var selectedValues = gpSelects.map(function (selectEl) {
                    return getSelectedValue(selectEl);
                });

                gpSelects.forEach(function (selectEl, selectIndex) {
                    var currentValue = selectedValues[selectIndex];
                    var takenInOtherSelects = new Set(
                        selectedValues.filter(function (value, valueIndex) {
                            return value && valueIndex !== selectIndex;
                        })
                    );

                    selectEl.querySelectorAll('el-option').forEach(function (optionEl) {
                        var optionValue = optionEl.getAttribute('value') || '';
                        var shouldHide = takenInOtherSelects.has(optionValue) && optionValue !== currentValue;
                        optionEl.classList.toggle('hidden', shouldHide);
                        optionEl.toggleAttribute('hidden', shouldHide);
                        optionEl.setAttribute('aria-hidden', shouldHide ? 'true' : 'false');
                    });
                });
            }

            function scheduleApplyUniqueSelection() {
                setTimeout(function () {
                    applyUniqueSelection();
                    footerActions.setDirty(!snapshotsEqual(getSnapshot(), savedSnapshot));
                }, 0);
            }

            savedSnapshot = getSnapshot();

            gpSelects.forEach(function (selectEl) {
                selectEl.addEventListener('change', scheduleApplyUniqueSelection);
                selectEl.addEventListener('input', scheduleApplyUniqueSelection);
            });

            window.__ppGetGpSelectedValue = getSelectedValue;
            window.__ppApplyUniqueSelection = applyUniqueSelection;
            window.__ppUpdateGpSavedSnapshot = function () {
                savedSnapshot = getSnapshot();
                footerActions.setDirty(false);
            };
            applyUniqueSelection();
            footerActions.setDirty(false);
        })();

        (function () {
            var BANK_ACCOUNTS_STORAGE_KEY = 'pp_my_bank_accounts_v1';
            var CHECK_ADDRESSES_STORAGE_KEY = 'pp_my_check_addresses_v1';
            var dialog = document.getElementById('pp-add-bank-account-dialog');
            var saveBtn = document.getElementById('pp-add-bank-account-save-btn');
            var nameInput = document.getElementById('pp-bank-account-name');
            var routingInput = document.getElementById('pp-bank-routing-number');
            var accountInput = document.getElementById('pp-bank-account-number');
            var confirmAccountInput = document.getElementById('pp-bank-account-number-confirm');
            var nicknameInput = document.getElementById('pp-bank-account-nickname');
            var addCheckDialog = document.getElementById('pp-add-check-dialog');
            var addCheckSaveBtn = document.getElementById('pp-add-check-save-btn');
            var addCheckNicknameInput = document.getElementById('pp-add-check-nickname');
            var addCheckLine1Input = document.getElementById('pp-add-check-line1');
            var addCheckLine2Input = document.getElementById('pp-add-check-line2');
            var addCheckCityInput = document.getElementById('pp-add-check-city');
            var addCheckStateInput = document.getElementById('pp-add-check-state');
            var addCheckZipInput = document.getElementById('pp-add-check-zip');
            var addCheckCountrySelect = document.getElementById('pp-add-check-country');
            var addCheckCountryFlag = document.getElementById('pp-add-check-country-flag');
            var editBankDialog = document.getElementById('pp-edit-bank-dialog');
            var editBankSaveBtn = document.getElementById('pp-edit-bank-save-btn');
            var editBankNameInput = document.getElementById('pp-edit-bank-name');
            var editBankRoutingInput = document.getElementById('pp-edit-bank-routing');
            var editBankAccountInput = document.getElementById('pp-edit-bank-account');
            var editBankConfirmInput = document.getElementById('pp-edit-bank-confirm');
            var editBankNicknameInput = document.getElementById('pp-edit-bank-nickname');
            var editCheckDialog = document.getElementById('pp-edit-check-dialog');
            var editCheckSaveBtn = document.getElementById('pp-edit-check-save-btn');
            var editCheckNicknameInput = document.getElementById('pp-edit-check-nickname');
            var editCheckLine1Input = document.getElementById('pp-edit-check-line1');
            var editCheckLine2Input = document.getElementById('pp-edit-check-line2');
            var editCheckCityInput = document.getElementById('pp-edit-check-city');
            var editCheckStateInput = document.getElementById('pp-edit-check-state');
            var editCheckZipInput = document.getElementById('pp-edit-check-zip');
            var editCheckCountrySelect = document.getElementById('pp-edit-check-country');
            var editCheckCountryFlag = document.getElementById('pp-edit-check-country-flag');
            var deleteBankConfirmDialog = document.getElementById('pp-delete-bank-confirm-dialog');
            var deleteBankConfirmTitle = document.getElementById('pp-delete-bank-confirm-title');
            var deleteBankConfirmDescription = document.getElementById('pp-delete-bank-confirm-description');
            var deleteBankConfirmBtn = document.getElementById('pp-delete-bank-confirm-btn');
            var deleteCheckConfirmDialog = document.getElementById('pp-delete-check-confirm-dialog');
            var deleteCheckConfirmTitle = document.getElementById('pp-delete-check-confirm-title');
            var deleteCheckConfirmDescription = document.getElementById('pp-delete-check-confirm-description');
            var deleteCheckConfirmBtn = document.getElementById('pp-delete-check-confirm-btn');
            var bankEmptyState = document.getElementById('pp-bank-empty-state');
            var bankList = document.getElementById('pp-bank-accounts-list');
            var bankToggleBtn = document.getElementById('pp-bank-accounts-toggle');
            var bankToggleLabel = document.getElementById('pp-bank-accounts-toggle-label');
            var bankToggleIcon = document.getElementById('pp-bank-accounts-toggle-icon');
            var checkEmptyState = document.getElementById('pp-check-empty-state');
            var checkList = document.getElementById('pp-check-addresses-list');
            var checkToggleBtn = document.getElementById('pp-check-addresses-toggle');
            var checkToggleLabel = document.getElementById('pp-check-addresses-toggle-label');
            var checkToggleIcon = document.getElementById('pp-check-addresses-toggle-icon');
            if (!dialog || !saveBtn || !nameInput || !routingInput || !accountInput || !confirmAccountInput || !nicknameInput || !addCheckDialog || !addCheckSaveBtn || !addCheckNicknameInput || !addCheckLine1Input || !addCheckLine2Input || !addCheckCityInput || !addCheckStateInput || !addCheckZipInput || !addCheckCountrySelect || !addCheckCountryFlag || !editBankDialog || !editBankSaveBtn || !editBankNameInput || !editBankRoutingInput || !editBankAccountInput || !editBankConfirmInput || !editBankNicknameInput || !editCheckDialog || !editCheckSaveBtn || !editCheckNicknameInput || !editCheckLine1Input || !editCheckLine2Input || !editCheckCityInput || !editCheckStateInput || !editCheckZipInput || !editCheckCountrySelect || !editCheckCountryFlag || !deleteBankConfirmDialog || !deleteBankConfirmTitle || !deleteBankConfirmDescription || !deleteBankConfirmBtn || !deleteCheckConfirmDialog || !deleteCheckConfirmTitle || !deleteCheckConfirmDescription || !deleteCheckConfirmBtn || !bankEmptyState || !bankList || !bankToggleBtn || !bankToggleLabel || !bankToggleIcon || !checkEmptyState || !checkList || !checkToggleBtn || !checkToggleLabel || !checkToggleIcon) return;

            var bankAccounts = [];
            var checkAddresses = [];
            var INITIAL_VISIBLE_ACCOUNT_ROWS = 6;
            var isBankAccountsExpanded = false;
            var isCheckAddressesExpanded = false;
            var editingBankAccountId = '';
            var editingCheckAddressId = '';
            var pendingDeleteBankAccountId = '';
            var pendingDeleteCheckAddressId = '';

            function sanitizeDigits(value, maxLen) {
                return (value || '').replace(/\D/g, '').slice(0, maxLen);
            }

            function deriveCityState(address) {
                var lines = String(address || '')
                    .split('\n')
                    .map(function (line) { return line.trim(); })
                    .filter(Boolean);
                if (!lines.length) return '';
                if (lines.length === 1) return lines[0];
                return lines[lines.length - 2] || lines[0];
            }

            function getStoredArray(storageKey) {
                try {
                    var raw = localStorage.getItem(storageKey);
                    if (!raw) return null;
                    var parsed = JSON.parse(raw);
                    return Array.isArray(parsed) ? parsed : null;
                } catch (error) {
                    return null;
                }
            }

            function saveBankAccounts() {
                localStorage.setItem(BANK_ACCOUNTS_STORAGE_KEY, JSON.stringify(bankAccounts));
            }

            function saveCheckAddresses() {
                localStorage.setItem(CHECK_ADDRESSES_STORAGE_KEY, JSON.stringify(checkAddresses));
            }

            function createAccountId(displayName, last4) {
                var base = (displayName || 'account')
                    .toLowerCase()
                    .replace(/[^a-z0-9]+/g, '-')
                    .replace(/^-+|-+$/g, '')
                    .slice(0, 18) || 'account';
                var id = base + '-' + last4;
                var suffix = 2;
                while (bankAccounts.some(function (account) { return account.id === id; })) {
                    id = base + '-' + last4 + '-' + suffix;
                    suffix += 1;
                }
                return id;
            }

            function createAddressId(displayName, cityState) {
                var base = (displayName || cityState || 'address')
                    .toLowerCase()
                    .replace(/[^a-z0-9]+/g, '-')
                    .replace(/^-+|-+$/g, '')
                    .slice(0, 18) || 'address';
                var id = base;
                var suffix = 2;
                while (checkAddresses.some(function (address) { return address.id === id; })) {
                    id = base + '-' + suffix;
                    suffix += 1;
                }
                return id;
            }

            function formatAccountNumber(value) {
                var digits = sanitizeDigits(value, 12);
                var groups = [];
                for (var i = 0; i < digits.length; i += 4) {
                    groups.push(digits.slice(i, i + 4));
                }
                return groups.join('-');
            }

            function mapCountryNameToCode(countryName) {
                var normalized = String(countryName || '').trim().toLowerCase();
                if (normalized === 'canada') return 'ca';
                if (normalized === 'mexico') return 'mx';
                if (normalized === 'united kingdom') return 'gb';
                if (normalized === 'australia') return 'au';
                if (normalized === 'germany') return 'de';
                if (normalized === 'france') return 'fr';
                return 'us';
            }

            function buildAccountActionMenu(type, id) {
                if (window.PPComponents && typeof window.PPComponents.buildAccountActionMenu === 'function') {
                    return window.PPComponents.buildAccountActionMenu(type, id);
                }
                return '';
            }

            function createBankAccountRow(account) {
                if (window.PPComponents && typeof window.PPComponents.createBankAccountRow === 'function') {
                    return window.PPComponents.createBankAccountRow(account);
                }
                var fallback = document.createElement('div');
                return fallback;
            }

            function createCheckAddressRow(address) {
                if (window.PPComponents && typeof window.PPComponents.createCheckAddressRow === 'function') {
                    return window.PPComponents.createCheckAddressRow(address);
                }
                var fallback = document.createElement('div');
                return fallback;
            }

            function updateAddCheckCountryFlag() {
                var code = String(addCheckCountrySelect.value || 'us').toLowerCase();
                addCheckCountryFlag.className = 'fi fi-' + code + ' pointer-events-none z-10 col-start-1 row-start-1 ml-3 self-center justify-self-start rounded-sm';
            }

            function updateEditCheckCountryFlag() {
                var code = String(editCheckCountrySelect.value || 'us').toLowerCase();
                editCheckCountryFlag.className = 'fi fi-' + code + ' pointer-events-none z-10 col-start-1 row-start-1 ml-3 self-center justify-self-start rounded-sm';
            }

            function buildDefaultBankFormValues() {
                var index = bankAccounts.length + 1;
                var accountDigits = String(400000000000 + index).slice(-12);
                return {
                    accountName: 'Nexus Financial Group',
                    routing: '021000021',
                    accountNumber: formatAccountNumber(accountDigits),
                    nickname: 'My Bank Account ' + index
                };
            }

            function prefillAddBankForm() {
                var defaults = buildDefaultBankFormValues();
                nameInput.value = defaults.accountName;
                routingInput.value = defaults.routing;
                accountInput.value = defaults.accountNumber;
                confirmAccountInput.value = defaults.accountNumber;
                nicknameInput.value = defaults.nickname;
            }

            function buildDefaultCheckFormValues() {
                var index = checkAddresses.length + 1;
                return {
                    nickname: 'My Check Address ' + index,
                    line1: (1100 + index) + ' Market Street',
                    line2: 'Suite ' + (300 + index),
                    city: 'San Francisco',
                    state: 'CA',
                    zip: '9410' + Math.min(index, 9),
                    country: 'us'
                };
            }

            function resetAddCheckForm() {
                var defaults = buildDefaultCheckFormValues();
                addCheckNicknameInput.value = defaults.nickname;
                addCheckLine1Input.value = defaults.line1;
                addCheckLine2Input.value = defaults.line2;
                addCheckCityInput.value = defaults.city;
                addCheckStateInput.value = defaults.state;
                addCheckZipInput.value = defaults.zip;
                addCheckCountrySelect.value = defaults.country;
                updateAddCheckCountryFlag();
            }

            function parseCheckAddressForForm(address) {
                var lines = String(address.address || '')
                    .split('\n')
                    .map(function (line) { return line.trim(); })
                    .filter(Boolean);
                if (lines.length && lines[0] === address.name) lines.shift();
                var country = lines.length ? lines.pop() : 'United States';
                var cityStateZip = lines.length ? lines.pop() : '';
                var line1 = lines.length ? lines.shift() : '';
                var line2 = lines.length ? lines.join(', ') : '';
                var city = '';
                var state = '';
                var zip = '';
                var match = cityStateZip.match(/^(.*?),\s*([A-Za-z]{2,})\s+(.+)$/);
                if (match) {
                    city = match[1].trim();
                    state = match[2].trim();
                    zip = match[3].trim();
                } else {
                    var cityStateParts = String(address.cityState || '').split(',');
                    city = (cityStateParts[0] || '').trim();
                    state = (cityStateParts[1] || '').trim();
                }
                return { line1: line1, line2: line2, city: city, state: state, zip: zip, country: country };
            }

            function openDeleteBankConfirm(account) {
                if (!account) return;
                pendingDeleteBankAccountId = account.id;
                var accountLabel = String(account.name || 'Bank Account').trim();
                var accountLast4 = String(account.last4 || '').trim();
                deleteBankConfirmTitle.textContent = 'Delete ' + accountLabel + '?';
                var bankLabel = accountLabel + (accountLast4 ? ' ••••' + accountLast4 : '');
                deleteBankConfirmDescription.innerHTML =
                    'If you delete <span class="font-medium text-gray-900">' + bankLabel +
                    '</span> it will be removed as a payment option for receiving payments.';
                if (typeof deleteBankConfirmDialog.showModal === 'function') {
                    deleteBankConfirmDialog.showModal();
                }
            }

            function openDeleteCheckConfirm(address) {
                if (!address) return;
                pendingDeleteCheckAddressId = address.id;
                var addressLabel = String(address.displayName || 'Check Address').trim();
                var addressSummary = String(address.summary || '').trim();
                deleteCheckConfirmTitle.textContent = 'Delete ' + addressLabel + '?';
                var checkLabel = addressLabel + (addressSummary ? ' (' + addressSummary + ')' : '');
                deleteCheckConfirmDescription.innerHTML =
                    'If you delete <span class="font-medium text-gray-900">' + checkLabel +
                    '</span> it will be removed as a payment option for receiving payments.';
                if (typeof deleteCheckConfirmDialog.showModal === 'function') {
                    deleteCheckConfirmDialog.showModal();
                }
            }

            function createBankOption(account) {
                var option = document.createElement('el-option');
                option.setAttribute('value', account.id);
                option.setAttribute('data-gp-bank-option', 'true');
                option.className = 'group/option relative block cursor-default select-none py-3 pr-4 pl-3 text-gray-900 aria-selected:bg-gray-100 focus:bg-gray-100 focus:outline-hidden dark:text-white dark:aria-selected:bg-white/10 dark:focus:bg-white/10';
                option.innerHTML =
                    '<div class="flex items-center gap-3">' +
                    '  <div class="shrink-0 text-gray-500 in-[el-selectedcontent]:text-gray-600 dark:text-gray-400 dark:in-[el-selectedcontent]:text-gray-400">' +
                    '    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 18 18" fill="none"><path fill-rule="evenodd" clip-rule="evenodd" d="M8.7075 1.86718C8.8929 1.77767 9.10901 1.77767 9.29441 1.86718L15.8194 5.01718C16.1552 5.17925 16.2959 5.58279 16.1339 5.9185C15.9827 6.23168 15.6213 6.37521 15.301 6.26151V14.85H15.526C15.8988 14.85 16.201 15.1523 16.201 15.525C16.201 15.8978 15.8988 16.2 15.526 16.2H2.47594C2.10314 16.2 1.80094 15.8978 1.80094 15.525C1.80094 15.1523 2.10314 14.85 2.47594 14.85H2.70094V6.26151C2.38057 6.37521 2.01925 6.23168 1.86806 5.9185C1.70599 5.58279 1.84676 5.17925 2.18248 5.01718L8.7075 1.86718ZM9.90081 5.40005C9.90081 5.89711 9.49786 6.30005 9.0008 6.30005C8.50375 6.30005 8.1008 5.89711 8.1008 5.40005C8.1008 4.90299 8.50375 4.50005 9.0008 4.50005C9.49786 4.50005 9.90081 4.90299 9.90081 5.40005ZM6.7508 8.77505C6.7508 8.40226 6.44859 8.10005 6.07579 8.10005C5.703 8.10005 5.40079 8.40226 5.40079 8.77505V13.725C5.40079 14.0978 5.703 14.4 6.07579 14.4C6.44859 14.4 6.7508 14.0978 6.7508 13.725V8.77505ZM9.6758 8.77505C9.6758 8.40226 9.3736 8.10005 9.0008 8.10005C8.62801 8.10005 8.3258 8.40226 8.3258 8.77505V13.725C8.3258 14.0978 8.62801 14.4 9.0008 14.4C9.3736 14.4 9.6758 14.0978 9.6758 13.725V8.77505ZM12.6008 8.77505C12.6008 8.40226 12.2986 8.10005 11.9258 8.10005C11.553 8.10005 11.2508 8.40226 11.2508 8.77505V13.725C11.2508 14.0978 11.553 14.4 11.9258 14.4C12.2986 14.4 12.6008 14.0978 12.6008 13.725V8.77505Z" fill="#6B7280"/></svg>' +
                    '  </div>' +
                    '  <div class="in-[el-selectedcontent]:hidden">' +
                    '    <span class="flex items-center gap-1.5 self-stretch truncate font-medium group-aria-selected/option:font-semibold"><span>Bank Account</span><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M7.79922 5.99995C7.79922 6.99406 6.99333 7.79995 5.99922 7.79995C5.00511 7.79995 4.19922 6.99406 4.19922 5.99995C4.19922 5.00584 5.00511 4.19995 5.99922 4.19995C6.99333 4.19995 7.79922 5.00584 7.79922 5.99995Z" fill="#6B7280"/></svg><span>' + account.name + '</span></span>' +
                    '    <span class="block text-sm text-gray-500 dark:text-gray-400">' + account.name + ' ••••' + account.last4 + '</span>' +
                    '  </div>' +
                    '  <span class="hidden in-[el-selectedcontent]:block truncate font-medium">' + account.name + ' ••••' + account.last4 + '</span>' +
                    '</div>' +
                    '<span class="absolute inset-y-0 right-0 flex items-center pr-3 text-blue-600 group-not-aria-selected/option:hidden in-[el-selectedcontent]:hidden">' +
                    '  <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" class="size-5">' +
                    '    <path d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clip-rule="evenodd" fill-rule="evenodd" />' +
                    '  </svg>' +
                    '</span>';
                return option;
            }

            function createAddressOption(address) {
                var option = document.createElement('el-option');
                option.setAttribute('value', address.id);
                option.setAttribute('data-gp-address-option', 'true');
                option.className = 'group/option relative block cursor-default select-none py-3 pr-4 pl-3 text-gray-900 aria-selected:bg-gray-100 focus:bg-gray-100 focus:outline-hidden dark:text-white dark:aria-selected:bg-white/10 dark:focus:bg-white/10';
                option.innerHTML =
                    '<div class="flex items-center gap-3">' +
                    '  <div class="shrink-0 text-gray-500 in-[el-selectedcontent]:text-gray-600 dark:text-gray-400 dark:in-[el-selectedcontent]:text-gray-400">' +
                    '    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M16.25 2C16.6642 2 17 2.33579 17 2.75C17 3.16421 16.6642 3.5 16.25 3.5H16V16.5H16.25C16.6642 16.5 17 16.8358 17 17.25C17 17.6642 16.6642 18 16.25 18H12.75C12.3358 18 12 17.6642 12 17.25V14.75C12 14.3358 11.6642 14 11.25 14H8.75C8.33579 14 8 14.3358 8 14.75V17.25C8 17.6642 7.66421 18 7.25 18H3.75C3.33579 18 3 17.6642 3 17.25C3 16.8358 3.33579 16.5 3.75 16.5H4V3.5H3.75C3.33579 3.5 3 3.16421 3 2.75C3 2.33579 3.33579 2 3.75 2H16.25ZM7.5 9C7.22386 9 7 9.22386 7 9.5V10.5C7 10.7761 7.22386 11 7.5 11H8.5C8.77614 11 9 10.7761 9 10.5V9.5C9 9.22386 8.77614 9 8.5 9H7.5ZM11.5 9C11.2239 9 11 9.22386 11 9.5V10.5C11 10.7761 11.2239 11 11.5 11H12.5C12.7761 11 13 10.7761 13 10.5V9.5C13 9.22386 12.7761 9 12.5 9H11.5ZM7.5 5C7.22386 5 7 5.22386 7 5.5V6.5C7 6.77614 7.22386 7 7.5 7H8.5C8.77614 7 9 6.77614 9 6.5V5.5C9 5.22386 8.77614 5 8.5 5H7.5ZM11.5 5C11.2239 5 11 5.22386 11 5.5V6.5C11 6.77614 11.2239 7 11.5 7H12.5C12.7761 7 13 6.77614 13 6.5V5.5C13 5.22386 12.7761 5 12.5 5H11.5Z" fill="#6B7280"/></svg>' +
                    '  </div>' +
                    '  <div class="in-[el-selectedcontent]:hidden">' +
                    '    <span class="flex items-center gap-1.5 self-stretch truncate font-medium group-aria-selected/option:font-semibold"><span>Paper Check</span><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M7.79922 5.99995C7.79922 6.99406 6.99333 7.79995 5.99922 7.79995C5.00511 7.79995 4.19922 6.99406 4.19922 5.99995C4.19922 5.00584 5.00511 4.19995 5.99922 4.19995C6.99333 4.19995 7.79922 5.00584 7.79922 5.99995Z" fill="#6B7280"/></svg><span>' + address.displayName + '</span></span>' +
                    '    <span class="block text-sm text-gray-500 dark:text-gray-400">' + address.summary + '</span>' +
                    '  </div>' +
                    '  <span class="hidden in-[el-selectedcontent]:block truncate font-medium">' + address.displayName + '</span>' +
                    '</div>' +
                    '<span class="absolute inset-y-0 right-0 flex items-center pr-3 text-blue-600 group-not-aria-selected/option:hidden in-[el-selectedcontent]:hidden">' +
                    '  <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" class="size-5">' +
                    '    <path d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clip-rule="evenodd" fill-rule="evenodd" />' +
                    '  </svg>' +
                    '</span>';
                return option;
            }

            function renderBankAccountsList() {
                bankList.innerHTML = '';
                var visibleCount = isBankAccountsExpanded
                    ? bankAccounts.length
                    : Math.min(INITIAL_VISIBLE_ACCOUNT_ROWS, bankAccounts.length);
                bankAccounts.slice(0, visibleCount).forEach(function (account) {
                    bankList.appendChild(createBankAccountRow(account));
                });
                bankEmptyState.classList.toggle('hidden', bankAccounts.length > 0);
                var hiddenCount = Math.max(bankAccounts.length - INITIAL_VISIBLE_ACCOUNT_ROWS, 0);
                if (!isBankAccountsExpanded && hiddenCount > 0) {
                    bankToggleBtn.style.display = 'inline-flex';
                    bankToggleLabel.textContent = 'Show more (' + hiddenCount + ')';
                    bankToggleIcon.classList.remove('rotate-180');
                } else if (isBankAccountsExpanded && bankAccounts.length > INITIAL_VISIBLE_ACCOUNT_ROWS) {
                    bankToggleBtn.style.display = 'inline-flex';
                    bankToggleLabel.textContent = 'Show less';
                    bankToggleIcon.classList.add('rotate-180');
                } else {
                    bankToggleBtn.style.display = 'none';
                }
            }

            function renderCheckAddressesList() {
                checkList.innerHTML = '';
                var visibleCount = isCheckAddressesExpanded
                    ? checkAddresses.length
                    : Math.min(INITIAL_VISIBLE_ACCOUNT_ROWS, checkAddresses.length);
                checkAddresses.slice(0, visibleCount).forEach(function (address) {
                    checkList.appendChild(createCheckAddressRow(address));
                });
                checkEmptyState.classList.toggle('hidden', checkAddresses.length > 0);
                var hiddenCount = Math.max(checkAddresses.length - INITIAL_VISIBLE_ACCOUNT_ROWS, 0);
                if (!isCheckAddressesExpanded && hiddenCount > 0) {
                    checkToggleBtn.style.display = 'inline-flex';
                    checkToggleLabel.textContent = 'Show more (' + hiddenCount + ')';
                    checkToggleIcon.classList.remove('rotate-180');
                } else if (isCheckAddressesExpanded && checkAddresses.length > INITIAL_VISIBLE_ACCOUNT_ROWS) {
                    checkToggleBtn.style.display = 'inline-flex';
                    checkToggleLabel.textContent = 'Show less';
                    checkToggleIcon.classList.add('rotate-180');
                } else {
                    checkToggleBtn.style.display = 'none';
                }
            }

            function renderGlobalPreferencesPaymentOptions() {
                var gpSelects = document.querySelectorAll('el-select[name^="gp-default-payment-method-"]');
                var allowedValues = new Set(['payers-card']);
                bankAccounts.forEach(function (account) { allowedValues.add(account.id); });
                checkAddresses.forEach(function (address) { allowedValues.add(address.id); });

                gpSelects.forEach(function (selectEl) {
                    var optionsEl = selectEl.querySelector('el-options');
                    if (!optionsEl) return;

                    optionsEl.querySelectorAll('el-option[data-gp-bank-option="true"], el-option[data-gp-address-option="true"], el-option[value="wf-8419"], el-option[value="citi-3674"], el-option[value="addr-sf"], el-option[value="addr-ny"]').forEach(function (optionEl) {
                        optionEl.remove();
                    });

                    var payersCardEl = optionsEl.querySelector('el-option[value="payers-card"]');
                    var insertBeforeEl = payersCardEl ? payersCardEl.nextSibling : null;

                    bankAccounts.forEach(function (account) {
                        var optionEl = createBankOption(account);
                        if (insertBeforeEl) {
                            optionsEl.insertBefore(optionEl, insertBeforeEl);
                        } else {
                            optionsEl.appendChild(optionEl);
                        }
                    });

                    checkAddresses.forEach(function (address) {
                        var optionEl = createAddressOption(address);
                        if (insertBeforeEl) {
                            optionsEl.insertBefore(optionEl, insertBeforeEl);
                        } else {
                            optionsEl.appendChild(optionEl);
                        }
                    });

                    var selectedValue = typeof window.__ppGetGpSelectedValue === 'function'
                        ? window.__ppGetGpSelectedValue(selectEl)
                        : (selectEl.value || '');
                    if (selectedValue && !allowedValues.has(selectedValue)) {
                        if (typeof selectEl.value !== 'undefined') selectEl.value = '';
                        selectEl.removeAttribute('value');
                        selectEl.dispatchEvent(new Event('change', { bubbles: true }));
                    }
                });
            }

            function renderAllViews() {
                renderBankAccountsList();
                renderCheckAddressesList();
                renderGlobalPreferencesPaymentOptions();
                if (typeof window.__ppApplyUniqueSelection === 'function') {
                    window.__ppApplyUniqueSelection();
                }
                if (typeof window.__ppUpdateGpSavedSnapshot === 'function') {
                    window.__ppUpdateGpSavedSnapshot();
                }
            }

            bankToggleBtn.addEventListener('click', function () {
                isBankAccountsExpanded = !isBankAccountsExpanded;
                renderBankAccountsList();
            });

            checkToggleBtn.addEventListener('click', function () {
                isCheckAddressesExpanded = !isCheckAddressesExpanded;
                renderCheckAddressesList();
            });

            function normalizeBankAccounts(rawAccounts) {
                if (!Array.isArray(rawAccounts)) return [];
                return rawAccounts
                    .map(function (account) {
                        var id = (account && account.id ? String(account.id) : '').trim();
                        var displayName = (account && account.displayName ? String(account.displayName) : '').trim();
                        var legalName = (account && account.name ? String(account.name) : '').trim();
                        var bankName = (account && account.bankName ? String(account.bankName) : '').trim();
                        var name = displayName || (bankName ? (bankName + ' Account') : legalName);
                        var nickname = (account && account.nickname ? String(account.nickname) : '').trim();
                        var routingRaw = account && (account.routing || account.routingNumber) ? String(account.routing || account.routingNumber) : '';
                        var routing = sanitizeDigits(routingRaw, 9);
                        var accountNumber = formatAccountNumber(account && account.accountNumber ? String(account.accountNumber) : '');
                        var last4 = sanitizeDigits(account && account.last4 ? String(account.last4) : '', 4);
                        var address = (account && account.address ? String(account.address) : '').trim();
                        if (!id || !name || last4.length !== 4) return null;
                        return { id: id, name: name, last4: last4, nickname: nickname, routing: routing, accountNumber: accountNumber, address: address };
                    })
                    .filter(Boolean);
            }

            function normalizeCheckAddresses(rawAddresses) {
                if (!Array.isArray(rawAddresses)) return [];
                return rawAddresses
                    .map(function (address) {
                        var id = (address && address.id ? String(address.id) : '').trim();
                        var displayName = (address && address.displayName ? String(address.displayName) : '').trim();
                        var name = (address && address.name ? String(address.name) : 'Nexus Financial Group').trim();
                        var fullAddress = (address && address.address ? String(address.address) : '').trim();
                        var cityState = (address && address.cityState ? String(address.cityState) : deriveCityState(fullAddress)).trim();
                        var summary = (address && address.summary ? String(address.summary) : '').trim();
                        if (!summary) {
                            var lines = fullAddress
                                .split('\n')
                                .map(function (line) { return line.trim(); })
                                .filter(Boolean);
                            summary = lines.slice(0, 3).join(', ');
                        }
                        if (!id || !displayName || !fullAddress || !cityState) return null;
                        return { id: id, displayName: displayName, name: name, address: fullAddress, cityState: cityState, summary: summary };
                    })
                    .filter(Boolean);
            }

            async function initializeSharedData() {
                var storedBanks = normalizeBankAccounts(getStoredArray(BANK_ACCOUNTS_STORAGE_KEY));
                var storedAddresses = normalizeCheckAddresses(getStoredArray(CHECK_ADDRESSES_STORAGE_KEY));
                var sharedData = null;

                try {
                    sharedData = await window.__ppLoadSharedData();
                } catch (error) {
                    sharedData = null;
                }

                var jsonBanks = normalizeBankAccounts(sharedData && Array.isArray(sharedData.bankAccounts) ? sharedData.bankAccounts : []);
                var jsonAddresses = normalizeCheckAddresses(sharedData && Array.isArray(sharedData.checkAddresses) ? sharedData.checkAddresses : []);

                if (jsonBanks.length) {
                    bankAccounts = jsonBanks;
                } else if (storedBanks.length) {
                    bankAccounts = storedBanks;
                } else {
                    bankAccounts = [];
                }

                if (jsonAddresses.length) {
                    checkAddresses = jsonAddresses;
                } else if (storedAddresses.length) {
                    checkAddresses = storedAddresses;
                } else {
                    checkAddresses = [];
                }

                saveBankAccounts();
                saveCheckAddresses();
                renderAllViews();
            }

            routingInput.addEventListener('input', function () {
                routingInput.value = sanitizeDigits(routingInput.value, 9);
            });

            accountInput.addEventListener('input', function () {
                accountInput.value = formatAccountNumber(accountInput.value);
            });

            confirmAccountInput.addEventListener('input', function () {
                confirmAccountInput.value = formatAccountNumber(confirmAccountInput.value);
            });

            bankList.addEventListener('click', function (event) {
                var editBtn = event.target.closest('[data-edit-bank-account-id]');
                if (editBtn) {
                    var editId = editBtn.getAttribute('data-edit-bank-account-id');
                    var account = bankAccounts.find(function (item) { return item.id === editId; });
                    if (!account) return;
                    editingBankAccountId = editId;
                    editBankNameInput.value = account.name || '';
                    editBankRoutingInput.value = account.routing || '';
                    editBankAccountInput.value = account.accountNumber || '';
                    editBankConfirmInput.value = account.accountNumber || '';
                    editBankNicknameInput.value = account.nickname || '';
                    if (typeof editBankDialog.showModal === 'function') editBankDialog.showModal();
                    return;
                }

                var deleteBtn = event.target.closest('[data-delete-bank-account-id]');
                if (deleteBtn) {
                    var accountId = deleteBtn.getAttribute('data-delete-bank-account-id');
                    var accountToDelete = bankAccounts.find(function (account) { return account.id === accountId; });
                    openDeleteBankConfirm(accountToDelete);
                }
            });

            deleteBankConfirmBtn.addEventListener('click', function () {
                if (!pendingDeleteBankAccountId) return;
                bankAccounts = bankAccounts.filter(function (account) { return account.id !== pendingDeleteBankAccountId; });
                saveBankAccounts();
                renderAllViews();
                deleteBankConfirmDialog.close();
            });

            checkList.addEventListener('click', function (event) {
                var editBtn = event.target.closest('[data-edit-check-address-id]');
                if (editBtn) {
                    var editId = editBtn.getAttribute('data-edit-check-address-id');
                    var address = checkAddresses.find(function (item) { return item.id === editId; });
                    if (!address) return;
                    editingCheckAddressId = editId;
                    var parsed = parseCheckAddressForForm(address);
                    editCheckNicknameInput.value = address.displayName || '';
                    editCheckLine1Input.value = parsed.line1;
                    editCheckLine2Input.value = parsed.line2;
                    editCheckCityInput.value = parsed.city;
                    editCheckStateInput.value = parsed.state;
                    editCheckZipInput.value = parsed.zip;
                    editCheckCountrySelect.value = mapCountryNameToCode(parsed.country);
                    updateEditCheckCountryFlag();
                    if (typeof editCheckDialog.showModal === 'function') editCheckDialog.showModal();
                    return;
                }

                var deleteBtn = event.target.closest('[data-delete-check-address-id]');
                if (deleteBtn) {
                    var addressId = deleteBtn.getAttribute('data-delete-check-address-id');
                    var addressToDelete = checkAddresses.find(function (address) { return address.id === addressId; });
                    openDeleteCheckConfirm(addressToDelete);
                }
            });

            deleteCheckConfirmBtn.addEventListener('click', function () {
                if (!pendingDeleteCheckAddressId) return;
                checkAddresses = checkAddresses.filter(function (address) { return address.id !== pendingDeleteCheckAddressId; });
                saveCheckAddresses();
                renderAllViews();
                deleteCheckConfirmDialog.close();
            });

            saveBtn.addEventListener('click', function () {
                var accountName = (nameInput.value || '').trim();
                var routingDigits = sanitizeDigits(routingInput.value, 9);
                var accountDigits = sanitizeDigits(accountInput.value, 12);
                var confirmDigits = sanitizeDigits(confirmAccountInput.value, 12);
                var nickname = (nicknameInput.value || '').trim();
                var displayName = nickname || accountName;

                if (!accountName) return;
                if (routingDigits.length !== 9) return;
                if (accountDigits.length < 4) return;
                if (accountDigits !== confirmDigits) return;

                var last4 = accountDigits.slice(-4);
                var newAccount = {
                    id: createAccountId(displayName, last4),
                    name: displayName,
                    last4: last4,
                    nickname: nickname,
                    routing: routingDigits,
                    accountNumber: formatAccountNumber(accountDigits)
                };
                bankAccounts.push(newAccount);
                saveBankAccounts();
                renderAllViews();

                nameInput.value = '';
                routingInput.value = '';
                accountInput.value = '';
                confirmAccountInput.value = '';
                nicknameInput.value = '';
                dialog.close();
            });

            addCheckCountrySelect.addEventListener('change', updateAddCheckCountryFlag);
            editCheckCountrySelect.addEventListener('change', updateEditCheckCountryFlag);

            editBankRoutingInput.addEventListener('input', function () {
                editBankRoutingInput.value = sanitizeDigits(editBankRoutingInput.value, 9);
            });
            editBankAccountInput.addEventListener('input', function () {
                editBankAccountInput.value = formatAccountNumber(editBankAccountInput.value);
            });
            editBankConfirmInput.addEventListener('input', function () {
                editBankConfirmInput.value = formatAccountNumber(editBankConfirmInput.value);
            });

            editBankSaveBtn.addEventListener('click', function () {
                if (!editingBankAccountId) return;
                var account = bankAccounts.find(function (item) { return item.id === editingBankAccountId; });
                if (!account) return;

                var accountName = (editBankNameInput.value || '').trim();
                var nickname = (editBankNicknameInput.value || '').trim();
                var routingDigits = sanitizeDigits(editBankRoutingInput.value, 9);
                var accountDigits = sanitizeDigits(editBankAccountInput.value, 12);
                var confirmDigits = sanitizeDigits(editBankConfirmInput.value, 12);

                if (!accountName) return;
                if (routingDigits && routingDigits.length !== 9) return;
                if (accountDigits && accountDigits.length < 4) return;
                if (accountDigits !== confirmDigits) return;

                account.name = accountName;
                account.nickname = nickname;
                account.routing = routingDigits;
                if (accountDigits) {
                    account.accountNumber = formatAccountNumber(accountDigits);
                    account.last4 = accountDigits.slice(-4);
                }

                saveBankAccounts();
                renderAllViews();
                editBankDialog.close();
            });

            editCheckSaveBtn.addEventListener('click', function () {
                if (!editingCheckAddressId) return;
                var address = checkAddresses.find(function (item) { return item.id === editingCheckAddressId; });
                if (!address) return;

                var nickname = (editCheckNicknameInput.value || '').trim();
                var line1 = (editCheckLine1Input.value || '').trim();
                var line2 = (editCheckLine2Input.value || '').trim();
                var city = (editCheckCityInput.value || '').trim();
                var state = (editCheckStateInput.value || '').trim();
                var zip = (editCheckZipInput.value || '').trim();
                var countryName = editCheckCountrySelect.options[editCheckCountrySelect.selectedIndex]
                    ? editCheckCountrySelect.options[editCheckCountrySelect.selectedIndex].text
                    : 'United States';
                var cityState = [city, state].filter(Boolean).join(', ');

                if (!nickname || !line1 || !city || !state || !zip) return;

                var companyName = (address.name || 'Nexus Financial Group').trim();
                var addressLines = [companyName, line1];
                if (line2) addressLines.push(line2);
                addressLines.push(cityState + ' ' + zip);
                addressLines.push(countryName);

                address.displayName = nickname;
                address.name = companyName;
                address.address = addressLines.join('\n');
                address.cityState = cityState;
                address.summary = [line1, cityState, zip].filter(Boolean).join(', ');

                saveCheckAddresses();
                renderAllViews();
                editCheckDialog.close();
            });

            addCheckSaveBtn.addEventListener('click', function () {
                var nickname = (addCheckNicknameInput.value || '').trim();
                var line1 = (addCheckLine1Input.value || '').trim();
                var line2 = (addCheckLine2Input.value || '').trim();
                var city = (addCheckCityInput.value || '').trim();
                var state = (addCheckStateInput.value || '').trim();
                var zip = (addCheckZipInput.value || '').trim();
                var countryName = addCheckCountrySelect.options[addCheckCountrySelect.selectedIndex]
                    ? addCheckCountrySelect.options[addCheckCountrySelect.selectedIndex].text
                    : 'United States';
                var cityState = [city, state].filter(Boolean).join(', ');

                if (!nickname || !line1 || !city || !state || !zip) return;

                var addressLines = ['Nexus Financial Group', line1];
                if (line2) addressLines.push(line2);
                addressLines.push(cityState + ' ' + zip);
                addressLines.push(countryName);

                var newAddress = {
                    id: createAddressId(nickname, cityState),
                    displayName: nickname,
                    name: 'Nexus Financial Group',
                    address: addressLines.join('\n'),
                    cityState: cityState,
                    summary: [line1, cityState, zip].filter(Boolean).join(', ')
                };

                checkAddresses.push(newAddress);
                saveCheckAddresses();
                renderAllViews();
                resetAddCheckForm();
                addCheckDialog.close();
            });

            document.querySelectorAll('[command="show-modal"][commandfor="pp-add-bank-account-dialog"]').forEach(function (btn) {
                btn.addEventListener('click', prefillAddBankForm);
            });
            document.querySelectorAll('[command="show-modal"][commandfor="pp-add-check-dialog"]').forEach(function (btn) {
                btn.addEventListener('click', resetAddCheckForm);
            });

            dialog.addEventListener('close', prefillAddBankForm);
            addCheckDialog.addEventListener('close', resetAddCheckForm);
            editBankDialog.addEventListener('close', function () { editingBankAccountId = ''; });
            editCheckDialog.addEventListener('close', function () { editingCheckAddressId = ''; });
            deleteBankConfirmDialog.addEventListener('close', function () { pendingDeleteBankAccountId = ''; });
            deleteCheckConfirmDialog.addEventListener('close', function () { pendingDeleteCheckAddressId = ''; });
            prefillAddBankForm();
            resetAddCheckForm();
            updateAddCheckCountryFlag();
            updateEditCheckCountryFlag();

            initializeSharedData();
        })();

        (function () {
            var enableDialog = document.getElementById('pp-enable-stp-dialog');
            var nextStepsDialog = document.getElementById('pp-stp-next-steps-dialog');
            var verifyDialog = document.getElementById('pp-verify-deposit-dialog');
            var agreementCheckbox = document.getElementById('pp-stp-agreement-checkbox');
            var enableConfirmBtn = document.getElementById('pp-enable-stp-confirm-btn');
            var input = document.getElementById('pp-deposit-amount');
            var verifyBtn = document.getElementById('pp-verify-deposit-btn');
            var errorMsg = document.getElementById('pp-deposit-amount-error');
            var errorIcon = document.getElementById('pp-deposit-amount-error-icon');
            var stpOptInBtn = document.getElementById('pp-stp-opt-in-btn');
            var stpTerminalImages = Array.prototype.slice.call(document.querySelectorAll('[data-stp-terminal-image]'));
            if (!agreementCheckbox || !enableConfirmBtn || !input || !verifyBtn || !errorMsg || !errorIcon) return;
            var hasError = false;
            var stpAnimationCycleTimer = null;
            var stpDotTimers = [];
            var STP_ENABLED_CLASS =
                'inline-flex shrink-0 items-center justify-center rounded-md bg-green-600 px-2 py-1 text-sm font-semibold leading-5 text-white shadow-xs cursor-default';
            var STP_DISABLED_CLASS =
                'inline-flex shrink-0 items-center justify-center rounded-md bg-blue-600 px-2 py-1 text-sm font-semibold leading-5 text-white shadow-xs hover:bg-blue-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 cursor-pointer';

            var TERMINAL_BASE_SRC = '../../../src/assets/illustrations/terminal.svg';
            var TERMINAL_PROGRESS_SRCS = [
                '../../../src/assets/illustrations/terminal-dot1.svg',
                '../../../src/assets/illustrations/terminal-dot2.svg',
                '../../../src/assets/illustrations/terminal-dot3.svg',
                '../../../src/assets/illustrations/terminal-dot4.svg'
            ];
            function readDialogMs(varName, fallback) {
                if (!enableDialog) return fallback;
                var raw = getComputedStyle(enableDialog).getPropertyValue(varName).trim();
                var parsed = parseInt(raw, 10);
                return Number.isFinite(parsed) ? parsed : fallback;
            }

            function getAnimationConfig() {
                return {
                    loopMs: readDialogMs('--pp-stp-loop-ms', 8000),
                    dotSequenceMs: [
                        readDialogMs('--pp-stp-dot-1-ms', 2700),
                        readDialogMs('--pp-stp-dot-2-ms', 2820),
                        readDialogMs('--pp-stp-dot-3-ms', 2940),
                        readDialogMs('--pp-stp-dot-4-ms', 3060)
                    ],
                    dotResetMs: readDialogMs('--pp-stp-dot-reset-ms', 7000)
                };
            }

            function clearTerminalDotTimers() {
                stpDotTimers.forEach(function (timer) { clearTimeout(timer); });
                stpDotTimers = [];
            }

            function stopStpCardAnimationLoop() {
                clearTerminalDotTimers();
                if (stpAnimationCycleTimer) {
                    clearTimeout(stpAnimationCycleTimer);
                    stpAnimationCycleTimer = null;
                }
                if (enableDialog) enableDialog.removeAttribute('data-card-animating');
                setTerminalStep(0);
            }

            function setTerminalStep(step) {
                if (!stpTerminalImages.length) return;
                stpTerminalImages.forEach(function (img) {
                    if (step <= 0) {
                        img.src = TERMINAL_BASE_SRC;
                        return;
                    }
                    img.src = TERMINAL_PROGRESS_SRCS[Math.min(step, TERMINAL_PROGRESS_SRCS.length) - 1];
                });
            }

            function runTerminalDotCycle(config) {
                clearTerminalDotTimers();
                setTerminalStep(0);

                config.dotSequenceMs.forEach(function (ms, index) {
                    stpDotTimers.push(setTimeout(function () {
                        if (!enableDialog.open) return;
                        setTerminalStep(index + 1);
                    }, ms));
                });

                stpDotTimers.push(setTimeout(function () {
                    if (!enableDialog.open) return;
                    setTerminalStep(0);
                }, config.dotResetMs));
            }

            function runStpCardAnimationCycle(activeDialog) {
                if (!activeDialog || !activeDialog.open) return;
                var config = getAnimationConfig();
                runTerminalDotCycle(config);
                stpAnimationCycleTimer = setTimeout(function () {
                    runStpCardAnimationCycle(activeDialog);
                }, config.loopMs);
            }

            function startStpCardAnimationLoop(activeDialog) {
                if (!activeDialog) return;
                stopStpCardAnimationLoop();
                activeDialog.removeAttribute('data-card-animating');
                void activeDialog.offsetWidth;
                activeDialog.setAttribute('data-card-animating', 'true');
                runStpCardAnimationCycle(activeDialog);
            }

            function updateEnableState() {
                enableConfirmBtn.disabled = !agreementCheckbox.checked;
            }

            function setError(show) {
                hasError = show;
                input.setAttribute('aria-invalid', show ? 'true' : 'false');
                errorMsg.classList.toggle('hidden', !show);
                errorIcon.classList.toggle('hidden', !show);
                input.classList.toggle('text-red-900', show);
                input.classList.toggle('outline-red-300', show);
                input.classList.toggle('placeholder:text-red-300', show);
                input.classList.toggle('focus:outline-red-600', show);
                input.classList.toggle('dark:text-red-300', show);
                input.classList.toggle('dark:outline-red-500/40', show);
                input.classList.toggle('dark:placeholder:text-red-400/70', show);
                input.classList.toggle('dark:focus:outline-red-500', show);
            }

            function updateVerifyState() {
                verifyBtn.disabled = hasError || !/\d/.test(input.value);
            }

            function sanitizeDecimal(raw) {
                var cleaned = raw.replace(/[^0-9.]/g, '');
                var firstDot = cleaned.indexOf('.');
                if (firstDot === -1) return cleaned;
                return cleaned.slice(0, firstDot + 1) + cleaned.slice(firstDot + 1).replace(/\./g, '');
            }

            function openNextStepsModal() {
                if (enableDialog && enableDialog.open) {
                    try { enableDialog.close(); } catch (err) { /* noop */ }
                }
                setTimeout(function () {
                    if (nextStepsDialog && typeof nextStepsDialog.showModal === 'function' && !nextStepsDialog.open) {
                        nextStepsDialog.showModal();
                        return;
                    }
                    if (verifyDialog && typeof verifyDialog.showModal === 'function' && !verifyDialog.open) {
                        verifyDialog.showModal();
                    }
                }, 0);
            }

            function openEnableStep() {
                if (!enableDialog || typeof enableDialog.showModal !== 'function') return;
                if (!enableDialog.open) {
                    try { enableDialog.showModal(); } catch (err) { /* noop */ }
                } else {
                    requestAnimationFrame(function () { startStpCardAnimationLoop(enableDialog); });
                }
            }

            function applyStpUi(status) {
                if (!stpOptInBtn) return;
                if (status === 'enabled') {
                    stpOptInBtn.textContent = 'Enabled';
                    stpOptInBtn.disabled = true;
                    stpOptInBtn.className = STP_ENABLED_CLASS;
                    return;
                }
                stpOptInBtn.textContent = 'Opt in';
                stpOptInBtn.disabled = false;
                stpOptInBtn.className = STP_DISABLED_CLASS;
            }

            function syncStpStatus(status) {
                applyStpUi(status);
            }

            agreementCheckbox.addEventListener('change', updateEnableState);
            enableConfirmBtn.addEventListener('click', function () {
                if (enableConfirmBtn.disabled) return;
                openNextStepsModal();
            });
            if (stpOptInBtn) {
                stpOptInBtn.addEventListener('click', function () {
                    if (stpOptInBtn.disabled) return;
                    if (window.STPState && typeof window.STPState.openOptInModal === 'function') {
                        window.STPState.openOptInModal();
                    } else {
                        openEnableStep();
                    }
                });
            }

            if (enableDialog) {
                var enableDialogObserver = new MutationObserver(function () {
                    if (enableDialog.open) {
                        requestAnimationFrame(function () { startStpCardAnimationLoop(enableDialog); });
                    } else {
                        stopStpCardAnimationLoop();
                    }
                });

                enableDialogObserver.observe(enableDialog, { attributes: true, attributeFilter: ['open'] });

                enableDialog.addEventListener('close', function () {
                    agreementCheckbox.checked = false;
                    updateEnableState();
                    stopStpCardAnimationLoop();
                });
            }

            input.addEventListener('focus', function () {
                setTimeout(function () {
                    var len = input.value.length;
                    input.setSelectionRange(len, len);
                }, 0);
            });

            input.addEventListener('click', function () {
                var len = input.value.length;
                input.setSelectionRange(len, len);
            });

            input.addEventListener('keydown', function (event) {
                var key = event.key;
                var allowControl = key === 'Tab' || key === 'ArrowLeft' || key === 'ArrowRight' || key === 'Home' || key === 'End';
                if (allowControl) return;
                if (key === 'Backspace' || key === 'Delete') return;
                if (key >= '0' && key <= '9') {
                    setError(false);
                    updateVerifyState();
                    return;
                }
                if (key === '.') {
                    if (input.value.indexOf('.') !== -1) {
                        event.preventDefault();
                        setError(true);
                    } else {
                        setError(false);
                    }
                    updateVerifyState();
                    return;
                }
                if (key.length === 1 && !event.metaKey && !event.ctrlKey && !event.altKey) {
                    event.preventDefault();
                    setError(true);
                    updateVerifyState();
                }
            });

            input.addEventListener('paste', function (event) {
                event.preventDefault();
                var text = (event.clipboardData || window.clipboardData).getData('text') || '';
                var sanitized = sanitizeDecimal(text);
                var hasInvalid = text !== sanitized;
                input.value = sanitized;
                setError(hasInvalid);
                updateVerifyState();
            });

            input.addEventListener('input', function () {
                var raw = input.value;
                var clean = sanitizeDecimal(raw);
                var hasInvalid = raw !== clean;
                input.value = clean;
                setError(hasInvalid);
                updateVerifyState();
            });

            verifyBtn.addEventListener('click', function () {
                if (verifyBtn.disabled) return;
                if (window.STPState && typeof window.STPState.setStpStatus === 'function') {
                    window.STPState.setStpStatus('enabled');
                } else {
                    applyStpUi('enabled');
                }
            });

            if (window.STPState && typeof window.STPState.subscribe === 'function') {
                window.STPState.subscribe(syncStpStatus);
            } else {
                syncStpStatus('disabled');
            }

            var openStpFromQuery = false;
            try {
                var params = new URLSearchParams(window.location.search || '');
                openStpFromQuery = params.get('openStpModal') === '1';
                if (openStpFromQuery) {
                    params.delete('openStpModal');
                    var newQuery = params.toString();
                    var nextUrl = window.location.pathname + (newQuery ? ('?' + newQuery) : '') + window.location.hash;
                    window.history.replaceState({}, '', nextUrl);
                }
            } catch (err) {
                openStpFromQuery = false;
            }
            if (openStpFromQuery) {
                setTimeout(function () { openEnableStep(); }, 0);
            }

            updateEnableState();
            updateVerifyState();
        })();

        /* ===== Global Preferences — detail cards ===== */
        (function () {
            var BANK_KEY  = 'pp_my_bank_accounts_v1';
            var CHECK_KEY = 'pp_my_check_addresses_v1';
            var cardsCachePromise = null;
            var cardCopyMapBySlot = {};

            function getStored(key) {
                try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch (e) { return []; }
            }

            function setText(id, value) {
                var el = document.getElementById(id);
                if (el) el.textContent = value || '';
            }

            function firstNonEmpty() {
                for (var i = 0; i < arguments.length; i++) {
                    var v = arguments[i];
                    if (v != null && String(v).trim() !== '') return String(v);
                }
                return '';
            }

            function maskRouting(routing) {
                if (!routing || routing.length < 4) return routing || '';
                return '•••••' + routing.slice(-4);
            }

            function getDigits(value) {
                return String(value || '').replace(/\D/g, '');
            }

            function formatCardNumber(value) {
                return getDigits(value).replace(/(\d{4})(?=\d)/g, '$1 ').trim();
            }

            function getPrimaryCard() {
                if (!cardsCachePromise) {
                    if (typeof window.__ppLoadSharedData !== 'function') {
                        cardsCachePromise = Promise.resolve(null);
                    } else {
                        cardsCachePromise = window.__ppLoadSharedData()
                            .then(function (payload) {
                                var cards = payload && Array.isArray(payload.cards) ? payload.cards : [];
                                if (!cards.length) return null;
                                for (var i = 0; i < cards.length; i++) {
                                    if (String(cards[i].status || '').toLowerCase() !== 'inactive') return cards[i];
                                }
                                return cards[0];
                            })
                            .catch(function () { return null; });
                    }
                }
                return cardsCachePromise;
            }

            function setCopyVisible(btn, visible) {
                if (!btn) return;
                btn.setAttribute('data-copy-enabled', visible ? 'true' : 'false');
                var icon = btn.querySelector('[data-copy-icon="true"]');
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

            function bindCopy(btn, valueEl) {
                if (!btn || !valueEl || btn.getAttribute('data-copy-bound') === 'true') return;
                btn.setAttribute('data-copy-bound', 'true');
                btn.addEventListener('click', function (event) {
                    event.preventDefault();
                    event.stopPropagation();
                    if (btn.getAttribute('data-copy-enabled') !== 'true') return;
                    var text = String(valueEl.textContent || '').trim();
                    if (!text) return;
                    if (window.copyTextWithFeedback) window.copyTextWithFeedback(text, btn);
                });
            }

            function ensureCardPanel(n) {
                var panelId = 'gp-details-card-' + n;
                var existing = document.getElementById(panelId);
                if (existing) return existing;

                var anchor = document.getElementById('gp-details-bank-' + n);
                if (!anchor || !anchor.parentNode) return null;

                var panel = document.createElement('div');
                panel.id = panelId;
                panel.className = 'hidden';
                panel.innerHTML =
                    '<div class="flex flex-col items-start self-stretch" data-gp-card-panel="' + n + '">' +
                      '<div class="flex items-center justify-between self-stretch rounded-t-md border border-gray-200 bg-gray-100 px-4 py-2 dark:border-white/10 dark:bg-white/10">' +
                        '<span class="text-sm font-semibold text-gray-900 dark:text-gray-100">Card Details</span>' +
                      '</div>' +
                      '<div class="flex flex-col items-start gap-2 self-stretch rounded-b-md border-r border-b border-l border-gray-200 bg-gray-50 p-4 dark:border-white/10 dark:bg-white/5">' +
                        '<div class="grid grid-cols-2 gap-4 self-stretch">' +
                          '<span class="text-sm font-medium text-gray-900 dark:text-gray-100">Name</span>' +
                          '<span id="gp-card-name-' + n + '" class="text-sm font-normal text-gray-700 dark:text-gray-300"></span>' +
                        '</div>' +
                        '<div class="grid grid-cols-2 gap-4 self-stretch">' +
                          '<span class="text-sm font-medium text-gray-900 dark:text-gray-100">Card Number</span>' +
                          '<button type="button" id="gp-card-number-copy-btn-' + n + '" data-copy-enabled="false" class="copy-btn -ml-1 inline-flex w-fit items-center gap-1.5 rounded-md px-1.5 py-0.5 text-gray-700 dark:text-gray-300 pointer-events-none">' +
                            '<span id="gp-card-number-' + n + '" class="text-sm font-normal"></span>' +
                            '<span data-copy-icon="true" class="hidden">' +
                              '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="size-4 shrink-0 text-gray-400 dark:text-gray-500"><path d="M7 3.5A1.5 1.5 0 0 1 8.5 2h3.879a1.5 1.5 0 0 1 1.06.44l3.122 3.12A1.5 1.5 0 0 1 17 6.622V12.5a1.5 1.5 0 0 1-1.5 1.5h-1v-3.379a3 3 0 0 0-.879-2.121L10.5 5.379A3 3 0 0 0 8.379 4.5H7v-1Z"/><path d="M4.5 6A1.5 1.5 0 0 0 3 7.5v9A1.5 1.5 0 0 0 4.5 18h7a1.5 1.5 0 0 0 1.5-1.5v-5.879a1.5 1.5 0 0 0-.44-1.06L9.44 6.439A1.5 1.5 0 0 0 8.378 6H4.5Z"/></svg>' +
                            '</span>' +
                          '</button>' +
                        '</div>' +
                        '<div class="grid grid-cols-2 gap-4 self-stretch">' +
                          '<span class="text-sm font-medium text-gray-900 dark:text-gray-100">Expires</span>' +
                          '<button type="button" id="gp-card-expiry-copy-btn-' + n + '" data-copy-enabled="false" class="copy-btn -ml-1 inline-flex w-fit items-center gap-1.5 rounded-md px-1.5 py-0.5 text-gray-700 dark:text-gray-300 pointer-events-none">' +
                            '<span id="gp-card-expiry-' + n + '" class="text-sm font-normal"></span>' +
                            '<span data-copy-icon="true" class="hidden">' +
                              '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="size-4 shrink-0 text-gray-400 dark:text-gray-500"><path d="M7 3.5A1.5 1.5 0 0 1 8.5 2h3.879a1.5 1.5 0 0 1 1.06.44l3.122 3.12A1.5 1.5 0 0 1 17 6.622V12.5a1.5 1.5 0 0 1-1.5 1.5h-1v-3.379a3 3 0 0 0-.879-2.121L10.5 5.379A3 3 0 0 0 8.379 4.5H7v-1Z"/><path d="M4.5 6A1.5 1.5 0 0 0 3 7.5v9A1.5 1.5 0 0 0 4.5 18h7a1.5 1.5 0 0 0 1.5-1.5v-5.879a1.5 1.5 0 0 0-.44-1.06L9.44 6.439A1.5 1.5 0 0 0 8.378 6H4.5Z"/></svg>' +
                            '</span>' +
                          '</button>' +
                        '</div>' +
                        '<div class="grid grid-cols-2 gap-4 self-stretch">' +
                          '<span class="text-sm font-medium text-gray-900 dark:text-gray-100">CVC2</span>' +
                          '<button type="button" id="gp-card-cvc-copy-btn-' + n + '" data-copy-enabled="false" class="copy-btn -ml-1 inline-flex w-fit items-center gap-1.5 rounded-md px-1.5 py-0.5 text-gray-700 dark:text-gray-300 pointer-events-none">' +
                            '<span id="gp-card-cvc-' + n + '" class="text-sm font-normal"></span>' +
                            '<span data-copy-icon="true" class="hidden">' +
                              '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="size-4 shrink-0 text-gray-400 dark:text-gray-500"><path d="M7 3.5A1.5 1.5 0 0 1 8.5 2h3.879a1.5 1.5 0 0 1 1.06.44l3.122 3.12A1.5 1.5 0 0 1 17 6.622V12.5a1.5 1.5 0 0 1-1.5 1.5h-1v-3.379a3 3 0 0 0-.879-2.121L10.5 5.379A3 3 0 0 0 8.379 4.5H7v-1Z"/><path d="M4.5 6A1.5 1.5 0 0 0 3 7.5v9A1.5 1.5 0 0 0 4.5 18h7a1.5 1.5 0 0 0 1.5-1.5v-5.879a1.5 1.5 0 0 0-.44-1.06L9.44 6.439A1.5 1.5 0 0 0 8.378 6H4.5Z"/></svg>' +
                            '</span>' +
                          '</button>' +
                        '</div>' +
                        '<div class="grid grid-cols-2 gap-4 self-stretch items-start">' +
                          '<span class="text-sm font-medium text-gray-900 dark:text-gray-100">Cardholder Address</span>' +
                          '<span id="gp-card-address-' + n + '" class="whitespace-pre-line text-sm font-normal text-gray-700 dark:text-gray-300"></span>' +
                        '</div>' +
                        '<div class="grid grid-cols-2 gap-4 self-stretch items-start">' +
                          '<span></span>' +
                          '<div class="-ml-2.5">' +
                            '<button type="button" id="gp-card-reveal-btn-' + n + '" data-revealed="false" class="inline-flex w-fit self-start items-center gap-2 rounded-md px-2.5 py-1.5 text-sm font-semibold text-blue-600 hover:bg-blue-600/10 dark:bg-blue-600/10 dark:text-blue-400 dark:hover:bg-blue-600/20 cursor-pointer">' +
                              '<svg data-icon="reveal" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="size-3.5"><path d="M8 9.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z"/><path fill-rule="evenodd" d="M1.3794 8.28049C1.31616 8.09687 1.31625 7.89727 1.37965 7.71371C2.32719 4.97038 4.93238 3 7.99777 3C11.0653 3 13.672 4.97316 14.6179 7.71951C14.6811 7.90313 14.681 8.10274 14.6176 8.2863C13.6701 11.0296 11.0649 13 7.99952 13C4.93197 13 2.32527 11.0268 1.3794 8.28049ZM11 8a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" clip-rule="evenodd"/></svg>' +
                              '<svg data-icon="hide" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="size-3.5 hidden"><path fill-rule="evenodd" clip-rule="evenodd" d="M3.28033 2.21967C2.98744 1.92678 2.51256 1.92678 2.21967 2.21967C1.92678 2.51256 1.92678 2.98744 2.21967 3.28033L12.7197 13.7803C13.0126 14.0732 13.4874 14.0732 13.7803 13.7803C14.0732 13.4874 14.0732 13.0126 13.7803 12.7197L12.4577 11.397C13.438 10.5863 14.1937 9.51366 14.6176 8.2863C14.681 8.10274 14.6811 7.90313 14.6179 7.71951C13.672 4.97316 11.0653 3 7.99777 3C6.85414 3 5.77457 3.27425 4.82123 3.76057L3.28033 2.21967Z"/><path d="M6.47602 5.41536L7.61147 6.55081C7.73539 6.51767 7.86563 6.5 8 6.5C8.82843 6.5 9.5 7.17157 9.5 8C9.5 8.13437 9.48233 8.26461 9.44919 8.38853L10.5846 9.52398C10.8486 9.07734 11 8.55636 11 8C11 6.34315 9.65685 5 8 5C7.44364 5 6.92266 5.15145 6.47602 5.41536Z"/><path d="M7.81206 10.9942L9.62754 12.8097C9.10513 12.9341 8.56002 13 7.99952 13C4.93197 13 2.32527 11.0268 1.3794 8.28049C1.31616 8.09687 1.31625 7.89727 1.37965 7.71371C1.63675 6.96935 2.01588 6.28191 2.49314 5.67529L5.00579 8.18794C5.09895 9.69509 6.30491 10.901 7.81206 10.9942Z"/></svg>' +
                              '<span id="gp-card-reveal-text-' + n + '">Reveal Details</span>' +
                            '</button>' +
                          '</div>' +
                        '</div>' +
                      '</div>' +
                    '</div>';

                anchor.parentNode.insertBefore(panel, anchor);
                return panel;
            }

            function resetCardReveal(n) {
                var btn = document.getElementById('gp-card-reveal-btn-' + n);
                if (!btn) return;
                btn.setAttribute('data-revealed', 'false');
                var revealIcon = btn.querySelector('[data-icon="reveal"]');
                var hideIcon = btn.querySelector('[data-icon="hide"]');
                var text = document.getElementById('gp-card-reveal-text-' + n);
                if (revealIcon) revealIcon.classList.remove('hidden');
                if (hideIcon) hideIcon.classList.add('hidden');
                if (text) text.textContent = 'Reveal Details';
                var copyMap = cardCopyMapBySlot[n];
                if (copyMap) {
                    setCopyVisible(copyMap.numberBtn, false);
                    setCopyVisible(copyMap.expiryBtn, false);
                    setCopyVisible(copyMap.cvcBtn, false);
                }
            }

            function initCardRevealBtn(n) {
                var btn = document.getElementById('gp-card-reveal-btn-' + n);
                var numberValueEl = document.getElementById('gp-card-number-' + n);
                var expiryValueEl = document.getElementById('gp-card-expiry-' + n);
                var cvcValueEl = document.getElementById('gp-card-cvc-' + n);
                var numberBtn = document.getElementById('gp-card-number-copy-btn-' + n);
                var expiryBtn = document.getElementById('gp-card-expiry-copy-btn-' + n);
                var cvcBtn = document.getElementById('gp-card-cvc-copy-btn-' + n);
                if (!btn || !numberValueEl || !expiryValueEl || !cvcValueEl) return;

                bindCopy(numberBtn, numberValueEl);
                bindCopy(expiryBtn, expiryValueEl);
                bindCopy(cvcBtn, cvcValueEl);
                cardCopyMapBySlot[n] = { numberBtn: numberBtn, expiryBtn: expiryBtn, cvcBtn: cvcBtn };

                resetCardReveal(n);
                btn.onclick = function () {
                    var revealed = btn.getAttribute('data-revealed') === 'true';
                    revealed = !revealed;
                    btn.setAttribute('data-revealed', String(revealed));
                    numberValueEl.textContent = revealed
                        ? (numberValueEl.getAttribute('data-revealed') || numberValueEl.getAttribute('data-masked') || '')
                        : (numberValueEl.getAttribute('data-masked') || '');
                    expiryValueEl.textContent = revealed
                        ? (expiryValueEl.getAttribute('data-revealed') || expiryValueEl.getAttribute('data-masked') || '')
                        : (expiryValueEl.getAttribute('data-masked') || '');
                    cvcValueEl.textContent = revealed
                        ? (cvcValueEl.getAttribute('data-revealed') || cvcValueEl.getAttribute('data-masked') || '')
                        : (cvcValueEl.getAttribute('data-masked') || '');
                    var revealIcon = btn.querySelector('[data-icon="reveal"]');
                    var hideIcon = btn.querySelector('[data-icon="hide"]');
                    var text = document.getElementById('gp-card-reveal-text-' + n);
                    if (revealIcon) revealIcon.classList.toggle('hidden', revealed);
                    if (hideIcon) hideIcon.classList.toggle('hidden', !revealed);
                    if (text) text.textContent = revealed ? 'Hide Details' : 'Reveal Details';
                    setCopyVisible(numberBtn, revealed);
                    setCopyVisible(expiryBtn, revealed);
                    setCopyVisible(cvcBtn, revealed);
                };
            }

            function showPayersCard(n) {
                var panel = ensureCardPanel(n);
                if (!panel) return;
                panel.classList.remove('hidden');

                getPrimaryCard().then(function (card) {
                    var holderName = card && card.holderName ? String(card.holderName) : '—';
                    var fullDigits = getDigits(card && card.fullNumber);
                    var last4 = fullDigits.slice(-4) || getDigits(card && card.last4).slice(-4) || '0000';
                    var maskedNumber = '•••• ' + last4;
                    var fullNumber = fullDigits ? formatCardNumber(fullDigits) : maskedNumber;
                    var expiry = card && card.expirationFull ? String(card.expirationFull) : (card && card.expiration ? String(card.expiration) : '—');
                    var cvc = card && card.cvc2 ? String(card.cvc2) : '—';
                    var address = card && card.billingAddress ? String(card.billingAddress) : '—';

                    setText('gp-card-name-' + n, holderName);
                    setText('gp-card-address-' + n, address);

                    var numberValueEl = document.getElementById('gp-card-number-' + n);
                    var expiryValueEl = document.getElementById('gp-card-expiry-' + n);
                    var cvcValueEl = document.getElementById('gp-card-cvc-' + n);
                    if (numberValueEl) {
                        numberValueEl.setAttribute('data-masked', maskedNumber);
                        numberValueEl.setAttribute('data-revealed', fullNumber);
                        numberValueEl.textContent = maskedNumber;
                    }
                    if (expiryValueEl) {
                        expiryValueEl.setAttribute('data-masked', expiry);
                        expiryValueEl.setAttribute('data-revealed', expiry);
                        expiryValueEl.textContent = expiry;
                    }
                    if (cvcValueEl) {
                        cvcValueEl.setAttribute('data-masked', '•••');
                        cvcValueEl.setAttribute('data-revealed', cvc);
                        cvcValueEl.textContent = '•••';
                    }

                    initCardRevealBtn(n);
                }).catch(function () {
                    setText('gp-card-name-' + n, '—');
                    setText('gp-card-address-' + n, '—');
                    setText('gp-card-number-' + n, '—');
                    setText('gp-card-expiry-' + n, '—');
                    setText('gp-card-cvc-' + n, '—');
                    initCardRevealBtn(n);
                });
            }

            function initRevealBtn(n, acct) {
                var btn = document.getElementById('gp-bank-reveal-btn-' + n);
                if (!btn) return;
                btn.setAttribute('data-revealed', 'false');
                var revealIcon = btn.querySelector('[data-icon="reveal"]');
                var hideIcon   = btn.querySelector('[data-icon="hide"]');
                var revealText = document.getElementById('gp-bank-reveal-text-' + n);
                var maskedAccount = firstNonEmpty(acct && acct.maskedAccount, acct && acct.maskedAccountNumber, acct && acct.accountMasked);
                var maskedRouting = firstNonEmpty(acct && acct.maskedRouting, acct && acct.routingMasked);
                var revealedAccount = firstNonEmpty(acct && acct.accountNumber, acct && acct.fullAccountNumber, maskedAccount, (acct && acct.last4 ? ('••••' + acct.last4) : ''));
                var revealedRouting = firstNonEmpty(acct && acct.routingNumber, acct && acct.routing, maskedRouting);
                if (!maskedAccount && revealedAccount) maskedAccount = '••••' + getDigits(revealedAccount).slice(-4);
                if (!maskedRouting && revealedRouting) maskedRouting = maskRouting(getDigits(revealedRouting));
                if (!maskedAccount && acct && acct.last4) maskedAccount = '••••' + acct.last4;
                if (revealIcon) revealIcon.classList.remove('hidden');
                if (hideIcon)   hideIcon.classList.add('hidden');
                if (revealText) revealText.textContent = 'Reveal Details';
                setText('gp-bank-acct-' + n, maskedAccount || '—');
                setText('gp-bank-routing-' + n, maskedRouting || '—');

                btn.onclick = function () {
                    var revealed = btn.getAttribute('data-revealed') === 'true';
                    revealed = !revealed;
                    btn.setAttribute('data-revealed', String(revealed));
                    if (revealed) {
                        setText('gp-bank-acct-' + n, revealedAccount || '—');
                        setText('gp-bank-routing-' + n, revealedRouting || '—');
                        if (revealIcon) revealIcon.classList.add('hidden');
                        if (hideIcon)   hideIcon.classList.remove('hidden');
                        if (revealText) revealText.textContent = 'Hide Details';
                    } else {
                        setText('gp-bank-acct-' + n, maskedAccount || '—');
                        setText('gp-bank-routing-' + n, maskedRouting || '—');
                        if (revealIcon) revealIcon.classList.remove('hidden');
                        if (hideIcon)   hideIcon.classList.add('hidden');
                        if (revealText) revealText.textContent = 'Reveal Details';
                    }
                };
            }

            function showCard(n, opt) {
                var cardCard = document.getElementById('gp-details-card-' + n);
                var bankCard  = document.getElementById('gp-details-bank-'  + n);
                var checkCard = document.getElementById('gp-details-check-' + n);
                if (cardCard) cardCard.classList.add('hidden');
                if (bankCard)  bankCard.classList.add('hidden');
                if (checkCard) checkCard.classList.add('hidden');
                if (!opt) return;

                var val    = opt.getAttribute('value') || '';
                var isBank = opt.getAttribute('data-gp-bank-option')    === 'true';
                var isChk  = opt.getAttribute('data-gp-address-option') === 'true';
                var isPayersCard = val === 'payers-card';

                if (isPayersCard) {
                    showPayersCard(n);
                } else if (isBank) {
                    var banks = getStored(BANK_KEY);
                    var acct  = null;
                    for (var i = 0; i < banks.length; i++) { if (banks[i].id === val) { acct = banks[i]; break; } }
                    if (!acct || !bankCard) return;
                    function applyBankData(source) {
                        var merged = Object.assign({}, acct || {}, source || {});
                        var primaryName = firstNonEmpty(merged.name, merged.accountName);
                        var displayName = firstNonEmpty(merged.displayName, merged.bankName ? (merged.bankName + ' Account') : '');
                        setText('gp-bank-name-' + n, primaryName || displayName || '—');
                        initRevealBtn(n, merged);
                        var addrRow = document.getElementById('gp-bank-address-row-' + n);
                        var address = firstNonEmpty(merged.address, merged.bankAddress);
                        if (address) {
                            setText('gp-bank-address-' + n, address);
                            if (addrRow) addrRow.classList.remove('hidden');
                        } else if (addrRow) {
                            addrRow.classList.add('hidden');
                        }
                    }
                    bankCard.classList.remove('hidden');
                    applyBankData(acct);
                    var addrRow = document.getElementById('gp-bank-address-row-' + n);
                    if (typeof window.__ppLoadSharedData === 'function') {
                        window.__ppLoadSharedData().then(function (data) {
                            var fullBanks = data && Array.isArray(data.bankAccounts) ? data.bankAccounts : [];
                            for (var fi = 0; fi < fullBanks.length; fi++) {
                                if (fullBanks[fi].id === val) {
                                    applyBankData(fullBanks[fi]);
                                    break;
                                }
                            }
                        }).catch(function () {});
                    } else if (addrRow) {
                        var fallbackAddress = firstNonEmpty(acct.address, acct.bankAddress);
                        if (!fallbackAddress) addrRow.classList.add('hidden');
                    }
                } else if (isChk) {
                    var addrs = getStored(CHECK_KEY);
                    var addr  = null;
                    for (var j = 0; j < addrs.length; j++) { if (addrs[j].id === val) { addr = addrs[j]; break; } }
                    if (!addr || !checkCard) return;
                    setText('gp-check-name-' + n, addr.displayName);
                    setText('gp-check-addr-' + n, addr.address);
                    checkCard.classList.remove('hidden');
                }
            }

            function initGpSlot(n) {
                var sel = document.getElementById('gp-slot-' + n);
                if (!sel) return;
                var observer = new MutationObserver(function () {
                    var selected = sel.querySelector('el-option[aria-selected="true"]');
                    showCard(n, selected || null);
                });
                observer.observe(sel, { subtree: true, attributes: true, attributeFilter: ['aria-selected'] });
            }

            window.addEventListener('load', function () {
                initGpSlot(1);
                initGpSlot(2);
                initGpSlot(3);
            });
        })();
