// src/firebaseConfig.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyD9gpgLG8rF9Ix3vuYG_7oRVEnjKZP3CZc",
  authDomain: "com.anonymous.mobile.firebaseapp.com",
  projectId: "niteout-6c93f",
  storageBucket: "com-anonymous-mobile.appspot.com",
  appId: "1:575342652161:ios:5af9429a5c937965998900",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
const auth = getAuth(app);
const db = getFirestore(app);

// Disable offline persistence
// db.disableNetwork()
//   .then(() => console.log("Firestore network disabled for testing"))
//   .catch((error) => console.error("Error disabling network:", error));

export { auth, db };
