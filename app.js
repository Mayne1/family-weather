/* FW_GLOBAL_SETTINGS_BOOT */
/* =========================
   AUTH GATE
   ========================= */
if (window.authBox) {
  authBox.onAuthChange(user => {
    const needsAuth =
      location.pathname.includes("dashboard") ||
      location.pathname.includes("event");

    if (needsAuth && !user) {
      location.href = "/signin.html";
    }
  });
}


(function () {
  try {
    var t = localStorage.getItem("fw_theme") || "midnight";
    var r = localStorage.getItem("fw_rn") || "0";
    document.documentElement.dataset.theme = t;
    document.documentElement.dataset.rn = r;
  } catch (e) {}
})();

window.FW = window.FW || {};

(function () {
  const TOAST_ID = "toast";
  const KEY = "fw_events_v1";

  // Optional backend (later): set window.FW_API_BASE = "https://api.yourdomain.com"
  const API_BASE = window.FW_API_BASE || "";

  const WMO = {
    0:"Clear", 1:"Mainly clear", 2:"Partly cloudy", 3:"Overcast",
    45:"Fog", 48:"Rime fog",
    51:"Light drizzle", 53:"Drizzle", 55:"Dense drizzle",
    56:"Freezing drizzle", 57:"Freezing drizzle",
    61:"Slight rain", 63:"Rain", 65:"Heavy rain",
    66:"Freezing rain", 67:"Freezing rain",
    71:"Slight snow", 73:"Snow", 75:"Heavy snow", 77:"Snow grains",
    80:"Rain showers", 81:"Rain showers", 82:"Violent showers",
    85:"Snow showers", 86:"Snow showers",
    95:"Thunderstorm", 96:"Thunderstorm + hail", 99:"Thunderstorm + hail"
  };

  function toast(msg){
    const el = document.getElementById(TOAST_ID);
    if (!el) return;
    el.textContent = msg;
    el.classList.add("on");
    setTimeout(() => el.classList.remove("on"), 2200);
  }
  window.FW.toast = toast;

  function uuid(){
    return "ev_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2,9);
  }

  function loadLocal(){
    try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; }
  }
  function saveLocal(list){
    localStorage.setItem(KEY, JSON.stringify(list));
  }

  async function apiFetch(path, opts){
    const res = await fetch(API_BASE + path, {
      ...opts,
      headers: { "Content-Type":"application/json", ...(opts && opts.headers ? opts.headers : {}) }
    });
    if (!res.ok) throw new Error("API error: " + res.status);
    return res.json();
  }

  async function createEvent(payload){
    if (!API_BASE){
      const list = loadLocal();
      const ev = { id: uuid(), ...payload, createdAtISO: new Date().toISOString() };
      list.unshift(ev);
      saveLocal(list);
      return ev;
    }
    return apiFetch("/events", { method:"POST", body: JSON.stringify(payload) });
  }

  async function getEvent(id){
    if (!API_BASE){
      return loadLocal().find(x => x.id === id) || null;
    }
    return apiFetch(`/events/${encodeURIComponent(id)}`, { method:"GET" });
  }

  async function deleteEvent(id){
    if (!API_BASE){
      const list = loadLocal().filter(x => x.id !== id);
      saveLocal(list);
      return true;
    }
    await apiFetch(`/events/${encodeURIComponent(id)}`, { method:"DELETE" });
    return true;
  }

  function escapeHtml(s){
    return String(s || "").replace(/[&<>"']/g, (m) => ({
      "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"
    }[m]));
  }

  function listEvents(){
    return loadLocal();
  }

  function splitEvents(){
    const now = Date.now();
    const all = listEvents().slice().sort((a,b)=> new Date(a.whenISO)-new Date(b.whenISO));
    const upcoming = all.filter(e => new Date(e.whenISO).getTime() >= now);
    const past = all.filter(e => new Date(e.whenISO).getTime() < now).reverse();
    return { upcoming, past };
  }

  function makeTile(ev){
    const a = document.createElement("a");
    a.className = "tile";
    window.FW && window.FW.decorateEventTile && window.FW.decorateEventTile(a, ev);
    a.href = `event.html?id=${encodeURIComponent(ev.id)}`;
    a.innerHTML = `
      <strong>${escapeHtml(ev.title)}</strong>
      <div class="muted">${new Date(ev.whenISO).toLocaleString()}</div>
      <div class="muted">${escapeHtml(ev.place)}</div>
    `;
    return a;
  }

  function renderRecentEvents(listId, emptyId){
    const box = document.getElementById(listId);
    const empty = document.getElementById(emptyId);
    if (!box) return;

    const events = listEvents().slice(0,6);
    box.innerHTML = "";
    if (events.length === 0){
      if (empty) empty.style.display = "block";
      return;
    }
    if (empty) empty.style.display = "none";
    events.forEach(ev => box.appendChild(makeTile(ev)));
  }

  function renderEventsSplit(upId, upEmptyId, pastId, pastEmptyId){
    const upBox = document.getElementById(upId);
    const upEmpty = document.getElementById(upEmptyId);
    const pastBox = document.getElementById(pastId);
    const pastEmpty = document.getElementById(pastEmptyId);
    if (!upBox || !pastBox) return;

    const { upcoming, past } = splitEvents();

    upBox.innerHTML = "";
    if (upcoming.length === 0){ if (upEmpty) upEmpty.style.display="block"; }
    else { if (upEmpty) upEmpty.style.display="none"; upcoming.forEach(ev => upBox.appendChild(makeTile(ev))); }

    pastBox.innerHTML = "";
    if (past.length === 0){ if (pastEmpty) pastEmpty.style.display="block"; }
    else { if (pastEmpty) pastEmpty.style.display="none"; past.forEach(ev => pastBox.appendChild(makeTile(ev))); }
  }

  function renderHomeEvents(upId, upEmptyId, pastId, pastEmptyId){
    renderEventsSplit(upId, upEmptyId, pastId, pastEmptyId);
  }

  // ---- Weather Intelligence (hardened) ----
  async function geocode(place){
    // Fallback: allow "lat,lon"
    const m = String(place).match(/(-?\d+(\.\d+)?)\s*,\s*(-?\d+(\.\d+)?)/);
    if (m) return { lat: parseFloat(m[1]), lon: parseFloat(m[3]), name: place };

    const u = new URL("https://geocoding-api.open-meteo.com/v1/search");
    u.searchParams.set("name", place);
    u.searchParams.set("count", "1");
    u.searchParams.set("language", "en");
    u.searchParams.set("format", "json");

    const r = await fetch(u.toString(), { cache:"no-store" });
    if (!r.ok) throw new Error("geocode failed ("+r.status+")");
    const j = await r.json();
    const hit = j.results && j.results[0];
    if (!hit) throw new Error("no geocode result");
    return { lat: hit.latitude, lon: hit.longitude, name: hit.name + (hit.admin1 ? ", " + hit.admin1 : "") };
  }

  async function forecastForDate(lat, lon, dateISO){
    const day = new Date(dateISO);
    const yyyy = day.getUTCFullYear();
    const mm = String(day.getUTCMonth()+1).padStart(2,"0");
    const dd = String(day.getUTCDate()).padStart(2,"0");
    const d0 = `${yyyy}-${mm}-${dd}`;

    const u = new URL("https://api.open-meteo.com/v1/forecast");
    u.searchParams.set("latitude", lat);
    u.searchParams.set("longitude", lon);
    u.searchParams.set("timezone", "auto");
    u.searchParams.set("temperature_unit", "fahrenheit");
    u.searchParams.set("wind_speed_unit", "mph");
    u.searchParams.set("forecast_days", "16");
    u.searchParams.set("daily", "temperature_2m_max,temperature_2m_min,precipitation_probability_max,weather_code,wind_speed_10m_max");

    const r = await fetch(u.toString(), { cache:"no-store" });
    if (!r.ok) throw new Error("forecast failed ("+r.status+")");
    const j = await r.json();

    const idx = (j.daily?.time || []).indexOf(d0);
    if (idx < 0) throw new Error("date not in forecast window");
    const code = j.daily.weather_code[idx];
    return {
      code,
      hi: j.daily.temperature_2m_max[idx],
      lo: j.daily.temperature_2m_min[idx],
      pop: (j.daily.precipitation_probability_max[idx] ?? 0),
      wind: (j.daily.wind_speed_10m_max[idx] ?? 0),
      summary: WMO[code] || "Forecast"
    };
  }

  async function almanacRisk(lat, lon, whenISO){
    try{
      const d = new Date(whenISO);
      const mm = String(d.getUTCMonth()+1).padStart(2,"0");
      const dd = String(d.getUTCDate()).padStart(2,"0");
      const years = [1,2,3,4,5].map(n => d.getUTCFullYear() - n);

      let rainy = 0;
      for (const y of years){
        const day = `${y}-${mm}-${dd}`;
        const u = new URL("https://archive-api.open-meteo.com/v1/archive");
        u.searchParams.set("latitude", lat);
        u.searchParams.set("longitude", lon);
        u.searchParams.set("start_date", day);
        u.searchParams.set("end_date", day);
        u.searchParams.set("timezone", "UTC");
        u.searchParams.set("daily", "precipitation_sum");

        const r = await fetch(u.toString(), { cache:"no-store" });
        if (!r.ok) throw new Error("archive failed ("+r.status+")");
        const j = await r.json();
        const p = j.daily?.precipitation_sum?.[0];
        if (p != null && p >= 0.2) rainy++;
      }

      if (rainy >= 3) return `Historically rainy (${rainy}/5 years). Consider a backup plan.`;
      if (rainy >= 1) return `Mixed history (${rainy}/5 rainy years). Keep an eye on it.`;
      return `Usually dry (0/5 rainy years).`;
    } catch(e){
      return `Historical trend is temporarily unavailable (provider/limits).`;
    }
  }

  async function getEventWeatherIntelligence(ev){
    // If anything fails, throw with a meaningful message so UI can show it
    const geo = await geocode(ev.place);
    const fx = await forecastForDate(geo.lat, geo.lon, ev.whenISO);
    const alm = await almanacRisk(geo.lat, geo.lon, ev.whenISO);

    return {
      summary: fx.summary,
      hiLo: `${Math.round(fx.hi)}° / ${Math.round(fx.lo)}°`,
      pop: `${Math.round(fx.pop)}%`,
      wind: `${Math.round(fx.wind)} mph`,
      almanac: alm,
      resolvedPlace: geo.name
    };
  }

  window.FW.createEvent = createEvent;
  window.FW.getEvent = getEvent;
  window.FW.deleteEvent = deleteEvent;

  window.FW.renderRecentEvents = renderRecentEvents;
  window.FW.renderEventsSplit = renderEventsSplit;
  window.FW.renderHomeEvents = renderHomeEvents;

  window.FW.getEventWeatherIntelligence = getEventWeatherIntelligence;
})();

