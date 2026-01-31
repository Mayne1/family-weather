import {
  auth,
  createUserWithEmailAndPassword,
  updateProfile,
} from "./authBox.js";

const $ = (id) => document.getElementById(id);
const msg = $("msg");

function setMsg(text, ok) {
  if (!msg) return;
  msg.className = ok ? "ok" : "err";
  msg.textContent = text || "";
}

function safeUsername(u) {
  u = (u || "").trim();
  if (!u) return "";
  u = u.replace(/[^\w\- ]+/g, "").slice(0, 24).trim();
  return u;
}

async function createAccount() {
  try {
    setMsg("");

    const email = $("email")?.value?.trim() || "";
    const username = safeUsername($("username")?.value || "");
    const pw1 = $("pw1")?.value || "";
    const pw2 = $("pw2")?.value || "";

    if (!email) return setMsg("Email required.");
    if (!pw1 || pw1.length < 8) return setMsg("Password must be at least 8 characters.");
    if (pw1 !== pw2) return setMsg("Passwords do not match.");

    const cred = await createUserWithEmailAndPassword(auth, email, pw1);
    const user = cred?.user;

    // Optional display name (Firebase Auth profile)
    if (user && username) {
      try { await updateProfile(user, { displayName: username }); } catch {}
      localStorage.setItem("fw_username", username);
    }

    if (user?.uid) localStorage.setItem("fw_uid", user.uid);

    setMsg("Account created. Sending you back to sign in…", true);
    setTimeout(() => (location.href = "/signin.html"), 900);
  } catch (e) {
    setMsg(e?.message ? e.message : String(e));
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const btn = $("btnCreate");
  if (btn) btn.addEventListener("click", createAccount);
});
