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
    { type: 'link', id: 'insights', label: 'Insights', href: '#', icon: 'insights' },
    { type: 'divider' },
    { type: 'link', id: 'bills', label: 'Bills/Payables', href: 'bills-and-payables.html', icon: 'bills' },
    { type: 'link', id: 'vendors', label: 'Vendors', href: '#', icon: 'vendors' },
    { type: 'link', id: 'card-manager', label: 'Card Manager', href: '#', icon: 'card-manager' },
    { type: 'divider' },
    { type: 'link', id: 'invoices', label: 'Invoices/Receivables', href: '#', icon: 'invoices' },
    { type: 'link', id: 'customers', label: 'Customers', href: '#', icon: 'customers' },
    { type: 'divider' },
    {
        type: 'smart-exchange',
        id: 'smart-exchange',
        label: 'SMART Exchange',
        href: 'smart-exchange.html',
        icon: 'smart-exchange',
        children: [
            { id: 'payment-preferences', label: 'Payment Preferences', href: 'payment-preferences.html' }
        ]
    },
    { type: 'divider' },
    {
        type: 'link-arrow',
        id: 'my-company-profile',
        label: 'My Company Profile',
        href: 'my-company-profile.html',
        icon: 'my-company-profile'
    },
    {
        type: 'expandable',
        id: 'settings',
        label: 'Settings',
        icon: 'settings',
        children: [
            { id: 'user-management', label: 'User Management', href: '#' }
        ]
    },
    {
        type: 'expandable',
        id: 'transcard-only',
        label: 'Transcard Only',
        icon: 'transcard-only',
        children: [
            { id: 'businesses', label: 'Businesses', href: '#' },
            { id: 'se-recipients', label: 'SMART Exchange Recipients', href: '#' },
            { id: 'tenants', label: 'Tenants', href: '#' },
            { id: 'connections', label: 'Connections', href: '#' },
            { id: 'connectors', label: 'Connectors', href: '#' },
            { id: 'integrations', label: 'Integrations', href: '#' },
            { id: 'message-templates', label: 'Message Templates', href: '#' },
            { id: 'statement-templates', label: 'Statement Templates', href: '#' },
            { id: 'reports', label: 'Reports', href: '#' }
        ]
    }
];

/** Maps page filenames to active nav-item IDs. */
const APP_NAV_PAGE_MAP = {
    'smart-exchange.html': 'smart-exchange',
    'bills-and-payables.html': 'bills',
    'payables-pay.html': 'bills',
    'payment-preferences.html': 'payment-preferences',
    'my-company-profile.html': 'my-company-profile'
};

/* ===== Icon Registry ===== */

