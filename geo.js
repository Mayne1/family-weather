/* FW_GEO_V4 — ZIP OR DEVICE base location (non-module, browser-safe)
   Stores:
     fw_loc_mode: "device" | "zip"
     fw_zip: "95206"
     fw_point: JSON {lat,lon,label,ts,source}
*/

(function(){
  const LS_MODE = "fw_loc_mode";
  const LS_ZIP  = "fw_zip";
  const LS_PT   = "fw_point";

  function lsGet(k, d){ try{ const v = localStorage.getItem(k); return v==null ? d : v; }catch(e){ return d; } }
  function lsSet(k, v){ try{ localStorage.setItem(k, v); }catch(e){} }

  function notify(pt){
    try{
      window.dispatchEvent(new CustomEvent("fw:geo", { detail: pt }));
    }catch(e){}
    try{
      if(window.FW && typeof window.FW.onGeoPoint === "function"){
        window.FW.onGeoPoint(pt);
      }
    }catch(e){}
  }

  function setPoint(lat, lon, source, label){
    const pt = {
      lat: +lat,
      lon: +lon,
      label: (label && String(label).trim()) ? String(label).trim() : "",
      ts: Date.now(),
      source: source || "unknown"
    };
    lsSet(LS_PT, JSON.stringify(pt));
    // compatibility keys (some older code might read these)
    lsSet("fw_lat", String(pt.lat));
    lsSet("fw_lon", String(pt.lon));
    notify(pt);
    return pt;
  }

  function getPoint(){
    try{
      const j = JSON.parse(lsGet(LS_PT, "null"));
      if(!j || typeof j.lat !== "number" || typeof j.lon !== "number") return null;
      // normalize label
      if(typeof j.label !== "string") j.label = "";
      return j;
    }catch(e){ return null; }
  }

  function isFresh(pt, maxAgeMs){
    if(!pt || !pt.ts) return false;
    return (Date.now() - pt.ts) < maxAgeMs;
  }

  function getMode(){
    const m = String(lsGet(LS_MODE, "device")).toLowerCase();
    return (m === "zip") ? "zip" : "device";
  }

  function setMode(mode){
    lsSet(LS_MODE, (mode === "zip") ? "zip" : "device");
  }

  function getZip(){
    return String(lsGet(LS_ZIP, "")).trim();
  }

  function setZip(zip){
    lsSet(LS_ZIP, String(zip || "").trim());
  }

  async function pointFromDevice(){
    return new Promise((resolve, reject) => {
      if(!navigator.geolocation) return reject(new Error("Geolocation not supported"));
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const c = pos && pos.coords ? pos.coords : {};
          if(c.latitude == null || c.longitude == null) return reject(new Error("No coords"));
          resolve(setPoint(c.latitude, c.longitude, "device", "Device location"));
        },
        (err) => reject(err || new Error("Geolocation failed")),
        { enableHighAccuracy:false, timeout:8000, maximumAge: 5*60*1000 }
      );
    });
  }

  async function pointFromZip(zip){
    zip = String(zip || "").trim();
    if(!zip) throw new Error("ZIP missing");

    const r = await fetch(`/api/weather/geocode?zip=${encodeURIComponent(zip)}`, { cache:"no-store" });
    if(!r.ok) throw new Error(`Geocode failed (${r.status})`);

    const j = await r.json();
    const lat = (j.lat != null) ? j.lat : j.latitude;
    const lon = (j.lon != null) ? j.lon : j.longitude;
    const label = j.label || (zip ? `ZIP ${zip}` : "ZIP");

    if(lat == null || lon == null) throw new Error("Geocode missing lat/lon");
    return setPoint(lat, lon, "zip", label);
  }

  async function getPreferredPoint(){
    const mode = getMode();
    const cached = getPoint();
    // fresh enough: 10 minutes
    if(isFresh(cached, 10*60*1000)) return cached;

    if(mode === "zip"){
      return await pointFromZip(getZip());
    }
    return await pointFromDevice();
  }

  async function refreshPoint(){
    try{
      const pt = await getPreferredPoint();
      if(pt) notify(pt);
      return pt;
    }catch(e){
      const pt = getPoint();
      if(pt) notify(pt);
      return pt;
    }
  }

  document.addEventListener("DOMContentLoaded", () => { refreshPoint(); });

  window.FWGeo = {
    getPreferredPoint,
    refreshPoint,
    getMode,
    setMode,
    getZip,
    setZip,
    getPoint,
    setPoint
  };
})();
