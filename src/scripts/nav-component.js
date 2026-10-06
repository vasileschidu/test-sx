/**
 * @file nav-component.js
 * @description <app-nav> web component — single source of truth for the dashboard sidebar.
 *
 * Renders:
 *   - Mobile off-canvas sidebar (<el-dialog>)
 *   - Desktop collapsible sidebar (#desktop-sidebar-shell)
 *   - Desktop sidebar collapse toggle button (#desktop-sidebar-toggle)
 *
 * Active-link detection: automatic via window.location.pathname — no hardcoded state in HTML.
 * No inline onclick attributes — event listeners are attached in connectedCallback.
 *
 * Data mirrors src/data/nav.json. Keep both in sync when adding nav items.
 *
 * Dependencies:
 *   sidebar.js must load AFTER this file (both use defer; script order determines execution order).
 *   toggleExpandableItem() and toggleSmartExchangeSubmenu() are globals from sidebar.js.
 */

/* ===== Nav Data (mirrors src/data/nav.json) ===== */

const APP_NAV_DATA = [
  {
    type: "link",
    id: "insights",
    label: "Insights",
    href: "#",
    icon: "insights",
  },
  { type: "divider" },
  {
    type: "link",
    id: "bills",
    label: "Bills/Payables",
    href: "bills-and-payables.html",
    icon: "bills",
  },
  {
    type: "link",
    id: "vendors",
    label: "Vendors",
    href: "vendors.html",
    icon: "vendors",
  },
  {
    type: "link",
    id: "card-manager",
    label: "Card Manager",
    href: "#",
    icon: "card-manager",
  },
  { type: "divider" },
  {
    type: "link",
    id: "invoices",
    label: "Invoices/Receivables",
    href: "#",
    icon: "invoices",
  },
  {
    type: "link",
    id: "customers",
    label: "Customers",
    href: "#",
    icon: "customers",
  },
  { type: "divider" },
  {
    type: "link",
    id: "configurator",
    label: "Configurator",
    href: "#",
    icon: "configurator",
  },
  { type: "divider" },
  {
    type: "smart-exchange",
    id: "smart-exchange",
    label: "Supplier Portal",
    href: "supplier-portal.html",
    icon: "smart-exchange",
    children: [
      {
        id: "payment-preferences",
        label: "Payment Preferences",
        href: "payment-preferences.html",
      },
    ],
  },
  { type: "divider" },
  {
    type: "link-arrow",
    id: "my-company-profile",
    label: "My Company Profile",
    href: "my-company-profile.html",
    icon: "my-company-profile",
  },
  {
    type: "expandable",
    id: "settings",
    label: "Settings",
    icon: "settings",
    children: [{ id: "user-management", label: "User Management", href: "#" }],
  },
  {
    type: "expandable",
    id: "transcard-only",
    label: "Transcard Only",
    icon: "transcard-only",
    children: [
      { id: "businesses", label: "Businesses", href: "#" },
      { id: "se-recipients", label: "Supplier Portal Recipients", href: "#" },
      { id: "tenants", label: "Tenants", href: "#" },
      { id: "connections", label: "Connections", href: "#" },
      { id: "connectors", label: "Connectors", href: "#" },
      { id: "integrations", label: "Integrations", href: "#" },
      { id: "message-templates", label: "Message Templates", href: "#" },
      { id: "statement-templates", label: "Statement Templates", href: "#" },
      { id: "reports", label: "Reports", href: "#" },
      {
        id: "payment-program-config",
        label: "Payment Program Configuration",
        href: "payment-program-configuration.html",
      },
    ],
  },
];

/** Maps page filenames to active nav-item IDs. */
const APP_NAV_PAGE_MAP = {
  "supplier-portal.html": "supplier-portal",
  "ap-ar-payments.html": "ap-ar",
  "bills-and-payables.html": "bills",
  "payables-pay.html": "bills",
  "vendors.html": "vendors",
  "vendor-profile.html": "vendors",
  "payment-preferences.html": "payment-preferences",
  "payment-program-configuration.html": "payment-program-config",
  "consumer-payments-received.html": "payments-received",
  "consumer-my-cards.html": "my-cards",
  "consumer-payment-preferences.html": "cp-payment-preferences",
  "consumer-my-profile.html": "my-profile",
  "my-company-profile.html": "my-company-profile",
};

const APP_NAV_REACT_ROUTE_MAP = {
  "supplier-portal.html": "#/smart-exchange",
  "bills-and-payables.html": "#/payables",
  "payables-pay.html": "#/payables",
  "vendors.html": "#/vendors",
  "vendor-profile.html": "#/vendors",
  "payment-preferences.html": "#/payment-preferences",
  "my-company-profile.html": "#/smart-exchange",
};

function getInitialSidebarCollapsed() {
  var collapsedAttr = document.documentElement.getAttribute(
    "data-sidebar-collapsed",
  );
  if (collapsedAttr === "true" || collapsedAttr === "false") {
    return collapsedAttr === "true";
  }

  try {
    return localStorage.getItem("dashboard-sidebar-collapsed-v1") === "true";
  } catch (error) {
    return false;
  }
}

/* ===== Icon Registry ===== */

