// Works in Chrome/Edge (chrome.*) and Firefox (browser.*)
const api = globalThis.browser || globalThis.chrome;
const DEFAULTS = { rules: [], defaultMode: 'hide', minSize: 48 };
const NAMES = { show: 'Show images', hide: 'Hide images', all: 'Hide everything' };
const KINDS = { site: 'Site', page: 'Page', section: 'Section', word: 'Word' };
const $ = id => document.getElementById(id);

function flash(text) { $('status').textContent = text; setTimeout(() => { $('status').textContent = ''; }, 2500); }

async function save(patch) { await api.storage.local.set(patch); }

async function render() {
  const s = await api.storage.local.get(DEFAULTS);
  document.querySelectorAll('input[name="defaultMode"]').forEach(r => { r.checked = r.value === (s.defaultMode === 'all' ? 'all' : 'hide'); });
  $('minSize').value = s.minSize;

  // Rules table, sorted site by site. Built with DOM calls (no innerHTML) for safety.
  const rules = [...s.rules].sort((a, b) => PIH.clean(a.target).localeCompare(PIH.clean(b.target)));
  const body = $('rules');
  body.replaceChildren();
  for (const r of rules) {
    const tr = document.createElement('tr');
    const t = document.createElement('td'); const code = document.createElement('code');
    code.textContent = PIH.clean(r.target); t.append(code);
    const k = document.createElement('td'); const badge = document.createElement('span');
    const kind = PIH.kind(r.target); badge.className = 'badge ' + kind; badge.textContent = KINDS[kind] || kind; k.append(badge);
    const m = document.createElement('td'); const sel = document.createElement('select');
    sel.className = 'mode ' + r.mode; sel.setAttribute('aria-label', 'Mode for ' + PIH.clean(r.target));
    for (const v of ['show', 'hide', 'all']) {
      const o = document.createElement('option'); o.value = v; o.textContent = NAMES[v]; o.selected = v === r.mode; sel.append(o);
    }
    sel.onchange = () => updateRule(r.target, sel.value);
    m.append(sel);
    const d = document.createElement('td'); const del = document.createElement('button');
    del.className = 'del'; del.textContent = 'Delete'; del.setAttribute('aria-label', 'Delete rule ' + PIH.clean(r.target));
    del.onclick = () => updateRule(r.target, '');
    d.append(del);
    tr.append(t, k, m, d);
    body.append(tr);
  }
  $('rulesTable').hidden = rules.length === 0;
  $('noRules').hidden = rules.length !== 0;
}

async function updateRule(target, mode) {
  const s = await api.storage.local.get(DEFAULTS);
  const t = PIH.clean(target);
  const rules = s.rules.filter(r => PIH.clean(r.target) !== t);
  if (mode) rules.push({ target: t, mode });
  await save({ rules });
  flash(mode ? 'Saved' : 'Rule deleted');
  render();
}

document.querySelectorAll('input[name="defaultMode"]').forEach(r => {
  r.onchange = async () => { await save({ defaultMode: r.value }); flash('Saved'); };
});
$('minSize').onchange = async () => {
  const n = Math.max(0, Math.min(500, parseInt($('minSize').value, 10) || 0));
  $('minSize').value = n;
  await save({ minSize: n }); flash('Saved');
};
$('addRule').onclick = async () => {
  const t = PIH.clean($('newTarget').value);
  if (!t) { flash('Type a site or page address first'); return; }
  await updateRule(t, $('newMode').value);
  $('newTarget').value = '';
};
$('newTarget').addEventListener('keydown', e => { if (e.key === 'Enter') $('addRule').click(); });

// Ask the background first so v1.3 settings are upgraded before we read them.
api.runtime.sendMessage({ q: 'state' }).catch(() => {}).finally(render);
