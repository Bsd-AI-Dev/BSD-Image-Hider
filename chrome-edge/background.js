// Works in Chrome/Edge (chrome.*) and Firefox (browser.*)
const api = globalThis.browser || globalThis.chrome;
// Chrome/Edge load rules.js here; Firefox lists it in manifest.json instead.
if (!globalThis.PIH && typeof importScripts === 'function') importScripts('rules.js');
// BSD Image Hider — background script.
// Holds the per-tab pause list (cleared when the browser closes). No network code anywhere.

const DEFAULTS = { paused: false, rules: [], defaultMode: 'hide', minSize: 48 };

// One-time upgrade of settings saved by v1.3 (two lists + "hide small icons" switch).
let migrated = null;
function ensureMigrated() {
  if (!migrated) {
    migrated = (async () => {
      const old = await api.storage.local.get(null);
      const m = PIH.migrate(old);
      if (m) {
        await api.storage.local.set(m);
        await api.storage.local.remove(['exceptions', 'hideList', 'hideSmall']);
      }
    })();
  }
  return migrated;
}

async function getPausedTabs() {
  const { pausedTabs = [] } = await api.storage.session.get('pausedTabs');
  return pausedTabs;
}

api.runtime.onMessage.addListener((msg, sender, reply) => {
  (async () => {
    await ensureMigrated();
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
    } else {
      reply(null);
    }
  })();
  return true; // keep the channel open for the async reply
});

api.tabs.onRemoved.addListener(async id => {
  const tabs = await getPausedTabs();
  if (tabs.includes(id)) api.storage.session.set({ pausedTabs: tabs.filter(t => t !== id) });
});

api.runtime.onInstalled.addListener(({ reason }) => {
  ensureMigrated();
  // Show the "How to use" guide once, right after installing.
  if (reason === 'install') api.tabs.create({ url: api.runtime.getURL('help.html') });
});