const APP_NAV_ICONS = {
  "payments-received":
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true" class="{CLS}"><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m.75 12 3 3m0 0 3-3m-3 3v-6m-1.5-9H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" /></svg>',
  "payment-preferences":
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true" class="{CLS}"><path stroke-linecap="round" stroke-linejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 1 1-3 0m3 0a1.5 1.5 0 1 0-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-9.75 0h9.75" /></svg>',
  "my-profile":
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true" class="{CLS}"><path stroke-linecap="round" stroke-linejoin="round" d="M17.982 18.725A7.488 7.488 0 0 0 12 15.75a7.488 7.488 0 0 0-5.982 2.975m11.963 0a9 9 0 1 0-11.963 0m11.963 0A8.966 8.966 0 0 1 12 21a8.966 8.966 0 0 1-5.982-2.275M15 9.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /></svg>',
  insights:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true" class="{CLS}"><path d="M9.8132 15.9038L9 18.75L8.1868 15.9038C7.75968 14.4089 6.59112 13.2403 5.09619 12.8132L2.25 12L5.09619 11.1868C6.59113 10.7597 7.75968 9.59112 8.1868 8.09619L9 5.25L9.8132 8.09619C10.2403 9.59113 11.4089 10.7597 12.9038 11.1868L15.75 12L12.9038 12.8132C11.4089 13.2403 10.2403 14.4089 9.8132 15.9038Z" stroke-linecap="round" stroke-linejoin="round"/><path d="M18.2589 8.71454L18 9.75L17.7411 8.71454C17.4388 7.50533 16.4947 6.56117 15.2855 6.25887L14.25 6L15.2855 5.74113C16.4947 5.43883 17.4388 4.49467 17.7411 3.28546L18 2.25L18.2589 3.28546C18.5612 4.49467 19.5053 5.43883 20.7145 5.74113L21.75 6L20.7145 6.25887C19.5053 6.56117 18.5612 7.50533 18.2589 8.71454Z" stroke-linecap="round" stroke-linejoin="round"/><path d="M16.8942 20.5673L16.5 21.75L16.1058 20.5673C15.8818 19.8954 15.3546 19.3682 14.6827 19.1442L13.5 18.75L14.6827 18.3558C15.3546 18.1318 15.8818 17.6046 16.1058 16.9327L16.5 15.75L16.8942 16.9327C17.1182 17.6046 17.6454 18.1318 18.3173 18.3558L19.5 18.75L18.3173 19.1442C17.6454 19.3682 17.1182 19.8954 16.8942 20.5673Z" stroke-linecap="round" stroke-linejoin="round"/></svg>',

  bills:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true" class="{CLS}"><path d="M19 19C19 20.1046 18.1046 21 17 21H7C5.89543 21 5 20.1046 5 19V5C5 3.89543 5.89543 3 7 3H12.5858C12.851 3 13.1054 3.10536 13.2929 3.29289L18.7071 8.70711M10 13.8703H19M19 13.8703L16 16.8703M19 13.8703L16 10.8703" stroke-linecap="round" stroke-linejoin="round"/></svg>',

  vendors:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true" class="{CLS}"><path d="M8.25 18.75C8.25 19.5784 7.57843 20.25 6.75 20.25C5.92157 20.25 5.25 19.5784 5.25 18.75M8.25 18.75C8.25 17.9216 7.57843 17.25 6.75 17.25C5.92157 17.25 5.25 17.9216 5.25 18.75M8.25 18.75H14.25M5.25 18.75H3.375C2.75368 18.75 2.25 18.2463 2.25 17.625V14.2504M19.5 18.75C19.5 19.5784 18.8284 20.25 18 20.25C17.1716 20.25 16.5 19.5784 16.5 18.75M19.5 18.75C19.5 17.9216 18.8284 17.25 18 17.25C17.1716 17.25 16.5 17.9216 16.5 18.75M19.5 18.75L20.625 18.75C21.2463 18.75 21.7537 18.2457 21.7154 17.6256C21.5054 14.218 20.3473 11.0669 18.5016 8.43284C18.1394 7.91592 17.5529 7.60774 16.9227 7.57315H14.25M16.5 18.75H14.25M14.25 7.57315V6.61479C14.25 6.0473 13.8275 5.56721 13.263 5.50863C11.6153 5.33764 9.94291 5.25 8.25 5.25C6.55709 5.25 4.88466 5.33764 3.23698 5.50863C2.67252 5.56721 2.25 6.0473 2.25 6.61479V14.2504M14.25 7.57315V14.2504M14.25 18.75V14.2504M14.25 14.2504H2.25" stroke-linecap="round" stroke-linejoin="round"/></svg>',

  "card-manager":
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true" class="{CLS}"><path d="M2.25 8.25H21.75M2.25 9H21.75M5.25 14.25H11.25M5.25 16.5H8.25M21.75 11V6.75C21.75 5.50736 20.7426 4.5 19.5 4.5H4.5C3.25736 4.5 2.25 5.50736 2.25 6.75V17.25C2.25 18.4926 3.25736 19.5 4.5 19.5H14M19.5 19.75L19.8942 18.5673C20.1182 17.8954 20.6454 17.3682 21.3173 17.1442L22.5 16.75L21.3173 16.3558C20.6454 16.1318 20.1182 15.6046 19.8942 14.9327L19.5 13.75L19.1058 14.9327C18.8818 15.6046 18.3546 16.1318 17.6827 16.3558L16.5 16.75L17.6827 17.1442C18.3546 17.3682 18.8818 17.8954 19.1058 18.5673L19.5 19.75Z" stroke-linecap="round" stroke-linejoin="round"/></svg>',

  invoices:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true" class="{CLS}"><path d="M19 19C19 20.1046 18.1046 21 17 21H7C5.89543 21 5 20.1046 5 19V5C5 3.89543 5.89543 3 7 3H12.5858C12.851 3 13.1054 3.10536 13.2929 3.29289L18.7071 8.70711M21 13.8703H12M12 13.8703L15 10.8703M12 13.8703L15 16.8703" stroke-linecap="round" stroke-linejoin="round"/></svg>',

  customers:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true" class="{CLS}"><path d="M20.25 14.1499V18.4C20.25 19.4944 19.4631 20.4359 18.3782 20.58C16.2915 20.857 14.1624 21 12 21C9.83757 21 7.70854 20.857 5.62185 20.58C4.5369 20.4359 3.75 19.4944 3.75 18.4V14.1499M20.25 14.1499C20.7219 13.7476 21 13.1389 21 12.4889V8.70569C21 7.62475 20.2321 6.69082 19.1631 6.53086C18.0377 6.36247 16.8995 6.23315 15.75 6.14432M20.25 14.1499C20.0564 14.315 19.8302 14.4453 19.5771 14.5294C17.1953 15.3212 14.6477 15.75 12 15.75C9.35229 15.75 6.80469 15.3212 4.42289 14.5294C4.16984 14.4452 3.94361 14.3149 3.75 14.1499M3.75 14.1499C3.27808 13.7476 3 13.1389 3 12.4889V8.70569C3 7.62475 3.7679 6.69082 4.83694 6.53086C5.96233 6.36247 7.10049 6.23315 8.25 6.14432M15.75 6.14432V5.25C15.75 4.00736 14.7426 3 13.5 3H10.5C9.25736 3 8.25 4.00736 8.25 5.25V6.14432M15.75 6.14432C14.5126 6.0487 13.262 6 12 6C10.738 6 9.48744 6.0487 8.25 6.14432M12 12.75H12.0075V12.7575H12V12.75Z" stroke-linecap="round" stroke-linejoin="round"/></svg>',

  "smart-exchange":
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true" class="{CLS}"><path d="M16 9L12 11M16 9L8 5M16 9L20 7M16 9V14.2502M12 11L4 7M12 11V21M4 7L8 5M4 7V17L12 21M8 5L12 3L20 7M20 7V17L12 21M6.57555 15.1007C7.07025 15.3615 7.71135 15.7168 7.71135 15.7168" stroke-linecap="round"/></svg>',

  "my-company-profile":
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true" class="{CLS}"><path d="M1.75 20H5.875H6.90625M2.5 2H17.5M3.25 2V20M16.75 2V6.5V8.75M7 5.75H8.5M7 8.75H8.5M7 11.75H8.5M11.5 5.75H13M11.5 8.75H13M19.1554 21.6096C18.3185 20.5051 16.9926 19.7917 15.5 19.7917C14.0074 19.7917 12.6815 20.5051 11.8446 21.6096M19.1554 21.6096C20.2871 20.6022 21 19.1344 21 17.5C21 14.4624 18.5376 12 15.5 12C12.4624 12 10 14.4624 10 17.5C10 19.1344 10.7129 20.6022 11.8446 21.6096M19.1554 21.6096C18.1837 22.4745 16.9032 23 15.5 23C14.0968 23 12.8163 22.4745 11.8446 21.6096M17.3333 16.125C17.3333 17.1375 16.5125 17.9583 15.5 17.9583C14.4875 17.9583 13.6667 17.1375 13.6667 16.125C13.6667 15.1125 14.4875 14.2917 15.5 14.2917C16.5125 14.2917 17.3333 15.1125 17.3333 16.125Z" stroke-linecap="round" stroke-linejoin="round"/></svg>',

  configurator:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true" class="{CLS}"><path stroke-linecap="round" stroke-linejoin="round" d="M6 13.5V3.75m0 9.75a1.5 1.5 0 0 1 0 3m0-3a1.5 1.5 0 0 0 0 3m0 3.75V16.5m12-3V3.75m0 9.75a1.5 1.5 0 0 1 0 3m0-3a1.5 1.5 0 0 0 0 3m0 3.75V16.5m-6-9V3.75m0 3.75a1.5 1.5 0 0 1 0 3m0-3a1.5 1.5 0 0 0 0 3m0 9.75V10.5"/></svg>',

  settings:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true" class="{CLS}"><path d="M10.3426 3.94005C10.433 3.39759 10.9023 3 11.4523 3H12.5462C13.0962 3 13.5655 3.39759 13.6559 3.94005L13.8049 4.83386C13.8756 5.25813 14.1886 5.59838 14.5858 5.76332C14.9832 5.92832 15.4396 5.90629 15.7897 5.65617L16.5273 5.12933C16.9748 4.80969 17.5878 4.86042 17.9767 5.24929L18.7502 6.02284C19.1391 6.41171 19.1898 7.02472 18.8702 7.47223L18.3432 8.21007C18.0931 8.56012 18.0711 9.01633 18.236 9.41363C18.4009 9.81078 18.7411 10.1236 19.1652 10.1943L20.0592 10.3433C20.6017 10.4337 20.9993 10.9031 20.9993 11.453V12.547C20.9993 13.0969 20.6017 13.5663 20.0592 13.6567L19.1654 13.8056C18.7411 13.8764 18.4009 14.1893 18.236 14.5865C18.071 14.9839 18.093 15.4403 18.3431 15.7904L18.8698 16.5278C19.1895 16.9753 19.1388 17.5884 18.7499 17.9772L17.9763 18.7508C17.5875 19.1396 16.9745 19.1904 16.5269 18.8707L15.7893 18.3439C15.4393 18.0938 14.983 18.0718 14.5857 18.2367C14.1885 18.4016 13.8756 18.7418 13.8049 19.166L13.6559 20.0599C13.5655 20.6024 13.0962 21 12.5462 21H11.4523C10.9023 21 10.433 20.6024 10.3426 20.0599L10.1936 19.1661C10.1229 18.7419 9.80999 18.4016 9.41275 18.2367C9.01535 18.0717 8.55902 18.0937 8.20887 18.3438L7.47125 18.8707C7.02374 19.1904 6.41073 19.1396 6.02186 18.7507L5.24831 17.9772C4.85944 17.5883 4.80871 16.9753 5.12835 16.5278L5.65539 15.79C5.90543 15.4399 5.92747 14.9837 5.76252 14.5864C5.59764 14.1892 5.25746 13.8764 4.83329 13.8057L3.93932 13.6567C3.39686 13.5663 2.99927 13.0969 2.99927 12.547V11.453C2.99927 10.9031 3.39686 10.4337 3.93932 10.3433L4.83312 10.1944C5.2574 10.1236 5.59765 9.81071 5.76259 9.41347C5.92759 9.01605 5.90556 8.5597 5.65544 8.20954L5.12875 7.47216C4.8091 7.02465 4.85983 6.41164 5.2487 6.02277L6.02225 5.24922C6.41112 4.86036 7.02413 4.80962 7.47164 5.12927L8.20924 5.65613C8.55931 5.90618 9.01555 5.92822 9.41287 5.76326C9.81004 5.59837 10.1229 5.25819 10.1936 4.834L10.3426 3.94005Z" stroke-linecap="round" stroke-linejoin="round"/><path d="M15 12C15 13.6569 13.6568 15 12 15C10.3431 15 8.99997 13.6569 8.99997 12C8.99997 10.3432 10.3431 9.00002 12 9.00002C13.6568 9.00002 15 10.3432 15 12Z" stroke-linecap="round" stroke-linejoin="round"/></svg>',

  "transcard-only":
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true" class="{CLS}"><path d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" stroke-linecap="round" stroke-linejoin="round"/></svg>',
};

/* ===== Shared SVG Fragments ===== */

const SVG_CHEVRON_DOWN_TPL =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="chevron-icon size-5 transition-transform {ROT}"><path fill-rule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clip-rule="evenodd"/></svg>';

const SVG_CHEVRON_RIGHT =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="size-5 text-gray-400 dark:text-gray-500"><path fill-rule="evenodd" d="M8.22 5.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L11.94 10 8.22 6.28a.75.75 0 0 1 0-1.06Z" clip-rule="evenodd"/></svg>';

const SVG_ARROW_UP_RIGHT =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="chevron-icon size-5 text-gray-500 transition-transform dark:text-gray-400"><path fill-rule="evenodd" clip-rule="evenodd" d="M5.21967 14.7803C5.51256 15.0732 5.98744 15.0732 6.28033 14.7803L13.5 7.56066V13.25C13.5 13.6642 13.8358 14 14.25 14C14.6642 14 15 13.6642 15 13.25V5.75C15 5.33579 14.6642 5 14.25 5H6.75C6.33579 5 6 5.33579 6 5.75C6 6.16421 6.33579 6.5 6.75 6.5H12.4393L5.21967 13.7197C4.92678 14.0126 4.92678 14.4874 5.21967 14.7803Z"/></svg>';

