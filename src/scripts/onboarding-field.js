/**
 * onboarding-field.js
 * The SMART System "Text Field [New]" input (Figma file PdvEp0MAIlof6O8MYaXCcy,
 * node 3612:83054), shared by every input in the SMART Disburse flow.
 *
 * States, as the component defines them:
 *   Default          white, 1px #d1d5db border, shadow-sm
 *   Hover            stroke one step darker: #9ca3af (error: #f87171). The
 *                    design-system variant keeps #d1d5db; the darker stroke was
 *                    asked for so hover is visible.
 *   Focused          2px #2563eb border
 *   Disabled         #f9fafb fill, text #6b7280, placeholder #d1d5db
 *   Error            1px #fca5a5 border, text #7f1d1d, placeholder #fca5a5,
 *                    red (!) icon on the right, helper text #dc2626
 *   Error + Focused  2px #ef4444 border
 *   Error + Disabled #f9fafb fill, #fca5a5 border, no icon
 * Typed text is Inter Medium 16/24, placeholder Inter Regular 16/24.
 * Errors are driven by aria-invalid="true" on the field.
 *
 * Use OBField.INPUT / OBField.TEXTAREA when building markup in JS, or put
 * data-ob-input on a static <input>/<textarea>/<button> to get the classes.
 */
window.OBField = (function () {
  'use strict';

  var ASSETS = '../../assets/onboarding/';

  var BASE = 'w-full rounded-md bg-white dark:bg-white/5 text-base leading-6 font-medium text-gray-900 dark:text-white shadow-xs ' +
    'outline-1 -outline-offset-1 outline-gray-300 dark:outline-white/10 ' +
    'placeholder:font-normal placeholder:text-gray-400 dark:placeholder:text-gray-500 ' +
    // Hover darkens the stroke one step (not while focused or disabled).
    'not-aria-[invalid=true]:hover:not-focus:not-disabled:outline-gray-400 dark:not-aria-[invalid=true]:hover:not-focus:not-disabled:outline-white/20 ' +
    'aria-[invalid=true]:hover:not-focus:not-disabled:outline-red-400 ' +
    'focus:outline-2 focus:-outline-offset-2 focus:outline-blue-600 dark:focus:outline-blue-400 ' +
    'disabled:cursor-not-allowed disabled:bg-gray-50 dark:disabled:bg-white/10 disabled:text-gray-500 dark:disabled:text-gray-400 disabled:placeholder:text-gray-300 dark:disabled:placeholder:text-gray-600 ' +
    'aria-invalid:text-red-900 dark:aria-invalid:text-red-300 aria-invalid:outline-red-300 aria-invalid:placeholder:text-red-300 ' +
    'aria-invalid:focus:outline-red-500 aria-invalid:disabled:text-red-900 dark:aria-invalid:disabled:text-red-300';

  var INPUT = 'block h-10 px-3 aria-invalid:pr-10 ' + BASE;
  var TEXTAREA = 'block px-3 py-2 ' + BASE;

  var LABEL = 'text-sm leading-5 font-medium text-gray-700 dark:text-gray-300';
  var HELPER = 'text-sm leading-5 text-gray-500 dark:text-gray-400';
  var ERROR_TEXT = 'text-sm leading-5 text-red-600 dark:text-red-400';

  /** The red (!) shown inside an errored field; hidden while the field is disabled. */
  function errorIcon(extra) {
    return '<img data-ob-field-icon src="' + ASSETS + 'icon-exclamation-circle-error.svg" alt="" width="20" height="20" ' +
      'class="pointer-events-none absolute top-1/2 right-3 hidden size-5 -translate-y-1/2' + (extra ? ' ' + extra : '') + '">';
  }

  /**
   * Turns the error state on/off for a field: aria-invalid, the (!) icon next
   * to it (if any) and an optional helper element for the message.
   */
  function setError(field, on, helper, message) {
    field.setAttribute('aria-invalid', on ? 'true' : 'false');
    var wrap = field.parentElement;
    var icon = wrap && wrap.querySelector('[data-ob-field-icon]');
    if (icon) icon.classList.toggle('hidden', !on || field.disabled);
    if (helper) {
      helper.textContent = message || '';
      helper.classList.toggle('hidden', !message);
    }
  }

  function applyStatic() {
    var els = document.querySelectorAll('[data-ob-input]');
    for (var i = 0; i < els.length; i += 1) {
      var el = els[i];
      el.className = (el.tagName === 'TEXTAREA' ? TEXTAREA : INPUT) + (el.className ? ' ' + el.className : '');
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', applyStatic);
  else applyStatic();

  return {
    INPUT: INPUT,
    TEXTAREA: TEXTAREA,
    LABEL: LABEL,
    HELPER: HELPER,
    ERROR_TEXT: ERROR_TEXT,
    errorIcon: errorIcon,
    setError: setError
  };
})();
