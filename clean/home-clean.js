(function(){
  const $ = (id) => document.getElementById(id);

  function setText(id, txt){ const el=$(id); if(el) el.textContent = txt; }

  function setState({label, lat, lon, status}){
    if(label) setText("label", label);
    if(Number.isFinite(lat) && Number.isFinite(lon)){
      setText("coords", `lat ${lat.toFixed(5)}, lon ${lon.toFixed(5)}`);
    }
    if(status) setText("status", status);
  }

  async function geocodeZip(zip){
    const z = String(zip||"").replace(/[^0-9]/g,"").slice(0,5);
    if(!z) throw new Error("missing zip");
    // IMPORTANT: use YOUR backend geocode (we already proved it returns label/lat/lon)
    const res = await fetch(`/api/weather/geocode?zip=${encodeURIComponent(z)}`, { cache:"no-store" });
    if(!res.ok) throw new Error(`geocode http ${res.status}`);
    const data = await res.json();
    if(!data || !data.ok) throw new Error("geocode not ok");
    return { label: data.label, lat: Number(data.lat), lon: Number(data.lon) };
  }

  async function useZip(){
    try{
      setState({ status: "Geocoding ZIP…" });
      const zip = $("zip").value;
      const hit = await geocodeZip(zip);
      setState({ label: hit.label, lat: hit.lat, lon: hit.lon, status: "ZIP set ✅" });
    }catch(e){
      setState({ status: `ZIP failed: ${e.message}` });
    }
  }

  async function useDevice(){
    if(!("geolocation" in navigator)){
      setState({ status: "Device location not supported in this browser." });
      return;
    }
    setState({ status: "Requesting device location…" });
    navigator.geolocation.getCurrentPosition(
      (pos)=>{
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        setState({ label: "Device location", lat, lon, status: "Device location set ✅" });
      },
      (err)=>{
        setState({ status: `Device denied: ${err.message || err.code}` });
      },
      { enableHighAccuracy:false, timeout:10000, maximumAge: 300000 }
    );
  }

  document.addEventListener("DOMContentLoaded", ()=>{
    setState({ label:"Family Weather (Clean)", status:"Ready." });
    $("btnZip").addEventListener("click", useZip);
    $("btnDevice").addEventListener("click", useDevice);
  });
})();
