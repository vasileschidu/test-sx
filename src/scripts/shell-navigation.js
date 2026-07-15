(function () {
    var PAGE_CONFIGS = {
        'smart-exchange.html': {
            scripts: ['/src/scripts/table-skeleton.js', '/src/scripts/exchanges-table.js?v=20260309d'],
            init: 'initSmartExchangePage'
        },
        'bills-and-payables.html': {
            scripts: ['/src/scripts/bills-payables-table.js'],
            init: 'initBillsPayablesTable'
        },
        'payment-preferences.html': {
            scripts: ['/src/scripts/payment-preferences-components.js'],
            reloadScripts: ['/src/scripts/payment-preferences-tabs.js', '/src/scripts/pages/payment-preferences-page.js'],
            init: null
        },
        'vendors.html': {
            scripts: ['/src/scripts/vendors-data.js', '/src/scripts/vendors-page.js'],
            init: 'initVendorsPage'
        },
        'vendor-profile.html': {
            scripts: ['/src/scripts/vendors-data.js', '/src/scripts/vendor-profile-page.js'],
            init: 'initVendorProfilePage'
        },
        'my-company-profile.html': {
            preScripts: [],
            scripts: [],
            reloadScripts: ['/src/scripts/pages/my-company-profile-page.js'],
            init: null
        },
        'payables-pay.html': {
            preScripts: [],
            scripts: [],
            init: null
        }
    };

    var activeNavigation = null;
    var loadedScripts = new Set();

    function normalizeScriptUrl(url) {
        try {
            var parsed = new URL(url, window.location.href);
            return parsed.origin + parsed.pathname;
        } catch (error) {
            return String(url || '');
        }
    }

    function registerCurrentScripts() {
        document.querySelectorAll('script[src]').forEach(function (script) {
            loadedScripts.add(normalizeScriptUrl(script.src));
        });
    }

    function getPageFile(url) {
        var pathname = (url && url.pathname) || window.location.pathname || '';
        return pathname.split('/').pop() || '';
    }

    function isSupportedPageFile(pageFile) {
        return Object.prototype.hasOwnProperty.call(PAGE_CONFIGS, pageFile);
    }

    function isDashboardPageUrl(url) {
        if (!url || url.origin !== window.location.origin) return false;
        return /\/src\/pages\/dashboard\/[^/?#]+\.html$/.test(url.pathname || '');
    }

    function shouldInterceptLink(link, event) {
        if (!link || event.defaultPrevented) return false;
        if (link.target && link.target !== '_self') return false;
        if (link.hasAttribute('download')) return false;
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return false;

        var href = link.getAttribute('href');
        if (!href || href === '#' || href.startsWith('mailto:') || href.startsWith('tel:')) return false;

        var url;
        try {
            url = new URL(link.href, window.location.href);
        } catch (error) {
            return false;
        }

        if (!isDashboardPageUrl(url)) return false;
        return isSupportedPageFile(getPageFile(url));
    }

    function loadScript(src) {
        return new Promise(function (resolve, reject) {
            var script = document.createElement('script');
            script.src = src;
            script.defer = true;
            script.onload = function () {
                loadedScripts.add(normalizeScriptUrl(src));
                resolve();
            };
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    function ensurePreScripts(pageFile) {
        var config = PAGE_CONFIGS[pageFile];
        if (!config || !config.preScripts || !config.preScripts.length) return Promise.resolve();
        var missing = config.preScripts.filter(function (src) {
            return !loadedScripts.has(normalizeScriptUrl(src));
        });
        if (!missing.length) return Promise.resolve();
        return missing.reduce(function (promise, src) {
            return promise.then(function () { return loadScript(src); });
        }, Promise.resolve());
    }

    function ensurePageScripts(pageFile) {
        var config = PAGE_CONFIGS[pageFile];
        if (!config) return Promise.resolve(false);

        var missing = config.scripts.filter(function (src) {
            return !loadedScripts.has(normalizeScriptUrl(src));
        });

        if (!missing.length) {
            return Promise.resolve(false);
        }

        return missing.reduce(function (promise, src) {
            return promise.then(function () { return loadScript(src); });
        }, Promise.resolve()).then(function () {
            return true;
        });
    }

    function reloadPageScripts(pageFile) {
        var config = PAGE_CONFIGS[pageFile];
        if (!config || !config.reloadScripts || !config.reloadScripts.length) return Promise.resolve(false);
        return config.reloadScripts.reduce(function (promise, src) {
            return promise.then(function () { return loadScript(src); });
        }, Promise.resolve()).then(function () {
            return true;
        });
    }

    function replaceBodyExtras(targetDoc) {
        var currentWrapper = document.getElementById('main-content-wrapper');
        var targetWrapper = targetDoc.getElementById('main-content-wrapper');
        if (!currentWrapper || !targetWrapper) return;

        var node = currentWrapper.nextSibling;
        while (node) {
            var next = node.nextSibling;
            node.remove();
            node = next;
        }

        var targetNode = targetWrapper.nextSibling;
        while (targetNode) {
            var nextTarget = targetNode.nextSibling;
            if (targetNode.nodeType === Node.ELEMENT_NODE) {
                document.body.appendChild(document.importNode(targetNode, true));
            }
            targetNode = nextTarget;
        }
    }

    function replaceMainContent(targetDoc) {
        var currentWrapper = document.getElementById('main-content-wrapper');
        var targetWrapper = targetDoc.getElementById('main-content-wrapper');
        if (!currentWrapper || !targetWrapper) return false;

        currentWrapper.className = targetWrapper.className;

        var currentMain = currentWrapper.querySelector('main');
        var targetMain = targetWrapper.querySelector('main');
        if (!currentMain || !targetMain) return false;

        currentMain.replaceWith(document.importNode(targetMain, true));
        replaceBodyExtras(targetDoc);
        return true;
    }

    function refreshShell(pageFile) {
        document.body.setAttribute('data-page', pageFile);

        var appNav = document.querySelector('app-nav');
        if (appNav && typeof appNav.refresh === 'function') {
            appNav.refresh(pageFile);
        }

        var appTopbar = document.querySelector('app-topbar');
        if (appTopbar && typeof appTopbar.refresh === 'function') {
            appTopbar.refresh(pageFile);
        }
    }

    function runPageInit(pageFile) {
        var config = PAGE_CONFIGS[pageFile];
        if (!config || !config.init) return;
        if (typeof window[config.init] === 'function') {
            window[config.init]();
        }
    }

    function finalizePageSwap(url, targetDoc) {
        var pageFile = getPageFile(url);

        if (!replaceMainContent(targetDoc)) {
            window.location.href = url.href;
            return false;
        }

        document.title = targetDoc.title || document.title;
        if (document.body && targetDoc.body) {
            var routerMode = targetDoc.body.getAttribute('data-router');
            if (routerMode) document.body.setAttribute('data-router', routerMode);
            else document.body.removeAttribute('data-router');
        }

        refreshShell(pageFile);
        window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
        return true;
    }

    function navigateTo(url, options) {
        var settings = options || {};
        var pageFile = getPageFile(url);
        if (!isSupportedPageFile(pageFile)) {
            window.location.href = url.href;
            return Promise.resolve();
        }

        if (activeNavigation) {
            activeNavigation.abort();
        }

        var controller = new AbortController();
        activeNavigation = controller;

        return fetch(url.href, {
            method: 'GET',
            credentials: 'same-origin',
            cache: 'no-store',
            signal: controller.signal
        }).then(function (response) {
            if (!response.ok) throw new Error('HTTP ' + response.status);
            return response.text();
        }).then(function (html) {
            if (activeNavigation !== controller) return;

            var parser = new DOMParser();
            var targetDoc = parser.parseFromString(html, 'text/html');

            if (!settings.replace) {
                window.history.pushState({}, '', url.pathname + url.search + url.hash);
            }

            return ensurePreScripts(pageFile).then(function () {
                if (activeNavigation !== controller) return;
                if (!finalizePageSwap(url, targetDoc)) return;

                return ensurePageScripts(pageFile).then(function (loadedScriptsNow) {
                    return reloadPageScripts(pageFile).then(function (reloadedScriptsNow) {
                        return { loadedScriptsNow: loadedScriptsNow, reloadedScriptsNow: reloadedScriptsNow };
                    });
                }).then(function (scriptState) {
                    if (!scriptState.loadedScriptsNow && !scriptState.reloadedScriptsNow) {
                        runPageInit(pageFile);
                    }
                });
            });
        }).catch(function (error) {
            if (error && error.name === 'AbortError') return;
            window.location.href = url.href;
        }).finally(function () {
            if (activeNavigation === controller) {
                activeNavigation = null;
            }
        });
    }

    document.addEventListener('click', function (event) {
        var link = event.target.closest('a[href]');
        if (!shouldInterceptLink(link, event)) return;

        event.preventDefault();
        navigateTo(new URL(link.href, window.location.href), { replace: false });
    });

    window.addEventListener('popstate', function () {
        var url = new URL(window.location.href);
        if (!isDashboardPageUrl(url) || !isSupportedPageFile(getPageFile(url))) return;
        navigateTo(url, { replace: true });
    });

    registerCurrentScripts();
})();
