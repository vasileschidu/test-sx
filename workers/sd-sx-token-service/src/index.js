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

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatDisplayDate(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const normalized = /^\d{4}-\d{2}-\d{2}$/.test(raw) ? `${raw}T00:00:00` : raw;
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return raw;
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  }).format(date);
}

function buildOnboardingUrl(baseUrl, flow, email, extraParams) {
  const rawBaseUrl = String(baseUrl || '').trim();
  if (!rawBaseUrl) return '';

  // Both flows were merged into src/pages/onboarding/; onboarding-sd/ no longer
  // exists, so a link built against it 404s. `flow` still rides along as a
  // query parameter for anything that wants to branch on it.
  const onboardingFolder = 'onboarding';

  try {
    const url = new URL(rawBaseUrl);
    if (/\/src\/pages\/tools\/[^/]+$/i.test(url.pathname)) {
      url.pathname = url.pathname.replace(/\/src\/pages\/tools\/[^/]+$/i, `/src/pages/${onboardingFolder}/index.html`);
    } else if (/\/src\/pages\/onboarding(?:-sd)?\/[^/]+$/i.test(url.pathname)) {
      url.pathname = url.pathname.replace(/\/src\/pages\/onboarding(?:-sd)?\/[^/]+$/i, `/src/pages/${onboardingFolder}/index.html`);
    } else {
      url.pathname = url.pathname.replace(/\/+$/, '') + `/src/pages/${onboardingFolder}/index.html`;
    }
    url.search = '';
    url.searchParams.set('flow', flow);
    if (email) url.searchParams.set('email', email);
    Object.entries(extraParams || {}).forEach(([key, value]) => {
      if (value === undefined || value === null || String(value).trim() === '') return;
      url.searchParams.set(key, String(value).trim());
    });
    return url.toString();
  } catch (error) {
    return '';
  }
}

