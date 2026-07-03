import { initializeApp, getApp, getApps } from "firebase/app";
import {
  createUserWithEmailAndPassword,
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from "firebase/auth";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const missingFirebaseEnvKeys = Object.entries(firebaseConfig)
  .filter(([, value]) => !value)
  .map(([key]) => `VITE_FIREBASE_${key.replace(/([A-Z])/g, "_$1").toUpperCase()}`);

if (typeof window !== "undefined" && missingFirebaseEnvKeys.length) {
  console.debug("[Firebase] Missing env values:", missingFirebaseEnvKeys);
}

const hasFirebaseConfig = Boolean(firebaseConfig.apiKey && firebaseConfig.authDomain && firebaseConfig.projectId && firebaseConfig.appId);
const firebaseEnabled = hasFirebaseConfig && typeof window !== "undefined";
const app = firebaseEnabled && getApps().length ? getApp() : firebaseEnabled ? initializeApp(firebaseConfig) : null;
const auth = app ? getAuth(app) : null;
const database = app ? getDatabase(app) : null;

export function isFirebaseConfigured() {
  return firebaseEnabled;
}

export { auth, database, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, updateProfile };
