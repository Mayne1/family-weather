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

// If you're not signed in, bounce to login.
// Keep the page you asked for in ?next= so we can return you after login.
onAuthStateChanged(auth, (user) => {
  if (!user) {
    const next = encodeURIComponent(location.pathname.replace(/^\//,"") + location.search);
    location.href = `login.html?next=${next}`;
  }
});
