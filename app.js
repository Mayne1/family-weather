document.getElementById("year").textContent = new Date().getFullYear();

/* ===== FW_GLOBAL_SETTINGS_V2 ===== */
(function(){
  function applyGlobalSettings(){
    try{
      const theme = localStorage.getItem("fw_theme") || "dark";
      const rn    = localStorage.getItem("fw_rightnow_size") || "1";

      document.documentElement.setAttribute("data-theme", theme);

      document.body.classList.remove("rn-size-0","rn-size-1","rn-size-2");
      document.body.classList.add(`rn-size-${rn}`);
    }catch(e){}
  }

  if (document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", applyGlobalSettings);
  } else {
    applyGlobalSettings();
  }

  // Settings page fires this after Save/Reset
  window.addEventListener("fw:settings", applyGlobalSettings);
})();

function weatherCodeToIcon(code, isDay){
  if ([0,1].includes(code)) return isDay ? "clear-day" : "clear-night";
  if ([2].includes(code)) return isDay ? "partly-cloudy-day" : "partly-cloudy-night";
  if ([3].includes(code)) return "cloudy";
  if ([45,48].includes(code)) return "fog";
  if ([51,53,55,56,57].includes(code)) return "drizzle";
  if ([61,63,65,66,67,80,81,82].includes(code)) return "rain";
  if ([71,73,75,77,85,86].includes(code)) return "snow";
  if ([95,96,99].includes(code)) return "thunderstorms";
  return "cloudy";
}

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
  { name:"Stockton, CA", lat:37.9577, lon:-121.2908 },
  { name:"Oakland, CA", lat:37.8044, lon:-122.2712 },
  { name:"Memphis, TN", lat:35.1495, lon:-90.0490 },
  { name:"Manteca, CA", lat:37.7974, lon:-121.2161 },
  { name:"Las Vegas, NV", lat:36.1699, lon:-115.1398 },
];

const el = (id) => document.getElementById(id);

function fmtDay(iso){
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString(undefined, { weekday:"short", month:"short", day:"numeric" });
}

function setLoading(on){
  const b = el("loadState");
  b.style.display = on ? "inline-flex" : "none";
  b.textContent = on ? "Loading…" : "";
}

function styleAQI(usAqi){
  const chip = el("aqiChip");
  chip.className = "aqiChip";
  if (usAqi == null || Number.isNaN(usAqi)) { chip.textContent = "AQI —"; return; }
  const v = Math.round(usAqi);
  chip.textContent = `AQI ${v}`;
  if (v <= 50) chip.classList.add("aqi-good");
  else if (v <= 100) chip.classList.add("aqi-mod");
  else chip.classList.add("aqi-bad");
}

function hideAllScenes(){
  const ids = ["scene-clear-day","scene-clear-night","scene-cloudy","scene-rain","scene-snow","scene-thunder","scene-fog"];
  ids.forEach(id => el(id).classList.remove("on"));
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
  // Clear-ish
  if (weatherCode === 0 || weatherCode === 1){
    return isDay ? "scene-clear-day" : "scene-clear-night";
  }
  // Cloudy
  if (weatherCode === 2 || weatherCode === 3){
    return "scene-cloudy";
  }
  // Fog
  if (weatherCode === 45 || weatherCode === 48){
    return "scene-fog";
  }
  // Thunder
  if (weatherCode === 95 || weatherCode === 96 || weatherCode === 99){
    return "scene-thunder";
  }
  // Snow family
  if (weatherCode === 71 || weatherCode === 73 || weatherCode === 75 || weatherCode === 77 || weatherCode === 85 || weatherCode === 86){
    return "scene-snow";
  }
  // Rain/drizzle/showers/freezing
  if ([51,53,55,56,57,61,63,65,66,67,80,81,82].includes(weatherCode)){
    return "scene-rain";
  }
  // default
  return isDay ? "scene-clear-day" : "scene-clear-night";
}

