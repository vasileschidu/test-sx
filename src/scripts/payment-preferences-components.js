(function () {
  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function buildAccountActionMenu(type, id) {
    var safeType = type === 'check' ? 'check' : 'bank';
    var safeId = escapeHtml(id);
    var editAttr = safeType === 'bank' ? 'data-edit-bank-account-id' : 'data-edit-check-address-id';
    var deleteAttr = safeType === 'bank' ? 'data-delete-bank-account-id' : 'data-delete-check-address-id';

    return '' +
      '<el-dropdown class="inline-block">' +
      '  <button type="button" class="shrink-0 rounded-md p-1.5 text-gray-500 transition-colors hover:bg-gray-200 hover:text-gray-600 active:bg-gray-200 dark:text-gray-500 dark:hover:bg-white/10 dark:hover:text-gray-300 dark:active:bg-white/10 cursor-pointer">' +
      '    <span class="sr-only">Open options</span>' +
      '    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="size-4"><path d="M10 3a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3ZM10 8.5a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3ZM11.5 15.5a1.5 1.5 0 1 0-3 0 1.5 1.5 0 0 0 3 0Z"/></svg>' +
      '  </button>' +
      '  <el-menu anchor="bottom end" popover class="min-w-32 origin-top-right rounded-md bg-white shadow-lg outline-1 outline-black/5 transition transition-discrete [--anchor-gap:--spacing(2)] data-closed:scale-95 data-closed:transform data-closed:opacity-0 data-enter:duration-100 data-enter:ease-out data-leave:duration-75 data-leave:ease-in dark:bg-gray-800 dark:shadow-none dark:-outline-offset-1 dark:outline-white/10">' +
      '    <div class="py-1">' +
      '      <button type="button" ' + editAttr + '="' + safeId + '" class="flex w-full items-center gap-3 px-3 py-2 text-left text-sm font-medium text-gray-700 hover:bg-gray-100 focus:bg-gray-100 focus:text-gray-900 focus:outline-hidden dark:text-gray-300 dark:hover:bg-white/5 dark:focus:bg-white/5 dark:focus:text-white cursor-pointer">' +
      '        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M2.69533 14.7623L1.43355 17.9168C1.27028 18.3249 1.67532 18.73 2.08348 18.5667L5.23795 17.3049C5.74091 17.1037 6.19777 16.8025 6.58081 16.4194L17.5 5.50072C18.3284 4.67229 18.3284 3.32914 17.5 2.50072C16.6716 1.67229 15.3284 1.67229 14.5 2.50071L3.58081 13.4194C3.19777 13.8025 2.89652 14.2593 2.69533 14.7623Z" fill="#6B7280"/></svg>' +
      '        <span>Edit</span>' +
      '      </button>' +
      '      <button type="button" ' + deleteAttr + '="' + safeId + '" class="flex w-full items-center gap-3 px-3 py-2 text-left text-sm font-medium text-red-700 hover:bg-red-50 focus:bg-red-50 focus:text-red-700 focus:outline-hidden dark:text-red-400 dark:hover:bg-red-500/10 dark:focus:bg-red-500/10 dark:focus:text-red-300 cursor-pointer">' +
      '        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M11.25 1C12.7688 1 14 2.23122 14 3.75V4.19238C14.7952 4.26939 15.5839 4.3694 16.3652 4.49121C16.7744 4.555 17.0549 4.93847 16.9912 5.34766C16.9274 5.75685 16.544 6.0373 16.1348 5.97363C16.0854 5.96593 16.0358 5.95771 15.9863 5.9502L15.1445 16.4697C15.03 17.8987 13.8369 19 12.4033 19H7.59668C6.16309 19 4.97002 17.8987 4.85547 16.4697L4.01367 5.9502C3.96434 5.9577 3.91451 5.96595 3.86523 5.97363C3.45613 6.03717 3.07257 5.75678 3.00879 5.34766C2.94514 4.93848 3.22558 4.555 3.63477 4.49121C4.41615 4.3694 5.20478 4.2694 6 4.19238V3.75C6 2.23122 7.23122 1 8.75 1H11.25ZM7.7998 7.00098C7.38607 7.01769 7.0645 7.36649 7.08105 7.78027L7.38086 15.2803C7.39757 15.694 7.74637 16.0156 8.16016 15.999C8.57399 15.9824 8.89644 15.6336 8.87988 15.2197L8.5791 7.71973C8.56238 7.30599 8.21358 6.98442 7.7998 7.00098ZM12.2002 7.00098C11.7864 6.98443 11.4376 7.30599 11.4209 7.71973L11.1211 15.2197C11.1045 15.6335 11.4261 15.9823 11.8398 15.999C12.2536 16.0156 12.6024 15.694 12.6191 15.2803L12.9199 7.78027C12.9365 7.36644 12.614 7.01761 12.2002 7.00098ZM8.75 2.5C8.05964 2.5 7.5 3.05964 7.5 3.75V4.0752C8.32703 4.02543 9.16061 4 10 4C10.8394 4 11.673 4.02544 12.5 4.0752V3.75C12.5 3.05964 11.9404 2.5 11.25 2.5H8.75Z" fill="#DC2626"/></svg>' +
      '        <span>Delete</span>' +
      '      </button>' +
      '    </div>' +
      '  </el-menu>' +
      '</el-dropdown>';
  }

  function maskRouting(routing) {
    var digits = String(routing || '').replace(/\D/g, '');
    if (!digits) return '--';
    return '•••••' + digits.slice(-4);
  }

  function createChevronIcon() {
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="size-5"><path fill-rule="evenodd" d="M7.22 5.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06L8.28 14.78a.75.75 0 1 1-1.06-1.06L10.94 10 7.22 6.28a.75.75 0 0 1 0-1.06Z" clip-rule="evenodd" /></svg>';
  }

  function createRevealIcons() {
    return '' +
      '<svg data-icon="reveal" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="size-3.5"><path d="M8 9.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z" /><path fill-rule="evenodd" d="M1.3794 8.28049C1.31616 8.09687 1.31625 7.89727 1.37965 7.71371C2.32719 4.97038 4.93238 3 7.99777 3C11.0653 3 13.672 4.97316 14.6179 7.71951C14.6811 7.90313 14.681 8.10274 14.6176 8.2863C13.6701 11.0296 11.0649 13 7.99952 13C4.93197 13 2.32527 11.0268 1.3794 8.28049ZM11 8a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" clip-rule="evenodd" /></svg>' +
      '<svg data-icon="hide" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="size-3.5 hidden"><path fill-rule="evenodd" clip-rule="evenodd" d="M3.28033 2.21967C2.98744 1.92678 2.51256 1.92678 2.21967 2.21967C1.92678 2.51256 1.92678 2.98744 2.21967 3.28033L12.7197 13.7803C13.0126 14.0732 13.4874 14.0732 13.7803 13.7803C14.0732 13.4874 14.0732 13.0126 13.7803 12.7197L12.4577 11.397C13.438 10.5863 14.1937 9.51366 14.6176 8.2863C14.681 8.10274 14.6811 7.90313 14.6179 7.71951C13.672 4.97316 11.0653 3 7.99777 3C6.85414 3 5.77457 3.27425 4.82123 3.76057L3.28033 2.21967Z" /><path d="M6.47602 5.41536L7.61147 6.55081C7.73539 6.51767 7.86563 6.5 8 6.5C8.82843 6.5 9.5 7.17157 9.5 8C9.5 8.13437 9.48233 8.26461 9.44919 8.38853L10.5846 9.52398C10.8486 9.07734 11 8.55636 11 8C11 6.34315 9.65685 5 8 5C7.44364 5 6.92266 5.15145 6.47602 5.41536Z" /><path d="M7.81206 10.9942L9.62754 12.8097C9.10513 12.9341 8.56002 13 7.99952 13C4.93197 13 2.32527 11.0268 1.3794 8.28049C1.31616 8.09687 1.31625 7.89727 1.37965 7.71371C1.63675 6.96935 2.01588 6.28191 2.49314 5.67529L5.00579 8.18794C5.09895 9.69509 6.30491 10.901 7.81206 10.9942Z" /></svg>';
  }

  function buildExpandableHeader(config) {
    return '' +
      '<div class="grid min-w-0 grow grid-cols-[auto_auto_minmax(0,1fr)] items-center gap-3">' +
      '  <button type="button" data-method-toggle class="shrink-0 rounded-md p-1 text-gray-400 transition-colors hover:bg-gray-200 hover:text-gray-600 dark:text-gray-500 dark:hover:bg-white/10 dark:hover:text-gray-300" aria-expanded="false">' +
           createChevronIcon() +
      '  </button>' +
      '  <div class="flex size-10 items-center justify-center">' + config.iconHtml + '</div>' +
      '  <div class="flex min-w-0 flex-col gap-1">' +
      '    <span class="text-sm font-semibold text-gray-900 dark:text-gray-100">' + config.title + '</span>' +
      '    <span class="text-sm font-normal text-gray-500 dark:text-gray-400">' + config.subtitle + '</span>' +
      '  </div>' +
      '</div>' +
      '<div class="ml-auto shrink-0" data-method-actions>' + config.actionsHtml + '</div>';
  }

  function attachAccordionBehavior(row) {
    var toggleBtn = row.querySelector('[data-method-toggle]');
    var body = row.querySelector('[data-method-body]');
    var header = row.querySelector('[data-method-header]');
    if (!toggleBtn || !body || !header) return;

    function setOpen(open) {
      body.classList.toggle('hidden', !open);
      header.classList.toggle('bg-gray-100', open);
      header.classList.toggle('dark:bg-white/10', open);
      toggleBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
      var icon = toggleBtn.querySelector('svg');
      if (icon) icon.classList.toggle('rotate-90', open);
    }

    toggleBtn.addEventListener('click', function () {
      setOpen(toggleBtn.getAttribute('aria-expanded') !== 'true');
    });

    var headerClickTarget = row.querySelector('[data-method-click-target]');
    if (headerClickTarget) {
      headerClickTarget.addEventListener('click', function (event) {
        if (event.target.closest('[data-method-actions]')) return;
        if (event.target.closest('[data-method-toggle]')) return;
        setOpen(toggleBtn.getAttribute('aria-expanded') !== 'true');
      });
    }

    setOpen(false);
  }

  function attachRevealBehavior(row, account) {
    var btn = row.querySelector('[data-bank-reveal-btn]');
    if (!btn) return;
    var acctEl = row.querySelector('[data-bank-account-value]');
    var routingEl = row.querySelector('[data-bank-routing-value]');
    if (!acctEl || !routingEl) return;
    var revealIcon = btn.querySelector('[data-icon="reveal"]');
    var hideIcon = btn.querySelector('[data-icon="hide"]');
    var revealText = btn.querySelector('[data-reveal-text]');
    var accountCopyBtn = row.querySelector('[data-bank-account-copy]');
    var routingCopyBtn = row.querySelector('[data-bank-routing-copy]');
    var maskedAccount = escapeHtml(account.maskedAccount || ('••••' + (account.last4 || '')));
    var maskedRouting = escapeHtml(account.maskedRouting || maskRouting(account.routing || ''));
    var revealedAccount = escapeHtml(account.accountNumber || String(account.last4 || ''));
    var revealedRouting = escapeHtml(account.routing || '');

    function setCopyVisible(copyBtn, visible) {
      if (!copyBtn) return;
      copyBtn.setAttribute('data-copy-enabled', visible ? 'true' : 'false');
      copyBtn.classList.toggle('pointer-events-none', !visible);
      copyBtn.classList.toggle('hover:bg-gray-200', visible);
      copyBtn.classList.toggle('dark:hover:bg-white/20', visible);
      var icon = copyBtn.querySelector('[data-copy-icon]');
      if (icon) icon.classList.toggle('hidden', !visible);
    }

    function setRevealed(revealed) {
      acctEl.textContent = revealed ? revealedAccount : maskedAccount;
      routingEl.textContent = revealed ? revealedRouting : maskedRouting;
      if (revealIcon) revealIcon.classList.toggle('hidden', revealed);
      if (hideIcon) hideIcon.classList.toggle('hidden', !revealed);
      if (revealText) revealText.textContent = revealed ? 'Hide Details' : 'Reveal Details';
      btn.setAttribute('data-revealed', revealed ? 'true' : 'false');
      setCopyVisible(accountCopyBtn, revealed);
      setCopyVisible(routingCopyBtn, revealed);
    }

    btn.addEventListener('click', function () {
      setRevealed(btn.getAttribute('data-revealed') !== 'true');
    });

    setRevealed(false);
  }

  function attachCopyBehavior(row) {
    row.querySelectorAll('[data-copy-id]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (btn.getAttribute('data-copy-enabled') === 'false') return;
        var valueEl = row.querySelector('#' + btn.getAttribute('data-copy-id'));
        if (!valueEl) return;
        var text = String(valueEl.textContent || '').trim();
        if (!text || text === '--') return;
        if (window.copyTextWithFeedback) {
          window.copyTextWithFeedback(text, btn);
          return;
        }
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).catch(function () {});
        }
      });
    });
  }

  function createBankAccountRow(account) {
    var row = document.createElement('div');
    row.className = 'flex flex-col self-stretch rounded-lg bg-gray-50 dark:bg-white/5';
    row.setAttribute('data-bank-account-id', account.id);
    var accountCopyId = 'pp-bank-detail-copy-account-' + escapeHtml(account.id);
    var routingCopyId = 'pp-bank-detail-copy-routing-' + escapeHtml(account.id);
    row.innerHTML =
      '<div data-method-header class="flex items-center justify-between gap-3 rounded-lg p-3">' +
        '<div data-method-click-target class="flex min-w-0 grow items-center gap-3">' +
          buildExpandableHeader({
            iconHtml: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 18 18" fill="none"><path fill-rule="evenodd" clip-rule="evenodd" d="M8.7075 1.86718C8.8929 1.77767 9.10901 1.77767 9.29441 1.86718L15.8194 5.01718C16.1552 5.17925 16.2959 5.58279 16.1339 5.9185C15.9827 6.23168 15.6213 6.37521 15.301 6.26151V14.85H15.526C15.8988 14.85 16.201 15.1523 16.201 15.525C16.201 15.8978 15.8988 16.2 15.526 16.2H2.47594C2.10314 16.2 1.80094 15.8978 1.80094 15.525C1.80094 15.1523 2.10314 14.85 2.47594 14.85H2.70094V6.26151C2.38057 6.37521 2.01925 6.23168 1.86806 5.9185C1.70599 5.58279 1.84676 5.17925 2.18248 5.01718L8.7075 1.86718ZM9.90081 5.40005C9.90081 5.89711 9.49786 6.30005 9.0008 6.30005C8.50375 6.30005 8.1008 5.89711 8.1008 5.40005C8.1008 4.90299 8.50375 4.50005 9.0008 4.50005C9.49786 4.50005 9.90081 4.90299 9.90081 5.40005ZM6.7508 8.77505C6.7508 8.40226 6.44859 8.10005 6.07579 8.10005C5.703 8.10005 5.40079 8.40226 5.40079 8.77505V13.725C5.40079 14.0978 5.703 14.4 6.07579 14.4C6.44859 14.4 6.7508 14.0978 6.7508 13.725V8.77505ZM9.6758 8.77505C9.6758 8.40226 9.3736 8.10005 9.0008 8.10005C8.62801 8.10005 8.3258 8.40226 8.3258 8.77505V13.725C8.3258 14.0978 8.62801 14.4 9.0008 14.4C9.3736 14.4 9.6758 14.0978 9.6758 13.725V8.77505ZM12.6008 8.77505C12.6008 8.40226 12.2986 8.10005 11.9258 8.10005C11.553 8.10005 11.2508 8.40226 11.2508 8.77505V13.725C11.2508 14.0978 11.553 14.4 11.9258 14.4C12.2986 14.4 12.6008 14.0978 12.6008 13.725V8.77505Z" fill="#6B7280"/></svg>',
            title: escapeHtml(account.displayName || account.name),
            subtitle: '••••' + escapeHtml(account.last4),
            actionsHtml: buildAccountActionMenu('bank', account.id)
          }) +
        '</div>' +
      '</div>' +
      '<div data-method-body class="hidden px-3 pb-3">' +
        '<div class="min-w-0">' +
          '<div class="flex flex-col items-start gap-2 self-stretch rounded-md bg-gray-50 px-4 py-3 dark:bg-white/5">' +
            '<div class="grid grid-cols-2 gap-4 self-stretch"><span class="text-sm font-medium text-gray-900 dark:text-gray-100">Name</span><span class="text-sm font-normal text-gray-700 dark:text-gray-300">' + escapeHtml(account.accountHolderName || account.name) + '</span></div>' +
            '<div class="grid grid-cols-2 gap-4 self-stretch"><span class="text-sm font-medium text-gray-900 dark:text-gray-100">Bank</span><span class="text-sm font-normal text-gray-700 dark:text-gray-300">' + escapeHtml(account.bankName || account.displayName || '--') + '</span></div>' +
            '<div class="grid grid-cols-2 gap-4 self-stretch"><span class="text-sm font-medium text-gray-900 dark:text-gray-100">Account Number</span><button type="button" data-bank-account-copy data-copy-id="' + accountCopyId + '" data-copy-enabled="false" class="copy-btn -ml-1 inline-flex w-fit items-center gap-1.5 rounded-md px-1.5 py-0.5 text-gray-700 dark:text-gray-300 pointer-events-none"><span id="' + accountCopyId + '" data-bank-account-value class="text-sm font-normal text-gray-700 dark:text-gray-300"></span><span data-copy-icon class="hidden"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="size-4 shrink-0 text-gray-400 dark:text-gray-500"><path d="M7 3.5A1.5 1.5 0 0 1 8.5 2h3.879a1.5 1.5 0 0 1 1.06.44l3.122 3.12A1.5 1.5 0 0 1 17 6.622V12.5a1.5 1.5 0 0 1-1.5 1.5h-1v-3.379a3 3 0 0 0-.879-2.121L10.5 5.379A3 3 0 0 0 8.379 4.5H7v-1Z" /><path d="M4.5 6A1.5 1.5 0 0 0 3 7.5v9A1.5 1.5 0 0 0 4.5 18h7a1.5 1.5 0 0 0 1.5-1.5v-5.879a1.5 1.5 0 0 0-.44-1.06L9.44 6.439A1.5 1.5 0 0 0 8.378 6H4.5Z" /></svg></span></button></div>' +
            '<div class="grid grid-cols-2 gap-4 self-stretch"><span class="text-sm font-medium text-gray-900 dark:text-gray-100">Routing Number</span><button type="button" data-bank-routing-copy data-copy-id="' + routingCopyId + '" data-copy-enabled="false" class="copy-btn -ml-1 inline-flex w-fit items-center gap-1.5 rounded-md px-1.5 py-0.5 text-gray-700 dark:text-gray-300 pointer-events-none"><span id="' + routingCopyId + '" data-bank-routing-value class="text-sm font-normal text-gray-700 dark:text-gray-300"></span><span data-copy-icon class="hidden"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="size-4 shrink-0 text-gray-400 dark:text-gray-500"><path d="M7 3.5A1.5 1.5 0 0 1 8.5 2h3.879a1.5 1.5 0 0 1 1.06.44l3.122 3.12A1.5 1.5 0 0 1 17 6.622V12.5a1.5 1.5 0 0 1-1.5 1.5h-1v-3.379a3 3 0 0 0-.879-2.121L10.5 5.379A3 3 0 0 0 8.379 4.5H7v-1Z" /><path d="M4.5 6A1.5 1.5 0 0 0 3 7.5v9A1.5 1.5 0 0 0 4.5 18h7a1.5 1.5 0 0 0 1.5-1.5v-5.879a1.5 1.5 0 0 0-.44-1.06L9.44 6.439A1.5 1.5 0 0 0 8.378 6H4.5Z" /></svg></span></button></div>' +
            '<div class="grid grid-cols-2 gap-4 self-stretch items-start"><span class="text-sm font-medium text-gray-900 dark:text-gray-100">Address</span><div class="flex flex-col items-start gap-1.5">' +
              (account.address ? '<span class="whitespace-pre-line text-sm font-normal text-gray-700 dark:text-gray-300">' + escapeHtml(account.address) + '</span>' : '<span class="text-sm font-normal text-gray-700 dark:text-gray-300">--</span>') +
              '<button type="button" data-bank-reveal-btn data-revealed="false" class="inline-flex w-fit self-start items-center gap-2 rounded-md px-2.5 py-1.5 text-sm font-semibold text-blue-600 hover:bg-blue-600/10 dark:bg-blue-600/10 dark:text-blue-400 dark:hover:bg-blue-600/20 cursor-pointer">' +
                createRevealIcons() +
                '<span data-reveal-text>Reveal Details</span>' +
              '</button>' +
            '</div></div>' +
          '</div>' +
        '</div>' +
      '</div>';
    attachAccordionBehavior(row);
    attachRevealBehavior(row, account);
    attachCopyBehavior(row);
    return row;
  }

  function createCheckAddressRow(address) {
    var row = document.createElement('div');
    row.className = 'flex flex-col self-stretch rounded-lg bg-gray-50 dark:bg-white/5';
    row.setAttribute('data-check-address-id', address.id);
    var addressCopyId = 'pp-check-detail-copy-address-' + escapeHtml(address.id);
    row.innerHTML =
      '<div data-method-header class="flex items-center justify-between gap-3 rounded-lg p-3">' +
        '<div data-method-click-target class="flex min-w-0 grow items-center gap-3">' +
          buildExpandableHeader({
            iconHtml: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M16.25 2C16.6642 2 17 2.33579 17 2.75C17 3.16421 16.6642 3.5 16.25 3.5H16V16.5H16.25C16.6642 16.5 17 16.8358 17 17.25C17 17.6642 16.6642 18 16.25 18H12.75C12.3358 18 12 17.6642 12 17.25V14.75C12 14.3358 11.6642 14 11.25 14H8.75C8.33579 14 8 14.3358 8 14.75V17.25C8 17.6642 7.66421 18 7.25 18H3.75C3.33579 18 3 17.6642 3 17.25C3 16.8358 3.33579 16.5 3.75 16.5H4V3.5H3.75C3.33579 3.5 3 3.16421 3 2.75C3 2.33579 3.33579 2 3.75 2H16.25ZM7.5 9C7.22386 9 7 9.22386 7 9.5V10.5C7 10.7761 7.22386 11 7.5 11H8.5C8.77614 11 9 10.7761 9 10.5V9.5C9 9.22386 8.77614 9 8.5 9H7.5ZM11.5 9C11.2239 9 11 9.22386 11 9.5V10.5C11 10.7761 11.2239 11 11.5 11H12.5C12.7761 11 13 10.7761 13 10.5V9.5C13 9.22386 12.7761 9 12.5 9H11.5ZM7.5 5C7.22386 5 7 5.22386 7 5.5V6.5C7 6.77614 7.22386 7 7.5 7H8.5C8.77614 7 9 6.77614 9 6.5V5.5C9 5.22386 8.77614 5 8.5 5H7.5ZM11.5 5C11.2239 5 11 5.22386 11 5.5V6.5C11 6.77614 11.2239 7 11.5 7H12.5C12.7761 7 13 6.77614 13 6.5V5.5C13 5.22386 12.7761 5 12.5 5H11.5Z" fill="#6B7280"/></svg>',
            title: escapeHtml(address.displayName),
            subtitle: escapeHtml(address.summary),
            actionsHtml: buildAccountActionMenu('check', address.id)
          }) +
        '</div>' +
      '</div>' +
      '<div data-method-body class="hidden px-3 pb-3">' +
        '<div class="min-w-0">' +
          '<div class="flex flex-col items-start gap-2 self-stretch rounded-md bg-gray-50 px-4 py-3 dark:bg-white/5">' +
            '<div class="grid grid-cols-2 gap-4 self-stretch"><span class="text-sm font-medium text-gray-900 dark:text-gray-100">Recipient Name</span><span class="text-sm font-normal text-gray-700 dark:text-gray-300">' + escapeHtml(address.name) + '</span></div>' +
            '<div class="grid grid-cols-2 gap-4 self-stretch items-start"><span class="text-sm font-medium text-gray-900 dark:text-gray-100">Mailing Address</span><button type="button" data-copy-id="' + addressCopyId + '" class="copy-btn -ml-1 inline-flex w-fit items-start gap-1.5 rounded-md px-1.5 py-0.5 text-left text-gray-700 transition-colors hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-white/20 cursor-pointer"><span id="' + addressCopyId + '" class="whitespace-pre-line text-sm font-normal">' + escapeHtml(address.address) + '</span><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="mt-0.5 size-4 shrink-0 text-gray-400 dark:text-gray-500"><path d="M7 3.5A1.5 1.5 0 0 1 8.5 2h3.879a1.5 1.5 0 0 1 1.06.44l3.122 3.12A1.5 1.5 0 0 1 17 6.622V12.5a1.5 1.5 0 0 1-1.5 1.5h-1v-3.379a3 3 0 0 0-.879-2.121L10.5 5.379A3 3 0 0 0 8.379 4.5H7v-1Z" /><path d="M4.5 6A1.5 1.5 0 0 0 3 7.5v9A1.5 1.5 0 0 0 4.5 18h7a1.5 1.5 0 0 0 1.5-1.5v-5.879a1.5 1.5 0 0 0-.44-1.06L9.44 6.439A1.5 1.5 0 0 0 8.378 6H4.5Z" /></svg></button></div>' +
          '</div>' +
        '</div>' +
      '</div>';
    attachAccordionBehavior(row);
    attachCopyBehavior(row);
    return row;
  }

  window.PPComponents = Object.assign({}, window.PPComponents || {}, {
    buildAccountActionMenu: buildAccountActionMenu,
    createBankAccountRow: createBankAccountRow,
    createCheckAddressRow: createCheckAddressRow
  });
})();
