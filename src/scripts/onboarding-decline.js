/**
 * onboarding-decline.js
 * "Decline Payment" dialog for the SMART Disburse onboarding flow
 * (Figma "Decline Modals", node 20211:43257).
 *
 * Opened from the sidebar's Decline Payment button on desktop and from the
 * mobile menu item (both call window.OBDecline.open()). The user picks a reason
 * and may add a note; "Other" makes the note required (10–255 characters).
 * On confirm the decline is stored in the onboarding session and the user lands
 * on declined.html.
 *
 * Reasons live in src/data/sd-decline.json; the dialog shell is OBModal
 * (onboarding-modal.js), which must load first.
 */
window.OBDecline = (function () {
  'use strict';

  var M = window.OBModal;
  var ASSETS = '../../assets/onboarding/';
  var DATA_PATH = '../../data/sd-decline.json';
  var REQUIRED = ['reasons', 'otherReason', 'noteMinLength', 'noteMaxLength'];
  var escapeHtml = M.escapeHtml;

  function loadData() {
    return M.loadJson(DATA_PATH, REQUIRED);
  }

  var FIELD = 'w-full rounded-md bg-white text-base leading-6 shadow-xs outline-1 -outline-offset-1';
  // Colours from the SMART System "Text Field [New]" (see onboarding-field.js).
  var FIELD_OK = 'outline-[#d1d5db] focus:outline-2 focus:-outline-offset-2 focus:outline-[#2563eb]';
  var FIELD_ERROR = 'outline-[#fca5a5] focus:outline-2 focus:-outline-offset-2 focus:outline-[#ef4444]';

  function markup(data) {
    var options = data.reasons.map(function (reason, i) {
      return '<li role="option" id="ob-decline-opt-' + i + '" data-value="' + escapeHtml(reason) + '" aria-selected="false" ' +
        'class="cursor-pointer px-4 py-3 text-sm leading-5 font-medium text-gray-900 hover:bg-gray-50 data-[active=true]:bg-gray-50">' +
        escapeHtml(reason) + '</li>';
    }).join('');

    return '' +
          '<form novalidate data-ob-decline-form class="flex flex-col">' +
            '<div class="flex flex-col items-center gap-6 px-6 pb-6">' +
              '<div class="flex w-full flex-col items-center gap-4">' +
                M.illustration('icon-exclamation-triangle.svg', 'bg-[#fef2f2]') +
                '<div class="flex w-full flex-col items-center gap-2 text-center">' +
                  '<h2 id="ob-decline-title" class="text-lg leading-6 font-medium text-gray-900">Decline Payment</h2>' +
                  '<p id="ob-decline-desc" class="text-sm leading-5 text-gray-500">By selecting Decline Payment below, your payment will be declined and ' +
                    '<span class="font-medium">' + escapeHtml(M.clientName()) + '</span> will be notified.</p>' +
                '</div>' +
              '</div>' +

              // Reason: custom listbox, styled per the design.
              '<div class="relative flex w-full flex-col gap-1">' +
                '<label id="ob-decline-reason-label" class="text-sm leading-5 font-medium text-gray-700">Reason</label>' +
                '<button type="button" data-ob-decline-reason aria-haspopup="listbox" aria-expanded="false" aria-labelledby="ob-decline-reason-label ob-decline-reason-value" ' +
                  'class="' + FIELD + ' ' + FIELD_OK + ' flex h-10 cursor-pointer items-center gap-2 px-3 text-left aria-expanded:outline-2 aria-expanded:-outline-offset-2 aria-expanded:outline-[#2563eb]">' +
                  '<span id="ob-decline-reason-value" data-ob-decline-reason-value class="min-w-0 flex-1 truncate text-[#9ca3af]">Select the reason</span>' +
                  '<span class="flex shrink-0 items-center gap-0.5">' +
                    '<img src="' + ASSETS + 'icon-selector.svg" alt="" width="20" height="20" class="size-5">' +
                    '<img src="' + ASSETS + 'icon-exclamation-circle-error.svg" alt="" width="20" height="20" data-ob-decline-reason-icon class="hidden size-5">' +
                  '</span>' +
                '</button>' +
                '<ul role="listbox" tabindex="-1" data-ob-decline-list aria-labelledby="ob-decline-reason-label" ' +
                  'class="absolute inset-x-0 top-full z-10 mt-1 hidden overflow-y-auto rounded-md bg-white shadow-lg ring-1 ring-black/5 focus:outline-none">' +
                  options +
                '</ul>' +
                '<p data-ob-decline-reason-error class="hidden text-sm leading-5 text-[#dc2626]">Reason is required.</p>' +
              '</div>' +

              '<div class="flex w-full flex-col gap-1">' +
                '<div class="flex w-full items-start gap-1 text-sm leading-5 font-medium">' +
                  '<label for="ob-decline-note" class="flex-1 text-gray-700">Additional Note</label>' +
                  '<span data-ob-decline-optional class="shrink-0 text-gray-500">Optional</span>' +
                '</div>' +
                '<textarea id="ob-decline-note" data-ob-decline-note rows="2" maxlength="' + data.noteMaxLength + '" placeholder="Please provide more details" ' +
                  'class="' + FIELD + ' ' + FIELD_OK + ' block min-h-[66px] resize-y px-3 py-2 font-medium text-[#111827] placeholder:font-normal placeholder:text-[#9ca3af]"></textarea>' +
                '<p data-ob-decline-note-error class="hidden text-sm leading-5 text-[#dc2626]"></p>' +
              '</div>' +
            '</div>' +

            '<div class="flex flex-col gap-4 px-6 pb-6">' +
              '<button type="submit" class="' + M.BUTTON + ' bg-[#dc2626] text-white hover:bg-[#ef4444] focus-visible:outline-[#dc2626]">Decline Payment</button>' +
              '<button type="button" data-ob-modal-close class="' + M.BUTTON + ' border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 focus-visible:outline-blue-600">Cancel</button>' +
            '</div>' +
          '</form>';
  }

  function setFieldState(el, invalid) {
    FIELD_OK.split(' ').forEach(function (c) { el.classList.toggle(c, !invalid); });
    FIELD_ERROR.split(' ').forEach(function (c) { el.classList.toggle(c, invalid); });
    el.setAttribute('aria-invalid', invalid ? 'true' : 'false');
  }

  function build(data) {
    var backdrop = M.open(markup(data), 'ob-decline-title');

    var form = backdrop.querySelector('[data-ob-decline-form]');
    var reasonBtn = backdrop.querySelector('[data-ob-decline-reason]');
    var reasonValue = backdrop.querySelector('[data-ob-decline-reason-value]');
    var reasonIcon = backdrop.querySelector('[data-ob-decline-reason-icon]');
    var reasonError = backdrop.querySelector('[data-ob-decline-reason-error]');
    var list = backdrop.querySelector('[data-ob-decline-list]');
    var options = Array.prototype.slice.call(list.querySelectorAll('[role="option"]'));
    var note = backdrop.querySelector('[data-ob-decline-note]');
    var noteError = backdrop.querySelector('[data-ob-decline-note-error]');
    var optional = backdrop.querySelector('[data-ob-decline-optional]');

    var selected = '';
    var active = -1;
    var submitted = false;

    function isOther() { return selected === data.otherReason; }

    function validate() {
      var reasonInvalid = !selected;
      reasonValue.classList.toggle('text-[#fca5a5]', reasonInvalid && !selected);
      reasonValue.classList.toggle('text-[#9ca3af]', !reasonInvalid && !selected);
      reasonIcon.classList.toggle('hidden', !reasonInvalid);
      reasonError.classList.toggle('hidden', !reasonInvalid);
      setFieldState(reasonBtn, reasonInvalid);

      var text = note.value.trim();
      var noteMessage = '';
      if (isOther()) {
        if (!text) noteMessage = 'Additional Note is required.';
        else if (text.length < data.noteMinLength || text.length > data.noteMaxLength) {
          noteMessage = 'Enter a minimum of ' + data.noteMinLength + ' and a maximum of ' + data.noteMaxLength + ' characters.';
        }
      }
      noteError.textContent = noteMessage;
      noteError.classList.toggle('hidden', !noteMessage);
      note.classList.toggle('text-[#7f1d1d]', !!noteMessage);
      note.classList.toggle('text-[#111827]', !noteMessage);
      note.classList.toggle('placeholder:text-[#fca5a5]', !!noteMessage);
      note.classList.toggle('placeholder:text-[#9ca3af]', !noteMessage);
      setFieldState(note, !!noteMessage);

      return !reasonInvalid && !noteMessage;
    }

    function setActive(index) {
      active = index;
      options.forEach(function (opt, i) { opt.setAttribute('data-active', i === index ? 'true' : 'false'); });
      if (index >= 0) {
        list.setAttribute('aria-activedescendant', options[index].id);
        // Scroll inside the list only — scrollIntoView would also scroll the
        // dialog's backdrop and shift the whole dialog on small screens.
        var opt = options[index];
        if (opt.offsetTop < list.scrollTop) list.scrollTop = opt.offsetTop;
        else if (opt.offsetTop + opt.offsetHeight > list.scrollTop + list.clientHeight) {
          list.scrollTop = opt.offsetTop + opt.offsetHeight - list.clientHeight;
        }
      } else {
        list.removeAttribute('aria-activedescendant');
      }
    }

    // Mouse opens with nothing highlighted (or the current choice); the
    // keyboard starts on the current choice or the first option.
    var GAP = 16;

    /**
     * Keeps the open list inside the viewport: it gets the room below the
     * field, or opens upwards when there is more room above. A list running
     * past the screen edge would make the backdrop scroll and the dialog jump.
     */
    function placeList() {
      var rect = reasonBtn.getBoundingClientRect();
      var below = window.innerHeight - rect.bottom - GAP;
      var above = rect.top - GAP;
      var up = below < list.scrollHeight && above > below;
      list.classList.toggle('top-full', !up);
      list.classList.toggle('mt-1', !up);
      list.classList.toggle('bottom-full', up);
      list.classList.toggle('mb-1', up);
      list.style.maxHeight = Math.max(120, up ? above : below) + 'px';
    }

    function openList(open, fromKeyboard) {
      list.classList.toggle('hidden', !open);
      reasonBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
      if (open) {
        placeList();
        var current = data.reasons.indexOf(selected);
        setActive(fromKeyboard ? Math.max(0, current) : current);
        list.focus({ preventScroll: true });
      }
    }

    function choose(index, fromKeyboard) {
      selected = data.reasons[index];
      options.forEach(function (opt, i) { opt.setAttribute('aria-selected', i === index ? 'true' : 'false'); });
      reasonValue.textContent = selected;
      reasonValue.classList.remove('text-[#9ca3af]', 'text-[#fca5a5]');
      reasonValue.classList.add('font-medium', 'text-[#111827]');
      // "Other" needs an explanation, so the note stops being optional.
      optional.classList.toggle('hidden', isOther());
      openList(false);
      // A mouse pick leaves the field unfocused (focus parks on the dialog);
      // the keyboard keeps focus on the field so the user can carry on tabbing.
      (fromKeyboard ? reasonBtn : backdrop.querySelector('[data-ob-modal-dialog]')).focus({ preventScroll: true });
      if (submitted) validate();
    }

    reasonBtn.addEventListener('click', function () {
      openList(list.classList.contains('hidden'));
    });
    reasonBtn.addEventListener('keydown', function (event) {
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        openList(true, true);
      }
    });
    list.addEventListener('click', function (event) {
      var opt = event.target.closest('[role="option"]');
      if (opt) choose(options.indexOf(opt));
    });
    list.addEventListener('keydown', function (event) {
      if (event.key === 'ArrowDown') { event.preventDefault(); setActive(Math.min(options.length - 1, active + 1)); }
      else if (event.key === 'ArrowUp') { event.preventDefault(); setActive(Math.max(0, active - 1)); }
      else if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); if (active >= 0) choose(active, true); }
      else if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); openList(false); reasonBtn.focus({ preventScroll: true }); }
      else if (event.key === 'Tab') { openList(false); }
    });
    backdrop.addEventListener('click', function (event) {
      if (!list.classList.contains('hidden') && !event.target.closest('[data-ob-decline-list], [data-ob-decline-reason]')) openList(false);
    });
    note.addEventListener('input', function () { if (submitted) validate(); });

    form.addEventListener('submit', function (event) {
      event.preventDefault();
      submitted = true;
      if (!validate()) {
        (selected ? note : reasonBtn).focus();
        return;
      }
      if (window.SDOnboardingContext) {
        window.SDOnboardingContext.saveState({
          declined: { reason: selected, note: note.value.trim(), declinedAt: new Date().toISOString() }
        });
      }
      window.location.href = 'declined.html';
    });

    return backdrop;
  }

  function open() {
    loadData().then(function (data) {
      if (data) build(data);
    });
  }

  return { open: open, close: M.close, loadData: loadData };
})();