/* =========================
   FW_ALMANAC_ALWAYS_V1
   Almanac trend computes even if forecast fails
   ========================= */
(function(){
  if(!window.FW) return;

  // Helper: geocode place -> lat/lon
  async function geocode(place){
    const m = String(place).match(/(-?\d+(\.\d+)?)\s*,\s*(-?\d+(\.\d+)?)/);
    if (m) return { lat: parseFloat(m[1]), lon: parseFloat(m[3]), name: place };

    const u = new URL("https://geocoding-api.open-meteo.com/v1/search");
    u.searchParams.set("name", place);
    u.searchParams.set("count", "1");
    u.searchParams.set("language", "en");
    u.searchParams.set("format", "json");

    const r = await fetch(u.toString(), { cache:"no-store" });
    if (!r.ok) throw new Error("geocode failed ("+r.status+")");
    const j = await r.json();
    const hit = j.results && j.results[0];
    if (!hit) throw new Error("no geocode result");
    return { lat: hit.latitude, lon: hit.longitude, name: hit.name + (hit.admin1 ? ", " + hit.admin1 : "") };
  }

  // Almanac: count rainy years in last 5 (precip_sum >= 0.2mm)
  async function almanac5(lat, lon, whenISO){
    const d = new Date(whenISO);
    const mm = String(d.getUTCMonth()+1).padStart(2,"0");
    const dd = String(d.getUTCDate()).padStart(2,"0");
    const years = [1,2,3,4,5].map(n => d.getUTCFullYear() - n);

    let rainy = 0;
    let checked = 0;

    for (const y of years){
      const day = `${y}-${mm}-${dd}`;
      const u = new URL("https://archive-api.open-meteo.com/v1/archive");
      u.searchParams.set("latitude", lat);
      u.searchParams.set("longitude", lon);
      u.searchParams.set("start_date", day);
      u.searchParams.set("end_date", day);
      u.searchParams.set("timezone", "UTC");
      u.searchParams.set("daily", "precipitation_sum");

      const r = await fetch(u.toString(), { cache:"no-store" });
      if (!r.ok) continue; // don't fail entire almanac
      const j = await r.json();
      const p = j.daily?.precipitation_sum?.[0];
      if (p != null){
        checked++;
        if (p >= 0.2) rainy++;
      }
    }

    if (checked === 0) return "Almanac unavailable (archive provider blocked).";
    if (rainy >= 3) return `Historically rainy (${rainy}/${checked} years). Consider a backup plan.`;
    if (rainy >= 1) return `Mixed history (${rainy}/${checked} rainy years). Keep an eye on it.`;
    return `Usually dry (0/${checked} rainy years).`;
  }

  // Forecast: best effort (if date not in window, returns message)
  async function forecast(lat, lon, whenISO){
    const target = new Date(whenISO);
    const yyyy = target.getUTCFullYear();
    const mm = String(target.getUTCMonth()+1).padStart(2,"0");
    const dd = String(target.getUTCDate()).padStart(2,"0");
    const d0 = `${yyyy}-${mm}-${dd}`;

    const u = new URL("https://api.open-meteo.com/v1/forecast");
    u.searchParams.set("latitude", lat);
    u.searchParams.set("longitude", lon);
    u.searchParams.set("timezone", "auto");
    u.searchParams.set("temperature_unit", "fahrenheit");
    u.searchParams.set("wind_speed_unit", "mph");
    u.searchParams.set("forecast_days", "16");
    u.searchParams.set("daily", "temperature_2m_max,temperature_2m_min,precipitation_probability_max,weather_code,wind_speed_10m_max");

    const r = await fetch(u.toString(), { cache:"no-store" });
    if(!r.ok) return { ok:false, msg:`Forecast unavailable (provider ${r.status}).` };

    const j = await r.json();
    const idx = (j.daily?.time || []).indexOf(d0);
    if (idx < 0) return { ok:false, msg:"Forecast unavailable (date too far out)."}; // key fix

    const hi = j.daily.temperature_2m_max[idx];
    const lo = j.daily.temperature_2m_min[idx];
    const pop = (j.daily.precipitation_probability_max[idx] ?? 0);
    const wind = (j.daily.wind_speed_10m_max[idx] ?? 0);
    const code = j.daily.weather_code[idx];

    // Reuse WMO map if present globally in app.js, else basic
    const WMO = (typeof window.WMO !== "undefined") ? window.WMO : null;
    const summary = (WMO && WMO[code]) ? WMO[code] : "Forecast";

    return {
      ok:true,
      summary,
      hiLo: `${Math.round(hi)}° / ${Math.round(lo)}°`,
      pop: `${Math.round(pop)}%`,
      wind: `${Math.round(wind)} mph`,
    };
  }

  // Override with resilient implementation
  window.FW.getEventWeatherIntelligence = async function(ev){
    const geo = await geocode(ev.place);

    // Almanac first (so it survives forecast failures)
    let alm = "Almanac loading…";
    try { alm = await almanac5(geo.lat, geo.lon, ev.whenISO); }
    catch { alm = "Almanac unavailable (archive provider blocked)."; }

    // Forecast best-effort
    const fx = await forecast(geo.lat, geo.lon, ev.whenISO);
    if (!fx.ok){
      return {
        summary: fx.msg,
        hiLo: "—",
        pop: "—",
        wind: "—",
        almanac: alm,
        resolvedPlace: geo.name
      };
    }

    return {
      summary: fx.summary,
      hiLo: fx.hiLo,
      pop: fx.pop,
      wind: fx.wind,
      almanac: alm,
      resolvedPlace: geo.name
    };
  };
})();

