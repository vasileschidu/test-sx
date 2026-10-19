/**
 * Per-page configuration, set before this script loads, so the same page
 * serves more than one product. The Consumer Portal uses it:
 *   dataset        its own data file under src/data (banks, addresses, payers)
 *   storagePrefix  its own localStorage prefix instead of 'pp_'
 * With a dataset, nothing is borrowed from the supplier — no shared check
 * addresses, no company profile, and no payers' cards pulled from payments.
 * The Supplier Portal sets nothing and keeps every default.
 */
window.__ppConfig = window.PAYMENT_PREFERENCES_CONFIG || {};
window.__ppStorageKey = function (name) {
  return (window.__ppConfig.storagePrefix || "pp_") + name;
};

(function () {
  var PP_CONFIG = window.__ppConfig;
  var PAYMENT_PREFS_DATA_URL = PP_CONFIG.dataset
    ? "../../data/" + PP_CONFIG.dataset + ".json"
    : "../../data/payment-preferences-data.json";
  var exchangesDataUrl = "../../data/exchanges.json";
  var customersFallbackUrl = "../../data/customers.json";
  var bankAccountsFallbackUrl = "../../data/bank-accounts.json";
  var checkAddressesFallbackUrl = "../../data/check-addresses.json";
  var sharedDataPromise = null;

  function getDigits(value) {
    return String(value || "").replace(/\D/g, "");
  }

  function formatCard16(cardDigits) {
    return String(cardDigits || "")
      .slice(0, 16)
      .replace(/(\d{4})(?=\d)/g, "$1 ")
      .trim();
  }

  function getRevealedCardNumber(paymentInfo, fallbackEnding) {
    var fullDigits = getDigits(paymentInfo && paymentInfo.fullCardNumber);
    if (fullDigits.length >= 16) return formatCard16(fullDigits);

    var baseDigits =
      getDigits(paymentInfo && paymentInfo.cardNumber) ||
      getDigits(fallbackEnding);
    var last4 = baseDigits.slice(-4) || "4242";
    return formatCard16(last4 + last4 + last4 + last4);
  }

  function getRevealedCvc2(paymentInfo) {
    var cvcFull = getDigits(paymentInfo && paymentInfo.cvcFull);
    if (cvcFull.length >= 3) return cvcFull.slice(0, 3);
    var cvc = getDigits(paymentInfo && paymentInfo.cvc);
    if (cvc.length >= 3) return cvc.slice(0, 3);
    return "999";
  }

  function deriveCardBrand(source) {
    var normalized = String(source || "")
      .trim()
      .toLowerCase();
    if (normalized) {
      if (normalized === "master card") return "mastercard";
      if (normalized === "american express") return "amex";
      return normalized;
    }

    var digits = getDigits(source);
    if (!digits) return "card";
    if (digits.charAt(0) === "4") return "visa";
    if (/^(5[1-5]|2(2[2-9]|[3-6]\d|7[01]|720))/.test(digits))
      return "mastercard";
    if (/^(34|37)/.test(digits)) return "amex";
    if (/^(6011|65|64[4-9])/.test(digits)) return "discover";
    return "card";
  }

  function formatCurrency(amount, currency) {
    try {
      return Number(amount).toLocaleString("en-US", {
        style: "currency",
        currency: currency || "USD",
        minimumFractionDigits: 2,
      });
    } catch (error) {
      return "$" + Number(amount || 0).toFixed(2);
    }
  }

  function getMyCompanyCardholderName(profile) {
    return window.getMyCompanyDisplayName
      ? window.getMyCompanyDisplayName(profile)
      : String(
          (profile && profile.legalName) || (profile && profile.name) || "",
        );
  }

  function getMyCompanyCardholderAddress(profile) {
    return window.getMyCompanyAddressText
      ? window.getMyCompanyAddressText(profile)
      : String(
          (profile &&
            profile.mailingAddress &&
            profile.mailingAddress.address) ||
            "",
        );
  }

  function extractCardsFromExchanges(exchangePayload, myCompanyProfile) {
    if (!exchangePayload || !Array.isArray(exchangePayload.entries)) return [];
    var cards = [];
    var myCompanyId = String(
      (myCompanyProfile && myCompanyProfile.id) || "my-business",
    );
    var myCardholderName = getMyCompanyCardholderName(myCompanyProfile);
    var myCardholderAddress = getMyCompanyCardholderAddress(myCompanyProfile);
    exchangePayload.entries.forEach(function (entry, index) {
      if (!entry || entry.paymentMethod !== "Card") return;
      var details =
        entry.details && typeof entry.details === "object"
          ? entry.details
          : null;
      var paymentInfo =
        details &&
        details.paymentInfo &&
        typeof details.paymentInfo === "object"
          ? details.paymentInfo
          : null;
      if (!paymentInfo || paymentInfo.type !== "card") return;
      var isMyCard = !entry.payeeId || String(entry.payeeId) === myCompanyId;

      var endingDigits = getDigits(
        paymentInfo.cardNumber || entry.paymentMethodEnding,
      );
      var last4 = endingDigits.slice(-4) || "0000";
      cards.push({
        id: String(entry.invoice || "card-" + (index + 1)),
        ownerId: isMyCard ? myCompanyId : String(entry.payeeId || ""),
        brand: deriveCardBrand(
          paymentInfo.brand ||
            paymentInfo.network ||
            paymentInfo.cardBrand ||
            paymentInfo.cardNumber ||
            entry.paymentMethodEnding ||
            "",
        ),
        vendorName: String(
          entry.customer || paymentInfo.cardholderName || "Customer",
        ),
        holderName: String(
          (isMyCard && myCardholderName) ||
            paymentInfo.cardholderName ||
            entry.customer ||
            "",
        ),
        fullNumber: String(
          getRevealedCardNumber(
            paymentInfo,
            entry.paymentMethodEnding || "",
          ).replace(/\s/g, ""),
        ),
        last4: last4,
        expiration: String(paymentInfo.expires || ""),
        expirationFull: String(paymentInfo.expires || ""),
        cvc2: String(getRevealedCvc2(paymentInfo)),
        pendingAmount: formatCurrency(entry.amount, entry.currency),
        billingAddress: String(
          (isMyCard && myCardholderAddress) ||
            paymentInfo.cardholderAddress ||
            "",
        ),
        status:
          String(entry.status || "").toLowerCase() === "failed"
            ? "inactive"
            : "active",
      });
    });
    return cards;
  }

  window.__ppLoadSharedData = function () {
    if (!sharedDataPromise) {
      sharedDataPromise = fetch(PAYMENT_PREFS_DATA_URL)
        .then(function (res) {
          if (!res.ok) throw new Error("Failed loading shared data");
          return res.json();
        })
        .then(function (payload) {
          payload = payload && typeof payload === "object" ? payload : {};
          if (PP_CONFIG.dataset) {
            // Own data only: addresses and profile come from the file; no cards.
            payload.checkAddresses = Array.isArray(payload.checkAddresses)
              ? payload.checkAddresses
              : [];
            payload.myCompanyProfile = payload.profile || null;
            payload.cards = [];
            return payload;
          }
          return Promise.all([
            fetch(checkAddressesFallbackUrl)
              .then(function (res) {
                return res.ok ? res.json() : [];
              })
              .catch(function () {
                return [];
              }),
            fetch(exchangesDataUrl)
              .then(function (res) {
                return res.ok ? res.json() : null;
              })
              .catch(function () {
                return null;
              }),
            typeof window.getMyCompanyProfile === "function"
              ? window.getMyCompanyProfile().catch(function () {
                  return null;
                })
              : Promise.resolve(null),
          ]).then(function (result) {
            payload.checkAddresses = Array.isArray(result[0]) ? result[0] : [];
            payload.myCompanyProfile = result[2] || null;
            payload.cards = extractCardsFromExchanges(
              result[1],
              payload.myCompanyProfile,
            );
            return payload;
          });
        })
        .catch(function () {
          return Promise.all([
            fetch(customersFallbackUrl)
              .then(function (res) {
                return res.ok ? res.json() : [];
              })
              .catch(function () {
                return [];
              }),
            fetch(bankAccountsFallbackUrl)
              .then(function (res) {
                return res.ok ? res.json() : [];
              })
              .catch(function () {
                return [];
              }),
            fetch(checkAddressesFallbackUrl)
              .then(function (res) {
                return res.ok ? res.json() : [];
              })
              .catch(function () {
                return [];
              }),
            fetch(exchangesDataUrl)
              .then(function (res) {
                return res.ok ? res.json() : null;
              })
              .catch(function () {
                return null;
              }),
            typeof window.getMyCompanyProfile === "function"
              ? window.getMyCompanyProfile().catch(function () {
                  return null;
                })
              : Promise.resolve(null),
          ]).then(function (result) {
            return {
              customers: Array.isArray(result[0]) ? result[0] : [],
              bankAccounts: Array.isArray(result[1]) ? result[1] : [],
              checkAddresses: Array.isArray(result[2]) ? result[2] : [],
              myCompanyProfile: result[4] || null,
              cards: extractCardsFromExchanges(result[3], result[4] || null),
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
    var disableSaveWhenClean = !!config.disableSaveWhenClean;
    var isDirty = false;

    function setDirty(nextDirty) {
      isDirty = !!nextDirty;
      if (undoBtn) undoBtn.disabled = !isDirty;
      if (saveBtn && disableSaveWhenClean) saveBtn.disabled = !isDirty;
    }

    if (undoBtn) {
      undoBtn.addEventListener("click", function () {
        if (typeof config.onUndo === "function") config.onUndo(setDirty);
      });
    }

    if (saveBtn) {
      saveBtn.addEventListener("click", function () {
        if (typeof config.onSave === "function") config.onSave(setDirty);
        else setDirty(false);
      });
    }

    setDirty(false);
    return {
      setDirty: setDirty,
      isDirty: function () {
        return isDirty;
      },
    };
  };
})();

(function () {
  var cardsListEl = document.getElementById("pp-payer-cards-list");
  var cardsToggleBtn = document.getElementById("pp-payer-cards-toggle");
  var cardsToggleLabel = document.getElementById("pp-payer-cards-toggle-label");
  var cardsToggleIcon = document.getElementById("pp-payer-cards-toggle-icon");
  var cardsSearchInput = document.getElementById("pp-cards-search-input");
  var cardsActiveOnlyInput = document.getElementById("pp-cards-active-only");
  var cardsFilterBtn = document.getElementById("pp-cards-filter-btn");
  var cardsFilterDropdown = document.getElementById("pp-cards-filter-dropdown");
  var cardsFilterMenu = document.getElementById("pp-cards-filter-menu");
  var cardsFilterBackdrop = document.getElementById("pp-cards-filter-backdrop");
  var filterTrack = document.getElementById("pp-cards-filter-track");
  var filterRootPanel = document.getElementById("pp-cards-filter-panel-root");
  var filterDetailSlot = document.getElementById("pp-cards-filter-detail-slot");
  var filterCustomerPanel = document.getElementById(
    "pp-cards-filter-panel-customer",
  );
  var filterStatusPanel = document.getElementById(
    "pp-cards-filter-panel-status",
  );
  var filterCustomersWrap = document.getElementById(
    "pp-cards-filter-customers",
  );
  var filterStatusesWrap = document.getElementById("pp-cards-filter-statuses");
  var filterApplyBtn = document.getElementById("pp-cards-filter-apply-btn");
  var filterApplyStatusBtn = document.getElementById(
    "pp-cards-filter-apply-status-btn",
  );
  var activeFiltersWrap = document.getElementById("pp-cards-active-filters");
  var cardDetailsDialog = document.getElementById("pp-card-details-dialog");
  var vcAmountEl = document.getElementById("pp-vc-amount");
  var vcCardNumberEl = document.getElementById("pp-vc-card-number");
  var vcExpiryEl = document.getElementById("pp-vc-expiry");
  var vcNameEl = document.getElementById("pp-vc-name");
  var vcPendingAmountEl = document.getElementById("pp-vc-pending-amount");
  var vcHolderNameEl = document.getElementById("pp-vc-holder-name");
  var vcCardAddressEl = document.getElementById("pp-vc-card-address");
  var vcFullNumberEl = document.getElementById("pp-vc-full-number");
  var vcFullExpiryEl = document.getElementById("pp-vc-full-expiry");
  var vcCvc2El = document.getElementById("pp-vc-cvc2");
  if (!cardsListEl || !cardsToggleBtn || !cardsToggleLabel || !cardsToggleIcon)
    return;

  var INITIAL_VISIBLE = 6;
  var allCards = [];
  var filteredCards = [];
  var isExpanded = false;
  var searchTerm = "";
  var selectedCustomers = new Set();
  var selectedStatuses = new Set();
  var isFilterMenuOpen = false;
  var activeFilterPanel = "root";
  var cardsById = new Map();
  var STATUS_LABELS = { active: "Active", inactive: "Inactive" };

  function getMyCompanyCardholderName(profile) {
    return window.getMyCompanyDisplayName
      ? window.getMyCompanyDisplayName(profile)
      : String(
          (profile && profile.legalName) || (profile && profile.name) || "",
        );
  }

  function getMyCompanyCardholderAddress(profile) {
    return window.getMyCompanyAddressText
      ? window.getMyCompanyAddressText(profile)
      : String(
          (profile &&
            profile.mailingAddress &&
            profile.mailingAddress.address) ||
            "",
        );
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function buildCardActionMenu(card) {
    return (
      "" +
      '<el-dropdown class="shrink-0 inline-block">' +
      '  <button type="button" class="rounded p-[5px] text-gray-500 hover:bg-gray-200 hover:text-gray-600 transition-colors dark:text-gray-400 dark:hover:bg-white/10 dark:hover:text-gray-300 cursor-pointer">' +
      '    <span class="sr-only">Open card actions</span>' +
      '    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="size-[18px]">' +
      '      <path d="M10 3a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3ZM10 8.5a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3ZM11.5 15.5a1.5 1.5 0 1 0-3 0 1.5 1.5 0 0 0 3 0Z" />' +
      "    </svg>" +
      "  </button>" +
      '  <el-menu anchor="bottom end" popover class="min-w-56 origin-top-right rounded-md bg-white shadow-lg outline-1 outline-black/5 transition transition-discrete [--anchor-gap:--spacing(2)] data-closed:scale-95 data-closed:transform data-closed:opacity-0 data-enter:duration-100 data-enter:ease-out data-leave:duration-75 data-leave:ease-in dark:bg-gray-800 dark:shadow-none dark:-outline-offset-1 dark:outline-white/10">' +
      '    <div class="py-1">' +
      '      <button type="button" data-view-card-details="' +
      escapeHtml(card.id) +
      '" class="flex w-full items-center gap-3 px-3 py-2 text-left text-sm font-medium text-gray-700 hover:bg-gray-100 focus:bg-gray-100 focus:text-gray-900 focus:outline-hidden dark:text-gray-300 dark:hover:bg-white/5 dark:focus:bg-white/5 dark:focus:text-white cursor-pointer">' +
      "        <span>View card details</span>" +
      "      </button>" +
      '      <button type="button" data-view-card-payables="' +
      escapeHtml(card.id) +
      '" class="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm font-medium text-gray-700 hover:bg-gray-100 focus:bg-gray-100 focus:text-gray-900 focus:outline-hidden dark:text-gray-300 dark:hover:bg-white/5 dark:focus:bg-white/5 dark:focus:text-white cursor-pointer">' +
      "        <span>View associated payable(s)</span>" +
      '        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="size-4 text-gray-500 dark:text-gray-400"><path fill-rule="evenodd" d="M8.22 5.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 1 1-1.06-1.06L11.94 10 8.22 6.28a.75.75 0 0 1 0-1.06Z" clip-rule="evenodd" /></svg>' +
      "      </button>" +
      "    </div>" +
      "  </el-menu>" +
      "</el-dropdown>"
    );
  }

  function createCardRow(card) {
    if (
      !window.PPComponents ||
      typeof window.PPComponents.createCardAccountRow !== "function"
    ) {
      return null;
    }

    return window.PPComponents.createCardAccountRow(card, {
      actionsHtml: buildCardActionMenu(card),
      afterRender: function (row) {
        if (!card || card.status !== "inactive") return;
        row.classList.add("opacity-40");
      },
    });
  }

  function buildFilterCheckbox(id, text, countText, value, checked) {
    return window.TableUi.filterCheckbox({
      id: id,
      label: text,
      countText: countText,
      value: value,
      checked: checked,
    });
  }

  function normalizeCards(payload) {
    if (!payload || !Array.isArray(payload.cards)) return [];
    var myCompanyProfile = payload.myCompanyProfile || null;
    var myCompanyId = String(
      (myCompanyProfile && myCompanyProfile.id) || "my-business",
    );
    var myCardholderName = getMyCompanyCardholderName(myCompanyProfile);
    var myCardholderAddress = getMyCompanyCardholderAddress(myCompanyProfile);
    return payload.cards
      .map(function (card, index) {
        if (!card || typeof card !== "object") return null;
        var fullNumberDigits = String(card.fullNumber || "").replace(/\D/g, "");
        var last4 = String(card.last4 || fullNumberDigits.slice(-4) || "");
        var ownerId = String(card.ownerId || "");
        var isMyCard = !!ownerId && ownerId === myCompanyId;
        return {
          id: String(card.id || "card-" + (index + 1)),
          ownerId: ownerId,
          brand: deriveCardBrand(
            card.brand ||
              card.network ||
              card.type ||
              card.fullNumber ||
              card.last4,
          ),
          vendorName: String(card.vendorName || card.holderName || "Customer"),
          holderName: String(
            (isMyCard && myCardholderName) ||
              card.holderName ||
              card.vendorName ||
              "Customer",
          ),
          fullNumber:
            fullNumberDigits || ("424242424242" + (last4 || "4242")).slice(-16),
          last4: last4 || "0000",
          expiration: String(card.expiration || ""),
          expirationFull: String(card.expirationFull || card.expiration || ""),
          cvc2: String(card.cvc2 || "999"),
          pendingAmount: String(card.pendingAmount || "$0.00"),
          billingAddress: String(
            (isMyCard && myCardholderAddress) || card.billingAddress || "",
          ),
          status:
            String(card.status || "active").toLowerCase() === "inactive"
              ? "inactive"
              : "active",
        };
      })
      .filter(function (card) {
        return !!card;
      });
  }

  function normalizeCustomerNames(payload) {
    if (!payload || !Array.isArray(payload.customers)) return [];
    return payload.customers
      .map(function (customer) {
        return customer && typeof customer.name === "string"
          ? customer.name.trim()
          : "";
      })
      .filter(function (name) {
        return !!name;
      });
  }

  function generateFallbackCards(customerNames, myCompanyProfile) {
    var names = customerNames.length ? customerNames : ["Customer"];
    var total = 12;
    var cards = [];
    var myCompanyId = String(
      (myCompanyProfile && myCompanyProfile.id) || "my-business",
    );
    var myCardholderName =
      getMyCompanyCardholderName(myCompanyProfile) || names[0];
    var myCardholderAddress =
      getMyCompanyCardholderAddress(myCompanyProfile) ||
      "3476 Orphan Road\nSuite 1010\nHayward, Wisconsin 54843\nUnited States";
    for (var i = 0; i < total; i++) {
      var month = String((i % 12) + 1).padStart(2, "0");
      var year = String(2026 + Math.floor(i / 8));
      var fullNumber =
        "4" +
        String(100000000000000 + ((i * 98765431 + 1234567) % 900000000000000));
      cards.push({
        id: "fallback-card-" + (i + 1),
        ownerId: myCompanyId,
        brand: i % 2 === 0 ? "visa" : "mastercard",
        vendorName: names[i % names.length],
        holderName: myCardholderName,
        fullNumber: fullNumber,
        last4: fullNumber.slice(-4),
        expiration: month + "/" + year,
        expirationFull: month + "/" + year,
        cvc2: String(100 + ((i * 37 + 19) % 900)),
        pendingAmount:
          "$" +
          (125 + i * 37).toLocaleString("en-US", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          }),
        billingAddress: myCardholderAddress,
        status: i % 5 === 0 || i % 9 === 0 ? "inactive" : "active",
      });
    }
    return cards;
  }

  function formatCardNumber(number) {
    return String(number || "")
      .replace(/\D/g, "")
      .replace(/(\d{4})(?=\d)/g, "$1 ")
      .trim();
  }

  function populateCardDetailsModal(card) {
    if (!card) return;
    if (vcAmountEl) vcAmountEl.textContent = card.pendingAmount || "$0.00";
    if (vcCardNumberEl)
      vcCardNumberEl.textContent = formatCardNumber(card.fullNumber);
    if (vcExpiryEl) vcExpiryEl.textContent = card.expiration || "";
    if (vcNameEl) vcNameEl.textContent = (card.holderName || "").toUpperCase();
    if (vcPendingAmountEl)
      vcPendingAmountEl.textContent = card.pendingAmount || "$0.00";
    if (vcHolderNameEl) vcHolderNameEl.textContent = card.holderName || "";
    if (vcCardAddressEl)
      vcCardAddressEl.textContent = card.billingAddress || "";
    if (vcFullNumberEl)
      vcFullNumberEl.textContent = formatCardNumber(card.fullNumber);
    if (vcFullExpiryEl) vcFullExpiryEl.textContent = card.expirationFull || "";
    if (vcCvc2El) vcCvc2El.textContent = card.cvc2 || "";
  }

  function initCardModalCopy() {
    var map = [
      {
        valueId: "pp-vc-full-number",
        selector: '[data-copy-id="pp-vc-full-number"]',
      },
      {
        valueId: "pp-vc-full-expiry",
        selector: '[data-copy-id="pp-vc-full-expiry"]',
      },
      { valueId: "pp-vc-cvc2", selector: '[data-copy-id="pp-vc-cvc2"]' },
    ];
    map.forEach(function (item) {
      var valueEl = document.getElementById(item.valueId);
      var btn = document.querySelector(item.selector);
      if (!valueEl || !btn) return;
      btn.addEventListener("click", function (event) {
        event.preventDefault();
        event.stopPropagation();
        var text = String(valueEl.textContent || "").trim();
        if (!text) return;
        if (window.copyTextWithFeedback) window.copyTextWithFeedback(text, btn);
      });
    });
  }

  function getCustomerCounts() {
    var counts = new Map();
    allCards.forEach(function (card) {
      var name = card.vendorName || "Customer";
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
          "pp-filter-customer-" + idx,
          entry[0],
          String(entry[1]),
          entry[0],
          selectedCustomers.has(entry[0]),
        );
      })
      .join("");
  }

  function renderStatusFilters() {
    if (!filterStatusesWrap) return;
    var activeCount = allCards.filter(function (card) {
      return card.status === "active";
    }).length;
    var inactiveCount = allCards.filter(function (card) {
      return card.status === "inactive";
    }).length;
    var rows = [
      { key: "active", label: "Active", count: activeCount },
      { key: "inactive", label: "Inactive", count: inactiveCount },
    ];
    filterStatusesWrap.innerHTML = rows
      .map(function (row, idx) {
        return buildFilterCheckbox(
          "pp-filter-status-" + idx,
          row.label,
          String(row.count),
          row.key,
          selectedStatuses.has(row.key),
        );
      })
      .join("");
  }

  function applyFilters() {
    var term = searchTerm.trim().toLowerCase();
    filteredCards = allCards.filter(function (card) {
      var matchesTerm =
        !term || (card.vendorName || "").toLowerCase().indexOf(term) !== -1;
      if (!matchesTerm) return false;

      var matchesCustomer =
        selectedCustomers.size === 0 || selectedCustomers.has(card.vendorName);
      if (!matchesCustomer) return false;

      if (cardsActiveOnlyInput && cardsActiveOnlyInput.checked) {
        return card.status === "active";
      }
      return selectedStatuses.size === 0 || selectedStatuses.has(card.status);
    });
  }

  function syncApplyButtonState() {
    if (filterApplyBtn) filterApplyBtn.disabled = selectedCustomers.size === 0;
    if (filterApplyStatusBtn)
      filterApplyStatusBtn.disabled = selectedStatuses.size === 0;
  }

  function renderActiveFilterTags() {
    if (!activeFiltersWrap) return;
    var tags = [];

    var customerValues = Array.from(selectedCustomers)
      .filter(function (customer) {
        return customer && customer.trim();
      })
      .sort(function (a, b) {
        return a.localeCompare(b);
      });
    if (customerValues.length) {
      tags.push({
        type: "customer",
        label: "Customer",
        value: customerValues.join(", "),
      });
    }

    var statusValues = Array.from(selectedStatuses)
      .filter(function (status) {
        return status && status.trim();
      })
      .sort(function (a, b) {
        return a.localeCompare(b);
      });
    if (statusValues.length) {
      tags.push({
        type: "status",
        label: "Status",
        value: statusValues
          .map(function (status) {
            return STATUS_LABELS[status] || status;
          })
          .join(", "),
      });
    }

    if (!tags.length) {
      activeFiltersWrap.innerHTML = "";
      activeFiltersWrap.classList.add("hidden");
      return;
    }

    activeFiltersWrap.classList.remove("hidden");
    activeFiltersWrap.innerHTML = tags
      .map(function (tag) {
        return window.TableUi.filterChip({
          label: tag.label,
          type: tag.type,
          value: tag.value,
        });
      })
      .join("");
  }

  function setDetailPanelVisibility(panel) {
    if (!filterCustomerPanel || !filterStatusPanel) return;
    filterCustomerPanel.classList.add("hidden");
    filterCustomerPanel.classList.remove("flex");
    filterStatusPanel.classList.add("hidden");
    filterStatusPanel.classList.remove("flex");
    if (panel === "customer") {
      filterCustomerPanel.classList.remove("hidden");
      filterCustomerPanel.classList.add("flex");
    } else if (panel === "status") {
      filterStatusPanel.classList.remove("hidden");
      filterStatusPanel.classList.add("flex");
    }
  }

  function setFilterPanel(panel, immediate) {
    if (!filterTrack || !cardsFilterMenu) return;
    activeFilterPanel = panel;
    var targetPanel = filterRootPanel;
    if (panel === "customer" || panel === "status") {
      setDetailPanelVisibility(panel);
      if (filterDetailSlot) targetPanel = filterDetailSlot;
    } else {
      setDetailPanelVisibility("root");
    }
    var offset = targetPanel ? targetPanel.offsetLeft : 0;
    var width = targetPanel ? targetPanel.offsetWidth : 0;
    var height = targetPanel ? targetPanel.offsetHeight : 0;
    var isMobileView = window.matchMedia("(max-width: 639px)").matches;
    if (isMobileView) {
      filterTrack.style.transform = "translateX(" + -offset + "px)";
      cardsFilterMenu.style.width = "100vw";
      if (height > 0) cardsFilterMenu.style.height = height + "px";
      return;
    }
    if (immediate) {
      filterTrack.style.transform = "translateX(" + -offset + "px)";
      if (width > 0) {
        cardsFilterMenu.style.width = width + "px";
      }
      if (height > 0) cardsFilterMenu.style.height = height + "px";
      return;
    }
    var currentRect = cardsFilterMenu.getBoundingClientRect();
    if (!isMobileView && currentRect.width > 0)
      cardsFilterMenu.style.width = currentRect.width + "px";
    if (currentRect.height > 0)
      cardsFilterMenu.style.height = currentRect.height + "px";
    requestAnimationFrame(function () {
      filterTrack.style.transform = "translateX(" + -offset + "px)";
      if (isMobileView) {
        cardsFilterMenu.style.width = "100vw";
      } else if (width > 0) {
        cardsFilterMenu.style.width = width + "px";
      }
      if (height > 0) cardsFilterMenu.style.height = height + "px";
    });
  }

  function applyFilterMenuLayout() {
    if (!cardsFilterMenu) return;
    var isMobileView = window.matchMedia("(max-width: 639px)").matches;

    if (isMobileView) {
      cardsFilterMenu.style.position = "fixed";
      cardsFilterMenu.style.left = "0";
      cardsFilterMenu.style.right = "0";
      cardsFilterMenu.style.bottom = "0";
      cardsFilterMenu.style.top = "auto";
      cardsFilterMenu.style.marginTop = "0";
      cardsFilterMenu.style.zIndex = "50";
      cardsFilterMenu.style.borderBottomLeftRadius = "0";
      cardsFilterMenu.style.borderBottomRightRadius = "0";
      cardsFilterMenu.style.width = "100vw";
      filterTrack.classList.remove(
        "transition-transform",
        "duration-250",
        "ease-[cubic-bezier(0.22,1,0.36,1)]",
      );
      cardsFilterMenu.classList.remove("origin-top-right");
      cardsFilterMenu.classList.add("origin-bottom");
      if (filterRootPanel) {
        filterRootPanel.style.width = "100vw";
        filterRootPanel.style.minWidth = "0";
      }
      if (filterDetailSlot) filterDetailSlot.style.width = "100vw";
      if (filterCustomerPanel) filterCustomerPanel.style.width = "100vw";
      if (filterStatusPanel) filterStatusPanel.style.width = "100vw";
    } else {
      cardsFilterMenu.style.position = "";
      cardsFilterMenu.style.left = "";
      cardsFilterMenu.style.right = "";
      cardsFilterMenu.style.bottom = "";
      cardsFilterMenu.style.top = "";
      cardsFilterMenu.style.marginTop = "";
      cardsFilterMenu.style.zIndex = "";
      cardsFilterMenu.style.borderBottomLeftRadius = "";
      cardsFilterMenu.style.borderBottomRightRadius = "";
      cardsFilterMenu.style.width = "";
      filterTrack.classList.add(
        "transition-transform",
        "duration-250",
        "ease-[cubic-bezier(0.22,1,0.36,1)]",
      );
      cardsFilterMenu.classList.remove("origin-bottom");
      cardsFilterMenu.classList.add("origin-top-right");
      if (filterRootPanel) {
        filterRootPanel.style.width = "";
        filterRootPanel.style.minWidth = "";
      }
      if (filterDetailSlot) filterDetailSlot.style.width = "";
      if (filterCustomerPanel) filterCustomerPanel.style.width = "";
      if (filterStatusPanel) filterStatusPanel.style.width = "";
    }
  }

  function setFilterMenuOpen(nextOpen) {
    isFilterMenuOpen = !!nextOpen;
    if (!cardsFilterMenu) return;
    applyFilterMenuLayout();
    if (isFilterMenuOpen) {
      setFilterPanel(activeFilterPanel || "root", true);
      cardsFilterMenu.classList.remove(
        "invisible",
        "opacity-0",
        "pointer-events-none",
      );
      if (
        cardsFilterBackdrop &&
        window.matchMedia("(max-width: 639px)").matches
      ) {
        cardsFilterBackdrop.classList.remove(
          "invisible",
          "opacity-0",
          "pointer-events-none",
        );
      }
    } else {
      cardsFilterMenu.classList.add(
        "invisible",
        "opacity-0",
        "pointer-events-none",
      );
      cardsFilterMenu.style.width = "";
      cardsFilterMenu.style.height = "";
      if (cardsFilterBackdrop) {
        cardsFilterBackdrop.classList.add(
          "invisible",
          "opacity-0",
          "pointer-events-none",
        );
      }
    }
  }

  function renderCards() {
    applyFilters();
    cardsById.clear();
    allCards.forEach(function (card) {
      cardsById.set(card.id, card);
    });
    renderActiveFilterTags();
    var visibleCount = isExpanded
      ? filteredCards.length
      : Math.min(INITIAL_VISIBLE, filteredCards.length);
    cardsListEl.innerHTML = "";
    filteredCards.slice(0, visibleCount).forEach(function (card) {
      var row = createCardRow(card);
      if (row) cardsListEl.appendChild(row);
    });

    var hiddenCount = Math.max(filteredCards.length - INITIAL_VISIBLE, 0);
    if (!isExpanded && hiddenCount > 0) {
      cardsToggleBtn.style.display = "inline-flex";
      cardsToggleLabel.textContent = "Show all (" + filteredCards.length + ")";
      cardsToggleIcon.classList.remove("rotate-180");
    } else if (isExpanded && filteredCards.length > INITIAL_VISIBLE) {
      cardsToggleBtn.style.display = "inline-flex";
      cardsToggleLabel.textContent = "Show less";
      cardsToggleIcon.classList.add("rotate-180");
    } else {
      cardsToggleBtn.style.display = "none";
    }
  }

  cardsToggleBtn.addEventListener("click", function () {
    isExpanded = !isExpanded;
    renderCards();
  });

  cardsListEl.addEventListener("click", function (event) {
    var viewDetailsBtn = event.target.closest("[data-view-card-details]");
    if (viewDetailsBtn) {
      event.preventDefault();
      var cardId = viewDetailsBtn.getAttribute("data-view-card-details");
      var card = cardsById.get(cardId);
      if (!card || !cardDetailsDialog) return;
      populateCardDetailsModal(card);
      cardDetailsDialog.showModal();
      return;
    }
  });

  if (cardsSearchInput) {
    cardsSearchInput.addEventListener("input", function (event) {
      searchTerm = event.target.value || "";
      isExpanded = false;
      renderCards();
    });
  }

  if (cardsActiveOnlyInput) {
    cardsActiveOnlyInput.addEventListener("change", function () {
      isExpanded = false;
      renderCards();
    });
  }

  initCardModalCopy();

  if (cardsFilterBtn) {
    cardsFilterBtn.addEventListener("click", function (event) {
      event.stopPropagation();
      var nextOpen = !isFilterMenuOpen;
      if (nextOpen) activeFilterPanel = "root";
      setFilterMenuOpen(nextOpen);
      syncApplyButtonState();
    });
  }

  if (filterTrack) {
    filterTrack.addEventListener("click", function (event) {
      event.stopPropagation();
      var openBtn = event.target.closest("[data-filter-open]");
      if (openBtn) {
        event.preventDefault();
        setFilterPanel(openBtn.getAttribute("data-filter-open"));
        return;
      }
      if (event.target.closest("[data-filter-back]")) {
        event.preventDefault();
        setFilterPanel("root");
        return;
      }
    });

    filterTrack.addEventListener("change", function (event) {
      var checkbox = event.target.closest(
        'input[type="checkbox"][data-filter-value]',
      );
      if (!checkbox) return;
      var panelEl = checkbox.closest(
        "#pp-cards-filter-customers, #pp-cards-filter-statuses",
      );
      var value = checkbox.getAttribute("data-filter-value");
      if (!panelEl || !value) return;
      if (panelEl.id === "pp-cards-filter-customers") {
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
    filterApplyBtn.addEventListener("click", function (event) {
      event.stopPropagation();
      if (filterApplyBtn.disabled) return;
      setFilterMenuOpen(false);
      setFilterPanel("root");
    });
  }

  if (filterApplyStatusBtn) {
    filterApplyStatusBtn.addEventListener("click", function (event) {
      event.stopPropagation();
      if (filterApplyStatusBtn.disabled) return;
      setFilterMenuOpen(false);
      setFilterPanel("root");
    });
  }

  if (activeFiltersWrap) {
    activeFiltersWrap.addEventListener("click", function (event) {
      var removeBtn = event.target.closest("[data-filter-tag-remove]");
      if (removeBtn) {
        var removeType = removeBtn.getAttribute("data-filter-tag-remove");
        if (removeType === "customer") selectedCustomers.clear();
        else if (removeType === "status") selectedStatuses.clear();
        isExpanded = false;
        renderCustomerFilters();
        renderStatusFilters();
        syncApplyButtonState();
        renderCards();
        return;
      }

      var openBtn = event.target.closest("[data-filter-tag-open]");
      if (!openBtn) return;
      var openType = openBtn.getAttribute("data-filter-tag-open");
      activeFilterPanel = openType === "status" ? "status" : "customer";
      setFilterMenuOpen(true);
      setFilterPanel(activeFilterPanel, true);
    });
  }

  document.addEventListener("click", function (event) {
    if (!cardsFilterDropdown || !isFilterMenuOpen) return;
    if (cardsFilterDropdown.contains(event.target)) return;
    setFilterMenuOpen(false);
    setFilterPanel("root");
  });

  if (cardsFilterBackdrop) {
    cardsFilterBackdrop.addEventListener("click", function () {
      if (!isFilterMenuOpen) return;
      setFilterMenuOpen(false);
      setFilterPanel("root");
    });
  }

  window.addEventListener("resize", function () {
    if (!isFilterMenuOpen) return;
    applyFilterMenuLayout();
    setFilterPanel(activeFilterPanel || "root");
  });

  window
    .__ppLoadSharedData()
    .then(function (payload) {
      allCards = normalizeCards(payload);
      if (!allCards.length) {
        allCards = generateFallbackCards(
          normalizeCustomerNames(payload),
          payload && payload.myCompanyProfile,
        );
      }
      renderCustomerFilters();
      renderStatusFilters();
      syncApplyButtonState();
      renderCards();
    })
    .catch(function () {
      allCards = generateFallbackCards([], null);
      renderCustomerFilters();
      renderStatusFilters();
      syncApplyButtonState();
      renderCards();
    });
})();

(function () {
  var emptyState = document.getElementById("pp-adv-empty-state");
  var tableState = document.getElementById("pp-adv-table-state");
  var customizeBtn = document.getElementById("pp-adv-customize-btn");
  var addPayerBtn = document.getElementById("pp-adv-add-payer-btn");
  var undoBtn = document.getElementById("pp-adv-undo-btn");
  var saveBtn = document.getElementById("pp-adv-save-btn");
  var rowsWrap = document.getElementById("pp-adv-rows");
  if (!emptyState || !tableState || !customizeBtn || !rowsWrap) return;
  var customersCache = [];
  var advFooterEl = saveBtn
    ? saveBtn.closest("[data-pp-adv-footer-on-customize]")
    : null;
  var footerActions = window.__ppInitFooterActions({
    undoBtn: undoBtn,
    saveBtn: saveBtn,
    disableSaveWhenClean: true,
    onUndo: function () {
      window.location.reload();
    },
  });

  // Consumer portal: Cancel / Save show while customizing and stay disabled until a selection is made.
  function syncAdvFooter() {
    if (advFooterEl)
      advFooterEl.classList.toggle(
        "hidden",
        tableState.classList.contains("hidden"),
      );
  }

  function setAdvancedDirty(isDirty) {
    footerActions.setDirty(isDirty);
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function normalizeCustomer(raw, index) {
    if (typeof raw === "string") {
      return { id: "customer-" + index, name: raw.trim() };
    }
    if (!raw || typeof raw !== "object") return null;
    var name = typeof raw.name === "string" ? raw.name.trim() : "";
    if (!name) return null;
    var id =
      typeof raw.id === "string" && raw.id.trim()
        ? raw.id.trim()
        : "customer-" + index;
    var vendorEntries = [];
    if (Array.isArray(raw.vendorEntries)) {
      vendorEntries = raw.vendorEntries
        .map(function (entry) {
          return typeof entry === "string" ? entry.trim() : "";
        })
        .filter(function (entry) {
          return !!entry;
        });
    }
    return { id: id, name: name, vendorEntries: vendorEntries };
  }

  function fetchCustomers() {
    return window
      .__ppLoadSharedData()
      .then(function (payload) {
        payload = payload && typeof payload === "object" ? payload : {};
        var customers = Array.isArray(payload.customers)
          ? payload.customers
          : [];
        if (!Array.isArray(customers)) return [];
        var uniqueByName = new Map();
        customers.forEach(function (item, index) {
          var customer = normalizeCustomer(item, index);
          if (!customer) return;
          if (!uniqueByName.has(customer.name))
            uniqueByName.set(customer.name, customer);
        });
        return Array.from(uniqueByName.values());
      })
      .catch(function () {
        return [];
      });
  }

  function buildPayerOptionsHtml(customers) {
    var html = "";
    customers.forEach(function (customer) {
      var name = escapeHtml(customer.name);
      var value = escapeHtml(customer.id);
      html +=
        "" +
        '<el-option value="' +
        value +
        '" class="group/option relative block cursor-default py-2 pr-9 pl-3 text-gray-900 select-none aria-selected:bg-gray-100 group-aria-selected/option:bg-gray-100 focus:bg-gray-100 focus:outline-hidden dark:text-white dark:aria-selected:bg-white/10 dark:group-aria-selected/option:bg-white/10 dark:focus:bg-white/10">' +
        '<span class="block truncate font-medium group-aria-selected/option:font-semibold">' +
        name +
        "</span>" +
        '<span class="absolute inset-y-0 right-0 flex items-center pr-3 text-blue-600 group-not-aria-selected/option:hidden in-[el-selectedcontent]:hidden">' +
        '<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" class="size-5">' +
        '<path d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clip-rule="evenodd" fill-rule="evenodd" />' +
        "</svg>" +
        "</span>" +
        "</el-option>";
    });
    return html;
  }

  function getSelectValue(selectEl) {
    if (!selectEl) return "";
    if (typeof selectEl.value === "string" && selectEl.value)
      return selectEl.value;
    var selectedOption = selectEl.querySelector(
      'el-option[aria-selected="true"]',
    );
    return selectedOption ? selectedOption.getAttribute("value") || "" : "";
  }

  function setSelectValue(selectEl, value) {
    if (!selectEl) return;
    if (typeof selectEl.value !== "undefined") selectEl.value = value || "";
    if (value) selectEl.setAttribute("value", value);
    else selectEl.removeAttribute("value");
    selectEl.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function hydratePayerSelects() {
    var optionsHtml = buildPayerOptionsHtml(customersCache);
    rowsWrap
      .querySelectorAll("[data-adv-payer-options]")
      .forEach(function (optsEl) {
        optsEl.innerHTML = optionsHtml;
      });
  }

  // The Global Preferences "Method of Payment" dropdown is the one shared component:
  // rows take its options and its styling, so changes there apply everywhere.
  function getGlobalMethodSelect() {
    return document.querySelector(
      'el-select[name="gp-default-payment-method-1"]',
    );
  }

  function getMethodOptionsTemplateHtml() {
    var source =
      getGlobalMethodSelect() &&
      getGlobalMethodSelect().querySelector("el-options");
    return source ? source.innerHTML : "";
  }

  // Consumer Portal: bank options show their validation status. Unverified
  // accounts are disabled and explain why (Figma "Dropdown" frame).
  var advBankStatusById = {};
  var ADV_CHECK_ICON =
    '<svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" class="size-4 shrink-0 text-emerald-500"><path fill-rule="evenodd" clip-rule="evenodd" d="M8 14.4C11.5346 14.4 14.4 11.5346 14.4 8C14.4 4.46538 11.5346 1.6 8 1.6C4.46538 1.6 1.6 4.46538 1.6 8C1.6 11.5346 4.46538 14.4 8 14.4ZM11.0852 6.5529C11.2801 6.28491 11.2209 5.90966 10.9529 5.71476C10.6849 5.51986 10.3097 5.57911 10.1148 5.8471L7.32776 9.67923L5.82426 8.17574C5.58995 7.94142 5.21005 7.94142 4.97574 8.17574C4.74142 8.41005 4.74142 8.78995 4.97574 9.02426L6.97574 11.0243C7.09982 11.1483 7.27199 11.2119 7.44693 11.1982C7.62187 11.1844 7.78203 11.0948 7.88524 10.9529L11.0852 6.5529Z" /></svg>';
  var ADV_X_ICON =
    '<svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" class="size-4 shrink-0 text-gray-400"><path fill-rule="evenodd" clip-rule="evenodd" d="M8 14.4C11.5346 14.4 14.4 11.5346 14.4 8C14.4 4.46538 11.5346 1.6 8 1.6C4.46538 1.6 1.6 4.46538 1.6 8C1.6 11.5346 4.46538 14.4 8 14.4ZM6.62426 5.77574C6.38995 5.54142 6.01005 5.54142 5.77574 5.77574C5.54142 6.01005 5.54142 6.38995 5.77574 6.62426L7.15147 8L5.77574 9.37574C5.54142 9.61005 5.54142 9.98995 5.77574 10.2243C6.01005 10.4586 6.38995 10.4586 6.62426 10.2243L8 8.84853L9.37574 10.2243C9.61005 10.4586 9.98995 10.4586 10.2243 10.2243C10.4586 9.98995 10.4586 9.61005 10.2243 9.37574L8.84853 8L10.2243 6.62426C10.4586 6.38995 10.4586 6.01005 10.2243 5.77574C9.98995 5.54142 9.61005 5.54142 9.37574 5.77574L8 7.15147L6.62426 5.77574Z" /></svg>';
  var ADV_WARNING_ICON =
    '<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" class="size-5 shrink-0 text-amber-500"><path fill-rule="evenodd" clip-rule="evenodd" d="M8.27598 3.0253C9.0322 1.65823 10.9678 1.65823 11.724 3.0253L17.2431 13.0025C17.9848 14.3433 17.0319 16 15.5191 16H4.48093C2.96807 16 2.01521 14.3433 2.75691 13.0025L8.27598 3.0253ZM10.9889 12.983C10.9889 13.5384 10.5461 13.9887 9.99992 13.9887C9.45369 13.9887 9.01089 13.5384 9.01089 12.983C9.01089 12.4276 9.45369 11.9773 9.99992 11.9773C10.5461 11.9773 10.9889 12.4276 10.9889 12.983ZM9.99991 4.93733C9.45369 4.93733 9.01089 5.3876 9.01089 5.94303V8.96016C9.01089 9.51559 9.45369 9.96587 9.99991 9.96587C10.5461 9.96587 10.9889 9.51559 10.9889 8.96016V5.94303C10.9889 5.3876 10.5461 4.93733 9.99991 4.93733Z" /></svg>';

  function decorateBankOptions(optsEl) {
    var unverifiedShown = false;
    optsEl.querySelectorAll("el-option").forEach(function (optionEl) {
      var checkEl = optionEl.querySelector(":scope > span.text-blue-600");
      if (checkEl) checkEl.classList.replace("text-blue-600", "text-emerald-500");
      var status = advBankStatusById[optionEl.getAttribute("value")];
      if (!status) return;
      var titleRow = optionEl.querySelector(
        ".flex.items-center.gap-1\\.5.self-stretch",
      );
      if (!titleRow) return;
      var title = titleRow.firstElementChild;
      var secondary = titleRow.parentElement.querySelector(".block.text-sm");
      if (status === "verified") {
        title.insertAdjacentHTML(
          "afterend",
          window.PPComponents &&
            typeof window.PPComponents.buildBankValidationIcon === "function"
            ? window.PPComponents.buildBankValidationIcon("verified")
            : ADV_CHECK_ICON,
        );
        return;
      }
      // Only one unverified account is listed, always last.
      if (unverifiedShown || status !== "unverified") {
        optionEl.remove();
        return;
      }
      unverifiedShown = true;
      optsEl.appendChild(optionEl);
      title.insertAdjacentHTML("afterend", ADV_X_ICON);
      titleRow.classList.replace("font-medium", "font-semibold");
      titleRow.classList.add("text-gray-500");
      if (secondary) secondary.classList.replace("text-gray-500", "text-gray-400");
      optionEl.setAttribute("disabled", "");
      optionEl.setAttribute("aria-disabled", "true");
      optionEl.classList.add("pointer-events-none", "bg-gray-50", "flex", "flex-col", "gap-3");
      optionEl.insertAdjacentHTML(
        "beforeend",
        '<div class="flex items-start gap-3 rounded-md border border-yellow-200 bg-yellow-50 p-2 in-[el-selectedcontent]:hidden">' +
          ADV_WARNING_ICON +
          '<p class="text-sm/5 font-normal whitespace-normal text-yellow-700">This bank account hasn\'t been verified yet. Please select a verified account or add a new one.</p></div>',
      );
    });
  }

  function hydrateMethodSelects() {
    var optionsHtml = getMethodOptionsTemplateHtml();
    if (!optionsHtml) return;
    var isConsumerPage = window.location.pathname.indexOf("consumer-") !== -1;
    var globalSelect = getGlobalMethodSelect();
    var globalOptions = globalSelect && globalSelect.querySelector("el-options");
    var globalButton = globalSelect && globalSelect.querySelector(":scope > button");
    var globalContent = globalSelect && globalSelect.querySelector("el-selectedcontent");
    if (isConsumerPage)
    rowsWrap
      .querySelectorAll("[data-adv-method-select]")
      .forEach(function (selectEl) {
        var button = selectEl.querySelector(":scope > button");
        var content = selectEl.querySelector("el-selectedcontent");
        if (button && globalButton) button.className = globalButton.className;
        if (content && globalContent)
          content.className = globalContent.className;
      });
    rowsWrap
      .querySelectorAll("[data-adv-method-options]")
      .forEach(function (optsEl) {
        // Advanced Settings rows are narrow, so their lists keep a fixed 416px width.
        if (isConsumerPage)
          optsEl.className = globalOptions.className.replace(
            "w-(--button-width)",
            "w-[416px] max-w-[calc(100vw-2rem)]",
          );
        optsEl.innerHTML = optionsHtml;
        if (isConsumerPage) decorateBankOptions(optsEl);
      });
    rowsWrap.querySelectorAll(".pp-adv-row").forEach(function (rowEl) {
      applyRowMethodUniqueness(rowEl);
    });
  }

  function applyRowMethodUniqueness(rowEl) {
    var methodSelects = Array.prototype.slice.call(
      rowEl.querySelectorAll("[data-adv-method-select]"),
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
        }),
      );

      selectEl.querySelectorAll("el-option").forEach(function (optionEl) {
        var optionValue = optionEl.getAttribute("value") || "";
        var shouldHide =
          takenInOtherSelects.has(optionValue) && optionValue !== currentValue;
        optionEl.classList.toggle("hidden", shouldHide);
        optionEl.toggleAttribute("hidden", shouldHide);
        optionEl.setAttribute("aria-hidden", shouldHide ? "true" : "false");
      });
    });
  }

  function buildRowHtml() {
    return (
      "" +
      '<div class="pp-adv-row flex w-full items-center gap-4 px-2 py-3">' +
      '<div class="min-w-0 flex-1">' +
      '<el-select data-adv-payer-select class="block w-full">' +
      '<button type="button" class="grid h-8 w-full cursor-default grid-cols-1 items-center rounded-md bg-white px-3 text-left text-sm leading-5 font-medium text-gray-900 shadow-xs outline-1 -outline-offset-1 outline-gray-300 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-blue-600 dark:bg-white/5 dark:text-white dark:outline-white/10">' +
      '<el-selectedcontent class="col-start-1 row-start-1 truncate pr-7 font-medium text-gray-900 dark:text-white"><span class="font-normal text-gray-400 dark:text-gray-500">Select payer</span></el-selectedcontent>' +
      '<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" class="col-start-1 row-start-1 size-5 self-center justify-self-end text-gray-400 dark:text-gray-500"><path fill-rule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clip-rule="evenodd" /></svg>' +
      "</button>" +
      '<el-options anchor="bottom start" popover class="max-h-60 min-w-(--button-width) w-max max-w-[min(36rem,calc(100vw-2rem))] overflow-y-auto overflow-x-hidden rounded-md bg-white py-1 text-base shadow-lg outline-1 outline-black/5 [--anchor-gap:--spacing(1)] data-leave:transition data-leave:transition-discrete data-leave:duration-100 data-leave:ease-in data-closed:data-leave:opacity-0 text-base sm:text-sm dark:bg-gray-800 dark:outline-white/10" data-adv-payer-options></el-options>' +
      "</el-select>" +
      "</div>" +
      '<div class="min-w-0 flex-1">' +
      (window.location.pathname.indexOf("consumer-") !== -1
        ? ""
        : ('<el-select data-adv-entity-select value="all-entities" class="block w-full">' +
      '<button type="button" class="grid h-8 w-full cursor-default grid-cols-1 items-center rounded-md bg-gray-50 px-3 text-left text-sm leading-5 font-medium text-gray-500 shadow-xs outline-1 -outline-offset-1 outline-gray-300 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-blue-600 dark:bg-white/5 dark:text-gray-400 dark:outline-white/10">' +
      '<el-selectedcontent class="col-start-1 row-start-1 truncate pr-7 font-medium text-gray-500 dark:text-gray-400">All entities</el-selectedcontent>' +
      '<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" class="col-start-1 row-start-1 size-5 self-center justify-self-end text-gray-400 dark:text-gray-500"><path fill-rule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clip-rule="evenodd" /></svg>' +
      "</button>" +
      '<el-options anchor="bottom start" popover class="max-h-60 min-w-(--button-width) w-max max-w-[min(36rem,calc(100vw-2rem))] overflow-y-auto overflow-x-hidden rounded-md bg-white py-1 text-base shadow-lg outline-1 outline-black/5 [--anchor-gap:--spacing(1)] data-leave:transition data-leave:transition-discrete data-leave:duration-100 data-leave:ease-in data-closed:data-leave:opacity-0 text-base sm:text-sm dark:bg-gray-800 dark:outline-white/10" data-adv-entity-options></el-options>' +
      "</el-select>" +
      "</div>" +
      '<div class="min-w-0 flex-1">')) +
      '<el-select data-adv-method-select data-method-slot="1" class="block w-full">' +
      '<button type="button" class="grid h-8 w-full cursor-default grid-cols-1 items-center rounded-md bg-white px-3 text-left text-sm leading-5 font-medium text-gray-900 shadow-xs outline-1 -outline-offset-1 outline-gray-300 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-blue-600 dark:bg-white/5 dark:text-white dark:outline-white/10">' +
      '<el-selectedcontent class="col-start-1 row-start-1 truncate pr-7 font-medium text-gray-900 dark:text-white"><span class="font-normal text-gray-400 dark:text-gray-500">Select payment method</span></el-selectedcontent>' +
      '<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" class="col-start-1 row-start-1 size-5 self-center justify-self-end text-gray-400 dark:text-gray-500"><path fill-rule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clip-rule="evenodd" /></svg>' +
      "</button>" +
      (window.location.pathname.indexOf("consumer-") !== -1
        ? ('<el-options anchor="bottom start" popover class="max-h-[21rem] min-w-(--button-width) w-max max-w-[min(36rem,calc(100vw-2rem))] overflow-auto divide-y divide-gray-200 rounded-md bg-white py-1 text-base shadow-lg outline-1 outline-black/5 [--anchor-gap:--spacing(1)] data-leave:transition data-leave:transition-discrete data-leave:duration-100 data-leave:ease-in data-closed:data-leave:opacity-0 text-base sm:text-sm dark:divide-white/10 dark:bg-gray-800 dark:outline-white/10" data-adv-method-options></el-options>')
        : ('<el-options anchor="bottom start" popover class="max-h-60 min-w-(--button-width) w-max max-w-[min(36rem,calc(100vw-2rem))] overflow-y-auto overflow-x-hidden rounded-md bg-white py-1 text-base shadow-lg outline-1 outline-black/5 [--anchor-gap:--spacing(1)] data-leave:transition data-leave:transition-discrete data-leave:duration-100 data-leave:ease-in data-closed:data-leave:opacity-0 text-base sm:text-sm dark:bg-gray-800 dark:outline-white/10" data-adv-method-options></el-options>')) +
      "</el-select>" +
      "</div>" +
      '<div class="min-w-0 flex-1">' +
      '<el-select data-adv-method-select data-method-slot="2" class="block w-full">' +
      '<button type="button" class="grid h-8 w-full cursor-default grid-cols-1 items-center rounded-md bg-white px-3 text-left text-sm leading-5 font-medium text-gray-900 shadow-xs outline-1 -outline-offset-1 outline-gray-300 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-blue-600 dark:bg-white/5 dark:text-white dark:outline-white/10">' +
      '<el-selectedcontent class="col-start-1 row-start-1 truncate pr-7 font-medium text-gray-900 dark:text-white"><span class="font-normal text-gray-400 dark:text-gray-500">Select payment method</span></el-selectedcontent>' +
      '<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" class="col-start-1 row-start-1 size-5 self-center justify-self-end text-gray-400 dark:text-gray-500"><path fill-rule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clip-rule="evenodd" /></svg>' +
      "</button>" +
      (window.location.pathname.indexOf("consumer-") !== -1
        ? ('<el-options anchor="bottom start" popover class="max-h-[21rem] min-w-(--button-width) w-max max-w-[min(36rem,calc(100vw-2rem))] overflow-auto divide-y divide-gray-200 rounded-md bg-white py-1 text-base shadow-lg outline-1 outline-black/5 [--anchor-gap:--spacing(1)] data-leave:transition data-leave:transition-discrete data-leave:duration-100 data-leave:ease-in data-closed:data-leave:opacity-0 text-base sm:text-sm dark:divide-white/10 dark:bg-gray-800 dark:outline-white/10" data-adv-method-options></el-options>')
        : ('<el-options anchor="bottom start" popover class="max-h-60 min-w-(--button-width) w-max max-w-[min(36rem,calc(100vw-2rem))] overflow-y-auto overflow-x-hidden rounded-md bg-white py-1 text-base shadow-lg outline-1 outline-black/5 [--anchor-gap:--spacing(1)] data-leave:transition data-leave:transition-discrete data-leave:duration-100 data-leave:ease-in data-closed:data-leave:opacity-0 text-base sm:text-sm dark:bg-gray-800 dark:outline-white/10" data-adv-method-options></el-options>')) +
      "</el-select>" +
      "</div>" +
      '<div class="min-w-0 flex-1">' +
      '<el-select data-adv-method-select data-method-slot="3" class="block w-full">' +
      '<button type="button" class="grid h-8 w-full cursor-default grid-cols-1 items-center rounded-md bg-white px-3 text-left text-sm leading-5 font-medium text-gray-900 shadow-xs outline-1 -outline-offset-1 outline-gray-300 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-blue-600 dark:bg-white/5 dark:text-white dark:outline-white/10">' +
      '<el-selectedcontent class="col-start-1 row-start-1 truncate pr-7 font-medium text-gray-900 dark:text-white"><span class="font-normal text-gray-400 dark:text-gray-500">Select payment method</span></el-selectedcontent>' +
      '<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" class="col-start-1 row-start-1 size-5 self-center justify-self-end text-gray-400 dark:text-gray-500"><path fill-rule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clip-rule="evenodd" /></svg>' +
      "</button>" +
      (window.location.pathname.indexOf("consumer-") !== -1
        ? ('<el-options anchor="bottom start" popover class="max-h-[21rem] min-w-(--button-width) w-max max-w-[min(36rem,calc(100vw-2rem))] overflow-auto divide-y divide-gray-200 rounded-md bg-white py-1 text-base shadow-lg outline-1 outline-black/5 [--anchor-gap:--spacing(1)] data-leave:transition data-leave:transition-discrete data-leave:duration-100 data-leave:ease-in data-closed:data-leave:opacity-0 text-base sm:text-sm dark:divide-white/10 dark:bg-gray-800 dark:outline-white/10" data-adv-method-options></el-options>')
        : ('<el-options anchor="bottom start" popover class="max-h-60 min-w-(--button-width) w-max max-w-[min(36rem,calc(100vw-2rem))] overflow-y-auto overflow-x-hidden rounded-md bg-white py-1 text-base shadow-lg outline-1 outline-black/5 [--anchor-gap:--spacing(1)] data-leave:transition data-leave:transition-discrete data-leave:duration-100 data-leave:ease-in data-closed:data-leave:opacity-0 text-base sm:text-sm dark:bg-gray-800 dark:outline-white/10" data-adv-method-options></el-options>')) +
      "</el-select>" +
      "</div>" +
      '<div class="shrink-0">' +
      '<button type="button" data-adv-remove-row class="inline-flex rounded p-[5px] text-gray-400 hover:bg-gray-100 hover:text-gray-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:hover:bg-white/10 dark:hover:text-gray-300 cursor-pointer">' +
      '<span class="sr-only">Remove row</span>' +
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="size-[18px]" aria-hidden="true"><path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" /></svg>' +
      "</button>" +
      "</div>" +
      "</div>"
    );
  }

  customizeBtn.addEventListener("click", function () {
    if (
      window.location.pathname.indexOf("consumer-") !== -1 &&
      !rowsWrap.querySelector(".pp-adv-row")
    ) {
      rowsWrap.insertAdjacentHTML("beforeend", buildRowHtml());
      hydratePayerSelects();
      hydrateMethodSelects();
    }
    emptyState.classList.add("hidden");
    tableState.classList.remove("hidden");
    setAdvancedDirty(false);
    syncAdvFooter();
  });

  if (addPayerBtn) {
    addPayerBtn.addEventListener("click", function () {
      rowsWrap.insertAdjacentHTML("beforeend", buildRowHtml());
      hydratePayerSelects();
      hydrateMethodSelects();
      setAdvancedDirty(true);
    });
  }

  rowsWrap.addEventListener("click", function (event) {
    var removeBtn = event.target.closest("[data-adv-remove-row]");
    if (!removeBtn) return;
    var row = removeBtn.closest(".pp-adv-row");
    if (!row) return;
    row.remove();
    setAdvancedDirty(true);

    if (!rowsWrap.querySelector(".pp-adv-row")) {
      tableState.classList.add("hidden");
      emptyState.classList.remove("hidden");
      syncAdvFooter();
    }
  });

  rowsWrap.addEventListener("change", function (event) {
    var payerSelect = event.target.closest("[data-adv-payer-select]");
    if (payerSelect) {
      setAdvancedDirty(true);
      return;
    }

    var methodSelect = event.target.closest("[data-adv-method-select]");
    if (methodSelect) {
      var methodRow = methodSelect.closest(".pp-adv-row");
      if (methodRow) applyRowMethodUniqueness(methodRow);
      setAdvancedDirty(true);
      return;
    }
  });

  Promise.all([
    fetchCustomers(),
    window
      .__ppLoadSharedData()
      .then(function (payload) {
        ((payload && payload.bankAccounts) || []).forEach(function (bank) {
          if (bank && bank.id && bank.validationStatus)
            advBankStatusById[bank.id] = bank.validationStatus;
        });
      })
      .catch(function () {}),
  ]).then(function (results) {
    customersCache = results[0];
    hydratePayerSelects();
    hydrateMethodSelects();
  });
  setAdvancedDirty(false);
  syncAdvFooter();
})();

(function () {
  var gpSelects = Array.prototype.slice.call(
    document.querySelectorAll('el-select[name^="gp-default-payment-method-"]'),
  );
  var undoBtn = document.getElementById("gp-default-payment-undo-btn");
  var saveBtn = document.getElementById("gp-default-payment-save-btn");
  if (!gpSelects.length) return;
  var savedSnapshot = [];
  var footerActions = window.__ppInitFooterActions({
    undoBtn: undoBtn,
    saveBtn: saveBtn,
    disableSaveWhenClean: true,
    onUndo: function () {
      window.location.reload();
    },
    onSave: function (setDirty) {
      savedSnapshot = getSnapshot();
      setDirty(false);
    },
  });

  // At least one method is always set, so the primary slot is never empty.
  function ensurePrimaryMethod() {
    if (!getSelectedValue(gpSelects[0])) {
      setSelectedValue(gpSelects[0], "payers-card");
    }
  }

  function getSelectedValue(selectEl) {
    if (selectEl && typeof selectEl.value === "string" && selectEl.value)
      return selectEl.value;
    var selectedOption = selectEl.querySelector(
      'el-option[aria-selected="true"]',
    );
    return selectedOption ? selectedOption.getAttribute("value") || "" : "";
  }

  function setSelectedValue(selectEl, value) {
    if (typeof selectEl.value !== "undefined") {
      selectEl.value = value || "";
    }
    if (value) {
      selectEl.setAttribute("value", value);
    } else {
      selectEl.removeAttribute("value");
    }
    selectEl.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function getSnapshot() {
    return gpSelects.map(function (selectEl) {
      return getSelectedValue(selectEl);
    });
  }

  function snapshotsEqual(a, b) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length)
      return false;
    for (var i = 0; i < a.length; i++) {
      if ((a[i] || "") !== (b[i] || "")) return false;
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
        }),
      );

      selectEl.querySelectorAll("el-option").forEach(function (optionEl) {
        var optionValue = optionEl.getAttribute("value") || "";
        var shouldHide =
          takenInOtherSelects.has(optionValue) && optionValue !== currentValue;
        optionEl.classList.toggle("hidden", shouldHide);
        optionEl.toggleAttribute("hidden", shouldHide);
        optionEl.setAttribute("aria-hidden", shouldHide ? "true" : "false");
      });
    });
  }

  function scheduleApplyUniqueSelection() {
    setTimeout(function () {
      applyUniqueSelection();
      footerActions.setDirty(!snapshotsEqual(getSnapshot(), savedSnapshot));
    }, 0);
  }

  ensurePrimaryMethod();
  savedSnapshot = getSnapshot();

  gpSelects.forEach(function (selectEl) {
    selectEl.addEventListener("change", scheduleApplyUniqueSelection);
    selectEl.addEventListener("input", scheduleApplyUniqueSelection);
  });

  window.__ppGetGpSelectedValue = getSelectedValue;
  window.__ppApplyUniqueSelection = applyUniqueSelection;
  window.__ppUpdateGpSavedSnapshot = function () {
    ensurePrimaryMethod();
    savedSnapshot = getSnapshot();
    footerActions.setDirty(false);
  };
  applyUniqueSelection();
  footerActions.setDirty(false);
})();

(function () {
  var BANK_ACCOUNTS_STORAGE_KEY = window.__ppStorageKey("my_bank_accounts_v1");
  var CHECK_ADDRESSES_STORAGE_KEY = window.__ppStorageKey(
    "my_check_addresses_v1",
  );
  var dialog = document.getElementById("pp-add-bank-account-dialog");
  var saveBtn = document.getElementById("pp-add-bank-account-save-btn");
  var nameInput = document.getElementById("pp-bank-account-name");
  var routingInput = document.getElementById("pp-bank-routing-number");
  var accountInput = document.getElementById("pp-bank-account-number");
  var confirmAccountInput = document.getElementById(
    "pp-bank-account-number-confirm",
  );
  var nicknameInput = document.getElementById("pp-bank-account-nickname");
  var addBankCountrySelect = document.getElementById("pp-add-bank-country");
  var addBankCountryFlag = document.getElementById("pp-add-bank-country-flag");
  var addBankLine1Input = document.getElementById("pp-add-bank-line1");
  var addBankLine2Input = document.getElementById("pp-add-bank-line2");
  var addBankLine3Input = document.getElementById("pp-add-bank-line3");
  var addBankCityInput = document.getElementById("pp-add-bank-city");
  var addBankStateSelect = document.getElementById("pp-add-bank-state");
  var addBankZipInput = document.getElementById("pp-add-bank-zip");
  var addBankDefaultInput = document.getElementById("pp-add-bank-default");
  var addCheckDialog = document.getElementById("pp-add-check-dialog");
  var addCheckSaveBtn = document.getElementById("pp-add-check-save-btn");
  var addCheckNicknameInput = document.getElementById("pp-add-check-nickname");
  var addCheckLine1Input = document.getElementById("pp-add-check-line1");
  var addCheckLine2Input = document.getElementById("pp-add-check-line2");
  var addCheckLine3Input = document.getElementById("pp-add-check-line3");
  var addCheckCityInput = document.getElementById("pp-add-check-city");
  var addCheckStateInput = document.getElementById("pp-add-check-state");
  var addCheckZipInput = document.getElementById("pp-add-check-zip");
  var addCheckCountrySelect = document.getElementById("pp-add-check-country");
  var addCheckCountryFlag = document.getElementById(
    "pp-add-check-country-flag",
  );
  var editBankDialog = document.getElementById("pp-edit-bank-dialog");
  var editBankSaveBtn = document.getElementById("pp-edit-bank-save-btn");
  var editBankNameInput = document.getElementById("pp-edit-bank-name");
  var editBankRoutingInput = document.getElementById("pp-edit-bank-routing");
  var editBankAccountInput = document.getElementById("pp-edit-bank-account");
  var editBankConfirmInput = document.getElementById("pp-edit-bank-confirm");
  var editBankNicknameInput = document.getElementById("pp-edit-bank-nickname");
  var editBankCountrySelect = document.getElementById("pp-edit-bank-country");
  var editBankCountryFlag = document.getElementById(
    "pp-edit-bank-country-flag",
  );
  var editBankLine1Input = document.getElementById("pp-edit-bank-line1");
  var editBankLine2Input = document.getElementById("pp-edit-bank-line2");
  var editBankLine3Input = document.getElementById("pp-edit-bank-line3");
  var editBankCityInput = document.getElementById("pp-edit-bank-city");
  var editBankStateSelect = document.getElementById("pp-edit-bank-state");
  var editBankZipInput = document.getElementById("pp-edit-bank-zip");
  var editBankDefaultInput = document.getElementById("pp-edit-bank-default");
  var editCheckDialog = document.getElementById("pp-edit-check-dialog");
  var editCheckSaveBtn = document.getElementById("pp-edit-check-save-btn");
  var editCheckNicknameInput = document.getElementById(
    "pp-edit-check-nickname",
  );
  var editCheckLine1Input = document.getElementById("pp-edit-check-line1");
  var editCheckLine2Input = document.getElementById("pp-edit-check-line2");
  var editCheckLine3Input = document.getElementById("pp-edit-check-line3");
  var editCheckCityInput = document.getElementById("pp-edit-check-city");
  var editCheckStateInput = document.getElementById("pp-edit-check-state");
  var editCheckZipInput = document.getElementById("pp-edit-check-zip");
  var editCheckCountrySelect = document.getElementById("pp-edit-check-country");
  var editCheckCountryFlag = document.getElementById(
    "pp-edit-check-country-flag",
  );
  var deleteBankConfirmDialog = document.getElementById(
    "pp-delete-bank-confirm-dialog",
  );
  var deleteBankConfirmTitle = document.getElementById(
    "pp-delete-bank-confirm-title",
  );
  var deleteBankConfirmDescription = document.getElementById(
    "pp-delete-bank-confirm-description",
  );
  var deleteBankConfirmBtn = document.getElementById(
    "pp-delete-bank-confirm-btn",
  );
  var deleteCheckConfirmDialog = document.getElementById(
    "pp-delete-check-confirm-dialog",
  );
  var deleteCheckConfirmTitle = document.getElementById(
    "pp-delete-check-confirm-title",
  );
  var deleteCheckConfirmDescription = document.getElementById(
    "pp-delete-check-confirm-description",
  );
  var deleteCheckConfirmBtn = document.getElementById(
    "pp-delete-check-confirm-btn",
  );
  var bankEmptyState = document.getElementById("pp-bank-empty-state");
  var bankList = document.getElementById("pp-bank-accounts-list");
  var bankToggleBtn = document.getElementById("pp-bank-accounts-toggle");
  var bankToggleLabel = document.getElementById(
    "pp-bank-accounts-toggle-label",
  );
  var bankToggleIcon = document.getElementById("pp-bank-accounts-toggle-icon");
  var checkEmptyState = document.getElementById("pp-check-empty-state");
  var checkList = document.getElementById("pp-check-addresses-list");
  var checkToggleBtn = document.getElementById("pp-check-addresses-toggle");
  var checkToggleLabel = document.getElementById(
    "pp-check-addresses-toggle-label",
  );
  var checkToggleIcon = document.getElementById(
    "pp-check-addresses-toggle-icon",
  );
  if (
    !dialog ||
    !saveBtn ||
    !nameInput ||
    !routingInput ||
    !accountInput ||
    !confirmAccountInput ||
    !nicknameInput ||
    !addCheckDialog ||
    !addCheckSaveBtn ||
    !addCheckNicknameInput ||
    !addCheckLine1Input ||
    !addCheckLine2Input ||
    !addCheckCityInput ||
    !addCheckStateInput ||
    !addCheckZipInput ||
    !addCheckCountrySelect ||
    !addCheckCountryFlag ||
    !editBankDialog ||
    !editBankSaveBtn ||
    !editBankNameInput ||
    !editBankRoutingInput ||
    !editBankAccountInput ||
    !editBankConfirmInput ||
    !editBankNicknameInput ||
    !editCheckDialog ||
    !editCheckSaveBtn ||
    !editCheckNicknameInput ||
    !editCheckLine1Input ||
    !editCheckLine2Input ||
    !editCheckCityInput ||
    !editCheckStateInput ||
    !editCheckZipInput ||
    !editCheckCountrySelect ||
    !editCheckCountryFlag ||
    !deleteBankConfirmDialog ||
    !deleteBankConfirmTitle ||
    !deleteBankConfirmDescription ||
    !deleteBankConfirmBtn ||
    !deleteCheckConfirmDialog ||
    !deleteCheckConfirmTitle ||
    !deleteCheckConfirmDescription ||
    !deleteCheckConfirmBtn ||
    !bankEmptyState ||
    !bankList ||
    !bankToggleBtn ||
    !bankToggleLabel ||
    !bankToggleIcon ||
    !checkEmptyState ||
    !checkList ||
    !checkToggleBtn ||
    !checkToggleLabel ||
    !checkToggleIcon
  )
    return;

  var bankAccounts = [];
  var checkAddresses = [];
  var INITIAL_VISIBLE_ACCOUNT_ROWS = 6;
  var isBankAccountsExpanded = false;
  var isCheckAddressesExpanded = false;
  var editingBankAccountId = "";
  var editingCheckAddressId = "";
  var pendingDeleteBankAccountId = "";
  var pendingDeleteCheckAddressId = "";
  function notifyCrud(message) {
    if (
      window.showGlobalTopToast &&
      typeof window.showGlobalTopToast === "function"
    ) {
      window.showGlobalTopToast(message);
    }
  }

  function sanitizeDigits(value, maxLen) {
    return (value || "").replace(/\D/g, "").slice(0, maxLen);
  }

  function deriveCityState(address) {
    var lines = String(address || "")
      .split("\n")
      .map(function (line) {
        return line.trim();
      })
      .filter(Boolean);
    if (!lines.length) return "";
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
    localStorage.setItem(
      BANK_ACCOUNTS_STORAGE_KEY,
      JSON.stringify(bankAccounts),
    );
  }

  function saveCheckAddresses() {
    localStorage.setItem(
      CHECK_ADDRESSES_STORAGE_KEY,
      JSON.stringify(checkAddresses),
    );
  }

  function createAccountId(displayName, last4) {
    var base =
      (displayName || "account")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 18) || "account";
    var id = base + "-" + last4;
    var suffix = 2;
    while (
      bankAccounts.some(function (account) {
        return account.id === id;
      })
    ) {
      id = base + "-" + last4 + "-" + suffix;
      suffix += 1;
    }
    return id;
  }

  function createAddressId(displayName, cityState) {
    var base =
      (displayName || cityState || "address")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 18) || "address";
    var id = base;
    var suffix = 2;
    while (
      checkAddresses.some(function (address) {
        return address.id === id;
      })
    ) {
      id = base + "-" + suffix;
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
    return groups.join("-");
  }

  function mapCountryNameToCode(countryName) {
    var normalized = String(countryName || "")
      .trim()
      .toLowerCase();
    if (normalized === "canada") return "ca";
    if (normalized === "mexico") return "mx";
    if (normalized === "united kingdom") return "gb";
    if (normalized === "australia") return "au";
    if (normalized === "germany") return "de";
    if (normalized === "france") return "fr";
    return "us";
  }

  function buildAccountActionMenu(type, id) {
    if (
      window.PPComponents &&
      typeof window.PPComponents.buildAccountActionMenu === "function"
    ) {
      return window.PPComponents.buildAccountActionMenu(type, id);
    }
    return "";
  }

  function createBankAccountRow(account) {
    if (
      window.PPComponents &&
      typeof window.PPComponents.createBankAccountRow === "function"
    ) {
      return window.PPComponents.createBankAccountRow(account);
    }
    var fallback = document.createElement("div");
    return fallback;
  }

  function createCheckAddressRow(address) {
    if (
      window.PPComponents &&
      typeof window.PPComponents.createCheckAddressRow === "function"
    ) {
      return window.PPComponents.createCheckAddressRow(address);
    }
    var fallback = document.createElement("div");
    return fallback;
  }

  function updateAddCheckCountryFlag() {
    var code = String(addCheckCountrySelect.value || "us").toLowerCase();
    addCheckCountryFlag.className =
      "fi fi-" +
      code +
      " pointer-events-none z-10 col-start-1 row-start-1 ml-3 self-center justify-self-start rounded-sm";
  }

  function updateEditCheckCountryFlag() {
    var code = String(editCheckCountrySelect.value || "us").toLowerCase();
    editCheckCountryFlag.className =
      "fi fi-" +
      code +
      " pointer-events-none z-10 col-start-1 row-start-1 ml-3 self-center justify-self-start rounded-sm";
  }

  function buildDefaultBankFormValues() {
    var index = bankAccounts.length + 1;
    var accountDigits = String(400000000000 + index).slice(-12);
    return {
      accountName: "Nexus Financial Group",
      routing: "021000021",
      accountNumber: formatAccountNumber(accountDigits),
      nickname: "My Bank Account " + index,
    };
  }

  function prefillAddBankForm() {
    var defaults = buildDefaultBankFormValues();
    nameInput.value = defaults.accountName;
    routingInput.value = defaults.routing;
    accountInput.value = defaults.accountNumber;
    confirmAccountInput.value = defaults.accountNumber;
    nicknameInput.value = defaults.nickname;
    addBankCountrySelect.value = "us";
    updateAddBankCountryFlag();
    addBankLine1Input.value = "1200 Market Street";
    addBankLine2Input.value = "";
    addBankLine3Input.value = "";
    addBankCityInput.value = "San Francisco";
    setCheckStateSelect(addBankStateSelect, "CA");
    addBankZipInput.value = "94102";
    addBankDefaultInput.checked = false;
  }

  function updateAddBankCountryFlag() {
    addBankCountryFlag.className =
      "fi fi-" +
      (addBankCountrySelect.value || "us") +
      " pointer-events-none z-10 col-start-1 row-start-1 ml-3 self-center justify-self-start rounded-sm";
  }

  function buildAddBankAddress() {
    var countryText =
      addBankCountrySelect.value === "us"
        ? "US"
        : (
            addBankCountrySelect.options[addBankCountrySelect.selectedIndex] ||
            {}
          ).text || "";
    var stateName = addBankStateSelect.value;
    var cityLine = [
      addBankCityInput.value.trim(),
      [stateName, addBankZipInput.value.trim()].filter(Boolean).join(" "),
    ]
      .filter(Boolean)
      .join(", ");
    return [
      addBankLine1Input.value,
      addBankLine2Input.value,
      addBankLine3Input.value,
    ]
      .map(function (l) {
        return l.trim();
      })
      .filter(Boolean)
      .concat(cityLine ? [cityLine] : [], countryText ? [countryText] : [])
      .join("\n");
  }

  // State/Province is a dropdown of US state codes; values we can't match are kept as extra options.
  function setCheckStateSelect(select, value) {
    var raw = String(value || "").trim();
    var codes = (typeof US_STATE_CODES === "object" && US_STATE_CODES) || {};
    var code = codes[raw.toUpperCase()]
      ? raw.toUpperCase()
      : Object.keys(codes).filter(function (k) {
          return codes[k].toLowerCase() === raw.toLowerCase();
        })[0] || raw;
    var has = Array.prototype.some.call(select.options, function (o) {
      return o.value === code;
    });
    if (code && !has) {
      var extra = document.createElement("option");
      extra.value = code;
      extra.textContent = raw;
      select.appendChild(extra);
    }
    select.value = code;
  }

  function buildDefaultCheckFormValues() {
    var index = checkAddresses.length + 1;
    return {
      nickname: "My Check Address " + index,
      line1: 1100 + index + " Market Street",
      line2: "Suite " + (300 + index),
      city: "San Francisco",
      state: "CA",
      zip: "9410" + Math.min(index, 9),
      country: "us",
    };
  }

  function resetAddCheckForm() {
    var defaults = buildDefaultCheckFormValues();
    addCheckNicknameInput.value = defaults.nickname;
    addCheckLine1Input.value = defaults.line1;
    addCheckLine2Input.value = defaults.line2;
    addCheckLine3Input.value = "";
    addCheckCityInput.value = defaults.city;
    setCheckStateSelect(addCheckStateInput, defaults.state);
    addCheckZipInput.value = defaults.zip;
    addCheckCountrySelect.value = defaults.country;
    updateAddCheckCountryFlag();
  }

  function parseCheckAddressForForm(address) {
    var lines = String(address.address || "")
      .split("\n")
      .map(function (line) {
        return line.trim();
      })
      .filter(Boolean);
    if (lines.length && lines[0] === address.name) lines.shift();
    var country = lines.length ? lines.pop() : "United States";
    var cityStateZip = lines.length ? lines.pop() : "";
    var line1 = lines.length ? lines.shift() : "";
    var line2 = lines.length ? lines.shift() : "";
    var line3 = lines.length ? lines.join(", ") : "";
    var city = "";
    var state = "";
    var zip = "";
    var match = cityStateZip.match(/^(.*?),\s*([A-Za-z]{2,})\s+(.+)$/);
    if (match) {
      city = match[1].trim();
      state = match[2].trim();
      zip = match[3].trim();
    } else {
      var cityStateParts = String(address.cityState || "").split(",");
      city = (cityStateParts[0] || "").trim();
      state = (cityStateParts[1] || "").trim();
    }
    return {
      line1: line1,
      line2: line2,
      line3: line3,
      city: city,
      state: state,
      zip: zip,
      country: country,
    };
  }

  function openDeleteBankConfirm(account) {
    if (!account) return;
    pendingDeleteBankAccountId = account.id;
    var accountLabel = String(account.name || "Bank Account").trim();
    var accountLast4 = String(account.last4 || "").trim();
    deleteBankConfirmTitle.textContent = "Delete " + accountLabel + "?";
    var bankLabel = accountLabel + (accountLast4 ? " ••••" + accountLast4 : "");
    deleteBankConfirmDescription.innerHTML =
      'If you delete <span class="font-medium text-gray-900">' +
      bankLabel +
      "</span> it will be removed as a payment option for receiving payments.";
    if (typeof deleteBankConfirmDialog.showModal === "function") {
      deleteBankConfirmDialog.showModal();
    }
  }

  function openDeleteCheckConfirm(address) {
    if (!address) return;
    pendingDeleteCheckAddressId = address.id;
    var addressLabel = String(address.displayName || "Check Address").trim();
    var addressSummary = String(address.summary || "").trim();
    deleteCheckConfirmTitle.textContent = "Delete " + addressLabel + "?";
    var checkLabel =
      addressLabel + (addressSummary ? " (" + addressSummary + ")" : "");
    deleteCheckConfirmDescription.innerHTML =
      'If you delete <span class="font-medium text-gray-900">' +
      checkLabel +
      "</span> it will be removed as a payment option for receiving payments.";
    if (typeof deleteCheckConfirmDialog.showModal === "function") {
      deleteCheckConfirmDialog.showModal();
    }
  }

  function createBankOption(account) {
    var option = document.createElement("el-option");
    option.setAttribute("value", account.id);
    option.setAttribute("data-gp-bank-option", "true");
    option.className =
      "group/option relative block cursor-default select-none px-4 py-3 text-gray-900 aria-selected:bg-gray-100 aria-selected:pr-11 focus:bg-gray-100 focus:outline-hidden dark:text-white dark:aria-selected:bg-white/10 dark:focus:bg-white/10";
    option.innerHTML =
      '<div class="flex items-start gap-3 in-[el-selectedcontent]:items-center in-[el-selectedcontent]:gap-2">' +
      '  <div class="shrink-0 py-0.5 text-gray-500 in-[el-selectedcontent]:py-0 in-[el-selectedcontent]:text-gray-400 dark:text-gray-400 dark:in-[el-selectedcontent]:text-gray-500">' +
      '    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" class="size-5"><path fill-rule="evenodd" clip-rule="evenodd" d="M9.67411 2.07459C9.88011 1.97514 10.1202 1.97514 10.3262 2.07459L17.5762 5.57459C17.9493 5.75467 18.1057 6.20304 17.9256 6.57606C17.7576 6.92403 17.3561 7.08351 17.0002 6.95718V16.5H17.2502C17.6644 16.5 18.0002 16.8358 18.0002 17.25C18.0002 17.6642 17.6644 18 17.2502 18H2.75017C2.33596 18 2.00017 17.6642 2.00017 17.25C2.00017 16.8358 2.33596 16.5 2.75017 16.5H3.00017V6.95718C2.6442 7.08351 2.24274 6.92403 2.07476 6.57606C1.89468 6.20304 2.05109 5.75467 2.42411 5.57459L9.67411 2.07459ZM11 6C11 6.55228 10.5523 7 10 7C9.44772 7 9 6.55228 9 6C9 5.44772 9.44772 5 10 5C10.5523 5 11 5.44772 11 6ZM7.5 9.75C7.5 9.33579 7.16421 9 6.75 9C6.33579 9 6 9.33579 6 9.75V15.25C6 15.6642 6.33579 16 6.75 16C7.16421 16 7.5 15.6642 7.5 15.25V9.75ZM10.75 9.75C10.75 9.33579 10.4142 9 10 9C9.58579 9 9.25 9.33579 9.25 9.75V15.25C9.25 15.6642 9.58579 16 10 16C10.4142 16 10.75 15.6642 10.75 15.25V9.75ZM14 9.75C14 9.33579 13.6642 9 13.25 9C12.8358 9 12.5 9.33579 12.5 9.75V15.25C12.5 15.6642 12.8358 16 13.25 16C13.6642 16 14 15.6642 14 15.25V9.75Z"/></svg>' +
      "  </div>" +
      (window.location.pathname.indexOf("consumer-") !== -1
        ? ('  <div class="in-[el-selectedcontent]:hidden">' +
      '    <span class="flex items-center gap-1.5 self-stretch truncate font-medium group-aria-selected/option:font-semibold"><span>' +
      account.name +
      "</span></span>" +
      '    <span class="block text-sm text-gray-500 dark:text-gray-400">••••')
        : ('  <div class="flex min-w-0 flex-1 flex-col gap-1 in-[el-selectedcontent]:hidden">' +
      '    <span class="flex items-center gap-1.5 text-sm/5 font-semibold whitespace-nowrap text-gray-900 dark:text-white"><span>' +
      account.name +
      "</span></span>" +
      '    <span class="truncate text-sm/5 text-gray-500 dark:text-gray-400">' +
      "••••")) +
      account.last4 +
      "</span>" +
      "  </div>" +
      '  <span class="hidden truncate font-medium in-[el-selectedcontent]:block">' +
      account.name +
      " ••••" +
      account.last4 +
      "</span>" +
      "</div>" +
      '<span class="absolute inset-y-0 right-0 flex items-center pr-4 text-blue-600 group-not-aria-selected/option:hidden in-[el-selectedcontent]:hidden">' +
      '  <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" class="size-5">' +
      '    <path d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clip-rule="evenodd" fill-rule="evenodd" />' +
      "  </svg>" +
      "</span>";
    return option;
  }

  function createAddressOption(address) {
    var option = document.createElement("el-option");
    option.setAttribute("value", address.id);
    option.setAttribute("data-gp-address-option", "true");
    option.className =
      "group/option relative block cursor-default select-none px-4 py-3 text-gray-900 aria-selected:bg-gray-100 aria-selected:pr-11 focus:bg-gray-100 focus:outline-hidden dark:text-white dark:aria-selected:bg-white/10 dark:focus:bg-white/10";
    option.innerHTML =
      '<div class="flex items-start gap-3 in-[el-selectedcontent]:items-center in-[el-selectedcontent]:gap-2">' +
      '  <div class="shrink-0 py-0.5 text-gray-500 in-[el-selectedcontent]:py-0 in-[el-selectedcontent]:text-gray-400 dark:text-gray-400 dark:in-[el-selectedcontent]:text-gray-500">' +
      '    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" class="size-5"><path fill-rule="evenodd" clip-rule="evenodd" d="M16.25 2C16.6642 2 17 2.33579 17 2.75C17 3.16421 16.6642 3.5 16.25 3.5H16V16.5H16.25C16.6642 16.5 17 16.8358 17 17.25C17 17.6642 16.6642 18 16.25 18H12.75C12.3358 18 12 17.6642 12 17.25V14.75C12 14.3358 11.6642 14 11.25 14H8.75C8.33579 14 8 14.3358 8 14.75V17.25C8 17.6642 7.66421 18 7.25 18H3.75C3.33579 18 3 17.6642 3 17.25C3 16.8358 3.33579 16.5 3.75 16.5H4V3.5H3.75C3.33579 3.5 3 3.16421 3 2.75C3 2.33579 3.33579 2 3.75 2H16.25ZM7.5 9C7.22386 9 7 9.22386 7 9.5V10.5C7 10.7761 7.22386 11 7.5 11H8.5C8.77614 11 9 10.7761 9 10.5V9.5C9 9.22386 8.77614 9 8.5 9H7.5ZM11.5 9C11.2239 9 11 9.22386 11 9.5V10.5C11 10.7761 11.2239 11 11.5 11H12.5C12.7761 11 13 10.7761 13 10.5V9.5C13 9.22386 12.7761 9 12.5 9H11.5ZM7.5 5C7.22386 5 7 5.22386 7 5.5V6.5C7 6.77614 7.22386 7 7.5 7H8.5C8.77614 7 9 6.77614 9 6.5V5.5C9 5.22386 8.77614 5 8.5 5H7.5ZM11.5 5C11.2239 5 11 5.22386 11 5.5V6.5C11 6.77614 11.2239 7 11.5 7H12.5C12.7761 7 13 6.77614 13 6.5V5.5C13 5.22386 12.7761 5 12.5 5H11.5Z"/></svg>' +
      "  </div>" +
      (window.location.pathname.indexOf("consumer-") !== -1
        ? ('  <div class="in-[el-selectedcontent]:hidden">' +
      '    <span class="flex items-center gap-1.5 self-stretch truncate font-medium group-aria-selected/option:font-semibold"><span>Check</span><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M7.79922 5.99995C7.79922 6.99406 6.99333 7.79995 5.99922 7.79995C5.00511 7.79995 4.19922 6.99406 4.19922 5.99995C4.19922 5.00584 5.00511 4.19995 5.99922 4.19995C6.99333 4.19995 7.79922 5.00584 7.79922 5.99995Z" fill="#6B7280"/></svg><span>')
        : ('  <div class="flex min-w-0 flex-1 flex-col gap-1 in-[el-selectedcontent]:hidden">' +
      '    <span class="flex items-center gap-1.5 text-sm/5 font-semibold whitespace-nowrap text-gray-900 dark:text-white"><span>Check</span><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 12 12" fill="currentColor" aria-hidden="true" class="size-3 shrink-0 text-gray-500 dark:text-gray-400"><path d="M7.8 6C7.8 6.99411 6.99411 7.8 6 7.8C5.00589 7.8 4.2 6.99411 4.2 6C4.2 5.00589 5.00589 4.2 6 4.2C6.99411 4.2 7.8 5.00589 7.8 6Z"/></svg><span>')) +
      address.displayName +
      "</span></span>" +
      '    <span class="truncate text-sm/5 text-gray-500 dark:text-gray-400">' +
      address.summary +
      "</span>" +
      "  </div>" +
      '  <span class="hidden truncate font-medium in-[el-selectedcontent]:block">' +
      address.displayName +
      "</span>" +
      "</div>" +
      '<span class="absolute inset-y-0 right-0 flex items-center pr-4 text-blue-600 group-not-aria-selected/option:hidden in-[el-selectedcontent]:hidden">' +
      '  <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" class="size-5">' +
      '    <path d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clip-rule="evenodd" fill-rule="evenodd" />' +
      "  </svg>" +
      "</span>";
    return option;
  }

  function renderBankAccountsList() {
    bankList.innerHTML = "";
    var visibleCount = isBankAccountsExpanded
      ? bankAccounts.length
      : Math.min(INITIAL_VISIBLE_ACCOUNT_ROWS, bankAccounts.length);
    bankAccounts.slice(0, visibleCount).forEach(function (account) {
      bankList.appendChild(createBankAccountRow(account));
    });
    bankEmptyState.classList.toggle("hidden", bankAccounts.length > 0);
    var hiddenCount = Math.max(
      bankAccounts.length - INITIAL_VISIBLE_ACCOUNT_ROWS,
      0,
    );
    if (!isBankAccountsExpanded && hiddenCount > 0) {
      bankToggleBtn.style.display = "inline-flex";
      bankToggleLabel.textContent = "Show more (" + hiddenCount + ")";
      bankToggleIcon.classList.remove("rotate-180");
    } else if (
      isBankAccountsExpanded &&
      bankAccounts.length > INITIAL_VISIBLE_ACCOUNT_ROWS
    ) {
      bankToggleBtn.style.display = "inline-flex";
      bankToggleLabel.textContent = "Show less";
      bankToggleIcon.classList.add("rotate-180");
    } else {
      bankToggleBtn.style.display = "none";
    }
  }

  function renderCheckAddressesList() {
    checkList.innerHTML = "";
    var visibleCount = isCheckAddressesExpanded
      ? checkAddresses.length
      : Math.min(INITIAL_VISIBLE_ACCOUNT_ROWS, checkAddresses.length);
    checkAddresses.slice(0, visibleCount).forEach(function (address) {
      checkList.appendChild(createCheckAddressRow(address));
    });
    checkEmptyState.classList.toggle("hidden", checkAddresses.length > 0);
    var hiddenCount = Math.max(
      checkAddresses.length - INITIAL_VISIBLE_ACCOUNT_ROWS,
      0,
    );
    if (!isCheckAddressesExpanded && hiddenCount > 0) {
      checkToggleBtn.style.display = "inline-flex";
      checkToggleLabel.textContent = "Show more (" + hiddenCount + ")";
      checkToggleIcon.classList.remove("rotate-180");
    } else if (
      isCheckAddressesExpanded &&
      checkAddresses.length > INITIAL_VISIBLE_ACCOUNT_ROWS
    ) {
      checkToggleBtn.style.display = "inline-flex";
      checkToggleLabel.textContent = "Show less";
      checkToggleIcon.classList.add("rotate-180");
    } else {
      checkToggleBtn.style.display = "none";
    }
  }

  function renderGlobalPreferencesPaymentOptions() {
    var gpSelects = document.querySelectorAll(
      'el-select[name^="gp-default-payment-method-"]',
    );
    var allowedValues = new Set(["payers-card"]);
    bankAccounts.forEach(function (account) {
      allowedValues.add(account.id);
    });
    checkAddresses.forEach(function (address) {
      allowedValues.add(address.id);
    });

    gpSelects.forEach(function (selectEl) {
      var optionsEl = selectEl.querySelector("el-options");
      if (!optionsEl) return;

      optionsEl
        .querySelectorAll(
          'el-option[data-gp-bank-option="true"], el-option[data-gp-address-option="true"], el-option[value="wf-8419"], el-option[value="citi-3674"], el-option[value="addr-sf"], el-option[value="addr-ny"]',
        )
        .forEach(function (optionEl) {
          optionEl.remove();
        });

      var payersCardEl = optionsEl.querySelector(
        'el-option[value="payers-card"]',
      );
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

      var selectedValue =
        typeof window.__ppGetGpSelectedValue === "function"
          ? window.__ppGetGpSelectedValue(selectEl)
          : selectEl.value || "";
      if (selectedValue && !allowedValues.has(selectedValue)) {
        if (typeof selectEl.value !== "undefined") selectEl.value = "";
        selectEl.removeAttribute("value");
        selectEl.dispatchEvent(new Event("change", { bubbles: true }));
      }
    });
  }

  function renderAllViews() {
    renderBankAccountsList();
    renderCheckAddressesList();
    renderGlobalPreferencesPaymentOptions();
    if (typeof window.__ppApplyUniqueSelection === "function") {
      window.__ppApplyUniqueSelection();
    }
    if (typeof window.__ppUpdateGpSavedSnapshot === "function") {
      window.__ppUpdateGpSavedSnapshot();
    }
  }

  bankToggleBtn.addEventListener("click", function () {
    isBankAccountsExpanded = !isBankAccountsExpanded;
    renderBankAccountsList();
  });

  checkToggleBtn.addEventListener("click", function () {
    isCheckAddressesExpanded = !isCheckAddressesExpanded;
    renderCheckAddressesList();
  });

  function normalizeBankAccounts(rawAccounts) {
    if (!Array.isArray(rawAccounts)) return [];
    return rawAccounts
      .map(function (account) {
        var id = (account && account.id ? String(account.id) : "").trim();
        var displayName = (
          account && account.displayName ? String(account.displayName) : ""
        ).trim();
        var legalName = (
          account && account.name ? String(account.name) : ""
        ).trim();
        var bankName = (
          account && account.bankName ? String(account.bankName) : ""
        ).trim();
        var name =
          displayName || (bankName ? bankName + " Account" : legalName);
        var accountHolderName = legalName || displayName || bankName;
        var nickname = (
          account && account.nickname ? String(account.nickname) : ""
        ).trim();
        var routingRaw =
          account && (account.routing || account.routingNumber)
            ? String(account.routing || account.routingNumber)
            : "";
        var routing = sanitizeDigits(routingRaw, 9);
        var accountNumber = (
          account && account.accountNumber ? String(account.accountNumber) : ""
        ).trim();
        var maskedAccount = (
          account &&
          (account.maskedAccount ||
            account.maskedAccountNumber ||
            account.accountMasked)
            ? String(
                account.maskedAccount ||
                  account.maskedAccountNumber ||
                  account.accountMasked,
              )
            : ""
        ).trim();
        var maskedRouting = (
          account && (account.maskedRouting || account.routingMasked)
            ? String(account.maskedRouting || account.routingMasked)
            : ""
        ).trim();
        var last4 = sanitizeDigits(
          account && account.last4 ? String(account.last4) : "",
          4,
        );
        var address = (
          account && account.address ? String(account.address) : ""
        ).trim();
        if (!id || !name || last4.length !== 4) return null;
        return {
          id: id,
          name: name,
          displayName: displayName,
          accountHolderName: accountHolderName,
          bankName: bankName,
          last4: last4,
          nickname: nickname,
          routing: routing,
          accountNumber: accountNumber,
          maskedAccount: maskedAccount,
          maskedRouting: maskedRouting,
          address: address,
          validationStatus: account && account.validationStatus ? String(account.validationStatus) : "",
        };
      })
      .filter(Boolean);
  }

  function normalizeCheckAddresses(rawAddresses) {
    if (!Array.isArray(rawAddresses)) return [];
    return rawAddresses
      .map(function (address) {
        var id = (address && address.id ? String(address.id) : "").trim();
        var displayName = (
          address && address.displayName ? String(address.displayName) : ""
        ).trim();
        var name = (
          address && address.name
            ? String(address.name)
            : "Nexus Financial Group"
        ).trim();
        var fullAddress = (
          address && address.address ? String(address.address) : ""
        ).trim();
        var cityState = (
          address && address.cityState
            ? String(address.cityState)
            : deriveCityState(fullAddress)
        ).trim();
        var summary = (
          address && address.summary ? String(address.summary) : ""
        ).trim();
        if (!summary) {
          var lines = fullAddress
            .split("\n")
            .map(function (line) {
              return line.trim();
            })
            .filter(Boolean);
          summary = lines.slice(0, 3).join(", ");
        }
        if (!id || !displayName || !fullAddress || !cityState) return null;
        return {
          id: id,
          displayName: displayName,
          name: name,
          address: fullAddress,
          cityState: cityState,
          summary: summary,
        };
      })
      .filter(Boolean);
  }

  async function initializeSharedData() {
    var storedBanks = normalizeBankAccounts(
      getStoredArray(BANK_ACCOUNTS_STORAGE_KEY),
    );
    var storedAddresses = normalizeCheckAddresses(
      getStoredArray(CHECK_ADDRESSES_STORAGE_KEY),
    );
    var sharedData = null;

    try {
      sharedData = await window.__ppLoadSharedData();
    } catch (error) {
      sharedData = null;
    }

    var jsonBanks = normalizeBankAccounts(
      sharedData && Array.isArray(sharedData.bankAccounts)
        ? sharedData.bankAccounts
        : [],
    );
    var jsonAddresses = normalizeCheckAddresses(
      sharedData && Array.isArray(sharedData.checkAddresses)
        ? sharedData.checkAddresses
        : [],
    );

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

  routingInput.addEventListener("input", function () {
    routingInput.value = sanitizeDigits(routingInput.value, 9);
  });

  accountInput.addEventListener("input", function () {
    accountInput.value = formatAccountNumber(accountInput.value);
  });

  confirmAccountInput.addEventListener("input", function () {
    confirmAccountInput.value = formatAccountNumber(confirmAccountInput.value);
  });

  // Address is stored as "line1\n[line2\n[line3\n]]City, ST 12345\nCountry".
  function parseBankAddress(raw) {
    var lines = String(raw || "")
      .split("\n")
      .map(function (l) {
        return l.trim();
      })
      .filter(Boolean);
    var out = {
      line1: "",
      line2: "",
      line3: "",
      city: "",
      state: "",
      zip: "",
      country: "us",
    };
    if (!lines.length) return out;
    var last = lines[lines.length - 1];
    if (/^[A-Za-z ]{2,}$/.test(last) && lines.length > 1) {
      var countryCode = mapCountryNameToCode(last);
      out.country =
        last.toLowerCase() === "us" || last.toLowerCase() === "usa"
          ? "us"
          : countryCode;
      lines.pop();
    }
    var cityLine = lines.length > 1 ? lines.pop() : "";
    var m =
      /^(.*?),\s*(.+?)\s+([A-Za-z]\d[A-Za-z] ?\d[A-Za-z]\d|\d[\w -]*)$/.exec(
        cityLine,
      ) || /^(.*?),\s*(.+)$/.exec(cityLine);
    if (m) {
      out.city = m[1].trim();
      out.state = m[2].trim();
      out.zip = (m[3] || "").trim();
    } else out.city = cityLine;
    out.line1 = lines[0] || "";
    out.line2 = lines[1] || "";
    out.line3 = lines[2] || "";
    return out;
  }

  var US_STATE_CODES = {
    AL: "Alabama",
    AK: "Alaska",
    AZ: "Arizona",
    AR: "Arkansas",
    CA: "California",
    CO: "Colorado",
    CT: "Connecticut",
    DE: "Delaware",
    DC: "District of Columbia",
    FL: "Florida",
    GA: "Georgia",
    HI: "Hawaii",
    ID: "Idaho",
    IL: "Illinois",
    IN: "Indiana",
    IA: "Iowa",
    KS: "Kansas",
    KY: "Kentucky",
    LA: "Louisiana",
    ME: "Maine",
    MD: "Maryland",
    MA: "Massachusetts",
    MI: "Michigan",
    MN: "Minnesota",
    MS: "Mississippi",
    MO: "Missouri",
    MT: "Montana",
    NE: "Nebraska",
    NV: "Nevada",
    NH: "New Hampshire",
    NJ: "New Jersey",
    NM: "New Mexico",
    NY: "New York",
    NC: "North Carolina",
    ND: "North Dakota",
    OH: "Ohio",
    OK: "Oklahoma",
    OR: "Oregon",
    PA: "Pennsylvania",
    RI: "Rhode Island",
    SC: "South Carolina",
    SD: "South Dakota",
    TN: "Tennessee",
    TX: "Texas",
    UT: "Utah",
    VT: "Vermont",
    VA: "Virginia",
    WA: "Washington",
    WV: "West Virginia",
    WI: "Wisconsin",
    WY: "Wyoming",
  };

  function updateEditBankCountryFlag() {
    editBankCountryFlag.className =
      "fi fi-" +
      (editBankCountrySelect.value || "us") +
      " pointer-events-none z-10 col-start-1 row-start-1 ml-3 self-center justify-self-start rounded-sm";
  }

  function setEditBankState(value) {
    var name = US_STATE_CODES[String(value || "").toUpperCase()] || value || "";
    var has = Array.prototype.some.call(
      editBankStateSelect.options,
      function (o) {
        return o.value === name;
      },
    );
    if (name && !has) {
      var extra = document.createElement("option");
      extra.value = name;
      extra.textContent = name;
      editBankStateSelect.appendChild(extra);
    }
    editBankStateSelect.value = name;
  }

  function fillEditBankAddress(account) {
    var a = parseBankAddress(account.address);
    editBankCountrySelect.value = a.country;
    updateEditBankCountryFlag();
    editBankLine1Input.value = a.line1;
    editBankLine2Input.value = a.line2;
    editBankLine3Input.value = a.line3;
    editBankCityInput.value = a.city;
    setEditBankState(a.state);
    editBankZipInput.value = a.zip;
  }

  function buildEditBankAddress() {
    var countryText =
      editBankCountrySelect.value === "us"
        ? "US"
        : (
            editBankCountrySelect.options[
              editBankCountrySelect.selectedIndex
            ] || {}
          ).text || "";
    var stateName = editBankStateSelect.value;
    var stateCode =
      Object.keys(US_STATE_CODES).filter(function (k) {
        return US_STATE_CODES[k] === stateName;
      })[0] || stateName;
    var cityLine = [
      editBankCityInput.value.trim(),
      [stateCode, editBankZipInput.value.trim()].filter(Boolean).join(" "),
    ]
      .filter(Boolean)
      .join(", ");
    return [
      editBankLine1Input.value,
      editBankLine2Input.value,
      editBankLine3Input.value,
    ]
      .map(function (l) {
        return l.trim();
      })
      .filter(Boolean)
      .concat(cityLine ? [cityLine] : [], countryText ? [countryText] : [])
      .join("\n");
  }

  bankList.addEventListener("click", function (event) {
    var editBtn = event.target.closest("[data-edit-bank-account-id]");
    if (editBtn) {
      var editId = editBtn.getAttribute("data-edit-bank-account-id");
      var account = bankAccounts.find(function (item) {
        return item.id === editId;
      });
      if (!account) return;
      editingBankAccountId = editId;
      editBankNameInput.value = account.name || "";
      editBankRoutingInput.value = account.routing || "";
      editBankAccountInput.value = account.accountNumber || "";
      editBankConfirmInput.value = account.accountNumber || "";
      editBankNicknameInput.value = account.nickname || "";
      fillEditBankAddress(account);
      editBankDefaultInput.checked = !!account.isDefault;
      if (typeof editBankDialog.showModal === "function")
        editBankDialog.showModal();
      return;
    }

    var deleteBtn = event.target.closest("[data-delete-bank-account-id]");
    if (deleteBtn) {
      var accountId = deleteBtn.getAttribute("data-delete-bank-account-id");
      var accountToDelete = bankAccounts.find(function (account) {
        return account.id === accountId;
      });
      openDeleteBankConfirm(accountToDelete);
    }
  });

  deleteBankConfirmBtn.addEventListener("click", function () {
    if (!pendingDeleteBankAccountId) return;
    var deletedAccount = bankAccounts.find(function (account) {
      return account.id === pendingDeleteBankAccountId;
    });
    bankAccounts = bankAccounts.filter(function (account) {
      return account.id !== pendingDeleteBankAccountId;
    });
    saveBankAccounts();
    renderAllViews();
    deleteBankConfirmDialog.close();
    notifyCrud(
      'Deleted bank account "' +
        (deletedAccount && deletedAccount.name
          ? deletedAccount.name
          : "Bank Account") +
        '".',
    );
  });

  checkList.addEventListener("click", function (event) {
    var editBtn = event.target.closest("[data-edit-check-address-id]");
    if (editBtn) {
      var editId = editBtn.getAttribute("data-edit-check-address-id");
      var address = checkAddresses.find(function (item) {
        return item.id === editId;
      });
      if (!address) return;
      editingCheckAddressId = editId;
      var parsed = parseCheckAddressForForm(address);
      editCheckNicknameInput.value = address.displayName || "";
      editCheckLine1Input.value = parsed.line1;
      editCheckLine2Input.value = parsed.line2;
      editCheckLine3Input.value = parsed.line3;
      editCheckCityInput.value = parsed.city;
      setCheckStateSelect(editCheckStateInput, parsed.state);
      editCheckZipInput.value = parsed.zip;
      editCheckCountrySelect.value = mapCountryNameToCode(parsed.country);
      updateEditCheckCountryFlag();
      if (typeof editCheckDialog.showModal === "function")
        editCheckDialog.showModal();
      return;
    }

    var deleteBtn = event.target.closest("[data-delete-check-address-id]");
    if (deleteBtn) {
      var addressId = deleteBtn.getAttribute("data-delete-check-address-id");
      var addressToDelete = checkAddresses.find(function (address) {
        return address.id === addressId;
      });
      openDeleteCheckConfirm(addressToDelete);
    }
  });

  deleteCheckConfirmBtn.addEventListener("click", function () {
    if (!pendingDeleteCheckAddressId) return;
    var deletedAddress = checkAddresses.find(function (address) {
      return address.id === pendingDeleteCheckAddressId;
    });
    checkAddresses = checkAddresses.filter(function (address) {
      return address.id !== pendingDeleteCheckAddressId;
    });
    saveCheckAddresses();
    renderAllViews();
    deleteCheckConfirmDialog.close();
    notifyCrud(
      'Deleted check address "' +
        (deletedAddress && deletedAddress.displayName
          ? deletedAddress.displayName
          : "Check Address") +
        '".',
    );
  });

  // ---- Bank account validation (Consumer Portal) -------------------------
  // Attempt 1 fails -> "one remaining attempt"; attempt 2 fails -> generic
  // error; attempt 3 fails -> no attempts left (account is added as locked).
  // The mock validator passes only a routing number with a valid ABA checksum.
  var BANK_VALIDATION_MIN_MS = 3000;
  var BANK_VALIDATION_MAX_MS = 7000;
  // Placeholder for Figma's [Customer Name] / [buyerEmailAddress].
  var BANK_VALIDATION_CONTACT = { name: "Optum Pay", email: "support@optumpay.com" };
  var bankValidationAttempts = 0;
  var bankValidationDialog = null;

  function isValidRoutingNumber(routing) {
    if (!/^\d{9}$/.test(routing)) return false;
    var w = [3, 7, 1, 3, 7, 1, 3, 7, 1];
    var sum = 0;
    for (var i = 0; i < 9; i++) sum += Number(routing[i]) * w[i];
    return sum % 10 === 0;
  }

  function getBankValidationDialog() {
    if (bankValidationDialog) return bankValidationDialog;
    var d = document.createElement("dialog");
    d.id = "pp-bank-validation-dialog";
    d.className =
      "m-auto w-[450px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-lg bg-white p-0 text-left shadow-xl backdrop:bg-gray-900/75 dark:bg-gray-900";
    d.addEventListener("cancel", function (event) {
      if (d.getAttribute("data-state") === "loading") event.preventDefault();
    });
    document.body.appendChild(d);
    bankValidationDialog = d;
    return d;
  }

  var VALIDATION_X_ICON =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="size-6" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>';
  var VALIDATION_WARNING_ICON =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="size-11 text-amber-500" aria-hidden="true"><path fill-rule="evenodd" clip-rule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495ZM10 5a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 10 5Zm0 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" /></svg>';
  var VALIDATION_ENVELOPE_ICON =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="size-11 text-blue-500" aria-hidden="true"><path d="M3 4a2 2 0 0 0-2 2v1.161l8.441 4.221a1.25 1.25 0 0 0 1.118 0L19 7.162V6a2 2 0 0 0-2-2H3Z" /><path d="m19 8.839-7.77 3.885a2.75 2.75 0 0 1-2.46 0L1 8.839V14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8.839Z" /></svg>';
  var VALIDATION_SPINNER =
    '<svg class="size-[34px] animate-spin" viewBox="0 0 34 34" fill="none" aria-hidden="true"><circle cx="17" cy="17" r="15" stroke="#E5E7EB" stroke-width="3" /><path d="M17 2a15 15 0 0 1 15 15" stroke="#2563EB" stroke-width="3" stroke-linecap="round" /></svg>';

  function renderBankValidationState(state, config) {
    var d = getBankValidationDialog();
    d.setAttribute("data-state", state);
    var btnBase =
      "w-full cursor-pointer rounded-md px-3.5 py-2.5 text-base font-semibold shadow-xs focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ";
    var html;
    if (state === "loading") {
      html =
        '<div class="flex flex-col items-center gap-6 px-6 py-9 text-center">' +
        VALIDATION_SPINNER +
        '<div class="flex w-full flex-col gap-2"><p class="text-lg/6 font-semibold text-gray-900 dark:text-white">Please Wait</p>' +
        '<p class="text-sm/5 font-normal text-gray-500 dark:text-gray-400">The account is being verified. This may take a few moments.</p></div></div>';
    } else {
      html =
        '<div class="flex h-14 items-end justify-end px-4 pt-4"><button type="button" data-validation-close aria-label="Close" class="flex size-10 cursor-pointer items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-500 dark:hover:bg-white/10">' +
        VALIDATION_X_ICON +
        "</button></div>" +
        '<div class="flex flex-col items-center gap-6 px-6 pt-3 pb-6 text-center">' +
        config.icon +
        '<div class="flex w-full flex-col gap-2"><p class="text-lg/6 font-semibold text-gray-900 dark:text-white">' +
        config.title +
        '</p><p class="text-base/6 font-normal text-gray-700 dark:text-gray-300">' +
        config.body +
        "</p></div></div>" +
        '<div class="' +
        (config.primary ? "border-t border-gray-200 px-6 py-5 dark:border-white/10" : "px-6 pb-6") +
        '"><button type="button" data-validation-action class="' +
        btnBase +
        (config.primary
          ? "bg-blue-600 text-white hover:bg-blue-500"
          : "bg-white text-gray-700 ring-1 ring-gray-300 ring-inset hover:bg-gray-50 dark:bg-white/5 dark:text-white dark:ring-white/10") +
        '">' +
        config.action +
        "</button></div>";
    }
    d.innerHTML = html;
    if (!d.open) d.showModal();
    var closeBtn = d.querySelector("[data-validation-close]");
    var actionBtn = d.querySelector("[data-validation-action]");
    if (closeBtn) closeBtn.addEventListener("click", config.onClose);
    if (actionBtn) actionBtn.addEventListener("click", config.onAction);
  }

  function runBankValidation(routingDigits, done) {
    var attempt = ++bankValidationAttempts;
    renderBankValidationState("loading", {});
    var delay =
      BANK_VALIDATION_MIN_MS +
      Math.random() * (BANK_VALIDATION_MAX_MS - BANK_VALIDATION_MIN_MS);
    setTimeout(function () {
      var d = getBankValidationDialog();
      if (isValidRoutingNumber(routingDigits)) {
        d.close();
        done("verified");
        return;
      }
      function backToDetails() {
        d.close();
        done("retry");
      }
      if (attempt >= 3) {
        var customer = BANK_VALIDATION_CONTACT.name;
        function closeAll() {
          d.close();
          done("locked");
        }
        renderBankValidationState("locked", {
          icon: VALIDATION_WARNING_ICON,
          title: "Unable to Verify Account Details",
          body:
            "There is a problem with the account details you provided. Please contact <strong class=\"font-semibold\">" +
            customer +
            "</strong> for details.",
          action: "Contact " + customer,
          primary: false,
          onClose: closeAll,
          onAction: function () {
            renderBankValidationState("notified", {
              icon: VALIDATION_ENVELOPE_ICON,
              title: "Thank you!",
              body:
                "We have notified your customer. If you have any questions, please contact <span class=\"font-medium\">" +
                customer +
                "</span> by emailing <span class=\"font-medium\">" +
                BANK_VALIDATION_CONTACT.email +
                "</span>, your reference code is <span class=\"font-medium\">" +
                "BV-" +
                Date.now().toString(36).toUpperCase() +
                "</span>.",
              action: "Close",
              primary: false,
              onClose: closeAll,
              onAction: closeAll,
            });
          },
        });
        return;
      }
      renderBankValidationState("error", {
        icon: VALIDATION_WARNING_ICON,
        title: "Unable to Verify Method of Payment",
        body:
          "The account and/or routing number provided could not be verified. Please review and try again." +
          (attempt === 1
            ? " You have one remaining attempt to validate your account."
            : ""),
        action: "Update",
        primary: true,
        onClose: backToDetails,
        onAction: backToDetails,
      });
    }, delay);
  }

  saveBtn.addEventListener("click", function () {
    var accountName = (nameInput.value || "").trim();
    var routingDigits = sanitizeDigits(routingInput.value, 9);
    var accountDigits = sanitizeDigits(accountInput.value, 12);
    var confirmDigits = sanitizeDigits(confirmAccountInput.value, 12);
    var nickname = (nicknameInput.value || "").trim();
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
      accountNumber: formatAccountNumber(accountDigits),
      address: buildAddBankAddress(),
      isDefault: !!addBankDefaultInput.checked,
    };
    function commitNewAccount(validationStatus) {
      if (validationStatus) newAccount.validationStatus = validationStatus;
      if (newAccount.isDefault)
        bankAccounts.forEach(function (item) {
          item.isDefault = false;
        });
      bankAccounts.push(newAccount);
      saveBankAccounts();
      renderAllViews();

      nameInput.value = "";
      routingInput.value = "";
      accountInput.value = "";
      confirmAccountInput.value = "";
      nicknameInput.value = "";
      bankValidationAttempts = 0;
      dialog.close();
    }

    // Consumer Portal: the account is validated before it is added.
    if (window.__ppConfig.dataset) {
      runBankValidation(routingDigits, function (outcome) {
        if (outcome === "verified") {
          commitNewAccount("verified");
          notifyCrud('Added bank account "' + newAccount.name + '".');
        } else if (outcome === "locked") {
          commitNewAccount("locked");
        }
      });
      return;
    }

    commitNewAccount();
    notifyCrud('Added bank account "' + newAccount.name + '".');
  });

  if (window.__ppConfig.dataset) {
    dialog.addEventListener("close", function () {
      // Closed while validation isn't mid-flight → the attempt session ends.
      if (!bankValidationDialog || !bankValidationDialog.open)
        bankValidationAttempts = 0;
    });
  }

  addCheckCountrySelect.addEventListener("change", updateAddCheckCountryFlag);
  addBankCountrySelect.addEventListener("change", updateAddBankCountryFlag);
  editCheckCountrySelect.addEventListener("change", updateEditCheckCountryFlag);

  editBankCountrySelect.addEventListener("change", updateEditBankCountryFlag);
  editBankRoutingInput.addEventListener("input", function () {
    editBankRoutingInput.value = sanitizeDigits(editBankRoutingInput.value, 9);
  });
  editBankAccountInput.addEventListener("input", function () {
    editBankAccountInput.value = formatAccountNumber(
      editBankAccountInput.value,
    );
  });
  editBankConfirmInput.addEventListener("input", function () {
    editBankConfirmInput.value = formatAccountNumber(
      editBankConfirmInput.value,
    );
  });

  editBankSaveBtn.addEventListener("click", function () {
    if (!editingBankAccountId) return;
    var account = bankAccounts.find(function (item) {
      return item.id === editingBankAccountId;
    });
    if (!account) return;

    var accountName = (editBankNameInput.value || "").trim();
    var nickname = (editBankNicknameInput.value || "").trim();
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
    account.address = buildEditBankAddress();
    if (editBankDefaultInput.checked)
      bankAccounts.forEach(function (item) {
        item.isDefault = item.id === account.id;
      });
    else account.isDefault = false;
    if (accountDigits) {
      account.accountNumber = formatAccountNumber(accountDigits);
      account.last4 = accountDigits.slice(-4);
    }

    saveBankAccounts();
    renderAllViews();
    editBankDialog.close();
    notifyCrud('Updated bank account "' + account.name + '".');
  });

  editCheckSaveBtn.addEventListener("click", function () {
    if (!editingCheckAddressId) return;
    var address = checkAddresses.find(function (item) {
      return item.id === editingCheckAddressId;
    });
    if (!address) return;

    var nickname = (editCheckNicknameInput.value || "").trim();
    var line1 = (editCheckLine1Input.value || "").trim();
    var line2 = (editCheckLine2Input.value || "").trim();
    var line3 = (editCheckLine3Input.value || "").trim();
    var city = (editCheckCityInput.value || "").trim();
    var state = (editCheckStateInput.value || "").trim();
    var zip = (editCheckZipInput.value || "").trim();
    var countryName = editCheckCountrySelect.options[
      editCheckCountrySelect.selectedIndex
    ]
      ? editCheckCountrySelect.options[editCheckCountrySelect.selectedIndex]
          .text
      : "United States";
    var cityState = [city, state].filter(Boolean).join(", ");

    if (!nickname || !line1 || !city || !state || !zip) return;

    var companyName = (address.name || "Nexus Financial Group").trim();
    var addressLines = [companyName, line1];
    if (line2) addressLines.push(line2);
    if (line3) addressLines.push(line3);
    addressLines.push(cityState + " " + zip);
    addressLines.push(countryName);

    address.displayName = nickname;
    address.name = companyName;
    address.address = addressLines.join("\n");
    address.cityState = cityState;
    address.summary = [line1, cityState, zip].filter(Boolean).join(", ");

    saveCheckAddresses();
    renderAllViews();
    editCheckDialog.close();
    notifyCrud('Updated check address "' + address.displayName + '".');
  });

  addCheckSaveBtn.addEventListener("click", function () {
    var nickname = (addCheckNicknameInput.value || "").trim();
    var line1 = (addCheckLine1Input.value || "").trim();
    var line2 = (addCheckLine2Input.value || "").trim();
    var line3 = (addCheckLine3Input.value || "").trim();
    var city = (addCheckCityInput.value || "").trim();
    var state = (addCheckStateInput.value || "").trim();
    var zip = (addCheckZipInput.value || "").trim();
    var countryName = addCheckCountrySelect.options[
      addCheckCountrySelect.selectedIndex
    ]
      ? addCheckCountrySelect.options[addCheckCountrySelect.selectedIndex].text
      : "United States";
    var cityState = [city, state].filter(Boolean).join(", ");

    if (!nickname || !line1 || !city || !state || !zip) return;

    var addressLines = ["Nexus Financial Group", line1];
    if (line2) addressLines.push(line2);
    if (line3) addressLines.push(line3);
    addressLines.push(cityState + " " + zip);
    addressLines.push(countryName);

    var newAddress = {
      id: createAddressId(nickname, cityState),
      displayName: nickname,
      name: "Nexus Financial Group",
      address: addressLines.join("\n"),
      cityState: cityState,
      summary: [line1, cityState, zip].filter(Boolean).join(", "),
    };

    checkAddresses.push(newAddress);
    saveCheckAddresses();
    renderAllViews();
    resetAddCheckForm();
    addCheckDialog.close();
    notifyCrud('Added check address "' + newAddress.displayName + '".');
  });

  document
    .querySelectorAll(
      '[command="show-modal"][commandfor="pp-add-bank-account-dialog"]',
    )
    .forEach(function (btn) {
      btn.addEventListener("click", prefillAddBankForm);
    });
  document
    .querySelectorAll(
      '[command="show-modal"][commandfor="pp-add-check-dialog"]',
    )
    .forEach(function (btn) {
      btn.addEventListener("click", resetAddCheckForm);
    });

  dialog.addEventListener("close", prefillAddBankForm);
  addCheckDialog.addEventListener("close", resetAddCheckForm);
  editBankDialog.addEventListener("close", function () {
    editingBankAccountId = "";
  });
  editCheckDialog.addEventListener("close", function () {
    editingCheckAddressId = "";
  });
  deleteBankConfirmDialog.addEventListener("close", function () {
    pendingDeleteBankAccountId = "";
  });
  deleteCheckConfirmDialog.addEventListener("close", function () {
    pendingDeleteCheckAddressId = "";
  });
  prefillAddBankForm();
  resetAddCheckForm();
  updateAddCheckCountryFlag();
  updateEditCheckCountryFlag();

  initializeSharedData();
})();

