import {
  auth,
  isFirebaseConfigured,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from "./firebaseClient";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api/v1";
const AUTH_MODE = import.meta.env.VITE_AUTH_MODE || "local"; // local | firebase | production
const AUTH_KEY = "tazemi_auth_user";
const FCM_AUTH_KEY = "tazemi_firebase_auth";

function isLocalMode() {
  return AUTH_MODE === "local";
}

function isProductionMode() {
  return AUTH_MODE === "production";
}

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });

  if (!response.ok) {
    const message = await response.text().catch(() => "");
    throw new Error(message || `Request failed: ${response.status}`);
  }

  const payload = await response.json();
  return payload?.data ?? payload;
}

function getStoredUser() {
  try {
    return JSON.parse(localStorage.getItem(AUTH_KEY) || "null");
  } catch {
    return null;
  }
}

function setStoredUser(user) {
  localStorage.setItem(AUTH_KEY, JSON.stringify(user));
}

function setFirebaseAuth(user) {
  localStorage.setItem(FCM_AUTH_KEY, JSON.stringify(user));
}

function mapFirebaseUser(firebaseUser) {
  return {
    uid: firebaseUser.uid,
    email: firebaseUser.email,
    name: firebaseUser.displayName || firebaseUser.email?.split("@")[0] || "User",
    role: firebaseUser.role || "read-only",
    provider: "firebase",
    access_token: firebaseUser.access_token,
  };
}

function normalizeAuthError(error) {
  const code = error?.code || "";
  if (
    code.includes("auth/invalid-credential") ||
    code.includes("auth/wrong-password") ||
    code.includes("auth/user-not-found")
  ) {
    return "Invalid email or password.";
  }
  if (code.includes("auth/email-already-in-use")) {
    return "This email is already registered.";
  }
  if (code.includes("auth/weak-password")) {
    return "Password should be at least 6 characters.";
  }
  if (code.includes("auth/operation-not-allowed")) {
    return "Email/password authentication is not enabled in Firebase.";
  }
  if (code.includes("auth/configuration-not-found")) {
    return "Firebase is not configured correctly. Check your environment variables.";
  }
  return error?.message || "Authentication failed. Please try again.";
}

async function syncBackend(firebaseUser) {
  if (!firebaseUser?.getIdToken) {
    const profile = mapFirebaseUser(firebaseUser || {});
    setStoredUser(profile);
    setFirebaseAuth(profile);
    return profile;
  }

  const idToken = await firebaseUser.getIdToken();
  const profile = mapFirebaseUser(firebaseUser);

  const result = await request("/auth/login", {
    method: "POST",
    body: JSON.stringify({
      provider: "firebase",
      id_token: idToken,
      user: profile,
    }),
  });

  const sessionUser = result?.user || result;
  const combined = { ...profile, ...sessionUser };

  setStoredUser(combined);
  setFirebaseAuth(combined);
  return combined;
}

export function clearAuth() {
  localStorage.removeItem(AUTH_KEY);
  localStorage.removeItem(FCM_AUTH_KEY);
}

export function getAuthUser() {
  return getStoredUser();
}

export async function fetchRoles() {
  if (isLocalMode()) {
    return { roles: ["ceo", "field_operator"] };
  }
  return request("/auth/roles");
}

export async function login(payload) {
  if (isLocalMode()) {
    const fallbackUser = {
      uid: payload.email,
      email: payload.email,
      name: payload.email?.split("@")[0] || "User",
      role: "ceo",
      provider: "local",
    };

    setStoredUser(fallbackUser);
    setFirebaseAuth(fallbackUser);
    return fallbackUser;
  }

  if (!isFirebaseConfigured() || !auth) {
    if (!isProductionMode()) {
      const fallbackUser = {
        uid: payload.email,
        email: payload.email,
        name: payload.email?.split("@")[0] || "User",
        role: "read-only",
        provider: "local",
      };

      setStoredUser(fallbackUser);
      setFirebaseAuth(fallbackUser);
      return fallbackUser;
    }

    throw new Error("Authentication is not available in this environment.");
  }

  try {
    const cred = await signInWithEmailAndPassword(auth, payload.email, payload.password);
    return syncBackend(cred.user);
  } catch (error) {
    throw new Error(normalizeAuthError(error));
  }
}

export async function logout() {
  try {
    if (!isLocalMode() && auth) {
      await signOut(auth);
    }

    if (!isLocalMode()) {
      const user = getStoredUser();
      await request("/auth/logout", {
        method: "POST",
        body: JSON.stringify({ access_token: user?.access_token }),
      });
    }
  } catch {
    // ignore for now
  }

  clearAuth();
}

export function subscribeToFirebaseAuth(callback) {
  if (isLocalMode()) {
    callback(getStoredUser());
    return () => {};
  }

  if (!auth) {
    callback(null);
    return () => {};
  }

  return onAuthStateChanged(auth, callback);
}