/* =========================
   FW_WX_HARDEN_V3
   Almanac never blank; forecast best-effort; never throws
   ========================= */
(function(){
  if(!window.FW) return;

  async function safeJson(url){
    try{
      const r = await fetch(url, { cache:"no-store" });
      if(!r.ok) return null;
      return await r.json();
    }catch(_){ return null; }
  }

  async function geocodeSafe(place){
    // Allow "lat,lon" direct
    const m = String(place||"").match(/(-?\d+(\.\d+)?)\s*,\s*(-?\d+(\.\d+)?)/);
    if (m) return { lat: parseFloat(m[1]), lon: parseFloat(m[3]), name: place };

    if (!place || String(place).trim().length < 2){
      return null;
    }

    const u = new URL("https://geocoding-api.open-meteo.com/v1/search");
    u.searchParams.set("name", place);
    u.searchParams.set("count", "1");
    u.searchParams.set("language", "en");
    u.searchParams.set("format", "json");

    const j = await safeJson(u.toString());
    const hit = j && j.results && j.results[0];
    if(!hit) return null;
    return { lat: hit.latitude, lon: hit.longitude, name: hit.name + (hit.admin1 ? ", " + hit.admin1 : "") };
  }

  async function almanacSafe(lat, lon, whenISO){
    // If we can’t even locate, don’t pretend
    if(lat == null || lon == null) return "Almanac: add a valid city/address to compute trend.";

    const d = new Date(whenISO);
    if (isNaN(d.getTime())) return "Almanac unavailable (bad event date).";

    const mm = String(d.getUTCMonth()+1).padStart(2,"0");
    const dd = String(d.getUTCDate()).padStart(2,"0");
    const years = [1,2,3,4,5].map(n => d.getUTCFullYear() - n);

    let rainy = 0;
    let checked = 0;

    for(const y of years){
      const day = `${y}-${mm}-${dd}`;
      const u = new URL("https://archive-api.open-meteo.com/v1/archive");
      u.searchParams.set("latitude", lat);
      u.searchParams.set("longitude", lon);
      u.searchParams.set("start_date", day);
      u.searchParams.set("end_date", day);
      u.searchParams.set("timezone", "UTC");
      u.searchParams.set("daily", "precipitation_sum");

      const j = await safeJson(u.toString());
      const p = j && j.daily && j.daily.precipitation_sum && j.daily.precipitation_sum[0];
      if (p != null){
        checked++;
        if (p >= 0.2) rainy++;
      }
    }

    if (checked === 0) return "Almanac unavailable (archive provider blocked from browser).";
    if (rainy >= 3) return `Historically rainy (${rainy}/${checked} years). Have a backup plan.`;
    if (rainy >= 1) return `Mixed history (${rainy}/${checked} rainy years). Keep an eye on it.`;
    return `Usually dry (0/${checked} rainy years).`;
  }

  async function forecastSafe(lat, lon, whenISO){
    if(lat == null || lon == null) return { ok:false, msg:"Forecast unavailable (missing location)." };

    const target = new Date(whenISO);
    if (isNaN(target.getTime())) return { ok:false, msg:"Forecast unavailable (bad event date)." };

    const yyyy = target.getUTCFullYear();
    const mm = String(target.getUTCMonth()+1).padStart(2,"0");
    const dd = String(target.getUTCDate()).padStart(2,"0");
    const day = `${yyyy}-${mm}-${dd}`;

    const u = new URL("https://api.open-meteo.com/v1/forecast");
    u.searchParams.set("latitude", lat);
    u.searchParams.set("longitude", lon);
    u.searchParams.set("timezone", "auto");
    u.searchParams.set("temperature_unit", "fahrenheit");
    u.searchParams.set("wind_speed_unit", "mph");
    u.searchParams.set("forecast_days", "16");
    u.searchParams.set("daily", "temperature_2m_max,temperature_2m_min,precipitation_probability_max,weather_code,wind_speed_10m_max");

    const j = await safeJson(u.toString());
    if(!j || !j.daily || !Array.isArray(j.daily.time)) return { ok:false, msg:"Forecast unavailable (provider/network)." };

    const idx = j.daily.time.indexOf(day);
    if(idx < 0) return { ok:false, msg:"Forecast unavailable (date too far out)." };

    const hi = j.daily.temperature_2m_max?.[idx];
    const lo = j.daily.temperature_2m_min?.[idx];
    const pop = j.daily.precipitation_probability_max?.[idx];
    const wind = j.daily.wind_speed_10m_max?.[idx];
    const code = j.daily.weather_code?.[idx];

    const WMO = (typeof window.WMO !== "undefined") ? window.WMO : null;
    const summary = (WMO && WMO[code]) ? WMO[code] : "Forecast";

    return {
      ok:true,
      summary,
      hiLo: `${Math.round(hi)}° / ${Math.round(lo)}°`,
      pop: `${Math.round(pop ?? 0)}%`,
      wind: `${Math.round(wind ?? 0)} mph`,
    };
  }

  window.FW.getEventWeatherIntelligence = async function(ev){
    const geo = await geocodeSafe(ev.place);
    const lat = geo?.lat ?? null;
    const lon = geo?.lon ?? null;

    // Almanac FIRST, always returns a string
    const alm = await almanacSafe(lat, lon, ev.whenISO);

    // Forecast best-effort
    const fx = await forecastSafe(lat, lon, ev.whenISO);

    if(!fx.ok){
      return { summary: fx.msg, hiLo:"—", pop:"—", wind:"—", almanac: alm, resolvedPlace: geo?.name ?? ev.place };
    }

    return { summary: fx.summary, hiLo: fx.hiLo, pop: fx.pop, wind: fx.wind, almanac: alm, resolvedPlace: geo?.name ?? ev.place };
  };
})();

