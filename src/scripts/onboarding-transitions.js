/**
 * onboarding-transitions.js
 * Step-enter / step-exit motion plus simulated-latency skeletons for both
 * the onboarding flow (`src/pages/onboarding/`).
 *
 * A step fades in once, as a whole. Its dynamic values are masked for a random
 * 1000-1500ms and then crossfade to the real thing; nothing that was already on
 * screen animates a second time. Static chrome — headings, labels, body copy,
 * buttons — is never masked, so a step reads as itself while its data loads.
 * Navigating to the next step fades the current page out first, so the two
 * pages read as one continuous cross-fade.
 *
 * Markup hooks (all optional except the first):
 *   [data-ob-content]        the content area to skeleton + reveal (required)
 *   [data-ob-skeleton]       mask this value while it loads. Skeletons are
 *                            opt-in: static headings, labels and body copy are
 *                            never masked. Form controls are masked
 *                            automatically, as are fields SDOnboardingContext
 *                            registers via createLoadingOverlay()
 *   [data-ob-skeleton-region] mask a whole area with a generic placeholder,
 *                            for when the field count is not known up front
 *   [data-ob-tone="dark"]    switches skeleton colours for dark backgrounds
 *   [data-ob-no-skeleton]    opts an element and its subtree out of masking;
 *                            on the content area itself it drops the simulated
 *                            delay too, leaving only the enter transitions
 */
