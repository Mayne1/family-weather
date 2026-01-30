import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  EmailAuthProvider,
  linkWithCredential,
  fetchSignInMethodsForEmail
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

const $ = (id) => document.getElementById(id);
const show = (msg) => {
  const el = $("pwMsg");
  if (!el) return alert(msg);
  el.style.display = "block";
  el.textContent = msg;
};

function validPassword(pw) {
  // min 8, 1 upper, 1 lower, 1 number, 1 symbol
  return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/.test(pw);
}

onAuthStateChanged(auth, async (user) => {
  const box = $("pwBox");
  if (!box) return;

  if (!user) {
    box.style.display = "none";
    return;
  }

  // Show box if user doesn't already have password provider linked
  const methods = await fetchSignInMethodsForEmail(auth, user.email);
  const hasPassword = methods.includes("password");

  box.style.display = hasPassword ? "none" : "";
  if (hasPassword) show("Password already set on this account.");
});

$("setPwBtn")?.addEventListener("click", async () => {
  const user = auth.currentUser;
  if (!user) return show("Not signed in.");

  const pw1 = ($("newPw")?.value || "").trim();
  const pw2 = ($("newPw2")?.value || "").trim();

  if (pw1 !== pw2) return show("Passwords do not match.");
  if (!validPassword(pw1)) return show("Password must be 8+ chars with upper, lower, number, symbol.");

  try {
    const cred = EmailAuthProvider.credential(user.email, pw1);
    await linkWithCredential(user, cred);
    show("✅ Password set! You can now sign in with email + password too.");
    $("pwBox").style.display = "none";
  } catch (e) {
    show(`Set password failed: ${e?.code || e?.message || e}`);
  }
});