/* =========================
   FW_EVENT_GEO_SAVE_V1
   Save lat/lon on event creation so WX never depends on fragile text geocoding later
   ========================= */
(function(){
  if(!window.FW) return;

  async function safeJson(url){
    try{
      const r = await fetch(url, { cache:"no-store" });
      if(!r.ok) return null;
      return await r.json();
    }catch(_){ return null; }
  }

  async function geocodeSafe(place){
    const s = String(place||"").trim();

    // Allow "lat,lon"
    const m = s.match(/(-?\d+(\.\d+)?)\s*,\s*(-?\d+(\.\d+)?)/);
    if (m) return { lat: parseFloat(m[1]), lon: parseFloat(m[3]), name: s };

    if (!s || s.length < 3) return null;

    const u = new URL("https://geocoding-api.open-meteo.com/v1/search");
    u.searchParams.set("name", s);
    u.searchParams.set("count", "1");
    u.searchParams.set("language", "en");
    u.searchParams.set("format", "json");

    const j = await safeJson(u.toString());
    const hit = j && j.results && j.results[0];
    if(!hit) return null;

    return {
      lat: hit.latitude,
      lon: hit.longitude,
      name: hit.name + (hit.admin1 ? ", " + hit.admin1 : "") + (hit.country_code ? " " + hit.country_code : "")
    };
  }

  // Expose helper (handy later)
  window.FW.geocodePlace = geocodeSafe;

  // Wrap createEvent so every saved event gets lat/lon when possible
  if (typeof window.FW.createEvent === "function" && !window.FW.__geoWrapped){
    const origCreate = window.FW.createEvent;
    window.FW.createEvent = async function(ev){
      try{
        // Only geocode if we don't already have coords
        if(ev && (ev.lat == null || ev.lon == null) && ev.place){
          const geo = await geocodeSafe(ev.place);
          if(geo){
            ev.lat = geo.lat;
            ev.lon = geo.lon;
            // Normalize place label (optional but helps)
            ev.place = geo.name;
          }
        }
      }catch(_){}
      return await origCreate(ev);
    };
    window.FW.__geoWrapped = true;
  }

  // If our WX override exists, prefer stored coords
  if (typeof window.FW.getEventWeatherIntelligence === "function"){
    const origWX = window.FW.getEventWeatherIntelligence;
    window.FW.getEventWeatherIntelligence = async function(ev){
      // If the WX function already handles coords, just pass through.
      // But if it relies on place text, force coords onto place text path.
      if(ev && ev.lat != null && ev.lon != null){
        // Provide a deterministic "lat,lon" string so any geocode step is bypassed
        const clone = Object.assign({}, ev, { place: `${ev.lat},${ev.lon}` });
        return await origWX(clone);
      }
      return await origWX(ev);
    };
  }
})();