(function () {
  'use strict';

  var STYLE_ID = 'ob-transition-styles';
  var MIN_DELAY_MS = 1000;
  var MAX_DELAY_MS = 1500;
  var EXIT_DURATION_MS = 200;

  // Replaced elements grow no ::before/::after boxes, so form controls are
  // masked with their own background instead of a pseudo-element overlay.
  var FIELD_SELECTOR = 'input,textarea,select,canvas';
  // Brand marks and icons stay visible while the data around them loads.
  var CHROME_SELECTOR = 'img,svg';
  var SKIP_SELECTOR = 'script,style,template,noscript,el-dialog,dialog,[data-ob-no-skeleton],[hidden]';
  // Deliberately a fixed, small set — the point is not to mirror the layout.
  var REGION_BARS = ['45%', '100%', '70%'];
  var MIN_REGION_INSET = 12;

  var readyCallbacks = [];
  var isReady = false;

  function prefersReducedMotion() {
    return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }

  function ensureStyles() {
    if (document.getElementById(STYLE_ID)) return;
    var style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = [
      ':root{--ob-skel-bg:#e8eaed;--ob-skel-bg-strong:#d6dae1;--ob-skel-radius:0.375rem;}',
      '[data-ob-tone="dark"]{--ob-skel-bg:rgba(255,255,255,.16);--ob-skel-bg-strong:rgba(255,255,255,.28);}',
      // Only the values that are about to be masked are held back until the
      // scan runs — hiding the whole area instead would fade every heading,
      // label and button back in, which reads as the page loading twice.
      '[data-ob-content]:not(.ob-scanned) [data-ob-skeleton],'
        + '[data-ob-content]:not(.ob-scanned) [data-ob-skeleton-region]{opacity:0;}',
      // One flat tone, one radius, one breathing rhythm for every placeholder.
      // Travelling shimmers read as busy once there is more than one on screen;
      // a synchronised pulse keeps a form full of them calm.
      '.ob-skel{position:relative!important;overflow:hidden!important;pointer-events:none!important;color:transparent!important;caret-color:transparent;text-shadow:none!important;border-color:var(--ob-skel-bg)!important;border-radius:var(--ob-skel-radius)!important;}',
      '.ob-skel>*{visibility:hidden!important;}',
      '.ob-skel::after{content:"";position:absolute;inset:0;border-radius:inherit;background:var(--ob-skel-bg);pointer-events:none;}',
      '.ob-skel-field{color:transparent!important;-webkit-text-fill-color:transparent!important;caret-color:transparent!important;border-color:transparent!important;box-shadow:none!important;outline:none!important;appearance:none!important;-webkit-appearance:none!important;background:var(--ob-skel-bg)!important;border-radius:var(--ob-skel-radius)!important;}',
      '.ob-skel-field::placeholder{color:transparent!important;}',
      '.ob-skel-hide{visibility:hidden!important;}',
      // Row template: a masked list still hints at one row's anatomy — a name
      // and its action — in a stronger tone, so it reads as an item rather
      // than an empty slab.
      '.ob-skel>.ob-skel-rows{visibility:visible!important;}',
      '.ob-skel-rows{position:absolute;inset:0;z-index:1;display:flex;flex-direction:column;pointer-events:none;}',
      '.ob-skel-row{display:flex;flex:1 1 0;align-items:center;justify-content:space-between;gap:1rem;padding:0 .75rem;}',
      '.ob-skel-row>span{display:block;border-radius:var(--ob-skel-radius);background:var(--ob-skel-bg-strong);}',
      '.ob-skel-row>span:first-child{height:.875rem;flex:0 1 45%;max-width:14rem;}',
      '.ob-skel-row>span:last-child{height:2rem;width:4.5rem;flex:none;}',
      // Region mode: a fixed, light placeholder that makes no claim about how
      // many fields are coming. Real children keep their space (visibility,
      // not display) so nothing jumps when the content arrives.
      '.ob-skel-hosting{position:relative!important;}',
      '.ob-skel-hosting>*:not(.ob-skel-region){visibility:hidden!important;}',
      '.ob-skel-region{position:absolute;inset:0;overflow:hidden;display:flex;flex-direction:column;gap:1rem;pointer-events:none;}',
      '.ob-skel-region>span{display:block;flex:1 1 0;min-height:.5rem;max-height:2.25rem;border-radius:var(--ob-skel-radius);background:var(--ob-skel-bg);animation:obPulse 1.6s ease-in-out infinite;}',
      '.ob-skel,.ob-skel-field{animation:obPulse 1.6s ease-in-out infinite;}',
      '@keyframes obPulse{0%,100%{opacity:1}50%{opacity:.55}}',
      // A plain crossfade, no travel: moving already-settled layout is what
      // makes the step look like it loads twice.
      '.ob-settle{animation:obSettle .3s ease-out both;}',
      '@keyframes obSettle{from{opacity:0}to{opacity:1}}',
      // The page-enter fade is a plain CSS rule, not a class added from JS:
      // by the time a script can add a class the browser has already painted,
      // so an animation starting at opacity 0 blinks the whole page out first.
      // No transform either — it would make <body> a containing block for
      // fixed-position dialogs while it runs.
      'body{animation:obEnter .4s ease-out both;}',
      '@keyframes obEnter{from{opacity:0}to{opacity:1}}',
      'html.ob-leaving body{opacity:0;transition:opacity ' + EXIT_DURATION_MS + 'ms ease-in;}',
      '@media (prefers-reduced-motion: reduce){',
      '.ob-skel,.ob-skel-field{animation:none;}',
      '.ob-settle,body{animation:obFade .01s both;}',
      '@keyframes obFade{to{opacity:1}}',
      'html.ob-leaving body{transition:none;}',
      '}'
    ].join('');
    document.head.appendChild(style);
  }

  function randomDelay() {
    return MIN_DELAY_MS + Math.random() * (MAX_DELAY_MS - MIN_DELAY_MS);
  }

  function isRendered(el) {
    return !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
  }

  function markSkeleton(el, targets) {
    // `data-ob-skeleton-rows` collapses a list to N rows' worth of height while
    // it loads. A list of unknown length shouldn't claim to be three items tall
    // when it might return one — measured before masking, while rows still lay
    // themselves out.
    var rows = parseInt(el.getAttribute('data-ob-skeleton-rows'), 10);
    if (rows > 0 && el.children.length) {
      var height = 0;
      for (var i = 0; i < Math.min(rows, el.children.length); i += 1) {
        height += el.children[i].getBoundingClientRect().height;
      }
      var box = window.getComputedStyle(el);
      ['paddingTop', 'paddingBottom', 'borderTopWidth', 'borderBottomWidth'].forEach(function (side) {
        height += parseFloat(box[side]) || 0;
      });
      el.style.height = Math.round(height) + 'px';
      el.setAttribute('data-ob-skel-height', 'true');

      var template = document.createElement('div');
      template.className = 'ob-skel-rows';
      template.setAttribute('aria-hidden', 'true');
      for (var r = 0; r < rows; r += 1) {
        var row = document.createElement('div');
        row.className = 'ob-skel-row';
        row.appendChild(document.createElement('span'));
        row.appendChild(document.createElement('span'));
        template.appendChild(row);
      }
      el.appendChild(template);
    }
    el.classList.add('ob-skel');
    targets.push(el);
  }

  /**
   * Masks a whole region with a generic placeholder instead of tracing each
   * control. Use when the field count is not known up front — the placeholder
   * says "content is coming" without pretending to know its shape.
   */
  function markRegion(el, targets) {
    var placeholder = document.createElement('div');
    placeholder.className = 'ob-skel-region';
    placeholder.setAttribute('aria-hidden', 'true');
    for (var i = 0; i < REGION_BARS.length; i += 1) {
      var bar = document.createElement('span');
      bar.style.width = REGION_BARS[i];
      placeholder.appendChild(bar);
    }
    // Sit inside the host's own padding, but never flush against its edge —
    // a bordered list has no padding of its own and the bars would touch it.
    var hostStyle = window.getComputedStyle(el);
    placeholder.style.padding = ['Top', 'Right', 'Bottom', 'Left'].map(function (side) {
      return Math.max(parseFloat(hostStyle['padding' + side]) || 0, MIN_REGION_INSET) + 'px';
    }).join(' ');

    el.classList.add('ob-skel-hosting');
    el.insertBefore(placeholder, el.firstChild);
    targets.push(el);
  }

  function markField(el, targets) {
    el.classList.add('ob-skel-field');
    if (el.tagName === 'SELECT') {
      // Tailwind selects carry their chevron as a sibling svg, which would
      // otherwise float on top of the placeholder.
      var adornments = el.parentElement ? el.parentElement.querySelectorAll(':scope > svg') : [];
      for (var a = 0; a < adornments.length; a += 1) {
        adornments[a].classList.add('ob-skel-hide');
        targets.push(adornments[a]);
      }
      if (!el.disabled) {
        el.disabled = true;
        el.setAttribute('data-ob-skel-disabled', 'true');
      }
    } else if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
      if (!el.hasAttribute('readonly')) {
        el.setAttribute('readonly', 'readonly');
        el.setAttribute('data-ob-skel-readonly', 'true');
      }
    }
    targets.push(el);
  }

  function collectSkeletonTargets(root) {
    var targets = [];

    function walk(node) {
      for (var i = 0; i < node.children.length; i += 1) {
        var el = node.children[i];
        if (el.matches(SKIP_SELECTOR) || el.closest(SKIP_SELECTOR) !== null) continue;
        // Fields already masked by SDOnboardingContext keep their own skeleton.
        if (el.getAttribute('data-sd-skeleton') === 'true') continue;
        // Regions are marked even while hidden: a page often decides which
        // form to show only after its data arrives, and an unmarked one would
        // then pop in fully rendered.
        if (el.hasAttribute('data-ob-skeleton-region')) {
          markRegion(el, targets);
          continue;
        }
        if (!isRendered(el)) continue;
        if (el.matches(CHROME_SELECTOR)) continue;
        // Only values that actually load are masked. Static chrome — headings,
        // labels, body copy, buttons — stays put, so the page reads as itself
        // while the data fills in.
        if (el.hasAttribute('data-ob-skeleton')) {
          if (el.matches(FIELD_SELECTOR)) markField(el, targets);
          else markSkeleton(el, targets);
          continue;
        }
        // An empty field is not waiting on anything — masking it just adds
        // noise. Only fields that get prefilled are marked, by the page.
        walk(el);
      }
    }

    walk(root);
    return targets;
  }

  function clearSkeletonTargets(targets) {
    targets.forEach(function (el) {
      el.classList.remove('ob-skel');
      el.classList.remove('ob-skel-field');
      el.classList.remove('ob-skel-hide');
      if (el.classList.contains('ob-skel-hosting')) {
        el.classList.remove('ob-skel-hosting');
        var placeholder = el.querySelector(':scope > .ob-skel-region');
        if (placeholder) placeholder.remove();
      }
      if (el.getAttribute('data-ob-skel-height') === 'true') {
        el.style.removeProperty('height');
        el.removeAttribute('data-ob-skel-height');
        var rowsTemplate = el.querySelector(':scope > .ob-skel-rows');
        if (rowsTemplate) rowsTemplate.remove();
      }
      if (el.getAttribute('data-ob-skel-readonly') === 'true') {
        el.removeAttribute('readonly');
        el.removeAttribute('data-ob-skel-readonly');
      }
      if (el.getAttribute('data-ob-skel-disabled') === 'true') {
        el.disabled = false;
        el.removeAttribute('data-ob-skel-disabled');
      }
    });
  }

  function revealContent(root, targets) {
    // Only what was actually masked fades in. Everything else has been on
    // screen since first paint and must not animate again — re-running a fade
    // over already-visible content is what reads as a second load.
    clearSkeletonTargets(targets);
    root.classList.add('ob-scanned');
    root.classList.remove('ob-loading');

    targets.forEach(function (el) {
      if (!el || !el.isConnected) return;
      el.classList.add('ob-settle');
      el.addEventListener('animationend', function handler() {
        el.removeEventListener('animationend', handler);
        el.classList.remove('ob-settle');
      });
    });
  }

  function flushReady() {
    isReady = true;
    while (readyCallbacks.length) {
      var callback = readyCallbacks.shift();
      try {
        callback();
      } catch (error) {
        /* a failing consumer must not stall the rest of the reveal */
      }
    }
  }

  function whenReady(callback) {
    if (typeof callback !== 'function') return;
    if (isReady) callback();
    else readyCallbacks.push(callback);
  }

  /**
   * Holds every SDOnboardingContext skeleton open until the simulated delay has
   * elapsed, so per-field and page-level masks clear in the same frame.
   */
  function patchContextOverlay() {
    var context = window.SDOnboardingContext;
    if (!context || typeof context.createLoadingOverlay !== 'function') return;
    if (context.obTransitionsPatched) return;
    var original = context.createLoadingOverlay;
    context.obTransitionsPatched = true;
    context.createLoadingOverlay = function (options) {
      var handle = original.call(context, options);
      return {
        done: function () {
          whenReady(function () {
            handle.done();
          });
        }
      };
    };
  }

  function isSameFlowLink(link) {
    if (!link || link.target === '_blank' || link.hasAttribute('download')) return false;
    var href = link.getAttribute('href') || '';
    if (!href || href.charAt(0) === '#' || /^[a-z]+:/i.test(href)) return false;
    return link.pathname !== window.location.pathname;
  }

  function navigate(href) {
    if (!href) return;
    if (prefersReducedMotion()) {
      window.location.href = href;
      return;
    }
    document.documentElement.classList.add('ob-leaving');
    window.setTimeout(function () {
      window.location.href = href;
    }, EXIT_DURATION_MS);
  }

  function initExitTransitions() {
    document.addEventListener('click', function (event) {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      var link = event.target.closest ? event.target.closest('a[href]') : null;
      if (!isSameFlowLink(link)) return;
      event.preventDefault();
      navigate(link.href);
    });

    // Restore the page when the browser serves it from the back/forward cache.
    window.addEventListener('pageshow', function (event) {
      if (event.persisted) document.documentElement.classList.remove('ob-leaving');
    });
  }

  function initStep() {
    var root = document.querySelector('[data-ob-content]');
    if (!root) {
      flushReady();
      return;
    }

    // A flow can opt out of the simulated load and just keep the transitions.
    var skipSkeleton = root.hasAttribute('data-ob-no-skeleton');
    var targets = [];
    if (!skipSkeleton) {
      try {
        targets = collectSkeletonTargets(root);
        root.classList.add('ob-loading');
      } catch (error) {
        targets = [];
      }
      // Visible so the masks can be seen; without them it stays hidden until
      // the reveal, otherwise the content would flash before it animates in.
      root.classList.add('ob-scanned');
    }

    var bootstrap = window.SDOnboardingContext && window.SDOnboardingContext.bootstrap
      ? Promise.resolve(window.SDOnboardingContext.bootstrap()).catch(function () {})
      : Promise.resolve();
    var delay = skipSkeleton ? Promise.resolve() : new Promise(function (resolve) {
      window.setTimeout(resolve, randomDelay());
    });

    // Reveal once the data is in AND the simulated latency has elapsed.
    Promise.all([bootstrap, delay]).then(function () {
      revealContent(root, targets);
      flushReady();
    });
  }

  ensureStyles();
  patchContextOverlay();

  // Deferred past DOMContentLoaded so page scripts register their own
  // SDOnboardingContext skeletons before the content area is scanned.
  document.addEventListener('DOMContentLoaded', function () {
    window.setTimeout(initStep, 0);
  });
  initExitTransitions();

  window.OnboardingTransitions = {
    navigate: navigate,
    whenReady: whenReady
  };
})();
