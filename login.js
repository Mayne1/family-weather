import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js"; import { getAuth, signInWithEmailAndPassword, GoogleAuthProvider, 
  signInWithPopup, getRedirectResult, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
/* Firebase config */ const firebaseConfig = { apiKey: "AIzaSyDCZpxyyGJeoIcutk8o_h-96Syo3h8gsv8", authDomain: "the-family-weather.firebaseapp.com", projectId: 
  "the-family-weather", appId: "1:316642786319:web:545d5598d31da95a3d377a"
};
const app = initializeApp(firebaseConfig); const auth = getAuth(app); const googleProvider = new GoogleAuthProvider(); /* helpers */ const $ = (id) => 
document.getElementById(id); const val = (id) => ($(id)?.value || "").trim(); function show(msg) {
  const el = $("msg"); if (el) { el.textContent = msg; el.style.display = "block";
  } else {
    alert(msg);
  }
}
/* MVP vulgar filter */ const BLOCK = ["fuck","shit","bitch","nigg","cunt","slut","whore","porn","rape"]; function looksVulgar(u){ const x = (u||"").toLowerCase(); return 
  BLOCK.some(w => x.includes(w));
}
/* Google redirect finish */ try { const rr = await getRedirectResult(auth); if (rr && rr.user) { isolateUser(rr.user); location.href = "dashboard.html";
  }
} catch (e) {
  show(`Google sign-in failed: ${e?.code || e?.message || e}`);
}
/* 🔒 HARD USER ISOLATION */ function isolateUser(user) { const uid = user.uid; const lastUid = localStorage.getItem("fw_uid"); if (lastUid !== uid) { 
    Object.keys(localStorage).forEach(k => {
      if (k.startsWith("fw_")) localStorage.removeItem(k);
    });
    localStorage.setItem("fw_uid", uid);
  }
}
/* auth watcher */ onAuthStateChanged(auth, (user) => { if (!user) return; isolateUser(user); location.href = "dashboard.html";
});
/* email/password sign in */ $("loginBtn")?.addEventListener("click", async () => { try { const email = val("email"); const password = val("password"); if (!email || 
    !password) {
      return show("Email and password required.");
    }
    const cred = await signInWithEmailAndPassword(auth, email, password); isolateUser(cred.user); location.href = "dashboard.html";
  } catch (e) {
    show(e?.message || String(e));
  }
});
/* go to signup */ $("signupBtn")?.addEventListener("click", () => { location.href = "/signup.html";
});
/* Google popup */ $("googleBtn")?.addEventListener("click", async () => { try { const cred = await signInWithPopup(auth, googleProvider); isolateUser(cred.user); 
    location.href = "dashboard.html";
  } catch (e) {
    show(e?.message || String(e));
  }
});
