
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getAnalytics, isSupported } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  // Firebase 전용 API 키를 복구합니다. 
  // process.env.API_KEY는 Gemini API 전용이므로 Firebase 설정에 사용하면 인증 오류가 발생합니다.
  apiKey: "AIzaSyDpaMpA7G6sOdI8lXpq064ufwmeYaV2nMc",
  authDomain: "nami-9e436.firebaseapp.com",
  projectId: "nami-9e436",
  storageBucket: "nami-9e436.firebasestorage.app",
  messagingSenderId: "369975985921",
  appId: "1:369975985921:web:243aec9018ed9568d23d00",
  measurementId: "G-CZJDK8WFZG"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

// Analytics initialization with environment support check
let analytics = null;
isSupported().then(supported => {
  if (supported) {
    try {
      analytics = getAnalytics(app);
    } catch (e) {
      console.warn("Analytics initialization failed:", e);
    }
  }
});

export { auth, db, googleProvider, analytics };
