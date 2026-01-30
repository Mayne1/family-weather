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

function show(el, yes){ if(el) el.style.display = yes ? "" : "none"; }

document.addEventListener("DOMContentLoaded", () => {
  const msg = document.getElementById("homeAuthMsg");
  const up  = document.getElementById("homeUpcoming");
  const past= document.getElementById("homePast");
  const upE = document.getElementById("homeUpcomingEmpty");
  const paE = document.getElementById("homePastEmpty");

  onAuthStateChanged(auth, (user) => {
    const signedIn = !!user;

    // If signed out: hide event lists entirely and show message
    show(msg, !signedIn);
    show(up,  signedIn);
    show(past,signedIn);
    show(upE, false);
    show(paE, false);

    // If signed in: let your existing render run
    if (signedIn && window.FW && typeof window.FW.renderHomeEvents === "function") {
      window.FW.renderHomeEvents("homeUpcoming","homeUpcomingEmpty","homePast","homePastEmpty");
    }
  });
});
