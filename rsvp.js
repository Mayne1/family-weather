const $ = (id) => document.getElementById(id);

function setMsg(text, ok) {
  const el = $("msg");
  if (!el) return;
  el.className = ok ? "ok" : "err";
  el.textContent = text || "";
}

function tokenFromUrl() {
  const u = new URL(location.href);
  return (u.searchParams.get("token") || "").trim();
}

async function loadInvite(token) {
  const res = await fetch(`/api/invites/${encodeURIComponent(token)}`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || "invite_lookup_failed");
  return data;
}

async function postRsvp(token) {
  const body = {
    name: ($("name")?.value || "").trim() || null,
    email: ($("email")?.value || "").trim() || null,
    response: $("response")?.value || "yes",
    guests_count: Number($("guests_count")?.value || 0),
    message: ($("message")?.value || "").trim() || null,
  };

  const res = await fetch(`/api/rsvp?token=${encodeURIComponent(token)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || data?.detail || "rsvp_failed");
  return data;
}

document.addEventListener("DOMContentLoaded", async () => {
  try {
    setMsg("");
    const token = tokenFromUrl();
    if (!token) {
      $("eventLine").textContent = "Missing RSVP token.";
      return;
    }

    try {
      const info = await loadInvite(token);
      const title = info?.event?.title || "Event";
      const loc = info?.event?.location ? ` • ${info.event.location}` : "";
      const when = info?.event?.starts_at ? ` • ${new Date(info.event.starts_at).toLocaleString()}` : "";
      $("eventLine").textContent = `${title}${when}${loc}`;
    } catch {
      $("eventLine").textContent = "You’re invited. Fill this out to RSVP.";
    }

    $("btnSend")?.addEventListener("click", async () => {
      try {
        setMsg("Sending…", true);
        await postRsvp(token);
        setMsg("RSVP saved. Thank you!", true);
        $("btnSend").disabled = true;
      } catch (e) {
        setMsg(String(e.message || e));
      }
    });
  } catch (e) {
    setMsg(String(e.message || e));
  }
});
