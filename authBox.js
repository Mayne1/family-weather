/* =========================================================
   authBox.js — the ONLY file allowed to talk to Firebase Auth
   ========================================================= */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup
  updateProfile
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

/* Firebase config */
const firebaseConfig = {
  apiKey: "AIzaSyDCZpxyyGJeoIcutk8o_h-96Syo3h8gsv8",
  authDomain: "the-family-weather.firebaseapp.com",
  projectId: "the-family-weather",
  appId: "1:316642786319:web:545d5598d31da95a3d377a"
};

/* Init */
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

/* Public API */
const authBox = {
  async signUp(email, password) {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    return cred.user;
  },

  async signIn(email, password) {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    return cred.user;
  },

  async signInWithGoogle() {
    const cred = await signInWithPopup(auth, googleProvider);
    return cred.user;
  },

  async signOut() {
    await signOut(auth);
  },

  onAuthChange(cb) {
    return onAuthStateChanged(auth, cb);
  },

  getCurrentUser() {
    return auth.currentUser;
  }
};

window.authBox = authBox;

// Added for module reuse (signup/signin pages)
export { auth, createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile, onAuthStateChanged, signOut };
