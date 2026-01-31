import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js"; import { getAuth, onAuthStateChanged } from 
"https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js"; const firebaseConfig = {
  apiKey: "AIzaSyDCZpxyyGJeoIcutk8o_h-96Syo3h8gsv8", authDomain: "the-family-weather.firebaseapp.com", projectId: "the-family-weather", appId: 
  "1:316642786319:web:545d5598d31da95a3d377a"
};
const app = initializeApp(firebaseConfig); const auth = getAuth(app); onAuthStateChanged(auth, (user) => { if (!user) { location.replace("/signin.html"); return;
  }
  // 🔒 HARD ISOLATION PER USER
  const uid = user.uid; const lastUid = localStorage.getItem("fw_uid"); if (lastUid !== uid) {
    // wipe ALL app state when user changes
    Object.keys(localStorage).forEach(k => { if (k.startsWith("fw_")) localStorage.removeItem(k);
    });
    localStorage.setItem("fw_uid", uid);
  }
});
