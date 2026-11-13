// Grocery list phone page
(function () {
  const C = window.HUB_CONFIG, S = window.HubStore;
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const T = {
    en: { title: 'Groceries', ph: 'What do we need?', add: 'Add item', quick: 'Quick add', clear: 'Clear checked items', footer: 'Shows on the kitchen TV', empty: 'Nothing on the list.' },
    bn: { title: 'বাজারের তালিকা', ph: 'কী লাগবে?', add: 'যোগ করুন', quick: 'দ্রুত যোগ', clear: 'টিক দেওয়াগুলো মুছুন', footer: 'রান্নাঘরের টিভিতে দেখা যাবে', empty: 'তালিকা খালি।' }
  };
  // Common items with Bangla names, so the list reads in either language
  const QUICK = [['Rice', 'চাল'], ['Lentils', 'ডাল'], ['Onions', 'পেঁয়াজ'], ['Potatoes', 'আলু'], ['Garlic', 'রসুন'], ['Eggs', 'ডিম'], ['Milk', 'দুধ'], ['Yogurt', 'দই']];
  const BN = Object.fromEntries(QUICK);

  let lang = localStorage.getItem('kitchenHub.lang') || 'en';
  let store = new URLSearchParams(location.search).get('store') || C.stores[0].id;

  function render() {
    const t = T[lang];
    document.documentElement.lang = lang === 'bn' ? 'bn' : 'en';
    $('langEn').setAttribute('aria-pressed', lang === 'en');
    $('langBn').setAttribute('aria-pressed', lang === 'bn');
    $('title').textContent = t.title;
    $('newItem').placeholder = t.ph;
    $('newItemLabel').textContent = t.ph;
    $('addBtn').setAttribute('aria-label', t.add);
    $('quickLabel').textContent = t.quick;
    $('clearDone').textContent = t.clear;
    $('footer').textContent = t.footer;

    $('stores').innerHTML = C.stores.map((s) =>
      '<button type="button" data-store="' + s.id + '" aria-pressed="' + (s.id === store) + '">' + esc(lang === 'bn' ? s.bn : s.en) + '</button>').join('');

    $('quick').innerHTML = QUICK.map((q) =>
      '<button type="button" class="chip" data-quick="' + esc(q[0]) + '">+ ' + esc(lang === 'bn' ? q[1] : q[0]) + '</button>').join('');

    const items = S.load().groceries.filter((g) => g.store === store);
    $('list').innerHTML = items.length ? items.map((g) =>
      '<button type="button" data-id="' + g.id + '" class="' + (g.done ? 'done' : '') + '" aria-pressed="' + g.done + '">' +
      '<span class="check">' + (g.done ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>' : '') + '</span>' +
      '<span class="name">' + esc(lang === 'bn' && BN[g.name] ? BN[g.name] : g.name) + '</span><span class="by">' + esc(g.by) + '</span></button>'
    ).join('') : '<div class="empty">' + t.empty + '</div>';
  }

  function add(name) {
    const n = (name || '').trim();
    if (!n) return;
    S.addGrocery(n, store, localStorage.getItem('kitchenHub.me') || 'You');
    $('newItem').value = '';
    render();
  }

  $('langEn').onclick = () => { lang = 'en'; localStorage.setItem('kitchenHub.lang', lang); render(); };
  $('langBn').onclick = () => { lang = 'bn'; localStorage.setItem('kitchenHub.lang', lang); render(); };
  $('addForm').onsubmit = (e) => { e.preventDefault(); add($('newItem').value); };
  $('stores').onclick = (e) => { const b = e.target.closest('[data-store]'); if (b) { store = b.dataset.store; render(); } };
  $('quick').onclick = (e) => { const b = e.target.closest('[data-quick]'); if (b) add(b.dataset.quick); };
  $('list').onclick = (e) => { const b = e.target.closest('[data-id]'); if (b) { S.toggleGrocery(b.dataset.id); render(); } };
  $('clearDone').onclick = () => { S.clearDone(); render(); };
  S.onChange(render);
  render();
})();