const APP_NAV_ICONS = {
    insights: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true" class="{CLS}"><path d="M9.8132 15.9038L9 18.75L8.1868 15.9038C7.75968 14.4089 6.59112 13.2403 5.09619 12.8132L2.25 12L5.09619 11.1868C6.59113 10.7597 7.75968 9.59112 8.1868 8.09619L9 5.25L9.8132 8.09619C10.2403 9.59113 11.4089 10.7597 12.9038 11.1868L15.75 12L12.9038 12.8132C11.4089 13.2403 10.2403 14.4089 9.8132 15.9038Z" stroke-linecap="round" stroke-linejoin="round"/><path d="M18.2589 8.71454L18 9.75L17.7411 8.71454C17.4388 7.50533 16.4947 6.56117 15.2855 6.25887L14.25 6L15.2855 5.74113C16.4947 5.43883 17.4388 4.49467 17.7411 3.28546L18 2.25L18.2589 3.28546C18.5612 4.49467 19.5053 5.43883 20.7145 5.74113L21.75 6L20.7145 6.25887C19.5053 6.56117 18.5612 7.50533 18.2589 8.71454Z" stroke-linecap="round" stroke-linejoin="round"/><path d="M16.8942 20.5673L16.5 21.75L16.1058 20.5673C15.8818 19.8954 15.3546 19.3682 14.6827 19.1442L13.5 18.75L14.6827 18.3558C15.3546 18.1318 15.8818 17.6046 16.1058 16.9327L16.5 15.75L16.8942 16.9327C17.1182 17.6046 17.6454 18.1318 18.3173 18.3558L19.5 18.75L18.3173 19.1442C17.6454 19.3682 17.1182 19.8954 16.8942 20.5673Z" stroke-linecap="round" stroke-linejoin="round"/></svg>',

    bills: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true" class="{CLS}"><path d="M19 19C19 20.1046 18.1046 21 17 21H7C5.89543 21 5 20.1046 5 19V5C5 3.89543 5.89543 3 7 3H12.5858C12.851 3 13.1054 3.10536 13.2929 3.29289L18.7071 8.70711M10 13.8703H19M19 13.8703L16 16.8703M19 13.8703L16 10.8703" stroke-linecap="round" stroke-linejoin="round"/></svg>',

    vendors: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true" class="{CLS}"><path d="M8.25 18.75C8.25 19.5784 7.57843 20.25 6.75 20.25C5.92157 20.25 5.25 19.5784 5.25 18.75M8.25 18.75C8.25 17.9216 7.57843 17.25 6.75 17.25C5.92157 17.25 5.25 17.9216 5.25 18.75M8.25 18.75H14.25M5.25 18.75H3.375C2.75368 18.75 2.25 18.2463 2.25 17.625V14.2504M19.5 18.75C19.5 19.5784 18.8284 20.25 18 20.25C17.1716 20.25 16.5 19.5784 16.5 18.75M19.5 18.75C19.5 17.9216 18.8284 17.25 18 17.25C17.1716 17.25 16.5 17.9216 16.5 18.75M19.5 18.75L20.625 18.75C21.2463 18.75 21.7537 18.2457 21.7154 17.6256C21.5054 14.218 20.3473 11.0669 18.5016 8.43284C18.1394 7.91592 17.5529 7.60774 16.9227 7.57315H14.25M16.5 18.75H14.25M14.25 7.57315V6.61479C14.25 6.0473 13.8275 5.56721 13.263 5.50863C11.6153 5.33764 9.94291 5.25 8.25 5.25C6.55709 5.25 4.88466 5.33764 3.23698 5.50863C2.67252 5.56721 2.25 6.0473 2.25 6.61479V14.2504M14.25 7.57315V14.2504M14.25 18.75V14.2504M14.25 14.2504H2.25" stroke-linecap="round" stroke-linejoin="round"/></svg>',

    'card-manager': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true" class="{CLS}"><path d="M2.25 8.25H21.75M2.25 9H21.75M5.25 14.25H11.25M5.25 16.5H8.25M21.75 11V6.75C21.75 5.50736 20.7426 4.5 19.5 4.5H4.5C3.25736 4.5 2.25 5.50736 2.25 6.75V17.25C2.25 18.4926 3.25736 19.5 4.5 19.5H14M19.5 19.75L19.8942 18.5673C20.1182 17.8954 20.6454 17.3682 21.3173 17.1442L22.5 16.75L21.3173 16.3558C20.6454 16.1318 20.1182 15.6046 19.8942 14.9327L19.5 13.75L19.1058 14.9327C18.8818 15.6046 18.3546 16.1318 17.6827 16.3558L16.5 16.75L17.6827 17.1442C18.3546 17.3682 18.8818 17.8954 19.1058 18.5673L19.5 19.75Z" stroke-linecap="round" stroke-linejoin="round"/></svg>',

    invoices: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true" class="{CLS}"><path d="M19 19C19 20.1046 18.1046 21 17 21H7C5.89543 21 5 20.1046 5 19V5C5 3.89543 5.89543 3 7 3H12.5858C12.851 3 13.1054 3.10536 13.2929 3.29289L18.7071 8.70711M21 13.8703H12M12 13.8703L15 10.8703M12 13.8703L15 16.8703" stroke-linecap="round" stroke-linejoin="round"/></svg>',

    customers: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true" class="{CLS}"><path d="M20.25 14.1499V18.4C20.25 19.4944 19.4631 20.4359 18.3782 20.58C16.2915 20.857 14.1624 21 12 21C9.83757 21 7.70854 20.857 5.62185 20.58C4.5369 20.4359 3.75 19.4944 3.75 18.4V14.1499M20.25 14.1499C20.7219 13.7476 21 13.1389 21 12.4889V8.70569C21 7.62475 20.2321 6.69082 19.1631 6.53086C18.0377 6.36247 16.8995 6.23315 15.75 6.14432M20.25 14.1499C20.0564 14.315 19.8302 14.4453 19.5771 14.5294C17.1953 15.3212 14.6477 15.75 12 15.75C9.35229 15.75 6.80469 15.3212 4.42289 14.5294C4.16984 14.4452 3.94361 14.3149 3.75 14.1499M3.75 14.1499C3.27808 13.7476 3 13.1389 3 12.4889V8.70569C3 7.62475 3.7679 6.69082 4.83694 6.53086C5.96233 6.36247 7.10049 6.23315 8.25 6.14432M15.75 6.14432V5.25C15.75 4.00736 14.7426 3 13.5 3H10.5C9.25736 3 8.25 4.00736 8.25 5.25V6.14432M15.75 6.14432C14.5126 6.0487 13.262 6 12 6C10.738 6 9.48744 6.0487 8.25 6.14432M12 12.75H12.0075V12.7575H12V12.75Z" stroke-linecap="round" stroke-linejoin="round"/></svg>',

    'smart-exchange': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true" class="{CLS}"><path d="M16 9L12 11M16 9L8 5M16 9L20 7M16 9V14.2502M12 11L4 7M12 11V21M4 7L8 5M4 7V17L12 21M8 5L12 3L20 7M20 7V17L12 21M6.57555 15.1007C7.07025 15.3615 7.71135 15.7168 7.71135 15.7168" stroke-linecap="round"/></svg>',

    'my-company-profile': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true" class="{CLS}"><path d="M1.75 20H5.875H6.90625M2.5 2H17.5M3.25 2V20M16.75 2V6.5V8.75M7 5.75H8.5M7 8.75H8.5M7 11.75H8.5M11.5 5.75H13M11.5 8.75H13M19.1554 21.6096C18.3185 20.5051 16.9926 19.7917 15.5 19.7917C14.0074 19.7917 12.6815 20.5051 11.8446 21.6096M19.1554 21.6096C20.2871 20.6022 21 19.1344 21 17.5C21 14.4624 18.5376 12 15.5 12C12.4624 12 10 14.4624 10 17.5C10 19.1344 10.7129 20.6022 11.8446 21.6096M19.1554 21.6096C18.1837 22.4745 16.9032 23 15.5 23C14.0968 23 12.8163 22.4745 11.8446 21.6096M17.3333 16.125C17.3333 17.1375 16.5125 17.9583 15.5 17.9583C14.4875 17.9583 13.6667 17.1375 13.6667 16.125C13.6667 15.1125 14.4875 14.2917 15.5 14.2917C16.5125 14.2917 17.3333 15.1125 17.3333 16.125Z" stroke-linecap="round" stroke-linejoin="round"/></svg>',

    settings: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true" class="{CLS}"><path d="M10.3426 3.94005C10.433 3.39759 10.9023 3 11.4523 3H12.5462C13.0962 3 13.5655 3.39759 13.6559 3.94005L13.8049 4.83386C13.8756 5.25813 14.1886 5.59838 14.5858 5.76332C14.9832 5.92832 15.4396 5.90629 15.7897 5.65617L16.5273 5.12933C16.9748 4.80969 17.5878 4.86042 17.9767 5.24929L18.7502 6.02284C19.1391 6.41171 19.1898 7.02472 18.8702 7.47223L18.3432 8.21007C18.0931 8.56012 18.0711 9.01633 18.236 9.41363C18.4009 9.81078 18.7411 10.1236 19.1652 10.1943L20.0592 10.3433C20.6017 10.4337 20.9993 10.9031 20.9993 11.453V12.547C20.9993 13.0969 20.6017 13.5663 20.0592 13.6567L19.1654 13.8056C18.7411 13.8764 18.4009 14.1893 18.236 14.5865C18.071 14.9839 18.093 15.4403 18.3431 15.7904L18.8698 16.5278C19.1895 16.9753 19.1388 17.5884 18.7499 17.9772L17.9763 18.7508C17.5875 19.1396 16.9745 19.1904 16.5269 18.8707L15.7893 18.3439C15.4393 18.0938 14.983 18.0718 14.5857 18.2367C14.1885 18.4016 13.8756 18.7418 13.8049 19.166L13.6559 20.0599C13.5655 20.6024 13.0962 21 12.5462 21H11.4523C10.9023 21 10.433 20.6024 10.3426 20.0599L10.1936 19.1661C10.1229 18.7419 9.80999 18.4016 9.41275 18.2367C9.01535 18.0717 8.55902 18.0937 8.20887 18.3438L7.47125 18.8707C7.02374 19.1904 6.41073 19.1396 6.02186 18.7507L5.24831 17.9772C4.85944 17.5883 4.80871 16.9753 5.12835 16.5278L5.65539 15.79C5.90543 15.4399 5.92747 14.9837 5.76252 14.5864C5.59764 14.1892 5.25746 13.8764 4.83329 13.8057L3.93932 13.6567C3.39686 13.5663 2.99927 13.0969 2.99927 12.547V11.453C2.99927 10.9031 3.39686 10.4337 3.93932 10.3433L4.83312 10.1944C5.2574 10.1236 5.59765 9.81071 5.76259 9.41347C5.92759 9.01605 5.90556 8.5597 5.65544 8.20954L5.12875 7.47216C4.8091 7.02465 4.85983 6.41164 5.2487 6.02277L6.02225 5.24922C6.41112 4.86036 7.02413 4.80962 7.47164 5.12927L8.20924 5.65613C8.55931 5.90618 9.01555 5.92822 9.41287 5.76326C9.81004 5.59837 10.1229 5.25819 10.1936 4.834L10.3426 3.94005Z" stroke-linecap="round" stroke-linejoin="round"/><path d="M15 12C15 13.6569 13.6568 15 12 15C10.3431 15 8.99997 13.6569 8.99997 12C8.99997 10.3432 10.3431 9.00002 12 9.00002C13.6568 9.00002 15 10.3432 15 12Z" stroke-linecap="round" stroke-linejoin="round"/></svg>',

    'transcard-only': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true" class="{CLS}"><path d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" stroke-linecap="round" stroke-linejoin="round"/></svg>'
};

