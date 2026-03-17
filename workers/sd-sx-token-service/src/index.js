const FLOW_LABELS = {
  sd: 'SMART Disburse',
  sx: 'SMART Exchange'
};

function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: Object.assign(
      {
        'content-type': 'application/json; charset=utf-8'
      },
      extraHeaders
    )
  });
}

function parseList(value) {
  return String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function getAllowedOrigin(request, env) {
  const origin = request.headers.get('Origin') || '';
  const allowed = parseList(env.ALLOWED_ORIGINS);
  if (!origin) return allowed[0] || '*';
  if (!allowed.length || allowed.includes('*')) return origin;
  if (allowed.includes(origin)) return origin;
  return allowed[0] || origin;
}

function withCors(response, request, env) {
  const headers = new Headers(response.headers);
  headers.set('Access-Control-Allow-Origin', getAllowedOrigin(request, env));
  headers.set('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  headers.set('Access-Control-Allow-Headers', 'Content-Type');
  headers.set('Vary', 'Origin');
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

async function readJson(request) {
  try {
    return await request.json();
  } catch (error) {
    return {};
  }
}

function isAllowedEmail(env, email) {
  const allowlist = parseList(env.TEST_EMAIL_ALLOWLIST).map(normalizeEmail);
  if (!allowlist.length) return true;
  return allowlist.includes(normalizeEmail(email));
}

function getFlow(payload) {
  const flow = String(payload && payload.flow || '').trim().toLowerCase();
  return flow === 'sd' || flow === 'sx' ? flow : '';
}

function createToken() {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  let binary = '';
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

async function sha256(value) {
  const encoded = new TextEncoder().encode(String(value || ''));
  const digest = await crypto.subtle.digest('SHA-256', encoded);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

function getRecipientGreeting(name, email) {
  const trimmedName = String(name || '').trim();
  if (trimmedName) return trimmedName;
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail || normalizedEmail.indexOf('@') === -1) return 'there';
  const localPart = normalizedEmail.split('@')[0].replace(/[._-]+/g, ' ').trim();
  if (!localPart) return 'there';
  return localPart.replace(/\b\w/g, (char) => char.toUpperCase());
}

function buildOnboardingUrl(baseUrl, flow, email) {
  const rawBaseUrl = String(baseUrl || '').trim();
  if (!rawBaseUrl) return '';

  try {
    const url = new URL(rawBaseUrl);
    if (/\/src\/pages\/tools\/[^/]+$/i.test(url.pathname)) {
      url.pathname = url.pathname.replace(/\/src\/pages\/tools\/[^/]+$/i, '/src/pages/onboarding/index.html');
    } else if (/\/src\/pages\/onboarding\/[^/]+$/i.test(url.pathname)) {
      url.pathname = url.pathname.replace(/\/src\/pages\/onboarding\/[^/]+$/i, '/src/pages/onboarding/index.html');
    } else {
      url.pathname = url.pathname.replace(/\/+$/, '') + '/src/pages/onboarding/index.html';
    }
    url.search = '';
    url.searchParams.set('flow', flow);
    if (email) url.searchParams.set('email', email);
    return url.toString();
  } catch (error) {
    return '';
  }
}

function buildEmailHtml({ flow, token, verifyUrl, onboardingUrl, recipientName, email }) {
  const title = FLOW_LABELS[flow] || flow.toUpperCase();
  const greeting = getRecipientGreeting(recipientName, email);
  const onboardingButton = onboardingUrl
    ? `<p style="margin:0 0 12px;"><a href="${onboardingUrl}" style="display:inline-block;padding:12px 16px;border-radius:12px;background:#111827;color:#fff;text-decoration:none;font-weight:600;">Start onboarding</a></p>`
    : '';
  const onboardingText = onboardingUrl
    ? `<p style="margin:0 0 12px;">To continue, start the onboarding flow here:</p>
      <p style="margin:0 0 20px;word-break:break-all;"><a href="${onboardingUrl}" style="color:#2563eb;text-decoration:underline;">${onboardingUrl}</a></p>`
    : '';
  return `
    <div style="font-family:Inter,Arial,sans-serif;line-height:1.6;color:#111827;padding:24px;">
      <p style="margin:0 0 12px;font-size:12px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#2563eb;">Test Mode</p>
      <h1 style="margin:0 0 16px;font-size:24px;line-height:1.2;">${title} test token</h1>
      <p style="margin:0 0 12px;">Hi ${greeting},</p>
      <p style="margin:0 0 12px;">You have received a ${title} payment invitation. Use the onboarding link below to get started, then use your token to continue the test flow.</p>
      ${onboardingButton}
      <p style="margin:0 0 20px;padding:12px 16px;border-radius:12px;background:#f3f4f6;font-size:18px;font-weight:700;letter-spacing:.04em;">${token}</p>
      <p style="margin:0 0 12px;"><a href="${verifyUrl}" style="display:inline-block;padding:12px 16px;border-radius:12px;background:#2563eb;color:#fff;text-decoration:none;font-weight:600;">Open verification page</a></p>
      ${onboardingText}
      <p style="margin:12px 0 0;color:#6b7280;font-size:14px;">If the button does not work, paste this URL into the browser:</p>
      <p style="margin:8px 0 0;color:#374151;font-size:14px;word-break:break-all;">${verifyUrl}</p>
    </div>
  `;
}

async function sendBrevoEmail(env, payload, sandbox) {
  const headers = {
    accept: 'application/json',
    'content-type': 'application/json',
    'api-key': env.BREVO_API_KEY
  };
  if (sandbox) headers['X-Sib-Sandbox'] = 'drop';

  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers,
    body: JSON.stringify(payload)
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || 'Brevo send failed.');
  }
  return data;
}

function canSendBrevo(env) {
  return !!(env.BREVO_API_KEY && env.EMAIL_FROM);
}

async function handleSendToken(request, env) {
  const payload = await readJson(request);
  const flow = getFlow(payload);
  const email = normalizeEmail(payload.email);
  const recipientName = String(payload.recipientName || '').trim();
  const sandbox = payload.sandbox === true || payload.sandbox === 'true' || String(env.BREVO_SANDBOX_DEFAULT || '').toLowerCase() === 'true';
  const verifyBaseUrl = String(payload.verifyBaseUrl || '').trim() || String(env.APP_BASE_URL || '').trim();

  if (!flow) return json({ ok: false, error: 'Flow must be "sd" or "sx".' }, 400);
  if (!email) return json({ ok: false, error: 'Email is required.' }, 400);
  if (!verifyBaseUrl) return json({ ok: false, error: 'APP_BASE_URL or verifyBaseUrl is required.' }, 400);
  if (!env.TOKEN_STORE) {
    return json({ ok: false, error: 'TOKEN_STORE KV binding is missing.' }, 500);
  }
  if (!isAllowedEmail(env, email)) {
    return json({ ok: false, error: 'This email is not allowed for test sending.' }, 403);
  }

  const token = createToken();
  const tokenHash = await sha256(token);
  const now = Date.now();
  const ttlMinutes = Number(env.TOKEN_TTL_MINUTES || 15);
  const expiresAt = new Date(now + ttlMinutes * 60 * 1000).toISOString();
  const verifyUrl = verifyBaseUrl.replace(/\/+$/, '') + '?flow=' + flow + '&token=' + encodeURIComponent(token);
  const onboardingUrl = buildOnboardingUrl(verifyBaseUrl, flow, email);

  await env.TOKEN_STORE.put(
    'token:' + tokenHash,
    JSON.stringify({
      flow,
      email,
      recipientName,
      createdAt: new Date(now).toISOString(),
      expiresAt,
      usedAt: null
    }),
    {
      expirationTtl: ttlMinutes * 60
    }
  );

  const subject = '[' + FLOW_LABELS[flow] + '] Test token';
  const htmlContent = buildEmailHtml({ flow, token, verifyUrl, onboardingUrl, recipientName, email });
  const textContent =
    'Hi ' + getRecipientGreeting(recipientName, email) + ',\n\n' +
    'You have received a ' + FLOW_LABELS[flow] + ' payment invitation.\n' +
    (onboardingUrl ? ('Start onboarding: ' + onboardingUrl + '\n') : '') +
    'Token: ' + token + '\n' +
    'Verify: ' + verifyUrl + '\n';

  const emailDeliveryEnabled = canSendBrevo(env);
  if (!sandbox && !emailDeliveryEnabled) {
    return json({ ok: false, error: 'Worker email secrets are missing.' }, 500);
  }

  if (emailDeliveryEnabled) {
    await sendBrevoEmail(env, {
      sender: {
        email: env.EMAIL_FROM,
        name: env.EMAIL_FROM_NAME || 'SMART Exchange Test'
      },
      to: [
        {
          email,
          name: recipientName || email
        }
      ],
      subject,
      htmlContent,
      textContent
    }, sandbox);
  }

  return json({
    ok: true,
    flow,
    email,
    mode: sandbox ? 'sandbox' : 'live',
    previewUrl: verifyUrl,
    delivery: emailDeliveryEnabled ? 'brevo' : 'preview_only'
  });
}

async function handleVerifyToken(request, env) {
  const payload = await readJson(request);
  const flow = getFlow(payload);
  const token = String(payload.token || '').trim();

  if (!flow) return json({ ok: false, error: 'Flow must be "sd" or "sx".' }, 400);
  if (!token) return json({ ok: false, error: 'Token is required.' }, 400);
  if (!env.TOKEN_STORE) {
    return json({ ok: false, error: 'TOKEN_STORE KV binding is missing.' }, 500);
  }

  const tokenHash = await sha256(token);
  const raw = await env.TOKEN_STORE.get('token:' + tokenHash);
  if (!raw) return json({ ok: false, error: 'Token not found or expired.' }, 404);

  const record = JSON.parse(raw);
  if (record.flow !== flow) {
    return json({ ok: false, error: 'Token flow does not match.' }, 400);
  }
  if (record.usedAt) {
    return json({ ok: false, error: 'Token has already been used.' }, 409);
  }
  if (record.expiresAt && Date.parse(record.expiresAt) < Date.now()) {
    return json({ ok: false, error: 'Token has expired.' }, 410);
  }

  record.usedAt = new Date().toISOString();
  await env.TOKEN_STORE.put('token:' + tokenHash, JSON.stringify(record), {
    expirationTtl: Math.max(60, Math.ceil((Date.parse(record.expiresAt) - Date.now()) / 1000))
  });

  return json({
    ok: true,
    flow: record.flow,
    email: record.email,
    expiresAt: record.expiresAt,
    usedAt: record.usedAt
  });
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return withCors(new Response(null, { status: 204 }), request, env);
    }

    const url = new URL(request.url);
    let response;

    try {
      if (request.method === 'GET' && url.pathname === '/health') {
        response = json({ ok: true, service: 'sd-sx-token-service' });
      } else if (request.method === 'POST' && url.pathname === '/send-test-token') {
        response = await handleSendToken(request, env);
      } else if (request.method === 'POST' && url.pathname === '/verify-test-token') {
        response = await handleVerifyToken(request, env);
      } else {
        response = json({ ok: false, error: 'Not found.' }, 404);
      }
    } catch (error) {
      response = json({ ok: false, error: error.message || 'Unexpected error.' }, 500);
    }

    return withCors(response, request, env);
  }
};
