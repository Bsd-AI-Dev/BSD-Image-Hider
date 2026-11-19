// BSD Image Hider — shadow-root hook (runs inside the page itself).
// Some sites build parts of the page as self-contained components ("shadow DOM") that normal
// styles can't reach. This tiny script only announces when such a component is created, so the
// content script can hide images inside it too. It reads nothing and sends nothing anywhere.
(() => {
  const proto = Element.prototype;
  const original = proto.attachShadow;
  if (!original || original.__pihHooked) return;
  const hooked = function (init) {
    const shadow = original.call(this, init);
    if (!init || init.mode !== 'closed') {
      try { this.dispatchEvent(new CustomEvent('pih-shadow-root')); } catch (_) {}
    }
    return shadow;
  };
  Object.defineProperty(hooked, '__pihHooked', { value: true });
  proto.attachShadow = hooked;
})();
