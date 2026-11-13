// Kitchen Hub: TV screen logic
(function () {
  const C = window.HUB_CONFIG;
  const S = window.HubStore;
  const $ = (id) => document.getElementById(id);
  const params = new URLSearchParams(location.search);

  const state = { prayers: null, prayersTomorrow: null, weather: null, weatherIsSample: false };

  // ---------- helpers ----------
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmtTime = (d, tz) => d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: tz });
  const clockParts = (d, tz) => {
    const p = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: tz }).formatToParts(d);
    const get = (t) => (p.find((x) => x.type === t) || {}).value || '';
    return { hm: get('hour') + ':' + get('minute'), ap: get('dayPeriod') };
  };
  const hhmmToDate = (hhmm, base) => {
    const m = /^(\d{1,2}):(\d{2})/.exec(hhmm || '');
    const d = new Date(base); d.setHours(+m[1], +m[2], 0, 0); return d;
  };
  const to12 = (hhmm) => fmtTime(hhmmToDate(hhmm, new Date()));
  const dur = (ms) => {
    const mins = Math.max(0, Math.round(ms / 60000));
    const h = Math.floor(mins / 60), m = mins % 60;
    return h ? h + 'h ' + String(m).padStart(2, '0') + 'm' : m + 'm';
  };

  // Scale the 1920x1080 stage to fill any screen
  function fit() {
    const s = Math.min(window.innerWidth / 1920, window.innerHeight / 1080);
    const st = $('stage');
    st.style.transform = 'scale(' + s + ')';
    st.style.left = (window.innerWidth - 1920 * s) / 2 + 'px';
    st.style.top = (window.innerHeight - 1080 * s) / 2 + 'px';
  }

  // ---------- prayer times (Aladhan API) ----------
  const PRAYERS = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
  const SAMPLE_PRAYERS = { Fajr: '05:27', Sunrise: '06:46', Dhuhr: '11:49', Asr: '14:27', Maghrib: '16:44', Isha: '18:05' };

  async function fetchPrayers(date) {
    const key = 'kitchenHub.prayers.' + S.iso(date);
    try { const cached = localStorage.getItem(key); if (cached) return JSON.parse(cached); } catch (e) {}
    const dd = String(date.getDate()).padStart(2, '0'), mm = String(date.getMonth() + 1).padStart(2, '0');
    const url = 'https://api.aladhan.com/v1/timings/' + dd + '-' + mm + '-' + date.getFullYear() +
      '?latitude=' + C.home.lat + '&longitude=' + C.home.lon + '&method=' + C.prayer.method + '&school=' + C.prayer.school;
    try {
      const res = await fetch(url);
      const json = await res.json();
      const t = json.data.timings;
      const out = {}; ['Fajr', 'Sunrise', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'].forEach((k) => { out[k] = t[k].slice(0, 5); });
      try { localStorage.setItem(key, JSON.stringify(out)); } catch (e) {}
      return out;
    } catch (e) {
      console.warn('Prayer API unavailable, using sample times', e);
      return SAMPLE_PRAYERS;
    }
  }

  function nextPrayer(now) {
    const today = state.prayers || SAMPLE_PRAYERS;
    for (const name of PRAYERS) {
      const at = hhmmToDate(today[name], now);
      if (at > now) return { name, at };
    }
    const tom = S.addDays(now, 1);
    return { name: 'Fajr', at: hhmmToDate((state.prayersTomorrow || today).Fajr, tom) };
  }

  // ---------- weather (Open-Meteo, free, no key) ----------
  const WX = { 0: 'Clear', 1: 'Mostly clear', 2: 'Partly cloudy', 3: 'Cloudy', 45: 'Fog', 48: 'Fog', 51: 'Drizzle', 53: 'Drizzle', 55: 'Drizzle',
    61: 'Light rain', 63: 'Rain', 65: 'Heavy rain', 71: 'Light snow', 73: 'Snow', 75: 'Heavy snow', 80: 'Showers', 81: 'Showers', 82: 'Heavy showers',
    95: 'Thunderstorms', 96: 'Thunderstorms', 99: 'Thunderstorms' };

  async function fetchWeather() {
    const cs = C.weatherCities;
    const url = 'https://api.open-meteo.com/v1/forecast?latitude=' + cs.map((c) => c.lat).join(',') +
      '&longitude=' + cs.map((c) => c.lon).join(',') +
      '&current=temperature_2m,weather_code&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max' +
      '&temperature_unit=fahrenheit&timezone=' + encodeURIComponent(C.home.tz) + '&forecast_days=2';
    try {
      const res = await fetch(url);
      let json = await res.json();
      if (!Array.isArray(json)) json = [json];
      state.weather = json.map((w, i) => ({
        city: cs[i].name,
        temp: Math.round(w.current.temperature_2m),
        cond: WX[w.current.weather_code] || 'Mixed',
        hi: Math.round(w.daily.temperature_2m_max[0]), lo: Math.round(w.daily.temperature_2m_min[0]),
        rain: w.daily.precipitation_probability_max[0] || 0
      }));
      state.weatherIsSample = false;
    } catch (e) {
      console.warn('Weather API unavailable, using sample weather', e);
      state.weather = [
        { city: 'Atlantic City', temp: 43, cond: 'Partly cloudy', hi: 52, lo: 38, rain: 10 },
        { city: 'New Brunswick', temp: 42, cond: 'Sunny', hi: 53, lo: 37, rain: 5 },
        { city: 'Philadelphia', temp: 45, cond: 'Rain later', hi: 55, lo: 44, rain: 70 }
      ];
      state.weatherIsSample = true;
    }
    render();
  }

  // ---------- the daily summary ----------
  // Prototype: built from simple rules over today's data.
  // Next milestone: send the same data to the Claude API for a natural-language brief.
  function buildSummary(now, data) {
    const parts = [];
    const np = nextPrayer(now);
    const isFriday = now.getDay() === 5;
    if (np.name === 'Dhuhr' && isFriday) parts.push('Jumu’ah at ' + fmtTime(np.at) + '.');
    const upcoming = todaysEvents(now, data).filter((e) => e.at > now);
    if (upcoming.length) {
      const e = upcoming[0];
      parts.push(e.who + '’s ' + e.title.toLowerCase() + ' at ' + fmtTime(e.at) + '.');
    } else {
      parts.push('Nothing else on the calendar today.');
    }
    const extra = [];
    const rainy = (state.weather || []).filter((w) => w.rain >= 50).map((w) => w.city);
    if (rainy.length) extra.push('Rain likely in ' + rainy.join(' and '));
    const open = data.groceries.filter((g) => !g.done);
    if (open.length) extra.push(open.length + ' thing' + (open.length > 1 ? 's' : '') + ' on the grocery list');
    return esc(parts.join(' ')) + (extra.length ? ' <span>' + esc(extra.join(', ') + '.') + '</span>' : '');
  }

  function todaysEvents(now, data) {
    const today = S.iso(now);
    return data.events
      .filter((e) => e.date === today)
      .map((e) => Object.assign({}, e, { at: hhmmToDate(e.time, now) }))
      .sort((a, b) => a.at - b.at);
  }

  // ---------- render ----------
  const EVENT_COLORS = ['#D70015', '#0066CC', '#3634A3', '#C93400', '#248A3D'];

  function isNight(now) {
    if (params.get('mode') === 'night') return true;
    if (params.get('mode') === 'day') return false;
    const h = now.getHours();
    return C.night.from > C.night.until ? (h >= C.night.from || h < C.night.until) : (h >= C.night.from && h < C.night.until);
  }

  function render() {
    const now = new Date();
    const data = S.load();
    const night = isNight(now);
    $('dayView').hidden = night;
    $('nightView').hidden = !night;

    const ck = clockParts(now, C.home.tz);
    const np = nextPrayer(now);
    const npLabel = np.name === 'Dhuhr' && now.getDay() === 5 ? 'Dhuhr · Jumu’ah' : np.name;
    const wc = C.worldClocks[0];
    const wcp = clockParts(now, wc.tz);
    const wHour = +new Intl.DateTimeFormat('en-US', { hour: 'numeric', hour12: false, timeZone: wc.tz }).format(now) % 24;
    const wDay = now.toLocaleDateString('en-US', { weekday: 'long', timeZone: wc.tz });
    const goodToCall = wHour >= wc.callFrom && wHour < wc.callUntil;
    const open = data.groceries.filter((g) => !g.done);
    const tomorrowIso = S.iso(S.addDays(now, 1));

    if (night) {
      $('nClock').textContent = ck.hm;
      $('nSub').textContent = C.home.name + (state.weather ? ' · ' + state.weather[0].temp + '° and ' + state.weather[0].cond.toLowerCase() : '');
      $('nNextIn').textContent = dur(np.at - now);
      $('nNextAt').textContent = npLabel + ' at ' + fmtTime(np.at);
      $('nTomorrow').textContent = data.dinners[tomorrowIso] || 'No dinner planned';
      const tEvents = data.events.filter((e) => e.date === tomorrowIso).sort((a, b) => a.time.localeCompare(b.time));
      $('nTomorrowSub').textContent = tEvents.length ? to12(tEvents[0].time) + ' · ' + tEvents[0].title : 'Nothing scheduled yet';
      $('nWorldName').textContent = wc.name.toUpperCase();
      $('nWorldTime').textContent = wcp.hm + ' ' + wcp.ap + ' ' + wDay;
      $('nWorldSub').textContent = goodToCall ? 'Good time to call' : 'Probably asleep';
      $('nGroceries').textContent = open.length + ' item' + (open.length === 1 ? '' : 's') + ' on the list';
      return;
    }

    $('date').textContent = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
    $('clock').textContent = ck.hm;
    $('summary').innerHTML = buildSummary(now, data);

    // Today
    const evs = todaysEvents(now, data);
    $('events').innerHTML = evs.length ? evs.map((e, i) =>
      '<div class="event"><div class="bar" style="background:' + EVENT_COLORS[i % EVENT_COLORS.length] + '"></div><div>' +
      '<div class="t">' + esc(e.title) + '</div><div class="s">' + fmtTime(e.at) + ' · ' + esc(e.who) + '</div></div></div>'
    ).join('') : '<div class="empty">Nothing on the calendar. Tap the fridge sticker to add.</div>';

    // Prayer
    const today = state.prayers || SAMPLE_PRAYERS;
    $('nextName').textContent = npLabel;
    $('nextIn').textContent = dur(np.at - now);
    $('nextAt').textContent = 'at ' + fmtTime(np.at);
    $('prayerRow').innerHTML = PRAYERS.map((p) => {
      const at = hhmmToDate(today[p], now);
      const cls = p === np.name && at > now ? 'next' : (at <= now ? 'past' : '');
      return '<div class="' + cls + '"><b>' + p + '</b><span>' + to12(today[p]).replace(/ (AM|PM)/, '') + '</span></div>';
    }).join('');

    // Weather
    $('weather').innerHTML = (state.weather || []).map((w) =>
      '<div class="wx"><div><div class="c">' + esc(w.city) + '</div><div class="d">' + esc(w.cond) + '</div></div>' +
      '<div class="temp">' + w.temp + '°</div></div>'
    ).join('') || '<div class="empty">Loading…</div>';

    // Groceries
    $('groceryCount').textContent = open.length + ' item' + (open.length === 1 ? '' : 's');
    $('groceries').innerHTML = C.stores.map((st) => {
      const items = open.filter((g) => g.store === st.id);
      if (!items.length) return '';
      return '<div class="store"><h3>' + esc(st.en) + '</h3>' + items.slice(0, 6).map((g) => '<div class="item"><i></i>' + esc(g.name) + '</div>').join('') + '</div>';
    }).join('') || '<div class="empty">All stocked up.</div>';

    // World clock
    $('worldName').textContent = wc.name.toUpperCase();
    $('worldTime').innerHTML = esc(wcp.hm) + '<small>' + esc(wcp.ap) + '</small>';
    $('worldSub').textContent = wDay;
    $('worldCall').textContent = goodToCall ? 'Good time to call' : 'Probably asleep';
    $('worldCall').className = 'call ' + (goodToCall ? 'yes' : 'no');

    // Dinner
    $('dinnerTonight').textContent = data.dinners[S.iso(now)] || 'Not planned yet';
    $('dinnerTomorrow').textContent = 'Tomorrow · ' + (data.dinners[tomorrowIso] || 'not planned');
  }

  // ---------- start ----------
  async function loadPrayers() {
    const now = new Date();
    state.prayers = await fetchPrayers(now);
    state.prayersTomorrow = await fetchPrayers(S.addDays(now, 1));
    render();
  }

  fit();
  window.addEventListener('resize', fit);
  render();
  loadPrayers();
  fetchWeather();
  S.onChange(render);
  setInterval(render, 1000 * 5);                  // clock and countdowns
  setInterval(fetchWeather, 1000 * 60 * 15);      // weather every 15 minutes
  setInterval(() => { if (new Date().getHours() === 0) loadPrayers(); }, 1000 * 60 * 30); // new prayer times after midnight
})();
