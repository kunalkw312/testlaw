// config.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCq0fxtwd3RFRTLiLat1xzS4l_wWvTwOPo",
  authDomain: "lawsuitfiles-9e413.firebaseapp.com",
  projectId: "lawsuitfiles-9e413",
  storageBucket: "lawsuitfiles-9e413.firebasestorage.app",
  messagingSenderId: "219336060049",
  appId: "1:219336060049:web:8bbbe9762f1ff58c6a2330",
  measurementId: "G-HP8FRFDBRW"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Export modules so app.js can utilize them
export { app, auth, db };
