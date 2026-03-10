/**
 * Global STP state store for dashboard pages.
 * Source of truth: localStorage key.
 */
(function () {
  'use strict';

  // v3: global STP setup progression state.
  var STORAGE_KEY = 'sx_global_stp_state_v3';
  var LEGACY_STATUS_KEY = 'sx_global_stp_status_v2';
  var STATUS_ENABLED = 'enabled';
  var STATUS_DISABLED = 'disabled';
  var STATUS_IN_PROGRESS = 'in_progress';
  var STEP_OPT_IN_REQUIRED = 'opt_in_required';
  var STEP_TERMINAL_COMPLETED = 'terminal_completed_tid_mid_received';
  var STEP_BANK_VERIFICATION_REQUIRED = 'bank_verification_required';
  var STEP_COMPLETED = 'completed';
  var listeners = [];

  function normalizeStatus(value) {
    if (value === STATUS_ENABLED || value === STATUS_DISABLED || value === STATUS_IN_PROGRESS) return value;
    return STATUS_DISABLED;
  }

  function normalizeStep(value) {
    if (
      value === STEP_OPT_IN_REQUIRED ||
      value === STEP_TERMINAL_COMPLETED ||
      value === STEP_BANK_VERIFICATION_REQUIRED ||
      value === STEP_COMPLETED
    ) return value;
    return STEP_OPT_IN_REQUIRED;
  }

  function stateFromStatus(status) {
    var normalized = normalizeStatus(status);
    if (normalized === STATUS_ENABLED) {
      return { stpStatus: STATUS_ENABLED, stpStep: STEP_COMPLETED };
    }
    if (normalized === STATUS_IN_PROGRESS) {
      return { stpStatus: STATUS_IN_PROGRESS, stpStep: STEP_BANK_VERIFICATION_REQUIRED };
    }
    return { stpStatus: STATUS_DISABLED, stpStep: STEP_OPT_IN_REQUIRED };
  }

  function normalizeState(input) {
    var stpStatus = normalizeStatus(input && input.stpStatus);
    var stpStep = normalizeStep(input && input.stpStep);
    if (stpStatus === STATUS_ENABLED) stpStep = STEP_COMPLETED;
    else if (stpStatus === STATUS_DISABLED) stpStep = STEP_OPT_IN_REQUIRED;
    else if (stpStep === STEP_OPT_IN_REQUIRED || stpStep === STEP_COMPLETED) stpStep = STEP_BANK_VERIFICATION_REQUIRED;
    return { stpStatus: stpStatus, stpStep: stpStep };
  }

  function readStoredState() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        return normalizeState(JSON.parse(raw));
      }
      // Backward compatibility with legacy status-only key.
      var legacy = normalizeStatus(localStorage.getItem(LEGACY_STATUS_KEY));
      if (legacy === STATUS_ENABLED) return stateFromStatus(STATUS_ENABLED);
      return { stpStatus: STATUS_DISABLED, stpStep: STEP_OPT_IN_REQUIRED };
    } catch (error) {
      return { stpStatus: STATUS_DISABLED, stpStep: STEP_OPT_IN_REQUIRED };
    }
  }

  var currentState = readStoredState();

  function notify() {
    listeners.slice().forEach(function (listener) {
      try {
        listener(currentState.stpStatus, currentState);
      } catch (error) {
        console.error('STPState listener failed:', error);
      }
    });
    window.dispatchEvent(new CustomEvent('sx:stp-status-change', {
      detail: {
        status: currentState.stpStatus,
        stpStatus: currentState.stpStatus,
        stpStep: currentState.stpStep
      }
    }));
  }

  function persistState(nextState) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nextState));
    } catch (error) {
      console.error('Unable to persist STP status:', error);
    }
  }

  function getStpStatus() {
    return currentState.stpStatus;
  }

  function getStpState() {
    return {
      stpStatus: currentState.stpStatus,
      stpStep: currentState.stpStep
    };
  }

  function setStpStatus(nextStatus) {
    var nextState = stateFromStatus(nextStatus);
    if (nextState.stpStatus === currentState.stpStatus && nextState.stpStep === currentState.stpStep) {
      return currentState.stpStatus;
    }
    currentState = nextState;
    persistState(currentState);
    notify();
    return currentState.stpStatus;
  }

  function setStpStep(nextStep) {
    var normalizedStep = normalizeStep(nextStep);
    var nextState;
    if (normalizedStep === STEP_COMPLETED) nextState = { stpStatus: STATUS_ENABLED, stpStep: STEP_COMPLETED };
    else if (normalizedStep === STEP_OPT_IN_REQUIRED) nextState = { stpStatus: STATUS_DISABLED, stpStep: STEP_OPT_IN_REQUIRED };
    else nextState = { stpStatus: STATUS_IN_PROGRESS, stpStep: normalizedStep };
    if (nextState.stpStatus === currentState.stpStatus && nextState.stpStep === currentState.stpStep) {
      return currentState.stpStep;
    }
    currentState = nextState;
    persistState(currentState);
    notify();
    return currentState.stpStep;
  }

  function subscribe(listener) {
    if (typeof listener !== 'function') return function () {};
    listeners.push(listener);
    listener(currentState.stpStatus, currentState);
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
      '        <details class="w-full rounded-md bg-gray-100 p-3 md:hidden">' +
      '          <summary class="flex cursor-pointer list-none items-center justify-between text-sm font-medium leading-6 text-slate-950 dark:text-white">' +
      '            <span>How it works</span>' +
      '            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="size-4 text-gray-500 dark:text-gray-400"><path fill-rule="evenodd" d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 10.94l3.71-3.71a.75.75 0 1 1 1.06 1.06l-4.24 4.24a.75.75 0 0 1-1.06 0L5.21 8.29a.75.75 0 0 1 .02-1.08Z" clip-rule="evenodd"/></svg>' +
      '          </summary>' +
      '          <div class="mt-2 flex flex-col gap-1.5 text-sm font-normal leading-6 text-gray-700 dark:text-gray-300">' +
      '            <div class="flex items-start gap-1.5"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none" class="mt-0.5 shrink-0"><path fill-rule="evenodd" clip-rule="evenodd" d="M16.7045 4.15347C17.034 4.4045 17.0976 4.87509 16.8466 5.20457L8.84657 15.7046C8.71541 15.8767 8.51627 15.9838 8.30033 15.9983C8.08439 16.0129 7.87271 15.9334 7.71967 15.7804L3.21967 11.2804C2.92678 10.9875 2.92678 10.5126 3.21967 10.2197C3.51256 9.92682 3.98744 9.92682 4.28033 10.2197L8.17351 14.1129L15.6534 4.29551C15.9045 3.96603 16.3751 3.90243 16.7045 4.15347Z" fill="#2563EB"/></svg><p>Eligible virtual card payments are securely transmitted to your processor.</p></div>' +
      '            <div class="flex items-start gap-1.5"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none" class="mt-0.5 shrink-0"><path fill-rule="evenodd" clip-rule="evenodd" d="M16.7045 4.15347C17.034 4.4045 17.0976 4.87509 16.8466 5.20457L8.84657 15.7046C8.71541 15.8767 8.51627 15.9838 8.30033 15.9983C8.08439 16.0129 7.87271 15.9334 7.71967 15.7804L3.21967 11.2804C2.92678 10.9875 2.92678 10.5126 3.21967 10.2197C3.51256 9.92682 3.98744 9.92682 4.28033 10.2197L8.17351 14.1129L15.6534 4.29551C15.9045 3.96603 16.3751 3.90243 16.7045 4.15347Z" fill="#2563EB"/></svg><p>Funds settle as usual.</p></div>' +
      '            <div class="flex items-start gap-1.5"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none" class="mt-0.5 shrink-0"><path fill-rule="evenodd" clip-rule="evenodd" d="M16.7045 4.15347C17.034 4.4045 17.0976 4.87509 16.8466 5.20457L8.84657 15.7046C8.71541 15.8767 8.51627 15.9838 8.30033 15.9983C8.08439 16.0129 7.87271 15.9334 7.71967 15.7804L3.21967 11.2804C2.92678 10.9875 2.92678 10.5126 3.21967 10.2197C3.51256 9.92682 3.98744 9.92682 4.28033 10.2197L8.17351 14.1129L15.6534 4.29551C15.9045 3.96603 16.3751 3.90243 16.7045 4.15347Z" fill="#2563EB"/></svg><p>You can turn this off anytime.</p></div>' +
      '          </div>' +
      '        </details>' +
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
      '      <div class="mt-6 flex w-full flex-col items-stretch gap-3 md:mt-8 md:flex-row md:items-center md:justify-between">' +
      '        <button type="button" data-inline-stp-confirm disabled class="inline-flex w-full items-center justify-center rounded-md bg-blue-600 px-6 py-2.5 text-base font-semibold text-white shadow-xs hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-blue-300 disabled:hover:bg-blue-300 md:w-auto">Confirm</button>' +
      '        <button type="button" data-inline-stp-close class="inline-flex w-full items-center justify-center rounded-md px-2.5 py-1.5 text-center text-sm font-semibold text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/10 md:ml-auto md:w-auto">Remind me later</button>' +
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
      '              <div class="flex w-5 shrink-0 flex-col items-center"><span class="flex h-5 w-5 items-center justify-center rounded-full bg-blue-600"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 20 20" fill="none"><path fill-rule="evenodd" clip-rule="evenodd" d="M16.7045 4.15347C17.034 4.4045 17.0976 4.87509 16.8466 5.20457L8.84657 15.7046C8.71541 15.8767 8.51627 15.9838 8.30033 15.9983C8.08439 16.0129 7.87271 15.9334 7.71967 15.7804L3.21967 11.2804C2.92678 10.9875 2.92678 10.5126 3.21967 10.2197C3.51256 9.92682 3.98744 9.92682 4.28033 10.2197L8.17351 14.1129L15.6534 4.29551C15.9045 3.96603 16.3751 3.90243 16.7045 4.15347Z" fill="#ffffff"/></svg></span><span class="w-[1.5px] flex-1 bg-blue-600"></span></div>' +
      '              <div class="flex flex-col gap-2 pb-6"><p class="text-sm font-semibold leading-5 text-slate-950 dark:text-white">Process Any Payment</p></div>' +
      '            </div>' +
      '            <div class="flex gap-3">' +
      '              <div class="flex w-5 shrink-0 flex-col items-center"><span class="flex h-5 w-5 items-center justify-center rounded-full bg-blue-600"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 20 20" fill="none"><path fill-rule="evenodd" clip-rule="evenodd" d="M16.7045 4.15347C17.034 4.4045 17.0976 4.87509 16.8466 5.20457L8.84657 15.7046C8.71541 15.8767 8.51627 15.9838 8.30033 15.9983C8.08439 16.0129 7.87271 15.9334 7.71967 15.7804L3.21967 11.2804C2.92678 10.9875 2.92678 10.5126 3.21967 10.2197C3.51256 9.92682 3.98744 9.92682 4.28033 10.2197L8.17351 14.1129L15.6534 4.29551C15.9045 3.96603 16.3751 3.90243 16.7045 4.15347Z" fill="#ffffff"/></svg></span><span class="w-[1.5px] flex-1 bg-blue-600"></span></div>' +
      '              <div class="flex flex-col gap-2 pb-6"><p class="text-sm font-semibold leading-5 text-slate-950 dark:text-white">Terminal Verification</p></div>' +
      '            </div>' +
      '            <div class="flex gap-3">' +
      '              <div class="flex w-5 shrink-0 flex-col items-center"><span class="flex h-5 w-5 items-center justify-center rounded-full border border-blue-400 bg-blue-100 text-xs font-semibold leading-4 text-blue-700">3</span><span class="w-[1.5px] flex-1 bg-gray-200"></span></div>' +
      '              <div class="flex flex-col gap-2 pb-6"><p class="text-sm font-semibold leading-5 text-slate-950 dark:text-white">Verify Your Bank Account (Penny Test)</p><p class="text-sm font-normal leading-5 text-gray-700 dark:text-gray-300">We will send a small test deposit to your bank account.<br />You will need to confirm the exact amount to complete setup.</p><button type="button" data-inline-next-verify class="inline-flex w-fit items-center justify-center rounded-md bg-blue-600 px-2.5 py-1.5 text-sm font-semibold text-white shadow-xs hover:bg-blue-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600">Verify now</button></div>' +
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
    var verifyBtn = dialog.querySelector('[data-inline-next-verify]');
    if (verifyBtn) {
      verifyBtn.addEventListener('click', function () {
        if (dialog.open) dialog.close();
        openVerifyModal();
      });
    }
    return dialog;
  }

  function ensureInlineVerifyDialog() {
    var existing = document.getElementById('sx-inline-stp-verify-dialog');
    if (existing) return existing;

    var dialog = document.createElement('dialog');
    dialog.id = 'sx-inline-stp-verify-dialog';
    dialog.className = 'fixed inset-0 m-0 size-auto max-h-none max-w-none border-0 p-0 bg-transparent backdrop:bg-transparent';
    dialog.innerHTML =
      '<div class="fixed inset-0 z-[100] bg-gray-900/75 transition-opacity duration-300 ease-out motion-reduce:transition-none"></div>' +
      '<div class="fixed inset-0 z-[110] flex items-center justify-center p-4 sm:p-6">' +
      '  <div class="relative w-full max-w-lg transform overflow-hidden rounded-xl bg-white text-left shadow-xl dark:bg-gray-900 dark:ring-1 dark:ring-white/10">' +
      '    <div class="flex self-stretch flex-col items-end justify-end px-4 pt-4">' +
      '      <button type="button" data-inline-verify-close class="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-500 dark:hover:bg-white/10 dark:hover:text-gray-300">' +
      '        <span class="sr-only">Close</span>' +
      '        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="size-5"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>' +
      '      </button>' +
      '    </div>' +
      '    <div class="flex flex-col gap-6 p-6 px-8 pt-0">' +
      '      <div class="flex flex-col items-center text-center">' +
      '        <svg xmlns="http://www.w3.org/2000/svg" width="44" height="44" viewBox="0 0 44 44" fill="none" aria-hidden="true">' +
      '          <path d="M21.2374 4.35593C21.6993 4.04802 22.301 4.04802 22.7629 4.35593L39.2629 15.3559C39.8947 15.7772 40.0655 16.6309 39.6442 17.2627C39.223 17.8946 38.3693 18.0653 37.7374 17.6441L22.0001 7.15254L6.26286 17.6441C5.63101 18.0653 4.77731 17.8946 4.35608 17.2627C3.93484 16.6309 4.10558 15.7772 4.73743 15.3559L21.2374 4.35593Z" fill="#3B82F6"/>' +
      '          <path fill-rule="evenodd" clip-rule="evenodd" d="M37.125 18.9429V37.125H38.5C39.2594 37.125 39.875 37.7406 39.875 38.5C39.875 39.2594 39.2594 39.875 38.5 39.875H5.5C4.74061 39.875 4.125 39.2594 4.125 38.5C4.125 37.7406 4.74061 37.125 5.5 37.125H6.875V18.9429C6.875 18.2658 7.36794 17.6895 8.03686 17.5845C12.5873 16.8705 17.2508 16.5 22 16.5C26.7492 16.5 31.4127 16.8705 35.9631 17.5845C36.6321 17.6895 37.125 18.2658 37.125 18.9429ZM23.375 23.375C23.375 22.6156 22.7594 22 22 22C21.2406 22 20.625 22.6156 20.625 23.375V35.75C20.625 36.5094 21.2406 37.125 22 37.125C22.7594 37.125 23.375 36.5094 23.375 35.75V23.375ZM28.875 22C29.6344 22 30.25 22.6156 30.25 23.375V35.75C30.25 36.5094 29.6344 37.125 28.875 37.125C28.1156 37.125 27.5 36.5094 27.5 35.75V23.375C27.5 22.6156 28.1156 22 28.875 22ZM16.5 23.375C16.5 22.6156 15.8844 22 15.125 22C14.3656 22 13.75 22.6156 13.75 23.375V35.75C13.75 36.5094 14.3656 37.125 15.125 37.125C15.8844 37.125 16.5 36.5094 16.5 35.75V23.375Z" fill="#3B82F6"/>' +
      '        </svg>' +
      '        <div class="mt-6 flex flex-col items-center gap-2">' +
      '          <h2 class="text-center text-lg/6 font-semibold text-gray-900 dark:text-white">Bank Account Verification</h2>' +
      '          <p class="text-center text-sm/5 font-normal text-gray-500 dark:text-gray-400">This step ensures funds are settling to your account. Once the deposit amount is confirmed, set up for automatic card processing will be complete.</p>' +
      '        </div>' +
      '      </div>' +
      '      <div class="flex flex-col gap-2">' +
      '        <label for="sx-inline-deposit-amount" class="block text-sm/6 font-medium text-gray-900 dark:text-white">Enter exact deposit amount</label>' +
      '        <div class="grid grid-cols-1">' +
      '          <input id="sx-inline-deposit-amount" type="text" inputmode="decimal" pattern="[0-9]*[.]?[0-9]*" placeholder="0.00" aria-invalid="false" class="col-start-1 row-start-1 block w-full rounded-md bg-white py-2 pr-10 pl-3 text-sm font-normal text-gray-900 outline outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline focus:outline-2 focus:-outline-offset-2 focus:outline-blue-600 dark:bg-white/5 dark:text-white dark:outline-white/10 dark:placeholder:text-gray-500" />' +
      '          <svg id="sx-inline-deposit-amount-error-icon" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" class="pointer-events-none col-start-1 row-start-1 mr-3 hidden size-5 self-center justify-self-end text-red-500 sm:size-4"><path d="M8 15A7 7 0 1 0 8 1a7 7 0 0 0 0 14ZM8 4a.75.75 0 0 1 .75.75v3a.75.75 0 0 1-1.5 0v-3A.75.75 0 0 1 8 4Zm0 8a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clip-rule="evenodd" fill-rule="evenodd"/></svg>' +
      '        </div>' +
      '        <p id="sx-inline-deposit-amount-error" class="hidden text-sm text-red-600 dark:text-red-400">Only numbers and one decimal point are allowed.</p>' +
      '      </div>' +
      '    </div>' +
      '    <div class="flex justify-end gap-3 border-t border-gray-200 px-6 py-5 dark:border-white/10">' +
      '      <button type="button" data-inline-verify-close class="rounded-md bg-white px-3.5 py-2.5 text-sm font-semibold text-gray-700 shadow-xs ring-1 ring-inset ring-gray-300 hover:bg-gray-50 dark:bg-white/5 dark:text-white dark:ring-white/10 dark:hover:bg-white/10">Cancel</button>' +
      '      <button id="sx-inline-verify-deposit-btn" type="button" disabled class="inline-flex items-center justify-center whitespace-nowrap rounded-md bg-blue-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-blue-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:bg-blue-300 disabled:hover:bg-blue-300">Verify</button>' +
      '    </div>' +
      '  </div>' +
      '</div>';
    document.body.appendChild(dialog);

    var input = dialog.querySelector('#sx-inline-deposit-amount');
    var verifyBtn = dialog.querySelector('#sx-inline-verify-deposit-btn');
    var closeBtns = dialog.querySelectorAll('[data-inline-verify-close]');
    var errorMsg = dialog.querySelector('#sx-inline-deposit-amount-error');
    var errorIcon = dialog.querySelector('#sx-inline-deposit-amount-error-icon');
    var hasError = false;
    var isVerifying = false;

    function setError(show) {
      hasError = show;
      if (!input || !errorMsg || !errorIcon) return;
      input.setAttribute('aria-invalid', show ? 'true' : 'false');
      errorMsg.classList.toggle('hidden', !show);
      errorIcon.classList.toggle('hidden', !show);
    }
    function sanitizeDecimal(raw) {
      var cleaned = String(raw || '').replace(/[^0-9.]/g, '');
      var firstDot = cleaned.indexOf('.');
      if (firstDot === -1) return cleaned;
      return cleaned.slice(0, firstDot + 1) + cleaned.slice(firstDot + 1).replace(/\./g, '');
    }
    function updateVerifyState() {
      if (!verifyBtn || !input) return;
      if (isVerifying) {
        verifyBtn.disabled = true;
        return;
      }
      verifyBtn.disabled = hasError || !/\d/.test(input.value);
    }

    function setVerifyLoading(loading) {
      isVerifying = loading;
      closeBtns.forEach(function (btn) {
        btn.disabled = loading;
      });
      if (!verifyBtn) return;
      if (loading) {
        verifyBtn.disabled = true;
        verifyBtn.classList.add('bg-indigo-500');
        verifyBtn.classList.remove('hover:bg-blue-500');
        verifyBtn.innerHTML =
          '<span class="inline-flex items-center whitespace-nowrap">' +
          '<svg class="mr-3 size-5 animate-spin text-white" viewBox="0 0 24 24" fill="none" aria-hidden="true">' +
          '<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>' +
          '<path class="opacity-90" fill="currentColor" d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4z"></path>' +
          '</svg>' +
          '<span>Verifying...</span>' +
          '</span>';
      } else {
        verifyBtn.classList.remove('bg-indigo-500');
        verifyBtn.classList.add('hover:bg-blue-500');
        verifyBtn.textContent = 'Verify';
      }
      updateVerifyState();
    }

    if (input) {
      input.addEventListener('input', function () {
        var clean = sanitizeDecimal(input.value);
        setError(clean !== input.value);
        input.value = clean;
        updateVerifyState();
      });
    }
    if (verifyBtn) {
      verifyBtn.addEventListener('click', function () {
        if (verifyBtn.disabled) return;
        if (isVerifying) return;
        setVerifyLoading(true);
        window.setTimeout(function () {
          setStpStep(STEP_COMPLETED);
          setVerifyLoading(false);
          if (dialog.open) dialog.close();
          var successDialog = ensureInlineVerifySuccessDialog();
          if (successDialog && typeof successDialog.showModal === 'function' && !successDialog.open) {
            successDialog.showModal();
          }
        }, 3000);
      });
    }
    closeBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (isVerifying) return;
        if (dialog.open) dialog.close();
      });
    });
    dialog.addEventListener('cancel', function (event) {
      if (isVerifying) event.preventDefault();
    });
    dialog.addEventListener('close', function () {
      if (input) input.value = '';
      setError(false);
      setVerifyLoading(false);
      updateVerifyState();
    });

    setVerifyLoading(false);
    updateVerifyState();
    return dialog;
  }

  function ensureInlineVerifySuccessDialog() {
    var existing = document.getElementById('sx-inline-stp-verify-success-dialog');
    if (existing) return existing;

    var dialog = document.createElement('dialog');
    dialog.id = 'sx-inline-stp-verify-success-dialog';
    dialog.className = 'fixed inset-0 m-0 size-auto max-h-none max-w-none border-0 p-0 bg-transparent backdrop:bg-transparent';
    dialog.innerHTML =
      '<div class="fixed inset-0 z-[100] bg-gray-900/75 transition-opacity duration-300 ease-out motion-reduce:transition-none"></div>' +
      '<div class="fixed inset-0 z-[110] flex items-center justify-center p-4 sm:p-6">' +
      '  <div class="relative w-full max-w-lg transform overflow-hidden rounded-xl bg-white text-left shadow-xl dark:bg-gray-900 dark:ring-1 dark:ring-white/10">' +
      '    <div class="flex self-stretch flex-col items-end justify-end px-4 pt-4">' +
      '      <button type="button" data-inline-verify-success-close class="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-500 dark:hover:bg-white/10 dark:hover:text-gray-300">' +
      '        <span class="sr-only">Close</span>' +
      '        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="size-5" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>' +
      '      </button>' +
      '    </div>' +
      '    <div class="flex flex-col gap-6 p-6 px-8 pt-0">' +
      '      <div class="flex flex-col items-center text-center">' +
      '        <svg xmlns="http://www.w3.org/2000/svg" width="44" height="44" viewBox="0 0 44 44" fill="none">' +
      '          <path fill-rule="evenodd" clip-rule="evenodd" d="M4.125 22C4.125 12.1279 12.1279 4.125 22 4.125C31.8721 4.125 39.875 12.1279 39.875 22C39.875 31.8721 31.8721 39.875 22 39.875C12.1279 39.875 4.125 31.8721 4.125 22ZM28.6189 18.6742C29.0603 18.0563 28.9171 17.1975 28.2992 16.7561C27.6813 16.3147 26.8225 16.4579 26.3811 17.0758L20.4495 25.38L17.4723 22.4027C16.9353 21.8658 16.0647 21.8658 15.5277 22.4027C14.9908 22.9397 14.9908 23.8103 15.5277 24.3473L19.6527 28.4723C19.9385 28.7581 20.3356 28.9037 20.7384 28.8703C21.1412 28.837 21.509 28.6281 21.7439 28.2992L28.6189 18.6742Z" fill="#10B981"/>' +
      '        </svg>' +
      '        <div class="mt-6 flex flex-col items-center gap-2">' +
      '          <h2 class="text-center text-lg/6 font-semibold text-gray-900 dark:text-white">Bank Account Verified Successfully!</h2>' +
      '          <p class="text-center text-sm/5 font-normal text-gray-500 dark:text-gray-400">Automatic card processing is set up, card payments will be processed automatically and you&#39;ll receive a notification.</p>' +
      '        </div>' +
      '      </div>' +
      '    </div>' +
      '    <div class="flex w-full border-t border-gray-200 px-6 py-5 dark:border-white/10">' +
      '      <button type="button" data-inline-verify-success-done class="w-full rounded-md bg-blue-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-blue-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600">Done</button>' +
      '    </div>' +
      '  </div>' +
      '</div>';

    document.body.appendChild(dialog);
    dialog.querySelectorAll('[data-inline-verify-success-close]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (dialog.open) dialog.close();
      });
    });
    var doneBtn = dialog.querySelector('[data-inline-verify-success-done]');
    if (doneBtn) {
      doneBtn.addEventListener('click', function () {
        var url = new URL(window.location.href);
        url.pathname = url.pathname.replace(/[^/]*$/, 'payment-preferences.html');
        url.searchParams.set('stpGuide', 'fully-automated');
        window.location.href = url.toString();
      });
    }
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

  function openSetupStepsModal() {
    var dialog = ensureInlineNextStepsDialog();
    if (dialog && typeof dialog.showModal === 'function' && !dialog.open) {
      dialog.showModal();
      return true;
    }
    return false;
  }

  function openVerifyModal() {
    var existing = document.getElementById('pp-verify-deposit-dialog');
    if (existing && typeof existing.showModal === 'function') {
      if (!existing.open) existing.showModal();
      return true;
    }
    var dialog = ensureInlineVerifyDialog();
    if (dialog && typeof dialog.showModal === 'function' && !dialog.open) {
      dialog.showModal();
      return true;
    }
    return false;
  }

  window.addEventListener('storage', function (event) {
    if (event.key !== STORAGE_KEY && event.key !== LEGACY_STATUS_KEY) return;
    var next = readStoredState();
    if (next.stpStatus === currentState.stpStatus && next.stpStep === currentState.stpStep) return;
    currentState = next;
    notify();
  });

  window.STPState = {
    getStpState: getStpState,
    getStpStatus: getStpStatus,
    setStpStatus: setStpStatus,
    setStpStep: setStpStep,
    subscribe: subscribe,
    openOptInModal: openOptInModal,
    openSetupStepsModal: openSetupStepsModal,
    openVerifyModal: openVerifyModal,
    STATUS_ENABLED: STATUS_ENABLED,
    STATUS_DISABLED: STATUS_DISABLED,
    STATUS_IN_PROGRESS: STATUS_IN_PROGRESS,
    STEP_OPT_IN_REQUIRED: STEP_OPT_IN_REQUIRED,
    STEP_TERMINAL_COMPLETED: STEP_TERMINAL_COMPLETED,
    STEP_BANK_VERIFICATION_REQUIRED: STEP_BANK_VERIFICATION_REQUIRED,
    STEP_COMPLETED: STEP_COMPLETED
  };
})();