(function () {
  var enableDialog = document.getElementById("pp-enable-stp-dialog");
  var nextStepsDialog = document.getElementById("pp-stp-next-steps-dialog");
  var verifyDialog = document.getElementById("pp-verify-deposit-dialog");
  var verifySuccessDialog = document.getElementById("pp-verify-success-dialog");
  var agreementCheckbox = document.getElementById("pp-stp-agreement-checkbox");
  var enableConfirmBtn = document.getElementById("pp-enable-stp-confirm-btn");
  var input = document.getElementById("pp-deposit-amount");
  var verifyBtn = document.getElementById("pp-verify-deposit-btn");
  var verifyCancelBtn = document.getElementById("pp-verify-deposit-cancel-btn");
  var verifyCloseBtn = document.getElementById("pp-verify-deposit-close-btn");
  var errorMsg = document.getElementById("pp-deposit-amount-error");
  var errorIcon = document.getElementById("pp-deposit-amount-error-icon");
  var stpOptInBtn = document.getElementById("pp-stp-opt-in-btn");
  var stpCardContainer = document.getElementById("pp-stp-card-container");
  var stpActionsWrap = document.getElementById("pp-stp-actions-wrap");
  var stpLearnMoreMenuBtn = document.getElementById(
    "pp-stp-learn-more-menu-btn",
  );
  var stpOptOutMenuBtn = document.getElementById("pp-stp-opt-out-menu-btn");
  var stpOptOutConfirmDialog = document.getElementById(
    "pp-stp-opt-out-confirm-dialog",
  );
  var stpOptOutConfirmBtn = document.getElementById(
    "pp-stp-opt-out-confirm-btn",
  );
  var stpStatusBadge = document.getElementById("pp-stp-status-badge");
  var stpInlineVerifyAlert = document.getElementById(
    "pp-stp-inline-verify-alert",
  );
  var stpInlineVerifyBtn = document.getElementById("pp-stp-inline-verify-btn");
  var stpInlineLearnMoreBtn = document.getElementById(
    "pp-stp-inline-learn-more-btn",
  );
  var stpFullyAutomatedWrap = document.getElementById(
    "pp-stp-fully-automated-wrap",
  );
  var stpFullyAutomatedRow = document.getElementById(
    "pp-stp-fully-automated-row",
  );
  var stpFullyAutomatedToggle = document.getElementById(
    "pp-stp-fully-automated-toggle",
  );
  var verifySuccessDoneBtn = document.getElementById(
    "pp-verify-success-done-btn",
  );
  var stpDescription = document.getElementById("pp-stp-description");
  var stpDefaultDescription = stpDescription
    ? stpDescription.textContent.replace(/\s+/g, " ").trim()
    : "";
  var stpAgreementReviewBtn = document.getElementById(
    "pp-stp-agreement-review-btn",
  );
  var sendAgreementDialog = document.getElementById(
    "pp-stp-send-agreement-dialog",
  );
  var sendAgreementForm = document.getElementById("pp-stp-send-agreement-form");
  var sendAgreementEmailInput = document.getElementById(
    "pp-stp-agreement-email",
  );
  var sendAgreementHelp = document.getElementById(
    "pp-stp-agreement-email-help",
  );
  var sendAgreementError = document.getElementById(
    "pp-stp-agreement-email-error",
  );
  var sendAgreementBtn = document.getElementById("pp-stp-send-agreement-btn");
  var isSendingAgreement = false;
  var stpTerminalImages = Array.prototype.slice.call(
    document.querySelectorAll("[data-stp-terminal-image]"),
  );
  if (
    !agreementCheckbox ||
    !enableConfirmBtn ||
    !input ||
    !verifyBtn ||
    !errorMsg ||
    !errorIcon
  )
    return;
  var hasError = false;
  var isVerifyingDeposit = false;
  var stpAnimationCycleTimer = null;
  var stpDotTimers = [];
  var stpFullyAutoGuideActive = false;
  var stpFullyAutoGuideOverlay = null;
  var stpFullyAutoGuideTooltip = null;
  var stpFullyAutoGuideHighlight = null;
  var STP_ENABLED_CLASS =
    "inline-flex w-full items-center justify-center rounded-md bg-green-600 px-2 py-1 text-sm font-semibold leading-5 text-white shadow-xs cursor-default sm:w-auto";
  var STP_DISABLED_CLASS =
    "inline-flex w-full items-center justify-center rounded-md bg-blue-600 px-2 py-1 text-sm font-semibold leading-5 text-white shadow-xs hover:bg-blue-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 cursor-pointer sm:w-auto";

  var TERMINAL_BASE_SRC = "../../../src/assets/illustrations/terminal.svg";
  var TERMINAL_PROGRESS_SRCS = [
    "../../../src/assets/illustrations/terminal-dot1.svg",
    "../../../src/assets/illustrations/terminal-dot2.svg",
    "../../../src/assets/illustrations/terminal-dot3.svg",
    "../../../src/assets/illustrations/terminal-dot4.svg",
  ];
  function readDialogMs(varName, fallback) {
    if (!enableDialog) return fallback;
    var raw = getComputedStyle(enableDialog).getPropertyValue(varName).trim();
    var parsed = parseInt(raw, 10);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  function getAnimationConfig() {
    return {
      loopMs: readDialogMs("--pp-stp-loop-ms", 8000),
      dotSequenceMs: [
        readDialogMs("--pp-stp-dot-1-ms", 2700),
        readDialogMs("--pp-stp-dot-2-ms", 2820),
        readDialogMs("--pp-stp-dot-3-ms", 2940),
        readDialogMs("--pp-stp-dot-4-ms", 3060),
      ],
      dotResetMs: readDialogMs("--pp-stp-dot-reset-ms", 7000),
    };
  }

  function clearTerminalDotTimers() {
    stpDotTimers.forEach(function (timer) {
      clearTimeout(timer);
    });
    stpDotTimers = [];
  }

  function stopStpCardAnimationLoop() {
    clearTerminalDotTimers();
    if (stpAnimationCycleTimer) {
      clearTimeout(stpAnimationCycleTimer);
      stpAnimationCycleTimer = null;
    }
    if (enableDialog) enableDialog.removeAttribute("data-card-animating");
    setTerminalStep(0);
  }

  function setTerminalStep(step) {
    if (!stpTerminalImages.length) return;
    stpTerminalImages.forEach(function (img) {
      if (step <= 0) {
        img.src = TERMINAL_BASE_SRC;
        return;
      }
      img.src =
        TERMINAL_PROGRESS_SRCS[
          Math.min(step, TERMINAL_PROGRESS_SRCS.length) - 1
        ];
    });
  }

  function runTerminalDotCycle(config) {
    clearTerminalDotTimers();
    setTerminalStep(0);

    config.dotSequenceMs.forEach(function (ms, index) {
      stpDotTimers.push(
        setTimeout(function () {
          if (!enableDialog.open) return;
          setTerminalStep(index + 1);
        }, ms),
      );
    });

    stpDotTimers.push(
      setTimeout(function () {
        if (!enableDialog.open) return;
        setTerminalStep(0);
      }, config.dotResetMs),
    );
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
    activeDialog.removeAttribute("data-card-animating");
    void activeDialog.offsetWidth;
    activeDialog.setAttribute("data-card-animating", "true");
    runStpCardAnimationCycle(activeDialog);
  }

  function updateEnableState() {
    enableConfirmBtn.disabled = !agreementCheckbox.checked;
  }

  function setError(show) {
    hasError = show;
    input.setAttribute("aria-invalid", show ? "true" : "false");
    errorMsg.classList.toggle("hidden", !show);
    errorIcon.classList.toggle("hidden", !show);
    input.classList.toggle("text-red-900", show);
    input.classList.toggle("outline-red-300", show);
    input.classList.toggle("placeholder:text-red-300", show);
    input.classList.toggle("focus:outline-red-600", show);
    input.classList.toggle("dark:text-red-300", show);
    input.classList.toggle("dark:outline-red-500/40", show);
    input.classList.toggle("dark:placeholder:text-red-400/70", show);
    input.classList.toggle("dark:focus:outline-red-500", show);
  }

  function updateVerifyState() {
    if (isVerifyingDeposit) {
      verifyBtn.disabled = true;
      return;
    }
    verifyBtn.disabled = hasError || !/\d/.test(input.value);
  }

  function setVerifyLoading(loading) {
    isVerifyingDeposit = !!loading;
    if (verifyCancelBtn) verifyCancelBtn.disabled = loading;
    if (verifyCloseBtn) verifyCloseBtn.disabled = loading;
    if (verifyBtn) {
      if (loading) {
        verifyBtn.disabled = true;
        verifyBtn.classList.add("bg-indigo-500");
        verifyBtn.classList.remove("hover:bg-blue-500");
        verifyBtn.innerHTML =
          '<span class="inline-flex items-center whitespace-nowrap">' +
          '<svg class="mr-3 size-5 animate-spin text-white" viewBox="0 0 24 24" fill="none" aria-hidden="true">' +
          '<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3"></circle>' +
          '<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8v3a5 5 0 0 0-5 5H4Z"></path>' +
          "</svg>" +
          "<span>Verifying...</span>" +
          "</span>";
      } else {
        verifyBtn.classList.remove("bg-indigo-500");
        verifyBtn.classList.add("hover:bg-blue-500");
        verifyBtn.textContent = "Verify";
      }
    }
  }

  function sanitizeDecimal(raw) {
    var cleaned = raw.replace(/[^0-9.]/g, "");
    var firstDot = cleaned.indexOf(".");
    if (firstDot === -1) return cleaned;
    return (
      cleaned.slice(0, firstDot + 1) +
      cleaned.slice(firstDot + 1).replace(/\./g, "")
    );
  }

  function closeFullyAutomatedGuide() {
    if (stpFullyAutoGuideOverlay) stpFullyAutoGuideOverlay.style.opacity = "0";
    if (stpFullyAutoGuideTooltip) {
      stpFullyAutoGuideTooltip.style.opacity = "0";
      stpFullyAutoGuideTooltip.style.transform = "translateX(-10px)";
    }
    if (stpFullyAutoGuideHighlight)
      stpFullyAutoGuideHighlight.style.opacity = "0";
    var overlayToRemove = stpFullyAutoGuideOverlay;
    var tooltipToRemove = stpFullyAutoGuideTooltip;
    var highlightToRemove = stpFullyAutoGuideHighlight;
    window.setTimeout(function () {
      if (overlayToRemove && overlayToRemove.parentNode)
        overlayToRemove.parentNode.removeChild(overlayToRemove);
      if (tooltipToRemove && tooltipToRemove.parentNode)
        tooltipToRemove.parentNode.removeChild(tooltipToRemove);
      if (highlightToRemove && highlightToRemove.parentNode)
        highlightToRemove.parentNode.removeChild(highlightToRemove);
    }, 220);
    stpFullyAutoGuideOverlay = null;
    stpFullyAutoGuideTooltip = null;
    stpFullyAutoGuideHighlight = null;
    stpFullyAutoGuideActive = false;
    if (stpFullyAutomatedRow) {
      stpFullyAutomatedRow.classList.remove(
        "relative",
        "z-[235]",
        "bg-white",
        "rounded-[8px]",
        "px-2",
        "py-2",
      );
    }
    window.removeEventListener("resize", positionFullyAutomatedGuide);
    window.removeEventListener("scroll", positionFullyAutomatedGuide, true);
  }

  function positionFullyAutomatedGuide() {
    if (
      !stpFullyAutoGuideActive ||
      !stpFullyAutomatedRow ||
      !stpFullyAutoGuideTooltip ||
      !stpFullyAutoGuideHighlight
    )
      return;
    var rect = stpFullyAutomatedRow.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    var pad = 8;
    stpFullyAutoGuideHighlight.style.left = Math.max(8, rect.left - pad) + "px";
    stpFullyAutoGuideHighlight.style.top = Math.max(8, rect.top - pad) + "px";
    stpFullyAutoGuideHighlight.style.width =
      Math.min(window.innerWidth - 16, rect.width + pad * 2) + "px";
    stpFullyAutoGuideHighlight.style.height = rect.height + pad * 2 + "px";

    stpFullyAutoGuideTooltip.style.left = "-9999px";
    stpFullyAutoGuideTooltip.style.top = "-9999px";
    stpFullyAutoGuideTooltip.style.visibility = "hidden";
    stpFullyAutoGuideTooltip.style.display = "block";
    var tooltipRect = stpFullyAutoGuideTooltip.getBoundingClientRect();
    var left = rect.left + rect.width / 2 - tooltipRect.width / 2;
    left = Math.max(
      16,
      Math.min(left, window.innerWidth - tooltipRect.width - 16),
    );
    var top = rect.bottom + 18;
    top = Math.min(top, window.innerHeight - tooltipRect.height - 16);
    stpFullyAutoGuideTooltip.style.left = left + "px";
    stpFullyAutoGuideTooltip.style.top = top + "px";
    stpFullyAutoGuideTooltip.style.visibility = "visible";
  }

  function openFullyAutomatedGuide() {
    if (!stpFullyAutomatedRow || stpFullyAutoGuideActive) return;
    stpFullyAutoGuideActive = true;

    var overlay = document.createElement("div");
    overlay.className =
      "fixed inset-0 z-[220] bg-gray-900/75 transition-opacity duration-300 ease-out motion-reduce:transition-none";
    overlay.setAttribute("data-stp-fully-auto-guide-overlay", "true");
    overlay.style.opacity = "0";

    var highlight = document.createElement("div");
    highlight.className =
      "fixed z-[230] rounded-[8px] border-2 border-blue-600 bg-transparent pointer-events-none transition-opacity duration-300 ease-out motion-reduce:transition-none";
    highlight.setAttribute("data-stp-fully-auto-guide-highlight", "true");
    highlight.style.opacity = "0";

    var tooltip = document.createElement("div");
    tooltip.className =
      "fixed z-[240] w-[413px] max-w-[calc(100vw-32px)] transition-[opacity,transform] duration-400 ease-out motion-reduce:transition-none";
    tooltip.setAttribute("data-stp-fully-auto-guide-tooltip", "true");
    tooltip.style.opacity = "0";
    tooltip.style.transform = "translateX(-10px)";
    tooltip.innerHTML =
      '<div class="relative rounded-lg border border-gray-300 bg-gray-50 p-4 shadow-sm dark:border-white/10 dark:bg-gray-800">' +
      '<span class="pointer-events-none absolute -top-1 left-1/2 h-2.5 w-2.5 -translate-x-1/2 rotate-45 border-t border-l border-gray-300 bg-gray-50 dark:border-white/10 dark:bg-gray-800"></span>' +
      '<div class="flex items-start justify-between gap-4">' +
      '<div class="min-w-0">' +
      '<p class="text-sm font-semibold leading-5 text-gray-900 dark:text-gray-100">Automatic Card Processing is Set Up</p>' +
      '<p class="mt-1 text-sm font-normal leading-5 text-gray-600 dark:text-gray-300">Enable Fully Automated to let the system process payments automatically by card. The "Get Paid" step will only appear when documents or signatures are required</p>' +
      "</div>" +
      "</div>" +
      '<div class="mt-4 flex items-center justify-end gap-2">' +
      '<button type="button" data-stp-fully-auto-guide-skip class="inline-flex items-center rounded-md px-2 py-1 text-sm font-semibold text-gray-700 hover:bg-gray-900/10 dark:text-gray-300 dark:hover:bg-gray-900/10">Skip for now</button>' +
      '<button type="button" data-stp-fully-auto-guide-enable class="rounded bg-blue-600 px-2 py-1 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600">Enable</button>' +
      "</div>" +
      "</div>";

    document.body.appendChild(overlay);
    document.body.appendChild(highlight);
    document.body.appendChild(tooltip);

    stpFullyAutoGuideOverlay = overlay;
    stpFullyAutoGuideTooltip = tooltip;
    stpFullyAutoGuideHighlight = highlight;
    stpFullyAutomatedRow.classList.add(
      "relative",
      "z-[235]",
      "bg-white",
      "rounded-[8px]",
      "px-2",
      "py-2",
    );

    function enableFullyAutomated() {
      if (!stpFullyAutomatedToggle) return;
      if (!stpFullyAutomatedToggle.checked) {
        stpFullyAutomatedToggle.checked = true;
        stpFullyAutomatedToggle.dispatchEvent(
          new Event("input", { bubbles: true }),
        );
        stpFullyAutomatedToggle.dispatchEvent(
          new Event("change", { bubbles: true }),
        );
      }
    }

    var skipBtn = tooltip.querySelector("[data-stp-fully-auto-guide-skip]");
    var enableBtn = tooltip.querySelector("[data-stp-fully-auto-guide-enable]");
    if (skipBtn) skipBtn.addEventListener("click", closeFullyAutomatedGuide);
    if (enableBtn) {
      enableBtn.addEventListener("click", function () {
        enableFullyAutomated();
        closeFullyAutomatedGuide();
      });
    }

    window.addEventListener("resize", positionFullyAutomatedGuide);
    window.addEventListener("scroll", positionFullyAutomatedGuide, true);
    positionFullyAutomatedGuide();
    window.requestAnimationFrame(function () {
      if (stpFullyAutoGuideOverlay)
        stpFullyAutoGuideOverlay.style.opacity = "1";
      if (stpFullyAutoGuideHighlight)
        stpFullyAutoGuideHighlight.style.opacity = "1";
      var reducedMotion =
        window.matchMedia &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (!stpFullyAutoGuideTooltip) return;
      if (reducedMotion) {
        stpFullyAutoGuideTooltip.style.opacity = "1";
        stpFullyAutoGuideTooltip.style.transform = "translateX(0)";
      } else {
        window.setTimeout(function () {
          if (!stpFullyAutoGuideTooltip || !stpFullyAutoGuideActive) return;
          stpFullyAutoGuideTooltip.style.opacity = "1";
          stpFullyAutoGuideTooltip.style.transform = "translateX(0)";
        }, 500);
      }
    });
  }

  function openNextStepsModal() {
    if (enableDialog && enableDialog.open) {
      try {
        enableDialog.close();
      } catch (err) {
        /* noop */
      }
    }
    setTimeout(function () {
      if (window.STPState && typeof window.STPState.setStpStep === "function") {
        window.STPState.setStpStep("terminal_completed_tid_mid_received");
      } else if (
        window.STPState &&
        typeof window.STPState.setStpStatus === "function"
      ) {
        window.STPState.setStpStatus("in_progress");
      }
      if (
        nextStepsDialog &&
        typeof nextStepsDialog.showModal === "function" &&
        !nextStepsDialog.open
      ) {
        nextStepsDialog.showModal();
      }
    }, 0);
  }

  function openEnableStep() {
    if (!enableDialog || typeof enableDialog.showModal !== "function") return;
    if (!enableDialog.open) {
      try {
        enableDialog.showModal();
      } catch (err) {
        /* noop */
      }
    } else {
      requestAnimationFrame(function () {
        startStpCardAnimationLoop(enableDialog);
      });
    }
  }

  function applyStpUi(status, state) {
    if (!stpOptInBtn) return;
    var stpStep = state && state.stpStep ? String(state.stpStep) : "";
    var showOptIn = status === "disabled" && stpStep === "opt_in_required";
    var showInlineVerify =
      status === "in_progress" && stpStep === "bank_verification_required";
    var isAgreementPending =
      status === "in_progress" && stpStep === "agreement_signature_pending";
    var isEnabled = status === "enabled";
    if (stpDescription) {
      stpDescription.textContent = isAgreementPending
        ? "To complete enablement of automatic card processing, signature for Visa agreement is required."
        : stpDefaultDescription;
    }
    if (stpAgreementReviewBtn) {
      stpAgreementReviewBtn.classList.toggle("hidden", !isAgreementPending);
      stpAgreementReviewBtn.classList.toggle("inline-flex", isAgreementPending);
    }
    if (stpLearnMoreMenuBtn) {
      stpLearnMoreMenuBtn.textContent = isEnabled
        ? "Changed payment processors"
        : "Learn more";
    }
    if (stpStatusBadge) {
      var showStatusBadge = status === "in_progress" || status === "enabled";
      stpStatusBadge.hidden = !showStatusBadge;
      if (isAgreementPending) {
        stpStatusBadge.textContent = "Pending Agreement Signature";
        stpStatusBadge.className =
          "inline-flex items-center rounded-full border border-yellow-200 bg-yellow-100 px-2 py-0.5 text-xs leading-4 font-medium text-yellow-800 dark:border-yellow-400/30 dark:bg-yellow-400/10 dark:text-yellow-300";
      } else if (showInlineVerify) {
        stpStatusBadge.textContent = "Action Required";
        stpStatusBadge.className =
          "inline-flex items-center rounded-full border border-yellow-200 bg-yellow-100 px-2 py-0.5 text-xs leading-4 font-medium text-yellow-800 dark:border-yellow-400/30 dark:bg-yellow-400/10 dark:text-yellow-300";
      } else if (status === "enabled") {
        stpStatusBadge.textContent = "Enabled";
        stpStatusBadge.className =
          "inline-flex items-center rounded-full border border-green-200 bg-green-100 px-2 py-0.5 text-xs leading-4 font-medium text-green-800 dark:border-green-400/30 dark:bg-green-400/10 dark:text-green-300";
      } else {
        stpStatusBadge.textContent = "Enabling pending";
        stpStatusBadge.className =
          "inline-flex items-center rounded-md bg-gray-50 px-2 py-1 text-xs font-medium text-gray-600 ring-1 ring-inset ring-gray-500/10 dark:bg-white/5 dark:text-gray-300 dark:ring-white/15";
      }
      stpStatusBadge.classList.toggle("hidden", !showStatusBadge);
    }
    if (stpActionsWrap) {
      stpActionsWrap.classList.toggle(
        "hidden",
        showOptIn || isAgreementPending,
      );
    }
    if (stpInlineVerifyAlert) {
      stpInlineVerifyAlert.classList.toggle("hidden", !showInlineVerify);
      syncStpVerifyDate(showInlineVerify);
    }
    if (stpFullyAutomatedWrap) {
      stpFullyAutomatedWrap.classList.toggle("hidden", !isEnabled);
    }
    if (!showOptIn) {
      stpOptInBtn.hidden = true;
      stpOptInBtn.classList.add("hidden");
      return;
    }
    stpOptInBtn.hidden = false;
    stpOptInBtn.textContent = "Opt in";
    stpOptInBtn.disabled = false;
    stpOptInBtn.classList.remove("hidden");
    stpOptInBtn.className = STP_DISABLED_CLASS;
  }

  // The STP state has no start date, so remember when verification was first
  // requested on this device and show it as "Date initiated".
  var STP_VERIFY_DATE_KEY = "pp-stp-verify-initiated-at";

  function syncStpVerifyDate(isVisible) {
    var dateEl = document.getElementById("pp-stp-inline-verify-date");
    if (!dateEl) return;
    var stored = "";
    try {
      stored = localStorage.getItem(STP_VERIFY_DATE_KEY) || "";
      if (isVisible && !stored) {
        stored = new Date().toISOString();
        localStorage.setItem(STP_VERIFY_DATE_KEY, stored);
      } else if (!isVisible && stored) {
        localStorage.removeItem(STP_VERIFY_DATE_KEY);
        stored = "";
      }
    } catch (err) {
      /* storage unavailable */
    }
    var date = stored ? new Date(stored) : null;
    var hasDate = !!(isVisible && date && !isNaN(date.getTime()));
    dateEl.textContent = hasDate
      ? "Date initiated: " +
        date.toLocaleDateString("en-US", {
          month: "long",
          day: "numeric",
          year: "numeric",
        })
      : "";
    dateEl.classList.toggle("hidden", !hasDate);
  }

  function syncStpStatus(status, state) {
    applyStpUi(status, state);
  }

  function setSendAgreementError(message) {
    if (!sendAgreementError) return;
    sendAgreementError.textContent = message || "";
    sendAgreementError.classList.toggle("hidden", !message);
  }

  function setSendAgreementLoading(loading) {
    isSendingAgreement = !!loading;
    if (!sendAgreementBtn) return;
    sendAgreementBtn.disabled = isSendingAgreement;
    sendAgreementBtn.textContent = isSendingAgreement
      ? "Sending..."
      : "Send agreement";
  }

  // Same rule as SMART Disburse test emails: only allowlisted addresses
  // receive a real email.
  function updateSendAgreementHelp() {
    if (!sendAgreementHelp || !sendAgreementEmailInput) return;
    var email = sendAgreementEmailInput.value.trim();
    if (
      !email ||
      !window.STPState ||
      typeof window.STPState.isAllowlistedEmail !== "function"
    ) {
      sendAgreementHelp.textContent =
        "Test mode: only allowlisted addresses receive the email.";
      return;
    }
    window.STPState.isAllowlistedEmail(email).then(function (allowed) {
      if (sendAgreementEmailInput.value.trim() !== email) return;
      sendAgreementHelp.textContent = allowed
        ? "Test mode: this address is allowlisted and will receive the email."
        : "Test mode: this address is not allowlisted, so no email will be sent.";
    });
  }

  function prefillSendAgreementEmail() {
    if (!sendAgreementEmailInput || sendAgreementEmailInput.value.trim()) {
      updateSendAgreementHelp();
      return;
    }
    var request =
      window.STPState &&
      typeof window.STPState.getAgreementRequest === "function"
        ? window.STPState.getAgreementRequest()
        : null;
    if (request && request.email) {
      sendAgreementEmailInput.value = request.email;
      updateSendAgreementHelp();
      return;
    }
    if (typeof window.getMyCompanyProfile !== "function") {
      updateSendAgreementHelp();
      return;
    }
    window
      .getMyCompanyProfile()
      .then(function (profile) {
        var email =
          (profile && profile.contact && profile.contact.email) ||
          (profile && profile.businessEmail) ||
          "";
        if (email && !sendAgreementEmailInput.value.trim()) {
          sendAgreementEmailInput.value = email;
        }
      })
      .catch(function () {})
      .then(updateSendAgreementHelp);
  }

  if (sendAgreementDialog) {
    var sendAgreementObserver = new MutationObserver(function () {
      if (!sendAgreementDialog.open) return;
      setSendAgreementError("");
      setSendAgreementLoading(false);
      prefillSendAgreementEmail();
    });
    sendAgreementObserver.observe(sendAgreementDialog, {
      attributes: true,
      attributeFilter: ["open"],
    });
    sendAgreementDialog.addEventListener("cancel", function (event) {
      if (isSendingAgreement) event.preventDefault();
    });
  }
  if (sendAgreementEmailInput) {
    sendAgreementEmailInput.addEventListener("input", function () {
      setSendAgreementError("");
      updateSendAgreementHelp();
    });
  }
  if (sendAgreementForm) {
    sendAgreementForm.addEventListener("submit", function (event) {
      event.preventDefault();
      if (isSendingAgreement) return;
      if (
        !window.STPState ||
        typeof window.STPState.sendAgreementEmail !== "function"
      )
        return;
      var email = sendAgreementEmailInput
        ? sendAgreementEmailInput.value.trim()
        : "";
      setSendAgreementError("");
      setSendAgreementLoading(true);
      Promise.resolve(
        typeof window.getMyCompanyProfile === "function"
          ? window.getMyCompanyProfile().catch(function () {
              return null;
            })
          : null,
      )
        .then(function (profile) {
          return window.STPState.sendAgreementEmail({
            email: email,
            recipientName:
              (profile &&
                profile.contact &&
                profile.contact.email &&
                profile.contact.email.toLowerCase() === email.toLowerCase() &&
                profile.contact.name) ||
              "",
            senderName:
              (profile && (profile.legalName || profile.dbaName)) ||
              "SMART Hub",
          });
        })
        .then(function (result) {
          setSendAgreementLoading(false);
          if (sendAgreementDialog && sendAgreementDialog.open)
            sendAgreementDialog.close();
          if (typeof window.showGlobalTopToast === "function") {
            window.showGlobalTopToast(
              result.delivered
                ? "Visa agreement sent to " + result.email + "."
                : result.allowed
                  ? "Visa agreement request created for " +
                      result.email +
                      ". Live email sending is not enabled for this environment."
                  : result.email +
                      " is not allowlisted, so no email was sent.",
            );
          }
        })
        .catch(function (error) {
          setSendAgreementLoading(false);
          setSendAgreementError(
            (error && error.message) || "Failed to send the Visa agreement.",
          );
        });
    });
  }
  if (stpAgreementReviewBtn) {
    stpAgreementReviewBtn.addEventListener("click", function () {
      if (
        window.STPState &&
        typeof window.STPState.openAgreementReviewModal === "function"
      ) {
        window.STPState.openAgreementReviewModal();
      } else {
        openEnableStep();
      }
    });
  }

  agreementCheckbox.addEventListener("change", updateEnableState);
  enableConfirmBtn.addEventListener("click", function () {
    if (enableConfirmBtn.disabled) return;
    openNextStepsModal();
  });
  if (stpOptInBtn) {
    stpOptInBtn.addEventListener("click", function () {
      if (stpOptInBtn.disabled) return;
      if (
        window.STPState &&
        typeof window.STPState.openOptInModal === "function"
      ) {
        window.STPState.openOptInModal();
      } else {
        openEnableStep();
      }
    });
  }
  if (
    stpOptOutMenuBtn &&
    stpOptOutConfirmDialog &&
    typeof stpOptOutConfirmDialog.showModal === "function"
  ) {
    stpOptOutMenuBtn.addEventListener("click", function () {
      stpOptOutConfirmDialog.showModal();
    });
  }
  if (stpLearnMoreMenuBtn) {
    stpLearnMoreMenuBtn.addEventListener("click", function () {
      if (
        window.STPState &&
        typeof window.STPState.getStpStatus === "function" &&
        window.STPState.getStpStatus() === "enabled"
      ) {
        return;
      }
      if (
        window.STPState &&
        typeof window.STPState.openSetupStepsModal === "function"
      ) {
        window.STPState.openSetupStepsModal();
        return;
      }
      if (
        nextStepsDialog &&
        typeof nextStepsDialog.showModal === "function" &&
        !nextStepsDialog.open
      ) {
        nextStepsDialog.showModal();
      }
    });
  }
  if (stpInlineVerifyBtn) {
    stpInlineVerifyBtn.addEventListener("click", function () {
      if (
        window.STPState &&
        typeof window.STPState.openVerifyModal === "function"
      ) {
        window.STPState.openVerifyModal();
        return;
      }
      if (
        verifyDialog &&
        typeof verifyDialog.showModal === "function" &&
        !verifyDialog.open
      ) {
        verifyDialog.showModal();
      }
    });
  }
  if (stpInlineLearnMoreBtn) {
    stpInlineLearnMoreBtn.addEventListener("click", function () {
      if (
        window.STPState &&
        typeof window.STPState.openSetupStepsModal === "function"
      ) {
        window.STPState.openSetupStepsModal();
        return;
      }
      if (
        nextStepsDialog &&
        typeof nextStepsDialog.showModal === "function" &&
        !nextStepsDialog.open
      ) {
        nextStepsDialog.showModal();
      }
    });
  }
  if (verifySuccessDoneBtn) {
    verifySuccessDoneBtn.addEventListener("click", function () {
      setTimeout(function () {
        openFullyAutomatedGuide();
      }, 0);
    });
  }
  if (stpFullyAutomatedToggle) {
    stpFullyAutomatedToggle.addEventListener("change", function () {
      if (
        window.showGlobalTopToast &&
        typeof window.showGlobalTopToast === "function"
      ) {
        window.showGlobalTopToast(
          stpFullyAutomatedToggle.checked
            ? "Fully Automated has been enabled."
            : "Fully Automated has been disabled.",
        );
      }
      if (stpFullyAutoGuideActive) {
        closeFullyAutomatedGuide();
      }
    });
  }
  if (stpOptOutConfirmBtn) {
    stpOptOutConfirmBtn.addEventListener("click", function () {
      closeFullyAutomatedGuide();
      if (stpStatusBadge) {
        stpStatusBadge.hidden = true;
        stpStatusBadge.classList.add("hidden");
      }
      if (window.STPState && typeof window.STPState.setStpStep === "function") {
        window.STPState.setStpStep("opt_in_required");
      } else if (
        window.STPState &&
        typeof window.STPState.setStpStatus === "function"
      ) {
        window.STPState.setStpStatus("disabled");
      } else {
        applyStpUi("disabled", { stpStep: "opt_in_required" });
      }
      applyStpUi("disabled", { stpStep: "opt_in_required" });
      if (enableDialog && enableDialog.open) enableDialog.close();
      if (nextStepsDialog && nextStepsDialog.open) nextStepsDialog.close();
      if (verifyDialog && verifyDialog.open) verifyDialog.close();
      if (stpOptOutConfirmDialog && stpOptOutConfirmDialog.open)
        stpOptOutConfirmDialog.close();
      if (
        window.showGlobalTopToast &&
        typeof window.showGlobalTopToast === "function"
      ) {
        window.showGlobalTopToast(
          "Automatic Card Processing has been opted out.",
        );
      }
    });
  }
  if (enableDialog) {
    var enableDialogObserver = new MutationObserver(function () {
      if (enableDialog.open) {
        requestAnimationFrame(function () {
          startStpCardAnimationLoop(enableDialog);
        });
      } else {
        stopStpCardAnimationLoop();
      }
    });

    enableDialogObserver.observe(enableDialog, {
      attributes: true,
      attributeFilter: ["open"],
    });

    enableDialog.addEventListener("close", function () {
      agreementCheckbox.checked = false;
      updateEnableState();
      stopStpCardAnimationLoop();
    });
  }

  input.addEventListener("focus", function () {
    setTimeout(function () {
      var len = input.value.length;
      input.setSelectionRange(len, len);
    }, 0);
  });

  input.addEventListener("click", function () {
    var len = input.value.length;
    input.setSelectionRange(len, len);
  });

  input.addEventListener("keydown", function (event) {
    var key = event.key;
    var allowControl =
      key === "Tab" ||
      key === "ArrowLeft" ||
      key === "ArrowRight" ||
      key === "Home" ||
      key === "End";
    if (allowControl) return;
    if (key === "Backspace" || key === "Delete") return;
    if (key >= "0" && key <= "9") {
      setError(false);
      updateVerifyState();
      return;
    }
    if (key === ".") {
      if (input.value.indexOf(".") !== -1) {
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

  input.addEventListener("paste", function (event) {
    event.preventDefault();
    var text =
      (event.clipboardData || window.clipboardData).getData("text") || "";
    var sanitized = sanitizeDecimal(text);
    var hasInvalid = text !== sanitized;
    input.value = sanitized;
    setError(hasInvalid);
    updateVerifyState();
  });

  input.addEventListener("input", function () {
    var raw = input.value;
    var clean = sanitizeDecimal(raw);
    var hasInvalid = raw !== clean;
    input.value = clean;
    setError(hasInvalid);
    updateVerifyState();
  });

  verifyBtn.addEventListener("click", function () {
    if (verifyBtn.disabled) return;
    if (isVerifyingDeposit) return;
    setVerifyLoading(true);
    window.setTimeout(function () {
      if (
        window.STPState &&
        typeof window.STPState.setStpStatus === "function"
      ) {
        window.STPState.setStpStatus("enabled");
      } else {
        applyStpUi("enabled");
      }
      setVerifyLoading(false);
      if (verifyDialog && verifyDialog.open) verifyDialog.close();
      if (
        verifySuccessDialog &&
        typeof verifySuccessDialog.showModal === "function" &&
        !verifySuccessDialog.open
      ) {
        verifySuccessDialog.showModal();
      }
    }, 3000);
  });

  if (window.STPState && typeof window.STPState.subscribe === "function") {
    window.STPState.subscribe(syncStpStatus);
  } else {
    syncStpStatus("disabled", { stpStep: "opt_in_required" });
  }

  var openStpFromQuery = false;
  var openFullyAutomatedGuideFromQuery = false;
  try {
    var params = new URLSearchParams(window.location.search || "");
    // "Review and sign" in the Visa agreement email lands here.
    openStpFromQuery =
      params.get("openStpModal") === "1" ||
      params.get("stpAgreement") === "review";
    if (params.get("stpAgreement") === "review") {
      params.delete("stpAgreement");
      params.delete("email");
      params.delete("token");
    }
    openFullyAutomatedGuideFromQuery =
      params.get("stpGuide") === "fully-automated";
    if (openStpFromQuery) {
      params.delete("openStpModal");
    }
    if (openFullyAutomatedGuideFromQuery) params.delete("stpGuide");
    if (openStpFromQuery || openFullyAutomatedGuideFromQuery) {
      var newQuery = params.toString();
      var nextUrl =
        window.location.pathname +
        (newQuery ? "?" + newQuery : "") +
        window.location.hash;
      window.history.replaceState({}, "", nextUrl);
    }
  } catch (err) {
    openStpFromQuery = false;
    openFullyAutomatedGuideFromQuery = false;
  }
  if (openStpFromQuery) {
    setTimeout(function () {
      openEnableStep();
    }, 0);
  }
  if (openFullyAutomatedGuideFromQuery) {
    setTimeout(function () {
      openFullyAutomatedGuide();
    }, 200);
  }

  updateEnableState();
  setVerifyLoading(false);
  updateVerifyState();
})();

/* ===== Global Preferences — detail cards ===== */
(function () {
  var BANK_KEY = window.__ppStorageKey("my_bank_accounts_v1");
  var CHECK_KEY = window.__ppStorageKey("my_check_addresses_v1");
  var cardsCachePromise = null;
  var cardCopyMapBySlot = {};
  var lastSelectedBySlot = {};

  function getStored(key) {
    try {
      return JSON.parse(localStorage.getItem(key) || "[]");
    } catch (e) {
      return [];
    }
  }

  function setText(id, value) {
    var el = document.getElementById(id);
    if (el) el.textContent = value || "";
  }

  function firstNonEmpty() {
    for (var i = 0; i < arguments.length; i++) {
      var v = arguments[i];
      if (v != null && String(v).trim() !== "") return String(v);
    }
    return "";
  }

  function maskRouting(routing) {
    if (!routing || routing.length < 4) return routing || "";
    return "•••••" + routing.slice(-4);
  }

  function getDigits(value) {
    return String(value || "").replace(/\D/g, "");
  }

  function formatCardNumber(value) {
    return getDigits(value)
      .replace(/(\d{4})(?=\d)/g, "$1 ")
      .trim();
  }

  function getPrimaryCard() {
    if (!cardsCachePromise) {
      if (typeof window.__ppLoadSharedData !== "function") {
        cardsCachePromise = Promise.resolve(null);
      } else {
        cardsCachePromise = window
          .__ppLoadSharedData()
          .then(function (payload) {
            var cards =
              payload && Array.isArray(payload.cards) ? payload.cards : [];
            if (!cards.length) return null;
            for (var i = 0; i < cards.length; i++) {
              if (String(cards[i].status || "").toLowerCase() !== "inactive")
                return cards[i];
            }
            return cards[0];
          })
          .catch(function () {
            return null;
          });
      }
    }
    return cardsCachePromise;
  }

  function setCopyVisible(btn, visible) {
    if (!btn) return;
    btn.setAttribute("data-copy-enabled", visible ? "true" : "false");
    var icon = btn.querySelector('[data-copy-icon="true"]');
    if (visible) {
      btn.classList.remove("pointer-events-none");
      btn.classList.add(
        "cursor-pointer",
        "transition-colors",
        "hover:bg-gray-200",
        "dark:hover:bg-white/20",
      );
      if (icon) icon.classList.remove("hidden");
    } else {
      btn.classList.add("pointer-events-none");
      btn.classList.remove(
        "cursor-pointer",
        "transition-colors",
        "hover:bg-gray-200",
        "dark:hover:bg-white/20",
      );
      if (icon) icon.classList.add("hidden");
    }
  }

  function bindCopy(btn, valueEl) {
    if (!btn || !valueEl || btn.getAttribute("data-copy-bound") === "true")
      return;
    btn.setAttribute("data-copy-bound", "true");
    btn.addEventListener("click", function (event) {
      event.preventDefault();
      event.stopPropagation();
      if (btn.getAttribute("data-copy-enabled") !== "true") return;
      var text = String(valueEl.textContent || "").trim();
      if (!text) return;
      if (window.copyTextWithFeedback) window.copyTextWithFeedback(text, btn);
    });
  }

  function ensureCardPanel(n) {
    var panelId = "gp-details-card-" + n;
    var existing = document.getElementById(panelId);
    if (existing) return existing;

    var anchor = document.getElementById("gp-details-bank-" + n);
    if (!anchor || !anchor.parentNode) return null;

    var panel = document.createElement("div");
    panel.id = panelId;
    panel.className = "hidden";
    panel.innerHTML =
      '<div class="flex flex-col items-start self-stretch" data-gp-card-panel="' +
      n +
      '">' +
      '<div class="flex items-center justify-between self-stretch rounded-t-md border border-gray-200 bg-gray-100 px-4 py-2 dark:border-white/10 dark:bg-white/10">' +
      '<span class="text-sm font-semibold text-gray-900 dark:text-gray-100">Card Details</span>' +
      "</div>" +
      '<div class="flex flex-col items-start gap-2 self-stretch rounded-b-md border-r border-b border-l border-gray-200 bg-gray-50 p-4 dark:border-white/10 dark:bg-white/5">' +
      '<div class="grid grid-cols-2 gap-4 self-stretch">' +
      '<span class="text-sm font-medium text-gray-900 dark:text-gray-100">Name</span>' +
      '<span id="gp-card-name-' +
      n +
      '" class="text-sm font-normal text-gray-700 dark:text-gray-300"></span>' +
      "</div>" +
      '<div class="grid grid-cols-2 gap-4 self-stretch">' +
      '<span class="text-sm font-medium text-gray-900 dark:text-gray-100">Card Number</span>' +
      '<button type="button" id="gp-card-number-copy-btn-' +
      n +
      '" data-copy-enabled="false" class="copy-btn -ml-1 inline-flex w-fit items-center gap-1.5 rounded-md px-1.5 py-0.5 text-gray-700 dark:text-gray-300 pointer-events-none">' +
      '<span id="gp-card-number-' +
      n +
      '" class="text-sm font-normal"></span>' +
      '<span data-copy-icon="true" class="hidden">' +
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="size-4 shrink-0 text-gray-400 dark:text-gray-500"><path d="M7 3.5A1.5 1.5 0 0 1 8.5 2h3.879a1.5 1.5 0 0 1 1.06.44l3.122 3.12A1.5 1.5 0 0 1 17 6.622V12.5a1.5 1.5 0 0 1-1.5 1.5h-1v-3.379a3 3 0 0 0-.879-2.121L10.5 5.379A3 3 0 0 0 8.379 4.5H7v-1Z"/><path d="M4.5 6A1.5 1.5 0 0 0 3 7.5v9A1.5 1.5 0 0 0 4.5 18h7a1.5 1.5 0 0 0 1.5-1.5v-5.879a1.5 1.5 0 0 0-.44-1.06L9.44 6.439A1.5 1.5 0 0 0 8.378 6H4.5Z"/></svg>' +
      "</span>" +
      "</button>" +
      "</div>" +
      '<div class="grid grid-cols-2 gap-4 self-stretch">' +
      '<span class="text-sm font-medium text-gray-900 dark:text-gray-100">Expires</span>' +
      '<button type="button" id="gp-card-expiry-copy-btn-' +
      n +
      '" data-copy-enabled="false" class="copy-btn -ml-1 inline-flex w-fit items-center gap-1.5 rounded-md px-1.5 py-0.5 text-gray-700 dark:text-gray-300 pointer-events-none">' +
      '<span id="gp-card-expiry-' +
      n +
      '" class="text-sm font-normal"></span>' +
      '<span data-copy-icon="true" class="hidden">' +
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="size-4 shrink-0 text-gray-400 dark:text-gray-500"><path d="M7 3.5A1.5 1.5 0 0 1 8.5 2h3.879a1.5 1.5 0 0 1 1.06.44l3.122 3.12A1.5 1.5 0 0 1 17 6.622V12.5a1.5 1.5 0 0 1-1.5 1.5h-1v-3.379a3 3 0 0 0-.879-2.121L10.5 5.379A3 3 0 0 0 8.379 4.5H7v-1Z"/><path d="M4.5 6A1.5 1.5 0 0 0 3 7.5v9A1.5 1.5 0 0 0 4.5 18h7a1.5 1.5 0 0 0 1.5-1.5v-5.879a1.5 1.5 0 0 0-.44-1.06L9.44 6.439A1.5 1.5 0 0 0 8.378 6H4.5Z"/></svg>' +
      "</span>" +
      "</button>" +
      "</div>" +
      '<div class="grid grid-cols-2 gap-4 self-stretch">' +
      '<span class="text-sm font-medium text-gray-900 dark:text-gray-100">CVC2</span>' +
      '<button type="button" id="gp-card-cvc-copy-btn-' +
      n +
      '" data-copy-enabled="false" class="copy-btn -ml-1 inline-flex w-fit items-center gap-1.5 rounded-md px-1.5 py-0.5 text-gray-700 dark:text-gray-300 pointer-events-none">' +
      '<span id="gp-card-cvc-' +
      n +
      '" class="text-sm font-normal"></span>' +
      '<span data-copy-icon="true" class="hidden">' +
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="size-4 shrink-0 text-gray-400 dark:text-gray-500"><path d="M7 3.5A1.5 1.5 0 0 1 8.5 2h3.879a1.5 1.5 0 0 1 1.06.44l3.122 3.12A1.5 1.5 0 0 1 17 6.622V12.5a1.5 1.5 0 0 1-1.5 1.5h-1v-3.379a3 3 0 0 0-.879-2.121L10.5 5.379A3 3 0 0 0 8.379 4.5H7v-1Z"/><path d="M4.5 6A1.5 1.5 0 0 0 3 7.5v9A1.5 1.5 0 0 0 4.5 18h7a1.5 1.5 0 0 0 1.5-1.5v-5.879a1.5 1.5 0 0 0-.44-1.06L9.44 6.439A1.5 1.5 0 0 0 8.378 6H4.5Z"/></svg>' +
      "</span>" +
      "</button>" +
      "</div>" +
      '<div class="grid grid-cols-2 gap-4 self-stretch items-start">' +
      '<span class="text-sm font-medium text-gray-900 dark:text-gray-100">Cardholder Address</span>' +
      '<span id="gp-card-address-' +
      n +
      '" class="whitespace-pre-line text-sm font-normal text-gray-700 dark:text-gray-300"></span>' +
      "</div>" +
      '<div class="grid grid-cols-2 gap-4 self-stretch items-start">' +
      "<span></span>" +
      '<div class="-ml-2.5">' +
      '<button type="button" id="gp-card-reveal-btn-' +
      n +
      '" data-revealed="false" class="inline-flex w-fit self-start items-center gap-2 rounded-md px-2.5 py-1.5 text-sm font-semibold text-blue-600 hover:bg-blue-600/10 dark:bg-blue-600/10 dark:text-blue-400 dark:hover:bg-blue-600/20 cursor-pointer">' +
      '<svg data-icon="reveal" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="size-3.5"><path d="M8 9.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z"/><path fill-rule="evenodd" d="M1.3794 8.28049C1.31616 8.09687 1.31625 7.89727 1.37965 7.71371C2.32719 4.97038 4.93238 3 7.99777 3C11.0653 3 13.672 4.97316 14.6179 7.71951C14.6811 7.90313 14.681 8.10274 14.6176 8.2863C13.6701 11.0296 11.0649 13 7.99952 13C4.93197 13 2.32527 11.0268 1.3794 8.28049ZM11 8a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" clip-rule="evenodd"/></svg>' +
      '<svg data-icon="hide" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="size-3.5 hidden"><path fill-rule="evenodd" clip-rule="evenodd" d="M3.28033 2.21967C2.98744 1.92678 2.51256 1.92678 2.21967 2.21967C1.92678 2.51256 1.92678 2.98744 2.21967 3.28033L12.7197 13.7803C13.0126 14.0732 13.4874 14.0732 13.7803 13.7803C14.0732 13.4874 14.0732 13.0126 13.7803 12.7197L12.4577 11.397C13.438 10.5863 14.1937 9.51366 14.6176 8.2863C14.681 8.10274 14.6811 7.90313 14.6179 7.71951C13.672 4.97316 11.0653 3 7.99777 3C6.85414 3 5.77457 3.27425 4.82123 3.76057L3.28033 2.21967Z"/><path d="M6.47602 5.41536L7.61147 6.55081C7.73539 6.51767 7.86563 6.5 8 6.5C8.82843 6.5 9.5 7.17157 9.5 8C9.5 8.13437 9.48233 8.26461 9.44919 8.38853L10.5846 9.52398C10.8486 9.07734 11 8.55636 11 8C11 6.34315 9.65685 5 8 5C7.44364 5 6.92266 5.15145 6.47602 5.41536Z"/><path d="M7.81206 10.9942L9.62754 12.8097C9.10513 12.9341 8.56002 13 7.99952 13C4.93197 13 2.32527 11.0268 1.3794 8.28049C1.31616 8.09687 1.31625 7.89727 1.37965 7.71371C1.63675 6.96935 2.01588 6.28191 2.49314 5.67529L5.00579 8.18794C5.09895 9.69509 6.30491 10.901 7.81206 10.9942Z"/></svg>' +
      '<span id="gp-card-reveal-text-' +
      n +
      '">Reveal Details</span>' +
      "</button>" +
      "</div>" +
      "</div>" +
      "</div>" +
      "</div>";

    anchor.parentNode.insertBefore(panel, anchor);
    makeCollapsible(panel);
    setExpanded(panel, false);
    return panel;
  }

  function resetCardReveal(n) {
    var btn = document.getElementById("gp-card-reveal-btn-" + n);
    if (!btn) return;
    btn.setAttribute("data-revealed", "false");
    var revealIcon = btn.querySelector('[data-icon="reveal"]');
    var hideIcon = btn.querySelector('[data-icon="hide"]');
    var text = document.getElementById("gp-card-reveal-text-" + n);
    if (revealIcon) revealIcon.classList.remove("hidden");
    if (hideIcon) hideIcon.classList.add("hidden");
    if (text) text.textContent = "Reveal Details";
    var copyMap = cardCopyMapBySlot[n];
    if (copyMap) {
      setCopyVisible(copyMap.numberBtn, false);
      setCopyVisible(copyMap.expiryBtn, false);
      setCopyVisible(copyMap.cvcBtn, false);
    }
  }

  function initCardRevealBtn(n) {
    var btn = document.getElementById("gp-card-reveal-btn-" + n);
    var numberValueEl = document.getElementById("gp-card-number-" + n);
    var expiryValueEl = document.getElementById("gp-card-expiry-" + n);
    var cvcValueEl = document.getElementById("gp-card-cvc-" + n);
    var numberBtn = document.getElementById("gp-card-number-copy-btn-" + n);
    var expiryBtn = document.getElementById("gp-card-expiry-copy-btn-" + n);
    var cvcBtn = document.getElementById("gp-card-cvc-copy-btn-" + n);
    if (!btn || !numberValueEl || !expiryValueEl || !cvcValueEl) return;

    bindCopy(numberBtn, numberValueEl);
    bindCopy(expiryBtn, expiryValueEl);
    bindCopy(cvcBtn, cvcValueEl);
    cardCopyMapBySlot[n] = {
      numberBtn: numberBtn,
      expiryBtn: expiryBtn,
      cvcBtn: cvcBtn,
    };

    resetCardReveal(n);
    btn.onclick = function () {
      var revealed = btn.getAttribute("data-revealed") === "true";
      revealed = !revealed;
      btn.setAttribute("data-revealed", String(revealed));
      numberValueEl.textContent = revealed
        ? numberValueEl.getAttribute("data-revealed") ||
          numberValueEl.getAttribute("data-masked") ||
          ""
        : numberValueEl.getAttribute("data-masked") || "";
      expiryValueEl.textContent = revealed
        ? expiryValueEl.getAttribute("data-revealed") ||
          expiryValueEl.getAttribute("data-masked") ||
          ""
        : expiryValueEl.getAttribute("data-masked") || "";
      cvcValueEl.textContent = revealed
        ? cvcValueEl.getAttribute("data-revealed") ||
          cvcValueEl.getAttribute("data-masked") ||
          ""
        : cvcValueEl.getAttribute("data-masked") || "";
      var revealIcon = btn.querySelector('[data-icon="reveal"]');
      var hideIcon = btn.querySelector('[data-icon="hide"]');
      var text = document.getElementById("gp-card-reveal-text-" + n);
      if (revealIcon) revealIcon.classList.toggle("hidden", revealed);
      if (hideIcon) hideIcon.classList.toggle("hidden", !revealed);
      if (text) text.textContent = revealed ? "Hide Details" : "Reveal Details";
      setCopyVisible(numberBtn, revealed);
      setCopyVisible(expiryBtn, revealed);
      setCopyVisible(cvcBtn, revealed);
    };
  }

  function showPayersCard(n) {
    var panel = ensureCardPanel(n);
    if (!panel) return;
    panel.classList.remove("hidden");

    getPrimaryCard()
      .then(function (card) {
        var holderName =
          card && card.holderName ? String(card.holderName) : "—";
        var fullDigits = getDigits(card && card.fullNumber);
        var last4 =
          fullDigits.slice(-4) ||
          getDigits(card && card.last4).slice(-4) ||
          "0000";
        var maskedNumber = "•••• " + last4;
        var fullNumber = fullDigits
          ? formatCardNumber(fullDigits)
          : maskedNumber;
        var expiry =
          card && card.expirationFull
            ? String(card.expirationFull)
            : card && card.expiration
              ? String(card.expiration)
              : "—";
        var cvc = card && card.cvc2 ? String(card.cvc2) : "—";
        var address =
          card && card.billingAddress ? String(card.billingAddress) : "—";

        setText("gp-card-name-" + n, holderName);
        setText("gp-card-address-" + n, address);

        var numberValueEl = document.getElementById("gp-card-number-" + n);
        var expiryValueEl = document.getElementById("gp-card-expiry-" + n);
        var cvcValueEl = document.getElementById("gp-card-cvc-" + n);
        if (numberValueEl) {
          numberValueEl.setAttribute("data-masked", maskedNumber);
          numberValueEl.setAttribute("data-revealed", fullNumber);
          numberValueEl.textContent = maskedNumber;
        }
        if (expiryValueEl) {
          expiryValueEl.setAttribute("data-masked", expiry);
          expiryValueEl.setAttribute("data-revealed", expiry);
          expiryValueEl.textContent = expiry;
        }
        if (cvcValueEl) {
          cvcValueEl.setAttribute("data-masked", "•••");
          cvcValueEl.setAttribute("data-revealed", cvc);
          cvcValueEl.textContent = "•••";
        }

        initCardRevealBtn(n);
      })
      .catch(function () {
        setText("gp-card-name-" + n, "—");
        setText("gp-card-address-" + n, "—");
        setText("gp-card-number-" + n, "—");
        setText("gp-card-expiry-" + n, "—");
        setText("gp-card-cvc-" + n, "—");
        initCardRevealBtn(n);
      });
  }

  function initRevealBtn(n, acct) {
    var btn = document.getElementById("gp-bank-reveal-btn-" + n);
    if (!btn) return;
    btn.setAttribute("data-revealed", "false");
    var revealIcon = btn.querySelector('[data-icon="reveal"]');
    var hideIcon = btn.querySelector('[data-icon="hide"]');
    var revealText = document.getElementById("gp-bank-reveal-text-" + n);
    var maskedAccount = firstNonEmpty(
      acct && acct.maskedAccount,
      acct && acct.maskedAccountNumber,
      acct && acct.accountMasked,
    );
    var maskedRouting = firstNonEmpty(
      acct && acct.maskedRouting,
      acct && acct.routingMasked,
    );
    var revealedAccount = firstNonEmpty(
      acct && acct.accountNumber,
      acct && acct.fullAccountNumber,
      maskedAccount,
      acct && acct.last4 ? "••••" + acct.last4 : "",
    );
    var revealedRouting = firstNonEmpty(
      acct && acct.routingNumber,
      acct && acct.routing,
      maskedRouting,
    );
    if (!maskedAccount && revealedAccount)
      maskedAccount = "••••" + getDigits(revealedAccount).slice(-4);
    if (!maskedRouting && revealedRouting)
      maskedRouting = maskRouting(getDigits(revealedRouting));
    if (!maskedAccount && acct && acct.last4)
      maskedAccount = "••••" + acct.last4;
    if (revealIcon) revealIcon.classList.remove("hidden");
    if (hideIcon) hideIcon.classList.add("hidden");
    if (revealText) revealText.textContent = "Reveal Details";
    setText("gp-bank-acct-" + n, maskedAccount || "—");
    setText("gp-bank-routing-" + n, maskedRouting || "—");

    btn.onclick = function () {
      var revealed = btn.getAttribute("data-revealed") === "true";
      revealed = !revealed;
      btn.setAttribute("data-revealed", String(revealed));
      if (revealed) {
        setText("gp-bank-acct-" + n, revealedAccount || "—");
        setText("gp-bank-routing-" + n, revealedRouting || "—");
        if (revealIcon) revealIcon.classList.add("hidden");
        if (hideIcon) hideIcon.classList.remove("hidden");
        if (revealText) revealText.textContent = "Hide Details";
      } else {
        setText("gp-bank-acct-" + n, maskedAccount || "—");
        setText("gp-bank-routing-" + n, maskedRouting || "—");
        if (revealIcon) revealIcon.classList.remove("hidden");
        if (hideIcon) hideIcon.classList.add("hidden");
        if (revealText) revealText.textContent = "Reveal Details";
      }
    };
  }

  /* Collapsible detail cards — same pattern as "My Account Details" on the
               pay page: a header button with a chevron, body collapsed by default. */
  var CHEVRON_SVG =
    '<svg data-gp-collapse-chevron xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="size-5 text-gray-500 transition-transform dark:text-gray-400"><path fill-rule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clip-rule="evenodd"/></svg>';

  function makeCollapsible(panel) {
    if (!panel || panel.getAttribute("data-gp-collapsible") === "true") return;
    var wrap = panel.firstElementChild;
    if (!wrap || wrap.children.length < 2) return;
    var header = wrap.children[0];
    var body = wrap.children[1];
    var title = header.querySelector("span");

    var btn = document.createElement("button");
    btn.type = "button";
    btn.setAttribute("data-gp-collapse-toggle", "");
    btn.setAttribute("aria-expanded", "false");
    btn.className =
      "flex w-full cursor-pointer items-center justify-between rounded-md border border-gray-200 bg-gray-50 pl-4 pr-[6px] py-2 text-left transition-colors hover:bg-gray-100 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10";
    btn.innerHTML =
      '<span class="text-sm font-semibold text-gray-900 dark:text-gray-100"></span>' +
      CHEVRON_SVG;
    btn.firstChild.textContent = title ? title.textContent : "Details";
    wrap.replaceChild(btn, header);

    var collapse = document.createElement("div");
    collapse.setAttribute("data-gp-collapse-body", "");
    collapse.className =
      "w-full max-h-0 overflow-hidden rounded-b-md border-r border-b border-l border-transparent bg-gray-50 opacity-0 transition-all duration-300 ease-out pointer-events-none dark:bg-white/5";
    [
      "rounded-b-md",
      "border-r",
      "border-b",
      "border-l",
      "border-gray-200",
      "bg-gray-50",
      "dark:border-white/10",
      "dark:bg-white/5",
    ].forEach(function (c) {
      body.classList.remove(c);
    });
    wrap.replaceChild(collapse, body);
    collapse.appendChild(body);

    btn.addEventListener("click", function () {
      setExpanded(panel, btn.getAttribute("aria-expanded") !== "true");
    });
    panel.setAttribute("data-gp-collapsible", "true");
  }

  function setExpanded(panel, expanded) {
    if (!panel) return;
    var btn = panel.querySelector("[data-gp-collapse-toggle]");
    var body = panel.querySelector("[data-gp-collapse-body]");
    var chevron = panel.querySelector("[data-gp-collapse-chevron]");
    if (btn) {
      btn.setAttribute("aria-expanded", expanded ? "true" : "false");
      btn.classList.toggle("rounded-md", !expanded);
      btn.classList.toggle("rounded-t-md", expanded);
      btn.classList.toggle("bg-gray-50", !expanded);
      btn.classList.toggle("bg-gray-100", expanded);
      btn.classList.toggle("dark:bg-white/5", !expanded);
      btn.classList.toggle("dark:bg-white/10", expanded);
    }
    if (body) {
      body.classList.toggle("max-h-0", !expanded);
      body.classList.toggle("opacity-0", !expanded);
      body.classList.toggle("pointer-events-none", !expanded);
      body.classList.toggle("border-transparent", !expanded);
      body.classList.toggle("max-h-[560px]", expanded);
      body.classList.toggle("opacity-100", expanded);
      body.classList.toggle("pointer-events-auto", expanded);
      body.classList.toggle("border-gray-200", expanded);
      body.classList.toggle("dark:border-white/10", expanded);
    }
    if (chevron) chevron.classList.toggle("rotate-180", expanded);
  }

  function collapseSlot(n) {
    ["card", "bank", "check"].forEach(function (kind) {
      var panel = document.getElementById("gp-details-" + kind + "-" + n);
      makeCollapsible(panel);
      setExpanded(panel, false);
    });
  }

  function showCard(n, opt) {
    var cardCard = document.getElementById("gp-details-card-" + n);
    var bankCard = document.getElementById("gp-details-bank-" + n);
    var checkCard = document.getElementById("gp-details-check-" + n);
    if (cardCard) cardCard.classList.add("hidden");
    if (bankCard) bankCard.classList.add("hidden");
    if (checkCard) checkCard.classList.add("hidden");
    var selectedValue = opt ? opt.getAttribute("value") || "" : "";
    if (lastSelectedBySlot[n] !== selectedValue) {
      lastSelectedBySlot[n] = selectedValue;
      collapseSlot(n);
    }
    if (!opt) return;

    var val = opt.getAttribute("value") || "";
    var isBank = opt.getAttribute("data-gp-bank-option") === "true";
    var isChk = opt.getAttribute("data-gp-address-option") === "true";
    var isPayersCard = val === "payers-card";

    if (isPayersCard) {
      showPayersCard(n);
    } else if (isBank) {
      var banks = getStored(BANK_KEY);
      var acct = null;
      for (var i = 0; i < banks.length; i++) {
        if (banks[i].id === val) {
          acct = banks[i];
          break;
        }
      }
      if (!acct || !bankCard) return;
      function applyBankData(source) {
        var merged = Object.assign({}, acct || {}, source || {});
        var primaryName = firstNonEmpty(merged.name, merged.accountName);
        var displayName = firstNonEmpty(
          merged.displayName,
          merged.bankName ? merged.bankName + " Account" : "",
        );
        setText("gp-bank-name-" + n, primaryName || displayName || "—");
        initRevealBtn(n, merged);
        var addrRow = document.getElementById("gp-bank-address-row-" + n);
        var address = firstNonEmpty(merged.address, merged.bankAddress);
        if (address) {
          setText("gp-bank-address-" + n, address);
          if (addrRow) addrRow.classList.remove("hidden");
        } else if (addrRow) {
          addrRow.classList.add("hidden");
        }
      }
      bankCard.classList.remove("hidden");
      applyBankData(acct);
      var addrRow = document.getElementById("gp-bank-address-row-" + n);
      if (typeof window.__ppLoadSharedData === "function") {
        window
          .__ppLoadSharedData()
          .then(function (data) {
            var fullBanks =
              data && Array.isArray(data.bankAccounts) ? data.bankAccounts : [];
            for (var fi = 0; fi < fullBanks.length; fi++) {
              if (fullBanks[fi].id === val) {
                applyBankData(fullBanks[fi]);
                break;
              }
            }
          })
          .catch(function () {});
      } else if (addrRow) {
        var fallbackAddress = firstNonEmpty(acct.address, acct.bankAddress);
        if (!fallbackAddress) addrRow.classList.add("hidden");
      }
    } else if (isChk) {
      var addrs = getStored(CHECK_KEY);
      var addr = null;
      for (var j = 0; j < addrs.length; j++) {
        if (addrs[j].id === val) {
          addr = addrs[j];
          break;
        }
      }
      if (!addr || !checkCard) return;
      setText("gp-check-name-" + n, addr.displayName);
      setText("gp-check-addr-" + n, addr.address);
      checkCard.classList.remove("hidden");
    }
  }

  function initGpSlot(n) {
    var sel = document.getElementById("gp-slot-" + n);
    if (!sel) return;
    var observer = new MutationObserver(function () {
      var selected = sel.querySelector('el-option[aria-selected="true"]');
      showCard(n, selected || null);
    });
    observer.observe(sel, {
      subtree: true,
      attributes: true,
      attributeFilter: ["aria-selected"],
    });
  }

  function initGpSlots() {
    initGpSlot(1);
    initGpSlot(2);
    initGpSlot(3);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initGpSlots, { once: true });
  } else {
    initGpSlots();
  }
})();
