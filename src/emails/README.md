# Invitation emails (User Management) — setup

The prototype is static (GitHub Pages), so invitations are sent from the browser with
[EmailJS](https://www.emailjs.com/). Until this is set up, `enabled` is `false` and every invite
falls back to the **share the link** box (copy link / "Open in email app") in the Invitation
Sent dialog. The whole flow, including `src/pages/invite/accept.html`, works that way.

Turning sending on needs **no code change**: fill in `src/data/email-config.json`.

## Steps (Vasile)
1. Create an EmailJS account (free tier: 200 emails / month).
2. **Email Services** → *Add New Service* → connect the sending mailbox (e.g. Gmail / Outlook of a
   shared `@agilepartners.eu` address). Copy the **Service ID**.
3. **Email Templates** → *Create New Template*:
   - *To Email*: `{{to_email}}` · *Subject*: `{{inviter_name}} invited you to {{business_name}} on SMART Hub`
   - *Content*: switch to the code editor and paste `src/emails/invite.html` (everything from `<!doctype html>`).
   - Copy the **Template ID**.
4. **Account → General**: copy the **Public Key**. It is meant to be public (it only allows
   sending with your templates). Never put the private key in the repo.
5. **Account → Security**: restrict allowed origins to `https://vasileschidu.github.io`,
   `http://127.0.0.1:8899` and `http://localhost:8899`.
6. Edit `src/data/email-config.json`:
   ```json
   {
     "enabled": true,
     "provider": "emailjs",
     "serviceId": "service_xxxxxxx",
     "templateId": "template_xxxxxxx",
     "publicKey": "xxxxxxxxxxxxxxxx",
     "allowedDomains": ["agilepartners.eu"],
     "maxPerMinute": 5
   }
   ```
7. Test: invite an `@agilepartners.eu` address from SMART Hub › Settings › User Management.

## Config fields
| Field | Meaning |
|---|---|
| `enabled` | `false` = never send, always show the link box |
| `serviceId`, `templateId`, `publicKey` | from EmailJS (steps 2–4); all three are needed |
| `allowedDomains` | only these domains get a real email; others get the link box ("demo allows only …") |
| `maxPerMinute` | send limit per browser (default 5) |

## How it works (code)
- `src/scripts/um-email.js` — `UMEmail.sendInvite(invitation)` → `{ sent, link, reason }`. Lazy-loads
  `@emailjs/browser@5.0.3` from jsDelivr only when sending is enabled. Reasons for not sending:
  `disabled`, `domain`, `rate`, `load`, `error`.
- The link is `<site>/src/pages/invite/accept.html?inv=<base64url JSON>`; the invite data travels in
  the link, so it opens on any device.
- Template variables: `to_name`, `to_email`, `inviter_name`, `business_name`, `message`,
  `role_names`, `accept_link`, `expires_on`.
- The logo in the template is an absolute GitHub Pages URL; change it if the repo moves.