/* ===== Shared SVG Fragments ===== */

const SVG_CHEVRON_DOWN_TPL = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="chevron-icon size-5 transition-transform {ROT}"><path fill-rule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clip-rule="evenodd"/></svg>';

const SVG_CHEVRON_RIGHT = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="size-5 text-gray-400 dark:text-gray-500"><path fill-rule="evenodd" d="M8.22 5.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L11.94 10 8.22 6.28a.75.75 0 0 1 0-1.06Z" clip-rule="evenodd"/></svg>';

const SVG_ARROW_UP_RIGHT = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="chevron-icon size-5 text-gray-500 transition-transform dark:text-gray-400"><path fill-rule="evenodd" clip-rule="evenodd" d="M5.21967 14.7803C5.51256 15.0732 5.98744 15.0732 6.28033 14.7803L13.5 7.56066V13.25C13.5 13.6642 13.8358 14 14.25 14C14.6642 14 15 13.6642 15 13.25V5.75C15 5.33579 14.6642 5 14.25 5H6.75C6.33579 5 6 5.33579 6 5.75C6 6.16421 6.33579 6.5 6.75 6.5H12.4393L5.21967 13.7197C4.92678 14.0126 4.92678 14.4874 5.21967 14.7803Z"/></svg>';

const LOGO_HTML =
    '<img src="../../../assets/img/smart-hub.svg" alt="SMART Hub" class="h-8 w-auto dark:hidden"/>' +
    '<img src="../../../assets/img/smart-hub-dark.svg" alt="SMART Hub" class="hidden h-8 w-auto dark:block"/>';

