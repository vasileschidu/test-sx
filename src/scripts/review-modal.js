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

  function allTriggers() {
    return Array.prototype.filter.call(document.querySelectorAll(TRIGGER_SELECTOR), function (btn) {
      var row = btn.closest('li');
      return !(row && row.classList.contains('hidden'));
    });
  }

  function docName(trigger) {
    var row = trigger.closest('li');
    var nameEl = row && row.querySelector('.truncate');
    return (nameEl && nameEl.textContent.replace(/\s+/g, ' ').trim()) || 'Document';
  }

  function dot(active) {
    return '<span class="size-2.5 rounded-full bg-blue-600' +
      (active ? ' ring-4 ring-blue-600/20' : '') + '"></span>';
  }

  function render(dialog, trigger) {
    var triggers = allTriggers();
    var idx = Math.max(0, triggers.indexOf(trigger));
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
      for (var i = 0; i < total; i++) html += dot(i === idx);
      dots.innerHTML = html;
    }
    if (count) count.textContent = (idx + 1) + ' of ' + total;
    if (title) title.textContent = name.replace(/\.pdf$/i, '');
    if (heading) heading.textContent = name.replace(/\.pdf$/i, '');
    if (prev) prev.disabled = idx === 0;
    if (next) {
      next.classList.toggle('hidden', idx >= total - 1);
      next.disabled = idx >= total - 1;
    }
    dialog._reviewIdx = idx;
  }

  document.addEventListener('click', function (e) {
    var trigger = e.target.closest('.review-trigger, .gp-review-trigger, .gp-review-name-trigger');
    if (trigger) {
      var id = trigger.getAttribute('commandfor') || (trigger.closest('[commandfor]') || {}).id;
      var dialog = (id && document.getElementById(id)) || document.querySelector('dialog[data-review-modal]');
      if (dialog && dialog.hasAttribute('data-review-modal')) render(dialog, trigger);
      return;
    }

    var dl = e.target.closest('[data-review-download]');
    if (dl) {
      var src = dl.getAttribute('data-review-download-src');
      if (src) {
        var a = document.createElement('a');
        a.href = src;
        a.download = '';
        document.body.appendChild(a);
        a.click();
        a.remove();
      }
      return;
    }

    var nav = e.target.closest('[data-review-prev], [data-review-next]');
    if (!nav) return;
    var dlg = nav.closest('dialog[data-review-modal]');
    if (!dlg) return;
    var triggers = allTriggers();
    var target = triggers[(dlg._reviewIdx || 0) + (nav.hasAttribute('data-review-prev') ? -1 : 1)];
    if (target) target.click();
  });
})();
