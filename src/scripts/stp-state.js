/**
 * Global STP state store for dashboard pages.
 * Source of truth: localStorage key.
 */
(function () {
  'use strict';

  // v2 keys reset stale local states from previous modal iterations.
  var STORAGE_KEY = 'sx_global_stp_status_v2';
  var ENABLED_FLAG_KEY = 'sx_global_stp_enabled_confirmed_v2';
  var STATUS_ENABLED = 'enabled';
  var STATUS_DISABLED = 'disabled';
  var listeners = [];

  function normalizeStatus(value) {
    return value === STATUS_ENABLED ? STATUS_ENABLED : STATUS_DISABLED;
  }

  function readStoredStatus() {
    try {
      var stored = normalizeStatus(localStorage.getItem(STORAGE_KEY));
      if (stored !== STATUS_ENABLED) return stored;
      var enabledConfirmed = localStorage.getItem(ENABLED_FLAG_KEY) === '1';
      // Backward-safe migration: old accidental "enabled" values are treated as disabled
      // unless an explicit confirmed flag exists.
      return enabledConfirmed ? STATUS_ENABLED : STATUS_DISABLED;
    } catch (error) {
      return STATUS_DISABLED;
    }
  }

  var currentStatus = readStoredStatus();

  function notify() {
    listeners.slice().forEach(function (listener) {
      try {
        listener(currentStatus);
      } catch (error) {
        console.error('STPState listener failed:', error);
      }
    });
    window.dispatchEvent(new CustomEvent('sx:stp-status-change', {
      detail: { status: currentStatus }
    }));
  }

  function persistStatus(nextStatus) {
    try {
      localStorage.setItem(STORAGE_KEY, nextStatus);
      if (nextStatus === STATUS_ENABLED) {
        localStorage.setItem(ENABLED_FLAG_KEY, '1');
      } else {
        localStorage.removeItem(ENABLED_FLAG_KEY);
      }
    } catch (error) {
      console.error('Unable to persist STP status:', error);
    }
  }

  function getStpStatus() {
    return currentStatus;
  }

  function setStpStatus(nextStatus) {
    var normalized = normalizeStatus(nextStatus);
    if (normalized === currentStatus) return currentStatus;
    currentStatus = normalized;
    persistStatus(currentStatus);
    notify();
    return currentStatus;
  }

  function subscribe(listener) {
    if (typeof listener !== 'function') return function () {};
    listeners.push(listener);
    listener(currentStatus);
    return function unsubscribe() {
      listeners = listeners.filter(function (item) { return item !== listener; });
    };
  }

  function ensureInlineOptInStyles() {
    if (document.getElementById('sx-inline-stp-style')) return;
    var style = document.createElement('style');
    style.id = 'sx-inline-stp-style';
    style.textContent =
      '#sx-inline-stp-dialog {' +
      '  --pp-stp-loop-ms: 8000;' +
      '  --pp-stp-dot-1-ms: 2700;' +
      '  --pp-stp-dot-2-ms: 2820;' +
      '  --pp-stp-dot-3-ms: 2940;' +
      '  --pp-stp-dot-4-ms: 3060;' +
      '  --pp-stp-dot-reset-ms: 7000;' +
      '}' +
      '#sx-inline-stp-dialog .pp-stp-modal-card-figure {' +
      '  transform: translateY(-1.5rem);' +
      '  transform-origin: center;' +
      '}' +
      '#sx-inline-stp-dialog[data-card-animating="true"] .pp-stp-modal-card-figure {' +
      '  animation: ppStpCardPayLoop 8000ms cubic-bezier(0.16, 1, 0.3, 1) infinite;' +
      '}' +
      '@keyframes ppStpCardPayLoop {' +
      '  0% { opacity: 0; transform: translate3d(-96px, -180px, 0) rotate(-18deg) skewX(-8deg) scale(0.92); }' +
      '  18% { opacity: 1; transform: translate3d(0, calc(-0.95rem - 58px), 0) rotate(0deg) skewX(0deg) scale(1); animation-timing-function: ease-in-out; }' +
      '  32% { opacity: 1; transform: translate3d(0, -0.1rem, 0) rotate(0deg) skewX(0deg) scale(1); animation-timing-function: ease-in-out; }' +
      '  42% { opacity: 1; transform: translate3d(0, -0.1rem, 0) rotate(0deg) skewX(0deg) scale(1); animation-timing-function: ease-in-out; }' +
      '  55% { opacity: 1; transform: translate3d(0, calc(-0.95rem - 58px), 0) rotate(0deg) skewX(0deg) scale(1); }' +
      '  88.75% { opacity: 1; transform: translate3d(0, calc(-0.95rem - 58px), 0) rotate(0deg) skewX(0deg) scale(1); animation-timing-function: ease-in; }' +
      '  100% { opacity: 0; transform: translate3d(96px, calc(-0.95rem - 58px), 0) rotate(18deg) skewX(8deg) scale(0.92); }' +
      '}' +
      '@media (prefers-reduced-motion: reduce) {' +
      '  #sx-inline-stp-dialog[data-card-animating="true"] .pp-stp-modal-card-figure { animation: none; }' +
      '  #sx-inline-stp-dialog .pp-stp-modal-card-figure { opacity: 1; transform: translateY(-0.85rem); }' +
      '}';
    document.head.appendChild(style);
  }

  function ensureInlineOptInDialog() {
    var existing = document.getElementById('sx-inline-stp-dialog');
    if (existing) return existing;

    ensureInlineOptInStyles();

    var dialog = document.createElement('dialog');
    dialog.id = 'sx-inline-stp-dialog';
    dialog.className = 'fixed inset-0 m-0 size-auto max-h-none max-w-none border-0 p-0 bg-transparent backdrop:bg-transparent';
    dialog.innerHTML =
      '<div class="fixed inset-0 z-[100] bg-gray-900/75 transition-opacity duration-300 ease-out motion-reduce:transition-none"></div>' +
      '<div class="fixed inset-0 z-[110] flex items-center justify-center p-4 sm:p-6">' +
      '  <div class="relative flex h-auto max-h-[calc(100vh-2rem)] w-full max-w-[800px] flex-col overflow-y-auto rounded-3xl bg-white shadow-xl md:overflow-hidden dark:bg-gray-900 dark:ring-1 dark:ring-white/10 md:flex-row">' +
      '    <button type="button" data-inline-stp-close class="absolute top-4 right-4 z-20 rounded-md bg-gray-900/8 p-1.5 text-gray-500 hover:bg-gray-200 hover:text-gray-700 dark:bg-white/10 dark:text-gray-400 dark:hover:bg-white/20 dark:hover:text-gray-200">' +
      '      <span class="sr-only">Close</span>' +
      '      <svg viewBox="0 0 20 20" fill="currentColor" class="size-5"><path fill-rule="evenodd" d="M4.22 4.22a.75.75 0 0 1 1.06 0L10 8.94l4.72-4.72a.75.75 0 1 1 1.06 1.06L11.06 10l4.72 4.72a.75.75 0 1 1-1.06 1.06L10 11.06l-4.72 4.72a.75.75 0 1 1-1.06-1.06L8.94 10 4.22 5.28a.75.75 0 0 1 0-1.06Z" clip-rule="evenodd"/></svg>' +
      '    </button>' +
      '    <div class="relative p-2 md:w-64 md:shrink-0">' +
      '      <div class="relative h-[220px] overflow-hidden rounded-2xl md:h-[608px]" style="background-image: linear-gradient(180deg, #ECF2FF 0%, #F8F4FF 100%);">' +
      '        <img data-inline-stp-terminal src="../../../src/assets/illustrations/terminal.svg" alt="" class="absolute -bottom-[100px] left-1/2 h-[192px] w-[332px] max-w-none -translate-x-[56%] md:bottom-[80px]" />' +
      '        <div class="absolute inset-0 flex -translate-x-3 items-center justify-center">' +
      '          <img data-inline-stp-card src="../../../src/assets/illustrations/card.svg" alt="" class="pp-stp-modal-card-figure h-[169px] w-[292px] max-w-none" />' +
      '        </div>' +
      '      </div>' +
      '    </div>' +
      '    <div class="flex flex-1 flex-col p-4 md:p-9">' +
      '      <div class="my-auto flex flex-col gap-4">' +
      '        <h3 class="text-xl font-semibold leading-8 text-slate-950 md:text-[30px] md:leading-[36px] dark:text-white">Enable Automatic Card Processing</h3>' +
      '        <p class="text-sm font-medium leading-6 text-slate-950 md:text-[18px] dark:text-gray-100">When enabled, eligible virtual card payments will be processed automatically through your existing merchant processor.</p>' +
      '        <div class="hidden w-full flex-col gap-1.5 md:flex">' +
      '          <p class="text-sm font-medium leading-6 text-slate-950 dark:text-white">How it works</p>' +
      '          <div class="flex items-start gap-1.5 text-sm font-normal leading-6 text-gray-700 dark:text-gray-300"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none" class="mt-0.5 shrink-0"><path fill-rule="evenodd" clip-rule="evenodd" d="M16.7045 4.15347C17.034 4.4045 17.0976 4.87509 16.8466 5.20457L8.84657 15.7046C8.71541 15.8767 8.51627 15.9838 8.30033 15.9983C8.08439 16.0129 7.87271 15.9334 7.71967 15.7804L3.21967 11.2804C2.92678 10.9875 2.92678 10.5126 3.21967 10.2197C3.51256 9.92682 3.98744 9.92682 4.28033 10.2197L8.17351 14.1129L15.6534 4.29551C15.9045 3.96603 16.3751 3.90243 16.7045 4.15347Z" fill="#2563EB"/></svg><p>Eligible virtual card payments are securely transmitted to your processor.</p></div>' +
      '          <div class="flex items-start gap-1.5 text-sm font-normal leading-6 text-gray-700 dark:text-gray-300"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none" class="mt-0.5 shrink-0"><path fill-rule="evenodd" clip-rule="evenodd" d="M16.7045 4.15347C17.034 4.4045 17.0976 4.87509 16.8466 5.20457L8.84657 15.7046C8.71541 15.8767 8.51627 15.9838 8.30033 15.9983C8.08439 16.0129 7.87271 15.9334 7.71967 15.7804L3.21967 11.2804C2.92678 10.9875 2.92678 10.5126 3.21967 10.2197C3.51256 9.92682 3.98744 9.92682 4.28033 10.2197L8.17351 14.1129L15.6534 4.29551C15.9045 3.96603 16.3751 3.90243 16.7045 4.15347Z" fill="#2563EB"/></svg><p>Funds settle as usual.</p></div>' +
      '          <div class="flex items-start gap-1.5 text-sm font-normal leading-6 text-gray-700 dark:text-gray-300"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none" class="mt-0.5 shrink-0"><path fill-rule="evenodd" clip-rule="evenodd" d="M16.7045 4.15347C17.034 4.4045 17.0976 4.87509 16.8466 5.20457L8.84657 15.7046C8.71541 15.8767 8.51627 15.9838 8.30033 15.9983C8.08439 16.0129 7.87271 15.9334 7.71967 15.7804L3.21967 11.2804C2.92678 10.9875 2.92678 10.5126 3.21967 10.2197C3.51256 9.92682 3.98744 9.92682 4.28033 10.2197L8.17351 14.1129L15.6534 4.29551C15.9045 3.96603 16.3751 3.90243 16.7045 4.15347Z" fill="#2563EB"/></svg><p>You can turn this off anytime.</p></div>' +
      '        </div>' +
      '        <label class="mt-4 flex cursor-pointer items-center gap-3 text-sm leading-6 text-gray-700 dark:text-gray-300">' +
      '          <span class="flex h-6 shrink-0 items-center">' +
      '            <span class="group grid size-4 grid-cols-1">' +
      '              <input data-inline-stp-agree type="checkbox" class="col-start-1 row-start-1 appearance-none rounded-sm border border-gray-300 bg-white checked:border-blue-600 checked:bg-blue-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:border-gray-600 dark:bg-white/5 dark:checked:border-blue-500 dark:checked:bg-blue-500" />' +
      '              <svg viewBox="0 0 14 14" fill="none" class="pointer-events-none col-start-1 row-start-1 size-3.5 self-center justify-self-center stroke-white"><path d="M3 8L6 11L11 3.5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="opacity-0 group-has-checked:opacity-100"/></svg>' +
      '            </span>' +
      '          </span>' +
      '          <span>I agree to the Visa AR Manager <a href="#" class="text-blue-600 underline dark:text-blue-400">Participation Agreement</a>.</span>' +
      '        </label>' +
      '      </div>' +
      '      <div class="mt-6 flex items-center justify-between gap-4">' +
      '        <button type="button" data-inline-stp-confirm disabled class="inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-xs disabled:opacity-40 disabled:cursor-not-allowed">Confirm</button>' +
      '        <button type="button" data-inline-stp-close class="inline-flex items-center rounded-md px-2 py-1 text-sm font-semibold text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/10">Remind me later</button>' +
      '      </div>' +
      '    </div>' +
      '  </div>' +
      '</div>';

    document.body.appendChild(dialog);

    var terminalEl = dialog.querySelector('[data-inline-stp-terminal]');
    var cardEl = dialog.querySelector('[data-inline-stp-card]');
    var agreeEl = dialog.querySelector('[data-inline-stp-agree]');
    var confirmEl = dialog.querySelector('[data-inline-stp-confirm]');
    var dotTimers = [];

    function clearDotTimers() {
      dotTimers.forEach(function (id) { clearTimeout(id); });
      dotTimers = [];
    }

    function runTerminalDots() {
      if (!terminalEl) return;
      clearDotTimers();
      terminalEl.src = '../../../src/assets/illustrations/terminal.svg';
      var frames = [
        { t: 1850, src: '../../../src/assets/illustrations/terminal-dot1.svg' },
        { t: 1980, src: '../../../src/assets/illustrations/terminal-dot2.svg' },
        { t: 2110, src: '../../../src/assets/illustrations/terminal-dot3.svg' },
        { t: 2240, src: '../../../src/assets/illustrations/terminal-dot4.svg' },
        { t: 2850, src: '../../../src/assets/illustrations/terminal.svg' }
      ];
      frames.forEach(function (frame) {
        dotTimers.push(setTimeout(function () {
          if (!dialog.open) return;
          terminalEl.src = frame.src;
        }, frame.t));
      });
    }

    function startInlineAnimation() {
      if (!cardEl) return;
      dialog.removeAttribute('data-card-animating');
      void dialog.offsetWidth;
      dialog.setAttribute('data-card-animating', 'true');
      runTerminalDots();
    }

    dialog.querySelectorAll('[data-inline-stp-close]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (dialog.open) dialog.close();
      });
    });

    if (agreeEl && confirmEl) {
      agreeEl.addEventListener('change', function () {
        confirmEl.disabled = !agreeEl.checked;
      });
      confirmEl.addEventListener('click', function () {
        if (confirmEl.disabled) return;
        if (dialog.open) dialog.close();
        var nextSteps = ensureInlineNextStepsDialog();
        if (nextSteps && typeof nextSteps.showModal === 'function' && !nextSteps.open) {
          nextSteps.showModal();
        }
      });
    }

    dialog.addEventListener('close', function () {
      clearDotTimers();
      if (terminalEl) terminalEl.src = '../../../src/assets/illustrations/terminal.svg';
      if (agreeEl) agreeEl.checked = false;
      if (confirmEl) confirmEl.disabled = true;
      dialog.removeAttribute('data-card-animating');
    });

    new MutationObserver(function () {
      if (dialog.open) startInlineAnimation();
      else clearDotTimers();
    }).observe(dialog, { attributes: true, attributeFilter: ['open'] });

    return dialog;
  }

  function ensureInlineNextStepsDialog() {
    var existing = document.getElementById('sx-inline-stp-next-steps-dialog');
    if (existing) return existing;

    var dialog = document.createElement('dialog');
    dialog.id = 'sx-inline-stp-next-steps-dialog';
    dialog.className = 'fixed inset-0 m-0 size-auto max-h-none max-w-none border-0 p-0 bg-transparent backdrop:bg-transparent';
    dialog.innerHTML =
      '<div class="fixed inset-0 z-[100] bg-gray-900/75 transition-opacity duration-300 ease-out motion-reduce:transition-none"></div>' +
      '<div class="fixed inset-0 z-[110] flex items-center justify-center p-4 sm:p-6">' +
      '  <div class="relative flex h-auto max-h-[calc(100vh-2rem)] w-full max-w-[800px] flex-col overflow-y-auto rounded-3xl bg-white shadow-xl md:overflow-hidden dark:bg-gray-900 dark:ring-1 dark:ring-white/10">' +
      '    <button type="button" data-inline-next-close class="absolute top-4 right-4 z-20 rounded-md bg-gray-900/8 p-1.5 text-gray-500 hover:bg-gray-200 hover:text-gray-700 dark:bg-white/10 dark:text-gray-400 dark:hover:bg-white/20 dark:hover:text-gray-200">' +
      '      <span class="sr-only">Close</span>' +
      '      <svg viewBox="0 0 20 20" fill="currentColor" class="size-5"><path fill-rule="evenodd" d="M4.22 4.22a.75.75 0 0 1 1.06 0L10 8.94l4.72-4.72a.75.75 0 1 1 1.06 1.06L11.06 10l4.72 4.72a.75.75 0 1 1-1.06 1.06L10 11.06l-4.72 4.72a.75.75 0 1 1-1.06-1.06L8.94 10 4.22 5.28a.75.75 0 0 1 0-1.06Z" clip-rule="evenodd"/></svg>' +
      '    </button>' +
      '    <div class="grid h-auto w-full grid-cols-1 gap-0 md:grid-cols-3">' +
      '      <div class="col-span-1 p-2 md:w-64 md:shrink-0">' +
      '        <div class="relative h-[220px] overflow-hidden rounded-2xl md:h-full" style="background-image: linear-gradient(180deg, #ECF2FF 0%, #F8F4FF 100%);">' +
      '          <img src="../../../src/assets/illustrations/Receivables%20Table.svg" alt="" class="absolute left-1/2 top-2 h-auto w-[300px] max-w-none -translate-x-1/2 md:left-auto md:right-6 md:top-[132px] md:w-[430px] md:translate-x-0" />' +
      '        </div>' +
      '      </div>' +
      '      <div class="col-span-2 flex min-h-0 w-full flex-col p-4 md:px-9 md:py-20">' +
      '        <div class="my-auto flex flex-col gap-6">' +
      '          <h2 class="text-3xl font-semibold leading-9 text-slate-950 dark:text-white">To enable automatic card processing, complete the steps below.</h2>' +
      '          <div class="flex flex-col gap-0">' +
      '            <div class="flex gap-3">' +
      '              <div class="flex w-5 shrink-0 flex-col items-center"><span class="flex h-5 w-5 items-center justify-center rounded-full border border-blue-400 bg-blue-100 text-xs font-medium leading-4 text-blue-700">1</span><span class="w-[1.5px] flex-1 bg-gray-200"></span></div>' +
      '              <div class="flex flex-col gap-2 pb-6">' +
      '                <p class="text-sm font-medium leading-5 text-slate-950 dark:text-white">Process Any Payment</p>' +
      '                <p class="text-sm font-normal leading-5 text-gray-700 dark:text-gray-300">Go to your Payments and process any available virtual card using your terminal.<br/>This links your Merchant and Terminal IDs.</p>' +
      '                <a href="smart-exchange.html?guide=card-rows" class="inline-flex w-fit items-center justify-center rounded-md bg-blue-600 px-2.5 py-1.5 text-sm font-semibold text-white shadow-xs hover:bg-blue-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600">Go to Payments</a>' +
      '              </div>' +
      '            </div>' +
      '            <div class="flex gap-3">' +
      '              <div class="flex w-5 shrink-0 flex-col items-center"><span class="flex h-5 w-5 items-center justify-center rounded-full border border-gray-200 bg-gray-100 text-xs font-medium leading-4 text-gray-800">2</span><span class="w-px flex-1 bg-gray-200"></span></div>' +
      '              <div class="flex flex-col gap-2 pb-6"><p class="text-sm font-medium leading-5 text-slate-950 dark:text-white">Terminal Verification</p></div>' +
      '            </div>' +
      '            <div class="flex gap-3">' +
      '              <div class="flex w-5 shrink-0 flex-col items-center"><span class="flex h-5 w-5 items-center justify-center rounded-full border border-gray-200 bg-gray-100 text-xs font-medium leading-4 text-gray-800">3</span><span class="w-px flex-1 bg-gray-200"></span></div>' +
      '              <div class="flex flex-col gap-2 pb-6"><p class="text-sm font-medium leading-5 text-slate-950 dark:text-white">Verify Your Bank Account (Penny Test)</p></div>' +
      '            </div>' +
      '            <div class="flex gap-3">' +
      '              <div class="flex w-5 shrink-0 flex-col items-center"><span class="flex h-5 w-5 items-center justify-center rounded-full border border-gray-200 bg-gray-100 text-xs font-medium leading-4 text-gray-800">4</span></div>' +
      '              <div class="flex flex-col gap-2 pb-6"><p class="text-sm font-medium leading-5 text-slate-950 dark:text-white">Automatic Card Processing Activated</p></div>' +
      '            </div>' +
      '          </div>' +
      '        </div>' +
      '      </div>' +
      '    </div>' +
      '  </div>' +
      '</div>';

    document.body.appendChild(dialog);
    dialog.querySelectorAll('[data-inline-next-close]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (dialog.open) dialog.close();
      });
    });
    return dialog;
  }

  function openOptInModal() {
    var dialog = document.getElementById('pp-enable-stp-dialog');
    if (dialog && typeof dialog.showModal === 'function') {
      if (!dialog.open) dialog.showModal();
      return true;
    }
    var inlineDialog = ensureInlineOptInDialog();
    if (inlineDialog && typeof inlineDialog.showModal === 'function') {
      if (!inlineDialog.open) inlineDialog.showModal();
      return true;
    }
    return false;
  }

  window.addEventListener('storage', function (event) {
    if (event.key !== STORAGE_KEY) return;
    var next = normalizeStatus(event.newValue);
    if (next === currentStatus) return;
    currentStatus = next;
    notify();
  });

  window.STPState = {
    getStpStatus: getStpStatus,
    setStpStatus: setStpStatus,
    subscribe: subscribe,
    openOptInModal: openOptInModal,
    STATUS_ENABLED: STATUS_ENABLED,
    STATUS_DISABLED: STATUS_DISABLED
  };
})();