/* =========================
   FW_WX_USE_COORDS_V4
   If event has lat/lon, never treat location as missing
   ========================= */
(function(){
  if(!window.FW || typeof window.FW.getEventWeatherIntelligence !== "function") return;

  const prev = window.FW.getEventWeatherIntelligence;

  window.FW.getEventWeatherIntelligence = async function(ev){
    // If coords exist, force place into "lat,lon" so any older logic bypasses geocoding.
    if(ev && ev.lat != null && ev.lon != null){
      const clone = Object.assign({}, ev, { place: `${ev.lat},${ev.lon}` });
      return await prev(clone);
    }
    return await prev(ev);
  };
})();


/* =========================
   FW_ZIP_GEOCODE_V1
   Use apiBox.geocode(zip) ONLY
   ========================= */

// Extract 5-digit ZIP from any address string
function extractZip(str){
  const m = String(str||"").match(/\b\d{5}\b/);
  return m ? m[0] : null;
}

// Override geocodeSafe to use apiBox
window.FW.geocodePlace = async function(place){
  const zip = extractZip(place);
  if(!zip) throw new Error("missing_zip");
  const r = await window.apiBox.geocode(zip);
  if(!r || !r.lat || !r.lon) throw new Error("geocode_failed");
  return r;
};

/* =========================
   FW_LIST_EVENTS_V1
   exposes listEvents() for dashboard recent list
   ========================= */
