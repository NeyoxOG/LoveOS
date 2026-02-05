const KEY = 'fiaos_notifications_v1';

const CATEGORIES = ['Alle', 'Daily', 'Luna', 'Rewards', 'Vault', 'Games', 'Cloud', 'System'];

const seed = [
  { id: 1, category: 'Daily', text: 'Zeit für euren Daily Bonus ✨', createdAt: Date.now() - 1000 * 60 * 50, read: false },
  { id: 2, category: 'Cloud', text: 'Sync erfolgreich abgeschlossen.', createdAt: Date.now() - 1000 * 60 * 120, read: false },
  { id: 3, category: 'Luna', text: 'Luna freut sich über einen kleinen Besuch 💗', createdAt: Date.now() - 1000 * 60 * 220, read: false }
];

let state = JSON.parse(localStorage.getItem(KEY) || 'null') || seed;
let active = 'Alle';

const persist = () => localStorage.setItem(KEY, JSON.stringify(state));

const fmt = (ts) => new Date(ts).toLocaleString('de-DE', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' });

const renderTabs = () => {
  const tabs = document.getElementById('tabs');
  tabs.innerHTML = '';
  CATEGORIES.forEach(cat => {
    const el = document.createElement('button');
    el.className = `tab ${active === cat ? 'active' : ''}`;
    el.textContent = cat;
    el.onclick = () => { active = cat; render(); };
    tabs.appendChild(el);
  });
};

const render = () => {
  renderTabs();
  const list = document.getElementById('list');
  const empty = document.getElementById('empty');
  const rows = state.filter(item => active === 'Alle' || item.category === active);
  list.innerHTML = '';
  if (!rows.length) {
    empty.style.display = 'block';
    return;
  }
  empty.style.display = 'none';
  rows.sort((a, b) => b.createdAt - a.createdAt).forEach(item => {
    const el = document.createElement('div');
    el.className = 'item';
    el.innerHTML = `
      <div class="row">
        <span class="tag">${item.category}</span>
        <span class="tag">${item.read ? 'Gelesen' : 'Neu'}</span>
      </div>
      <div class="msg">${item.text}</div>
      <div class="time">${fmt(item.createdAt)}</div>
    `;
    el.onclick = () => {
      item.read = true;
      persist();
      render();
    };
    list.appendChild(el);
  });
};

window.markAllRead = () => {
  state = state.map(item => ({ ...item, read: true }));
  persist();
  render();
};

render();
