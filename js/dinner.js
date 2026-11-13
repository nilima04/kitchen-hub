// Weekly dinner planner phone page
(function () {
  const C = window.HUB_CONFIG, S = window.HubStore;
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const start = new Date();
  const week = Array.from({ length: 7 }, (_, i) => S.addDays(start, i));
  let sel = 0;
  const added = {};

  const fmt = (d, o) => d.toLocaleDateString('en-US', o);
  $('range').textContent = fmt(week[0], { month: 'short', day: 'numeric' }) + '–' + fmt(week[6], { month: 'short', day: 'numeric' });

  function render() {
    const plan = S.load().dinners;
    const day = week[sel], key = S.iso(day);
    const dish = plan[key];
    const entry = C.dishes.find((d) => d.name === dish);
    const needs = entry ? entry.needs : [];

    $('days').innerHTML = week.map((d, i) =>
      '<button type="button" class="day' + (plan[S.iso(d)] ? ' has' : '') + '" data-i="' + i + '" aria-pressed="' + (i === sel) + '" aria-label="' +
      fmt(d, { weekday: 'long' }) + ': ' + esc(plan[S.iso(d)] || 'not planned') + '">' +
      '<span>' + fmt(d, { weekday: 'short' }) + '</span><b>' + d.getDate() + '</b><i></i></button>').join('');

    $('selLabel').textContent = fmt(day, { weekday: 'long', month: 'short', day: 'numeric' });
    $('selDish').textContent = dish || 'Nothing planned yet';
    $('tapHint').textContent = 'Tap to set ' + fmt(day, { weekday: 'short' });
    $('needs').innerHTML = needs.length
      ? '<div class="sub" style="margin-bottom: 10px">Usually need: ' + esc(needs.join(', ')) + '</div>' +
        '<button type="button" class="btn ' + (added[key] ? 'done' : 'primary') + '" id="addNeeds" style="width: 100%">' +
        (added[key] ? 'Added to grocery list' : 'Add ' + needs.length + ' to grocery list') + '</button>'
      : '';

    $('dishes').innerHTML = C.dishes.map((d) =>
      '<button type="button" class="dish" data-dish="' + esc(d.name) + '" aria-pressed="' + (d.name === dish) + '"><b>' + esc(d.name) + '</b><span>' + esc(d.bn) + '</span></button>').join('');
  }

  $('days').onclick = (e) => { const b = e.target.closest('[data-i]'); if (b) { sel = +b.dataset.i; render(); } };
  $('dishes').onclick = (e) => {
    const b = e.target.closest('[data-dish]'); if (!b) return;
    const key = S.iso(week[sel]);
    S.setDinner(key, b.dataset.dish); added[key] = false; render();
  };
  $('needs').onclick = (e) => {
    if (e.target.id !== 'addNeeds') return;
    const key = S.iso(week[sel]);
    if (added[key]) return;
    const entry = C.dishes.find((d) => d.name === S.load().dinners[key]);
    (entry ? entry.needs : []).forEach((n) => S.addGrocery(n, C.stores[0].id, 'Dinner plan'));
    added[key] = true; render();
  };
  S.onChange(render);
  render();
})();
