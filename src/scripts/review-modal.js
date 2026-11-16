/**
 * Shared behaviour for the Review Document modal (Figma: Consumer Portal / Modal 43194:19807).
 *
 * Any dialog with `data-review-modal` is populated when a review trigger
 * (`.review-trigger`, `.gp-review-trigger`, `.gp-review-name-trigger`) is clicked:
 * step dots + "N of M", document title and Previous / Next navigation.
 * Previous / Next re-click the neighbouring trigger so page-specific handlers
 * (which track the active document) stay in sync.
 */
(function () {
  var TRIGGER_SELECTOR = '.review-trigger, #gp-attachments .gp-review-trigger';

  // Attachment pills (+N menu) are `[data-review-item]` inside a `[data-review-group]`:
  // one trigger per `data-review-index`, in index order (the pill and its menu twin
  // share an index).
  function groupTriggers(trigger) {
    var group = trigger.closest('[data-review-group]');
    if (!group) return [trigger];
    var seen = {};
    return Array.prototype.filter
      .call(group.querySelectorAll('[data-review-item]'), function (el) {
        var k = el.getAttribute('data-review-index');
        if (seen[k]) return false;
        seen[k] = true;
        return true;
      })
      .sort(function (a, b) {
        return +a.getAttribute('data-review-index') - +b.getAttribute('data-review-index');
      });
  }

  function allTriggers(trigger) {
    if (trigger && trigger.hasAttribute('data-review-item')) return groupTriggers(trigger);
    return Array.prototype.filter.call(document.querySelectorAll(TRIGGER_SELECTOR), function (btn) {
      var row = btn.closest('li');
      return !(row && row.classList.contains('hidden'));
    });
  }

  function docName(trigger) {
    if (trigger.hasAttribute('data-review-name')) return trigger.getAttribute('data-review-name');
    var row = trigger.closest('li');
    var nameEl = row && row.querySelector('.truncate');
    return (nameEl && nameEl.textContent.replace(/\s+/g, ' ').trim()) || 'Document';
  }

  // Tailwind "bullets" steps: before = blue, current = blue with a halo, after = gray.
  function dot(i, idx) {
    if (i === idx) {
      return '<span aria-current="step" class="relative flex size-2.5 items-center justify-center">' +
        '<span class="absolute size-5 rounded-full bg-blue-200 dark:bg-blue-500/25"></span>' +
        '<span class="relative size-2.5 rounded-full bg-blue-600 dark:bg-blue-500"></span></span>';
    }
    return '<span class="size-2.5 rounded-full ' +
      (i < idx ? 'bg-blue-600 dark:bg-blue-500' : 'bg-gray-200 dark:bg-white/15') + '"></span>';
  }


  var PDFJS = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/';
  var pdfjsReady = null;
  function loadPdfJs() {
    if (!pdfjsReady) {
      pdfjsReady = new Promise(function (resolve, reject) {
        if (window.pdfjsLib) return resolve(window.pdfjsLib);
        var sc = document.createElement('script');
        sc.src = PDFJS + 'pdf.min.js';
        sc.onload = function () {
          window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS + 'pdf.worker.min.js';
          resolve(window.pdfjsLib);
        };
        sc.onerror = function () {
          pdfjsReady = null;
          reject(new Error('pdf.js'));
        };
        document.head.appendChild(sc);
      });
    }
    return pdfjsReady;
  }

  // Draws every page as a white sheet fitted to the box width (HiDPI-sharp).
  function renderPdf(box, src) {
    if (box._pdfSrc === src && box.childElementCount) return;
    box._pdfSrc = src;
    var token = (box._pdfToken = (box._pdfToken || 0) + 1);
    box.scrollTop = 0;
    box.innerHTML = '<div class="w-full max-w-2xl animate-pulse rounded-sm bg-white shadow-sm ring-1 ring-black/5 dark:bg-white/10" style="aspect-ratio: 8.5 / 11"></div>';
    loadPdfJs()
      .then(function (lib) {
        return lib.getDocument(src).promise;
      })
      .then(function (doc) {
        if (token !== box._pdfToken) return;
        // Wait a frame: the dialog may still be opening (no width yet).
        return new Promise(function (r) { requestAnimationFrame(function () { requestAnimationFrame(r); }); }).then(function () {
          if (token !== box._pdfToken) return;
          var width = Math.min(box.clientWidth - 32, 672);
          var frag = document.createDocumentFragment();
          var jobs = [];
          for (var n = 1; n <= doc.numPages; n++) {
            jobs.push(doc.getPage(n).then(function (page) {
              var base = page.getViewport({ scale: 1 });
              var scale = width / base.width;
              var dpr = window.devicePixelRatio || 1;
              var vp = page.getViewport({ scale: scale * dpr });
              var canvas = document.createElement('canvas');
              canvas.width = Math.floor(vp.width);
              canvas.height = Math.floor(vp.height);
              canvas.style.width = Math.floor(base.width * scale) + 'px';
              canvas.className = 'block h-auto max-w-full shrink-0 rounded-sm bg-white shadow-sm ring-1 ring-black/5';
              return page.render({ canvasContext: canvas.getContext('2d'), viewport: vp }).promise.then(function () {
                return canvas;
              });
            }));
          }
          return Promise.all(jobs).then(function (canvases) {
            if (token !== box._pdfToken) return;
            canvases.forEach(function (c) { frag.appendChild(c); });
            box.innerHTML = '';
            box.appendChild(frag);
          });
        });
      })
      .catch(function () {
        if (token !== box._pdfToken) return;
        box._pdfSrc = '';
        box.innerHTML = '<p class="m-auto text-sm text-gray-500 dark:text-gray-400">Preview unavailable. Use Download to open the file.</p>';
      });
  }

  function render(dialog, trigger) {
    var triggers = allTriggers(trigger);
    var idx = trigger.hasAttribute('data-review-item')
      ? Math.max(0, triggers.findIndex(function (t) {
          return t.getAttribute('data-review-index') === trigger.getAttribute('data-review-index');
        }))
      : Math.max(0, triggers.indexOf(trigger));
    var total = Math.max(1, triggers.length);
    var name = docName(trigger);

    var dots = dialog.querySelector('[data-review-dots]');
    var count = dialog.querySelector('[data-review-count]');
    var title = dialog.querySelector('[data-review-title]');
    var heading = dialog.querySelector('[data-review-heading]');
    var prev = dialog.querySelector('[data-review-prev]');
    var next = dialog.querySelector('[data-review-next]');
    var stepper = dialog.querySelector('[data-review-steps]');

    if (stepper) stepper.classList.toggle('hidden', total < 2);
    if (dots) {
      var html = '';
      for (var i = 0; i < total; i++) html += dot(i, idx);
      dots.innerHTML = html;
    }
    if (count) count.textContent = (idx + 1) + ' of ' + total;
    if (title) title.textContent = name.replace(/\.pdf$/i, '');
    if (heading) heading.textContent = name.replace(/\.pdf$/i, '');
    var subtitle = dialog.querySelector('[data-review-subtitle]');
    if (subtitle && trigger.hasAttribute('data-review-meta')) {
      subtitle.textContent = trigger.getAttribute('data-review-meta');
    }
    if (prev) prev.disabled = idx === 0;
    if (next) {
      next.classList.toggle('hidden', idx >= total - 1);
      next.disabled = idx >= total - 1;
    }
    // Dialogs with a [data-review-pdf] box show the PDF itself, drawn with pdf.js
    // (white pages on the panel background, no browser viewer chrome): the trigger's
    // data-review-src, else the Download file (the prototype has one sample PDF).
    var pdf = dialog.querySelector('[data-review-pdf]');
    if (pdf) {
      var dlBtn = dialog.querySelector('[data-review-download]');
      var src = trigger.getAttribute('data-review-src') ||
        (dlBtn && dlBtn.getAttribute('data-review-download-src')) || '';
      if (src) renderPdf(pdf, src);
    }
    dialog._reviewIdx = idx;
    dialog._reviewTriggers = triggers;
    dialog._reviewName = name;
    dialog._reviewSrc = trigger.getAttribute('data-review-src') || '';
  }

  document.addEventListener('click', function (e) {
    var trigger = e.target.closest('.review-trigger, .gp-review-trigger, .gp-review-name-trigger, [data-review-item]');
    if (trigger) {
      var id = trigger.getAttribute('commandfor') || (trigger.closest('[commandfor]') || {}).id;
      var dialog = (id && document.getElementById(id)) || document.querySelector('dialog[data-review-modal]');
      if (dialog && dialog.hasAttribute('data-review-modal')) render(dialog, trigger);
      return;
    }

    var dl = e.target.closest('[data-review-download]');
    if (dl) {
      var openDlg = dl.closest('dialog[data-review-modal]');
      var src = (openDlg && openDlg._reviewSrc) || dl.getAttribute('data-review-download-src');
      if (src) {
        var a = document.createElement('a');
        // Save under the open document's name (the prototype serves one sample PDF).
        var dlg = dl.closest('dialog[data-review-modal]');
        var name = (dlg && dlg._reviewName) || '';
        if (name && !/\.pdf$/i.test(name)) name += '.pdf';
        a.href = src;
        a.download = name;
        document.body.appendChild(a);
        a.click();
        a.remove();
        if (name && typeof window.showGlobalTopToast === 'function') {
          window.showGlobalTopToast('Downloaded ' + name + '.');
        }
      }
      return;
    }

    var nav = e.target.closest('[data-review-prev], [data-review-next]');
    if (!nav) return;
    var dlg = nav.closest('dialog[data-review-modal]');
    if (!dlg) return;
    var triggers = dlg._reviewTriggers || allTriggers();
    var target = triggers[(dlg._reviewIdx || 0) + (nav.hasAttribute('data-review-prev') ? -1 : 1)];
    if (target) target.click();
  });
})();