async function loadWeather(city){
  el("locName").textContent = city.name;
  el("place").textContent = city.name;
  el("cond").textContent = "Loading…";
  el("temp").textContent = "—";
  el("feels").textContent = "—";
  el("wind").textContent = "—";
  el("hum").textContent = "—";
  el("updated").textContent = "—";
  styleAQI(null);
  el("pm25").textContent = "—";

  el("forecast").innerHTML = `<div class="row"><span>Loading…</span><span>—</span></div>`;
  setLoading(true);

  try {
    // Forecast / current weather
    const url = new URL("https://api.open-meteo.com/v1/forecast");
    url.searchParams.set("latitude", city.lat);
    url.searchParams.set("longitude", city.lon);
    url.searchParams.set("timezone", "auto");
    url.searchParams.set("temperature_unit", "fahrenheit");
    url.searchParams.set("wind_speed_unit", "mph");
    url.searchParams.set("forecast_days", "10");
    url.searchParams.set("current", "temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code,is_day");
    url.searchParams.set("daily", "temperature_2m_max,temperature_2m_min,precipitation_probability_max,weather_code");

    const res = await fetch(url.toString(), { cache: "no-store" });
    if(!res.ok) throw new Error("weather fetch failed");
    const data = await res.json();

    const c = data.current;

    // Set icon
    const iconName = weatherCodeToIcon(c.weather_code, !!c.is_day);
    const wxIconEl = document.getElementById("wxIcon");
    if (wxIconEl) wxIconEl.src = `/icons/weather/${iconName}.svg`;

    el("temp").textContent = Math.round(c.temperature_2m);
    el("feels").textContent = Math.round(c.apparent_temperature);
    el("wind").textContent = Math.round(c.wind_speed_10m);
    el("hum").textContent = Math.round(c.relative_humidity_2m);
    el("cond").textContent = WMO[c.weather_code] || "Unknown";
    el("updated").textContent = new Date(c.time).toLocaleTimeString([], { hour:"2-digit", minute:"2-digit" });

    // Set scene
    hideAllScenes();
    const sceneId = pickScene(c.weather_code, !!c.is_day);
    el(sceneId).classList.add("on");
    if (sceneId === "scene-rain") ensureDrops("rainDrops", 18);
    if (sceneId === "scene-thunder") ensureDrops("stormDrops", 20);
    if (sceneId === "scene-snow") ensureFlakes("snowFlakes", 16);

    // 10-day
    const t = data.daily.time;
    const hi = data.daily.temperature_2m_max;
    const lo = data.daily.temperature_2m_min;
    const pop = data.daily.precipitation_probability_max;
    const code = data.daily.weather_code;

    const box = el("forecast");
    box.innerHTML = "";
    for(let i=0;i<Math.min(10,t.length);i++){
      const row = document.createElement("div");
      row.className = "row";
      row.innerHTML = `
        <span>${fmtDay(t[i])} <span style="opacity:.75">• ${WMO[code[i]] || "—"}</span></span>
        <span><span style="opacity:.75">${Math.round(lo[i])}°</span> / <strong>${Math.round(hi[i])}°</strong> <span style="opacity:.75">${pop[i] ?? 0}%</span></span>
      `;
      box.appendChild(row);
    }

    // Air quality
    const aq = new URL("https://air-quality-api.open-meteo.com/v1/air-quality");
    aq.searchParams.set("latitude", city.lat);
    aq.searchParams.set("longitude", city.lon);
    aq.searchParams.set("timezone", "auto");
    aq.searchParams.set("current", "us_aqi,pm2_5");

    const aqRes = await fetch(aq.toString(), { cache: "no-store" });
    if (aqRes.ok) {
      const aqData = await aqRes.json();
      const cur = aqData.current || {};
      styleAQI(cur.us_aqi);
      if (cur.pm2_5 != null) el("pm25").textContent = Math.round(cur.pm2_5);
    } else {
      styleAQI(null);
    }

  } catch (e) {
    el("cond").textContent = "Weather unavailable";
    el("forecast").innerHTML = `<div class="row"><span>Could not load forecast</span><span>—</span></div>`;
    hideAllScenes();
    el("scene-cloudy").classList.add("on");
    styleAQI(null);
  } finally {
    setLoading(false);
  }
}

// Render Fab 5 tiles
const citiesBox = el("cities");
citiesBox.innerHTML = "";
fab5.forEach((city) => {
  const wrap = document.createElement("div");
  wrap.className = "row";
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "city";
  btn.textContent = city.name;
  btn.addEventListener("click", () => loadWeather(city));
  wrap.appendChild(btn);
  citiesBox.appendChild(wrap);
});

loadWeather(fab5[0]);