(function(){
  if(!window.FW) window.FW = {};
  if(window.FW.listEvents) return;

  // mirror the storage key used by createEvent in this file
  // we detect it from common patterns; fallback if unknown
  const KEY_GUESS = (function(){
    // try to find: const KEY = "...."
    const m = (document.currentScript && document.currentScript.textContent || "").match(/const\s+KEY\s*=\s*["']([^"']+)["']/);
    return m ? m[1] : "fw_events_v1";
  })();

  function load(){
    try { return JSON.parse(localStorage.getItem(KEY_GUESS) || "[]"); } catch { return []; }
  }

  window.FW.listEvents = async function(){
    const list = load();
    // newest first
    return list.slice().sort((a,b)=> (b.whenISO||"").localeCompare(a.whenISO||""));
  };
})();

/* =========================
   FW_SETTINGS_GLOBAL_V1 (B)
   Apply saved Settings site-wide
   ========================= */
(function(){
  function apply(){
    const theme = localStorage.getItem("fw_theme") || "midnight";
    const rn = localStorage.getItem("fw_rn") || "0";

    document.documentElement.setAttribute("data-theme", theme);

    document.documentElement.classList.remove("fw-rn-0","fw-rn-1","fw-rn-2");
    document.documentElement.classList.add(`fw-rn-${rn}`);
  }

  // apply now + whenever settings change (same tab)
  apply();
  window.addEventListener("storage", apply);

  // also re-apply on DOM ready
  document.addEventListener("DOMContentLoaded", apply);
})();

