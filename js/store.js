// Shared data store for the TV screen and the phone pages.
// Prototype: data lives in the browser's localStorage, so the TV and phones
// only share data when opened on the same device. Swapping this file for a
// real-time backend (e.g. Firebase or Supabase) is the next milestone; every
// page talks to the store only through these functions.
(function () {
  const KEY = 'kitchenHub.v1';

  function iso(d) {
    const z = (n) => String(n).padStart(2, '0');
    return d.getFullYear() + '-' + z(d.getMonth() + 1) + '-' + z(d.getDate());
  }
  function addDays(d, n) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }

  function seed() {
    const today = new Date();
    const plan = ['Chicken curry & rice', 'Khichuri', 'Fish bhuna', 'Dal & aloo bhaji', 'Leftovers', 'Beef tehari'];
    const dinners = {};
    plan.forEach((dish, i) => { dinners[iso(addDays(today, i))] = dish; });
    return {
      groceries: [
        { id: uid(), name: 'Eggs', store: 'grocery', by: 'Ammu', done: false },
        { id: uid(), name: 'Onions', store: 'grocery', by: 'Ammu', done: false },
        { id: uid(), name: 'Milk', store: 'grocery', by: 'Abbu', done: false },
        { id: uid(), name: 'Green chilies', store: 'grocery', by: 'Ammu', done: false },
        { id: uid(), name: 'Basmati rice', store: 'sams', by: 'Abbu', done: false },
        { id: uid(), name: 'Paper towels', store: 'sams', by: 'Nilima', done: false }
      ],
      dinners: dinners,
      events: [
        { id: uid(), title: 'Dentist', who: 'Ammu', date: iso(today), time: '15:00' },
        { id: uid(), title: 'Sam’s Club run', who: 'Nilima', date: iso(today), time: '17:30' },
        { id: uid(), title: 'Call family in Dhaka', who: 'Everyone', date: iso(today), time: '20:00' }
      ]
    };
  }

  function uid() { return Math.random().toString(36).slice(2, 10); }

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) { /* storage unavailable: fall through to seed */ }
    const data = seed();
    save(data);
    return data;
  }

  function save(data) {
    try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) { /* ignore */ }
  }

  function update(fn) { const d = load(); fn(d); save(d); return d; }

  window.HubStore = {
    iso, addDays, uid, load,
    addGrocery: (name, store, by) => update((d) => d.groceries.unshift({ id: uid(), name, store, by: by || 'You', done: false })),
    toggleGrocery: (id) => update((d) => { const g = d.groceries.find((x) => x.id === id); if (g) g.done = !g.done; }),
    clearDone: () => update((d) => { d.groceries = d.groceries.filter((g) => !g.done); }),
    setDinner: (date, dish) => update((d) => { d.dinners[date] = dish; }),
    addEvent: (ev) => update((d) => { d.events.push(Object.assign({ id: uid() }, ev)); }),
    // Lets the TV refresh instantly when a phone page changes data in another tab
    onChange: (cb) => window.addEventListener('storage', (e) => { if (e.key === KEY) cb(); })
  };
})();
