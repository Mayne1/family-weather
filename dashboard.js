/* Family Weather — dashboard.js
   - Create Event (localStorage MVP)
   - Keeps weather intelligence separate (doesn't interfere)
*/

(function(){
  function $(id){ return document.getElementById(id); }

  function readVal(id){
    const el = $(id);
    return el ? String(el.value || "").trim() : "";
  }

  function loadEvents(){
    try{
      const raw = localStorage.getItem("fw_events");
      const arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr : [];
    }catch(e){ return []; }
  }

  function saveEvents(arr){
    try{ localStorage.setItem("fw_events", JSON.stringify(arr)); }catch(e){}
  }

  function uid(){
    return "ev_" + Date.now() + "_" + Math.random().toString(16).slice(2);
  }

  function buildEvent(isDraft){
    const name = readVal("eventName");
    const type = readVal("eventType");
    const date = readVal("date");
    const time = readVal("time");
    const location = readVal("location");
    const channel = readVal("channel");
    const rsvpBy = readVal("rsvpBy");
    const inviteesRaw = readVal("invitees");

    const invitees = inviteesRaw
      .split("\n")
      .map(x => x.trim())
      .filter(Boolean);

    return {
      id: uid(),
      name: name || "(untitled event)",
      type: type || "Other",
      date,
      time,
      location,
      channel,
      rsvpBy,
      invitees,
      status: isDraft ? "draft" : "created",
      createdAt: new Date().toISOString()
    };
  }

  function validateEvent(ev){
    // Minimal: name + date + location recommended
    const problems = [];
    if (!ev.name || ev.name === "(untitled event)") problems.push("Event name");
    if (!ev.date) problems.push("Date");
    if (!ev.location) problems.push("Location");
    return problems;
  }

  function upsertEvent(ev){
    const events = loadEvents();
    events.unshift(ev);
    saveEvents(events);
  }

  function toast(msg){
    // lightweight: alert for now (stable everywhere)
    alert(msg);
  }

  function onCreate(isDraft){
    const ev = buildEvent(isDraft);
    const missing = validateEvent(ev);

    if (!isDraft && missing.length){
      toast("Please fill: " + missing.join(", "));
      return;
    }

    upsertEvent(ev);

    // Send to events page (shows list)
    window.location.href = "events.html";
  }

  function bind(){
    const btnCreate = document.getElementById("fwCreateEvent");
    const btnDraft  = document.getElementById("fwSaveDraft");

    if (btnCreate) btnCreate.addEventListener("click", () => onCreate(false));
    if (btnDraft)  btnDraft.addEventListener("click", () => onCreate(true));
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bind);
  } else {
    bind();
  }
})();
