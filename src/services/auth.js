import {
  auth,
  isFirebaseConfigured,
  onAuthStateChanged,
  sendPasswordResetEmail,
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

function isBackendMode() {
  return AUTH_MODE === "backend";
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

// Canonical claim roles (PRD §1.2) → app-level role names
const CLAIM_ROLE_MAP = {
  CEO: "ceo",
  FIELD_OPERATOR: "field_operator",
  RND: "rnd",
};

/**
 * Detect the user's role from their Firebase ID token custom claim.
 * Forces a token refresh so a newly assigned role applies on the very
 * next sign-in — no waiting for token expiry, no manual selection.
 */
async function detectRoleFromClaims(firebaseUser) {
  if (!firebaseUser?.getIdTokenResult) return null;
  try {
    const { claims } = await firebaseUser.getIdTokenResult(true);
    if (!claims?.role) return null;
    return CLAIM_ROLE_MAP[claims.role] || String(claims.role).toLowerCase();
  } catch {
    return null;
  }
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

  // Role authority: the ID token custom claim. Detected automatically —
  // the backend mapping below is enrichment/fallback only.
  const claimRole = await detectRoleFromClaims(firebaseUser);
  const profile = {
    ...mapFirebaseUser(firebaseUser),
    ...(claimRole ? { role: claimRole } : {}),
  };

  try {
    const idToken = await firebaseUser.getIdToken();
    const result = await request("/auth/login", {
      method: "POST",
      body: JSON.stringify({
        provider: "firebase",
        id_token: idToken,
        user: profile,
      }),
    });

    const sessionUser = result?.user || result;
    const combined = {
      ...profile,
      ...sessionUser,
      // Claim wins over backend mapping; backend wins over default.
      role: claimRole || sessionUser?.role || profile.role,
      access_token: result?.access_token || sessionUser?.access_token || profile.access_token,
    };

    setStoredUser(combined);
    setFirebaseAuth(combined);
    return combined;
  } catch {
    // Backend unreachable — sign-in still succeeds with the claim-derived role.
    setStoredUser(profile);
    setFirebaseAuth(profile);
    return profile;
  }
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

async function backendLogin(payload) {
  const result = await request("/auth/login", {
    method: "POST",
    body: JSON.stringify({
      provider: "password",
      email: payload.email,
      password: payload.password,
    }),
  });

  const sessionUser = result?.user || result;
  const combined = {
    ...sessionUser,
    access_token: result?.access_token || sessionUser?.access_token,
    provider: "backend",
  };

  setStoredUser(combined);
  setFirebaseAuth(combined);
  return combined;
}

export async function login(payload) {
  if (isBackendMode()) {
    return backendLogin(payload);
  }

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
    throw new Error(normalizeAuthError(error), { cause: error });
  }
}

/**
 * Send a password-reset email via Firebase Auth ("Forgot password?").
 * Always resolves with a generic message so account existence is never
 * revealed (anti-enumeration).
 */
export async function resetPassword(email) {
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("Enter a valid email address first.");
  }
  if (!isFirebaseConfigured() || !auth) {
    throw new Error("Password reset is not available in this environment.");
  }
  try {
    await sendPasswordResetEmail(auth, email);
  } catch (error) {
    // Swallow user-not-found so emails can't be probed; surface real config errors.
    if (!String(error?.code || "").includes("auth/user-not-found")) {
      throw new Error(normalizeAuthError(error), { cause: error });
    }
  }
  return "If an account exists for that email, a reset link has been sent.";
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
  if (isLocalMode() || isBackendMode()) {
    callback(getStoredUser());
    return () => {};
  }

  if (!auth) {
    callback(null);
    return () => {};
  }

  return onAuthStateChanged(auth, callback);
}

export async function fetchStaff() {
  const user = getStoredUser();
  return request("/auth/users", {
    headers: { Authorization: `Bearer ${user?.access_token || ""}` },
  });
}

export async function createStaffUser({ email, password, name, role }) {
  const user = getStoredUser();
  return request("/auth/users", {
    method: "POST",
    headers: { Authorization: `Bearer ${user?.access_token || ""}` },
    body: JSON.stringify({ email, password, name, role }),
  });
}

export async function topupAggregator(aggregatorId, { amount, method, note }) {
  const user = getStoredUser();
  return request(`/aggregators/${aggregatorId}/topup`, {
    method: "POST",
    headers: { Authorization: `Bearer ${user?.access_token || ""}` },
    body: JSON.stringify({ amount, method, note }),
  });
}