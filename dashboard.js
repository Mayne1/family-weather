/* Family Weather - dashboard.js (MVP wiring) */
(() => {
  const $ = (id) => document.getElementById(id);

  // Form inputs
  const inpLocation = $("location");
  const inpDate = $("date");
  const inpTime = $("time");
  const inpInvitees = $("invitees");

  // Weather Intelligence panels
  const wxForecast = $("wxForecast");
  const wxAlmanac  = $("wxAlmanac");
  const wxAlerts   = $("wxAlerts");

  // Header chips
  const chipForecast = $("chipForecast");
  const chipAlmanac  = $("chipAlmanac");
  const chipInvites  = $("chipInvites");

  if (!wxForecast) return; // not on dashboard page

  const WMO = {
    0:"Clear",1:"Mainly clear",2:"Partly cloudy",3:"Overcast",
    45:"Fog",48:"Rime fog",
    51:"Light drizzle",53:"Drizzle",55:"Dense drizzle",
    56:"Freezing drizzle",57:"Freezing drizzle",
    61:"Slight rain",63:"Rain",65:"Heavy rain",
    66:"Freezing rain",67:"Freezing rain",
    71:"Slight snow",73:"Snow",75:"Heavy snow",77:"Snow grains",
    80:"Rain showers",81:"Rain showers",82:"Violent showers",
    85:"Snow showers",86:"Snow showers",
    95:"Thunderstorm",96:"Thunderstorm + hail",99:"Thunderstorm + hail",
  };

  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (m) => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  }[m]));

  async function apiGet(path){
    const res = await fetch(path, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }

  function inviteCount(){
    const lines = (inpInvitees?.value || "").split("\n").map(x => x.trim()).filter(Boolean);
    return lines.length;
  }

  function setLoading(){
    wxForecast.innerHTML = `<div class="muted">Loading forecast…</div>`;
    wxAlmanac.innerHTML  = `<div class="muted">Loading almanac…</div>`;
    wxAlerts.innerHTML   = `<div class="muted">Checking alerts…</div>`;
  }

  async function refresh(){
    setLoading();
    try{
      // NOTE: Your API currently defaults to Stockton if no params are provided.
      // Later we’ll add ?q= or ?lat/lon once you decide how to map “Location” input.
      const [cur, f10] = await Promise.all([
        apiGet("/api/weather/current"),
        apiGet("/api/weather/forecast10")
      ]);

      const c = cur.current || {};
      const a = cur.air || {};
      const cond = WMO[c.weather_code] || "—";

      // Forecast snapshot panel
      wxForecast.innerHTML = `
        <div style="display:flex;justify-content:space-between;gap:12px;align-items:flex-start">
          <div>
            <div style="font-weight:900">Now: ${esc(cond)}</div>
            <div class="muted" style="margin-top:6px">
              Temp <strong>${Math.round(c.temp_f ?? 0)}°</strong> • Feels ${Math.round(c.feels_like_f ?? 0)}° • Wind ${Math.round(c.wind_mph ?? 0)} mph • Humidity ${Math.round(c.humidity_pct ?? 0)}%
            </div>
            <div class="muted" style="margin-top:6px">
              AQI ${a.us_aqi != null ? Math.round(a.us_aqi) : "—"} • PM2.5 ${a.pm2_5 != null ? Math.round(a.pm2_5) : "—"}
            </div>
          </div>
          <div style="text-align:right">
            <div class="muted">${esc(inpLocation?.value || "Default location")}</div>
            <div class="muted">${esc(inpDate?.value || "Pick a date")} ${esc(inpTime?.value || "")}</div>
          </div>
        </div>
      `;

      // Almanac panel (MVP: show upcoming days preview until we implement real historical logic)
      const days = (f10.days || []).slice(0, 5);
      const mini = days.map(d => `
        <div class="row" style="margin-top:8px">
          <span>${esc(d.date)} • <span style="opacity:.8">${esc(WMO[d.weather_code] || "—")}</span></span>
          <span><span style="opacity:.75">${Math.round(d.temp_min_f)}°</span> / <strong>${Math.round(d.temp_max_f)}°</strong> <span style="opacity:.75">${d.precip_prob_pct ?? 0}%</span></span>
        </div>
      `).join("");

      wxAlmanac.innerHTML = `
        <div class="muted">MVP: Almanac comes next (historical odds + “it lies” detector).</div>
        <div class="muted" style="margin-top:6px">For now: quick 5-day preview from the cached 10-day.</div>
        <div style="margin-top:10px">${mini}</div>
      `;

      // Alerts panel (placeholder wiring)
      wxAlerts.innerHTML = `
        <div class="muted">MVP: Alerts are next (NWS/CAP, wildfire, wind advisories).</div>
        <div class="muted" style="margin-top:6px">This panel is wired and ready for real alerts JSON.</div>
      `;

      // Chips
      if (chipForecast) chipForecast.textContent = `Forecast: ${cond} ${Math.round(c.temp_f ?? 0)}°`;
      if (chipAlmanac)  chipAlmanac.textContent  = `Almanac: next`;
      if (chipInvites)  chipInvites.textContent  = `Invites: ${inviteCount()}`;

    }catch(e){
      wxForecast.innerHTML = `<div class="muted">Could not load weather.</div>`;
      wxAlmanac.innerHTML  = `<div class="muted">—</div>`;
      wxAlerts.innerHTML   = `<div class="muted">—</div>`;
      if (chipForecast) chipForecast.textContent = `Forecast: error`;
    }
  }

  // Run once
  refresh();

  // Recompute on user edits (debounced)
  let t = null;
  const schedule = () => { clearTimeout(t); t = setTimeout(refresh, 450); };

  ["input","change"].forEach(evt => {
    inpLocation?.addEventListener(evt, schedule);
    inpDate?.addEventListener(evt, schedule);
    inpTime?.addEventListener(evt, schedule);
    inpInvitees?.addEventListener(evt, () => {
      if (chipInvites) chipInvites.textContent = `Invites: ${inviteCount()}`;
    });
  });
})();


