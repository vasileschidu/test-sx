# GitHub Pages SD / SX Token Testing

This repo now includes a GitHub Pages friendly token test flow:

- Public test page: `src/pages/tools/sd-sx-token-test.html`
- Worker backend: `workers/sd-sx-token-service`
- Public runtime config: `src/data/public-runtime-config.json`

The browser stays static on GitHub Pages. The Cloudflare Worker handles:

1. token generation
2. token storage in Workers KV
3. email delivery through Brevo
4. token verification

## How it works

1. A tester opens the GitHub Pages test page.
2. The page sends `flow` + `email` to the Worker.
3. The Worker creates a short-lived token and stores it in KV.
4. The Worker sends the token email through Brevo.
5. The email link points back to the GitHub Pages test page with `?flow=...&token=...`.
6. The test page sends the token back to the Worker for verification.
7. The Worker validates the token and marks it used.

## Step 1: Deploy the frontend to GitHub Pages

1. Push this repo to GitHub.
2. Open the repo on GitHub.
3. Click `Settings`.
4. In the left sidebar, click `Pages`.
5. Under `Build and deployment`, set:
   - `Source`: `Deploy from a branch`
   - `Branch`: `main`
   - `Folder`: `/ (root)`
6. Click `Save`.
7. Wait for the Pages URL to appear.

Example result:

`https://YOUR_GITHUB_USERNAME.github.io/YOUR_REPO_NAME/`

Your public token test page will be:

`https://YOUR_GITHUB_USERNAME.github.io/YOUR_REPO_NAME/src/pages/tools/sd-sx-token-test.html`

## Step 2: Let Wrangler create the KV store automatically

You do not need to manually create KV namespaces anymore.

`workers/sd-sx-token-service/wrangler.jsonc` already declares the binding:

```jsonc
{
  "kv_namespaces": [
    {
      "binding": "TOKEN_STORE"
    }
  ]
}
```

When you run `wrangler deploy`, Wrangler will prompt you to create the missing KV resource and bind it to `TOKEN_STORE`.

What to click:

1. Open Terminal.
2. Run:

```bash
cd workers/sd-sx-token-service
npm install
npx wrangler login
```

3. A browser window will open for Cloudflare login.
4. Sign in to your Cloudflare account.
5. Return to Terminal and run:

```bash
npm run deploy
```

6. Wrangler will detect that `TOKEN_STORE` does not exist yet.
7. When prompted to create or provision the KV namespace, confirm with `Yes`.
8. Wrangler will create the KV namespace and wire it into the Worker config for you.

If Wrangler does not prompt automatically, then do the fallback path:

```bash
npx wrangler kv namespace create TOKEN_STORE
npx wrangler kv namespace create TOKEN_STORE --preview
```

Then paste the returned IDs into `workers/sd-sx-token-service/wrangler.jsonc`.

## Step 3: Create a Brevo sender and API key

1. Sign in to Brevo.
2. Open `Settings > Senders, Domains, IPs > Senders`.
3. Click `Add a sender`.
4. Enter:
   - your sender name
   - your sender email
5. Save it.
6. If Brevo asks for verification, paste the code from that inbox.
7. Open `Settings > SMTP & API > API Keys & MCP`.
8. Click `Generate a new API key`.
9. Copy it once.

## Step 4: Configure Worker secrets

From the worker folder:

```bash
cd workers/sd-sx-token-service
npm install
```

Set the secrets:

```bash
npx wrangler secret put BREVO_API_KEY
npx wrangler secret put EMAIL_FROM
npx wrangler secret put EMAIL_FROM_NAME
npx wrangler secret put APP_BASE_URL
npx wrangler secret put ALLOWED_ORIGINS
npx wrangler secret put TEST_EMAIL_ALLOWLIST
npx wrangler secret put TOKEN_TTL_MINUTES
npx wrangler secret put BREVO_SANDBOX_DEFAULT
```

Suggested values:

- `EMAIL_FROM`: your verified sender email
- `EMAIL_FROM_NAME`: `SMART Exchange Test`
- `APP_BASE_URL`: your GitHub Pages test page URL without query params
- `ALLOWED_ORIGINS`: your local URL and GitHub Pages origin, comma-separated
- `TEST_EMAIL_ALLOWLIST`: one or more tester emails, comma-separated
- `TOKEN_TTL_MINUTES`: `15`
- `BREVO_SANDBOX_DEFAULT`: `true` for safe dry-runs, `false` for live sending

Example:

- `APP_BASE_URL`:
  `https://YOUR_GITHUB_USERNAME.github.io/YOUR_REPO_NAME/src/pages/tools/sd-sx-token-test.html`
- `ALLOWED_ORIGINS`:
  `http://localhost:8080,https://YOUR_GITHUB_USERNAME.github.io`
- `TEST_EMAIL_ALLOWLIST`:
  `your-email@example.com`

## Step 5: Run the Worker locally

Create a local env file:

```bash
cp .dev.vars.example .dev.vars
```

Edit `.dev.vars` with local values, then start the Worker:

```bash
npm run dev
```

Test health:

```bash
curl http://127.0.0.1:8787/health
```

## Step 6: Point the public test page to the Worker

Edit `src/data/public-runtime-config.json`.

For local testing:

```json
{
  "tokenServiceBaseUrl": "http://127.0.0.1:8787",
  "defaultTestRecipient": "your-email@example.com",
  "defaultFlow": "sd"
}
```

After deploying the Worker, replace the base URL with the Worker URL.

## Step 7: Deploy the Worker

From `workers/sd-sx-token-service`:

```bash
npm run deploy
```

Copy the deployed Worker URL, for example:

`https://sd-sx-token-service.YOUR_SUBDOMAIN.workers.dev`

Now update `src/data/public-runtime-config.json`:

```json
{
  "tokenServiceBaseUrl": "https://sd-sx-token-service.YOUR_SUBDOMAIN.workers.dev",
  "defaultTestRecipient": "your-email@example.com",
  "defaultFlow": "sd"
}
```

Commit and push that change so GitHub Pages uses the live Worker.

## Step 8: Test locally

1. Start a static server from repo root:

```bash
python3 -m http.server 8080
```

2. Open:

`http://localhost:8080/src/pages/tools/sd-sx-token-test.html`

3. Confirm the Worker URL is shown.
4. Choose `SMART Disburse` or `SMART Exchange`.
5. Enter one allowlisted email.
6. Click `Send test token`.
7. If sandbox mode is enabled, no real email is sent.
8. If live mode is enabled, open the inbox and click the email link.
9. On the test page, click `Verify token`.

## Step 9: Test on GitHub Pages

1. Open the GitHub Pages URL for the token test page.
2. Confirm the Worker URL is prefilled from `public-runtime-config.json`.
3. Send a test token to one allowlisted address.
4. Open the email.
5. Click the verification link.
6. The same GitHub Pages page will open with `flow` and `token` in the URL.
7. Click `Verify token`.

## Recommended safe rollout

Start with:

- `BREVO_SANDBOX_DEFAULT=true`
- one email in `TEST_EMAIL_ALLOWLIST`

That lets you test the full request path before sending real emails.

Then switch to:

- `BREVO_SANDBOX_DEFAULT=false`

only when you are ready to send real test emails.