const TRANSCARD_LOGO_SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="12" viewBox="0 0 64 12" fill="none" class="mb-0.5 text-black dark:text-white"><path d="M0 2.8782H3.2576V7.37029V11.8624H5.19674V7.37029V2.8782H8.45435V1.19781H0V2.8782Z" fill="currentColor"/><path d="M12.598 3.69985C12.4327 3.67405 12.2675 3.65194 12.1059 3.6372C11.9443 3.62246 11.801 3.61509 11.6799 3.61509C11.0775 3.61141 10.4789 3.67037 9.89129 3.79197C9.43589 3.88779 8.98783 4.01308 8.54712 4.17154V11.8696H10.4018V5.39498C10.5597 5.34707 10.7213 5.3139 10.8866 5.28811C11.1033 5.24757 11.3199 5.22546 11.5403 5.22546C11.8561 5.22178 12.172 5.25126 12.4842 5.31022C12.7008 5.35075 12.9138 5.40603 13.1232 5.47236L13.4427 3.89147C13.3509 3.85831 13.2297 3.82514 13.0754 3.79197C12.9175 3.75512 12.7596 3.72564 12.598 3.69985Z" fill="currentColor"/><path d="M19.5607 4.48129C19.2889 4.19017 18.9437 3.96906 18.5691 3.84009C18.0806 3.67794 17.5701 3.60056 17.0597 3.6153C16.5932 3.61161 16.1231 3.65583 15.6641 3.73691C15.3299 3.79218 14.9956 3.87325 14.6651 3.97643L14.621 3.99117L14.8598 5.56101L14.9222 5.5389C15.194 5.44677 15.4768 5.37676 15.7559 5.33622C16.1268 5.27357 16.5088 5.24409 16.887 5.24778C17.1405 5.24041 17.3902 5.27726 17.6289 5.36202C17.9852 5.49099 18.2496 5.78948 18.3414 6.15799C18.3891 6.34593 18.4148 6.54492 18.4148 6.74023V6.9687C18.2055 6.9208 17.9925 6.88395 17.7795 6.85815C17.5701 6.83236 17.3608 6.8213 17.1515 6.8213C17.1441 6.8213 17.1405 6.8213 17.1331 6.8213C16.7254 6.8213 16.3178 6.86552 15.9211 6.94659C15.5502 7.02029 15.1976 7.16401 14.8745 7.36669C14.577 7.562 14.3272 7.82732 14.1546 8.14055C13.9673 8.498 13.8755 8.89599 13.8902 9.29766C13.8755 9.7067 13.9526 10.1194 14.1179 10.499C14.2648 10.8122 14.4925 11.0886 14.7716 11.295C15.0764 11.5087 15.4107 11.6561 15.7742 11.7372C16.1966 11.8293 16.6263 11.8772 17.056 11.8735C17.089 11.8735 17.1184 11.8735 17.1515 11.8735C17.7501 11.8735 18.3561 11.8293 18.951 11.7445C19.5203 11.6598 19.9316 11.5898 20.2034 11.5271L20.2475 11.5161V6.75128C20.2512 6.32382 20.1997 5.89635 20.0896 5.47994C19.9941 5.11143 19.8141 4.76504 19.5607 4.48129ZM18.4112 8.33955V10.2484C18.0145 10.3111 17.6105 10.3405 17.2102 10.3295H17.1551C16.7401 10.3221 16.4096 10.241 16.1635 10.0936C15.9175 9.94255 15.7889 9.6588 15.7889 9.25344C15.7816 9.07287 15.8293 8.89599 15.9285 8.74122C16.024 8.60487 16.1525 8.49432 16.2994 8.4243C16.4684 8.34323 16.6446 8.29164 16.832 8.26584C17.2286 8.20688 17.6326 8.20688 18.0329 8.26584C18.1541 8.28058 18.2826 8.30638 18.4112 8.33955Z" fill="currentColor"/><path d="M27.6177 4.63596C27.3386 4.30062 26.975 4.04266 26.5673 3.88421C26.0422 3.6889 25.4839 3.59677 24.9257 3.61151C24.2903 3.60783 23.6513 3.65573 23.0233 3.75154C22.5532 3.82156 22.0868 3.92106 21.6277 4.04635V11.866H23.4824V5.34717C23.6072 5.32506 23.7945 5.29927 24.0516 5.26979C24.294 5.24031 24.5401 5.22557 24.7898 5.22188C25.0652 5.21451 25.337 5.25873 25.5941 5.35086C25.8071 5.43193 25.9871 5.57933 26.1156 5.76727C26.2552 5.99206 26.3507 6.24633 26.3911 6.50797C26.4535 6.87279 26.4792 7.2413 26.4755 7.61349V11.855H28.3339V7.31868C28.3375 6.81383 28.2825 6.30897 28.1723 5.81518C28.0768 5.38771 27.8895 4.98235 27.6177 4.63596Z" fill="currentColor"/><path d="M35.1506 8.64496C35.0588 8.39069 34.9082 8.15485 34.7173 7.96691C34.4969 7.75317 34.2472 7.57629 33.9754 7.44363C33.6228 7.26675 33.2592 7.10829 32.892 6.97194C32.6753 6.89824 32.4623 6.81348 32.2493 6.71399C32.1024 6.64766 31.9591 6.5629 31.8306 6.46709C31.7425 6.40076 31.669 6.31232 31.6213 6.2165C31.5772 6.11701 31.5588 6.00646 31.5588 5.8959C31.5515 5.6748 31.6727 5.47212 31.8673 5.37631C32.1317 5.24733 32.4292 5.18469 32.7304 5.19574C33.083 5.19206 33.4355 5.22891 33.7807 5.30629C34.0342 5.36525 34.2839 5.44633 34.5226 5.54951L34.5814 5.5753L34.9303 4.00915L34.8862 3.99441C34.5814 3.88755 34.2655 3.80648 33.9497 3.74751C33.52 3.66276 33.0793 3.61854 32.6422 3.62222C31.7388 3.62222 31.0153 3.83596 30.4864 4.25237C29.9539 4.67246 29.6858 5.25102 29.6858 5.97698C29.6748 6.30495 29.7335 6.62555 29.8584 6.92772C29.9686 7.18199 30.1302 7.40678 30.3358 7.59103C30.5489 7.78265 30.7912 7.94111 31.0483 8.0664C31.3385 8.21012 31.6433 8.33541 31.9444 8.44596C32.4696 8.64127 32.8479 8.82553 33.0756 8.99135C33.2776 9.12033 33.3951 9.34143 33.3951 9.58465V9.58833C33.4135 9.80944 33.296 10.0195 33.1013 10.1227C32.8956 10.2332 32.5541 10.2885 32.095 10.2885C32.084 10.2885 32.0767 10.2885 32.0656 10.2885C31.6543 10.2885 31.243 10.2369 30.8463 10.1337C30.5231 10.049 30.2073 9.94578 29.9025 9.82786L29.8437 9.80207L29.5132 11.4088L29.5573 11.4235C29.8437 11.5304 30.1375 11.6262 30.435 11.6999C30.9198 11.8141 31.4193 11.8731 31.9187 11.8731C31.9738 11.8731 32.0289 11.8731 32.084 11.8694H32.0877C33.105 11.8694 33.8983 11.6741 34.4528 11.2871C35.0111 10.8965 35.2939 10.3143 35.2939 9.55885C35.2939 9.24562 35.2498 8.93976 35.1506 8.64496Z" fill="currentColor"/><path d="M41.8496 9.89443C41.6366 9.98287 41.3795 10.0566 41.0894 10.1155C40.7992 10.1745 40.4981 10.204 40.1969 10.204C39.4 10.204 38.827 9.98287 38.4965 9.55172C38.1623 9.1132 37.9897 8.50885 37.9897 7.75341C37.9897 6.96849 38.1696 6.35309 38.5259 5.92562C38.8784 5.50184 39.4 5.28442 40.0794 5.28442C40.3695 5.28442 40.645 5.3139 40.9021 5.37286C41.1591 5.43182 41.3942 5.50552 41.5962 5.59397L41.6549 5.61976L42.0663 4.04256L42.0222 4.02413C41.3685 3.75512 40.6633 3.61877 39.9325 3.61877C39.3375 3.61877 38.7903 3.72564 38.3129 3.93569C37.8354 4.14574 37.4241 4.44054 37.0899 4.80905C36.7557 5.17755 36.4949 5.61976 36.3186 6.12461C36.1387 6.62947 36.0505 7.17486 36.0505 7.75341C36.0505 8.33933 36.1313 8.89209 36.2893 9.39326C36.4472 9.89811 36.6932 10.3403 37.0164 10.7051C37.3396 11.07 37.7546 11.3611 38.2504 11.5638C38.7426 11.7701 39.3302 11.8733 39.9949 11.8733C40.4209 11.8733 40.8396 11.8328 41.2399 11.7554C41.6403 11.6743 41.9487 11.5859 42.1471 11.4827L42.1838 11.4643L41.9157 9.87232L41.8496 9.89443Z" fill="currentColor"/><path d="M48.7158 4.48129C48.444 4.19017 48.0988 3.96906 47.7242 3.84009C47.2357 3.67794 46.7252 3.60056 46.2147 3.6153C45.7483 3.61161 45.2782 3.65215 44.8154 3.73322C44.4812 3.7885 44.147 3.86957 43.8202 3.97275L43.7761 3.98749L44.0111 5.55732L44.0736 5.53521C44.3454 5.44309 44.6245 5.37307 44.9073 5.33254C45.2782 5.26989 45.6601 5.24041 46.0384 5.24409C46.2918 5.23672 46.5416 5.27358 46.7803 5.35833C47.1365 5.48731 47.401 5.7858 47.4928 6.1543C47.5405 6.34224 47.5662 6.54124 47.5662 6.73654V6.96502C47.3569 6.91711 47.1439 6.88026 46.9309 6.85447C46.7179 6.82867 46.5085 6.81762 46.3029 6.81762C46.2992 6.81762 46.2992 6.81762 46.2955 6.81762C45.8842 6.81762 45.4692 6.86184 45.0689 6.94659C44.6979 7.02029 44.3454 7.16401 44.0222 7.36669C43.7247 7.562 43.4749 7.82732 43.3023 8.14055C43.115 8.498 43.0232 8.89599 43.0379 9.29766C43.0269 9.7067 43.104 10.1231 43.2729 10.499C43.4199 10.8122 43.6476 11.0886 43.9267 11.295C44.2315 11.5087 44.5694 11.6561 44.9293 11.7372C45.348 11.8293 45.7813 11.8772 46.211 11.8735C46.2441 11.8735 46.2735 11.8735 46.3065 11.8735C46.9052 11.8735 47.5111 11.8293 48.1061 11.7445C48.6754 11.6598 49.0867 11.5898 49.3585 11.5271L49.4025 11.5161V6.75128C49.4062 6.32382 49.3548 5.89267 49.2446 5.47994C49.1455 5.11143 48.9655 4.76504 48.7158 4.48129ZM47.5626 8.33955V10.2484C47.1659 10.3111 46.7619 10.3405 46.3616 10.3295H46.3065C45.8915 10.3221 45.561 10.241 45.3149 10.0936C45.0689 9.94255 44.9403 9.6588 44.9403 9.25344C44.933 9.07287 44.9807 8.89599 45.0799 8.74122C45.1754 8.60487 45.3039 8.49432 45.4508 8.4243C45.6198 8.34323 45.796 8.29164 45.9833 8.26584C46.38 8.20688 46.784 8.20688 47.1843 8.26584C47.3092 8.28058 47.4377 8.30638 47.5626 8.33955Z" fill="currentColor"/><path d="M54.829 3.69985C54.6637 3.67405 54.4984 3.65194 54.3368 3.6372C54.1752 3.62246 54.032 3.61509 53.9108 3.61509C53.3085 3.61141 52.7099 3.67037 52.1222 3.79197C51.6668 3.88779 51.2188 4.01308 50.7781 4.17154V11.8696H52.6327V5.39498C52.7907 5.34707 52.9523 5.3139 53.1175 5.28811C53.3342 5.24757 53.5509 5.22546 53.7713 5.22546C54.0871 5.22178 54.4029 5.25126 54.7151 5.31022C54.9318 5.35075 55.1448 5.40603 55.3541 5.47236L55.6737 3.89147C55.5818 3.85831 55.4606 3.82514 55.3064 3.79197C55.1485 3.75512 54.9942 3.72564 54.829 3.69985Z" fill="currentColor"/><path d="M63.1198 11.3242V10.7714L63.1235 0L61.2247 0.316915V4.01303C61.0081 3.90985 60.784 3.82141 60.5563 3.75139C60.2295 3.65558 59.8879 3.60767 59.55 3.61504C59.0359 3.60399 58.5364 3.70349 58.0626 3.90985C57.6403 4.10147 57.2583 4.39259 56.9645 4.75373C56.6487 5.14066 56.421 5.57918 56.2814 6.05824C56.1198 6.60731 56.0427 7.1785 56.05 7.74968C56.0427 8.33192 56.1345 8.90679 56.3255 9.45955C56.4981 9.94598 56.7662 10.3845 57.1224 10.7604C57.4713 11.1215 57.9047 11.4053 58.3748 11.5858C58.8853 11.7775 59.4178 11.8733 59.9614 11.8733C59.9871 11.8733 60.0128 11.8733 60.0385 11.8733C60.6077 11.8733 61.1807 11.829 61.7389 11.7406C62.1906 11.6706 62.6424 11.5711 63.0794 11.4421L63.1198 11.4311V11.3242ZM61.2211 10.086C61.0742 10.1155 60.9236 10.1413 60.773 10.156C60.5343 10.1818 60.2882 10.1966 60.0458 10.1929C59.4068 10.1929 58.8963 9.97177 58.5364 9.53694C58.1802 9.10947 57.9965 8.5088 57.9892 7.75705H57.9929V7.70178C57.9929 6.95371 58.1398 6.35304 58.4299 5.91821C58.72 5.49074 59.1828 5.27332 59.8145 5.27332C59.8181 5.27332 59.8255 5.27332 59.8292 5.27332C60.1046 5.27332 60.3727 5.32123 60.6335 5.41335C60.8428 5.48337 61.0411 5.57918 61.2247 5.6971V10.086H61.2211Z" fill="currentColor"/></svg>';

