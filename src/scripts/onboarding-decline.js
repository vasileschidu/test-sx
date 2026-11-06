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

  var FIELD = 'w-full rounded-md bg-white dark:bg-white/5 text-base leading-6 shadow-xs outline-1 -outline-offset-1';
  // Colours from the SMART System "Text Field [New]" (see onboarding-field.js).
  var FIELD_OK = 'outline-gray-300 dark:outline-white/10 focus:outline-2 focus:-outline-offset-2 focus:outline-blue-600 dark:focus:outline-blue-400';
  var FIELD_ERROR = 'outline-red-300 focus:outline-2 focus:-outline-offset-2 focus:outline-red-500';

  function markup(data) {
    var options = data.reasons.map(function (reason, i) {
      return '<li role="option" id="ob-decline-opt-' + i + '" data-value="' + escapeHtml(reason) + '" aria-selected="false" ' +
        'class="cursor-pointer px-4 py-3 text-sm leading-5 font-medium text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-white/5 data-[active=true]:bg-gray-50 dark:data-[active=true]:bg-white/5">' +
        escapeHtml(reason) + '</li>';
    }).join('');

    return '' +
          '<form novalidate id="ob-decline-form" data-ob-decline-form class="flex flex-col">' +
            '<div class="flex flex-col items-center gap-6 px-6 pb-6">' +
              '<div class="flex w-full flex-col items-center gap-4">' +
                M.illustration('icon-exclamation-triangle.svg', 'bg-red-50 dark:bg-red-500/10') +
                '<div class="flex w-full flex-col items-center gap-2 text-center">' +
                  '<h2 id="ob-decline-title" class="text-lg leading-6 font-medium text-gray-900 dark:text-white">Decline Payment</h2>' +
                  '<p id="ob-decline-desc" class="text-sm leading-5 text-gray-500 dark:text-gray-400">By selecting Decline Payment below, your payment will be declined and ' +
                    '<span class="font-medium">' + escapeHtml(M.clientName()) + '</span> will be notified.</p>' +
                '</div>' +
              '</div>' +

              // Reason: custom listbox, styled per the design.
              '<div class="relative flex w-full flex-col gap-1">' +
                '<label id="ob-decline-reason-label" class="text-sm leading-5 font-medium text-gray-700 dark:text-gray-300">Reason</label>' +
                '<button type="button" data-ob-decline-reason aria-haspopup="listbox" aria-expanded="false" aria-labelledby="ob-decline-reason-label ob-decline-reason-value" ' +
                  'class="' + FIELD + ' ' + FIELD_OK + ' flex h-10 cursor-pointer items-center gap-2 px-3 text-left aria-expanded:outline-2 aria-expanded:-outline-offset-2 aria-expanded:outline-blue-600 dark:aria-expanded:outline-blue-400">' +
                  '<span id="ob-decline-reason-value" data-ob-decline-reason-value class="min-w-0 flex-1 truncate text-gray-400 dark:text-gray-500">Select the reason</span>' +
                  '<span class="flex shrink-0 items-center gap-0.5">' +
                    '<img src="' + ASSETS + 'icon-selector.svg" alt="" width="20" height="20" class="size-5">' +
                    '<img src="' + ASSETS + 'icon-exclamation-circle-error.svg" alt="" width="20" height="20" data-ob-decline-reason-icon class="hidden size-5">' +
                  '</span>' +
                '</button>' +
                '<ul role="listbox" tabindex="-1" data-ob-decline-list aria-labelledby="ob-decline-reason-label" ' +
                  'class="fixed z-10 hidden overflow-y-auto rounded-md bg-white dark:bg-gray-900 shadow-lg ring-1 ring-black/5 dark:ring-white/10 focus:outline-none">' +
                  options +
                '</ul>' +
                '<p data-ob-decline-reason-error class="hidden text-sm leading-5 text-red-600 dark:text-red-400">Reason is required.</p>' +
              '</div>' +

              '<div class="flex w-full flex-col gap-1">' +
                '<div class="flex w-full items-start gap-1 text-sm leading-5 font-medium">' +
                  '<label for="ob-decline-note" class="flex-1 text-gray-700 dark:text-gray-300">Additional Note</label>' +
                  '<span data-ob-decline-optional class="shrink-0 text-gray-500 dark:text-gray-400">Optional</span>' +
                '</div>' +
                '<textarea id="ob-decline-note" data-ob-decline-note rows="2" maxlength="' + data.noteMaxLength + '" placeholder="Please provide more details" ' +
                  'class="' + FIELD + ' ' + FIELD_OK + ' block min-h-[66px] resize-y px-3 py-2 font-medium text-gray-900 dark:text-white placeholder:font-normal placeholder:text-gray-400 dark:placeholder:text-gray-500"></textarea>' +
                '<p data-ob-decline-note-error class="hidden text-sm leading-5 text-red-600 dark:text-red-400"></p>' +
              '</div>' +
            '</div>' +
          '</form>';
  }

  // Rendered below the form by the dialog shell; `form` ties Submit to the form.
  function footer() {
    return '<div class="flex flex-col gap-4 px-6 pb-6">' +
      '<button type="submit" form="ob-decline-form" class="' + M.BUTTON_BASE + ' bg-red-600 text-white hover:bg-red-500 focus-visible:outline-red-600">Decline Payment</button>' +
      '<button type="button" data-ob-modal-close class="' + M.BUTTON + ' border border-gray-300 dark:border-white/10 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 focus-visible:outline-blue-600 dark:focus-visible:outline-blue-400">Cancel</button>' +
    '</div>';
  }

  function setFieldState(el, invalid) {
    FIELD_OK.split(' ').forEach(function (c) { el.classList.toggle(c, !invalid); });
    FIELD_ERROR.split(' ').forEach(function (c) { el.classList.toggle(c, invalid); });
    el.setAttribute('aria-invalid', invalid ? 'true' : 'false');
  }

  function build(data) {
    var backdrop = M.open(markup(data), 'ob-decline-title', { footer: footer() });

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
      reasonValue.classList.toggle('text-red-300', reasonInvalid && !selected);
      reasonValue.classList.toggle('text-gray-400 dark:text-gray-500', !reasonInvalid && !selected);
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
      note.classList.toggle('text-red-900 dark:text-red-300', !!noteMessage);
      note.classList.toggle('text-gray-900 dark:text-white', !noteMessage);
      note.classList.toggle('placeholder:text-red-300', !!noteMessage);
      note.classList.toggle('placeholder:text-gray-400 dark:placeholder:text-gray-500', !noteMessage);
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
     * The list is fixed (not absolute) so the dialog panel can't clip it; it
     * sits 4px under the field, or above it when there is more room there, and
     * stays inside the viewport. (The backdrop's blur makes it the containing
     * block: it covers the viewport but scrolls, so add its scrollTop.)
     */
    function placeList() {
      var rect = reasonBtn.getBoundingClientRect();
      var below = window.innerHeight - rect.bottom - GAP;
      var above = rect.top - GAP;
      var up = below < list.scrollHeight && above > below;
      var maxHeight = Math.max(120, (up ? above : below) - 4);
      var height = Math.min(list.scrollHeight, maxHeight);
      list.style.left = rect.left + 'px';
      list.style.width = rect.width + 'px';
      list.style.top = (up ? rect.top - 4 - height : rect.bottom + 4) + backdrop.scrollTop + 'px';
      list.style.maxHeight = maxHeight + 'px';
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
      reasonValue.classList.remove('text-gray-400 dark:text-gray-500', 'text-red-300');
      reasonValue.classList.add('font-medium', 'text-gray-900 dark:text-white');
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
    // Scrolling the dialog or resizing would leave the fixed list behind: close it.
    backdrop.addEventListener('scroll', function (event) {
      if (event.target !== list && !list.classList.contains('hidden')) openList(false);
    }, true);
    window.addEventListener('resize', function onResize() {
      if (!backdrop.isConnected) window.removeEventListener('resize', onResize);
      else if (!list.classList.contains('hidden')) openList(false);
    });
    note.addEventListener('input', function () { if (submitted) validate(); });

    form.addEventListener('submit', function (event) {
      event.preventDefault();
      submitted = true;
      if (!validate()) {
        if (selected) M.revealField(note, noteError);
        else M.revealField(reasonBtn, reasonError);
        return;
      }
      if (window.SDOnboardingContext) {
        window.SDOnboardingContext.saveState({
          declined: { reason: selected, note: note.value.trim(), declinedAt: new Date().toISOString() }
        });
      }
      window.OBGo('declined.html');
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
