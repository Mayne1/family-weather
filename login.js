import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyDCZpxyyGJeoIcutk8o_h-96Syo3h8gsv8",
  authDomain: "the-family-weather.firebaseapp.com",
  projectId: "the-family-weather",
  storageBucket: "the-family-weather.firebasestorage.app",
  messagingSenderId: "316642786319",
  appId: "1:316642786319:web:545d5598d31da95a3d377a"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

const $ = id => document.getElementById(id);
const msg = t => alert(t);

document.addEventListener("DOMContentLoaded", () => {
  $("loginBtn").onclick = async () => {
    try {
      await signInWithEmailAndPassword(
        auth,
        $("email").value,
        $("password").value
      );
      location.href = "/dashboard.html";
    } catch (e) {
      msg(e.message);
    }
  };

  $("signupBtn").onclick = async () => {
    try {
      await createUserWithEmailAndPassword(
        auth,
        $("email").value,
        $("password").value
      );
      location.href = "/dashboard.html";
    } catch (e) {
      msg(e.message);
    }
  };

  $("googleBtn").onclick = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      location.href = "/dashboard.html";
    } catch (e) {
      msg(e.message);
    }
  };
});
