/* =========================================================
   apiBox.js — the ONLY file allowed to fetch the backend API
   ========================================================= */

(function(){
  const API_BASE = ""; // same-origin

  function getApiKey(){
    try {
      return (window.FW_CONFIG && window.FW_CONFIG.API_KEY) ? String(window.FW_CONFIG.API_KEY) : "";
    } catch (_) {
      return "";
    }
  }

  async function fetchJSON(path, opts = {}){
    const headers = Object.assign({}, opts.headers || {});
    const k = getApiKey();
    if (k) headers["X-API-Key"] = k;

    const res = await fetch(API_BASE + path, {
      method: opts.method || "GET",
      headers,
      body: opts.body,
      cache: "no-store",
    });

    const text = await res.text();
    let json = null;
    try { json = text ? JSON.parse(text) : null; } catch (_) {}

    if (!res.ok) {
      const msg = (json && (json.error || json.message)) ? (json.error || json.message) : `http_${res.status}`;
      const err = new Error(msg);
      err.status = res.status;
      err.payload = json;
      throw err;
    }

    return json ?? {};
  }

  const apiBox = {
    fetchJSON,

    // GET /api/weather/current?lat=..&lon=..
    getCurrentTemp(lat, lon){
      return fetchJSON(`/api/weather/current?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}`);
    },

    // GET /api/weather/forecast10?lat=..&lon=..
    getForecast10(lat, lon){
      return fetchJSON(`/api/weather/forecast10?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}`);
    },

    // GET /api/weather/geocode?zip=95206
    geocode(zip){
      const z = String(zip || "").replace(/[^0-9]/g,"").slice(0,5);
      if (!z) return Promise.reject(new Error("missing_zip"));
      return fetchJSON(`/api/weather/geocode?zip=${encodeURIComponent(z)}`);
    }
  };

  window.apiBox = apiBox;
})();
