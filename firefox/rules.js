// BSD Image Hider — shared matching rules (used by the content script, popup and options page).
//
// Entry formats (in either list):
//   contoso.com            whole site, including subdomains (shop.contoso.com)
//   contoso.com/home.html  exactly that one page (?… and #… at the end are ignored)
//   contoso.com/blog/*     every page that starts with contoso.com/blog/
//   recipes                any address containing the word "recipes"
//
// Each rule has a mode. The most specific matching rule wins (see decide below).
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

  // Modes: 'show' (nothing hidden), 'hide' (pictures hidden, small icons kept), 'all' (everything hidden).
  // The MOST SPECIFIC matching rule wins: page > section > site > word > default.
  const SCORE = { page: 4, section: 3, site: 2, word: 1 };
  const MODES = ['show', 'hide', 'all'];

  // Returns { mode, rule, kind }  (kind 'default' when no rule matched)
  function decide(url, settings) {
    let best = null, bestScore = -1;
    for (const r of settings.rules || []) {
      if (!r || !MODES.includes(r.mode) || !matches(url, r.target)) continue;
      const e = clean(r.target);
      const score = SCORE[kind(e)] * 100000 + e.length;   // longer = more specific within a kind
      if (score > bestScore) { best = r; bestScore = score; }
    }
    if (best) return { mode: best.mode, rule: clean(best.target), kind: kind(best.target) };
    return { mode: settings.defaultMode === 'all' ? 'all' : 'hide', rule: null, kind: 'default' };
  }

  // Turn v1.3 settings (two lists + global switch) into v1.4 rules. Returns null if nothing to do.
  function migrate(s) {
    if (Array.isArray(s.rules)) return null;
    const rules = [], seen = new Set();
    const add = (t, mode) => { const c = clean(t); if (c && !seen.has(c)) { seen.add(c); rules.push({ target: c, mode }); } };
    const hideMode = s.hideSmall ? 'all' : 'hide';           // keep v1.3 behaviour exactly
    (s.hideList || []).forEach(t => add(t, hideMode));     // "always hide" used to win, so it goes first
    (s.exceptions || []).forEach(t => add(t, 'show'));
    return { rules, defaultMode: s.hideSmall ? 'all' : 'hide' };
  }

  globalThis.PIH = { siteKey, pageKey, clean, kind, matches, decide, migrate, MODES };
})();
