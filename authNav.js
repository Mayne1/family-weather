import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signOut,
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

function show(el, yes){ if(el) el.style.display = yes ? "" : "none"; }

document.addEventListener("DOMContentLoaded", () => {
  const signInLink = document.getElementById("navSignIn");
  const dashLink   = document.getElementById("navDashboard");
  const signOutBtn = document.getElementById("navSignOut");

  if (signInLink) signInLink.href = "login.html";

  if (signOutBtn) {
    signOutBtn.addEventListener("click", async () => {
      await signOut(auth);
      location.href = "/";
    });
  }

  onAuthStateChanged(auth, (user) => {
    // Not signed in: show Sign In, hide Dashboard/Sign Out
    show(signInLink, !user);
    show(dashLink,   !!user);
    show(signOutBtn, !!user);
  });
});
