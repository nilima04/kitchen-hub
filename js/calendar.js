// Add-to-calendar phone page, with a quick natural-language parser
(function () {
  const C = window.HUB_CONFIG, S = window.HubStore;
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  let who = C.family[0];

  function renderWho() {
    $('who').innerHTML = C.family.map((p) =>
      '<button type="button" class="chip" data-who="' + esc(p) + '" aria-pressed="' + (p === who) + '">' + esc(p) + '</button>').join('');
  }

  // Turns "Ammu dentist Tuesday 3pm" into title, person, date and time.
  // Prototype parser built on simple rules; the roadmap swaps in the Claude API.
  function parse(text) {
    let rest = ' ' + text + ' ';
    const out = {};
    const now = new Date();

    const person = C.family.find((p) => new RegExp('\\b' + p + '\\b', 'i').test(rest));
    if (person) { out.who = person; rest = rest.replace(new RegExp('\\b' + person + '(’s|\'s)?\\b', 'i'), ' '); }

    const t = /\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i.exec(rest) || /\bat\s+(\d{1,2})(?::(\d{2}))?\b/i.exec(rest);
    if (t) {
      let h = +t[1]; const m = t[2] || '00'; const ap = (t[3] || '').toLowerCase();
      if (ap === 'pm' && h < 12) h += 12;
      if (ap === 'am' && h === 12) h = 0;
      if (!ap && h < 8) h += 12; // "at 3" most likely means 3 PM
      out.time = String(h).padStart(2, '0') + ':' + m;
      rest = rest.replace(t[0], ' ');
    }

    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    if (/\btoday\b/i.test(rest)) { out.date = S.iso(now); rest = rest.replace(/\btoday\b/i, ' '); }
    else if (/\btomorrow\b/i.test(rest)) { out.date = S.iso(S.addDays(now, 1)); rest = rest.replace(/\btomorrow\b/i, ' '); }
    else {
      const d = new RegExp('\\b(next\\s+)?(' + days.join('|') + '|' + days.map((x) => x.slice(0, 3)).join('|') + ')\\b', 'i').exec(rest);
      if (d) {
        const target = days.findIndex((x) => x.startsWith(d[2].toLowerCase().slice(0, 3)));
        let diff = (target - now.getDay() + 7) % 7 || 7;
        if (d[1]) diff += diff < 7 ? 7 : 0;
        out.date = S.iso(S.addDays(now, diff));
        rest = rest.replace(d[0], ' ');
      }
    }

    const title = rest.replace(/\b(on|at|for)\b/gi, ' ').replace(/\s+/g, ' ').trim();
    if (title) out.title = title.charAt(0).toUpperCase() + title.slice(1);
    return out;
  }

  $('fill').onclick = () => {
    const p = parse($('say').value);
    if (p.title) $('title').value = p.title;
    if (p.date) $('date').value = p.date;
    if (p.time) $('time').value = p.time;
    if (p.who) { who = p.who; renderWho(); }
  };
  $('who').onclick = (e) => { const b = e.target.closest('[data-who]'); if (b) { who = b.dataset.who; renderWho(); } };

  $('form').onsubmit = (e) => {
    e.preventDefault();
    const ev = { title: $('title').value.trim(), who, date: $('date').value, time: $('time').value };
    if (!ev.title || !ev.date || !ev.time) return;
    S.addEvent(ev);
    const d = new Date(ev.date + 'T' + ev.time);
    $('summary').textContent = ev.title + ' · ' + who + ' · ' +
      d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) + ', ' +
      d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    $('form').hidden = true;
    $('success').hidden = false;
  };
  $('again').onclick = () => {
    $('form').reset(); $('say').value = ''; $('date').value = S.iso(new Date());
    $('form').hidden = false; $('success').hidden = true;
  };

  $('date').value = S.iso(new Date());
  renderWho();
})();
