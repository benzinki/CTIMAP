import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
const firebaseConfig = {
  apiKey: "AIzaSyDGW0Z0YLQe0qjgoSklVFAfV5jnW6CmTdw",
  authDomain: "ctimap-f07ab.firebaseapp.com",
  projectId: "ctimap-f07ab",
  storageBucket: "ctimap-f07ab.appspot.com",
  messagingSenderId: "1025064939497",
  appId: "1:1025064939497:web:e140b7a75988630bade578",
  measurementId: "G-DZL70CLXKV"
};
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const firestore = getFirestore(app);
const auth = getAuth(app);

export { app, analytics, auth, firestore }