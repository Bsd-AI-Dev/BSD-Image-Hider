// Works in Chrome/Edge (chrome.*) and Firefox (browser.*)
const api = globalThis.browser || globalThis.chrome;
const $ = id => document.getElementById(id);

const tidy = text => [...new Set(text.split('\n').map(PIH.clean).filter(Boolean))];

api.storage.local.get({ exceptions: [], hideList: [], hideSmall: false, minSize: 48 }).then(s => {
  $('showList').value = s.exceptions.join('\n');
  $('hideList').value = s.hideList.join('\n');
  $('hideSmall').checked = s.hideSmall; $('minSize').value = s.minSize; syncRow();
});

function flash(id, text) { $(id).textContent = text; setTimeout(() => { $(id).textContent = ''; }, 2500); }

$('save').onclick = async () => {
  const hideList = tidy($('hideList').value);
  // an entry can't be in both lists; "always hide" wins
  const exceptions = tidy($('showList').value).filter(e => !hideList.includes(e));
  await api.storage.local.set({ exceptions, hideList });
  $('showList').value = exceptions.join('\n');
  $('hideList').value = hideList.join('\n');
  flash('status', 'Saved');
};

function syncRow() { $('sizeRow').style.opacity = $('hideSmall').checked ? 0.4 : 1; $('minSize').disabled = $('hideSmall').checked; }
$('hideSmall').onchange = syncRow;

$('saveSize').onclick = async () => {
  const n = Math.max(0, Math.min(500, parseInt($('minSize').value, 10) || 0));
  $('minSize').value = n;
  await api.storage.local.set({ hideSmall: $('hideSmall').checked, minSize: n });
  flash('sizeStatus', 'Saved');
};
