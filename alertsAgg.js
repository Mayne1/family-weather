/*
  FW_ALERTS_AGG_V1 (US MVP)
  Sources:
   - NWS alerts (point + zones)
   - USGS earthquakes (radius)
   - FEMA OpenFEMA (state + recency)
  Renders into #alertsList
*/

(function(){
  const MAX_ITEMS = 4;
  const DEFAULT_RADIUS_KM = 80;
  const GEO_KEY = "fw_geo_point_v1";
  const CACHE_KEY = "fw_alerts_cache_v1";
  const CACHE_TTL_MS = 2 * 60 * 1000; // 2 min

  function esc(s){ return String(s||"").replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
  function nowISO(){ return new Date().toISOString(); }

  function pickBox(){
    return document.getElementById("alertsList") || null;
  }

  function readGeo(){
    try{
      const v = JSON.parse(localStorage.getItem(GEO_KEY) || "null");
      if(v && isFinite(+v.lat) && isFinite(+v.lon)) return { lat:+v.lat, lon:+v.lon, ts: v.ts||0 };
    }catch(e){}
    return null;
  }

  function writeGeo(lat, lon){
    try{
      localStorage.setItem(GEO_KEY, JSON.stringify({ lat:+lat, lon:+lon, ts: Date.now() }));
    }catch(e){}
  }

  function askGeoOnce(onDone){
    if(!("geolocation" in navigator)) return onDone(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        writeGeo(lat, lon);
        onDone({ lat, lon });
      },
      () => onDone(null),
      { enableHighAccuracy:false, maximumAge: 60*60*1000, timeout: 8000 }
    );
  }

  function kmToDegLat(km){ return km / 110.574; }
  function kmToDegLon(km, lat){ return km / (111.320 * Math.cos(lat * Math.PI/180)); }

  function cacheGet(){
    try{
      const v = JSON.parse(localStorage.getItem(CACHE_KEY) || "null");
      if(!v) return null;
      if(Date.now() - (v.ts||0) > CACHE_TTL_MS) return null;
      return v.data || null;
    }catch(e){ return null; }
  }

  function cacheSet(data){
    try{ localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data })); }catch(e){}
  }

  async function fetchJSON(url){
    const r = await fetch(url, { cache: "no-store" });
    if(!r.ok) throw new Error(`HTTP ${r.status}`);
    return await r.json();
  }

  // ---------- Normalizer ----------
  function fingerprint(parts){
    // lightweight browser fingerprint (not cryptographic)
    return btoa(unescape(encodeURIComponent(parts.join("|")))).slice(0, 48);
  }

  function mapSeverityNWS(sev){
    sev = (sev||"").toLowerCase();
    if(sev.includes("extreme")) return "extreme";
    if(sev.includes("severe"))  return "severe";
    if(sev.includes("moderate"))return "moderate";
    if(sev.includes("minor"))   return "minor";
    return "info";
  }

  function normNWS(feature, locMeta, loc){
    const p = feature.properties || {};
    const id = p.id || feature.id || ("nws:" + Math.random());
    return {
      id,
      source: "NWS",
      kind: "weather",
      event_type: (p.event || "weather_alert").toLowerCase().replace(/\s+/g,"_"),
      severity: mapSeverityNWS(p.severity),
      status: "active",
      headline: p.headline || p.event || "Weather alert",
      description: (p.description || "").trim(),
      starts_at: p.effective || p.sent || null,
      ends_at: p.ends || p.expires || null,
      updated_at: p.updated || p.sent || nowISO(),
      location: {
        label: locMeta?.label || loc.label || "",
        lat: loc.lat,
        lon: loc.lon,
        radius_km: loc.radius_km
      },
      area: {
        geometries: feature.geometry ? [feature.geometry] : [],
        county_fips: locMeta?.county_fips ? [locMeta.county_fips] : [],
        zones: locMeta?.zones || []
      },
      links: [{ label: "Details", url: (p.web || p["@id"] || "") }].filter(x => x.url),
      fingerprint: fingerprint(["NWS", id, (p.updated||""), (p.severity||""), (p.event||"")])
    };
  }

  function normUSGS(feature, loc){
    const p = feature.properties || {};
    const id = feature.id || ("usgs:" + Math.random());
    const mag = p.mag;
    const place = p.place || "Earthquake";
    const sev =
      mag >= 6 ? "severe" :
      mag >= 5 ? "moderate" :
      mag >= 4 ? "minor" : "info";

    return {
      id,
      source: "USGS",
      kind: "earthquake",
      event_type: "earthquake",
      severity: sev,
      status: "active",
      headline: `M${mag ?? "?"} — ${place}`,
      description: `Depth: ${p.depth ?? "?"}km`,
      starts_at: p.time ? new Date(p.time).toISOString() : null,
      ends_at: null,
      updated_at: p.updated ? new Date(p.updated).toISOString() : nowISO(),
      location: { label: loc.label, lat: loc.lat, lon: loc.lon, radius_km: loc.radius_km },
      area: { geometries: [], county_fips: [], zones: [] },
      links: [{ label: "Details", url: p.url }].filter(x => x.url),
      fingerprint: fingerprint(["USGS", id, String(p.updated||""), String(p.mag||"")])
    };
  }

  // FEMA is slower cadence; MVP: show recent declarations for state
  function normFEMA(item, loc){
    const id = String(item.disasterNumber || item.id || ("fema:" + Math.random()));
    const title = item.title || item.incidentType || "FEMA update";
    const updated = item.lastRefresh || item.declarationDate || nowISO();

    return {
      id,
      source: "FEMA",
      kind: "declaration",
      event_type: "disaster_declaration",
      severity: "info",
      status: "active",
      headline: title,
      description: (item.incidentType ? `Type: ${item.incidentType}` : ""),
      starts_at: item.declarationDate || null,
      ends_at: null,
      updated_at: updated,
      location: { label: loc.label, lat: loc.lat, lon: loc.lon, radius_km: loc.radius_km },
      area: { geometries: [], county_fips: [], zones: [] },
      links: [{ label: "Details", url: item.disasterUrl || "" }].filter(x => x.url),
      fingerprint: fingerprint(["FEMA", id, String(updated)])
    };
  }

  // ---------- Adapters ----------
  async function fetchNWS(loc){
    // Prefer point endpoint (best relevance)
    const url = `https://api.weather.gov/alerts/active?point=${encodeURIComponent(`${loc.lat},${loc.lon}`)}`;
    const j = await fetchJSON(url);
    const feats = j.features || [];
    const locMeta = await fetchNWSMeta(loc).catch(() => null);
    return feats.map(f => normNWS(f, locMeta, loc));
  }

  async function fetchNWSMeta(loc){
    // points endpoint gives zone URLs + county URL. We'll keep it simple.
    const j = await fetchJSON(`https://api.weather.gov/points/${loc.lat},${loc.lon}`);
    const props = j.properties || {};
    const rel = props.relativeLocation?.properties || {};
    const label = [rel.city, rel.state].filter(Boolean).join(", ");

    // Zone list is URLs; we store the tail ids if present
    const zones = [];
    const z = props.forecastZone || props.forecastOffice || null;
    if(typeof z === "string" && z.includes("/zones/")){
      zones.push(z.split("/").pop());
    }
    // County URL sometimes includes FIPS at the tail, sometimes not; keep best effort.
    let county_fips = "";
    if(typeof props.county === "string"){
      const tail = props.county.split("/").pop();
      // sometimes tail is numeric-ish
      if(tail && /^[0-9]+$/.test(tail)) county_fips = tail;
    }

    return { label, zones, county_fips, state: rel.state || "" };
  }

  async function fetchUSGS(loc){
    // bounding box around point based on radius
    const dLat = kmToDegLat(loc.radius_km);
    const dLon = kmToDegLon(loc.radius_km, loc.lat);
    const minLat = loc.lat - dLat, maxLat = loc.lat + dLat;
    const minLon = loc.lon - dLon, maxLon = loc.lon + dLon;

    const url =
      `https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson` +
      `&starttime=${encodeURIComponent(new Date(Date.now()-7*24*60*60*1000).toISOString().slice(0,10))}` +
      `&minlatitude=${minLat}&maxlatitude=${maxLat}&minlongitude=${minLon}&maxlongitude=${maxLon}` +
      `&orderby=time&limit=20`;

    const j = await fetchJSON(url);
    const feats = j.features || [];
    return feats.map(f => normUSGS(f, loc));
  }

  async function fetchFEMA(locMeta, loc){
    // OpenFEMA query: last 30 days, filter by state if we have it.
    const state = (locMeta?.state || "").trim();
    const since = new Date(Date.now()-30*24*60*60*1000).toISOString();

    // Note: OpenFEMA endpoints vary. We'll use a common one:
    // disasters endpoint (public). If CORS blocks, it will fail gracefully.
    let url = `https://www.fema.gov/api/open/v2/DisasterDeclarationsSummaries?$top=10&$orderby=declarationDate desc&$filter=declarationDate ge datetime'${since}'`;
    if(state) url += ` and state eq '${state}'`;

    const j = await fetchJSON(url);
    const arr = j.DisasterDeclarationsSummaries || j.disasterDeclarationsSummaries || j.value || [];
    return (Array.isArray(arr) ? arr : []).slice(0,10).map(x => normFEMA(x, loc));
  }

  // ---------- Ranking ----------
  const sevRank = { extreme: 5, severe: 4, moderate: 3, minor: 2, info: 1 };
  function score(a){
    return (sevRank[a.severity] || 0) * 100000 + (Date.parse(a.updated_at)||0);
  }

  function render(box, items){
    if(!items.length){
      box.innerHTML = `<div class="muted">No active alerts.</div>`;
      return;
    }
    box.innerHTML = "";
    items.slice(0,MAX_ITEMS).forEach(a => {
      const el = document.createElement("a");
      el.className = "tile ev-good";
      if(a.severity === "extreme") el.className = "tile ev-urgent";
      else if(a.severity === "severe") el.className = "tile ev-soon";

      const link = (a.links && a.links[0] && a.links[0].url) || "";
      el.href = link || "#";
      el.target = link ? "_blank" : "";
      el.rel = link ? "noopener noreferrer" : "";

      const meta = [a.source, a.event_type, a.location?.label].filter(Boolean).join(" · ");
      el.innerHTML = `
        <div style="font-weight:800; margin-bottom:4px">${esc(a.headline)}</div>
        <div class="muted">${esc(meta)}</div>
      `;
      box.appendChild(el);
    });
    box.style.display = "grid";
    box.style.gap = "10px";
  }

  async function load(){
    const box = pickBox();
    if(!box) return;

    // Cache first
    const cached = cacheGet();
    if(cached && Array.isArray(cached.items)){
      render(box, cached.items);
      return;
    }

    box.innerHTML = `<div class="muted">Loading alerts…</div>`;

    const loc0 = readGeo();
    const loc = {
      label: "Your area",
      lat: loc0?.lat,
      lon: loc0?.lon,
      radius_km: DEFAULT_RADIUS_KM
    };

    // If no stored geo, ask once
    if(!isFinite(loc.lat) || !isFinite(loc.lon)){
      await new Promise(res => askGeoOnce((p) => { if(p){ loc.lat=p.lat; loc.lon=p.lon; } res(); }));
    }

    // Still no geo → fallback to CA-wide NWS (like before)
    if(!isFinite(loc.lat) || !isFinite(loc.lon)){
      try{
        const j = await fetchJSON("https://api.weather.gov/alerts/active?area=CA");
        const feats = j.features || [];
        const items = feats.slice(0,50).map(f => normNWS(f, null, { ...loc, lat: 37.95, lon: -121.29 }));
        const out = items.sort((a,b)=>score(b)-score(a)).slice(0,MAX_ITEMS);
        cacheSet({ items: out });
        render(box, out);
        return;
      }catch(e){
        box.innerHTML = `<div class="muted">Alerts unavailable right now.</div>`;
        return;
      }
    }

    // We have geo. Build local meta from NWS points.
    let locMeta = null;
    try{ locMeta = await fetchNWSMeta(loc); }catch(e){}

    // Multi-source fetch (settled, resilient)
    const results = await Promise.allSettled([
      fetchNWS(loc),
      fetchUSGS(loc),
      fetchFEMA(locMeta, loc),
    ]);

    let all = [];
    for(const r of results){
      if(r.status === "fulfilled" && Array.isArray(r.value)) all = all.concat(r.value);
    }

    // Deduplicate by fingerprint
    const seen = new Set();
    all = all.filter(a => {
      const fp = a.fingerprint || (a.source + ":" + a.id);
      if(seen.has(fp)) return false;
      seen.add(fp);
      return true;
    });

    const out = all.sort((a,b)=>score(b)-score(a)).slice(0,MAX_ITEMS);
    cacheSet({ items: out });
    render(box, out.length ? out : []);
  }

  document.addEventListener("DOMContentLoaded", load);
  // If geo permission comes in after load, refresh
  document.addEventListener("fw:geo", load);
})();
