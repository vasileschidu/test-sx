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

  var BASE = 'w-full rounded-md bg-white text-base leading-6 font-medium text-[#111827] shadow-xs ' +
    'outline-1 -outline-offset-1 outline-[#d1d5db] ' +
    'placeholder:font-normal placeholder:text-[#9ca3af] ' +
    // Hover darkens the stroke one step (not while focused or disabled).
    'not-aria-[invalid=true]:hover:not-focus:not-disabled:outline-[#9ca3af] ' +
    'aria-[invalid=true]:hover:not-focus:not-disabled:outline-[#f87171] ' +
    'focus:outline-2 focus:-outline-offset-2 focus:outline-[#2563eb] ' +
    'disabled:cursor-not-allowed disabled:bg-[#f9fafb] disabled:text-[#6b7280] disabled:placeholder:text-[#d1d5db] ' +
    'aria-invalid:text-[#7f1d1d] aria-invalid:outline-[#fca5a5] aria-invalid:placeholder:text-[#fca5a5] ' +
    'aria-invalid:focus:outline-[#ef4444] aria-invalid:disabled:text-[#7f1d1d]';

  var INPUT = 'block h-10 px-3 aria-invalid:pr-10 ' + BASE;
  var TEXTAREA = 'block px-3 py-2 ' + BASE;

  var LABEL = 'text-sm leading-5 font-medium text-[#374151]';
  var HELPER = 'text-sm leading-5 text-[#6b7280]';
  var ERROR_TEXT = 'text-sm leading-5 text-[#dc2626]';

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
