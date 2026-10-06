/**
 * app-plans.js
 * Single source of truth for businesses, plans and what each plan can see.
 *
 * A BUSINESS is the tenant. A business is on a PLAN. A plan is a named set of
 * CAPABILITIES. Every module declares which capability it needs, so nav,
 * routing and page access all derive from one place — adding or gating a
 * module never means editing navigation in two files.
 *
 * Module state resolves to one of three values:
 *   'enabled'  normal
 *   'locked'   visible, carries an Upgrade badge, routes to its upgrade page
 *   'hidden'   absent, and unreachable by direct URL
 */
window.AppPlans = (function () {
  'use strict';

  /**
   * Canonical module registry. `nav` describes the module's contribution to the
   * sidebar; `byPlan` lets a module present differently under a given plan
   * without the shell special-casing it.
   */
  var MODULES = [
    { id: 'insights', capability: 'insights', order: 10,
      nav: { type: 'link', label: 'Insights', href: '#', icon: 'insights' } },

    { id: 'ap-ar', capability: 'ap-ar', order: 20, upgradeHref: 'ap-ar-payments.html',
      nav: { type: 'link', label: 'AP/AR Payments', href: 'ap-ar-payments.html', icon: 'invoices' } },

    { id: 'bills', capability: 'payables', order: 30, dividerBefore: true,
      nav: { type: 'link', label: 'Bills/Payables', href: 'bills-and-payables.html', icon: 'bills' } },
    { id: 'vendors', capability: 'payables', order: 31,
      nav: { type: 'link', label: 'Vendors', href: 'vendors.html', icon: 'vendors' } },
    { id: 'card-manager', capability: 'payables', order: 32,
      nav: { type: 'link', label: 'Card Manager', href: '#', icon: 'card-manager' } },

    { id: 'invoices', capability: 'receivables', order: 40, dividerBefore: true,
      nav: { type: 'link', label: 'Invoices/Receivables', href: '#', icon: 'invoices' } },
    { id: 'customers', capability: 'receivables', order: 41,
      nav: { type: 'link', label: 'Customers', href: '#', icon: 'customers' } },

    // Under the supplier-portal plan this module is the product itself, so it
    // is simply "Payments" and its child is promoted alongside it.
    { id: 'supplier-portal', capability: 'supplier-portal', order: 50, dividerBefore: true,
      nav: { type: 'smart-exchange', label: 'Supplier Portal', href: 'supplier-portal.html', icon: 'smart-exchange' },
      byPlan: { 'supplier-portal': { nav: { type: 'link', label: 'Payments' } } } },

    { id: 'payment-preferences', capability: 'supplier-portal', order: 51, parent: 'supplier-portal',
      nav: { label: 'Payment Preferences', href: 'payment-preferences.html', icon: 'payment-preferences' },
      byPlan: { 'supplier-portal': { parent: null, nav: { type: 'link' } } } },

    { id: 'my-company-profile', capability: 'core', order: 60, dividerBefore: true,
      nav: { type: 'link-arrow', label: 'My Company Profile', href: 'my-company-profile.html', icon: 'my-company-profile' } },

    { id: 'settings', capability: 'core', order: 61,
      nav: { type: 'expandable', label: 'Settings', icon: 'settings',
             children: [{ id: 'user-management', label: 'User Management', href: '#' }] } },

    // Consumer Portal: a person or business holding the Smart Disburse tokens
    // they've been sent. Its own product, so its own modules and capability.
    { id: 'cp-insights', capability: 'consumer', order: 80,
      nav: { type: 'link', label: 'Insights', href: '#', icon: 'insights' } },
    { id: 'payments-received', capability: 'consumer', order: 81,
      nav: { type: 'link', label: 'Payments Received', href: 'consumer-payments-received.html', icon: 'payments-received' } },
    { id: 'my-cards', capability: 'consumer', order: 82,
      nav: { type: 'link', label: 'My Cards', href: 'consumer-my-cards.html', icon: 'card-manager' } },
    { id: 'cp-payment-preferences', capability: 'consumer', order: 83,
      nav: { type: 'link', label: 'Payment Preferences', href: 'consumer-payment-preferences.html', icon: 'payment-preferences' } },
    { id: 'my-profile', capability: 'consumer', order: 84,
      nav: { type: 'link', label: 'My Profile', href: 'consumer-my-profile.html', icon: 'my-profile' } },

    { id: 'transcard-only', capability: 'transcard-admin', order: 70,
      nav: { type: 'expandable', label: 'Transcard Only', icon: 'transcard-only', children: [
        { id: 'businesses', label: 'Businesses', href: '#' },
        { id: 'se-recipients', label: 'Supplier Portal Recipients', href: '#' },
        { id: 'tenants', label: 'Tenants', href: '#' },
        { id: 'connections', label: 'Connections', href: '#' },
        { id: 'connectors', label: 'Connectors', href: '#' },
        { id: 'integrations', label: 'Integrations', href: '#' },
        { id: 'message-templates', label: 'Message Templates', href: '#' },
        { id: 'statement-templates', label: 'Statement Templates', href: '#' },
        { id: 'reports', label: 'Reports', href: '#' },
        { id: 'payment-program-config', label: 'Payment Program Configuration', href: 'payment-program-configuration.html' }
      ] } }
  ];

  var PLANS = {
    'supplier-portal': {
      label: 'Supplier Portal',
      home: 'supplier-portal.html',
      capabilities: ['core', 'insights', 'supplier-portal'],
      // Offered but not owned: shown with an Upgrade badge.
      locked: ['ap-ar'],
      // What "Start free trial" grants. Never transcard-admin — a supplier who
      // upgrades gains AP/AR, it does not become an internal Transcard user.
      upgradeGrants: ['ap-ar', 'payables', 'receivables']
    },
    'bills-payables': {
      label: 'Bills & Payables',
      home: 'bills-and-payables.html',
      capabilities: ['core', 'insights', 'payables'],
      locked: ['ap-ar'],
      upgradeGrants: ['ap-ar', 'receivables']
    },
    // Transcard sees the platform as it always was: every module, and no
    // AP/AR upgrade — there is nothing for an internal view to upgrade to.
    'consumer-portal': {
      label: 'Consumer Portal',
      capabilities: ['consumer'],
      locked: [],
      brand: 'consumer-portal',
      // Card processing (STP) is a supplier concern; a consumer never sees it.
      hideStp: true,
      home: 'consumer-payments-received.html',
      // The account/switcher menus point at this product's own pages.
      accountLinks: {
        profile: { href: 'consumer-my-profile.html', label: 'My Profile' },
        preferences: { href: 'consumer-payment-preferences.html', label: 'Payment Preferences' }
      }
    },
    'full': {
      label: 'Full Platform',
      home: 'supplier-portal.html',
      capabilities: ['core', 'insights', 'payables', 'receivables', 'supplier-portal', 'transcard-admin'],
      locked: []
    }
  };

  /**
   * The switcher's entries. Each is a business seen through a view: a supplier
   * sees the portal, a buyer sees payables, and Transcard sees everything.
   * Transcard is the initial state so the full product is visible by default.
   */
  var BUSINESSES = [
    { id: 'transcard', name: 'Transcard', view: 'Transcard view', plan: 'full' },
    { id: 'abm-corp', name: 'ABM Corp', view: 'Supplier view', plan: 'supplier-portal' },
    { id: 'big-kahuna-burger', name: 'Big Kahuna Burger Ltd', view: 'Buyer view', plan: 'bills-payables' },
    { id: 'johnny-anderson', name: 'Johnny Anderson', view: 'Consumer view', plan: 'consumer-portal' }
  ];

  // Persistence is deliberately behind this pair so it can become a URL
  // parameter, or the Worker, without touching a single caller.
  var SESSION_KEY = 'app-active-business';
  var activeBusinessId = (function () {
    try {
      var saved = sessionStorage.getItem(SESSION_KEY);
      for (var i = 0; i < BUSINESSES.length; i += 1) if (BUSINESSES[i].id === saved) return saved;
    } catch (error) {}
    return BUSINESSES[0].id;
  })();
  var listeners = [];

  function rememberActive() {
    try { sessionStorage.setItem(SESSION_KEY, activeBusinessId); } catch (error) {}
  }

  function getBusinesses() { return BUSINESSES.slice(); }

  function getActiveBusiness() {
    for (var i = 0; i < BUSINESSES.length; i += 1) {
      if (BUSINESSES[i].id === activeBusinessId) return BUSINESSES[i];
    }
    return BUSINESSES[0];
  }

  function setActiveBusiness(id) {
    if (!id || id === activeBusinessId) return getActiveBusiness();
    for (var i = 0; i < BUSINESSES.length; i += 1) {
      if (BUSINESSES[i].id === id) {
        activeBusinessId = id;
        rememberActive();
        var business = BUSINESSES[i];
        listeners.forEach(function (fn) { try { fn(business); } catch (e) {} });
        return business;
      }
    }
    return getActiveBusiness();
  }

  function onChange(fn) { if (typeof fn === 'function') listeners.push(fn); }

  /** Grant the active business everything its plan's upgrade offers. */
  function upgradeActiveBusiness() {
    var business = getActiveBusiness();
    var grants = (PLANS[business.plan] || {}).upgradeGrants || [];
    business.grantedCapabilities = (business.grantedCapabilities || []).concat(grants);
    listeners.forEach(function (fn) { try { fn(business); } catch (e) {} });
    return business;
  }

  function getPlan(business) {
    var target = business || getActiveBusiness();
    var plan = PLANS[target.plan] || PLANS.full;
    if (!target.grantedCapabilities || !target.grantedCapabilities.length) return plan;
    // A business that has upgraded carries extra capabilities on top of its plan.
    return Object.assign({}, plan, {
      capabilities: plan.capabilities.concat(target.grantedCapabilities),
      locked: (plan.locked || []).filter(function (id) { return id !== 'ap-ar'; })
    });
  }

  /** 'enabled' | 'locked' | 'hidden' for a module under the active plan. */
  function moduleState(moduleId, business) {
    var plan = getPlan(business);
    var module = null;
    for (var i = 0; i < MODULES.length; i += 1) if (MODULES[i].id === moduleId) module = MODULES[i];
    if (!module) return 'hidden';
    if (plan.capabilities.indexOf(module.capability) !== -1) return 'enabled';
    if ((plan.locked || []).indexOf(moduleId) !== -1) return 'locked';
    return 'hidden';
  }

  /** Deep-ish merge of a module's plan override onto its base definition. */
  function resolveModule(module, planId) {
    var override = (module.byPlan || {})[planId];
    if (!override) return module;
    var merged = Object.assign({}, module, override);
    merged.nav = Object.assign({}, module.nav, override.nav || {});
    if (Object.prototype.hasOwnProperty.call(override, 'parent')) merged.parent = override.parent;
    return merged;
  }

  /**
   * The modules visible under the active plan, resolved and ordered, each
   * tagged with its state. Hidden modules are omitted entirely.
   */
  function visibleModules(business) {
    var target = business || getActiveBusiness();
    var planId = target.plan;
    return MODULES
      .map(function (m) { return resolveModule(m, planId); })
      .map(function (m) { m = Object.assign({}, m); m.state = moduleState(m.id, target); return m; })
      .filter(function (m) { return m.state !== 'hidden'; })
      .sort(function (a, b) { return a.order - b.order; });
  }

  /** Which module owns a page, for active-state and access checks. */
  function moduleForPage(file) {
    var name = String(file || '').split('/').pop().split('?')[0];
    var owners = {
      'supplier-portal.html': 'supplier-portal',
      'payment-preferences.html': 'payment-preferences',
      'bills-and-payables.html': 'bills',
      'payables-pay.html': 'bills',
      'vendors.html': 'vendors',
      'vendor-profile.html': 'vendors',
      'my-company-profile.html': 'my-company-profile',
      'ap-ar-payments.html': 'ap-ar',
      'payment-program-configuration.html': 'transcard-only',
      'consumer-payments-received.html': 'payments-received',
      'consumer-my-cards.html': 'my-cards',
      'consumer-payment-preferences.html': 'cp-payment-preferences',
      'consumer-my-profile.html': 'my-profile'
    };
    return owners[name] || null;
  }

  function currentPageFile() {
    return (window.location.pathname || '').split('/').pop() || '';
  }

  /** Where this business lands: its plan's home page. */
  function homeFor(business) {
    return (getPlan(business).home) || 'supplier-portal.html';
  }

  /**
   * After a switch: if the page on screen belongs to a module the new view
   * can't see, the page it should go to instead. Null when it can stay.
   */
  var DEFAULT_ACCOUNT_LINKS = {
    profile: { href: 'my-company-profile.html', label: 'My Company Profile' },
    preferences: { href: 'payment-preferences.html', label: 'Payment Preferences' }
  };

  /** Profile + preferences links for the account menus, per product. */
  function accountLinks(business) {
    return getPlan(business).accountLinks || DEFAULT_ACCOUNT_LINKS;
  }

  // The same screen in the other product: switching view while on Payment
  // Preferences lands on the new product's Payment Preferences, not its home.
  var COUNTERPARTS = {
    'payment-preferences.html': 'consumer-payment-preferences.html',
    'consumer-payment-preferences.html': 'payment-preferences.html',
    'my-company-profile.html': 'consumer-my-profile.html',
    'consumer-my-profile.html': 'my-company-profile.html'
  };

  function redirectForCurrentPage() {
    var file = currentPageFile();
    var owner = moduleForPage(file);
    if (!owner || moduleState(owner) !== 'hidden') return null;
    var twin = COUNTERPARTS[String(file || '').split('/').pop().split('?')[0]];
    var twinOwner = twin && moduleForPage(twin);
    if (twinOwner && moduleState(twinOwner) !== 'hidden') return twin + (window.location.search || '');
    return homeFor();
  }

  // A deep link to a page the default view can't see (a consumer page opened
  // directly, say) starts in the first view that owns it rather than
  // rendering one product's page inside another's shell.
  (function startInOwningView() {
    var owner = moduleForPage(currentPageFile());
    if (!owner || moduleState(owner) !== 'hidden') return;
    for (var i = 0; i < BUSINESSES.length; i += 1) {
      if (moduleState(owner, BUSINESSES[i]) !== 'hidden') { activeBusinessId = BUSINESSES[i].id; rememberActive(); return; }
    }
  })();

  return {
    modules: MODULES,
    homeFor: homeFor,
    redirectForCurrentPage: redirectForCurrentPage,
    accountLinks: accountLinks,
    plans: PLANS,
    getBusinesses: getBusinesses,
    getActiveBusiness: getActiveBusiness,
    setActiveBusiness: setActiveBusiness,
    onChange: onChange,
    upgradeActiveBusiness: upgradeActiveBusiness,
    getPlan: getPlan,
    moduleState: moduleState,
    visibleModules: visibleModules,
    moduleForPage: moduleForPage
  };
})();
