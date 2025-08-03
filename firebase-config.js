// Firebase configuration and initialization
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { 
  getAuth, 
  signInAnonymously, 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  onAuthStateChanged,
  signOut
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { getDatabase, ref, push, onValue, off, set, get, child } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';

// Your Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDtg9AEZjPyB_609ZKw1kHv3D-9ZQPU78E",
  authDomain: "chat-app-74f41.firebaseapp.com",
  databaseURL: "https://chat-app-74f41-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "chat-app-74f41",
  storageBucket: "chat-app-74f41.firebasestorage.app",
  messagingSenderId: "718327340961",
  appId: "1:718327340961:web:ec80319ac56f33f3d275e0"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const database = getDatabase(app);

// Export Firebase services
window.firebase = {
  auth,
  database,
  ref,
  push,
  onValue,
  off,
  set,
  get,
  child,
  signInAnonymously,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  onAuthStateChanged,
  signOut
};

console.log('Firebase initialized successfully'); 