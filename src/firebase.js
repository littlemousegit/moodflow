// src/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyBw9YZkq6tS-5x0nIWSut4NRQbN-nhF4yI",
  authDomain: "moodflow-2025.firebaseapp.com",
  databaseURL: "https://moodflow-2025-default-rtdb.firebaseio.com",
  projectId: "moodflow-2025",
  storageBucket: "moodflow-2025.firebasestorage.app",
  messagingSenderId: "314162036018",
  appId: "1:314162036018:web:066eb712baaa92bff96b2b"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getDatabase(app);