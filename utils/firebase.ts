
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBbtD8Uj2q2vsrPrTJzDtR1YpgoVGd2FPk",
  authDomain: "fiaos-ffed7.firebaseapp.com",
  projectId: "fiaos-ffed7",
  storageBucket: "fiaos-ffed7.firebasestorage.app",
  messagingSenderId: "110252982314",
  appId: "1:110252982314:web:676182356e72cbe443c353",
  measurementId: "G-JXM1T1FYQH"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db, analytics };
