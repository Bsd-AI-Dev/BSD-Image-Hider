// Works in Chrome/Edge (chrome.*) and Firefox (browser.*)
const api = globalThis.browser || globalThis.chrome;
const DEFAULTS = { paused: false, rules: [], defaultMode: 'hide' };
const NAMES = { show: 'Show images', hide: 'Hide images', all: 'Hide everything' };
const $ = id => document.getElementById(id);

(async () => {
  const [tab] = await api.tabs.query({ active: true, currentWindow: true });
  const url = tab.url || '';
  const site = PIH.siteKey(url);
  const page = PIH.pageKey(url);
  const isWeb = /^https?:/.test(url) && !!site;
  $('page').textContent = isWeb ? page : 'Extensions can’t change this page.';
  $('siteName').textContent = site;
  $('controls').hidden = !isWeb;

  const send = cmd => api.tabs.sendMessage(tab.id, { cmd }).catch(() => {});
  // Ask the background first so v1.3 settings are upgraded before we read them.
  await api.runtime.sendMessage({ q: 'state' }).catch(() => {});

  const modeOf = (rules, target) => {
    const r = rules.find(x => PIH.clean(x.target) === PIH.clean(target));
    return r ? r.mode : '';
  };

  // Set (or remove, when mode is '') the rule for one exact target.
  async function setRule(target, mode) {
    const s = await api.storage.local.get(DEFAULTS);
    const t = PIH.clean(target);
    const rules = s.rules.filter(r => PIH.clean(r.target) !== t);
    if (mode) rules.push({ target: t, mode });
    await api.storage.local.set({ rules });
    render();
  }

  function paintSeg(id, current) {
    $(id).querySelectorAll('button').forEach(b => {
      const on = b.dataset.mode === current;
      b.classList.toggle('on', on);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
  }

  async function render() {
    const s = await api.storage.local.get(DEFAULTS);
    const tabPaused = await api.runtime.sendMessage({ q: 'tabPaused', tabId: tab.id });
    const siteMode = modeOf(s.rules, site);
    const pageMode = modeOf(s.rules, page);
    paintSeg('siteSeg', siteMode);
    paintSeg('pageSeg', pageMode);

    const def = s.defaultMode === 'all' ? 'all' : 'hide';
    $('siteHint').textContent = siteMode
      ? `${NAMES[siteMode]} on every page of ${site}`
      : `Using the default: ${NAMES[def]}`;

    // What would apply to this page without its own page rule?
    const withoutPage = PIH.decide(url, { ...s, rules: s.rules.filter(r => PIH.clean(r.target) !== PIH.clean(page)) });
    $('pageHint').textContent = pageMode
      ? `${NAMES[pageMode]} on this page only`
      : `Follows ${withoutPage.kind === 'default' ? 'the default' : 'the ' + withoutPage.kind + ' rule'}: ${NAMES[withoutPage.mode]}`;

    // Status box
    const st = $('status');
    const d = PIH.decide(url, s);
    const why = d.kind === 'default' ? 'Default for all other sites' : `${d.kind[0].toUpperCase() + d.kind.slice(1)} rule: ${d.rule}`;
    if (!isWeb) { st.hidden = true; }
    else {
      st.hidden = false;
      let cls, title, sub;
      if (s.paused) { cls = 'paused'; title = 'Paused everywhere'; sub = 'Images are shown in every tab'; }
      else if (tabPaused) { cls = 'paused'; title = 'Paused in this tab'; sub = 'Images are shown until you unpause or close the tab'; }
      else if (d.mode === 'show') { cls = 'show'; title = 'Images shown'; sub = why; }
      else if (d.mode === 'hide') { cls = 'hide'; title = 'Images hidden'; sub = 'Small icons and logos stay visible · ' + why; }
      else { cls = 'all'; title = 'Images and icons hidden'; sub = 'Everything is hidden · ' + why; }
      st.className = 'status ' + cls;
      st.replaceChildren();
      const b = document.createElement('b'); b.textContent = title;
      st.append(b, sub);
    }

    $('tabPause').textContent = tabPaused ? '▶ Unpause this tab' : '⏸ Pause this tab';
    $('tabPause').classList.toggle('on', !!tabPaused);
    $('pause').textContent = s.paused ? '▶ Unpause everywhere' : '⏻ Pause everywhere';
    $('pause').classList.toggle('on', !!s.paused);
  }

  $('siteSeg').addEventListener('click', e => { const b = e.target.closest('button'); if (b) setRule(site, b.dataset.mode); });
  $('pageSeg').addEventListener('click', e => { const b = e.target.closest('button'); if (b) setRule(page, b.dataset.mode); });
  $('tabPause').onclick = async () => {
    await api.runtime.sendMessage({ q: 'toggleTabPause', tabId: tab.id });
    send('refresh'); render();
  };
  $('showAll').onclick = () => { send('showAll'); window.close(); };
  $('pause').onclick = async () => {
    const s = await api.storage.local.get(DEFAULTS);
    await api.storage.local.set({ paused: !s.paused });
    render();
  };
  $('options').onclick = e => { e.preventDefault(); api.runtime.openOptionsPage(); window.close(); };
  const openHelp = e => { e.preventDefault(); api.tabs.create({ url: api.runtime.getURL('help.html') }); window.close(); };
  $('help').onclick = openHelp;
  $('help2').onclick = openHelp;

  render();
})();
