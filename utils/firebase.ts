import firebase from "firebase/compat/app";
import "firebase/compat/analytics";
import "firebase/compat/auth";
import "firebase/compat/firestore";

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
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

const app = firebase.app();
const analytics = firebase.analytics();
const auth = firebase.auth();
const db = firebase.firestore();

export { app, auth, db, analytics, firebase };