/* Right Now size scaling (global) */
(function(){
  const css = document.createElement("style");
  css.textContent = `
    .fw-rn-0 .temp{ font-size:48px }
    .fw-rn-1 .temp{ font-size:56px }
    .fw-rn-2 .temp{ font-size:64px }

    .fw-rn-0 #place{ font-size:13px }
    .fw-rn-1 #place{ font-size:15px; font-weight:700 }
    .fw-rn-2 #place{ font-size:17px; font-weight:800 }
  `;
  document.head.appendChild(css);
})();

/* =========================
   FW_DASHBOARD_CREATE_FIX_V1 (C)
   ZIP-first geocode + always save + redirect to event page
   ========================= */
(function(){
  if(!window.FW) window.FW = {};

  const KEY = "fw_events_v1";

  function readEvents(){
    try { return JSON.parse(localStorage.getItem(KEY) || "[]"); }
    catch { return []; }
  }
  function writeEvents(list){
    localStorage.setItem(KEY, JSON.stringify(list));
  }
  function uid(){
    return "ev_" + Math.random().toString(16).slice(2) + "_" + Date.now();
  }

  async function geocodeZip(zip){
    if(!window.apiBox || typeof window.apiBox.geocode !== "function") return null;
    try{
      const j = await window.apiBox.geocode(zip);
      if(j && j.ok && Number.isFinite(j.lat) && Number.isFinite(j.lon)) return j;
    }catch(_){}
    return null;
  }

  // Replace/define createEvent used by dashboard
  window.FW.createEvent = async function(payload){
    const list = readEvents();

    const ev = {
      id: payload.id || uid(),
      title: (payload.title || "").trim() || "Untitled event",
      whenISO: payload.whenISO,
      place: (payload.place || "").trim(),
      notes: (payload.notes || "").trim(),
      city: (payload.city || "").trim(),
      state: (payload.state || "").trim(),
      zip: (payload.zip || "").trim(),
      lat: payload.lat ?? null,
      lon: payload.lon ?? null,
      createdAt: Date.now(),
    };

    // ZIP-first geocode (reliable)
    if((ev.lat == null || ev.lon == null) && ev.zip){
      const geo = await geocodeZip(ev.zip);
      if(geo){
        ev.lat = geo.lat;
        ev.lon = geo.lon;
        // If they didn’t type a nice label, we can improve it:
        if(!ev.place || ev.place.length < 3){
          ev.place = geo.label;
        }
      }
    }

    // Upsert
    const idx = list.findIndex(x => x.id === ev.id);
    if(idx >= 0) list[idx] = ev;
    else list.unshift(ev);
    writeEvents(list);

    return ev;
  };

  // Hook dashboard form submit (best effort: supports your existing HTML)
  document.addEventListener("DOMContentLoaded", () => {
    const form =
      document.querySelector("form") ||
      document.getElementById("eventForm") ||
      document.querySelector("[data-event-form]");

    const btn =
      document.querySelector("button[type='submit']") ||
      document.querySelector("#createBtn");

    if(!form || !btn) return;

    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      // Try to pick up fields by common ids/names
      const pick = (selectors) => {
        for(const sel of selectors){
          const el = document.querySelector(sel);
          if(el && typeof el.value === "string") return el.value;
        }
        return "";
      };

      const title = pick(["#title","input[name='title']","#eventTitle"]);
      const whenISO = pick(["#when","input[name='when']","#dateTime","input[type='datetime-local']"]);
      const addr1 = pick(["#addr1","#address1","input[name='addr1']","#address"]);
      const city  = pick(["#city","input[name='city']"]);
      const state = pick(["#state","input[name='state']"]);
      const zip   = pick(["#zip","input[name='zip']","#zipcode","input[name='zipcode']","#postal","input[name='postal']","#postalCode","input[name='postalCode']","input[autocomplete='postal-code']"]);
      const notes = pick(["#notes","textarea[name='notes']"]);

      // Build a readable place string (but we only GEOCODE by ZIP)
      const place = [addr1, city, state, zip].filter(Boolean).join(", ");

      try{
        btn.disabled = true;

        const ev = await window.FW.createEvent({ title, whenISO, place, city, state, zip, notes });

        // Redirect to event page immediately
        location.href = `event.html?id=${encodeURIComponent(ev.id)}`;
      }catch(err){
        console.error(err);
        alert("Could not create event. (Saved locally may have failed.)");
      }finally{
        btn.disabled = false;
      }
    });
  });
})();

