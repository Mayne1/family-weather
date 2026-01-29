/* Family Weather - events.js (MVP wiring)
   Reads events from localStorage and renders them.
*/
(function(){
  const KEY = "fw_events_v1";

  const el = (id) => document.getElementById(id);

  function readEvents(){
    try{
      const raw = localStorage.getItem(KEY);
      const arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr : [];
    }catch(e){
      return [];
    }
  }

  function writeEvents(list){
    try{ localStorage.setItem(KEY, JSON.stringify(list)); }catch(e){}
  }

  function fmtTime(t){
    if (!t) return "";
    try{
      // "17:30" -> locale time
      const [hh, mm] = t.split(":").map(x=>parseInt(x,10));
      const d = new Date();
      d.setHours(hh||0, mm||0, 0, 0);
      return d.toLocaleTimeString([], { hour:"numeric", minute:"2-digit" });
    }catch(e){
      return t;
    }
  }

  function fmtWhen(ev){
    const parts = [];
    if (ev.date) parts.push(ev.date);
    if (ev.time) parts.push(fmtTime(ev.time));
    return parts.join(" • ");
  }

  function esc(s){
    return (s || "").replace(/[&<>"']/g, c => ({
      "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
    }[c]));
  }

  function pill(text, kind){
    const cls = kind ? `pill ${kind}` : "pill";
    return `<span class="${cls}">${esc(text)}</span>`;
  }

  function renderEvent(ev){
    const title = ev.name || "(Untitled)";
    const meta = [fmtWhen(ev), ev.location].filter(Boolean).join(" • ");
    const invited = Array.isArray(ev.invitees) ? ev.invitees.length : 0;

    // MVP forecast/trend pills (real ones come next)
    const forecast = ev.status === "draft" ? "Draft" : "Forecast: (next)";
    const trend = "Trend: (next)";

    return `
      <article class="event" data-id="${esc(ev.id)}">
        <div class="event-top">
          <div>
            <div class="event-title">${esc(title)}</div>
            <div class="event-meta">${esc(meta || "—")}</div>
          </div>
          <div class="pillrow">
            ${pill(forecast, ev.status === "draft" ? "warn" : "info")}
            ${pill(trend, "ok")}
          </div>
        </div>

        <div class="pillrow">
          ${pill("Type: " + (ev.type || "—"))}
          ${pill("Invited: " + invited)}
          ${ev.rsvpBy ? pill("RSVP by: " + ev.rsvpBy, "warn") : ""}
        </div>

        <div class="event-actions">
          <button class="mini primary" type="button" data-action="view">View</button>
          <button class="mini" type="button" data-action="edit">Edit</button>
          <button class="mini" type="button" data-action="delete">Delete</button>
        </div>
      </article>
    `;
  }

  function render(){
    const list = readEvents();

    const created = list.filter(e => e.status === "created");
    const drafts  = list.filter(e => e.status === "draft");

    // Counts (MVP: created + drafts shown; accepted/awaiting placeholders)
    if (el("createdCount")) el("createdCount").textContent = String(created.length);
    if (el("acceptedCount")) el("acceptedCount").textContent = "0";
    if (el("awaitingCount")) el("awaitingCount").textContent = String(created.length);

    const createdBox = el("createdList");
    const createdEmpty = el("createdEmpty");
    if (createdBox){
      createdBox.innerHTML = created.map(renderEvent).join("");
      if (createdEmpty) createdEmpty.style.display = created.length ? "none" : "block";
    }

    const acceptedBox = el("acceptedList");
    const acceptedEmpty = el("acceptedEmpty");
    if (acceptedBox){
      acceptedBox.innerHTML = drafts.map(renderEvent).join("");
      if (acceptedEmpty) acceptedEmpty.style.display = drafts.length ? "none" : "block";
    }

    // Event delegation for buttons
    document.addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-action]");
      if (!btn) return;
      const action = btn.getAttribute("data-action");
      const card = btn.closest(".event");
      const id = card?.getAttribute("data-id");
      if (!id) return;

      if (action === "delete"){
        const next = readEvents().filter(x => x.id !== id);
        writeEvents(next);
        render();
      } else if (action === "edit"){
        // MVP: route back to dashboard with a note (real edit later)
        alert("Edit is next. For MVP, delete + recreate. (We’ll wire real edit next.)");
      } else if (action === "view"){
        alert("View is next. For MVP, this is a placeholder. (We’ll wire a view modal/page next.)");
      }
    }, { once:false });
  }

  function init(){
    // Fix year if present
    try{
      const y = document.getElementById("year");
      if (y) y.textContent = new Date().getFullYear();
    }catch(e){}
    render();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