/* ===== FW_DASHBOARD_FORM_WIRING_V1 =====
   Makes the form work even if app.js binds to generic .btn.primary.
   Stores drafts/events in localStorage (MVP) and routes to events.html.
*/
(() => {
  const byId = (id) => document.getElementById(id);

  const inviteBtn = byId("inviteBtn");
  const saveBtn   = byId("saveDraftBtn");

  const eventName = byId("eventName");
  const eventType = byId("eventType");
  const date      = byId("date");
  const time      = byId("time");
  const location  = byId("location");
  const channel   = byId("channel");
  const rsvpBy    = byId("rsvpBy");
  const invitees  = byId("invitees");

  function linesCount(v){
    return String(v||"").split("\n").map(x=>x.trim()).filter(Boolean);
  }

  function buildEvent(status){
    return {
      id: "evt_" + Math.random().toString(16).slice(2) + "_" + Date.now(),
      status, // "draft" or "sent"
      createdAt: new Date().toISOString(),
      name: eventName?.value?.trim() || "Untitled event",
      type: eventType?.value || "Other",
      date: date?.value || "",
      time: time?.value || "",
      location: location?.value?.trim() || "",
      channel: channel?.value || "Email",
      rsvpBy: rsvpBy?.value || "",
      invitees: linesCount(invitees?.value || ""),
    };
  }

  function loadEvents(){
    try{ return JSON.parse(localStorage.getItem("fw_events") || "[]"); }
    catch(e){ return []; }
  }
  function saveEvents(arr){
    try{ localStorage.setItem("fw_events", JSON.stringify(arr)); }catch(e){}
  }

  function upsertEvent(evt){
    const all = loadEvents();
    all.unshift(evt);
    saveEvents(all);
    return evt;
  }

  function toast(msg){
    try{
      const t = document.createElement("div");
      t.textContent = msg;
      t.style.cssText = "position:fixed;right:14px;bottom:14px;z-index:999999;background:rgba(0,0,0,.75);color:#fff;padding:10px 12px;border-radius:12px;border:1px solid rgba(255,255,255,.18);font-weight:800";
      document.body.appendChild(t);
      setTimeout(()=>t.remove(), 1800);
    }catch(e){}
  }

  if (saveBtn){
    saveBtn.addEventListener("click", () => {
      const evt = upsertEvent(buildEvent("draft"));
      toast("Draft saved ✅");
      // stay on page
    });
  }

  if (inviteBtn){
    inviteBtn.addEventListener("click", () => {
      const evt = upsertEvent(buildEvent("sent"));
      toast("Event created ✅");
      // MVP: go to events page
      window.location.href = "events.html?from=dashboard";
    });
  }
})();