/* =========================
   FW_EVENT_COLORS_V1
   Classify tiles by time-to-event
   ========================= */
(function(){
  if(!window.FW) window.FW = {};

  window.FW.classForEventTime = function(whenISO){
    const t = new Date(whenISO).getTime();
    if(!Number.isFinite(t)) return "";
    const now = Date.now();
    const diffMs = t - now;

    if(diffMs < 0) return "ev-past";

    const diffHours = diffMs / (1000*60*60);
    const diffDays  = diffMs / (1000*60*60*24);

    if(diffHours <= 48) return "ev-urgent";  // red
    if(diffDays  <= 7)  return "ev-soon";    // yellow
    return "ev-good";                         // green
  };

  // If your renderers already exist, we patch tile creation automatically
  // by adding a helper used by pages that render .tile elements.
  window.FW.decorateEventTile = function(tileEl, ev){
    if(!tileEl || !ev) return;
    const cls = window.FW.classForEventTime(ev.whenISO);
    if(cls) tileEl.classList.add(cls);
  };
})();

/* =========================
   FW_DASHBOARD_RECENT_RENDER_V1
   Forces Dashboard recent-events list to render as .tile + color classes
   ========================= */
(function(){
  const KEY = "fw_events_v1";

  function readEvents(){
    try { return JSON.parse(localStorage.getItem(KEY) || "[]"); }
    catch { return []; }
  }

  function findRecentBox(){
    // Try a bunch of likely ids/classes without you having to remember which one
    return (
      document.getElementById("recentEvents") ||
      document.getElementById("recent") ||
      document.getElementById("recentList") ||
      document.querySelector("[data-recent-events]") ||
      document.querySelector(".recentEvents") ||
      null
    );
  }

  function prettyWhen(iso){
    const d = new Date(iso);
    if(!Number.isFinite(d.getTime())) return "—";
    return d.toLocaleString([], { weekday:"short", month:"short", day:"numeric", hour:"2-digit", minute:"2-digit" });
  }

  function renderRecent(){
    const box = findRecentBox();
    if(!box) return;

    const list = readEvents().slice(0, 6); // show last 6
    box.innerHTML = "";

    if(!list.length){
      const div = document.createElement("div");
      div.className = "muted";
      div.textContent = "No recent events yet.";
      box.appendChild(div);
      return;
    }

    list.forEach(ev => {
      const a = document.createElement("a");
      a.href = `event.html?id=${encodeURIComponent(ev.id)}`;
      a.className = "tile";
      // add color class (green/yellow/red/past)
      if(window.FW && typeof window.FW.decorateEventTile === "function"){
        window.FW.decorateEventTile(a, ev);
      }

      a.innerHTML = `
        <div style="font-weight:800; margin-bottom:4px">${(ev.title||"Untitled").replace(/</g,"&lt;")}</div>
        <div class="muted">${prettyWhen(ev.whenISO)} · ${(ev.place||"").replace(/</g,"&lt;")}</div>
      `;

      box.appendChild(a);
    });

    // spacing between tiles if the container doesn’t already do it
    box.style.display = "grid";
    box.style.gap = "10px";
  }

  document.addEventListener("DOMContentLoaded", renderRecent);
/* FW_DASHBOARD_RECENT_RENDER_DELAY_V1: run again after dashboard's own loadRecent() */
document.addEventListener("DOMContentLoaded", () => setTimeout(renderRecent, 350));
document.addEventListener("DOMContentLoaded", () => setTimeout(renderRecent, 1200));
})();
