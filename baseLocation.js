/* FW_BASELOCATION_V5 — Home "Base:" box wiring (ZIP + Device) + label in URL + localStorage */

(function(){
  "use strict";

  const LS = {
    MODE:  "fw_loc_mode",     // "device" | "zip"
    ZIP:   "fw_zip",
    LABEL: "fw_base_label",
    LAT:   "fw_base_lat",
    LON:   "fw_base_lon",
    TS:    "fw_base_ts"
  };

  const $ = (id) => document.getElementById(id);

  function lsGet(k, d=null){ try{ const v=localStorage.getItem(k); return v==null? d : v; }catch(_){ return d; } }
  function lsSet(k, v){ try{ localStorage.setItem(k, String(v)); }catch(_){} }

  function setStatus(msg){
    const el = $("baseLocStatus");
    if(el) el.textContent = msg || "";
  }

  function setZipInput(z){
    const el = $("baseZipInput");
    if(el && z) el.value = String(z);
  }

  function sanitizeZip(zip){
    return String(zip||"").replace(/[^0-9]/g,"").slice(0,5);
  }

  function fallbackLabel(lat, lon){
    if(Number.isFinite(lat) && Number.isFinite(lon)){
      return `Lat ${lat.toFixed(5)}, Lon ${lon.toFixed(5)}`;
    }
    return "Base location";
  }

  function savePoint({mode, zip, label, lat, lon}){
    if(mode)  lsSet(LS.MODE, mode);
    if(zip)   lsSet(LS.ZIP, zip);
    if(label) lsSet(LS.LABEL, label);
    if(Number.isFinite(lat)) lsSet(LS.LAT, lat);
    if(Number.isFinite(lon)) lsSet(LS.LON, lon);
    lsSet(LS.TS, Date.now());
  }

  function gotoHomeWith(lat, lon, label){
    const url = new URL(window.location.href);
    url.pathname = "/index.html";
    url.searchParams.set("latitude", String(lat));
    url.searchParams.set("longitude", String(lon));
    url.searchParams.set("label", label || fallbackLabel(lat, lon));
    // hard nav (forces home.js to run fresh)
    window.location.href = url.pathname + "?" + url.searchParams.toString();
  }

  async function geocodeZip(zip){
    const z = sanitizeZip(zip);
    if(!z) throw new Error("missing zip");

    const res = await fetch(`/api/weather/geocode?zip=${encodeURIComponent(z)}`, { cache:"no-store" });
    if(!res.ok) throw new Error(`geocode http ${res.status}`);

    const data = await res.json();
    if(!data || !data.ok) throw new Error("geocode not ok");

    const lat = Number(data.lat);
    const lon = Number(data.lon);
    const label = (data.label && String(data.label).trim()) ? String(data.label).trim() : fallbackLabel(lat, lon);
    return { zip: z, lat, lon, label };
  }

  function getDevicePoint(){
    return new Promise((resolve, reject) => {
      if(!("geolocation" in navigator)) return reject(new Error("Device location not supported"));
      navigator.geolocation.getCurrentPosition(
        (pos)=>{
          const lat = Number(pos?.coords?.latitude);
          const lon = Number(pos?.coords?.longitude);
          if(!Number.isFinite(lat) || !Number.isFinite(lon)) return reject(new Error("No coords"));
          resolve({ lat, lon, label: "Device location" });
        },
        (err)=> reject(err || new Error("Device denied")),
        { enableHighAccuracy:false, timeout:10000, maximumAge: 300000 }
      );
    });
  }

  async function onUseZip(){
    lsSet(LS.MODE, "zip");
    setStatus("ZIP mode (enter ZIP then Save).");
  }

  async function onSaveZip(){
    try{
      const zip = sanitizeZip($("baseZipInput")?.value);
      if(!zip){ setStatus("Enter a 5-digit ZIP."); return; }

      setStatus("Geocoding ZIP…");
      const hit = await geocodeZip(zip);

      savePoint({ mode:"zip", zip: hit.zip, label: hit.label, lat: hit.lat, lon: hit.lon });
      setZipInput(hit.zip);
      setStatus(`ZIP set ✅  ${hit.label}`);

      gotoHomeWith(hit.lat, hit.lon, hit.label);
    }catch(e){
      setStatus(`ZIP failed: ${e && e.message ? e.message : "unknown"}`);
    }
  }

  async function onUseDevice(){
    try{
      lsSet(LS.MODE, "device");
      setStatus("Requesting device location…");
      const pt = await getDevicePoint();

      const label = pt.label || fallbackLabel(pt.lat, pt.lon);
      savePoint({ mode:"device", label, lat: pt.lat, lon: pt.lon });
      setStatus("Device location set ✅");

      gotoHomeWith(pt.lat, pt.lon, label);
    }catch(e){
      setStatus(`Device failed: ${e && e.message ? e.message : "denied"}`);
    }
  }

  function wireButtons(){
    // Prefer IDs if present; otherwise fall back to button text
    const byId = {
      useDevice: $("baseUseDeviceBtn"),
      useZip: $("baseUseZipBtn"),
      save: $("baseSaveBtn")
    };

    function findBtn(rx){
      const btns = Array.from(document.querySelectorAll("button"));
      return btns.find(b => rx.test((b.textContent||"").trim())) || null;
    }

    const btnUseDevice = byId.useDevice || findBtn(/^use device/i);
    const btnUseZip    = byId.useZip    || findBtn(/^use zip/i);
    const btnSave      = byId.save      || findBtn(/^save$/i);

    if(btnUseDevice) btnUseDevice.addEventListener("click", onUseDevice);
    if(btnUseZip)    btnUseZip.addEventListener("click", onUseZip);
    if(btnSave)      btnSave.addEventListener("click", onSaveZip);
  }

  function init(){
    // preload zip input from storage
    const z = lsGet(LS.ZIP, "");
    if(z) setZipInput(z);

    // status hint
    const mode = lsGet(LS.MODE, "device");
    if(mode === "zip" && z) setStatus(`ZIP mode: ${z} (hit Save).`);
    else setStatus("");

    wireButtons();
  }

  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();

})();
