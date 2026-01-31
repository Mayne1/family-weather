/*
  FW_BASE_LOCATION_V1
  Stores preferred base location in localStorage:
    key: fw_base_location_v1
    value: { mode: "device"|"home", zip?, lat?, lon?, label?, updatedAt }
*/

(function(){
  const KEY = "fw_base_location_v1";
  const $ = (id) => document.getElementById(id);

  function show(msg){
    const el = $("baseLocMsg");
    if(!el) return alert(msg);
    el.style.display = "block";
    el.textContent = msg;
  }

  function load(){
    try{
      return JSON.parse(localStorage.getItem(KEY) || "null");
    }catch(e){
      return null;
    }
  }

  function save(obj){
    try{
      obj.updatedAt = Date.now();
      localStorage.setItem(KEY, JSON.stringify(obj));
    }catch(e){}
  }

  function setUI(state){
    const mode = state?.mode || "device";
    const mDevice = $("baseModeDevice");
    const mHome   = $("baseModeHome");
    const zipEl   = $("homeZip");
    const curEl   = $("baseLocCurrent");

    if(mDevice) mDevice.checked = (mode === "device");
    if(mHome)   mHome.checked   = (mode === "home");
    if(zipEl && state?.zip) zipEl.value = state.zip;

    if(curEl){
      if(mode === "home"){
        curEl.textContent = state?.label
          ? `Using Home ZIP: ${state.label}`
          : `Using Home ZIP`;
      }else{
        curEl.textContent = state?.label
          ? `Using Device Location: ${state.label}`
          : `Using Device Location`;
      }
    }
  }

  async function geoOnce(){
    return await new Promise((resolve) => {
      if(!("geolocation" in navigator)) return resolve(null);
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
        () => resolve(null),
        { enableHighAccuracy:false, maximumAge: 60*60*1000, timeout: 9000 }
      );
    });
  }

  async function zipToLatLon(zip){
    // Free ZIP → lat/lon. Works great for US zips.
    const url = `https://api.zippopotam.us/us/${encodeURIComponent(zip)}`;
    const r = await fetch(url, { cache: "no-store" });
    if(!r.ok) throw new Error(`ZIP lookup failed (HTTP ${r.status})`);
    const j = await r.json();
    const place = (j.places && j.places[0]) || null;
    if(!place) throw new Error("ZIP lookup returned no places.");

    const lat = parseFloat(place.latitude);
    const lon = parseFloat(place.longitude);
    if(!isFinite(lat) || !isFinite(lon)) throw new Error("ZIP lookup missing lat/lon.");

    const label = `${place["place name"]}, ${place["state abbreviation"]} (${zip})`;
    return { lat, lon, label };
  }

  async function applyDevice(){
    show("Requesting device location…");
    const p = await geoOnce();
    if(!p) return show("Could not get device location (denied or unavailable).");
    const state = {
      mode: "device",
      lat: p.lat,
      lon: p.lon,
      label: `(${p.lat.toFixed(3)}, ${p.lon.toFixed(3)})`
    };
    save(state);
    setUI(state);
    show("✅ Using device location.");
    // Optional: let other scripts refresh if they listen
    document.dispatchEvent(new Event("fw:baseLocationChanged"));
  }

  async function applyHome(zip){
    zip = String(zip||"").trim();
    if(!/^\d{5}$/.test(zip)) return show("Enter a 5-digit ZIP (example: 95206).");

    show("Looking up ZIP location…");
    try{
      const out = await zipToLatLon(zip);
      const state = { mode: "home", zip, lat: out.lat, lon: out.lon, label: out.label };
      save(state);
      setUI(state);
      show("✅ Home ZIP saved.");
      document.dispatchEvent(new Event("fw:baseLocationChanged"));
    }catch(e){
      show(`Home ZIP failed: ${e?.message || e}`);
    }
  }

  function clearPref(){
    localStorage.removeItem(KEY);
    const state = { mode: "device" };
    setUI(state);
    show("Cleared. Will use device location when allowed.");
    document.dispatchEvent(new Event("fw:baseLocationChanged"));
  }

  document.addEventListener("DOMContentLoaded", () => {
    setUI(load() || { mode: "device" });

    $("useDeviceBtn")?.addEventListener("click", (e) => { e.preventDefault(); applyDevice(); });
    $("saveZipBtn")?.addEventListener("click",   (e) => { e.preventDefault(); applyHome($("homeZip")?.value); });
    $("clearBaseBtn")?.addEventListener("click", (e) => { e.preventDefault(); clearPref(); });

    $("baseModeDevice")?.addEventListener("change", () => {
      const s = load() || {};
      s.mode = "device";
      save(s);
      setUI(s);
      show("Mode set to Device Location.");
      document.dispatchEvent(new Event("fw:baseLocationChanged"));
    });

    $("baseModeHome")?.addEventListener("change", () => {
      const s = load() || {};
      s.mode = "home";
      save(s);
      setUI(s);
      show("Mode set to Home ZIP (save ZIP below).");
      document.dispatchEvent(new Event("fw:baseLocationChanged"));
    });
  });
})();
