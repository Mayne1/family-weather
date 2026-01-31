import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";

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

function initialsFrom(user){
  const name = (user?.displayName || "").trim();
  const email = (user?.email || "").trim();
  const base = name || email || "U";
  const parts = base.split(/[\s.@_-]+/).filter(Boolean);
  const a = (parts[0] || "U")[0] || "U";
  const b = (parts[1] || "")[0] || "";
  return (a + b).toUpperCase();
}

function ensureUserChip(){
  const actions = document.querySelector(".actions") || document.querySelector("header .actions");
  if(!actions) return {};

  let signInLink = document.getElementById("navSignIn");
  let dashLink   = document.getElementById("navDashboard");
  let signOutBtn = document.getElementById("navSignOut");

  if(!signInLink){
    signInLink = document.createElement("a");
    signInLink.className = "btn";
    signInLink.id = "navSignIn";
    signInLink.href = "signin.html";
    signInLink.textContent = "Sign in / Sign up";
    actions.appendChild(signInLink);
  }

  if(!dashLink){
    dashLink = document.createElement("a");
    dashLink.className = "btn";
    dashLink.id = "navDashboard";
    dashLink.href = "dashboard.html";
    dashLink.textContent = "Dashboard";
    dashLink.style.display = "none";
    actions.appendChild(dashLink);
  }

  if(!signOutBtn){
    signOutBtn = document.createElement("button");
    signOutBtn.className = "btn";
    signOutBtn.id = "navSignOut";
    signOutBtn.type = "button";
    signOutBtn.textContent = "Sign out";
    signOutBtn.style.display = "none";
    actions.appendChild(signOutBtn);
  }

  let chip = document.getElementById("navUserChip");
  if(!chip){
    chip = document.createElement("div");
    chip.id = "navUserChip";
    chip.className = "fw-userchip";
    chip.style.display = "none";
    chip.innerHTML = `
      <img id="navUserPhoto" class="fw-userphoto" alt="" style="display:none" />
      <span id="navUserInitials" class="fw-userinitials" style="display:none"></span>
      <span id="navUserLabel" class="fw-userlabel"></span>
    `;
    actions.appendChild(chip);
  }

  const photo = chip.querySelector("#navUserPhoto");
  const init  = chip.querySelector("#navUserInitials");
  const label = chip.querySelector("#navUserLabel");

  return { signInLink, dashLink, signOutBtn, chip, photo, init, label };
}

document.addEventListener("DOMContentLoaded", () => {
  const ui = ensureUserChip();
  if(!ui.signOutBtn) return;

  ui.signOutBtn.addEventListener("click", async () => {
    await signOut(auth);
    location.href = "/";
  });

  onAuthStateChanged(auth, (user) => {
    show(ui.signInLink, !user);
    show(ui.dashLink,   !!user);
    show(ui.signOutBtn, !!user);
    show(ui.chip,       !!user);

    if(!user){
      if(ui.label) ui.label.textContent = "";
      if(ui.photo) ui.photo.style.display = "none";
      if(ui.init)  ui.init.style.display = "none";
      return;
    }

    const display = (user.displayName || "").trim() || (user.email || "").trim() || "Signed in";
    if(ui.label) ui.label.textContent = display;

    const url = (user.photoURL || "").trim();
    if(url && ui.photo){
      ui.photo.src = url;
      ui.photo.style.display = "";
      if(ui.init) ui.init.style.display = "none";
    } else {
      if(ui.photo) ui.photo.style.display = "none";
      if(ui.init){
        ui.init.textContent = initialsFrom(user);
        ui.init.style.display = "";
      }
    }
  });
});
