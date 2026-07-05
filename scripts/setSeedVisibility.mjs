/**
 * setSeedVisibility.mjs — toggle seeded demo records on/off at runtime
 *
 * Sets /config/show_seed_data in RTDB. The dashboard filters records
 * tagged `seeded: true` when the flag is false. Nothing is deleted —
 * flip back to true anytime.
 *
 * Usage:
 *   node scripts/setSeedVisibility.mjs true    # show seeded data (demo-populated)
 *   node scripts/setSeedVisibility.mjs false   # hide seeded data (production-clean)
 */

import { readFileSync } from "node:fs";
import admin from "firebase-admin";

const CREDS =
  process.env.GOOGLE_APPLICATION_CREDENTIALS ||
  "C:/Users/Administrator/Desktop/Tazemi/backend/service-account.json";
const DB_URL =
  process.env.FIREBASE_DATABASE_URL ||
  "https://tazemi-e48ba-default-rtdb.firebaseio.com";

const arg = String(process.argv[2] || "").toLowerCase();
if (arg !== "true" && arg !== "false") {
  console.error("Usage: node scripts/setSeedVisibility.mjs <true|false>");
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert(JSON.parse(readFileSync(CREDS, "utf8"))),
  databaseURL: DB_URL,
});

await admin.database().ref("config/show_seed_data").set(arg === "true");
console.log(
  `show_seed_data = ${arg} — seeded records are now ${arg === "true" ? "VISIBLE (demo-populated mode)" : "HIDDEN (production-clean mode)"}.`,
);
console.log("Dashboards pick this up on next page load.");
process.exit(0);
