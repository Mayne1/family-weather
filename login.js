import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  getAuth,
  setPersistence,
  browserLocalPersistence,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  onAuthStateChanged,
  updateProfile,
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyDCZpxyyGJeoIcutk8o_h-96Syo3h8gsv8",
  authDomain: "the-family-weather.firebaseapp.com",
  projectId: "the-family-weather",
  storageBucket: "the-family-weather.firebasestorage.app",
  messagingSenderId: "316642786319",
  appId: "1:316642786319:web:545d5598d31da95a3d377a",
  measurementId: "G-RSJ787Y8Y9"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
await setPersistence(auth, browserLocalPersistence);

const $ = (id) => document.getElementById(id);

function show(msg) {
  const el = $("msg");
  if (el) {
    el.style.display = "block";
    el.textContent = msg;
  } else {
    alert(msg);
  }
}

function val(id) {
  const el = $(id);
  return el ? String(el.value || "").trim() : "";
}

function disableAll(disabled) {
  ["loginBtn","signupBtn","googleBtn"].forEach(id => {
    const el = $(id);
    if (el) el.disabled = disabled;
  });
}

// min 8, 1 upper, 1 lower, 1 number, 1 symbol
function validPassword(pw){
  return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/.test(pw);
}

// 3–20 chars letters/numbers/_ only
function validUsername(u){
  if(!u) return true;
  return /^[a-zA-Z0-9_]{3,20}$/.test(u);
}

// MVP “B” vulgar catcher (fast filter)
const BLOCK = ["fuck","shit","bitch","nigg","cunt","slut","whore","porn","rape"];
function looksVulgar(u){
  const x = (u||"").toLowerCase();
  return BLOCK.some(w => x.includes(w));
}

// redirect finish
try {
  const rr = await getRedirectResult(auth);
  if (rr && rr.user) location.href = "dashboard.html";
} catch (e) {
  show(`Google sign-in failed: ${e?.code || e?.message || e}`);
}

onAuthStateChanged(auth, (user) => {
  if (user) location.href = "dashboard.html";
});

$("signupBtn")?.addEventListener("click", async () => {
  const email = val("email");
  const password = val("password");
  const password2 = val("password2");
  const username = val("username");

  if (!email) return show("Enter your email.");
  if (!password || !password2) return show("Enter password + re-type it to create an account.");
  if (password !== password2) return show("Passwords do not match.");
  if (!validPassword(password)) return show("Password must be 8+ chars with upper, lower, number, symbol.");
  if (!validUsername(username)) return show("Username must be 3–20 chars: letters/numbers/underscore only.");
  if (looksVulgar(username)) return show("Pick a different username.");

  disableAll(true);
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    if (username) await updateProfile(cred.user, { displayName: username });
    location.href = "dashboard.html";
  } catch (e) {
    show(`Create account failed: ${e?.code || e?.message || e}`);
  } finally {
    disableAll(false);
  }
});

$("loginBtn")?.addEventListener("click", async () => {
  const email = val("email");
  const password = val("password");
  if (!email || !password) return show("Enter email + password.");
  disableAll(true);
  try {
    await signInWithEmailAndPassword(auth, email, password);
    location.href = "dashboard.html";
  } catch (e) {
    show(`Login failed: ${e?.code || e?.message || e}`);
  } finally {
    disableAll(false);
  }
});

$("googleBtn")?.addEventListener("click", async () => {
  disableAll(true);
  const provider = new GoogleAuthProvider();
  try {
    await signInWithPopup(auth, provider);
    location.href = "dashboard.html";
  } catch (e) {
    try {
      await signInWithRedirect(auth, provider);
    } catch (e2) {
      show(`Google sign-in failed: ${e2?.code || e2?.message || e2}`);
    }
  } finally {
    disableAll(false);
  }
});

console.log("login.js loaded OK");

// ===== FW_RESILIENT_SIGNIN =====
(function(){
  function qs(sel){ return document.querySelector(sel); }
  function val(el){ return el ? (el.value||"").trim() : ""; }
  function setMsg(text, ok){
    const m = document.getElementById("msg") || qs(".msg") || qs("[data-msg]");
    if(!m) return;
    m.textContent = text || "";
    m.className = ok ? "ok" : "err";
  }

  document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("signinForm") || qs("form") || document.body;

    const emailEl =
      document.getElementById("email") ||
      qs('input[type="email"]') ||
      qs('input[name="email"]') ||
      qs('input[autocomplete="email"]');

    const passEl =
      document.getElementById("password") ||
      document.getElementById("pw1") ||
      qs('input[type="password"]') ||
      qs('input[name="password"]') ||
      qs('input[autocomplete="current-password"]');

    const btn =
      document.getElementById("btnSignIn") ||
      qs('button[type="submit"]') ||
      qs('input[type="submit"]') ||
      qs('[data-action="signin"]');

    if(btn && btn.tagName === "BUTTON" && (btn.type || "").toLowerCase() !== "submit"){
      try { btn.type = "submit"; } catch(e){}
    }

    async function doSignIn(e){
      try{
        if(e && e.preventDefault) e.preventDefault();
        setMsg("");

        const email = val(emailEl);
        const password = passEl ? (passEl.value || "") : "";

        if(!email) return setMsg("Email required.");
        if(!password) return setMsg("Password required.");

        // Preferred: existing function
        if(typeof window.signIn === "function"){
          return window.signIn(email, password);
        }

        // Fallback: Firebase direct (if in module scope)
        if(typeof signInWithEmailAndPassword === "function" && typeof auth !== "undefined"){
          const cred = await signInWithEmailAndPassword(auth, email, password);
          setMsg("Signed in.", true);
          return cred;
        }

        setMsg("Sign-in handler not wired (login.js).");
      }catch(err){
        setMsg(err?.message ? err.message : String(err));
      }
    }

    if(form && form.addEventListener) form.addEventListener("submit", doSignIn);
    if(btn && btn.addEventListener) btn.addEventListener("click", doSignIn);
  });
})();