const TRANSCARD_SHIELD_SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M8.91309 1.125C11.4548 3.2985 15.5771 3.43066 15.5771 3.43066V9.22656C15.5767 12.7831 8.91309 16.875 8.91309 16.875C8.86421 16.8449 2.25042 12.77 2.25 9.22656V3.43066C2.25 3.43066 6.37134 3.29832 8.91309 1.125ZM7.2793 9.90918C7.2091 9.94947 7.16702 10.0229 7.16699 10.1035V12.5801C7.16699 12.6002 7.17163 12.6209 7.18164 12.6377C7.21173 12.6914 7.28048 12.708 7.33398 12.6777L11.2783 10.3828C11.3134 10.3627 11.3352 10.3254 11.3369 10.2852V7.54785L7.2793 9.90918ZM7.33398 5.21191C7.28052 5.18171 7.21343 5.19831 7.18164 5.25195C7.17161 5.26875 7.16699 5.28942 7.16699 5.30957V7.78613C7.16699 7.86667 7.2082 7.94112 7.27832 7.98145L8.46582 8.6709L10.8701 7.27051L7.33398 5.21191Z" fill="#0089CF"/></svg>';

const HELP_ICON_SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 18 18" fill="none" class="text-gray-500 dark:text-gray-400"><path fill-rule="evenodd" clip-rule="evenodd" d="M16.2 9.00005C16.2 12.9765 12.9765 16.2 9.00005 16.2C5.0236 16.2 1.80005 12.9765 1.80005 9.00005C1.80005 5.0236 5.0236 1.80005 9.00005 1.80005C12.9765 1.80005 16.2 5.0236 16.2 9.00005ZM9.90005 5.40005C9.90005 5.8971 9.4971 6.30005 9.00005 6.30005C8.50299 6.30005 8.10005 5.8971 8.10005 5.40005C8.10005 4.90299 8.50299 4.50005 9.00005 4.50005C9.4971 4.50005 9.90005 4.90299 9.90005 5.40005ZM8.10005 8.10005C7.72726 8.10005 7.42505 8.40226 7.42505 8.77505C7.42505 9.14784 7.72726 9.45005 8.10005 9.45005H8.32809C8.47204 9.45005 8.57896 9.58334 8.54774 9.72386L8.13451 11.5834C7.91593 12.567 8.6644 13.5 9.672 13.5H9.90005C10.2728 13.5 10.575 13.1978 10.575 12.825C10.575 12.4523 10.2728 12.15 9.90005 12.15H9.672C9.52806 12.15 9.42114 12.0168 9.45236 11.8762L9.86559 10.0167C10.0842 9.03311 9.3357 8.10005 8.32809 8.10005H8.10005Z" fill="currentColor"/></svg>';