/* ===== Settings panel (theme + right-now sizing) ===== */
(function settingsBoot(){
  const root = document.documentElement;
  const btn = document.getElementById("settingsBtn");
  const panel = document.getElementById("settingsPanel");
  const close = document.getElementById("settingsClose");
  const theme = document.getElementById("themeSelect");
  const rn = document.getElementById("rightNowSize");
  if (!btn || !panel || !close || !theme || !rn) return;

  const savedTheme = localStorage.getItem("fw_theme") || "midnight";
  const savedRN = localStorage.getItem("fw_rn") || "0";
  root.dataset.theme = savedTheme;
  root.dataset.rn = savedRN;
  theme.value = savedTheme;
  rn.value = savedRN;

  function openPanel(){ panel.classList.add("open"); panel.setAttribute("aria-hidden","false"); }
  function closePanel(){ panel.classList.remove("open"); panel.setAttribute("aria-hidden","true"); }

  btn.addEventListener("click", () => panel.classList.contains("open") ? closePanel() : openPanel());
  close.addEventListener("click", closePanel);
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closePanel(); });
  document.addEventListener("click", (e) => {
    if (!panel.classList.contains("open")) return;
    if (panel.contains(e.target) || btn.contains(e.target)) return;
    closePanel();
  });

  theme.addEventListener("change", () => { root.dataset.theme = theme.value; localStorage.setItem("fw_theme", theme.value); });
  rn.addEventListener("input", () => { root.dataset.rn = rn.value; localStorage.setItem("fw_rn", rn.value); });
})();





/* ===== FW_GLOBAL_SETTINGS ===== */
(function(){
  const KEY_THEME = "fw_theme";
  const KEY_RN    = "fw_rightnow_size"; // "0" | "1" | "2"
  const ALLOWED_THEMES = new Set(["dark","light","ocean","sunset","forest","midnight"]);

  function getTheme(){
    const t = (localStorage.getItem(KEY_THEME) || "midnight").trim();
    return ALLOWED_THEMES.has(t) ? t : "midnight";
  }
  function getRn(){
    const v = (localStorage.getItem(KEY_RN) || "1").trim();
    return (v === "0" || v === "1" || v === "2") ? v : "1";
  }

  function apply(){
    try{
      const theme = getTheme();
      const rn = getRn();

      // Theme: drives your CSS like html[data-theme="ocean"] body { ... }
      document.documentElement.setAttribute("data-theme", theme);

      // Optional helper class (if you ever use it)
      document.documentElement.classList.toggle("theme-light", theme === "light");

      // Right-now sizing
      document.body.classList.remove("rn-size-0","rn-size-1","rn-size-2");
      document.body.classList.add(`rn-size-${rn}`);
    }catch(e){}
  }

  function wireControls(){
    const themeSelect  = document.getElementById("themeSelect");
    const rightNowSize = document.getElementById("rightNowSize");

    if (themeSelect){
      themeSelect.value = getTheme();
      themeSelect.addEventListener("change", () => {
        localStorage.setItem(KEY_THEME, themeSelect.value);
        apply();
      });
    }

    if (rightNowSize){
      rightNowSize.value = getRn();
      rightNowSize.addEventListener("input", () => {
        localStorage.setItem(KEY_RN, rightNowSize.value);
        apply();
      });
    }
  }

  if (document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", () => { apply(); wireControls(); });
  } else {
    apply(); wireControls();
  }

  // allow manual re-apply if needed
  window.addEventListener("fw:settings", apply);
})();

/* ===== FW_GLOBAL_SETTINGS_V3 (force html[data-theme]) ===== */
(function(){
  function apply(){
    try{
      const root = document.documentElement;

      // theme values: dark | light | ocean | sunset | forest | midnight
      const theme = (localStorage.getItem("fw_theme") || "dark").trim();
      root.dataset.theme = theme;

      // right now size: 0 | 1 | 2
      const rn = (localStorage.getItem("fw_rightnow_size") || "1").trim();
      document.body.classList.remove("rn-size-0","rn-size-1","rn-size-2");
      document.body.classList.add(`rn-size-${rn}`);
    }catch(e){}
  }

  // Apply on every page (including Home)
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", apply);
  } else {
    apply();
  }

  // If settings page changes something, it can ping this
  window.addEventListener("fw:settings", apply);

  // If controls exist on this page, wire + persist
  document.addEventListener("DOMContentLoaded", () => {
    const themeSelect  = document.getElementById("themeSelect");
    const rightNowSize = document.getElementById("rightNowSize");

    if (themeSelect){
      const saved = (localStorage.getItem("fw_theme") || "dark").trim();
      themeSelect.value = saved;

      themeSelect.addEventListener("change", () => {
        localStorage.setItem("fw_theme", themeSelect.value);
        window.dispatchEvent(new Event("fw:settings"));
      });
    }

    if (rightNowSize){
      const saved = (localStorage.getItem("fw_rightnow_size") || "1").trim();
      rightNowSize.value = saved;

      rightNowSize.addEventListener("input", () => {
        localStorage.setItem("fw_rightnow_size", rightNowSize.value);
        window.dispatchEvent(new Event("fw:settings"));
      });
    }
  });
})();
