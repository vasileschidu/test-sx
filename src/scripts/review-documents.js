/**
 * review-documents.js
 * Step 3 "Review Documents" (Figma "3. Review Documents", node 19468:87528).
 *
 *   - Lists the attachments from src/data/sd-documents.json.
 *   - Clicking one opens the document viewer (shared OBModal shell) at that
 *     document: "n of N" step dots, Download, Previous, Next / Done.
 *     Next (or Done on the last one) marks the open document as reviewed.
 *   - Reviewed attachments show a green check instead of the chevron.
 *   - Next on the page continues only when every attachment is reviewed;
 *     otherwise the missing ones turn red and a red box lists them.
 * Reviewed documents reset each time the page loads.
 *
 * The viewer renders each attachment's real PDF (src/assets/onboarding/documents/)
 * with pdf.js, so it also works on phones, where browsers often can't show a
 * PDF inline. If pdf.js can't load, it falls back to the browser's own viewer.
 */
(function () {
  'use strict';

  var DATA_PATH = '../../data/sd-documents.json';
  var ASSETS = '../../assets/onboarding/';
  var NEXT_URL = 'paywall.html';
  var PDFJS = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/';
  var pdfjsPromise = null;

  /** Loads pdf.js once, on the first time a document is opened. */
  function loadPdfJs() {
    if (!pdfjsPromise) {
      pdfjsPromise = new Promise(function (resolve, reject) {
        var script = document.createElement('script');
        script.src = PDFJS + 'pdf.min.js';
        script.onload = function () {
          window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS + 'pdf.worker.min.js';
          resolve(window.pdfjsLib);
        };
        script.onerror = function () { pdfjsPromise = null; reject(new Error('pdf.js failed to load')); };
        document.head.appendChild(script);
      });
    }
    return pdfjsPromise;
  }

  /** Draws every page of the PDF as a white sheet, sized to the panel width. */
  function renderPdf(container, url) {
    return loadPdfJs()
      .then(function (pdfjs) { return pdfjs.getDocument(url).promise; })
      .then(function (pdf) {
        container.innerHTML = '';
        var width = container.clientWidth;
        var ratio = window.devicePixelRatio || 1;
        var chain = Promise.resolve();
        for (var n = 1; n <= pdf.numPages; n += 1) {
          chain = chain.then((function (pageNo) {
            return function () {
              return pdf.getPage(pageNo).then(function (page) {
                if (!container.isConnected) return;
                var base = page.getViewport({ scale: 1 });
                var viewport = page.getViewport({ scale: (width / base.width) * ratio });
                var canvas = document.createElement('canvas');
                canvas.width = viewport.width;
                canvas.height = viewport.height;
                canvas.style.width = '100%';
                canvas.setAttribute('aria-label', 'Page ' + pageNo + ' of ' + pdf.numPages);
                canvas.className = 'block rounded-sm bg-white shadow-sm ring-1 ring-black/5';
                container.appendChild(canvas);
                return page.render({ canvasContext: canvas.getContext('2d'), viewport: viewport }).promise;
              });
            };
          })(n));
        }
        return chain;
      })
      .catch(function (error) {
        console.error('[documents]', error);
        container.innerHTML = '<iframe src="' + url + '" title="Document" class="h-full min-h-[60vh] w-full rounded-sm bg-white"></iframe>';
      });
  }

  function validateData(data, requiredFields) {
    if (!data) return false;
    return requiredFields.every(function (field) { return data[field] != null; });
  }

  function getState() {
    return window.SDOnboardingContext ? window.SDOnboardingContext.getState() : {};
  }
  function saveState(patch) {
    if (window.SDOnboardingContext) window.SDOnboardingContext.saveState(patch);
  }

  function esc(value) {
    return window.OBModal ? window.OBModal.escapeHtml(value) : String(value);
  }

  /** Little document illustration from the design (30×42). */
  function thumbnail(index) {
    var line = index === 0 ? 'doc-thumb-line-1.svg' : 'doc-thumb-line-2.svg';
    var part = function (file, cls) {
      return '<span class="absolute block ' + cls + '"><img src="' + ASSETS + file + '" alt="" class="absolute inset-0 block size-full max-w-none"></span>';
    };
    return '<span aria-hidden="true" data-ob-skeleton class="relative block h-[42px] w-[30px] shrink-0 overflow-hidden rounded-[1.24px] border border-[#d1d5db] bg-white">' +
      part('doc-thumb-body.svg', 'inset-[5.68%_4.07%_22.92%_4.95%]') +
      part(line, 'top-[37.75px] left-[1.54px] h-[1.16px] w-[15.54px]') +
      part('doc-thumb-logo.svg', 'inset-[80.46%_77.72%_15.66%_4.94%]') +
      part('doc-thumb-socials.svg', 'inset-[81.3%_3.46%_16.49%_78.98%]') +
    '</span>';
  }

  function init(data) {
    var docs = data.documents;
    var listEl = document.querySelector('[data-docs-list]');
    var alertEl = document.querySelector('[data-docs-alert]');
    var missingEl = document.querySelector('[data-docs-missing]');
    var nextBtn = document.querySelector('[data-docs-next]');
    // Every visit starts fresh: nothing is marked reviewed until it's opened
    // and marked Done again on this page.
    var reviewed = [];
    saveState({ documents: { reviewed: [] } });
    var showErrors = false;

    // Header + client message
    document.querySelector('[data-docs-header]').textContent = data.headerText;
    if (data.message) {
      document.querySelector('[data-docs-message-title]').textContent = data.message.title;
      document.querySelector('[data-docs-message]').textContent = data.message.body;
    }
    var toggle = document.querySelector('[data-docs-message-toggle]');
    toggle.addEventListener('click', function () {
      var open = toggle.getAttribute('aria-expanded') !== 'true';
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      document.querySelector('[data-docs-message]').classList.toggle('hidden', !open);
      // Chevron points up while the message is open, down when collapsed.
      document.querySelector('[data-docs-message-chevron]').classList.toggle('rotate-180', open);
    });

    function isReviewed(doc) { return reviewed.indexOf(doc.id) !== -1; }

    function renderList() {
      listEl.innerHTML = docs.map(function (doc, i) {
        var done = isReviewed(doc);
        var invalid = showErrors && !done;
        return '<li>' +
          '<button type="button" data-doc-open="' + i + '" ' +
            'class="flex w-full cursor-pointer items-center gap-3 rounded-lg border bg-white p-4 text-left shadow-xs hover:bg-gray-50 ' +
            'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ' + (invalid ? 'border-[#ef4444]' : 'border-[#d1d5db]') + '">' +
            thumbnail(i) +
            '<span class="flex min-w-0 flex-1 flex-col items-start gap-0.5 pb-0.5">' +
              '<span data-ob-skeleton class="max-w-full truncate text-base leading-6 text-[#111827]">' + esc(doc.name) + '</span>' +
              '<span data-ob-skeleton class="flex items-center gap-2 text-xs leading-4 text-[#6b7280]">' + esc(doc.type) +
                '<img src="' + ASSETS + 'dot-gray.svg" alt="" width="2" height="2" class="size-0.5">' + esc(doc.size) + '</span>' +
            '</span>' +
            (done
              ? '<img src="' + ASSETS + 'icon-check-circle-green.svg" alt="Reviewed" width="20" height="20" class="size-5 shrink-0">'
              : '<img src="' + ASSETS + 'icon-chevron-right-mini.svg" alt="" width="20" height="20" class="size-5 shrink-0">') +
          '</button>' +
        '</li>';
      }).join('');

      var missing = docs.filter(function (d) { return !isReviewed(d); });
      missingEl.innerHTML = missing.map(function (d) { return '<li>• ' + esc(d.listName || d.name) + '</li>'; }).join('');
      var showAlert = showErrors && missing.length > 0;
      alertEl.classList.toggle('hidden', !showAlert);
      alertEl.classList.toggle('flex', showAlert);
    }

    function markReviewed(doc) {
      if (isReviewed(doc)) return;
      reviewed.push(doc.id);
      saveState({ documents: { reviewed: reviewed.slice() } });
      renderList();
    }

    // ---- Document viewer ---------------------------------------------------

    var SMALL_BTN = 'inline-flex cursor-pointer items-center justify-center gap-1 rounded-md px-2.5 py-1.5 text-sm leading-5 font-semibold shadow-xs focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600';

    function dots(index) {
      return docs.map(function (doc, i) {
        if (i === index) {
          return '<span class="relative block size-2.5 shrink-0"><img src="' + ASSETS + 'step-current.svg" alt="" class="absolute -inset-[40%] block size-[180%] max-w-none"></span>';
        }
        var file = isReviewed(doc) ? 'step-complete.svg' : 'step-incomplete.svg';
        return '<img src="' + ASSETS + file + '" alt="" width="10" height="10" class="block size-2.5 shrink-0">';
      }).join('');
    }

    function viewerMarkup(index) {
      var doc = docs[index];
      var last = index === docs.length - 1;
      return '' +
        '<div class="flex shrink-0 items-start gap-2 border-b border-[#e5e7eb] p-6">' +
          '<div class="flex min-w-0 flex-1 flex-col gap-4">' +
            '<div class="flex items-center gap-5">' +
              '<div class="flex items-center gap-2.5" aria-hidden="true">' + dots(index) + '</div>' +
              '<p class="text-sm leading-5 text-[#6b7280]">' + (index + 1) + ' of ' + docs.length + '</p>' +
            '</div>' +
            '<div class="flex flex-col gap-2.5">' +
              '<h2 id="doc-viewer-title" class="text-2xl leading-8 font-semibold text-[#1f2937]">' + esc(doc.name) + '</h2>' +
              '<p class="text-sm leading-5 text-[#6b7280]">' + esc(doc.description) + '</p>' +
            '</div>' +
          '</div>' +
          '<button type="button" data-ob-modal-close class="inline-flex cursor-pointer items-center justify-center rounded-md p-1.5 hover:bg-gray-100 focus-visible:outline-2 focus-visible:outline-blue-600">' +
            '<span class="sr-only">Close</span>' +
            '<img src="' + ASSETS + 'icon-x-mark-mini.svg" alt="" width="20" height="20" class="size-5">' +
          '</button>' +
        '</div>' +

        '<div class="flex min-h-0 flex-1 flex-col p-6">' +
          '<div tabindex="0" aria-label="' + esc(doc.name) + ' document" class="min-h-0 flex-1 overflow-y-auto rounded border border-[#e5e7eb] bg-[#f9fafb] p-4 focus-visible:outline-2 focus-visible:outline-blue-600">' +
            '<div data-doc-pages class="flex flex-col gap-4">' +
              '<p class="py-10 text-center text-sm leading-5 text-[#6b7280]">Loading document…</p>' +
            '</div>' +
          '</div>' +
        '</div>' +

        '<div class="flex shrink-0 items-center gap-2.5 border-t border-[#e5e7eb] px-6 py-5">' +
          '<div class="flex flex-1">' +
            '<a href="' + esc(doc.file) + '" download="' + esc(doc.name) + '.pdf" class="inline-flex cursor-pointer items-center justify-center gap-1 rounded-md px-2.5 py-1.5 text-sm leading-5 font-semibold text-[#374151] hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600">' +
              '<img src="' + ASSETS + 'icon-download.svg" alt="" width="18" height="18" class="size-[18px]">Download' +
            '</a>' +
          '</div>' +
          '<button type="button" data-doc-prev ' + (index === 0 ? 'disabled ' : '') +
            'class="' + SMALL_BTN + ' border border-[#d1d5db] bg-white text-[#374151] hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-white">Previous</button>' +
          '<button type="button" data-doc-next class="' + SMALL_BTN + ' bg-[#2563eb] text-white hover:bg-[#3b82f6]">' + (last ? 'Done' : 'Next') + '</button>' +
        '</div>';
    }

    function openViewer(index) {
      var backdrop = window.OBModal.open(viewerMarkup(index), 'doc-viewer-title', {
        bare: true,
        panelClass: 'relative flex h-[min(752px,calc(100dvh-2rem))] w-full max-w-[1048px] flex-col overflow-hidden rounded-lg bg-white shadow-lg ring-1 ring-black/5'
      });
      backdrop.querySelector('[data-doc-next]').addEventListener('click', function () {
        markReviewed(docs[index]);
        if (index < docs.length - 1) openViewer(index + 1);
        else window.OBModal.close();
      });
      renderPdf(backdrop.querySelector('[data-doc-pages]'), docs[index].file);
      var prev = backdrop.querySelector('[data-doc-prev]');
      prev.addEventListener('click', function () {
        if (index > 0) openViewer(index - 1);
      });
    }

    listEl.addEventListener('click', function (event) {
      var btn = event.target.closest('[data-doc-open]');
      if (btn) openViewer(Number(btn.getAttribute('data-doc-open')));
    });

    nextBtn.addEventListener('click', function () {
      if (docs.every(isReviewed)) {
        window.OBGo(NEXT_URL);
        return;
      }
      showErrors = true;
      renderList();
      alertEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    });

    renderList();
  }

  document.addEventListener('DOMContentLoaded', function () {
    // The attachments are built from data: the page skeleton waits for them.
    var ready = fetch(DATA_PATH, { cache: 'no-cache' })
      .then(function (res) { return res.json(); })
      .then(function (data) {
        if (!validateData(data, ['headerText', 'documents'])) throw new Error('sd-documents.json is missing fields');
        init(data);
      })
      .catch(function (error) {
        console.error('[documents]', error);
        var list = document.querySelector('[data-docs-list]');
        if (list) list.innerHTML = '<li class="text-sm text-[#6b7280]">Documents are unavailable right now. Please try again later.</li>';
      });
    if (window.OnboardingTransitions && window.OnboardingTransitions.waitFor) window.OnboardingTransitions.waitFor(ready);
  });
})();