/* ===== Helpers ===== */

function navLinkCls(id, activeId, extra) {
    const base = 'nav-item group flex h-10 items-center justify-between rounded-md px-2 text-base font-medium transition-colors cursor-pointer focus-visible:outline-none';
    const active = 'is-active bg-gray-100 text-gray-900 hover:bg-gray-100 hover:text-gray-900 focus-visible:bg-gray-100 focus-visible:text-gray-900 dark:bg-white/10 dark:text-white dark:hover:bg-white/10 dark:hover:text-white dark:focus-visible:bg-white/10 dark:focus-visible:text-white';
    const inactive = 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 focus-visible:bg-gray-100 focus-visible:text-gray-900 dark:text-gray-300 dark:hover:bg-white/10 dark:hover:text-white dark:focus-visible:bg-white/10 dark:focus-visible:text-white';
    return `${base} ${id === activeId ? active : inactive}${extra ? ' ' + extra : ''}`;
}

function navIconCls(id, activeId) {
    const base = 'nav-icon size-6 shrink-0';
    const active = 'text-blue-600 dark:text-blue-400';
    const inactive = 'text-gray-500 group-hover:text-blue-600 group-focus-visible:text-blue-600 dark:text-gray-400 dark:group-hover:text-blue-400 dark:group-focus-visible:text-blue-400';
    return `${base} ${id === activeId ? active : inactive}`;
}

function renderIcon(key, cls) {
    return (APP_NAV_ICONS[key] || '').replace('{CLS}', cls);
}

/* ===== Item Builders ===== */

