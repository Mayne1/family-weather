import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";

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

// Optional: show a quick “checking auth…” message if the page has #msg
function show(msg){
  const el = document.getElementById("msg");
  if(el){
    el.style.display = "block";
    el.textContent = msg;
  }
}

show("Checking sign-in…");

const next = encodeURIComponent(location.pathname + location.search + location.hash);

let decided = false;
onAuthStateChanged(auth, (user) => {
  if (decided) return;
  decided = true;

  if (user) {
    // Signed in — allow page to render
    const el = document.getElementById("msg");
    if(el) el.style.display = "none";
    return;
  }

  // Not signed in — go login
  location.href = `login.html?next=${next}`;
});

// Failsafe: if auth never responds (rare), don’t trap forever
setTimeout(() => {
  if (!decided) location.href = `login.html?next=${next}`;
}, 4000);

console.log("authGate.js loaded");
