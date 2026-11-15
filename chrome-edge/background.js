// Works in Chrome/Edge (chrome.*) and Firefox (browser.*)
const api = globalThis.browser || globalThis.chrome;
// Private Image Hider — background script.
// Holds the per-tab pause list (cleared when the browser closes). No network code anywhere.

const DEFAULTS = { paused: false, exceptions: [], hideList: [], hideSmall: false, minSize: 48 };

async function getPausedTabs() {
  const { pausedTabs = [] } = await api.storage.session.get('pausedTabs');
  return pausedTabs;
}

api.runtime.onMessage.addListener((msg, sender, reply) => {
  (async () => {
    if (msg.q === 'state') {
      const s = await api.storage.local.get(DEFAULTS);
      const tabs = await getPausedTabs();
      reply({ ...s, tabPaused: !!(sender.tab && tabs.includes(sender.tab.id)) });
    } else if (msg.q === 'tabPaused') {
      reply((await getPausedTabs()).includes(msg.tabId));
    } else if (msg.q === 'toggleTabPause') {
      let tabs = await getPausedTabs();
      tabs = tabs.includes(msg.tabId) ? tabs.filter(t => t !== msg.tabId) : [...tabs, msg.tabId];
      await api.storage.session.set({ pausedTabs: tabs });
      reply(tabs.includes(msg.tabId));
    }
  })();
  return true; // keep the channel open for the async reply
});

api.tabs.onRemoved.addListener(async id => {
  const tabs = await getPausedTabs();
  if (tabs.includes(id)) api.storage.session.set({ pausedTabs: tabs.filter(t => t !== id) });
});

// Show the "How to use" guide once, right after installing.
api.runtime.onInstalled.addListener(({ reason }) => {
  if (reason === 'install') api.tabs.create({ url: api.runtime.getURL('help.html') });
});