function buildDivider() {
    return '<div class="my-1 h-px bg-gray-200 dark:bg-white/10"></div>';
}

function buildSubmenuItems(children, activeId) {
    return children.map(child => {
        const isActive = child.id === activeId;
        const cls = 'nav-item group flex h-10 items-center rounded-md px-3 text-base font-medium transition-colors cursor-pointer focus-visible:outline-none ' +
            (isActive
                ? 'is-active bg-gray-100 text-gray-900 hover:bg-gray-100 hover:text-gray-900 focus-visible:bg-gray-100 focus-visible:text-gray-900 dark:bg-white/10 dark:text-white dark:hover:bg-white/10 dark:hover:text-white dark:focus-visible:bg-white/10 dark:focus-visible:text-white'
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 focus-visible:bg-gray-100 focus-visible:text-gray-900 dark:text-gray-400 dark:hover:bg-white/10 dark:hover:text-white dark:focus-visible:bg-white/10 dark:focus-visible:text-white');
        const ariaCurrent = isActive ? ' aria-current="page"' : '';
        return `<a href="${child.href || '#'}" class="${cls}"${ariaCurrent}>${child.label}</a>`;
    }).join('\n');
}

function buildSubmenu(children, activeId, expanded) {
    const openCls = expanded
        ? 'nav-submenu ml-9 flex flex-col overflow-hidden max-h-96 opacity-100 pointer-events-auto transition-all duration-400 ease-in-out'
        : 'nav-submenu ml-9 flex flex-col overflow-hidden max-h-0 opacity-0 pointer-events-none transition-all duration-400 ease-in-out';
    return `<div class="${openCls}">${buildSubmenuItems(children, activeId)}</div>`;
}

function buildNavLink(item, activeId) {
    const ariaCurrent = item.id === activeId ? ' aria-current="page"' : '';
    return `<a href="${item.href}" class="${navLinkCls(item.id, activeId)}"${ariaCurrent}>
<span class="flex items-center gap-3">${renderIcon(item.icon, navIconCls(item.id, activeId))} ${item.label}</span>
</a>`;
}

function buildNavLinkArrow(item, activeId, isDesktop) {
    const ariaCurrent = item.id === activeId ? ' aria-current="page"' : '';
    const trailingIcon = isDesktop ? SVG_ARROW_UP_RIGHT : SVG_CHEVRON_RIGHT;
    return `<a href="${item.href}" class="${navLinkCls(item.id, activeId)}"${ariaCurrent}>
<span class="flex items-center gap-3">${renderIcon(item.icon, navIconCls(item.id, activeId))} ${item.label}</span>
${trailingIcon}
</a>`;
}

function buildSmartExchangeItem(item, activeId, expand) {
    const isActive = item.id === activeId;
    const linkCls = 'nav-item ' + (isActive ? 'is-active ' : '') +
        'flex flex-1 h-full items-center gap-3 rounded-md px-2 text-base font-medium transition-colors cursor-pointer focus-visible:outline-none ' +
        (isActive
            ? 'bg-gray-100 text-gray-900 hover:bg-gray-100 hover:text-gray-900 dark:bg-white/10 dark:text-white dark:hover:bg-white/10 dark:hover:text-white'
            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-white/10 dark:hover:text-white');
    const iconCls = isActive
        ? 'nav-icon size-6 shrink-0 text-blue-600 dark:text-blue-400'
        : 'nav-icon size-6 shrink-0 text-gray-500 dark:text-gray-400';
    const ariaCurrent = isActive ? ' aria-current="page"' : '';
    const chevron = SVG_CHEVRON_DOWN_TPL.replace('{ROT}', expand ? 'rotate-180' : '');
    return `<div class="flex h-10 items-center gap-1" data-smart-exchange-trigger>
<a href="${item.href}" class="${linkCls}"${ariaCurrent}>${renderIcon(item.icon, iconCls)} ${item.label}</a>
<button type="button" data-chevron-toggle aria-label="Toggle SMART Exchange submenu"
  class="flex size-8 items-center justify-center rounded-md text-gray-600 hover:bg-gray-200 hover:text-gray-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/30 transition-colors dark:text-gray-400 dark:hover:bg-white/20 dark:hover:text-gray-300 cursor-pointer">
${chevron}
</button>
</div>
${buildSubmenu(item.children, activeId, expand)}`;
}

function buildExpandableItem(item, activeId) {
    const chevronCls = 'chevron-icon size-5 text-gray-500 transition-transform dark:text-gray-400';
    return `<button type="button" class="${navLinkCls(item.id, activeId, 'w-full')}" data-expandable-trigger>
<span class="flex items-center gap-3">${renderIcon(item.icon, navIconCls(item.id, activeId))} ${item.label}</span>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="${chevronCls}"><path fill-rule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clip-rule="evenodd"/></svg>
</button>
${buildSubmenu(item.children, activeId, false)}`;
}

function buildNavItems(isDesktop, activeId, expand) {
    return APP_NAV_DATA.map(item => {
        switch (item.type) {
            case 'divider':        return buildDivider();
            case 'link':           return buildNavLink(item, activeId);
            case 'link-arrow':     return buildNavLinkArrow(item, activeId, isDesktop);
            case 'smart-exchange': return buildSmartExchangeItem(item, activeId, expand);
            case 'expandable':     return buildExpandableItem(item, activeId);
            default:               return '';
        }
    }).join('\n');
}

/* ===== Shared Block HTML ===== */

function buildHelpBlock(id) {
    const wrap = id ? `id="${id}" ` : '';
    return `<div ${wrap}class="flex flex-col gap-2">
<div class="h-px bg-gray-200 dark:bg-white/10"></div>
<button class="self-start inline-flex items-center gap-2 rounded-md px-2.5 py-1.5 text-sm font-semibold text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-colors dark:text-gray-300 dark:hover:bg-white/10 dark:hover:text-gray-100 cursor-pointer">
${HELP_ICON_SVG}Help from Transcard</button></div>`;
}

function buildFooter(id) {
    const wrap = id ? `id="${id}" ` : '';
    return `<div ${wrap}class="flex flex-col items-center gap-2 pt-4 pb-4">
<div class="flex items-center gap-1">
${TRANSCARD_SHIELD_SVG}
<span class="text-xs font-medium text-gray-800 dark:text-gray-300">Powered by </span>
${TRANSCARD_LOGO_SVG}
</div>
<div class="flex items-center gap-2 text-xs font-medium text-gray-700 dark:text-gray-400">
<a href="#" class="hover:text-gray-900 dark:hover:text-white transition-colors">Terms of Use</a>
<span class="text-gray-300 dark:text-gray-600">|</span>
<a href="#" class="hover:text-gray-900 dark:hover:text-white transition-colors">Privacy Policy</a>
</div></div>`;
}

/* ===== AppNav Web Component ===== */

class AppNav extends HTMLElement {
    connectedCallback() {
        const filename = window.location.pathname.split('/').pop() || '';
        const activeId = APP_NAV_PAGE_MAP[filename] || null;
        const expand = (filename === 'smart-exchange.html' || filename === 'payment-preferences.html');

        this.innerHTML = this._buildHTML(activeId, expand);
        this._attachEventListeners();
    }

    _buildHTML(activeId, expand) {
        const mobileItems = buildNavItems(false, activeId, expand);
        const desktopItems = buildNavItems(true, activeId, expand);

        return `<!-- ===== MOBILE SIDEBAR (off-canvas drawer, hidden on lg+) ===== -->
<el-dialog>
<dialog id="sidebar" class="backdrop:bg-transparent lg:hidden">
<el-dialog-backdrop class="fixed inset-0 bg-gray-900/80 transition-opacity duration-300 ease-linear data-closed:opacity-0"></el-dialog-backdrop>
<div tabindex="0" class="fixed inset-0 flex focus:outline-none">
<el-dialog-panel class="group/dialog-panel relative mr-16 flex w-full max-w-[360px] flex-1 transform transition duration-300 ease-in-out data-closed:-translate-x-full">
<div class="absolute top-0 left-full flex w-16 justify-center pt-5 duration-300 ease-in-out group-data-closed/dialog-panel:opacity-0">
<button type="button" command="close" commandfor="sidebar" class="-m-2.5 p-2.5">
<span class="sr-only">Close sidebar</span>
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true" class="size-6 text-white"><path d="M6 18 18 6M6 6l12 12" stroke-linecap="round" stroke-linejoin="round"/></svg>
</button></div>
<div class="flex grow flex-col justify-between overflow-y-auto bg-white dark:bg-gray-900 px-6 pt-6 pb-6">
<div class="flex flex-col gap-9">
<div class="flex items-center justify-between px-1">${LOGO_HTML}</div>
<nav class="flex flex-col" data-nav="mobile">
${mobileItems}
</nav>
${buildHelpBlock('')}
</div>
${buildFooter('')}
</div>
</el-dialog-panel></div>
</dialog></el-dialog>

<!-- ===== STATIC SIDEBAR FOR DESKTOP (hidden below lg) ===== -->
<div id="desktop-sidebar-shell" class="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-[360px] lg:flex-col">
<div id="desktop-sidebar-panel" class="flex grow flex-col justify-between overflow-y-auto border-r border-gray-200 bg-white px-6 pt-6 pb-6 dark:border-white/10 dark:bg-gray-900">
<div class="flex flex-col gap-9">
<div id="desktop-logo-row" class="relative flex items-center justify-between px-1">
<div id="desktop-logo-full">${LOGO_HTML}</div>
<img id="desktop-logo-mark" src="../../../assets/img/smart-hub-mark.svg" alt="SMART Hub" class="hidden h-8 w-8 shrink-0"/>
</div>
<nav class="flex flex-col" data-nav="desktop">
${desktopItems}
</nav>
${buildHelpBlock('desktop-sidebar-help')}
</div>
${buildFooter('desktop-sidebar-footer')}
</div>
</div>

<!-- ===== SIDEBAR COLLAPSE TOGGLE BUTTON ===== -->
<button id="desktop-sidebar-toggle" type="button"
  class="hidden lg:flex fixed top-[30px] left-[344px] z-[70] rounded-sm bg-white px-1 py-1 text-sm font-semibold text-gray-900 shadow-xs inset-ring inset-ring-gray-300 hover:bg-gray-50 dark:bg-gray-800 dark:text-white dark:shadow-none dark:inset-ring-gray-700 dark:hover:bg-gray-700 items-center justify-center transition-colors cursor-pointer">
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="size-4 text-gray-700 dark:text-gray-300 transition-transform duration-200 ease-out" id="desktop-sidebar-toggle-icon">
<path fill-rule="evenodd" d="M11.78 5.22a.75.75 0 0 1 0 1.06L8.06 10l3.72 3.72a.75.75 0 1 1-1.06 1.06l-4.25-4.25a.75.75 0 0 1 0-1.06l4.25-4.25a.75.75 0 0 1 1.06 0Z" clip-rule="evenodd"/>
</svg>
</button>`;
    }

    _attachEventListeners() {
        /* Expandable items (Settings, Transcard Only) */
        this.querySelectorAll('[data-expandable-trigger]').forEach(btn => {
            btn.addEventListener('click', () => {
                if (typeof toggleExpandableItem === 'function') toggleExpandableItem(btn);
            });
        });

        /* SMART Exchange chevron */
        this.querySelectorAll('[data-chevron-toggle]').forEach(btn => {
            btn.addEventListener('click', () => {
                if (typeof toggleSmartExchangeSubmenu === 'function') toggleSmartExchangeSubmenu(btn);
            });
        });
    }
}

customElements.define('app-nav', AppNav);
