# SMART Exchange

Static HTML prototype for the SMART Exchange payment platform, including a multi-step vendor onboarding flow and a dashboard with sidebar navigation and payments table.

## Tech Stack

- **Tailwind CSS v4** via CDN browser mode (`@tailwindcss/browser@4`)
- **Tailwind Plus Elements** for dialog and dropdown web components (`el-dialog`, `el-dropdown`)
- **Inter** font from Google Fonts
- **Vanilla JavaScript** (no frameworks, no build step)
- Deployed on **GitHub Pages** from the repository root

## Project Structure

```
/
├── index.html                              # Entry point with navigation links
├── .nojekyll                               # Disable Jekyll for GitHub Pages
├── .gitignore
├── tailwind.config.js                      # Tailwind content paths
├── README.md
│
├── assets/
│   ├── img/
│   │   ├── smart-hub.svg                   # Full SMART Hub logo
│   │   └── smart-hub-mark.svg             # Compact logo mark
│   └── icons/
│       ├── box-package.svg
│       ├── building-office-user.svg
│       ├── credit-card-sparkle.svg
│       ├── payables.svg
│       └── receivables.svg
│
└── src/
    ├── scripts/
    │   ├── sidebar.js                      # Dashboard sidebar & table row logic
    │   ├── confirm-identity.js             # Step 1: identity verification
    │   ├── confirm-business-details.js     # Step 2: TIN toggle
    │   ├── review-documents.js             # Step 3: document review workflow
    │   └── signature.js                    # Step 4: draw/type signature
    │
    ├── styles/
    │   └── global.css                      # Tailwind directives (base build entry)
    │
    └── pages/
        ├── onboarding/
        │   ├── index.html                  # Welcome / landing page
        │   ├── confirm-identity.html       # Step 1
        │   ├── confirm-business-details.html # Step 2
        │   ├── review-documents.html       # Step 3
        │   ├── signature.html              # Step 4
        │   ├── paywall.html                # Step 5: payment confirmation
        │   └── sample-lorem.pdf            # Sample PDF for document review
        │
        └── dashboard/
            └── smart-exchange.html         # Main dashboard
```

## Pages

### Onboarding Flow

A multi-step wizard that guides vendors through payment collection setup:

1. **Confirm Identity** — Enter invoice number and vendor ID (auto-uppercased)
2. **Confirm Business Details** — Review business info on file, toggle TIN visibility
3. **Review Documents** — Read required documents in a modal PDF viewer
4. **Provide Signature** — Draw freehand or type name in cursive
5. **Confirm Payment** — Review pricing and complete enrollment

### Dashboard

The SMART Exchange dashboard features:

- Collapsible desktop sidebar with smooth transitions
- Floating nav tooltips when sidebar is collapsed
- Submenu expand/collapse animations
- Payments table with sortable headers and expandable detail rows
- Mobile-responsive off-canvas sidebar drawer

## Development

No build step is required. Open any HTML file directly in a browser, or serve from a local server:

```bash
# Using Python
python3 -m http.server 8080

# Using Node.js (npx)
npx serve .
```

Then visit `http://localhost:8080`.

## Deployment

The project is configured for GitHub Pages:

1. Repository Settings → Pages
2. Source: **Deploy from a branch**
3. Branch: `main`, folder: `/ (root)`

**Live URLs:**

- Entry: `https://vasileschidu.github.io/test-sx/`
- Onboarding: `https://vasileschidu.github.io/test-sx/src/pages/onboarding/index.html`
- Dashboard: `https://vasileschidu.github.io/test-sx/src/pages/dashboard/smart-exchange.html`

## Conventions

- **Zero custom CSS** — all styling uses Tailwind utility classes exclusively
- **No `<style>` tags**, no `style=""` attributes, no `.css` files (except the Tailwind entry)
- **No `@apply`** — utility classes are applied directly in HTML
- **All JavaScript** is in dedicated files under `src/scripts/` with JSDoc on every function
- **Every HTML file** has a file-level comment describing its purpose
