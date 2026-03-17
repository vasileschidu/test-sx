(function () {
  'use strict';

  var CONFIG_PATHS = [
    '../../data/public-runtime-config.json',
    '../../../src/data/public-runtime-config.json',
    '/src/data/public-runtime-config.json',
    './src/data/public-runtime-config.json'
  ];
  var STORAGE_KEY = 'sd-sx-token-test-config-v1';

  function $(id) {
    return document.getElementById(id);
  }

  function setResult(el, type, lines) {
    if (!el) return;
    var palette = {
      success: 'border-green-200 bg-green-50 text-green-800 dark:border-green-500/30 dark:bg-green-500/10 dark:text-green-200',
      error: 'border-red-200 bg-red-50 text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200',
      info: 'border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-200'
    };
    el.className = 'mt-6 rounded-xl border p-4 text-sm ' + (palette[type] || palette.info);
    el.innerHTML = (Array.isArray(lines) ? lines : [String(lines || '')])
      .map(function (line) { return '<p>' + String(line) + '</p>'; })
      .join('');
    el.classList.remove('hidden');
  }

  function hideResult(el) {
    if (!el) return;
    el.classList.add('hidden');
    el.innerHTML = '';
  }

  function loadJsonWithFallbacks(paths) {
    var index = 0;
    function tryNext() {
      if (index >= paths.length) return Promise.resolve({});
      var path = paths[index++];
      return fetch(path, { cache: 'no-store' })
        .then(function (response) {
          if (!response.ok) throw new Error('HTTP ' + response.status);
          return response.json();
        })
        .catch(function () {
          return tryNext();
        });
    }
    return tryNext();
  }

  function getStoredConfig() {
    try {
      var raw = window.localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (error) {
      return {};
    }
  }

  function saveStoredConfig(config) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(config || {}));
    } catch (error) {
      // Ignore local storage failures.
    }
  }

  function normalizeBaseUrl(value) {
    return String(value || '').trim().replace(/\/+$/, '');
  }

  function getCurrentPageUrlWithoutQuery() {
    return window.location.origin + window.location.pathname;
  }

  function updateServiceState() {
    var baseUrl = normalizeBaseUrl($('token-service-url') && $('token-service-url').value);
    var state = $('token-service-state');
    if (!state) return;
    state.textContent = baseUrl ? 'Worker configured' : 'Config pending';
    state.className = 'inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ' +
      (baseUrl
        ? 'bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-300'
        : 'bg-gray-100 text-gray-700 dark:bg-white/10 dark:text-gray-300');
  }

  function getConfiguredBaseUrl() {
    return normalizeBaseUrl($('token-service-url') && $('token-service-url').value);
  }

  async function postJson(path, body) {
    var baseUrl = getConfiguredBaseUrl();
    if (!baseUrl) {
      throw new Error('Paste the Worker base URL first.');
    }

    var response = await fetch(baseUrl + path, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body || {})
    });
    var data = {};
    try {
      data = await response.json();
    } catch (error) {
      data = {};
    }
    if (!response.ok || data.ok === false) {
      throw new Error(data.error || ('Request failed with ' + response.status));
    }
    return data;
  }

  function syncQueryIntoForm() {
    var params = new URLSearchParams(window.location.search || '');
    var flow = String(params.get('flow') || '').trim().toLowerCase();
    var token = String(params.get('token') || '').trim();
    if (flow === 'sd' || flow === 'sx') {
      if ($('verify-flow')) $('verify-flow').value = flow;
      if ($('token-flow')) $('token-flow').value = flow;
    }
    if (token && $('verify-token')) {
      $('verify-token').value = token;
    }
    return !!(flow && token);
  }

  function shouldAutoVerifyFromQuery() {
    var params = new URLSearchParams(window.location.search || '');
    var flow = String(params.get('flow') || '').trim().toLowerCase();
    var token = String(params.get('token') || '').trim();
    return !!((flow === 'sd' || flow === 'sx') && token);
  }

  async function handleSend(event) {
    event.preventDefault();
    var email = String($('token-email') && $('token-email').value || '').trim();
    var flow = String($('token-flow') && $('token-flow').value || 'sd').trim().toLowerCase();
    var recipientName = String($('token-recipient-name') && $('token-recipient-name').value || '').trim();
    var sandbox = String($('token-sandbox') && $('token-sandbox').value || 'false') === 'true';
    var verifyBaseUrl = getCurrentPageUrlWithoutQuery();
    var resultEl = $('token-send-result');

    hideResult(resultEl);

    if (!email) {
      setResult(resultEl, 'error', 'Enter one recipient email address.');
      return;
    }

    try {
      var payload = await postJson('/send-test-token', {
        flow: flow,
        email: email,
        recipientName: recipientName,
        sandbox: sandbox,
        verifyBaseUrl: verifyBaseUrl
      });

      setResult(resultEl, 'success', [
        'Token request accepted.',
        'Flow: ' + payload.flow.toUpperCase(),
        'Recipient: ' + payload.email,
        payload.mode === 'sandbox'
          ? 'Sandbox mode is ON. Brevo accepted the request but did not send the email.'
          : 'Email sent. Ask the tester to open the inbox and click the link.',
        payload.previewUrl ? ('Preview URL: <a class="underline font-medium" href="' + payload.previewUrl + '">' + payload.previewUrl + '</a>') : ''
      ].filter(Boolean));
    } catch (error) {
      setResult(resultEl, 'error', error.message || 'Failed to send token.');
    }
  }

  async function handleVerify(event) {
    if (event) event.preventDefault();
    var token = String($('verify-token') && $('verify-token').value || '').trim();
    var flow = String($('verify-flow') && $('verify-flow').value || 'sd').trim().toLowerCase();
    var resultEl = $('token-verify-result');

    hideResult(resultEl);

    if (!token) {
      setResult(resultEl, 'error', 'Paste a token first.');
      return;
    }

    try {
      var payload = await postJson('/verify-test-token', {
        flow: flow,
        token: token
      });

      setResult(resultEl, 'success', [
        'Token verified successfully.',
        'Flow: ' + payload.flow.toUpperCase(),
        'Email: ' + payload.email,
        'Expires at: ' + payload.expiresAt
      ]);
    } catch (error) {
      setResult(resultEl, 'error', error.message || 'Token verification failed.');
    }
  }

  function bindEvents() {
    var sendForm = $('token-send-form');
    var verifyForm = $('token-verify-form');
    var serviceUrlInput = $('token-service-url');
    var useCurrentUrlBtn = $('token-use-current-url');

    if (sendForm) sendForm.addEventListener('submit', handleSend);
    if (verifyForm) verifyForm.addEventListener('submit', handleVerify);

    if (serviceUrlInput) {
      serviceUrlInput.addEventListener('input', function () {
        updateServiceState();
        saveStoredConfig({
          tokenServiceBaseUrl: normalizeBaseUrl(serviceUrlInput.value),
          defaultTestRecipient: $('token-email') ? $('token-email').value.trim() : '',
          defaultFlow: $('token-flow') ? $('token-flow').value : 'sd'
        });
      });
    }

    if ($('token-email')) {
      $('token-email').addEventListener('input', function () {
        saveStoredConfig({
          tokenServiceBaseUrl: getConfiguredBaseUrl(),
          defaultTestRecipient: $('token-email').value.trim(),
          defaultFlow: $('token-flow') ? $('token-flow').value : 'sd'
        });
      });
    }

    if ($('token-flow')) {
      $('token-flow').addEventListener('change', function () {
        saveStoredConfig({
          tokenServiceBaseUrl: getConfiguredBaseUrl(),
          defaultTestRecipient: $('token-email') ? $('token-email').value.trim() : '',
          defaultFlow: $('token-flow').value
        });
      });
    }

    if (useCurrentUrlBtn) {
      useCurrentUrlBtn.addEventListener('click', function () {
        setResult($('token-send-result'), 'info', 'The verification link already points back to this page: ' + getCurrentPageUrlWithoutQuery());
      });
    }
  }

  async function init() {
    bindEvents();

    var storedConfig = getStoredConfig();
    var runtimeConfig = await loadJsonWithFallbacks(CONFIG_PATHS);

    if ($('token-service-url')) {
      $('token-service-url').value = normalizeBaseUrl(
        storedConfig.tokenServiceBaseUrl || runtimeConfig.tokenServiceBaseUrl || ''
      );
    }
    if ($('token-email')) {
      $('token-email').value = String(
        storedConfig.defaultTestRecipient || runtimeConfig.defaultTestRecipient || ''
      );
    }
    if ($('token-flow')) {
      $('token-flow').value = String(
        storedConfig.defaultFlow || runtimeConfig.defaultFlow || 'sd'
      );
    }

    updateServiceState();

    if (syncQueryIntoForm()) {
      if (getConfiguredBaseUrl() && shouldAutoVerifyFromQuery()) {
        setResult($('token-verify-result'), 'info', 'Token detected in the URL. Verifying now.');
        handleVerify();
      } else {
        setResult($('token-verify-result'), 'info', 'Token detected in the URL. Click "Verify token" to complete the test.');
      }
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
