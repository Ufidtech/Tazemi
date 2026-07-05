/**
 * smokeTestAuth.mjs — end-to-end auth + rules smoke test
 *
 * Simulates the CEO login without the password: mints a custom token via
 * the service account, exchanges it for a real ID token (same thing the
 * browser gets from signInWithEmailAndPassword), then exercises the
 * deployed RTDB rules exactly like the dashboard does.
 *
 * Env: GOOGLE_APPLICATION_CREDENTIALS, FIREBASE_DATABASE_URL, FIREBASE_WEB_API_KEY
 * Run:  node scripts/smokeTestAuth.mjs
 */

import { readFileSync } from "node:fs";
import admin from "firebase-admin";

const dbUrl = process.env.FIREBASE_DATABASE_URL;
const apiKey = process.env.FIREBASE_WEB_API_KEY;
const CEO_UID = "FUdUGoluuidbsSmAL1PMMhyvp3v2"; // ojoqamorudeen88@gmail.com
const NO_ROLE_UID = "WFRI8L4N7Ud5AjcI9r4Oarh1c962"; // tazemi@gmail.com (no claim)

if (!dbUrl || !apiKey || !process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  console.error("Set GOOGLE_APPLICATION_CREDENTIALS, FIREBASE_DATABASE_URL, FIREBASE_WEB_API_KEY");
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert(
    JSON.parse(readFileSync(process.env.GOOGLE_APPLICATION_CREDENTIALS, "utf8")),
  ),
  databaseURL: dbUrl,
});

let failures = 0;
function report(name, pass, detail = "") {
  console.log(`${pass ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
  if (!pass) failures += 1;
}

/** Exchange a custom token for an ID token — what the browser SDK does. */
async function signIn(uid) {
  const customToken = await admin.auth().createCustomToken(uid);
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: customToken, returnSecureToken: true }),
    },
  );
  if (!res.ok) throw new Error(`signIn failed: ${res.status} ${await res.text()}`);
  return (await res.json()).idToken;
}

function decodeClaims(idToken) {
  return JSON.parse(Buffer.from(idToken.split(".")[1], "base64url").toString("utf8"));
}

const dbGet = (path, idToken) => fetch(`${dbUrl}/${path}.json?auth=${idToken}`);
const dbWrite = (path, idToken, body, method = "PUT") =>
  fetch(`${dbUrl}/${path}.json?auth=${idToken}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

/* ------------------------------------------------------------------ */

console.log("— CEO login simulation (ojoqamorudeen88@gmail.com) —");
const ceoToken = await signIn(CEO_UID);
const claims = decodeClaims(ceoToken);
report("Sign-in issues ID token", Boolean(ceoToken));
report("Role claim auto-detected on token", claims.role === "CEO", `role=${claims.role}`);

// Reads the dashboard performs on load
for (const path of ["aggregators", "batches", "dashboard/kpis", "pricing/current", "devices"]) {
  const res = await dbGet(path, ceoToken);
  const val = res.ok ? await res.json() : null;
  const count = val && typeof val === "object" ? Object.keys(val).length : 0;
  report(`CEO reads /${path}`, res.ok && count > 0, `${res.status}, keys=${count}`);
}

// CEO-only write (harmless path, cleaned up after)
const writeRes = await dbWrite("dashboard/smoke_test", ceoToken, { at: Date.now() });
report("CEO write to CEO-only path allowed", writeRes.ok, `${writeRes.status}`);
await dbWrite("dashboard/smoke_test", ceoToken, null);

console.log("\n— Negative tests —");
const noRoleToken = await signIn(NO_ROLE_UID);
const noRoleClaims = decodeClaims(noRoleToken);
report("No-role user has no role claim", !noRoleClaims.role);

const readRes = await dbGet("aggregators", noRoleToken);
report("No-role user can still READ (authenticated)", readRes.ok, `${readRes.status}`);

const deniedWrite = await dbWrite("dashboard/smoke_test", noRoleToken, { hack: true });
report("No-role user write DENIED", !deniedWrite.ok, `${deniedWrite.status}`);

const pricingAttack = await dbWrite("pricing/current/active_rate", noRoleToken, 1);
report("No-role user pricing tamper DENIED", !pricingAttack.ok, `${pricingAttack.status}`);

const unauthRead = await fetch(`${dbUrl}/aggregators.json`);
report("Unauthenticated read DENIED", !unauthRead.ok, `${unauthRead.status}`);

console.log(`\n${failures === 0 ? "ALL TESTS PASSED" : `${failures} FAILURE(S)`}`);
process.exit(failures === 0 ? 0 : 1);
