// Works in Chrome/Edge (chrome.*) and Firefox (browser.*)
const api = globalThis.browser || globalThis.chrome;
const DEFAULTS = { paused: false, exceptions: [], hideList: [], hideSmall: false };
const $ = id => document.getElementById(id);

(async () => {
  const [tab] = await api.tabs.query({ active: true, currentWindow: true });
  const url = tab.url || '';
  const site = PIH.siteKey(url);
  const page = PIH.pageKey(url);
  const isWeb = /^https?:/.test(url) && !!site;
  $('page').textContent = isWeb ? page : 'This page can’t be changed by extensions.';

  const send = cmd => api.tabs.sendMessage(tab.id, { cmd }).catch(() => {});
  const has = (list, e) => list.map(PIH.clean).includes(PIH.clean(e));
  const toggleIn = async (key, entry) => {
    const s = await api.storage.local.get(DEFAULTS);
    const e = PIH.clean(entry);
    const list = s[key].map(PIH.clean);
    await api.storage.local.set({ [key]: list.includes(e) ? list.filter(x => x !== e) : [...list, e] });
    render();
  };

  async function render() {
    const s = await api.storage.local.get(DEFAULTS);
    const tabPaused = await api.runtime.sendMessage({ q: 'tabPaused', tabId: tab.id });

    // Status line: is this page hidden or shown, and why?
    const d = PIH.decide(url, s);
    const st = $('status');
    if (!isWeb) { st.textContent = ''; st.hidden = true; }
    else if ((st.hidden = false), s.paused) { st.textContent = 'Paused everywhere: images are shown.'; st.className = 'status shown'; }
    else if (tabPaused) { st.textContent = 'Paused in this tab: images are shown.'; st.className = 'status shown'; }
    else if (d.list === 'hide') { st.textContent = `Images hidden (always-hide rule: ${d.rule})`; st.className = 'status'; }
    else if (d.list === 'show') { st.textContent = `Images shown (show rule: ${d.rule})`; st.className = 'status shown'; }
    else { st.textContent = 'Images hidden on this page.'; st.className = 'status'; }

    const siteOn = has(s.exceptions, site), pageOn = has(s.exceptions, page);
    $('showSite').textContent = siteOn ? `✓ Showing on whole site ${site} (click to undo)` : `Show images on whole site ${site}`;
    $('showSite').className = siteOn ? 'on' : '';
    $('showPage').textContent = pageOn ? '✓ Showing on this page (click to undo)' : 'Show images on this page only';
    $('showPage').className = pageOn ? 'on' : '';
    $('showSite').disabled = $('showPage').disabled = !isWeb;

    // Reverse option: only offered when a site/section rule would show images here.
    const withoutHide = PIH.decide(url, { exceptions: s.exceptions, hideList: [] });
    const hideOn = has(s.hideList, page);
    $('hidePage').hidden = !isWeb || !(hideOn || (withoutHide.list === 'show' && !pageOn));
    $('hidePage').textContent = hideOn ? '✓ Keeping images hidden on this page (click to undo)' : 'Keep hiding images on this page';
    $('hidePage').className = hideOn ? 'warn on' : 'warn';

    $('hideSmall').textContent = s.hideSmall ? '✓ Hiding small icons & logos too' : 'Hide small icons & logos too';
    $('hideSmall').className = s.hideSmall ? 'on' : '';
    $('tabPause').textContent = tabPaused ? '▶ Unpause this tab' : '⏸ Pause this tab';
    $('tabPause').className = tabPaused ? 'on' : '';
    $('pause').textContent = s.paused ? '▶ Unpause everywhere' : '⏸ Pause everywhere';
    $('pause').className = s.paused ? 'on' : '';
  }

  $('showSite').onclick = () => toggleIn('exceptions', site);
  $('showPage').onclick = async () => {
    // a page can't be in both lists
    const s = await api.storage.local.get(DEFAULTS);
    if (has(s.hideList, page)) await api.storage.local.set({ hideList: s.hideList.map(PIH.clean).filter(x => x !== PIH.clean(page)) });
    toggleIn('exceptions', page);
  };
  $('hidePage').onclick = async () => {
    const s = await api.storage.local.get(DEFAULTS);
    if (has(s.exceptions, page)) await api.storage.local.set({ exceptions: s.exceptions.map(PIH.clean).filter(x => x !== PIH.clean(page)) });
    toggleIn('hideList', page);
  };
  $('hideSmall').onclick = async () => {
    const s = await api.storage.local.get(DEFAULTS);
    await api.storage.local.set({ hideSmall: !s.hideSmall });
    render();
  };
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
