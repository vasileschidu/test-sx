/**
 * review-documents.js
 * Step 3 "Review Documents" (Figma "3. Review Documents", node 19468:87528).
 *
 *   - Lists the attachments from src/data/sd-documents.json (Multi-Party:
 *     src/data/sd-documents-mp.json).
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

  // Multi-Party has its own documents (the claim is shared between co-payees).
  var DATA_PATH = window.OBFlow && window.OBFlow.isMultiParty()
    ? '../../data/sd-documents-mp.json'
    : '../../data/sd-documents.json';
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
                canvas.className = 'block rounded-sm bg-white shadow-sm ring-1 ring-black/5 dark:ring-white/10';
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

  /**
   * Little document illustration from the design (30×42). The design's sender
   * footer (logo, social icons, contact line) is left out.
   */
  function thumbnail() {
    var part = function (file, cls) {
      return '<span class="absolute block ' + cls + '"><img src="' + ASSETS + file + '" alt="" class="absolute inset-0 block size-full max-w-none"></span>';
    };
    return '<span aria-hidden="true" data-ob-skeleton class="relative block h-[42px] w-[30px] shrink-0 overflow-hidden rounded-[1.24px] border border-gray-300 dark:border-white/10 bg-white dark:bg-gray-900">' +
      part('doc-thumb-body.svg', 'inset-[5.68%_4.07%_22.92%_4.95%]') +
    '</span>';
  }

  /**
   * The message names the amount and sender as {amount} / {sender}: they come
   * from the payment context, so Multi-Party shows the user's own share.
   * {total} is the whole Multi-Party claim payment.
   */
  function fillMessage(template) {
    var el = document.querySelector('[data-docs-message]');
    var ctx = window.SDOnboardingContext;
    function render(state) {
      var payable = (state && state.payableContext) || {};
      el.textContent = template
        .replace('{amount}', payable.amountFormatted || '')
        .replace('{total}', window.OBFlow ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(window.OBFlow.TOTAL) : '')
        .replace('{sender}', payable.senderName || window.OBModal.clientName());
    }
    render(ctx ? ctx.getState() : null);
    if (ctx && ctx.bootstrap) ctx.bootstrap().then(render);
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
      fillMessage(data.message.body);
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
            'class="group flex w-full cursor-pointer items-center gap-3 rounded-lg border bg-white dark:bg-gray-900 p-4 text-left shadow-xs hover:bg-gray-50 dark:hover:bg-white/5 ' +
            'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:focus-visible:outline-blue-400 ' + (invalid ? 'border-red-500' : 'border-gray-300 dark:border-white/10') + '">' +
            thumbnail() +
            '<span class="flex min-w-0 flex-1 flex-col items-start gap-0.5 pb-0.5">' +
              '<span data-ob-skeleton class="max-w-full truncate text-base leading-6 text-gray-900 dark:text-white">' + esc(doc.name) + '</span>' +
              '<span data-ob-skeleton class="flex items-center gap-2 text-xs leading-4 text-gray-500 dark:text-gray-400">' + esc(doc.type) +
                '<img src="' + ASSETS + 'dot-gray.svg" alt="" width="2" height="2" class="size-0.5">' + esc(doc.size) + '</span>' +
            '</span>' +
            (done
              ? '<img src="' + ASSETS + 'icon-check-circle-green.svg" alt="Reviewed" width="20" height="20" class="size-5 shrink-0">'
              : '<img src="' + ASSETS + 'icon-chevron-right-mini.svg" alt="" width="20" height="20" ' +
                'class="size-5 shrink-0 transition duration-200 ease-out group-hover:translate-x-1 group-hover:brightness-[0.8] ' +
                'group-focus-visible:translate-x-1 group-focus-visible:brightness-[0.8] motion-reduce:transition-none">') +
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

    var SMALL_BTN = 'inline-flex cursor-pointer items-center justify-center gap-1 rounded-md px-2.5 py-1.5 text-base leading-5 font-semibold lg:text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:focus-visible:outline-blue-400';

    function dots(index) {
      return docs.map(function (doc, i) {
        if (i === index) {
          return '<span class="relative block size-2.5 shrink-0"><img src="' + ASSETS + 'step-current.svg" alt="" class="absolute -inset-[40%] block size-[180%] max-w-none"></span>';
        }
        var file = isReviewed(doc) ? 'step-complete.svg' : 'step-incomplete.svg';
        return '<img src="' + ASSETS + file + '" alt="" width="10" height="10" class="block size-2.5 shrink-0">';
      }).join('');
    }

    // The viewer's three parts for the dialog shell: header and footer stay put,
    // the preview box between them scrolls the document.
    function viewerHeader(index) {
      var doc = docs[index];
      return '' +
        // Figma Header: Steps row (dots, "n of N", X) then the full-width title and description.
        '<div class="flex shrink-0 flex-col gap-3 border-b border-gray-200 dark:border-white/10 p-6 lg:gap-2.5">' +
          '<div class="flex items-center gap-2.5">' +
            '<div class="flex items-center gap-2.5" aria-hidden="true">' + dots(index) + '</div>' +
            '<p class="flex-1 text-sm leading-5 text-gray-500 dark:text-gray-400">' + (index + 1) + ' of ' + docs.length + '</p>' +
            // -m-1.5 keeps the 32px hit area while the row stays 20 tall, as in Figma.
            '<button type="button" data-ob-modal-close class="-m-1.5 inline-flex cursor-pointer items-center justify-center rounded-md p-1.5 hover:bg-gray-100 dark:hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-blue-600 dark:focus-visible:outline-blue-400">' +
              '<span class="sr-only">Close</span>' +
              '<img src="' + ASSETS + 'icon-x-mark-mini.svg" alt="" width="20" height="20" class="size-5">' +
            '</button>' +
          '</div>' +
          '<h2 id="doc-viewer-title" class="text-2xl leading-8 font-semibold text-gray-800 dark:text-gray-100">' + esc(doc.name) + '</h2>' +
          // On mobile a long description is cut to two lines ending "… Show more".
          '<p id="doc-viewer-desc" data-doc-desc class="text-sm leading-5 text-gray-500 dark:text-gray-400">' +
            '<span data-doc-desc-text>' + esc(doc.description) + '</span>' +
            '<button type="button" data-doc-more hidden aria-expanded="false" aria-controls="doc-viewer-desc" class="ml-0.5 cursor-pointer rounded px-1.5 font-semibold whitespace-nowrap text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:focus-visible:outline-blue-400">Show more</button>' +
          '</p>' +
        '</div>';
    }

    function viewerMarkup(index) {
      var doc = docs[index];
      return '' +
        '<div class="relative flex min-h-0 flex-1 flex-col p-6">' +
          '<div data-doc-preview tabindex="0" aria-label="' + esc(doc.name) + ' document" class="min-h-0 flex-1 overflow-y-auto rounded border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 p-4 [scrollbar-color:rgba(17,24,39,0.5)_#f3f4f6] [scrollbar-width:thin] focus-visible:outline-2 focus-visible:outline-blue-600 dark:focus-visible:outline-blue-400 max-md:cursor-pointer">' +
            '<div data-doc-pages class="flex flex-col gap-4">' +
              '<p class="py-10 text-center text-sm leading-5 text-gray-500 dark:text-gray-400">Loading document…</p>' +
            '</div>' +
          '</div>' +
          // Phones: the preview is small, so a tap opens the PDF full screen.
          '<span aria-hidden="true" class="pointer-events-none absolute bottom-9 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-gray-900/80 px-3 py-1.5 text-xs leading-4 font-medium whitespace-nowrap text-white shadow-lg md:hidden">' +
            '<img src="' + ASSETS + 'icon-expand.svg" alt="" width="16" height="16" class="size-4">Tap to open full screen</span>' +
        '</div>';
    }

    function viewerFooter(index) {
      var doc = docs[index];
      var last = index === docs.length - 1;
      return '' +
        '<div class="flex items-center gap-2.5 border-t border-gray-200 dark:border-white/10 px-6 py-5">' +
          '<div class="flex flex-1">' +
            '<a href="' + esc(doc.file) + '" download="' + esc(doc.name) + '.pdf" class="inline-flex cursor-pointer items-center justify-center gap-1 rounded-md px-2.5 py-1.5 text-base leading-5 font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 lg:text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:focus-visible:outline-blue-400">' +
              '<img src="' + ASSETS + 'icon-download.svg" alt="" width="18" height="18" class="size-[18px]">Download' +
            '</a>' +
          '</div>' +
          '<button type="button" data-doc-prev ' + (index === 0 ? 'disabled ' : '') +
            'class="' + SMALL_BTN + ' border border-gray-300 dark:border-white/10 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 shadow-xs disabled:shadow-none hover:bg-gray-50 dark:hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-white dark:disabled:hover:bg-gray-900">Previous</button>' +
          '<button type="button" data-doc-next class="' + SMALL_BTN + ' bg-blue-600 text-white hover:bg-blue-500">' + (last ? 'Done' : 'Next') + '</button>' +
        '</div>';
    }

    /**
     * Mobile: a description longer than two lines is cut to fit them, ending
     * with "… Show more" on the second line; "Show less" restores the cut.
     * The link is the design system's Button/Link Secondary (gray-700, semibold).
     */
    function bindMore(backdrop, full) {
      var desc = backdrop.querySelector('[data-doc-desc]');
      var text = backdrop.querySelector('[data-doc-desc-text]');
      var more = backdrop.querySelector('[data-doc-more]');
      var mobile = window.matchMedia('(max-width: 1023px)');
      var open = false;
      var LINE = 20;  // leading-5

      function fits() { return desc.offsetHeight <= LINE * 2 + 1; }

      function sync() {
        text.textContent = full;
        more.hidden = true;
        // Desktop, or short enough for two lines: the whole text, no link.
        if (!mobile.matches || fits()) return;
        more.hidden = false;
        if (open) return;  // expanded: full text + "Show less"
        // Longest cut (at a word break) that keeps "… Show more" on two lines.
        var words = full.split(' ');
        var lo = 1, hi = words.length - 1, best = 1;
        while (lo <= hi) {
          var mid = (lo + hi) >> 1;
          text.textContent = words.slice(0, mid).join(' ').replace(/[\s,.;:]+$/, '') + '…';
          if (fits()) { best = mid; lo = mid + 1; } else hi = mid - 1;
        }
        text.textContent = words.slice(0, best).join(' ').replace(/[\s,.;:]+$/, '') + '…';
      }

      more.addEventListener('click', function () {
        open = !open;
        more.textContent = open ? 'Show less' : 'Show more';
        more.setAttribute('aria-expanded', open ? 'true' : 'false');
        sync();
      });
      requestAnimationFrame(sync);
      syncMore = sync;
    }
    var syncMore = null;
    window.addEventListener('resize', function () { if (syncMore) syncMore(); });

    /** Mobile only (≤ 767px): tapping the preview opens the PDF in the phone's own viewer (zoom, scroll). */
    function bindFullScreen(backdrop, doc) {
      var preview = backdrop.querySelector('[data-doc-preview]');
      var mobile = window.matchMedia('(max-width: 767px)');
      function open() { window.open(doc.file, '_blank', 'noopener'); }
      preview.addEventListener('click', function () { if (mobile.matches) open(); });
      preview.addEventListener('keydown', function (event) {
        if (mobile.matches && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); open(); }
      });
    }

    function openViewer(index) {
      // Full height with a 16px gap on every side (same as the SX viewer and the terms dialogs).
      var backdrop = window.OBModal.open(viewerMarkup(index), 'doc-viewer-title', {
        bare: true,
        header: viewerHeader(index),
        footer: viewerFooter(index),
        panelClass: 'relative flex h-[calc(100dvh-2rem)] w-full max-w-[1048px] flex-col overflow-hidden rounded-lg bg-white dark:bg-gray-900 shadow-lg ring-1 ring-black/5 dark:ring-white/10'
      });
      var frame = backdrop.querySelector('[data-ob-modal-frame]');
      frame.classList.remove('px-4', 'py-6');
      frame.classList.add('p-4');
      backdrop.querySelector('[data-doc-next]').addEventListener('click', function () {
        markReviewed(docs[index]);
        if (index < docs.length - 1) openViewer(index + 1);
        else window.OBModal.close();
      });
      renderPdf(backdrop.querySelector('[data-doc-pages]'), docs[index].file);
      bindMore(backdrop, docs[index].description);
      bindFullScreen(backdrop, docs[index]);
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
        if (list) list.innerHTML = '<li class="text-sm text-gray-500 dark:text-gray-400">Documents are unavailable right now. Please try again later.</li>';
      });
    if (window.OnboardingTransitions && window.OnboardingTransitions.waitFor) window.OnboardingTransitions.waitFor(ready);
  });
})();
