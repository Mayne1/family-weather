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

// If we returned from Google redirect, finish it
try {
  const rr = await getRedirectResult(auth);
  if (rr && rr.user) {
    location.href = "dashboard.html";
  }
} catch (e) {
  show(`Google sign-in failed: ${e?.code || e?.message || e}`);
}

onAuthStateChanged(auth, (user) => {
  if (user) location.href = "dashboard.html";
});

$("signupBtn")?.addEventListener("click", async () => {
  const email = val("email");
  const password = val("password");
  if (!email || !password) return show("Enter email + password.");
  disableAll(true);
  try {
    await createUserWithEmailAndPassword(auth, email, password);
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
    // Popup first (desktop)
    await signInWithPopup(auth, provider);
    location.href = "dashboard.html";
  } catch (e) {
    // On mobile, popup often fails -> fallback to redirect
    try {
      await signInWithRedirect(auth, provider);
    } catch (e2) {
      show(`Google sign-in failed: ${e2?.code || e2?.message || e2}`);
    }
  } finally {
    disableAll(false);
  }
});

// Tiny sanity check so you KNOW JS loaded:
console.log("login.js loaded OK");
