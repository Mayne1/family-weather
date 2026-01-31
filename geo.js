/* FW_GEO_V1 — request browser location + store for alerts/weather */
(function(){
  const KEY = "fw_geo_v1";
  const MAX_AGE_MS = 6 * 60 * 60 * 1000; // 6 hours

  function read(){
    try { return JSON.parse(localStorage.getItem(KEY) || "null"); }
    catch { return null; }
  }

  function write(obj){
    try { localStorage.setItem(KEY, JSON.stringify(obj)); } catch {}
  }

  function isFresh(v){
    if(!v || !v.ts) return false;
    return (Date.now() - v.ts) < MAX_AGE_MS;
  }

  function requestGeo(){
    if(!("geolocation" in navigator)) {
      write({ ts: Date.now(), status: "unsupported" });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        write({ ts: Date.now(), status: "ok", lat, lon, accuracy: pos.coords.accuracy });
        // Optional: refresh alerts without reload if you want later
        // location.reload();
      },
      (err) => {
        write({ ts: Date.now(), status: "denied", code: err.code, message: err.message });
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 5 * 60 * 1000 }
    );
  }

  document.addEventListener("DOMContentLoaded", () => {
    const v = read();
    // If we already have a fresh OK location, don't bother the user again.
    if (isFresh(v) && v.status === "ok") return;

    // If they denied recently, don’t nag repeatedly.
    if (isFresh(v) && v.status === "denied") return;

    // Ask (this triggers the browser permission prompt)
    requestGeo();
  });
})();