const SVG_SIDEBAR_COLLAPSE =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="size-5"><path d="M3.5 4.75A.75.75 0 0 1 4.25 4h.01a.75.75 0 0 1 .75.75v10.5a.75.75 0 0 1-.75.75H4.25a.75.75 0 0 1-.75-.75V4.75Z"/><path fill-rule="evenodd" d="M11.78 5.22a.75.75 0 0 1 0 1.06L8.06 10l3.72 3.72a.75.75 0 1 1-1.06 1.06l-4.25-4.25a.75.75 0 0 1 0-1.06l4.25-4.25a.75.75 0 0 1 1.06 0Z" clip-rule="evenodd"/></svg>';

const SVG_SIDEBAR_EXPAND =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="size-5"><path d="M3.5 4.75A.75.75 0 0 1 4.25 4h.01a.75.75 0 0 1 .75.75v10.5a.75.75 0 0 1-.75.75H4.25a.75.75 0 0 1-.75-.75V4.75Z"/><path fill-rule="evenodd" d="M8.22 5.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 1 1-1.06-1.06L11.94 10 8.22 6.28a.75.75 0 0 1 0-1.06Z" clip-rule="evenodd"/></svg>';

/** Live sidebar counts. Bills comes from bills-payables.json (Ready to Pay). */
const NAV_LIVE_COUNTS = { bills: null };
const PAYABLE_OVERRIDES_KEY = "bp-row-overrides-v1";