function buildEmailHtml({
  flow,
  token,
  verifyUrl,
  onboardingUrl,
  recipientName,
  email,
  senderName,
  supportEmail,
  supportPhone,
  paymentAmountFormatted,
  paymentDate,
  paymentDateFormatted,
  tokenExpiresAtFormatted,
  paymentReference,
  payableId,
  payeeName
}) {
  const title = FLOW_LABELS[flow] || flow.toUpperCase();
  const greeting = getRecipientGreeting(recipientName, email);
  const safeTitle = escapeHtml(title);
  const safeGreeting = escapeHtml(greeting);
  const safeSenderName = escapeHtml(senderName || 'SMART Hub');
  const safeToken = escapeHtml(token);
  const safeOnboardingUrl = escapeHtml(onboardingUrl);
  const amount = escapeHtml(paymentAmountFormatted || '');
  const displayDate = escapeHtml(paymentDateFormatted || formatDisplayDate(paymentDate || ''));
  const tokenExpiry = escapeHtml(tokenExpiresAtFormatted || '');
  const referenceId = escapeHtml(paymentReference || payableId || '');
  const safePayeeName = escapeHtml(payeeName || recipientName || '');
  const safeSupportEmail = escapeHtml(supportEmail || '');
  const safeSupportPhone = escapeHtml(supportPhone || '');
  const emailFontStack = "Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif";
  const detailsRows = [
    amount ? ['Amount', amount] : null,
    displayDate ? ['Payment date', displayDate] : null,
    safeTitle ? ['Payment type', safeTitle] : null,
    referenceId ? ['Reference ID', referenceId] : null,
    safePayeeName ? ['Recipient', safePayeeName] : null
  ].filter(Boolean).map(([label, value]) => `
                            <tr>
                              <td style="padding:6px 20px;font-family:${emailFontStack};font-size:14px;line-height:20px;color:#6b7280;">
                                ${label}
                              </td>
                              <td style="padding:6px 20px;font-family:${emailFontStack};font-size:14px;line-height:20px;font-weight:600;color:#111827;" align="right">
                                ${value}
                              </td>
                            </tr>
                          `).join('');
  const supportParts = [];
  const defaultSupportEmail = 'support@smarthub.test';
  if (safeSupportEmail) supportParts.push(`<a href="mailto:${safeSupportEmail}" style="color:#2563eb;text-decoration:none;">${safeSupportEmail}</a>`);
  if (safeSupportPhone) supportParts.push(`<span style="color:#111827;">${safeSupportPhone}</span>`);
  const supportLine = supportParts.length
    ? `Need help? Contact ${supportParts.join(' or ')}.`
    : `Need help? Contact <a href="mailto:${defaultSupportEmail}" style="color:#2563eb;text-decoration:none;">${defaultSupportEmail}</a>.`;
  return `
    <!doctype html>
    <html lang="en">
      <body style="margin:0;padding:0;background-color:#f3f6fb;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#f3f6fb;">
          <tr>
            <td align="center" style="padding:24px 16px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:600px;">
                <tr>
                  <td align="center" style="padding:0 0 24px 0;">
                    <img src="https://vasileschidu.github.io/test-sx/src/assets/illustrations/smart-disburse-logo.svg" alt="SMART Disburse" width="164" style="display:block;width:164px;max-width:100%;height:auto;border:0;margin:0 auto;" />
                  </td>
                </tr>
                <tr>
                  <td style="border-radius:12px;background:linear-gradient(180deg,#f8fbff 0%,#ffffff 100%);border:1px solid #dbe6f3;padding:32px 24px 24px 24px;">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                      <tr>
                        <td style="padding:0 0 8px 0;font-family:${emailFontStack};font-size:11px;line-height:16px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#2563eb;">
                          Test mode
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:0 0 8px 0;font-family:${emailFontStack};font-size:28px;line-height:34px;font-weight:700;color:#111827;">
                          ${safeSenderName} sent you a payment
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:0 0 2px 0;font-family:${emailFontStack};font-size:14px;line-height:22px;color:#4b5563;">
                          Hi ${safeGreeting},
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:0 0 24px 0;font-family:${emailFontStack};font-size:14px;line-height:22px;color:#4b5563;">
                          ${amount ? `You’ve received ${amount} from ${safeSenderName}.` : `You’ve received a ${safeTitle} payment.`}<br />
                          Open the secure ${safeTitle} link below to receive it.
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:0 0 24px 0;">
                          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-radius:10px;background-color:#f9fafb;border:1px solid #e5e7eb;">
                            <tr>
                              <td style="padding:20px 20px 8px 20px;font-family:${emailFontStack};font-size:14px;line-height:20px;font-weight:700;color:#2563eb;">
                                Payment delivery
                              </td>
                            </tr>
                            <tr>
                              <td style="padding:0 20px 8px 20px;font-family:${emailFontStack};font-size:28px;line-height:34px;font-weight:700;color:#111827;">
                                ${amount || `You’ve received a ${safeTitle} payment.`}
                              </td>
                            </tr>
                            <tr>
                              <td style="padding:0 20px 20px 20px;font-family:${emailFontStack};font-size:13px;line-height:20px;font-weight:500;color:#4b5563;">
                                ${tokenExpiry ? `Payment token expires ${tokenExpiry}.` : `Use the secure ${safeTitle} link to continue.`}
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:0 0 12px 0;">
                          <a href="${safeOnboardingUrl}" target="_blank" rel="noreferrer noopener" style="display:block;width:100%;box-sizing:border-box;padding:14px 20px;border-radius:10px;background:#2563eb;color:#ffffff;font-family:${emailFontStack};font-size:15px;font-weight:700;line-height:15px;text-align:center;text-decoration:none;">Open payment</a>
                        </td>
                      </tr>
                      <tr>
                        <td align="center" style="padding:0 0 0 0;font-family:${emailFontStack};font-size:14px;line-height:22px;color:#4b5563;">
                          Your payment is being processed securely through SMART Hub.
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding:24px 0 0 0;">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:separate;border-spacing:0;border:1px solid #e5e7eb;border-radius:10px;background-color:#ffffff;">
                      <tr>
                        <td colspan="2" style="padding:20px 24px 12px 24px;font-family:${emailFontStack};font-size:14px;line-height:20px;font-weight:700;color:#111827;">
                          Payment details
                        </td>
                      </tr>
                      <tr>
	                        <td colspan="2" style="padding:8px 20px 8px 20px;">
	                          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:separate;border-spacing:0;border:1px solid #e5e7eb;border-radius:10px;background-color:#f9fafb;">
	                            <tr>
	                              <td colspan="2" style="padding:4px 0;font-size:0;line-height:0;">&nbsp;</td>
	                            </tr>
	                            ${detailsRows}
	                            <tr>
	                              <td style="padding:6px 20px;font-family:${emailFontStack};font-size:14px;line-height:20px;color:#6b7280;">
	                                Payment token
	                              </td>
                              <td style="padding:6px 20px;font-family:${emailFontStack};font-size:14px;line-height:20px;font-weight:700;color:#111827;" align="right">
	                                ${safeToken}
	                              </td>
	                            </tr>
	                            <tr>
	                              <td colspan="2" style="padding:4px 0;font-size:0;line-height:0;">&nbsp;</td>
	                            </tr>
	                          </table>
	                        </td>
	                      </tr>
                      <tr>
                        <td colspan="2" style="padding:16px 24px 0 24px;font-family:${emailFontStack};font-size:14px;line-height:22px;color:#4b5563;">
                          ${supportLine}
                        </td>
                      </tr>
                      <tr>
                        <td colspan="2" style="padding:8px 24px 0 24px;font-family:${emailFontStack};font-size:13px;line-height:20px;color:#6b7280;word-break:break-all;">
                          If the button does not open, copy and paste this link into your browser:<br />
                          <span style="color:#2563eb;">${safeOnboardingUrl}</span>
                        </td>
                      </tr>
                      <tr>
                        <td colspan="2" style="padding:24px 24px 24px 24px;">
                          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                            <tr>
                              <td style="padding:0 0 16px 0;border-top:1px solid #e5e7eb;font-size:0;line-height:0;">&nbsp;</td>
                            </tr>
                          </table>
                          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                            <tr>
                              <td align="center" style="font-family:${emailFontStack};font-size:12px;line-height:18px;color:#6b7280;">
                                <span style="display:inline-block;vertical-align:middle;margin-right:6px;">
                                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 18 18" fill="none">
                                    <path d="M8.91309 1.125C11.4548 3.2985 15.5771 3.43066 15.5771 3.43066V9.22656C15.5767 12.7831 8.91309 16.875 8.91309 16.875C8.86421 16.8449 2.25042 12.77 2.25 9.22656V3.43066C2.25 3.43066 6.37134 3.29832 8.91309 1.125ZM7.2793 9.90918C7.2091 9.94947 7.16702 10.0229 7.16699 10.1035V12.5801C7.16699 12.6002 7.17163 12.6209 7.18164 12.6377C7.21173 12.6914 7.28048 12.708 7.33398 12.6777L11.2783 10.3828C11.3134 10.3627 11.3352 10.3254 11.3369 10.2852V7.54785L7.2793 9.90918ZM7.33398 5.21191C7.28052 5.18171 7.21343 5.19831 7.18164 5.25195C7.17161 5.26875 7.16699 5.28942 7.16699 5.30957V7.78613C7.16699 7.86667 7.2082 7.94112 7.27832 7.98145L8.46582 8.6709L10.8701 7.27051L7.33398 5.21191Z" fill="#0089CF"/>
                                  </svg>
                                </span>
                                Powered by <span style="font-weight:700;color:#374151;">Transcard</span>
                                <span style="margin:0 6px;">|</span>
                                <a href="#" style="color:#6b7280;text-decoration:none;">Terms of Use</a>
                                <span style="margin:0 4px;">&bull;</span>
                                <a href="#" style="color:#6b7280;text-decoration:none;">Privacy Policy</a>
                                <span style="margin:0 4px;">&bull;</span>
                                <a href="#" style="color:#6b7280;text-decoration:none;">E-Sign Consent</a>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
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

function buildPreviewEmailRequest(url, env) {
  const flow = getFlow({ flow: url.searchParams.get('flow') }) || 'sd';
  const email = normalizeEmail(url.searchParams.get('email')) || 'michelle@example.com';
  const recipientName = String(url.searchParams.get('name') || 'Michelle').trim();
  const previewBaseUrl = String(env.APP_BASE_URL || '').trim() || 'http://127.0.0.1:5500/src/pages/tools/sd-sx-token-test.html';
  const token = String(url.searchParams.get('token') || 'abc123TESTtoken').trim();
  const onboardingUrl = buildOnboardingUrl(previewBaseUrl, flow, email, {
    payableId: String(url.searchParams.get('payableId') || '').trim(),
    payeeId: String(url.searchParams.get('payeeId') || '').trim(),
    bill: String(url.searchParams.get('bill') || '').trim(),
    sender: String(url.searchParams.get('sender') || 'ABC Corporation Ltd.').trim()
  });
  return {
    flow,
    email,
    recipientName,
    token,
    verifyUrl: '',
    onboardingUrl,
    senderName: String(url.searchParams.get('sender') || 'ABC Corporation Ltd.').trim(),
    paymentAmountFormatted: String(url.searchParams.get('amount') || '$10,000.00').trim(),
    paymentDateFormatted: String(url.searchParams.get('date') || 'April 19, 2026').trim(),
    tokenExpiresAtFormatted: String(url.searchParams.get('expires') || 'April 19, 2026 at 11:59 PM').trim(),
    paymentReference: String(url.searchParams.get('reference') || 'BP-01138').trim(),
    payeeName: recipientName,
    supportEmail: String(url.searchParams.get('supportEmail') || 'support@smarthub.test').trim(),
    supportPhone: String(url.searchParams.get('supportPhone') || '+1 415-555-0199').trim()
  };
}

async function handleSendToken(request, env) {
  const payload = await readJson(request);
  const flow = getFlow(payload);
  const email = normalizeEmail(payload.email);
  const recipientName = String(payload.recipientName || '').trim();
  const sandbox = payload.sandbox === true || payload.sandbox === 'true' || String(env.BREVO_SANDBOX_DEFAULT || '').toLowerCase() === 'true';
  const verifyBaseUrl = String(payload.verifyBaseUrl || '').trim() || String(env.APP_BASE_URL || '').trim();
  const senderName = String(payload.senderName || 'SMART Hub').trim();
  const supportEmail = String(payload.supportEmail || '').trim();
  const supportPhone = String(payload.supportPhone || '').trim();
  const paymentAmountFormatted = String(payload.paymentAmountFormatted || '').trim();
  const paymentDate = String(payload.paymentDate || '').trim();
  const paymentDateFormatted = String(payload.paymentDateFormatted || formatDisplayDate(paymentDate)).trim();
  const paymentReference = String(payload.paymentReference || '').trim();
  const payableId = String(payload.payableId || '').trim();
  const payeeId = String(payload.payeeId || '').trim();
  const payeeName = String(payload.payeeName || recipientName || '').trim();

  if (!flow) return json({ ok: false, error: 'Flow must be "sd" or "sx".' }, 400);
  if (!email) return json({ ok: false, error: 'Email is required.' }, 400);
  if (!verifyBaseUrl) return json({ ok: false, error: 'APP_BASE_URL or verifyBaseUrl is required.' }, 400);
  if (!env.TOKEN_STORE) {
    return json({ ok: false, error: 'TOKEN_STORE KV binding is missing.' }, 500);
  }
  if (sandbox && !isAllowedEmail(env, email)) {
    return json({ ok: false, error: 'This email is not allowed for test sending.' }, 403);
  }

  const token = createToken();
  const tokenHash = await sha256(token);
  const now = Date.now();
  const ttlMinutes = Number(env.TOKEN_TTL_MINUTES || 15);
  const expiresAt = new Date(now + ttlMinutes * 60 * 1000).toISOString();
  const tokenExpiresAtFormatted = new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  }).format(new Date(expiresAt));
  const onboardingUrl = buildOnboardingUrl(verifyBaseUrl, flow, email, {
    payableId,
    payeeId,
    bill: paymentReference,
    sender: senderName
  });

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

  const subject = 'SMART Hub: Your ' + FLOW_LABELS[flow] + ' payment link';
  const htmlContent = buildEmailHtml({
    flow,
    token,
    verifyUrl: '',
    onboardingUrl,
    recipientName,
    email,
    senderName,
    supportEmail,
    supportPhone,
    paymentAmountFormatted,
    paymentDate,
    paymentDateFormatted,
    tokenExpiresAtFormatted,
    paymentReference,
    payableId,
    payeeName
  });
  const textContent =
    'Hi ' + getRecipientGreeting(recipientName, email) + ',\n\n' +
    senderName + ' sent you a payment.\n' +
    (paymentAmountFormatted ? ('Amount: ' + paymentAmountFormatted + '\n') : '') +
    (paymentDateFormatted ? ('Payment date: ' + paymentDateFormatted + '\n') : '') +
    'Payment type: ' + FLOW_LABELS[flow] + '\n' +
    (paymentReference ? ('Reference ID: ' + paymentReference + '\n') : '') +
    'Payment token: ' + token + '\n' +
    'Open payment: ' + onboardingUrl + '\n' +
    (supportEmail || supportPhone ? ('Support: ' + [supportEmail, supportPhone].filter(Boolean).join(' | ') + '\n') : '') +
    '\nPowered by Transcard\n';

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
    previewUrl: onboardingUrl,
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
      } else if (request.method === 'GET' && url.pathname === '/preview-email') {
        response = new Response(buildEmailHtml(buildPreviewEmailRequest(url, env)), {
          status: 200,
          headers: {
            'content-type': 'text/html; charset=utf-8'
          }
        });
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
