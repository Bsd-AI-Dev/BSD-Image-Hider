// BSD Image Hider — shared matching rules (used by the content script, popup and options page).
//
// Entry formats (in either list):
//   contoso.com            whole site, including subdomains (shop.contoso.com)
//   contoso.com/home.html  exactly that one page (?… and #… at the end are ignored)
//   contoso.com/blog/*     every page that starts with contoso.com/blog/
//   recipes                any address containing the word "recipes"
//
// Decision order: "Always hide" list  →  "Show images" list  →  hidden (default)
(() => {
  'use strict';

  function siteKey(url) {
    try { return new URL(url).hostname.replace(/^www\./, '').toLowerCase(); } catch (_) { return ''; }
  }

  function pageKey(url) {
    try {
      const u = new URL(url);
      const path = u.pathname.replace(/\/+$/, '') || '/';
      return (u.hostname.replace(/^www\./, '') + path).toLowerCase();
    } catch (_) { return ''; }
  }

  // Turn whatever the user typed or pasted (even a full https://… address) into a tidy entry.
  function clean(entry) {
    let e = String(entry || '').trim().toLowerCase();
    if (!e) return '';
    e = e.replace(/^[a-z-]+:\/\//, '').replace(/^www\./, '');
    const star = e.endsWith('*');
    if (star) e = e.slice(0, -1);
    e = e.split(/[?#]/)[0];
    if (star) return e + '*';
    if (e.includes('/')) {
      e = e.replace(/\/+$/, '');
      if (!e.includes('/')) e += '/';      // "contoso.com/" = the home page only
    }
    return e;
  }

  function kind(entry) {
    const e = clean(entry);
    if (!e) return '';
    if (e.endsWith('*')) return 'section';
    if (e.includes('/')) return 'page';
    if (e.includes('.')) return 'site';
    return 'word';
  }

  function matches(url, entry) {
    const e = clean(entry);
    if (!e) return false;
    const host = siteKey(url), page = pageKey(url);
    switch (kind(e)) {
      case 'section': { const p = e.slice(0, -1); return page.startsWith(p) || (page + '/').startsWith(p); }
      case 'page': return page === e;
      case 'site': return host === e || host.endsWith('.' + e);
      default: return url.toLowerCase().includes(e);
    }
  }

  // Returns { hidden, list: 'hide' | 'show' | null, rule }
  function decide(url, settings) {
    const hideList = settings.hideList || [], showList = settings.exceptions || [];
    const h = hideList.find(e => matches(url, e));
    if (h) return { hidden: true, list: 'hide', rule: h };
    const s = showList.find(e => matches(url, e));
    if (s) return { hidden: false, list: 'show', rule: s };
    return { hidden: true, list: null, rule: null };
  }

  globalThis.PIH = { siteKey, pageKey, clean, kind, matches, decide };
})();