function readPayableOverrides() {
  try {
    var parsed = JSON.parse(
      localStorage.getItem(PAYABLE_OVERRIDES_KEY) || "{}",
    );
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch (error) {
    return {};
  }
}

function countReadyToPay(rows) {
  var overrides = readPayableOverrides();
  var count = 0;
  (Array.isArray(rows) ? rows : []).forEach(function (row) {
    if (!row) return;
    var status = row.status;
    var override = row.id != null ? overrides[String(row.id)] : null;
    if (override && override.status) status = override.status;
    if (status === "ready_to_pay") count += 1;
  });
  return count;
}

function setLiveNavCount(id, count) {
  NAV_LIVE_COUNTS[id] = count;
  document
    .querySelectorAll('[data-nav-count="' + id + '"]')
    .forEach(function (node) {
      if (count == null || count < 1) {
        node.textContent = "";
        node.classList.add("hidden");
        return;
      }
      node.textContent = String(count);
      node.classList.remove("hidden");
    });
}

function loadLiveNavCounts() {
  var request =
    window.DataSource && typeof window.DataSource.load === "function"
      ? window.DataSource.load("bills-payables")
      : fetch("/src/data/bills-payables.json", { cache: "no-store" }).then(
          function (response) {
            if (!response.ok) throw new Error("HTTP " + response.status);
            return response.json();
          },
        );
  return request
    .then(function (payload) {
      var rows = payload && Array.isArray(payload.data) ? payload.data : [];
      setLiveNavCount("bills", countReadyToPay(rows));
    })
    .catch(function () {});
}

const NAV_ITEM_BASE =
  "nav-item group relative flex h-10 w-full items-center justify-between rounded-md py-2 pl-2 pr-3 text-left text-base font-medium transition-colors cursor-pointer focus-visible:outline-none";
const NAV_ITEM_ACTIVE =
  "is-active bg-gray-100 text-gray-900 hover:bg-gray-100 hover:text-gray-900 focus-visible:bg-gray-100 focus-visible:text-gray-900 dark:bg-white/10 dark:text-white dark:hover:bg-white/10 dark:hover:text-white dark:focus-visible:bg-white/10 dark:focus-visible:text-white";
const NAV_ITEM_INACTIVE =
  "text-gray-600 hover:bg-gray-100 hover:text-gray-900 focus-visible:bg-gray-100 focus-visible:text-gray-900 dark:text-gray-300 dark:hover:bg-white/10 dark:hover:text-white dark:focus-visible:bg-white/10 dark:focus-visible:text-white";
const NAV_ITEM_INACTIVE_SUB =
  "text-gray-600 hover:bg-gray-100 hover:text-gray-900 focus-visible:bg-gray-100 focus-visible:text-gray-900 dark:text-gray-400 dark:hover:bg-white/10 dark:hover:text-white dark:focus-visible:bg-white/10 dark:focus-visible:text-white";

function getShellAssetUrl(key, fallback) {
  var assets = window.__APP_SHELL_ASSET_URLS || {};
  return assets[key] || fallback;
}

function namespaceInlineSvg(svg, prefix) {
  return svg
    .replace(/id="([^"]+)"/g, 'id="' + prefix + '-$1"')
    .replace(/url\(#([^)]+)\)/g, "url(#" + prefix + "-$1)");
}

let smartHubLogoInstanceCount = 0;

// Consumer Portal logomark, from the Consumer Portal (SD) Figma file.
const CONSUMER_MARK_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 19.9483 23.1276" fill="none"><path d="M9.97413 4.72164L15.9313 8.16099V15.0397L9.97413 18.4791L4.01699 15.0397V8.16099L9.97413 4.72164Z" fill="url(#cpm0)"/><path d="M9.97413 11.6004L15.9312 8.16238V15.0384L9.97413 18.4861L9.97413 11.6004Z" fill="url(#cpm1)"/><path d="M9.97413 15.3837L13.2506 13.492L13.2506 9.70874L9.97413 7.8171L6.6977 9.70874L6.6977 13.492L9.97413 15.3837Z" fill="url(#cpm2)"/><path fill-rule="evenodd" clip-rule="evenodd" d="M19.8409 5.90388L9.97436 0.207422L0.107812 5.90388V17.2968L9.97436 22.9932L19.8409 17.2968V5.90388ZM1.64115 16.4115V6.78915L9.97436 1.97796L18.3076 6.78915V16.4115L9.97436 21.2227L1.64115 16.4115Z" fill="#C4ECF5"/><g fill="#3290FF"><circle cx="9.97413" cy="1.03181" r="1.03181"/><circle cx="9.97413" cy="22.0958" r="1.0318"/><circle cx="1.03181" cy="6.36171" r="1.03181"/><circle cx="18.9164" cy="6.36171" r="1.03181"/><circle cx="1.03181" cy="16.7658" r="1.03181"/><circle cx="18.9164" cy="16.7658" r="1.03181"/></g><defs><linearGradient id="cpm0" x1="9.96187" y1="4.68855" x2="10.956" y2="18.5991" gradientUnits="userSpaceOnUse"><stop stop-color="#3099FF"/><stop offset="1" stop-color="#3D5CFF"/></linearGradient><linearGradient id="cpm1" x1="10.633" y1="13.3333" x2="12.9527" y2="18.4861" gradientUnits="userSpaceOnUse"><stop stop-color="#003FD0"/><stop offset="1" stop-color="#2A60DD" stop-opacity="0"/></linearGradient><linearGradient id="cpm2" x1="8.74714" y1="8.8333" x2="8.74714" y2="15.3837" gradientUnits="userSpaceOnUse"><stop stop-color="#2CB2FF" stop-opacity="0"/><stop offset="1" stop-color="#1FAEFF"/></linearGradient></defs></svg>';

/** Which product's brand the sidebar wears, from the active plan. */
function activeBrand() {
  try {
    return (window.AppPlans && window.AppPlans.getPlan().brand) || "smart-hub";
  } catch (error) {
    return "smart-hub";
  }
}

function buildConsumerMarkHtml(sizeCls) {
  smartHubLogoInstanceCount += 1;
  return (
    '<span class="flex shrink-0 items-center rounded-lg bg-white p-1 shadow-lg ring-1 ring-black/5 dark:bg-white/10 dark:ring-white/10">' +
    namespaceInlineSvg(
      CONSUMER_MARK_SVG,
      "consumer-mark-" + smartHubLogoInstanceCount,
    ).replace("<svg ", '<svg class="' + (sizeCls || "size-6") + '" ') +
    "</span>"
  );
}

function illustrationAsset(file) {
  var path = window.location.pathname || "";
  var marker = "/src/pages/";
  var index = path.indexOf(marker);
  var root = index >= 0 ? path.slice(0, index) : "";
  return root + "/src/assets/illustrations/" + encodeURIComponent(file);
}

function smartHubLogoImg(alt) {
  var light =
    '<img src="' +
    illustrationAsset("SMART Hub.svg") +
    '" width="140" height="35" alt="' +
    (alt || "") +
    '" class="h-[35px] w-[140px] max-w-none shrink-0 dark:hidden">';
  var dark =
    '<img src="' +
    illustrationAsset("SMART Hub Dark.svg") +
    '" width="140" height="35" alt="" class="hidden h-[35px] w-[140px] max-w-none shrink-0 dark:block">';
  return light + dark;
}

function buildSmartHubMarkHtml() {
  return (
    '<span class="relative block h-[35px] w-[35px] shrink-0 overflow-hidden">' +
    smartHubLogoImg("").replace(/class="/g, 'class="absolute left-0 top-0 ') +
    "</span>"
  );
}

const SIDEBAR_COLLAPSE_ICON =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40" fill="currentColor" aria-hidden="true" class="size-10"><path fill-rule="evenodd" d="M13 13C13.5523 13 14 13.4477 14 14L14 26C14 26.5523 13.5523 27 13 27C12.4477 27 12 26.5523 12 26L12 14C12 13.4477 12.4477 13 13 13ZM20.7071 16.2929C21.0976 16.6834 21.0976 17.3166 20.7071 17.7071L19.4142 19L27 19C27.5523 19 28 19.4477 28 20C28 20.5523 27.5523 21 27 21L19.4142 21L20.7071 22.2929C21.0976 22.6834 21.0976 23.3166 20.7071 23.7071C20.3166 24.0976 19.6834 24.0976 19.2929 23.7071L16.2929 20.7071C16.1054 20.5196 16 20.2652 16 20C16 19.7348 16.1054 19.4804 16.2929 19.2929L19.2929 16.2929C19.6834 15.9024 20.3166 15.9024 20.7071 16.2929Z"/></svg>';

const SIDEBAR_EXPAND_ICON =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40" fill="currentColor" aria-hidden="true" class="size-10"><path fill-rule="evenodd" d="M13 13C13.5523 13 14 13.4477 14 14L14 26C14 26.5523 13.5523 27 13 27C12.4477 27 12 26.5523 12 26L12 14C12 13.4477 12.4477 13 13 13ZM23.2929 16.2929C22.9024 16.6834 22.9024 17.3166 23.2929 17.7071L24.5858 19L17 19C16.4477 19 16 19.4477 16 20C16 20.5523 16.4477 21 17 21L24.5858 21L23.2929 22.2929C22.9024 22.6834 22.9024 23.3166 23.2929 23.7071C23.6834 24.0976 24.3166 24.0976 24.7071 23.7071L27.7071 20.7071C27.8946 20.5196 28 20.2652 28 20C28 19.7348 27.8946 19.4804 27.7071 19.2929L24.7071 16.2929C24.3166 15.9024 23.6834 15.9024 23.2929 16.2929Z"/></svg>';

function buildFullLogoSvgHtml() {
  if (activeBrand() === "consumer-portal") {
    return (
      '<span class="flex items-center gap-2.5">' +
      buildConsumerMarkHtml("size-6") +
      '<span class="text-lg font-semibold whitespace-nowrap text-gray-950 dark:text-white">Consumer Portal</span></span>'
    );
  }
  return smartHubLogoImg("SMART Hub");
}

function buildLogoHtml(justifyClass) {
  return (
    '<div class="flex h-[35px] items-center ' +
    (justifyClass || "justify-center") +
    '" data-smart-hub-logo>' +
    buildFullLogoSvgHtml() +
    "</div>"
  );
}

const TRANSCARD_LOGO_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="12" viewBox="0 0 64 12" fill="none" class="mb-0.5 text-black dark:text-white"><path d="M0 2.8782H3.2576V7.37029V11.8624H5.19674V7.37029V2.8782H8.45435V1.19781H0V2.8782Z" fill="currentColor"/><path d="M12.598 3.69985C12.4327 3.67405 12.2675 3.65194 12.1059 3.6372C11.9443 3.62246 11.801 3.61509 11.6799 3.61509C11.0775 3.61141 10.4789 3.67037 9.89129 3.79197C9.43589 3.88779 8.98783 4.01308 8.54712 4.17154V11.8696H10.4018V5.39498C10.5597 5.34707 10.7213 5.3139 10.8866 5.28811C11.1033 5.24757 11.3199 5.22546 11.5403 5.22546C11.8561 5.22178 12.172 5.25126 12.4842 5.31022C12.7008 5.35075 12.9138 5.40603 13.1232 5.47236L13.4427 3.89147C13.3509 3.85831 13.2297 3.82514 13.0754 3.79197C12.9175 3.75512 12.7596 3.72564 12.598 3.69985Z" fill="currentColor"/><path d="M19.5607 4.48129C19.2889 4.19017 18.9437 3.96906 18.5691 3.84009C18.0806 3.67794 17.5701 3.60056 17.0597 3.6153C16.5932 3.61161 16.1231 3.65583 15.6641 3.73691C15.3299 3.79218 14.9956 3.87325 14.6651 3.97643L14.621 3.99117L14.8598 5.56101L14.9222 5.5389C15.194 5.44677 15.4768 5.37676 15.7559 5.33622C16.1268 5.27357 16.5088 5.24409 16.887 5.24778C17.1405 5.24041 17.3902 5.27726 17.6289 5.36202C17.9852 5.49099 18.2496 5.78948 18.3414 6.15799C18.3891 6.34593 18.4148 6.54492 18.4148 6.74023V6.9687C18.2055 6.9208 17.9925 6.88395 17.7795 6.85815C17.5701 6.83236 17.3608 6.8213 17.1515 6.8213C17.1441 6.8213 17.1405 6.8213 17.1331 6.8213C16.7254 6.8213 16.3178 6.86552 15.9211 6.94659C15.5502 7.02029 15.1976 7.16401 14.8745 7.36669C14.577 7.562 14.3272 7.82732 14.1546 8.14055C13.9673 8.498 13.8755 8.89599 13.8902 9.29766C13.8755 9.7067 13.9526 10.1194 14.1179 10.499C14.2648 10.8122 14.4925 11.0886 14.7716 11.295C15.0764 11.5087 15.4107 11.6561 15.7742 11.7372C16.1966 11.8293 16.6263 11.8772 17.056 11.8735C17.089 11.8735 17.1184 11.8735 17.1515 11.8735C17.7501 11.8735 18.3561 11.8293 18.951 11.7445C19.5203 11.6598 19.9316 11.5898 20.2034 11.5271L20.2475 11.5161V6.75128C20.2512 6.32382 20.1997 5.89635 20.0896 5.47994C19.9941 5.11143 19.8141 4.76504 19.5607 4.48129ZM18.4112 8.33955V10.2484C18.0145 10.3111 17.6105 10.3405 17.2102 10.3295H17.1551C16.7401 10.3221 16.4096 10.241 16.1635 10.0936C15.9175 9.94255 15.7889 9.6588 15.7889 9.25344C15.7816 9.07287 15.8293 8.89599 15.9285 8.74122C16.024 8.60487 16.1525 8.49432 16.2994 8.4243C16.4684 8.34323 16.6446 8.29164 16.832 8.26584C17.2286 8.20688 17.6326 8.20688 18.0329 8.26584C18.1541 8.28058 18.2826 8.30638 18.4112 8.33955Z" fill="currentColor"/><path d="M27.6177 4.63596C27.3386 4.30062 26.975 4.04266 26.5673 3.88421C26.0422 3.6889 25.4839 3.59677 24.9257 3.61151C24.2903 3.60783 23.6513 3.65573 23.0233 3.75154C22.5532 3.82156 22.0868 3.92106 21.6277 4.04635V11.866H23.4824V5.34717C23.6072 5.32506 23.7945 5.29927 24.0516 5.26979C24.294 5.24031 24.5401 5.22557 24.7898 5.22188C25.0652 5.21451 25.337 5.25873 25.5941 5.35086C25.8071 5.43193 25.9871 5.57933 26.1156 5.76727C26.2552 5.99206 26.3507 6.24633 26.3911 6.50797C26.4535 6.87279 26.4792 7.2413 26.4755 7.61349V11.855H28.3339V7.31868C28.3375 6.81383 28.2825 6.30897 28.1723 5.81518C28.0768 5.38771 27.8895 4.98235 27.6177 4.63596Z" fill="currentColor"/><path d="M35.1506 8.64496C35.0588 8.39069 34.9082 8.15485 34.7173 7.96691C34.4969 7.75317 34.2472 7.57629 33.9754 7.44363C33.6228 7.26675 33.2592 7.10829 32.892 6.97194C32.6753 6.89824 32.4623 6.81348 32.2493 6.71399C32.1024 6.64766 31.9591 6.5629 31.8306 6.46709C31.7425 6.40076 31.669 6.31232 31.6213 6.2165C31.5772 6.11701 31.5588 6.00646 31.5588 5.8959C31.5515 5.6748 31.6727 5.47212 31.8673 5.37631C32.1317 5.24733 32.4292 5.18469 32.7304 5.19574C33.083 5.19206 33.4355 5.22891 33.7807 5.30629C34.0342 5.36525 34.2839 5.44633 34.5226 5.54951L34.5814 5.5753L34.9303 4.00915L34.8862 3.99441C34.5814 3.88755 34.2655 3.80648 33.9497 3.74751C33.52 3.66276 33.0793 3.61854 32.6422 3.62222C31.7388 3.62222 31.0153 3.83596 30.4864 4.25237C29.9539 4.67246 29.6858 5.25102 29.6858 5.97698C29.6748 6.30495 29.7335 6.62555 29.8584 6.92772C29.9686 7.18199 30.1302 7.40678 30.3358 7.59103C30.5489 7.78265 30.7912 7.94111 31.0483 8.0664C31.3385 8.21012 31.6433 8.33541 31.9444 8.44596C32.4696 8.64127 32.8479 8.82553 33.0756 8.99135C33.2776 9.12033 33.3951 9.34143 33.3951 9.58465V9.58833C33.4135 9.80944 33.296 10.0195 33.1013 10.1227C32.8956 10.2332 32.5541 10.2885 32.095 10.2885C32.084 10.2885 32.0767 10.2885 32.0656 10.2885C31.6543 10.2885 31.243 10.2369 30.8463 10.1337C30.5231 10.049 30.2073 9.94578 29.9025 9.82786L29.8437 9.80207L29.5132 11.4088L29.5573 11.4235C29.8437 11.5304 30.1375 11.6262 30.435 11.6999C30.9198 11.8141 31.4193 11.8731 31.9187 11.8731C31.9738 11.8731 32.0289 11.8731 32.084 11.8694H32.0877C33.105 11.8694 33.8983 11.6741 34.4528 11.2871C35.0111 10.8965 35.2939 10.3143 35.2939 9.55885C35.2939 9.24562 35.2498 8.93976 35.1506 8.64496Z" fill="currentColor"/><path d="M41.8496 9.89443C41.6366 9.98287 41.3795 10.0566 41.0894 10.1155C40.7992 10.1745 40.4981 10.204 40.1969 10.204C39.4 10.204 38.827 9.98287 38.4965 9.55172C38.1623 9.1132 37.9897 8.50885 37.9897 7.75341C37.9897 6.96849 38.1696 6.35309 38.5259 5.92562C38.8784 5.50184 39.4 5.28442 40.0794 5.28442C40.3695 5.28442 40.645 5.3139 40.9021 5.37286C41.1591 5.43182 41.3942 5.50552 41.5962 5.59397L41.6549 5.61976L42.0663 4.04256L42.0222 4.02413C41.3685 3.75512 40.6633 3.61877 39.9325 3.61877C39.3375 3.61877 38.7903 3.72564 38.3129 3.93569C37.8354 4.14574 37.4241 4.44054 37.0899 4.80905C36.7557 5.17755 36.4949 5.61976 36.3186 6.12461C36.1387 6.62947 36.0505 7.17486 36.0505 7.75341C36.0505 8.33933 36.1313 8.89209 36.2893 9.39326C36.4472 9.89811 36.6932 10.3403 37.0164 10.7051C37.3396 11.07 37.7546 11.3611 38.2504 11.5638C38.7426 11.7701 39.3302 11.8733 39.9949 11.8733C40.4209 11.8733 40.8396 11.8328 41.2399 11.7554C41.6403 11.6743 41.9487 11.5859 42.1471 11.4827L42.1838 11.4643L41.9157 9.87232L41.8496 9.89443Z" fill="currentColor"/><path d="M48.7158 4.48129C48.444 4.19017 48.0988 3.96906 47.7242 3.84009C47.2357 3.67794 46.7252 3.60056 46.2147 3.6153C45.7483 3.61161 45.2782 3.65215 44.8154 3.73322C44.4812 3.7885 44.147 3.86957 43.8202 3.97275L43.7761 3.98749L44.0111 5.55732L44.0736 5.53521C44.3454 5.44309 44.6245 5.37307 44.9073 5.33254C45.2782 5.26989 45.6601 5.24041 46.0384 5.24409C46.2918 5.23672 46.5416 5.27358 46.7803 5.35833C47.1365 5.48731 47.401 5.7858 47.4928 6.1543C47.5405 6.34224 47.5662 6.54124 47.5662 6.73654V6.96502C47.3569 6.91711 47.1439 6.88026 46.9309 6.85447C46.7179 6.82867 46.5085 6.81762 46.3029 6.81762C46.2992 6.81762 46.2992 6.81762 46.2955 6.81762C45.8842 6.81762 45.4692 6.86184 45.0689 6.94659C44.6979 7.02029 44.3454 7.16401 44.0222 7.36669C43.7247 7.562 43.4749 7.82732 43.3023 8.14055C43.115 8.498 43.0232 8.89599 43.0379 9.29766C43.0269 9.7067 43.104 10.1231 43.2729 10.499C43.4199 10.8122 43.6476 11.0886 43.9267 11.295C44.2315 11.5087 44.5694 11.6561 44.9293 11.7372C45.348 11.8293 45.7813 11.8772 46.211 11.8735C46.2441 11.8735 46.2735 11.8735 46.3065 11.8735C46.9052 11.8735 47.5111 11.8293 48.1061 11.7445C48.6754 11.6598 49.0867 11.5898 49.3585 11.5271L49.4025 11.5161V6.75128C49.4062 6.32382 49.3548 5.89267 49.2446 5.47994C49.1455 5.11143 48.9655 4.76504 48.7158 4.48129ZM47.5626 8.33955V10.2484C47.1659 10.3111 46.7619 10.3405 46.3616 10.3295H46.3065C45.8915 10.3221 45.561 10.241 45.3149 10.0936C45.0689 9.94255 44.9403 9.6588 44.9403 9.25344C44.933 9.07287 44.9807 8.89599 45.0799 8.74122C45.1754 8.60487 45.3039 8.49432 45.4508 8.4243C45.6198 8.34323 45.796 8.29164 45.9833 8.26584C46.38 8.20688 46.784 8.20688 47.1843 8.26584C47.3092 8.28058 47.4377 8.30638 47.5626 8.33955Z" fill="currentColor"/><path d="M54.829 3.69985C54.6637 3.67405 54.4984 3.65194 54.3368 3.6372C54.1752 3.62246 54.032 3.61509 53.9108 3.61509C53.3085 3.61141 52.7099 3.67037 52.1222 3.79197C51.6668 3.88779 51.2188 4.01308 50.7781 4.17154V11.8696H52.6327V5.39498C52.7907 5.34707 52.9523 5.3139 53.1175 5.28811C53.3342 5.24757 53.5509 5.22546 53.7713 5.22546C54.0871 5.22178 54.4029 5.25126 54.7151 5.31022C54.9318 5.35075 55.1448 5.40603 55.3541 5.47236L55.6737 3.89147C55.5818 3.85831 55.4606 3.82514 55.3064 3.79197C55.1485 3.75512 54.9942 3.72564 54.829 3.69985Z" fill="currentColor"/><path d="M63.1198 11.3242V10.7714L63.1235 0L61.2247 0.316915V4.01303C61.0081 3.90985 60.784 3.82141 60.5563 3.75139C60.2295 3.65558 59.8879 3.60767 59.55 3.61504C59.0359 3.60399 58.5364 3.70349 58.0626 3.90985C57.6403 4.10147 57.2583 4.39259 56.9645 4.75373C56.6487 5.14066 56.421 5.57918 56.2814 6.05824C56.1198 6.60731 56.0427 7.1785 56.05 7.74968C56.0427 8.33192 56.1345 8.90679 56.3255 9.45955C56.4981 9.94598 56.7662 10.3845 57.1224 10.7604C57.4713 11.1215 57.9047 11.4053 58.3748 11.5858C58.8853 11.7775 59.4178 11.8733 59.9614 11.8733C59.9871 11.8733 60.0128 11.8733 60.0385 11.8733C60.6077 11.8733 61.1807 11.829 61.7389 11.7406C62.1906 11.6706 62.6424 11.5711 63.0794 11.4421L63.1198 11.4311V11.3242ZM61.2211 10.086C61.0742 10.1155 60.9236 10.1413 60.773 10.156C60.5343 10.1818 60.2882 10.1966 60.0458 10.1929C59.4068 10.1929 58.8963 9.97177 58.5364 9.53694C58.1802 9.10947 57.9965 8.5088 57.9892 7.75705H57.9929V7.70178C57.9929 6.95371 58.1398 6.35304 58.4299 5.91821C58.72 5.49074 59.1828 5.27332 59.8145 5.27332C59.8181 5.27332 59.8255 5.27332 59.8292 5.27332C60.1046 5.27332 60.3727 5.32123 60.6335 5.41335C60.8428 5.48337 61.0411 5.57918 61.2247 5.6971V10.086H61.2211Z" fill="currentColor"/></svg>';

const TRANSCARD_SHIELD_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M8.91309 1.125C11.4548 3.2985 15.5771 3.43066 15.5771 3.43066V9.22656C15.5767 12.7831 8.91309 16.875 8.91309 16.875C8.86421 16.8449 2.25042 12.77 2.25 9.22656V3.43066C2.25 3.43066 6.37134 3.29832 8.91309 1.125ZM7.2793 9.90918C7.2091 9.94947 7.16702 10.0229 7.16699 10.1035V12.5801C7.16699 12.6002 7.17163 12.6209 7.18164 12.6377C7.21173 12.6914 7.28048 12.708 7.33398 12.6777L11.2783 10.3828C11.3134 10.3627 11.3352 10.3254 11.3369 10.2852V7.54785L7.2793 9.90918ZM7.33398 5.21191C7.28052 5.18171 7.21343 5.19831 7.18164 5.25195C7.17161 5.26875 7.16699 5.28942 7.16699 5.30957V7.78613C7.16699 7.86667 7.2082 7.94112 7.27832 7.98145L8.46582 8.6709L10.8701 7.27051L7.33398 5.21191Z" fill="#0089CF"/></svg>';

const ACCOUNT_INFO_ICON_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" class="size-6"><path fill-rule="evenodd" d="M18 10C18 14.4183 14.4183 18 10 18C5.58172 18 2 14.4183 2 10C2 5.58172 5.58172 2 10 2C14.4183 2 18 5.58172 18 10ZM11 6C11 6.55228 10.5523 7 10 7C9.44772 7 9 6.55228 9 6C9 5.44772 9.44772 5 10 5C10.5523 5 11 5.44772 11 6ZM9 9C8.58579 9 8.25 9.33579 8.25 9.75C8.25 10.1642 8.58579 10.5 9 10.5H9.25343C9.41338 10.5 9.53218 10.6482 9.49749 10.8043L9.03834 12.8704C8.79548 13.9633 9.62711 15 10.7467 15H11C11.4142 15 11.75 14.6642 11.75 14.25C11.75 13.8358 11.4142 13.5 11 13.5H10.7467C10.5867 13.5 10.4679 13.3518 10.5026 13.1957L10.9618 11.1296C11.2046 10.0368 10.373 9 9.25343 9H9Z" clip-rule="evenodd"/></svg>';

const HELP_ICON_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" class="size-6 text-gray-400"><path fill-rule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm11.378-3.917c-.89-.777-2.366-.777-3.255 0a.75.75 0 0 1-.988-1.129c1.454-1.272 3.776-1.272 5.23 0 1.513 1.324 1.513 3.518.005 4.846a3.75 3.75 0 0 1-.837.552c-.676.328-1.028.774-1.028 1.152v.75a.75.75 0 0 1-1.5 0v-.75c0-1.279 1.06-2.107 1.875-2.502.182-.088.351-.199.503-.331.83-.727.83-1.857 0-2.584ZM12 18a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Z" clip-rule="evenodd"/></svg>';

/* ===== Helpers ===== */

function navLinkCls(id, activeId, extra) {
  return `${NAV_ITEM_BASE} ${id === activeId ? NAV_ITEM_ACTIVE : NAV_ITEM_INACTIVE}${extra ? " " + extra : ""}`;
}

function collapsedNavItemSizeCls(isDesktopCollapsed) {
  return isDesktopCollapsed ? " !size-10 !justify-center !p-0 shrink-0" : "";
}

function navIconCls(id, activeId) {
  const base = "nav-icon size-6 shrink-0";
  const active = "text-gray-900 dark:text-white";
  const inactive =
    "text-gray-500 group-hover:text-gray-900 group-focus-visible:text-gray-900 dark:text-gray-400 dark:group-hover:text-white dark:group-focus-visible:text-white";
  return `${base} ${id === activeId ? active : inactive}`;
}

function renderIcon(key, cls) {
  return (APP_NAV_ICONS[key] || "").replace("{CLS}", cls);
}

function resolveNavHref(href, routerMode) {
  if (!href || href === "#") return href || "#";
  if (routerMode === "hash" && APP_NAV_REACT_ROUTE_MAP[href])
    return APP_NAV_REACT_ROUTE_MAP[href];
  return href;
}

/* ===== Item Builders ===== */

function buildDivider() {
  return '<div class="h-px w-full bg-gray-200 dark:bg-white/10" role="separator"></div>';
}

function buildSubmenuItems(children, activeId, routerMode) {
  return children
    .map((child) => {
      const isActive = child.id === activeId;
      const cls =
        "nav-item group relative flex h-10 w-full items-center rounded-md px-2 py-2 text-base font-medium transition-colors cursor-pointer focus-visible:outline-none " +
        (isActive ? NAV_ITEM_ACTIVE : NAV_ITEM_INACTIVE_SUB);
      const ariaCurrent = isActive ? ' aria-current="page"' : "";
      return `<a href="${resolveNavHref(child.href || "#", routerMode)}" title="${child.label}" class="${cls}"${ariaCurrent}><span class="block truncate">${child.label}</span></a>`;
    })
    .join("\n");
}

function buildSubmenu(children, activeId, expanded, routerMode) {
  const openCls = expanded
    ? "nav-submenu ml-9 flex flex-col gap-1 overflow-hidden max-h-96 opacity-100 pointer-events-auto transition-all duration-400 ease-in-out"
    : "nav-submenu ml-9 flex flex-col gap-1 overflow-hidden max-h-0 opacity-0 pointer-events-none transition-all duration-400 ease-in-out";
  return `<div class="${openCls}">${buildSubmenuItems(children, activeId, routerMode)}</div>`;
}

function buildCountBadge(item, isDesktopCollapsed) {
  if (!item || isDesktopCollapsed || item.id !== "bills") return "";
  var count = NAV_LIVE_COUNTS.bills;
  var hidden = count == null || count < 1 ? " hidden" : "";
  var text = count == null || count < 1 ? "" : String(count);
  return `<span data-nav-count="bills" class="shrink-0 rounded-[512px] border border-gray-200 bg-gray-100 px-2 py-[2px] text-xs font-medium leading-4 text-gray-800 dark:border-white/10 dark:bg-white/10 dark:text-gray-200${hidden}">${text}</span>`;
}

function buildNavTrailing(item, isDesktopCollapsed) {
  return (
    buildCountBadge(item, isDesktopCollapsed) +
    buildNavBadge(item, isDesktopCollapsed)
  );
}

function buildNavLink(item, activeId, routerMode, isDesktopCollapsed) {
  const ariaCurrent = item.id === activeId ? ' aria-current="page"' : "";
  const rowCls = navLinkCls(
    item.id,
    activeId,
    collapsedNavItemSizeCls(isDesktopCollapsed),
  );
  const contentCls = "flex min-w-0 items-center gap-3";
  const labelCls =
    "nav-label truncate" + (isDesktopCollapsed ? " hidden sr-only" : "");
  return `<a href="${resolveNavHref(item.href, routerMode)}" class="${rowCls}"${ariaCurrent}>
<span class="${contentCls}">${renderIcon(item.icon, navIconCls(item.id, activeId))}<span class="${labelCls}">${item.label}</span></span>
${buildNavTrailing(item, isDesktopCollapsed)}
</a>`;
}

/** Locked modules stay visible and carry the plan's upgrade affordance. */
function buildNavBadge(item, isDesktopCollapsed) {
  if (!item || !item.badge || isDesktopCollapsed) return "";
  return `<span class="ml-auto shrink-0 rounded-sm bg-blue-50 px-1.5 py-0.5 text-[11px] font-semibold text-blue-700 dark:bg-blue-400/10 dark:text-blue-300">${item.badge}</span>`;
}

function buildNavLinkArrow(
  item,
  activeId,
  isDesktop,
  routerMode,
  isDesktopCollapsed,
) {
  const ariaCurrent = item.id === activeId ? ' aria-current="page"' : "";
  const trailingIcon = isDesktop ? SVG_ARROW_UP_RIGHT : SVG_CHEVRON_RIGHT;
  const rowCls = navLinkCls(
    item.id,
    activeId,
    collapsedNavItemSizeCls(isDesktopCollapsed),
  );
  const contentCls = "flex min-w-0 items-center gap-3";
  const labelCls =
    "nav-label truncate" + (isDesktopCollapsed ? " hidden sr-only" : "");
  const trailingIconCls = isDesktopCollapsed ? " hidden" : "";
  return `<a href="${resolveNavHref(item.href, routerMode)}" class="${rowCls}"${ariaCurrent}>
<span class="${contentCls}">${renderIcon(item.icon, navIconCls(item.id, activeId))}<span class="${labelCls}">${item.label}</span></span>
<span class="${trailingIconCls}">${trailingIcon}</span>
</a>`;
}

function buildSmartExchangeItem(
  item,
  activeId,
  expand,
  routerMode,
  isDesktopCollapsed,
) {
  const isActive = item.id === activeId;
  const rowCls =
    "group relative flex h-10 w-full items-center justify-between rounded-md py-2 pl-2 pr-3 text-left text-base font-medium transition-colors " +
    (isActive ? NAV_ITEM_ACTIVE : NAV_ITEM_INACTIVE) +
    collapsedNavItemSizeCls(isDesktopCollapsed);
  const linkCls =
    "nav-item " +
    (isActive ? "is-active " : "") +
    "relative flex h-full min-w-0 items-center bg-transparent text-inherit cursor-pointer focus-visible:outline-none " +
    (isDesktopCollapsed ? "w-full justify-center" : "flex-1 gap-3");
  const iconCls = navIconCls(item.id, activeId);
  const ariaCurrent = isActive ? ' aria-current="page"' : "";
  const chevron = SVG_CHEVRON_DOWN_TPL.replace(
    "{ROT}",
    expand ? "rotate-180" : "",
  );
  const contentCls = "flex min-w-0 items-center gap-3";
  const labelCls =
    "nav-label truncate" + (isDesktopCollapsed ? " hidden sr-only" : "");
  const chevronButtonCls =
    "flex size-5 shrink-0 items-center justify-center text-gray-500 dark:text-gray-400 cursor-pointer" +
    (isDesktopCollapsed ? " hidden" : "");
  return `<div class="${rowCls}" data-smart-exchange-trigger>
<a href="${resolveNavHref(item.href, routerMode)}" class="${linkCls}"${ariaCurrent}><span class="${contentCls}">${renderIcon(item.icon, iconCls)}<span class="${labelCls}">${item.label}</span></span></a>
<button type="button" data-chevron-toggle aria-label="Toggle Supplier Portal submenu"
  class="${chevronButtonCls}">
${chevron}
</button>
</div>
${buildSubmenu(item.children, activeId, expand, routerMode)}`;
}

function buildExpandableItem(item, activeId, routerMode, isDesktopCollapsed) {
  const chevronCls =
    "chevron-icon size-5 text-gray-500 transition-transform dark:text-gray-400";
  const rowCls = navLinkCls(
    item.id,
    activeId,
    collapsedNavItemSizeCls(isDesktopCollapsed),
  );
  const contentCls = "flex min-w-0 items-center gap-3";
  const labelCls =
    "nav-label truncate" + (isDesktopCollapsed ? " hidden sr-only" : "");
  const chevronHiddenCls = isDesktopCollapsed ? " hidden" : "";
  return `<button type="button" class="${rowCls}" data-expandable-trigger data-item-id="${item.id}">
<span class="${contentCls}">${renderIcon(item.icon, navIconCls(item.id, activeId))}<span class="${labelCls}">${item.label}</span></span>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="${chevronCls}${chevronHiddenCls}"><path fill-rule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clip-rule="evenodd"/></svg>
</button>
${buildSubmenu(
  item.children,
  activeId,
  item.children.some((child) => child.id === activeId),
  routerMode,
)}`;
}

/**
 * Turns the active business's visible modules into sidebar items. Nesting,
 * dividers and per-plan labels all come from the module registry, so this
 * function never needs to know which plan is active.
 */
function composeNavItems() {
  if (!window.AppPlans) return APP_NAV_DATA;
  const modules = window.AppPlans.visibleModules();
  const byId = {};
  modules.forEach((m) => {
    const item = Object.assign({ id: m.id }, m.nav);
    if (m.state === "locked") item.badge = "Upgrade";
    byId[m.id] = item;
  });
  const items = [];
  modules.forEach((m) => {
    const item = byId[m.id];
    if (m.parent && byId[m.parent]) {
      const parent = byId[m.parent];
      parent.children = (parent.children || []).concat([
        { id: item.id, label: item.label, href: item.href },
      ]);
      return;
    }
    if (m.dividerBefore && items.length) items.push({ type: "divider" });
    items.push(item);
  });
  return items;
}

function renderNavItem(
  item,
  isDesktop,
  activeId,
  expand,
  routerMode,
  isDesktopCollapsed,
) {
  switch (item.type) {
    case "link":
      return buildNavLink(
        item,
        activeId,
        routerMode,
        isDesktop && isDesktopCollapsed,
      );
    case "link-arrow":
      return buildNavLinkArrow(
        item,
        activeId,
        isDesktop,
        routerMode,
        isDesktop && isDesktopCollapsed,
      );
    case "smart-exchange":
      return buildSmartExchangeItem(
        item,
        activeId,
        expand && !(isDesktop && isDesktopCollapsed),
        routerMode,
        isDesktop && isDesktopCollapsed,
      );
    case "expandable":
      return buildExpandableItem(
        item,
        activeId,
        routerMode,
        isDesktop && isDesktopCollapsed,
      );
    default:
      return "";
  }
}

function buildNavItems(
  isDesktop,
  activeId,
  expand,
  routerMode,
  isDesktopCollapsed,
) {
  const parts = [];
  let block = [];

  function flushBlock() {
    if (!block.length) return;
    parts.push(
      '<div class="flex w-full flex-col gap-1' +
        (isDesktopCollapsed ? " items-center" : "") +
        '">' +
        block.join("\n") +
        "</div>",
    );
    block = [];
  }

  composeNavItems().forEach((item) => {
    if (item.type === "divider") {
      flushBlock();
      parts.push(buildDivider());
      return;
    }
    const html = renderNavItem(
      item,
      isDesktop,
      activeId,
      expand,
      routerMode,
      isDesktopCollapsed,
    );
    if (html) block.push(html);
  });
  flushBlock();
  return parts.join("\n");
}

function getPagePathForNavContext(component, overridePagePath) {
  if (overridePagePath) return overridePagePath;
  return (
    (component &&
      component.getAttribute &&
      component.getAttribute("data-page")) ||
    (document.body && document.body.getAttribute("data-page")) ||
    window.location.pathname.split("/").pop() ||
    ""
  );
}

/* ===== Shared Block HTML ===== */

function buildHelpBlock(id, collapsed) {
  const wrap = id ? `id="${id}" ` : "";
  const expandedBtn = `<button type="button" data-support-trigger data-help-variant="expanded" aria-haspopup="dialog" aria-expanded="false" aria-controls="dashboard-support-flyout" class="${collapsed ? "!hidden " : ""}self-start inline-flex h-10 items-center gap-1.5 rounded-md px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:text-gray-300 dark:hover:bg-white/10 dark:hover:text-gray-100 cursor-pointer">
${HELP_ICON_SVG.replace("size-6", "size-5")}Help from Transcard</button>`;
  if (collapsed == null) {
    return `<div ${wrap}class="flex flex-col">${expandedBtn}</div>`;
  }
  return `<div ${wrap}class="flex w-full flex-col">
${expandedBtn}
<button type="button" data-support-trigger data-help-variant="collapsed" data-sidebar-btn-tooltip="Help from Transcard" aria-haspopup="dialog" aria-expanded="false" aria-controls="dashboard-support-flyout" aria-label="Help from Transcard" class="${collapsed ? "" : "!hidden "}mx-auto inline-flex size-10 shrink-0 items-center justify-center rounded-md text-gray-400 hover:bg-gray-100 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:text-gray-400 dark:hover:bg-white/10 cursor-pointer">
${HELP_ICON_SVG}</button></div>`;
}

function accountInfoAssetPath(file) {
  var path = window.location.pathname || "";
  var marker = "/src/pages/";
  var index = path.indexOf(marker);
  var root = index >= 0 ? path.slice(0, index) : "";
  return root + "/src/assets/account-info/" + file;
}

function accountInfoImg(file, className, width, height, alt) {
  return (
    '<img src="' +
    accountInfoAssetPath(file) +
    '" alt="' +
    (alt || "") +
    '" width="' +
    width +
    '" height="' +
    height +
    '" class="' +
    className +
    '">'
  );
}

function accountInfoBubble(label) {
  return (
    '<button type="button" class="inline-flex shrink-0 items-center justify-center rounded-md p-0.5 transition-colors hover:bg-gray-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:hover:bg-white/10 cursor-pointer" aria-label="About ' +
    label +
    '">' +
    accountInfoImg("info-circle.svg", "size-[18px] shrink-0", 18, 18, "") +
    "</button>"
  );
}

function accountInfoCurrentRow() {
  return (
    '<div class="flex w-full items-center justify-between">' +
    '<div class="flex min-w-0 items-center gap-2">' +
    '<span class="inline-flex shrink-0 rounded-full bg-gradient-to-b from-[#27C9E3] to-[#026EBC] p-1 shadow-[0px_1px_1px_rgba(0,0,0,0.05)]">' +
    accountInfoImg(
      "payment-logomark.svg",
      "size-5 shrink-0",
      20,
      20,
      "",
    ) +
    "</span>" +
    '<span class="text-sm font-medium leading-5 whitespace-nowrap text-gray-800 dark:text-gray-100">AP/AR Payments</span>' +
    accountInfoImg(
      "feature-status.svg",
      "size-[18px] shrink-0",
      18,
      18,
      "Pending",
    ) +
    "</div>" +
    accountInfoBubble("AP/AR Payments") +
    "</div>"
  );
}

function accountInfoEnableRow(name) {
  return (
    '<div class="flex w-full items-center justify-between gap-4">' +
    '<div class="flex items-center gap-2">' +
    '<span class="inline-flex shrink-0 items-center justify-center rounded-2xl border-2 border-dashed border-gray-300 p-1 dark:border-white/20">' +
    accountInfoImg("plus.svg", "size-5 shrink-0", 20, 20, "") +
    "</span>" +
    '<span class="text-sm font-medium leading-5 whitespace-nowrap text-blue-600 dark:text-blue-400">' +
    name +
    "</span></div>" +
    accountInfoBubble(name) +
    "</div>"
  );
}

function buildAccountInfoPanel(panelId) {
  return `<div id="${panelId}" data-account-info-panel class="hidden flex-col gap-3 rounded-b-md bg-gray-50 px-4 pb-4 font-['Inter'] dark:bg-white/5">
<p class="text-xs font-normal leading-4 text-gray-500 dark:text-gray-400">You can go to your account enrollment portal to update your business information or upgrade your product with additional features.</p>
<div class="h-px w-full bg-gray-200 dark:bg-white/10"></div>
<div class="flex flex-col gap-3">
<h3 class="text-sm font-medium leading-5 text-gray-700 dark:text-gray-200">Current Features</h3>
${accountInfoCurrentRow()}
</div>
<div class="h-px w-full bg-gray-200 dark:bg-white/10"></div>
<div class="flex flex-col gap-3">
<h3 class="text-sm font-medium leading-5 text-gray-700 dark:text-gray-200">Enable More Features</h3>
<div class="flex flex-col gap-3">
${accountInfoEnableRow("Supply Chain Financing")}
${accountInfoEnableRow("Merchant Services")}
</div>
</div>
<div class="h-px w-full bg-gray-200 dark:bg-white/10"></div>
<a href="#" data-account-portal class="flex w-full items-center justify-between rounded-md py-2 pr-3 pl-2 text-base font-medium leading-6 text-blue-600 transition-colors hover:bg-gray-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:text-blue-400 dark:hover:bg-white/10">
<span>Go to enrollment portal</span>
${accountInfoImg("arrow-up-right.svg", "size-5 shrink-0", 20, 20, "")}
</a>
</div>`;
}

function buildAccountInfoButton(collapsed, panelId) {
  return `<div data-account-info-widget data-account-variant="expanded" data-open="false" class="${collapsed ? "!hidden " : ""}flex w-full flex-col">
<button type="button" data-account-info-trigger aria-expanded="false" aria-controls="${panelId}" class="flex h-10 w-full cursor-pointer items-center justify-between gap-3 rounded-md bg-gray-50 px-4 text-base font-medium leading-6 text-gray-700 transition-colors hover:bg-gray-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:bg-white/5 dark:text-gray-200 dark:hover:bg-white/10">
<span class="whitespace-nowrap">Your Account Information</span>
${SVG_CHEVRON_DOWN_TPL.replace("{ROT}", "text-gray-400 dark:text-gray-500")}
</button>
${buildAccountInfoPanel(panelId)}
</div>`;
}

function accountInfoCollapsedButton(collapsed) {
  return `<button type="button" data-account-info-trigger data-account-variant="collapsed" data-sidebar-btn-tooltip="Your Account Information" aria-haspopup="dialog" aria-expanded="false" aria-controls="dashboard-account-info-flyout" aria-label="Your Account Information" class="${collapsed ? "" : "!hidden "}mx-auto inline-flex size-10 shrink-0 items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-gray-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:bg-white/5 dark:text-gray-300 dark:hover:bg-white/10 cursor-pointer">${ACCOUNT_INFO_ICON_SVG}</button>`;
}

function footerBrandMarkup() {
  return `<div class="flex items-center gap-0.5">
${TRANSCARD_SHIELD_SVG}
<span class="text-xs font-medium text-gray-800 dark:text-gray-300">Powered by </span>
${TRANSCARD_LOGO_SVG}
</div>
<div class="flex items-center gap-2 text-xs font-medium text-gray-700 dark:text-gray-400">
<a href="#" class="hover:text-gray-900 dark:hover:text-white transition-colors">Terms of Use</a>
<span class="text-gray-700 dark:text-gray-400">•</span>
<a href="#" class="hover:text-gray-900 dark:hover:text-white transition-colors">Privacy Policy</a>
</div>`;
}

function buildFooter(id, collapsed) {
  const wrap = id ? `id="${id}" ` : "";
  const shieldMark = TRANSCARD_SHIELD_SVG.replace(
    'width="18" height="18"',
    'width="24" height="24"',
  );
  if (collapsed == null) {
    return `<div ${wrap}class="flex flex-col items-center gap-2 py-4">${footerBrandMarkup()}</div>`;
  }
  return `<div ${wrap}class="flex w-full shrink-0 flex-col items-center">
<div data-footer-variant="expanded" class="${collapsed ? "!hidden " : ""}flex flex-col items-center gap-2 py-4">${footerBrandMarkup()}</div>
<div data-footer-variant="collapsed" class="${collapsed ? "" : "!hidden "}flex flex-col items-center py-4">${shieldMark}</div></div>`;
}

/* ===== AppNav Web Component ===== */

class AppNav extends HTMLElement {
  connectedCallback() {
    this.style.display = "block";
    const filename = getPagePathForNavContext(this);
    const activeId = APP_NAV_PAGE_MAP[filename] || null;
    const routerMode = this.getAttribute("data-router") || "static";
    const collapsed = getInitialSidebarCollapsed();
    const expandAttr = this.getAttribute("data-expand-smart-exchange");
    const expand =
      expandAttr == null
        ? filename === "supplier-portal.html" ||
          filename === "payment-preferences.html"
        : expandAttr === "true";

    this.innerHTML = this._buildHTML(activeId, expand, routerMode, collapsed);
    this._attachEventListeners();
    this._refreshThemeLogos = this._refreshThemeLogos.bind(this);
    this._onLiveCounts = this._onLiveCounts.bind(this);
    window.addEventListener("app-theme-change", this._refreshThemeLogos);
    window.addEventListener("app-nav-counts", this._onLiveCounts);
    loadLiveNavCounts();
  }

  disconnectedCallback() {
    if (this._refreshThemeLogos) {
      window.removeEventListener("app-theme-change", this._refreshThemeLogos);
    }
    if (this._onLiveCounts) {
      window.removeEventListener("app-nav-counts", this._onLiveCounts);
    }
  }

  _onLiveCounts(event) {
    var detail = event && event.detail;
    if (!detail || detail.bills == null) return;
    setLiveNavCount("bills", detail.bills);
  }

  _refreshNavTrees(pagePath) {
    var filename = getPagePathForNavContext(this, pagePath);
    var activeId = APP_NAV_PAGE_MAP[filename] || null;
    var routerMode = this.getAttribute("data-router") || "static";
    var collapsed = getInitialSidebarCollapsed();

    // Capture current submenu open states before rebuild
    var expandSE = false;
    var openExpandableIds = new Set();
    var desktopNav = this.querySelector('[data-nav="desktop"]');
    if (desktopNav) {
      var seTriggerEl = desktopNav.querySelector(
        "[data-smart-exchange-trigger]",
      );
      if (seTriggerEl) {
        var seSubEl = seTriggerEl.nextElementSibling;
        if (
          seSubEl &&
          seSubEl.classList.contains("nav-submenu") &&
          !seSubEl.classList.contains("max-h-0")
        )
          expandSE = true;
      }
      desktopNav
        .querySelectorAll("[data-expandable-trigger][data-item-id]")
        .forEach(function (btn) {
          var sub = btn.nextElementSibling;
          if (
            sub &&
            sub.classList.contains("nav-submenu") &&
            !sub.classList.contains("max-h-0")
          ) {
            openExpandableIds.add(btn.getAttribute("data-item-id"));
          }
        });
    }

    // SE expand: open if navigating to SE/PP page OR was already open
    var expandAttr = this.getAttribute("data-expand-smart-exchange");
    var pageExpand =
      filename === "supplier-portal.html" ||
      filename === "payment-preferences.html";
    var expand =
      expandAttr == null ? pageExpand || expandSE : expandAttr === "true";

    this.setAttribute("data-page", filename);

    var mobileNav = this.querySelector('[data-nav="mobile"]');
    if (mobileNav) {
      mobileNav.innerHTML = buildNavItems(
        false,
        activeId,
        expand,
        routerMode,
        false,
      );
    }

    desktopNav = this.querySelector('[data-nav="desktop"]');
    if (desktopNav) {
      var indicator = desktopNav.querySelector(
        "#desktop-nav-current-indicator",
      );
      if (indicator) indicator.remove();
      desktopNav.innerHTML = buildNavItems(
        true,
        activeId,
        expand,
        routerMode,
        collapsed,
      );

      // Restore previously-open expandable submenus (without animation)
      if (openExpandableIds.size > 0) {
        desktopNav
          .querySelectorAll("[data-expandable-trigger][data-item-id]")
          .forEach(function (btn) {
            if (!openExpandableIds.has(btn.getAttribute("data-item-id")))
              return;
            var sub = btn.nextElementSibling;
            if (!sub || !sub.classList.contains("nav-submenu")) return;
            sub.classList.remove("max-h-0", "opacity-0", "pointer-events-none");
            sub.classList.add("max-h-96", "opacity-100", "pointer-events-auto");
            var chevron = btn.querySelector(".chevron-icon");
            if (chevron) chevron.classList.add("rotate-180");
          });
      }

      if (indicator) {
        desktopNav.appendChild(indicator);
        void indicator.offsetHeight; // force reflow so browser records current position as transition "from"
      }
    }

    this._attachEventListeners();
  }

  refreshNav(pagePath) {
    this._refreshNavTrees(pagePath);
  }

  refresh(pagePath) {
    this._refreshNavTrees(pagePath);
    if (typeof window.initDashboardSidebar === "function") {
      window.initDashboardSidebar();
    }
  }

  _buildHTML(activeId, expand, routerMode, collapsed) {
    const mobileItems = buildNavItems(
      false,
      activeId,
      expand,
      routerMode,
      false,
    );
    const desktopItems = buildNavItems(
      true,
      activeId,
      expand,
      routerMode,
      collapsed,
    );

    return `<!-- ===== MOBILE SIDEBAR (off-canvas drawer, hidden on lg+) ===== -->
<el-dialog>
<dialog id="sidebar" class="backdrop:bg-transparent lg:hidden">
<el-dialog-backdrop class="fixed inset-0 bg-gray-900/80 transition-opacity duration-300 ease-linear data-closed:opacity-0"></el-dialog-backdrop>
<div tabindex="0" class="fixed inset-0 flex focus:outline-none">
<el-dialog-panel class="group/dialog-panel relative mr-16 flex w-full max-w-[304px] flex-1 transform transition duration-300 ease-in-out data-closed:-translate-x-full">
<div class="absolute top-0 left-full flex w-16 justify-center pt-5 duration-300 ease-in-out group-data-closed/dialog-panel:opacity-0">
<button type="button" command="close" commandfor="sidebar" class="-m-2.5 p-2.5">
<span class="sr-only">Close sidebar</span>
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true" class="size-6 text-white"><path d="M6 18 18 6M6 6l12 12" stroke-linecap="round" stroke-linejoin="round"/></svg>
</button></div>
<div class="flex grow flex-col justify-between overflow-y-auto bg-white p-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden dark:bg-gray-900">
<div class="flex flex-col gap-9">
<div class="flex items-center justify-center px-[2px]">${buildLogoHtml()}</div>
<nav class="relative flex w-full flex-col gap-3" data-nav="mobile">
${mobileItems}
</nav>
${buildHelpBlock("")}
${buildAccountInfoButton(false, "mobile-account-info-panel")}
</div>
${buildFooter("")}
</div>
</el-dialog-panel></div>
</dialog></el-dialog>

<!-- ===== STATIC SIDEBAR FOR DESKTOP (hidden below lg) ===== -->
<div id="desktop-sidebar-shell" class="hidden lg:fixed lg:top-[var(--stp-alert-height,0px)] lg:left-0 lg:z-50 lg:flex lg:h-[calc(100vh-var(--stp-alert-height,0px))] lg:flex-col ${collapsed ? "is-collapsed lg:w-[80px]" : "lg:w-[304px]"}">
<div id="desktop-sidebar-panel" class="flex h-full grow flex-col justify-between overflow-hidden border-r border-gray-200 bg-white dark:border-white/10 dark:bg-gray-900 ${collapsed ? "pt-5 pb-[60px] pl-5 pr-[19px]" : "p-5"}">
<div class="flex min-h-0 flex-1 flex-col gap-9 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
<div id="desktop-logo-row" class="relative flex min-h-10 items-center ${collapsed ? "justify-center" : "justify-start pl-[2px]"}">
<div id="desktop-logo-full" class="${collapsed ? "hidden" : ""} flex min-w-0 flex-1 items-center pr-12">${buildLogoHtml("justify-start")}</div>
<button type="button" id="desktop-sidebar-collapse-btn" data-sidebar-toggle data-sidebar-btn-tooltip="Collapse" aria-label="Collapse sidebar" class="${collapsed ? "hidden " : ""}absolute right-0 top-1/2 flex size-10 -translate-y-1/2 items-center justify-center rounded-md text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-white/10 dark:hover:text-gray-300 transition-colors cursor-pointer">
${SIDEBAR_COLLAPSE_ICON}
</button>
<div id="desktop-logo-mark" class="${collapsed ? "flex" : "hidden"} group/logomark relative size-10 shrink-0 items-center justify-center overflow-hidden">
${activeBrand() === "consumer-portal" ? buildConsumerMarkHtml("size-6") : buildSmartHubMarkHtml()}
<button type="button" data-sidebar-toggle data-sidebar-btn-tooltip="Expand" aria-label="Expand sidebar" class="absolute inset-0 flex items-center justify-center rounded-md text-gray-400 bg-white opacity-0 group-hover/logomark:opacity-100 hover:bg-gray-100 hover:text-gray-700 dark:bg-gray-900 dark:hover:bg-gray-800 dark:hover:text-gray-300 transition-opacity cursor-pointer">${SIDEBAR_EXPAND_ICON}</button>
</div>
</div>
<nav class="relative flex w-full flex-col gap-3${collapsed ? " items-center" : ""}" data-nav="desktop">
${desktopItems}
</nav>
${buildHelpBlock("desktop-sidebar-help", collapsed)}
${buildAccountInfoButton(!!collapsed, "desktop-account-info-panel")}
${accountInfoCollapsedButton(!!collapsed)}
</div>
${buildFooter("desktop-sidebar-footer", collapsed)}
</div>
</div>

`;
  }

  _attachEventListeners() {
    /* Expandable items (Settings, Transcard Only) */
    this.querySelectorAll("[data-expandable-trigger]").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (typeof toggleExpandableItem === "function")
          toggleExpandableItem(btn);
      });
    });

    /* Supplier Portal chevron */
    this.querySelectorAll("[data-chevron-toggle]").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (typeof toggleSmartExchangeSubmenu === "function")
          toggleSmartExchangeSubmenu(btn);
      });
    });
  }

  _refreshThemeLogos() {
    this.querySelectorAll("[data-smart-hub-logo]").forEach(function (node) {
      node.innerHTML = buildFullLogoSvgHtml();
    });
  }
}

if (!customElements.get("app-nav")) {
  customElements.define("app-nav", AppNav);
}
