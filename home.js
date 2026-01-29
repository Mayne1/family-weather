/* Family Weather - home.js (SAFE fresh build) */

(() => {
  // Toggle this if you don't want the green badge
  const FW_SHOW_BADGE = false;

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

  const fab5 = [
    { name:"Stockton, CA",  lat:37.9577, lon:-121.2908 },
    { name:"Oakland, CA",   lat:37.8044, lon:-122.2712 },
    { name:"Memphis, TN",   lat:35.1495, lon:-90.0490 },
    { name:"Manteca, CA",   lat:37.7974, lon:-121.2161 },
    { name:"Las Vegas, NV", lat:36.1699, lon:-115.1398 },
  ];

  const el = (id) => document.getElementById(id);

  function safeText(id, value){
    const n = el(id);
    if (n) n.textContent = value;
  }
  function safeHTML(id, value){
    const n = el(id);
    if (n) n.innerHTML = value;
  }

  function fmtDay(iso){
    const d = new Date(iso + "T00:00:00");
    return d.toLocaleDateString(undefined, { weekday:"short", month:"short", day:"numeric" });
  }

  function fwBadge(){
    if (!FW_SHOW_BADGE) return;
    try{
      if (document.getElementById("fwDebugBadge")) return;
      document.body.insertAdjacentHTML(
        "afterbegin",
        "<div id='fwDebugBadge' style='position:fixed;z-index:999999;top:10px;left:10px;padding:6px 10px;border-radius:10px;background:#22c55e;color:#021;font-weight:900;box-shadow:0 10px 30px rgba(0,0,0,.35)'>HOME.JS LOADED ✅</div>"
      );
    }catch(e){}
  }

  function setYearSafe(){
    const y = el("year");
    if (y) y.textContent = new Date().getFullYear();
  }

  function setLoading(on){
    const b = el("loadState");
    if (!b) return;
    b.style.display = on ? "inline-flex" : "none";
    b.textContent = on ? "Loading…" : "";
  }

  function styleAQI(usAqi){
    const chip = el("aqiChip");
    if (!chip) return;
    chip.className = "aqiChip";
    if (usAqi == null || Number.isNaN(usAqi)) { chip.textContent = "AQI —"; return; }
    const v = Math.round(usAqi);
    chip.textContent = `AQI ${v}`;
    if (v <= 50) chip.classList.add("aqi-good");
    else if (v <= 100) chip.classList.add("aqi-mod");
    else chip.classList.add("aqi-bad");
  }

  function weatherCodeToIcon(code, isDay){
    if ([0,1].includes(code)) return isDay ? "clear-day" : "clear-night";
    if ([2].includes(code))   return isDay ? "partly-cloudy-day" : "partly-cloudy-night";
    if ([3].includes(code))   return "cloudy";
    if ([45,48].includes(code)) return "fog";
    if ([51,53,55,56,57].includes(code)) return "drizzle";
    if ([61,63,65,66,67,80,81,82].includes(code)) return "rain";
    if ([71,73,75,77,85,86].includes(code)) return "snow";
    if ([95,96,99].includes(code)) return "thunderstorms";
    return "cloudy";
  }

  function saveLastCityIndex(i){ try{ localStorage.setItem("fw_last_city", String(i)); }catch(e){} }
  function loadLastCityIndex(max){
    try{
      const v = localStorage.getItem("fw_last_city");
      const i = parseInt(v, 10);
      if (Number.isFinite(i) && i >= 0 && i < max) return i;
    }catch(e){}
    return 0;
  }

  function hideAllScenes(){
    const ids = ["scene-clear-day","scene-clear-night","scene-cloudy","scene-rain","scene-snow","scene-thunder","scene-fog"];
    ids.forEach(id => {
      const n = el(id);
      if (n) n.classList.remove("on");
    });
  }

  function ensureDrops(containerId, count){
    const box = el(containerId);
    if (!box) return;
    if (box.childElementCount >= count) return;
    box.innerHTML = "";
    for (let i=0;i<count;i++){
      const d = document.createElement("i");
      d.style.left = (15 + Math.random()*260) + "px";
      d.style.animationDelay = (Math.random()*0.9) + "s";
      box.appendChild(d);
    }
  }

  function ensureFlakes(containerId, count){
    const box = el(containerId);
    if (!box) return;
    if (box.childElementCount >= count) return;
    box.innerHTML = "";
    for (let i=0;i<count;i++){
      const f = document.createElement("i");
      f.style.left = (10 + Math.random()*270) + "px";
      f.style.animationDelay = (Math.random()*2.2) + "s";
      f.style.opacity = (0.25 + Math.random()*0.35).toFixed(2);
      const s = 4 + Math.random()*5;
      f.style.width = s + "px";
      f.style.height = s + "px";
      box.appendChild(f);
    }
  }

  function pickScene(weatherCode, isDay){
    if (weatherCode === 0 || weatherCode === 1) return isDay ? "scene-clear-day" : "scene-clear-night";
    if (weatherCode === 2 || weatherCode === 3) return "scene-cloudy";
    if (weatherCode === 45 || weatherCode === 48) return "scene-fog";
    if (weatherCode === 95 || weatherCode === 96 || weatherCode === 99) return "scene-thunder";
    if ([71,73,75,77,85,86].includes(weatherCode)) return "scene-snow";
    if ([51,53,55,56,57,61,63,65,66,67,80,81,82].includes(weatherCode)) return "scene-rain";
    return isDay ? "scene-clear-day" : "scene-clear-night";
  }

  async function fetchCityNow(city){
    const url = new URL("https://api.open-meteo.com/v1/forecast");
    url.searchParams.set("latitude", city.lat);
    url.searchParams.set("longitude", city.lon);
    url.searchParams.set("timezone", "auto");
    url.searchParams.set("temperature_unit", "fahrenheit");
    url.searchParams.set("forecast_days", "1");
    url.searchParams.set("current", "temperature_2m,weather_code,is_day");
    const res = await fetch(url.toString(), { cache:"no-store" });
    if(!res.ok) throw new Error("city now fetch failed");
    const data = await res.json();
    return data.current || null;
  }

  async function updateFab5Temps(){
    const rows = document.querySelectorAll("[data-city-idx]");
    rows.forEach(async (row) => {
      const idx = parseInt(row.getAttribute("data-city-idx") || "", 10);
      const meta = row.querySelector(".cityMeta");
      if (!meta || !Number.isFinite(idx)) return;
      try{
        const c = await fetchCityNow(fab5[idx]);
        if(!c) return;
        const t = Math.round(c.temperature_2m);
        const icon = weatherCodeToIcon(c.weather_code, !!c.is_day);
        meta.innerHTML = `<img class="cityIcon" src="/icons/weather/${icon}.svg" alt="" /> ${t}°`;
      }catch(e){}
    });
  }

  async function loadWeather(city){
    safeText("locName", city.name);
    safeText("place", city.name);

    safeText("cond", "Loading…");
    safeText("temp", "—");
    safeText("feels", "—");
    safeText("wind", "—");
    safeText("hum", "—");
    safeText("updated", "—");
    styleAQI(null);
    safeText("pm25", "—");

    safeHTML("forecast", `<div class="row"><span>Loading…</span><span>—</span></div>`);
    setLoading(true);

    try {
      const url = new URL("https://api.open-meteo.com/v1/forecast");
      url.searchParams.set("latitude", city.lat);
      url.searchParams.set("longitude", city.lon);
      url.searchParams.set("timezone", "auto");
      url.searchParams.set("temperature_unit", "fahrenheit");
      url.searchParams.set("wind_speed_unit", "mph");
      url.searchParams.set("forecast_days", "10");
      url.searchParams.set("current", "temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code,is_day");
      url.searchParams.set("daily", "temperature_2m_max,temperature_2m_min,precipitation_probability_max,weather_code");

      const res = await fetch(url.toString(), { cache:"no-store" });
      if(!res.ok) throw new Error("weather fetch failed");
      const data = await res.json();

      const c = data.current;
      safeText("temp", String(Math.round(c.temperature_2m)));
      safeText("feels", String(Math.round(c.apparent_temperature)));
      safeText("wind", String(Math.round(c.wind_speed_10m)));
      safeText("hum", String(Math.round(c.relative_humidity_2m)));
      safeText("cond", WMO[c.weather_code] || "Unknown");
      safeText("updated", new Date(c.time).toLocaleTimeString([], { hour:"2-digit", minute:"2-digit" }));

      hideAllScenes();
      const sceneId = pickScene(c.weather_code, !!c.is_day);
      const sceneEl = el(sceneId);
      if (sceneEl) sceneEl.classList.add("on");
      if (sceneId === "scene-rain") ensureDrops("rainDrops", 18);
      if (sceneId === "scene-thunder") ensureDrops("stormDrops", 20);
      if (sceneId === "scene-snow") ensureFlakes("snowFlakes", 16);

      // 10-day WITH ICONS
      const t = data.daily?.time || [];
      const hi = data.daily?.temperature_2m_max || [];
      const lo = data.daily?.temperature_2m_min || [];
      const pop = data.daily?.precipitation_probability_max || [];
      const code = data.daily?.weather_code || [];

      const box = el("forecast");
      if (box){
        box.innerHTML = "";
        for(let i=0;i<Math.min(10,t.length);i++){
          const row = document.createElement("div");
          row.className = "row forecastRow";
          row.innerHTML = `
            <span>
              <img class="forecastIcon" src="/icons/weather/${weatherCodeToIcon(code[i], true)}.svg" alt="" />
              ${fmtDay(t[i])} <span style="opacity:.75">• ${WMO[code[i]] || "—"}</span>
            </span>
            <span><span style="opacity:.75">${Math.round(lo[i])}°</span> / <strong>${Math.round(hi[i])}°</strong> <span style="opacity:.75">${pop[i] ?? 0}%</span></span>
          `;
          box.appendChild(row);
        }
      }

      // Air quality
      const aq = new URL("https://air-quality-api.open-meteo.com/v1/air-quality");
      aq.searchParams.set("latitude", city.lat);
      aq.searchParams.set("longitude", city.lon);
      aq.searchParams.set("timezone", "auto");
      aq.searchParams.set("current", "us_aqi,pm2_5");

      const aqRes = await fetch(aq.toString(), { cache:"no-store" });
      if (aqRes.ok) {
        const aqData = await aqRes.json();
        const cur = aqData.current || {};
        styleAQI(cur.us_aqi);
        if (cur.pm2_5 != null) safeText("pm25", String(Math.round(cur.pm2_5)));
      } else {
        styleAQI(null);
      }

    } catch (e) {
      safeText("cond", "Weather unavailable");
      safeHTML("forecast", `<div class="row"><span>Could not load forecast</span><span>—</span></div>`);
      hideAllScenes();
      const cloudy = el("scene-cloudy");
      if (cloudy) cloudy.classList.add("on");
      styleAQI(null);
    } finally {
      setLoading(false);
    }
  }

  function renderFab5(){
    const citiesBox = el("cities");
    if (!citiesBox) return;

    citiesBox.innerHTML = "";
    fab5.forEach((city, i) => {
      const wrap = document.createElement("div");
      wrap.className = "row";
      wrap.setAttribute("data-city-idx", String(i));

      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "city";
      btn.textContent = city.name;
      btn.addEventListener("click", () => { saveLastCityIndex(i); loadWeather(city); });

      const meta = document.createElement("span");
      meta.className = "cityMeta";
      meta.textContent = "—";

      wrap.appendChild(btn);
      wrap.appendChild(meta);
      citiesBox.appendChild(wrap);
    });

    updateFab5Temps();
  }

  function start(){
    fwBadge();
    setYearSafe();
    renderFab5();
    loadWeather(fab5[loadLastCityIndex(fab5.length)]);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();



/* ===== FW_HOME_UPCOMING_EVENTS_V1 =====
   Reads localStorage fw_events (created on Dashboard) and renders 4 tiles on Home.
   Colors:
     - red    = event within 48 hours
     - yellow = RSVP deadline passed
     - green  = RSVP window still open
*/
(function homeUpcomingEvents(){
  const listEl = document.getElementById("upcomingEvents");
  const emptyEl = document.getElementById("upcomingEmpty");
  if (!listEl) return;

  function safeParse(json){
    try{ return JSON.parse(json); }catch(e){ return null; }
  }

  function toDateTime(dateStr, timeStr){
    // dateStr: YYYY-MM-DD, timeStr: HH:MM
    if(!dateStr) return null;
    const t = (timeStr && timeStr.trim()) ? timeStr.trim() : "12:00";
    const iso = `${dateStr}T${t}:00`;
    const d = new Date(iso);
    return isNaN(d.getTime()) ? null : d;
  }

  function fmtWhen(dateStr, timeStr){
    const d = toDateTime(dateStr, timeStr);
    if(!d) return "—";
    return d.toLocaleString([], { weekday:"short", month:"short", day:"numeric", hour:"numeric", minute:"2-digit" });
  }

  function tileClass(evt){
    const now = new Date();
    const eventDt = toDateTime(evt.date, evt.time);
    const rsvpDt  = evt.rsvpBy ? toDateTime(evt.rsvpBy, "23:59") : null;

    // Red: event is on top of you (48h)
    if (eventDt){
      const hrs = (eventDt.getTime() - now.getTime()) / 36e5;
      if (hrs <= 48) return "is-red";
    }

    // Yellow: RSVP closed (past rsvpBy)
    if (rsvpDt && now.getTime() > rsvpDt.getTime()) return "is-yellow";

    // Green: default
    return "is-green";
  }

  function loadEvents(){
    const raw = localStorage.getItem("fw_events") || "[]";
    const arr = safeParse(raw);
    return Array.isArray(arr) ? arr : [];
  }

  function render(){
    const all = loadEvents();

    // only show “sent” (created) events; ignore drafts
    const now = new Date();
    const upcoming = all
      .filter(e => e && e.status !== "draft")
      .map(e => ({...e, _dt: toDateTime(e.date, e.time)}))
      .filter(e => e._dt && e._dt.getTime() >= (now.getTime() - 6*36e5)) // allow just-started events
      .sort((a,b) => a._dt.getTime() - b._dt.getTime())
      .slice(0, 4);

    listEl.innerHTML = "";

    if (!upcoming.length){
      if (emptyEl) emptyEl.style.display = "block";
      return;
    }
    if (emptyEl) emptyEl.style.display = "none";

    for (const evt of upcoming){
      const div = document.createElement("div");
      div.className = `eventTile ${tileClass(evt)}`;
      div.innerHTML = `
        <div class="top">
          <div class="name">${(evt.name || "Untitled event")}</div>
          <div class="when">${fmtWhen(evt.date, evt.time)}</div>
        </div>
        <div class="meta">${(evt.location || "Location TBD")}</div>
      `;
      listEl.appendChild(div);
    }
  }

  // render now + whenever events change in another tab
  render();
  window.addEventListener("storage", (e) => {
    if (e.key === "fw_events") render();
  });
})();

