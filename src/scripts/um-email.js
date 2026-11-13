/**
 * um-email.js
 * Sends User Management invitations by real email (EmailJS, from the browser:
 * GitHub Pages is static). Turning sending on = filling src/data/email-config.json;
 * no code change. Setup: src/emails/README.md. Template copy: src/emails/invite.html.
 *
 *   UMEmail.inviteLink(invitation)  → accept.html?inv=<base64url JSON> (works on any device:
 *                                     the data travels in the link)
 *   UMEmail.decodeInvite(token)     → the JSON, or null for a broken link
 *   UMEmail.sendInvite(invitation)  → Promise<{ sent, link, reason }>
 *     reason when not sent: "disabled" | "domain" | "rate" | "load" | "error"
 *
 * Guards: only addresses on allowedDomains, at most maxPerMinute (5) sends a
 * minute in this browser. Anything else still creates the invitation; the page
 * then offers the link (copy / mailto) instead.
 */
window.UMEmail = (function () {
  "use strict";

  var EMAILJS_SRC = "https://cdn.jsdelivr.net/npm/@emailjs/browser@5.0.3/dist/email.min.js";
  var SENDS_KEY = "sx_um_email_sends";
  var config = null;
  var sdk = null;

  function loadConfig() {
    if (config) return Promise.resolve(config);
    var load = window.DataSource ? window.DataSource.load("email-config") : Promise.reject();
    return load
      .then(function (data) {
        config = data || {};
        return config;
      })
      .catch(function () {
        config = { enabled: false };
        return config;
      });
  }

  function loadSdk() {
    if (window.emailjs) return Promise.resolve(window.emailjs);
    if (sdk) return sdk;
    sdk = new Promise(function (resolve, reject) {
      var script = document.createElement("script");
      script.src = EMAILJS_SRC;
      script.onload = function () {
        window.emailjs ? resolve(window.emailjs) : reject(new Error("emailjs missing"));
      };
      script.onerror = function () {
        sdk = null;
        reject(new Error("emailjs failed to load"));
      };
      document.head.appendChild(script);
    });
    return sdk;
  }

  // ── Link ──

  function toBase64Url(text) {
    var bytes = new TextEncoder().encode(text);
    var binary = "";
    bytes.forEach(function (b) {
      binary += String.fromCharCode(b);
    });
    return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }

  function fromBase64Url(token) {
    var b64 = String(token).replace(/-/g, "+").replace(/_/g, "/");
    while (b64.length % 4) b64 += "=";
    var binary = atob(b64);
    var bytes = new Uint8Array(binary.length);
    for (var i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    return new TextDecoder().decode(bytes);
  }

  /** Site root: everything before /src/pages/ (works on localhost and on GitHub Pages). */
  function siteRoot() {
    var path = window.location.pathname;
    var at = path.indexOf("/src/pages/");
    return window.location.origin + (at >= 0 ? path.slice(0, at) : "");
  }

  function payload(inv) {
    var store = window.UMStore;
    var inviter = store && store.getUser(inv.invitedBy);
    var active = window.AppPlans && window.AppPlans.getActiveBusiness();
    var business = (store && store.getBusiness()) || {};
    return {
      id: inv.id,
      email: inv.email,
      firstName: inv.firstName,
      lastName: inv.lastName,
      roleNames: (inv.roleIds || []).map(function (id) {
        var role = store && store.getRole(id);
        return role ? role.name : id;
      }),
      business: business.name || (active && active.name) || "",
      invitedBy: inviter ? (inviter.firstName + " " + inviter.lastName).trim() : "",
      // Figma "Create Account from Invitation" shows the inviter's email.
      invitedByEmail: inviter && inviter.email ? inviter.email : "",
      message: inv.message || "",
      exp: inv.expiresAt,
    };
  }

  function inviteLink(inv) {
    return siteRoot() + "/src/pages/invite/accept.html?inv=" + toBase64Url(JSON.stringify(payload(inv)));
  }

  function decodeInvite(token) {
    try {
      var data = JSON.parse(fromBase64Url(token));
      return data && data.id && data.email ? data : null;
    } catch (e) {
      return null;
    }
  }

  // ── Guards ──

  function domainAllowed(email) {
    var domain = String(email).split("@").pop().toLowerCase();
    return (config.allowedDomains || []).some(function (allowed) {
      return String(allowed).toLowerCase() === domain;
    });
  }

  function recentSends() {
    try {
      var list = JSON.parse(window.localStorage.getItem(SENDS_KEY) || "[]");
      return list.filter(function (t) {
        return Date.now() - t < 60000;
      });
    } catch (e) {
      return [];
    }
  }

  function rememberSend() {
    var list = recentSends();
    list.push(Date.now());
    try {
      window.localStorage.setItem(SENDS_KEY, JSON.stringify(list));
    } catch (e) {}
  }

  // ── Send ──

  function sendInvite(inv) {
    var link = inviteLink(inv);
    var data = payload(inv);
    return loadConfig().then(function (cfg) {
      var ready = cfg.enabled && cfg.serviceId && cfg.templateId && cfg.publicKey;
      if (!ready) return { sent: false, link: link, reason: "disabled" };
      if (!domainAllowed(inv.email)) return { sent: false, link: link, reason: "domain" };
      if (recentSends().length >= (cfg.maxPerMinute || 5)) return { sent: false, link: link, reason: "rate" };
      return loadSdk()
        .then(function (emailjs) {
          return emailjs.send(
            cfg.serviceId,
            cfg.templateId,
            {
              to_email: inv.email,
              to_name: (data.firstName + " " + data.lastName).trim(),
              inviter_name: data.invitedBy,
              business_name: data.business,
              message: data.message,
              role_names: data.roleNames.join(", "),
              accept_link: link,
              expires_on: new Date(data.exp).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }),
            },
            { publicKey: cfg.publicKey },
          );
        })
        .then(function () {
          rememberSend();
          return { sent: true, link: link };
        })
        .catch(function (error) {
          var reason = error && /load|missing/.test(String(error.message)) ? "load" : "error";
          return { sent: false, link: link, reason: reason };
        });
    });
  }

  /** Why an email didn't go, for the Invitation Sent modal. */
  function reasonText(reason) {
    if (reason === "domain")
      return "Email not sent: this demo only emails " + (config.allowedDomains || []).join(", ") + " addresses. Share the invite link:";
    if (reason === "rate") return "Email not sent: too many invitations in the last minute. Share the invite link:";
    if (reason === "load" || reason === "error") return "Email could not be sent right now. Share the invite link:";
    return "Email sending is not connected in this demo. Share the invite link:";
  }

  return {
    inviteLink: inviteLink,
    decodeInvite: decodeInvite,
    sendInvite: sendInvite,
    reasonText: reasonText,
    loadConfig: loadConfig,
  };
})();
