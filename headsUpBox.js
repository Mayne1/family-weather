/*
  FW_HEADSUP_V1
  Uses NWS forecast to generate "Heads-up" items: fog, wind, heat/cold, rain.
  Prefers Settings base location: localStorage fw_base_location_v1.
*/
(function(){
  const KEY = "fw_base_location_v1";
  const $ = (id) => document.getElementById(id);

  function esc(s){ return String(s||"").replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
  function toNum(s){ const n = Number(s); return Number.isFinite(n) ? n : null; }

  function preferredPoint(){
    try{
      const raw = localStorage.getItem(KEY);
      if(!raw) return null;
      const o = JSON.parse(raw);
      if(o && (o.mode === "home" || o.mode === "device") && isFinite(+o.lat) && isFinite(+o.lon)){
        return { lat:+o.lat, lon:+o.lon, label:o.label || "" };
      }
    }catch(e){}
    return null;
  }

  async function geoOnce(){
    return await new Promise((resolve) => {
      if(!("geolocation" in navigator)) return resolve(null);
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude, label:"" }),
        () => resolve(null),
        { enableHighAccuracy:false, maximumAge: 60*60*1000, timeout: 9000 }
      );
    });
  }

  async function fetchJSON(url){
    const r = await fetch(url, { cache:"no-store" });
    if(!r.ok) throw new Error(`HTTP ${r.status}`);
    return await r.json();
  }

  function parseWindMph(windSpeed){
    // e.g. "5 mph" or "10 to 20 mph"
    const m = String(windSpeed||"").match(/(\d+)(?:\s*to\s*(\d+))?\s*mph/i);
    if(!m) return null;
    const a = toNum(m[1]);
    const b = toNum(m[2]);
    return b ?? a;
  }

  function addUnique(arr, item, key){
    if(arr.some(x => x[key] === item[key])) return;
    arr.push(item);
  }

  function buildHeadsUp(forecastPeriods){
    const out = [];
    const next = (forecastPeriods || []).slice(0, 10); // roughly next ~2-3 days

    for(const p of next){
      const shortF = (p.shortForecast || "").toLowerCase();
      const detailed = (p.detailedForecast || "").toLowerCase();
      const wind = parseWindMph(p.windSpeed);
      const temp = toNum(p.temperature);
      const isDay = !!p.isDaytime;

      // Fog / smoke / haze
      if(/fog|haze|smoke/.test(shortF) || /fog|haze|smoke/.test(detailed)){
        addUnique(out, {
          kind:"Fog",
          severity:"moderate",
          when: p.name || "",
          text: `Reduced visibility possible (${p.shortForecast || "foggy"}).`,
          link: p?.icon || ""
        }, "kind");
      }

      // Wind
      if(wind !== null && wind >= 18){
        addUnique(out, {
          kind:"Wind",
          severity: wind >= 25 ? "severe" : "moderate",
          when: p.name || "",
          text: `Wind up to ~${wind} mph.`,
          link: ""
        }, "kind");
      }

      // Heat/Cold (simple thresholds; tune anytime)
      if(temp !== null){
        if(temp >= 95){
          addUnique(out, {
            kind:"Heat",
            severity: temp >= 105 ? "severe" : "moderate",
            when: p.name || "",
            text: `Hot: around ${temp}°${p.temperatureUnit || "F"}.`,
            link: ""
          }, "kind");
        }
        if(temp <= 35 && !isDay){
          addUnique(out, {
            kind:"Cold",
            severity: temp <= 28 ? "severe" : "moderate",
            when: p.name || "",
            text: `Cold overnight: around ${temp}°${p.temperatureUnit || "F"}.`,
            link: ""
          }, "kind");
        }
      }

      // Rain/Thunder (based on forecast text)
      if(/thunder|t-storm|storm/.test(shortF) || /thunder/.test(detailed)){
        addUnique(out, {
          kind:"Thunder",
          severity:"severe",
          when: p.name || "",
          text: `Thunderstorms possible.`,
          link: ""
        }, "kind");
      } else if(/rain|showers/.test(shortF) || /rain|showers/.test(detailed)){
        addUnique(out, {
          kind:"Rain",
          severity:"moderate",
          when: p.name || "",
          text: `Rain/showers possible.`,
          link: ""
        }, "kind");
      }

      if(out.length >= 4) break;
    }

    return out.slice(0,4);
  }

  function pillClass(sev){
    if(sev === "severe") return "ev-soon";
    return "ev-good";
  }

  function render(box, items, note){
    if(!items || !items.length){
      box.innerHTML = `<div class="muted">${esc(note || "No heads-up right now.")}</div>`;
      return;
    }

    box.innerHTML = "";
    items.slice(0,4).forEach(h => {
      const el = document.createElement("div");
      el.className = `tile ${pillClass(h.severity)}`;
      el.innerHTML = `
        <div style="font-weight:800; margin-bottom:4px">${esc(h.kind)} <span class="muted" style="font-weight:600">· ${esc(h.when)}</span></div>
        <div class="muted">${esc(h.text)}</div>
      `;
      box.appendChild(el);
    });

    box.style.display = "grid";
    box.style.gap = "10px";
  }

  async function load(){
    const box = $("headsUpList");
    if(!box) return;

    box.innerHTML = `<div class="muted">Loading heads-up…</div>`;

    // 1) Get point from settings; if not present, ask device (one-time)
    let pt = preferredPoint();
    if(!pt){
      const geo = await geoOnce();
      if(geo){
        // save so we don't keep asking
        try{
          localStorage.setItem(KEY, JSON.stringify({ mode:"device", lat:geo.lat, lon:geo.lon, label:geo.label, updatedAt:Date.now() }));
        }catch(e){}
        pt = geo;
      }
    }

    if(!pt){
      render(box, [], "Set a Home ZIP or allow device location in Settings.");
      return;
    }

    try{
      // NWS requires points endpoint first → forecast URL
      const points = await fetchJSON(`https://api.weather.gov/points/${pt.lat},${pt.lon}`);
      const forecastUrl = points?.properties?.forecast;
      if(!forecastUrl) throw new Error("No forecast URL from NWS points.");

      const fc = await fetchJSON(forecastUrl);
      const periods = fc?.properties?.periods || [];

      const heads = buildHeadsUp(periods);
      render(box, heads, "No heads-up right now.");
    }catch(e){
      console.warn("headsUpBox failed:", e);
      render(box, [], "Heads-up unavailable right now.");
    }
  }

  document.addEventListener("DOMContentLoaded", load);
  document.addEventListener("fw:baseLocationChanged", load);
})();
