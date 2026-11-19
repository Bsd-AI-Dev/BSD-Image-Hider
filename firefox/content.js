// Works in Chrome/Edge (chrome.*) and Firefox (browser.*)
const api = globalThis.browser || globalThis.chrome;
// BSD Image Hider — content script.
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
  let host = null, eye, current = null;   // hover "eye" button (see bottom)

  // Hide immediately so images never flash; settings are checked right after.
  root.classList.add('pih-on');

  // Change a class only when needed, so our own changes don't wake the page observer for nothing.
  function setClass(el, name, on) {
    if (el.classList.contains(name) !== on) el.classList.toggle(name, on);
  }

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
        for (const scope of [document, ...shadowRoots]) {
          scope.querySelectorAll('.pih-small').forEach(el => el.classList.remove('pih-small'));
          scope.querySelectorAll('.pih-bg').forEach(el => el.classList.remove('pih-bg'));
        }
      }
      hideSvg = !!st.hideSmall;
      setClass(root, 'pih-svg', hideSvg);
      setClass(root, 'pih-on', enabled);
      updateShadowStyles();
      if (enabled) scanAll(); else hideEye();
    }).catch(() => {});
  }

  api.runtime.onMessage.addListener(msg => {
    if (msg && msg.cmd === 'refresh') apply();
    if (msg && msg.cmd === 'showAll') {
      enabled = false; root.classList.remove('pih-on'); updateShadowStyles(); hideEye();
    }
  });
  api.storage.onChanged.addListener(apply);

  // ---------- small images stay visible ----------
  // Judged by the size the image is SHOWN at on the page. Lazy-loading sites often start with a
  // 1-pixel placeholder or a tiny blurry preview stretched to full size, then swap in the real
  // picture while you scroll, so this is re-checked every time an image loads or changes.
  function checkImg(img) {
    if (!MIN) { setClass(img, 'pih-small', false); return; }
    let w = img.offsetWidth, h = img.offsetHeight;
    if (!w || !h) {
      if (!img.complete) return;          // not loaded and not laid out yet: stay hidden for now
      w = img.naturalWidth; h = img.naturalHeight;
    }
    if (!w || !h) return;
    setClass(img, 'pih-small', w < MIN || h < MIN);
  }

  function onLoad(e) {
    const t = e.target;
    if (t && t.tagName === 'IMG') checkImg(t);
  }
  document.addEventListener('load', onLoad, true);

  // ---------- CSS background images ----------
  function checkBg(el) {
    if (el.classList.contains('pih-bg')) return;
    const bg = getComputedStyle(el).backgroundImage;
    if (bg && bg.includes('url(') && el.offsetWidth > 0 && el.offsetWidth >= MIN && el.offsetHeight >= MIN) el.classList.add('pih-bg');
  }

  // ---------- shadow DOM (self-contained page components) ----------
  // Page styles can't reach inside a component's shadow root, so each one gets its own small
  // stylesheet with the same hiding rules, and its own watcher.
  const shadowRoots = new Set();
  const shadowStyles = new Set();
  const TEX = 'repeating-linear-gradient(45deg,#c9ccd1 0 6px,#b7bbc2 6px 12px)';

  function shadowCss() {
    if (!enabled) return '';
    let css =
      'img:not(.pih-show):not(.pih-small),video:not(.pih-show):not(.pih-small),' +
      'input[type="image"]:not(.pih-show):not(.pih-small){object-position:-99999px -99999px!important;' +
      `background-image:${TEX}!important;background-size:auto!important;background-repeat:repeat!important}` +
      `svg image:not(.pih-show){opacity:0!important}.pih-bg:not(.pih-show){background-image:${TEX}!important}`;
    if (hideSvg) {
      css += 'svg:not(.pih-show){background-image:repeating-linear-gradient(45deg,#c9ccd1 0 3px,#b7bbc2 3px 6px)!important}' +
             'svg:not(.pih-show)>*{visibility:hidden!important}';
    }
    return css;
  }

  function updateShadowStyles() {
    const css = shadowCss();
    shadowStyles.forEach(s => { if (s.textContent !== css) s.textContent = css; });
  }

  const styleOf = new Map();             // shadow root -> our <style> inside it

  function ensureShadowStyle(sr) {
    const style = styleOf.get(sr);
    if (style && style.parentNode !== sr) { try { sr.appendChild(style); } catch (_) {} }
  }

  function attachShadowRoot(sr) {
    if (!sr || shadowRoots.has(sr)) return;
    shadowRoots.add(sr);
    const style = document.createElement('style');
    style.dataset.pih = '1';
    style.textContent = shadowCss();
    shadowStyles.add(style);
    styleOf.set(sr, style);
    // Components often fill their shadow root right after creating it (which would wipe our
    // style), so add it a moment later, and put it back if the component ever removes it.
    ensureShadowStyle(sr);
    queueMicrotask(() => { ensureShadowStyle(sr); if (enabled) scanTree(sr); });
    mo.observe(sr, OBSERVE);
    sr.addEventListener('load', onLoad, true);
    if (enabled) scanTree(sr);
  }

  // shadow-hook.js (running in the page) announces components that create a shadow root later.
  document.addEventListener('pih-shadow-root', e => {
    const h = e.target;
    if (h && h.shadowRoot) attachShadowRoot(h.shadowRoot);
  }, true);

  // ---------- scanning ----------
  function checkEl(el) {
    if (el === host) return;
    if (el.tagName === 'IMG') checkImg(el);
    else if (el.tagName !== 'STYLE' && el.tagName !== 'SCRIPT') checkBg(el);
    if (el.shadowRoot) attachShadowRoot(el.shadowRoot);
  }

  function scanTree(node) {
    if (node instanceof Element) checkEl(node);
    if (node.querySelectorAll) node.querySelectorAll('*').forEach(checkEl);
  }

  function scanAll() {
    if (!enabled) return;
    if (document.body) scanTree(document.body);
    shadowRoots.forEach(sr => scanTree(sr));
  }

  // Watch for new elements, swapped image sources and style/class changes (lazy loading).
  const OBSERVE = { childList: true, subtree: true, attributes: true, attributeFilter: ['style', 'class', 'src', 'srcset'] };
  const pending = new Set();
  let scheduled = false;
  const mo = new MutationObserver(muts => {
    if (!enabled) return;
    for (const m of muts) {
      if (m.type === 'childList') {
        if (styleOf.has(m.target)) ensureShadowStyle(m.target);
        m.addedNodes.forEach(n => pending.add(n));
        continue;
      }
      const t = m.target;
      if (t === root || t === host) continue;
      if (m.attributeName === 'src' || m.attributeName === 'srcset') {
        // A new picture is coming: don't trust the old "small" verdict, re-judge when it loads.
        const img = t.tagName === 'SOURCE' ? t.parentElement && t.parentElement.querySelector('img') : t;
        if (img && img.tagName === 'IMG') setClass(img, 'pih-small', false);
      }
      pending.add(t);
    }
    if (!scheduled) {
      scheduled = true;
      requestAnimationFrame(() => {
        scheduled = false;
        const batch = [...pending]; pending.clear();
        batch.forEach(scanTree);
      });
    }
  });
  mo.observe(root, OBSERVE);

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', scanAll);
  else scanAll();
  window.addEventListener('load', scanAll);

  // Safety net: after you stop scrolling, re-check the page once for anything that slipped through.
  let scrollTimer = 0;
  const rescanSoon = () => { clearTimeout(scrollTimer); scrollTimer = setTimeout(scanAll, 400); };
  window.addEventListener('scroll', rescanSoon, { passive: true, capture: true });
  window.addEventListener('resize', rescanSoon, { passive: true });

  // ---------- hover "eye" to show/hide a single image ----------
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
    if (!el || el === host || !el.classList) return false;
    const t = el.tagName;
    if (el.classList.contains('pih-small')) return false;
    if (hideSvg && t.toLowerCase() === 'svg') return true;
    return t === 'IMG' || t === 'VIDEO' || (t === 'INPUT' && el.type === 'image') || el.classList.contains('pih-bg');
  }

  // Everything under the mouse, including elements inside components' shadow roots.
  function elementsAt(scope, x, y, depth = 0) {
    const out = [];
    for (const el of scope.elementsFromPoint(x, y)) {
      if (el.shadowRoot && depth < 4 && el.shadowRoot.elementsFromPoint) out.push(...elementsAt(el.shadowRoot, x, y, depth + 1));
      out.push(el);
    }
    return out;
  }

  function findTarget(x, y) {
    for (const el of elementsAt(document, x, y)) {
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
