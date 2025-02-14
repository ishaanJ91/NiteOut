// src/firebaseConfig.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCsXXjAFlESkikhj7aWi3hs7vFlrNj3soQ",
  // authDomain: "com.anonymous.mobile.firebaseapp.com",
  projectId: "niteout-49dc5",
  // storageBucket: "com-anonymous-mobile.appspot.com",
  appId: "1:77171862574:ios:09ee78bf87992d1d2103bf",
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
