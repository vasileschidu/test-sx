/**
 * consumer-my-profile.js
 * Consumer Portal — My Profile.
 *
 * Details are edited in place, one row at a time: the value becomes a field
 * with Cancel / Save Changes beside it (Enter saves, Esc cancels). Alerts are
 * per channel; a text-message channel can't be switched on until there's a
 * mobile number, and adding one from an alert card opens the Phone row.
 * Saved in localStorage over the seed in src/data/consumer-profile.json.
 */
(function () {
  'use strict';

  var STORAGE_KEY = 'cp_profile_v1';
  var LOAD_MIN_MS = 1000;
  var LOAD_MAX_MS = 1500;

  var profile = null;
  var editing = null;        // field key being edited
  var error = '';
  var toastTimer = null;

  var FIELDS = [
    { key: 'fullName', label: 'Full name', type: 'text', autocomplete: 'name', placeholder: 'Your full name' },
    { key: 'username', label: 'Username', type: 'text', autocomplete: 'username', placeholder: 'Username' },
    { key: 'email', label: 'Email', type: 'email', autocomplete: 'email', placeholder: 'you@example.com' },
    { key: 'phone', label: 'Phone', type: 'tel', autocomplete: 'tel', placeholder: '(555) 123-4567', emptyAction: 'Add number' },
    { key: 'password', label: 'Password', readonly: true, action: 'Reset password' }
  ];

  var ALERT_GROUPS = [
    { key: 'critical', title: 'Critical alerts', text: 'Require action — receipt approval, digital signature, or a possible security issue.' },
    { key: 'account', title: 'Account alerts', text: 'Activity on your account — deposits and transactions.' }
  ];

  function $(id) { return document.getElementById(id); }

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function save() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(profile)); } catch (e) {}
  }

  function showToast(message) {
    var toast = $('mp-toast');
    $('mp-toast-text').textContent = message;
    toast.classList.remove('opacity-0', 'translate-y-2');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toast.classList.add('opacity-0', 'translate-y-2'); }, 3500);
  }

  function formatPhone(digits) {
    var d = String(digits || '').replace(/\D/g, '');
    if (d.length === 11 && d.charAt(0) === '1') d = d.slice(1);
    if (d.length !== 10) return digits;
    return '(' + d.slice(0, 3) + ') ' + d.slice(3, 6) + '-' + d.slice(6);
  }

  function validate(key, value) {
    var v = String(value || '').trim();
    if (key === 'fullName' && v.length < 2) return 'Enter your full name.';
    if (key === 'username' && !/^[a-z0-9._-]{3,30}$/i.test(v)) return 'Use 3–30 letters, numbers, dots, dashes or underscores.';
    if (key === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) return 'Enter a valid email address.';
    if (key === 'phone') {
      var d = v.replace(/\D/g, '');
      if (d.length === 11 && d.charAt(0) === '1') d = d.slice(1);
      if (d.length !== 10) return 'Enter a 10-digit US mobile number.';
    }
    return '';
  }

  // ── Class strings (the project's own) ──

  var LINK_BTN = 'cursor-pointer rounded-sm px-2 py-1 text-sm font-semibold whitespace-nowrap text-blue-600 hover:bg-blue-600/10 hover:text-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:text-blue-400 dark:hover:text-blue-300';
  var SECONDARY_BTN = 'cursor-pointer rounded-sm bg-white px-2 py-1 text-sm font-semibold text-gray-700 shadow-xs inset-ring inset-ring-gray-300 hover:bg-gray-50 dark:bg-white/10 dark:text-gray-200 dark:inset-ring-white/10 dark:hover:bg-white/20';
  var PRIMARY_BTN = 'cursor-pointer rounded-sm bg-blue-600 px-2 py-1 text-sm font-semibold whitespace-nowrap text-white shadow-xs hover:bg-blue-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-blue-600';
  var INPUT = 'block h-10 w-full max-w-96 rounded-md bg-white px-3 text-base font-medium text-gray-900 shadow-xs outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 placeholder:font-normal focus:outline-2 focus:-outline-offset-2 focus:outline-blue-600 aria-invalid:outline-red-500 dark:bg-white/5 dark:text-white dark:outline-white/10';
  var ROW = 'grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-3 sm:items-center';

  // ── Details ──

  function valueText(field) {
    if (field.key === 'password') return '••••••••••';
    var v = profile[field.key];
    if (field.key === 'phone') return v ? formatPhone(v) : '--';
    return v || '--';
  }

  function detailRow(field) {
    var isEditing = editing === field.key;
    var label = '<div class="text-sm font-medium text-gray-900 dark:text-gray-100">' + escapeHtml(field.label) + '</div>';
    if (isEditing) {
      var id = 'mp-input-' + field.key;
      return '<form class="' + ROW + '" data-mp-form="' + field.key + '" novalidate>' +
        '<label for="' + id + '" class="text-sm font-medium text-gray-900 dark:text-gray-100">' + escapeHtml(field.label) + '</label>' +
        '<div class="flex flex-col gap-1">' +
          '<input id="' + id + '" name="value" type="' + field.type + '" autocomplete="' + field.autocomplete + '" placeholder="' + escapeHtml(field.placeholder) + '"' +
            ' value="' + escapeHtml(field.key === 'phone' ? formatPhone(profile.phone) : profile[field.key]) + '"' +
            (error ? ' aria-invalid="true" aria-describedby="' + id + '-error"' : '') + ' class="' + INPUT + '" />' +
          (error ? '<p id="' + id + '-error" class="text-sm text-red-600 dark:text-red-400">' + escapeHtml(error) + '</p>' : '') +
        '</div>' +
        '<div class="flex items-center gap-3 sm:justify-end">' +
          '<button type="button" data-mp-cancel class="' + SECONDARY_BTN + '">Cancel</button>' +
          '<button type="submit" class="' + PRIMARY_BTN + '">Save Changes</button>' +
        '</div>' +
      '</form>';
    }
    var action = field.readonly ? field.action : (field.emptyAction && !profile[field.key] ? field.emptyAction : 'Edit');
    var attr = field.readonly ? 'data-mp-reset' : 'data-mp-edit="' + field.key + '"';
    return '<div class="' + ROW + ' sm:min-h-8">' + label +
      '<div class="truncate text-sm text-gray-600 dark:text-gray-400">' + escapeHtml(valueText(field)) + '</div>' +
      '<div class="flex sm:justify-end"><button type="button" ' + attr + (editing ? ' disabled' : '') + ' class="' + LINK_BTN + ' disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"' +
        ' aria-label="' + escapeHtml(action + ' ' + field.label.toLowerCase()) + '">' + escapeHtml(action) + '</button></div>' +
    '</div>';
  }

  function renderDetails() {
    $('mp-details').innerHTML = FIELDS.map(detailRow).join('');
    if (editing) {
      var input = $('mp-input-' + editing);
      if (input) {
        input.focus();
        // Caret to the end where the browser allows it (email inputs don't).
        try { input.setSelectionRange(input.value.length, input.value.length); } catch (e) {}
      }
    }
  }

  // ── Alerts ──

  var ICON_MAIL = '<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" class="size-[18px]"><path d="M3 4a2 2 0 0 0-2 2v1.161l8.441 4.221a1.25 1.25 0 0 0 1.118 0L19 7.162V6a2 2 0 0 0-2-2H3Z" /><path d="m19 8.839-7.77 3.885a2.75 2.75 0 0 1-2.46 0L1 8.839V14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8.839Z" /></svg>';
  var ICON_PHONE = '<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" class="size-[18px]"><path fill-rule="evenodd" d="M2 3.5A1.5 1.5 0 0 1 3.5 2h1.148a1.5 1.5 0 0 1 1.465 1.175l.513 2.31a1.5 1.5 0 0 1-1.02 1.756l-.97.323a11.037 11.037 0 0 0 6.214 6.214l.323-.97a1.5 1.5 0 0 1 1.756-1.02l2.31.513A1.5 1.5 0 0 1 18 12.352V13.5a1.5 1.5 0 0 1-1.5 1.5h-1A13.5 13.5 0 0 1 2 1.5v2Z" clip-rule="evenodd" /></svg>';
  var ICON_PENCIL = '<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" class="size-[18px]"><path d="m5.433 13.917 1.262-3.155A4 4 0 0 1 7.58 9.42l6.92-6.918a2.121 2.121 0 0 1 3 3l-6.92 6.918c-.383.383-.84.685-1.343.886l-3.154 1.262a.5.5 0 0 1-.65-.65Z" /><path d="M3.5 5.75c0-.69.56-1.25 1.25-1.25H10A.75.75 0 0 0 10 3H4.75A2.75 2.75 0 0 0 2 5.75v9.5A2.75 2.75 0 0 0 4.75 18h9.5A2.75 2.75 0 0 0 17 15.25V10a.75.75 0 0 0-1.5 0v5.25c0 .69-.56 1.25-1.25 1.25h-9.5c-.69 0-1.25-.56-1.25-1.25v-9.5Z" /></svg>';

  function toggle(attrs, on, disabled, label) {
    // The project's checkbox toggle (@toggle switch), at the design's small size.
    return '<span class="group relative inline-flex w-7 shrink-0 rounded-full bg-gray-200 p-0.5 inset-ring inset-ring-gray-900/5 outline-offset-2 outline-blue-600 transition-colors duration-200 ease-in-out has-checked:bg-blue-600 has-focus-visible:outline-2 has-disabled:cursor-not-allowed has-disabled:opacity-50 dark:bg-white/10' + (disabled ? '' : ' cursor-pointer') + '">' +
      '<span class="size-3.5 rounded-full bg-white shadow-xs ring-1 ring-gray-900/5 transition-transform duration-200 ease-in-out group-has-checked:translate-x-2.5"></span>' +
      '<input type="checkbox" ' + attrs + (on ? ' checked' : '') + (disabled ? ' disabled' : '') + ' aria-label="' + escapeHtml(label) + '" class="absolute inset-0 size-full cursor-pointer appearance-none focus:outline-hidden disabled:cursor-not-allowed" /></span>';
  }

  function channelCard(group, channel) {
    var isEmail = channel === 'email';
    var hasPhone = !!profile.phone;
    var on = !!(profile.alerts[group.key] || {})[channel] && (isEmail || hasPhone);
    var sub = isEmail
      ? escapeHtml(profile.email) + '<span aria-hidden="true">·</span><button type="button" data-mp-edit="email" aria-label="Edit email" class="cursor-pointer rounded-sm p-0.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-white/10 dark:hover:text-gray-300">' + ICON_PENCIL + '</button>'
      : (hasPhone
        ? escapeHtml(formatPhone(profile.phone)) + '<span aria-hidden="true">·</span><button type="button" data-mp-edit="phone" aria-label="Edit mobile number" class="cursor-pointer rounded-sm p-0.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-white/10 dark:hover:text-gray-300">' + ICON_PENCIL + '</button>'
        : 'No mobile<span aria-hidden="true">·</span><button type="button" data-mp-edit="phone" class="cursor-pointer text-sm font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400">Add number</button>');
    var name = isEmail ? 'Email' : 'Text message (SMS)';
    return '<div class="flex items-center justify-between gap-4 rounded-xl border border-gray-200 bg-white px-3 py-2.5 dark:border-white/10 dark:bg-white/5">' +
      '<div class="flex min-w-0 items-center gap-3">' +
        '<span class="flex shrink-0 rounded-lg bg-gray-100 p-2 text-gray-500 dark:bg-white/10 dark:text-gray-400">' + (isEmail ? ICON_MAIL : ICON_PHONE) + '</span>' +
        '<div class="flex min-w-0 flex-col gap-1">' +
          '<span class="text-sm font-semibold text-gray-900 dark:text-white">' + name + '</span>' +
          '<span class="flex min-w-0 items-center gap-1.5 truncate text-sm text-gray-500 dark:text-gray-400">' + sub + '</span>' +
        '</div>' +
      '</div>' +
      toggle('data-mp-alert="' + group.key + ':' + channel + '"', on, !isEmail && !hasPhone, group.title + ' by ' + name.toLowerCase()) +
    '</div>';
  }

  function renderAlerts() {
    $('mp-alerts').innerHTML = ALERT_GROUPS.map(function (g) {
      return '<div class="flex flex-wrap items-start gap-x-14 gap-y-4">' +
        '<div class="min-w-80 max-w-[500px] flex-1"><h3 class="text-sm font-semibold text-gray-900 dark:text-white">' + g.title + '</h3>' +
          '<p class="mt-1 text-sm text-gray-500 dark:text-gray-400">' + g.text + '</p></div>' +
        '<div class="flex min-w-[min(348px,100%)] flex-1 flex-col gap-3">' + channelCard(g, 'email') + channelCard(g, 'sms') + '</div>' +
      '</div>';
    }).join('');
  }

  function render() { renderDetails(); renderAlerts(); }

  // ── Skeleton: values only, labels stay ──

  function bar(w, h) { return '<span class="pp-skel max-w-full" style="width:' + w + ';height:' + h + '"></span>'; }

  function renderSkeleton() {
    $('mp-details').innerHTML = FIELDS.map(function (f) {
      return '<div class="' + ROW + ' sm:min-h-8" aria-hidden="true"><div class="text-sm font-medium text-gray-900 dark:text-gray-100">' + f.label + '</div>' +
        bar(['9rem', '6rem', '10rem', '2rem', '6rem'][FIELDS.indexOf(f)], '1rem') + '<div class="flex sm:justify-end">' + bar('3rem', '1rem') + '</div></div>';
    }).join('');
    $('mp-alerts').innerHTML = ALERT_GROUPS.map(function (g) {
      var card = '<div class="flex items-center justify-between gap-4 rounded-xl border border-gray-200 px-3 py-2.5 dark:border-white/10"><div class="flex items-center gap-3">' + bar('2.125rem', '2.125rem') + '<div class="flex flex-col gap-1.5">' + bar('3rem', '0.9rem') + bar('9rem', '0.9rem') + '</div></div>' + bar('1.75rem', '1.125rem') + '</div>';
      return '<div class="flex flex-wrap items-start gap-x-14 gap-y-4" aria-hidden="true"><div class="min-w-80 max-w-[500px] flex-1"><h3 class="text-sm font-semibold text-gray-900 dark:text-white">' + g.title + '</h3><p class="mt-1 text-sm text-gray-500 dark:text-gray-400">' + g.text + '</p></div>' +
        '<div class="flex min-w-[min(348px,100%)] flex-1 flex-col gap-3">' + card + card + '</div></div>';
    }).join('');
  }

  // ── Editing ──

  function startEdit(key) {
    editing = key;
    error = '';
    renderDetails();
    var row = $('mp-details');
    if (row) row.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }

  function cancelEdit() { editing = null; error = ''; renderDetails(); }

  function commit(form) {
    var key = form.getAttribute('data-mp-form');
    var raw = form.elements.value.value;
    error = validate(key, raw);
    if (error) { renderDetails(); return; }
    var value = String(raw).trim();
    if (key === 'phone') value = value.replace(/\D/g, '').replace(/^1(?=\d{10}$)/, '');
    if (key === 'email') value = value.toLowerCase();
    var changed = profile[key] !== value;
    var hadPhone = !!profile.phone;
    profile[key] = value;
    editing = null;
    save();
    render();
    if (!changed) return;
    var label = FIELDS.filter(function (f) { return f.key === key; })[0].label;
    showToast(key === 'phone' && !hadPhone ? 'Mobile number added — you can now turn on text alerts' : label + ' updated');
  }

  // ── Wiring ──

  function bind() {
    document.addEventListener('click', function (event) {
      var t = event.target;
      var edit = t.closest('[data-mp-edit]');
      if (edit && !edit.disabled) { startEdit(edit.getAttribute('data-mp-edit')); return; }
      if (t.closest('[data-mp-cancel]')) { cancelEdit(); return; }
      if (t.closest('[data-mp-reset]')) { showToast('Password reset link sent to ' + profile.email); }
    });
    document.addEventListener('submit', function (event) {
      var form = event.target.closest('[data-mp-form]');
      if (!form) return;
      event.preventDefault();
      commit(form);
    });
    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && editing) { event.preventDefault(); cancelEdit(); }
    });
    document.addEventListener('change', function (event) {
      var box = event.target.closest && event.target.closest('[data-mp-alert]');
      if (!box) return;
      var parts = box.getAttribute('data-mp-alert').split(':');
      profile.alerts[parts[0]] = profile.alerts[parts[0]] || {};
      profile.alerts[parts[0]][parts[1]] = box.checked;
      save();
      var group = ALERT_GROUPS.filter(function (g) { return g.key === parts[0]; })[0];
      showToast(group.title + ' by ' + (parts[1] === 'email' ? 'email' : 'text message') + ' turned ' + (box.checked ? 'on' : 'off'));
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    bind();
    renderSkeleton();
    var delay = LOAD_MIN_MS + Math.random() * (LOAD_MAX_MS - LOAD_MIN_MS);
    var started = Date.now();
    Promise.resolve(window.DataSource ? window.DataSource.load('consumer-profile') : null)
      .catch(function () { return null; })
      .then(function (seed) {
        var stored = null;
        try { stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'); } catch (e) {}
        profile = Object.assign({ fullName: '', username: '', email: '', phone: '', alerts: {} }, seed || {}, stored || {});
        profile.alerts = Object.assign({ critical: { email: true, sms: false }, account: { email: true, sms: false } }, profile.alerts || {});
        setTimeout(render, Math.max(0, delay - (Date.now() - started)));
      });
  });
})();
