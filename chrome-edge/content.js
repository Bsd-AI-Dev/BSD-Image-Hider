// Works in Chrome/Edge (chrome.*) and Firefox (browser.*)
const api = globalThis.browser || globalThis.chrome;
// Private Image Hider — content script.
// Runs in every page. It only reads the page's own layout and toggles CSS classes.
// It never reads form fields, cookies or page text, and makes no network requests.
(() => {
  'use strict';
  const root = document.documentElement;
  if (!root || root.dataset.pihLoaded) return;
  root.dataset.pihLoaded = '1';

  let MIN = 48;              // images smaller than this (icons, logos, bullets) stay visible; 0 = hide everything
  let hideSvg = false;       // also hide inline <svg> icons/logos
  let enabled = true;

  // Hide immediately so images never flash; settings are checked right after.
  root.classList.add('pih-on');

  // ---------- settings ----------
  // Matching rules live in rules.js (globalThis.PIH), shared with the popup and options page.
  function apply() {
    api.runtime.sendMessage({ q: 'state' }).then(st => {
      if (!st) return;
      const pageUrl = (window.top === window) ? location.href : (document.referrer || location.href);
      enabled = !st.paused && !st.tabPaused && PIH.decide(pageUrl, st).hidden;
      const newMin = st.hideSmall ? 0 : (Number(st.minSize) || 0);
      if (newMin !== MIN) {
        // size rule changed: forget earlier small/background decisions and re-check everything
        MIN = newMin;
        document.querySelectorAll('.pih-small').forEach(el => el.classList.remove('pih-small'));
        document.querySelectorAll('.pih-bg').forEach(el => el.classList.remove('pih-bg'));
      }
      hideSvg = !!st.hideSmall;
      root.classList.toggle('pih-svg', hideSvg);
      root.classList.toggle('pih-on', enabled);
      if (enabled) scanAll(); else hideEye();
    }).catch(() => {});
  }

  api.runtime.onMessage.addListener(msg => {
    if (msg && msg.cmd === 'refresh') apply();
    if (msg && msg.cmd === 'showAll') { enabled = false; root.classList.remove('pih-on'); hideEye(); }
  });
  api.storage.onChanged.addListener(apply);

  // ---------- small images stay visible ----------
  function checkImg(img) {
    const w = img.naturalWidth || img.width, h = img.naturalHeight || img.height;
    if (MIN && w && h && (w < MIN || h < MIN)) img.classList.add('pih-small');
  }
  document.addEventListener('load', e => { if (e.target.tagName === 'IMG') checkImg(e.target); }, true);

  // ---------- CSS background images ----------
  function checkBg(el) {
    if (!(el instanceof Element) || el.classList.contains('pih-bg')) return;
    const bg = getComputedStyle(el).backgroundImage;
    if (bg && bg.includes('url(') && el.offsetWidth > 0 && el.offsetWidth >= MIN && el.offsetHeight >= MIN) el.classList.add('pih-bg');
  }

  function scanTree(node) {
    if (!(node instanceof Element)) return;
    if (node.tagName === 'IMG') checkImg(node);
    checkBg(node);
    node.querySelectorAll('*').forEach(el => { if (el.tagName === 'IMG') { if (el.complete) checkImg(el); } else checkBg(el); });
  }

  function scanAll() { if (document.body) scanTree(document.body); }

  let pending = [];
  let scheduled = false;
  const mo = new MutationObserver(muts => {
    if (!enabled) return;
    for (const m of muts) {
      if (m.type === 'childList') m.addedNodes.forEach(n => pending.push(n));
      else pending.push(m.target);
    }
    if (!scheduled) {
      scheduled = true;
      requestAnimationFrame(() => { const batch = pending; pending = []; scheduled = false; batch.forEach(scanTree); });
    }
  });
  mo.observe(root, { childList: true, subtree: true, attributes: true, attributeFilter: ['style'] });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', scanAll);
  else scanAll();
  window.addEventListener('load', scanAll);

  // ---------- hover "eye" to show/hide a single image ----------
  let host, eye, current = null;

  function makeEye() {
    host = document.createElement('div');
    host.style.cssText = 'position:fixed;top:0;left:0;width:0;height:0;z-index:2147483647;';
    const shadow = host.attachShadow({ mode: 'closed' });
    eye = document.createElement('button');
    eye.style.cssText = 'position:fixed;display:none;width:26px;height:26px;padding:0;border:0;border-radius:50%;' +
      'background:#222c;color:#fff;font:15px/26px sans-serif;cursor:pointer;text-align:center;';
    eye.addEventListener('mousedown', e => { e.preventDefault(); e.stopPropagation(); }, true);
    eye.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); toggle(current); });
    shadow.appendChild(eye);
    root.appendChild(host);
  }

  function hideable(el) {
    if (!el || el === host) return false;
    const t = el.tagName;
    if (el.classList.contains('pih-small')) return false;
    if (hideSvg && t.toLowerCase() === 'svg') return true;
    return t === 'IMG' || t === 'VIDEO' || (t === 'INPUT' && el.type === 'image') || el.classList.contains('pih-bg');
  }

  function findTarget(x, y) {
    for (const el of document.elementsFromPoint(x, y)) {
      if (hideable(el)) return el;
      const svg = hideSvg && el.closest && el.closest('svg');   // hovering a revealed SVG's inner shapes
      if (svg && hideable(svg)) return svg;
    }
    return null;
  }

  function hideEye() { if (eye) eye.style.display = 'none'; current = null; }

  function showEye(el) {
    if (!eye) makeEye();
    current = el;
    const r = el.getBoundingClientRect();
    eye.textContent = el.classList.contains('pih-show') ? '↺' : '👁';
    eye.title = el.classList.contains('pih-show') ? 'Hide again (Alt+Z)' : (el.alt || el.title || 'Show image (Alt+A)');
    eye.style.left = Math.max(0, r.left + 4) + 'px';
    eye.style.top = Math.max(0, r.top + 4) + 'px';
    eye.style.display = 'block';
  }

  function toggle(el) { if (el) { el.classList.toggle('pih-show'); showEye(el); } }

  let lastMove = 0;
  document.addEventListener('mousemove', e => {
    if (!enabled) return;
    const now = performance.now();
    if (now - lastMove < 60) return;
    lastMove = now;
    if (e.composedPath && host && e.composedPath().includes(host)) return; // hovering the eye itself
    const t = findTarget(e.clientX, e.clientY);
    if (t) showEye(t); else hideEye();
  }, { passive: true, capture: true });

  window.addEventListener('scroll', hideEye, { passive: true, capture: true });

  document.addEventListener('keydown', e => {
    if (!enabled || !e.altKey || !current) return;
    const k = e.key.toLowerCase();
    if (k === 'a') { current.classList.add('pih-show'); showEye(current); e.preventDefault(); }
    if (k === 'z') { current.classList.remove('pih-show'); showEye(current); e.preventDefault(); }
  }, true);

  apply();
})();
