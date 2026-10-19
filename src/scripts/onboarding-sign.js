/**
 * onboarding-sign.js
 * "Sign to authorize payment" dialog (Figma "Sign (* if required)", node
 * 19484:111910), shared by the payment-method summaries.
 *
 *   OBSign.open({ name, allowedPattern, allowedMessage, onSigned })
 *
 *   - Draw: sign on a pad with finger, stylus or mouse.
 *   - Type: "Your Full Name" (design-system field, with a clear button) shown
 *     as a handwritten signature in Meow Script — the page must load that font.
 *   - Submit checks the signature (red pad / field errors as designed), then
 *     shows "We're processing your request" and calls onSigned(signature).
 * Uses the shared dialog shell (OBModal) and field styles (OBField).
 */
window.OBSign = (function () {
  'use strict';

  var ASSETS = '../../assets/onboarding/';
  var PROCESSING_MS = 1800;

  var TAB = 'cursor-pointer rounded-md px-3 py-2 text-sm leading-5 font-medium text-[#111827] hover:bg-[#f3f4f6] aria-selected:bg-[#f3f4f6] focus-visible:outline-2 focus-visible:outline-blue-600';
  var PAD = 'relative flex h-[296px] w-full items-center justify-center overflow-hidden rounded-2xl border bg-[#f9fafb]';

  function markup(name) {
    var F = window.OBField;
    var esc = window.OBModal.escapeHtml;
    return '' +
      '<div class="flex shrink-0 items-center gap-2 border-b border-[#e5e7eb] py-2 pr-3 pl-6">' +
        '<h2 id="ob-sign-title" class="flex-1 text-base leading-6 font-medium text-[#111827]">Sign to authorize payment</h2>' +
        '<button type="button" data-ob-modal-close class="flex size-10 cursor-pointer items-center justify-center rounded-full hover:bg-gray-100 focus-visible:outline-2 focus-visible:outline-blue-600">' +
          '<span class="sr-only">Close</span><img src="' + ASSETS + 'icon-x-lined-gray.svg" alt="" width="24" height="24" class="size-6"></button>' +
      '</div>' +
      '<div class="flex min-h-0 flex-col gap-6 overflow-y-auto p-6">' +
        '<div role="tablist" aria-label="How to sign" class="flex gap-4">' +
          '<button type="button" role="tab" id="ob-sign-tab-draw" aria-controls="ob-sign-draw" aria-selected="true" data-sign-tab="draw" class="' + TAB + '">Draw</button>' +
          '<button type="button" role="tab" id="ob-sign-tab-type" aria-controls="ob-sign-type" aria-selected="false" data-sign-tab="type" class="' + TAB + '">Type</button>' +
        '</div>' +

        // Draw
        '<div id="ob-sign-draw" role="tabpanel" aria-labelledby="ob-sign-tab-draw" data-sign-panel="draw" class="flex w-full flex-col gap-4">' +
          '<div data-sign-pad class="' + PAD + ' border-[#e5e7eb] touch-none">' +
            '<canvas data-sign-canvas aria-label="Signature pad" class="absolute inset-0 size-full cursor-crosshair"></canvas>' +
            '<p data-sign-hint class="pointer-events-none w-[200px] text-center text-base leading-6 text-[#6b7280]">Sign with your finger, stylus, or mouse.</p>' +
            '<button type="button" data-sign-clear class="absolute top-3 right-3 hidden cursor-pointer rounded-md px-2 py-1 text-xs leading-4 font-semibold text-[#6b7280] hover:bg-gray-100 hover:text-[#374151] focus-visible:outline-2 focus-visible:outline-blue-600">Clear</button>' +
          '</div>' +
        '</div>' +

        // Type
        '<div id="ob-sign-type" role="tabpanel" aria-labelledby="ob-sign-tab-type" data-sign-panel="type" hidden class="flex w-full flex-col gap-6">' +
          '<div class="flex w-full flex-col gap-1">' +
            '<label for="ob-sign-name" class="' + F.LABEL + '">Your Full Name</label>' +
            '<div class="relative">' +
              '<input id="ob-sign-name" data-sign-name type="text" autocomplete="name" placeholder="Type here" value="' + esc(name || '') + '" aria-invalid="false" aria-describedby="ob-sign-name-error" class="' + F.INPUT + ' pr-10 text-ellipsis">' +
              '<button type="button" data-sign-name-clear class="absolute top-1/2 right-3 flex size-5 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full focus-visible:outline-2 focus-visible:outline-blue-600">' +
                '<span class="sr-only">Clear name</span><img src="' + ASSETS + 'icon-x-circle-clear.svg" alt="" width="20" height="20" class="size-5"></button>' +
              F.errorIcon() +
            '</div>' +
            '<p id="ob-sign-name-error" data-sign-name-error class="hidden ' + F.ERROR_TEXT + '"></p>' +
          '</div>' +
          '<div class="' + PAD + ' border-[#e5e7eb] px-6">' +
            '<p data-sign-preview aria-hidden="true" class="line-clamp-3 w-full text-center font-[\'Meow_Script\',cursive] text-[56px] leading-[64px] wrap-anywhere text-black"></p>' +
          '</div>' +
        '</div>' +
      '</div>' +
      '<div class="flex shrink-0 border-t border-[#e5e7eb] px-6 py-5">' +
        '<button type="button" data-sign-submit class="flex flex-1 cursor-pointer items-center justify-center rounded-md bg-[#2563eb] px-3.5 py-2.5 text-base leading-6 font-semibold text-white shadow-xs hover:bg-[#3b82f6] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2563eb]">Submit</button>' +
      '</div>';
  }

  function processingMarkup() {
    return '<div role="status" class="flex flex-col items-center gap-6 px-6 py-12">' +
      '<img src="' + ASSETS + 'loader.svg" alt="" width="44" height="44" class="size-11 animate-spin motion-reduce:animate-none">' +
      '<div class="flex flex-col items-center gap-2 text-center">' +
        '<p id="ob-sign-processing" class="text-lg leading-6 font-semibold text-[#111827]">We’re processing your request</p>' +
        '<p class="text-sm leading-5 text-[#6b7280]">Please wait</p>' +
      '</div>' +
    '</div>';
  }

  function open(opts) {
    opts = opts || {};
    var F = window.OBField;
    var M = window.OBModal;
    var backdrop = M.open(markup(opts.name), 'ob-sign-title', {
      bare: true,
      panelClass: 'relative flex max-h-[calc(100dvh-2rem)] w-full max-w-[512px] flex-col overflow-hidden rounded-lg bg-white shadow-xl'
    });
    var $ = function (sel) { return backdrop.querySelector(sel); };
    var mode = 'draw';

    // ---- Tabs
    var tabs = backdrop.querySelectorAll('[data-sign-tab]');
    function setMode(next) {
      mode = next;
      tabs.forEach(function (t) { t.setAttribute('aria-selected', t.getAttribute('data-sign-tab') === next ? 'true' : 'false'); });
      backdrop.querySelectorAll('[data-sign-panel]').forEach(function (p) { p.hidden = p.getAttribute('data-sign-panel') !== next; });
      if (next === 'draw') sizeCanvas();
    }
    tabs.forEach(function (t) { t.addEventListener('click', function () { setMode(t.getAttribute('data-sign-tab')); }); });

    // ---- Draw pad
    var pad = $('[data-sign-pad]');
    var canvas = $('[data-sign-canvas]');
    var hint = $('[data-sign-hint]');
    var clearBtn = $('[data-sign-clear]');
    var ctx = canvas.getContext('2d');
    var drawing = false;
    var hasInk = false;
    var last = null;

    function sizeCanvas() {
      var ratio = window.devicePixelRatio || 1;
      var rect = canvas.getBoundingClientRect();
      if (!rect.width) return;
      canvas.width = rect.width * ratio;
      canvas.height = rect.height * ratio;
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      ctx.lineWidth = 2.2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = '#111827';
      hasInk = false;
      hint.classList.remove('hidden');
      clearBtn.classList.add('hidden');
    }
    function setPadError(on) {
      pad.classList.toggle('border-[#fca5a5]', on);
      pad.classList.toggle('border-[#e5e7eb]', !on);
      hint.classList.toggle('text-[#b91c1c]', on);
      hint.classList.toggle('text-[#6b7280]', !on);
    }
    function point(e) {
      var r = canvas.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    }
    canvas.addEventListener('pointerdown', function (e) {
      drawing = true;
      last = point(e);
      canvas.setPointerCapture(e.pointerId);
      ctx.beginPath();
      ctx.arc(last.x, last.y, 1.1, 0, Math.PI * 2);
      ctx.fillStyle = '#111827';
      ctx.fill();
      if (!hasInk) {
        hasInk = true;
        hint.classList.add('hidden');
        clearBtn.classList.remove('hidden');
        setPadError(false);
      }
    });
    canvas.addEventListener('pointermove', function (e) {
      if (!drawing) return;
      var p = point(e);
      ctx.beginPath();
      ctx.moveTo(last.x, last.y);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
      last = p;
    });
    ['pointerup', 'pointercancel', 'pointerleave'].forEach(function (evt) {
      canvas.addEventListener(evt, function () { drawing = false; });
    });
    clearBtn.addEventListener('click', function () {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      sizeCanvas();
    });
    requestAnimationFrame(sizeCanvas);

    // ---- Type
    var nameInput = $('[data-sign-name]');
    var nameError = $('[data-sign-name-error]');
    var preview = $('[data-sign-preview]');
    var nameClear = $('[data-sign-name-clear]');
    var typedChecked = false;

    function nameMessage() {
      var v = nameInput.value.trim();
      if (!v) return 'Your Full Name is required';
      if (opts.allowedPattern && !new RegExp(opts.allowedPattern).test(v)) return opts.allowedMessage;
      return '';
    }
    function syncName() {
      preview.textContent = nameInput.value.trim();
      // The clear button gives way to the error icon while the field is invalid.
      nameClear.classList.toggle('hidden', !nameInput.value || nameInput.getAttribute('aria-invalid') === 'true');
      if (typedChecked) {
        var msg = nameMessage();
        F.setError(nameInput, !!msg, nameError, msg);
        nameClear.classList.toggle('hidden', !!msg || !nameInput.value);
      }
    }
    nameInput.addEventListener('input', syncName);
    nameClear.addEventListener('click', function () {
      nameInput.value = '';
      syncName();
      nameInput.focus();
    });
    syncName();

    // ---- Submit
    $('[data-sign-submit]').addEventListener('click', function () {
      var signature;
      if (mode === 'draw') {
        if (!hasInk) { setPadError(true); return; }
        signature = { method: 'draw', image: canvas.toDataURL('image/png') };
      } else {
        typedChecked = true;
        syncName();
        if (nameMessage()) { nameInput.focus(); return; }
        signature = { method: 'type', name: nameInput.value.trim() };
      }
      // Swap the dialog for the processing state.
      var dialog = backdrop.querySelector('[data-ob-modal-dialog]');
      dialog.className = 'relative flex w-full max-w-[512px] flex-col overflow-hidden rounded-lg bg-white shadow-lg ring-1 ring-black/5 focus:outline-none';
      dialog.setAttribute('aria-labelledby', 'ob-sign-processing');
      dialog.innerHTML = processingMarkup();
      backdrop.setAttribute('data-busy', 'true');
      setTimeout(function () {
        if (typeof opts.onSigned === 'function') opts.onSigned(signature);
      }, PROCESSING_MS);
    });
  }

  return { open: open };
})();
