/* FW_ALERTSBOX_V2 — Browser-first NWS alerts; fallback to /alerts.json */
(function(){
  function esc(s){ return String(s||"").replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }


  function preferredPoint(){
    // Returns "lat,lon" or null. Prefers Settings override.
    try{
      const raw = localStorage.getItem("fw_base_location_v1");
      if(raw){
        const o = JSON.parse(raw);
        if(o && o.mode === "home" && isFinite(+o.lat) && isFinite(+o.lon)) return `${+o.lat},${+o.lon}`;
        if(o && o.mode === "device" && isFinite(+o.lat) && isFinite(+o.lon)) return `${+o.lat},${+o.lon}`;
      }
    }catch(e){}
    return null;
  }
  function pickContainer(){
    return document.getElementById("alertsList")
        || document.getElementById("alerts")
        || document.querySelector("[data-alerts]")
        || null;
  }

  function severityClass(sev){
    sev = (sev||"").toLowerCase();
    if(sev.includes("extreme")) return "ev-urgent";
    if(sev.includes("severe"))  return "ev-soon";
    return "ev-good";
  }

  function render(box, items, metaNote){
    if(!items || !items.length){
      box.innerHTML = `<div class="muted">${esc(metaNote || "No active alerts.")}</div>`;
      return;
    }

    box.innerHTML = "";
    items.slice(0,4).forEach(a => {
      const el = document.createElement("a");
      el.className = `tile ${severityClass(a.severity)}`;
      el.href = a.link || "#";
      el.target = a.link ? "_blank" : "";
      el.rel = a.link ? "noopener noreferrer" : "";

      const meta = [a.source, a.severity, a.area].filter(Boolean).join(" · ");

      el.innerHTML = `
        <div style="font-weight:800; margin-bottom:4px">${esc(a.title)}</div>
        <div class="muted">${esc(meta)}</div>
      `;
      box.appendChild(el);
    });

    box.style.display = "grid";
    box.style.gap = "10px";
  }

  function normNWS(nws){
    const feats = (nws && nws.features) || [];
    return feats.slice(0,50).map(f => {
      const p = (f && f.properties) || {};
      return {
        source: "NWS",
        id: p.id || f.id,
        title: p.headline || p.event || "Weather alert",
        severity: p.severity || "",
        area: p.areaDesc || "",
        link: p.web || p['@id'] || ""
      };
    });
  }

  async function fetchJSON(url){
    const r = await fetch(url, { cache: "no-store" });
    if(!r.ok) throw new Error(`HTTP ${r.status}`);
    return await r.json();
  }

  function findPointFromLocalStorage(){
    try{
      // Check likely keys first
      const commonKeys = [
        "fw_settings_v1","fw_settings","fw_home_v1","fw_home",
        "fw_profile_v1","fw_profile","fw_location_v1","fw_location",
        "settings","profile","location"
      ];

      function extractLatLon(obj){
        if(!obj || typeof obj !== "object") return null;

        // direct fields
        const lat = obj.lat ?? obj.latitude ?? obj.wxLat ?? obj.homeLat;
        const lon = obj.lon ?? obj.lng ?? obj.longitude ?? obj.wxLon ?? obj.homeLon;
        if(Number.isFinite(+lat) && Number.isFinite(+lon)) return `${+lat},${+lon}`;

        // nested fields
        const candidates = [
          obj.location, obj.home, obj.weather, obj.wx,
          obj.coords, obj.coordinate, obj.coordinates
        ].filter(Boolean);

        for(const c of candidates){
          const r = extractLatLon(c);
          if(r) return r;
        }
        return null;
      }

      function tryKey(k){
        const v = localStorage.getItem(k);
        if(!v) return null;
        // try JSON
        try{
          const obj = JSON.parse(v);
          return extractLatLon(obj);
        }catch{
          // try simple "lat,lon"
          const m = String(v).match(/(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/);
          if(m) return `${m[1]},${m[2]}`;
        }
        return null;
      }

      for(const k of commonKeys){
        const r = tryKey(k);
        if(r) return r;
      }

      // Scan ALL localStorage keys and try to find anything with lat/lon
      for(let idx=0; idx<localStorage.length; idx++){
        const k = localStorage.key(idx);
        const r = tryKey(k);
        if(r) return r;
      }
    }catch(e){}
    return null;
  }


  async function load(){
    const box = pickContainer();
    if(!box) return;

    box.innerHTML = `<div class="muted">Loading alerts…</div>`;

    // 1) Try browser-direct NWS first (avoids VPS outbound issues)
    try{
      const pt = preferredPoint() || findPointFromLocalStorage();
      const url = pt
        ? `https://api.weather.gov/alerts/active?point=${encodeURIComponent(pt)}`
        : "https://api.weather.gov/alerts/active?area=CA";
      const nws = await fetchJSON(url);
      const items = normNWS(nws);
      if(items.length){
        render(box, items, "");
        return;
      }
      // If NWS returns empty, still continue to fallback so we can show CALFIRE if present
    }catch(e){
      // ignore, fallback next
    }

    // 2) Fallback to server-generated /alerts.json (CALFIRE etc.)
    try{
      const j = await fetchJSON(`/alerts.json?ts=${Date.now()}`);
      const items = Array.isArray(j.items) ? j.items : [];
      if(!items.length){
        const err = j.nwsError || j.calfireError;
        render(box, [], err ? "Alerts unavailable right now." : "No active alerts.");
        return;
      }
      render(box, items, "");
    }catch(e){
      render(box, [], "Alerts unavailable right now.");
      console.warn("alertsBox failed:", e);
    }
  }

  document.addEventListener("DOMContentLoaded", load);
})();
