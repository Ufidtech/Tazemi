import { readFileSync } from "node:fs";
import admin from "firebase-admin";

const CREDS = "C:/Users/Administrator/Desktop/Tazemi/backend/service-account.json";
admin.initializeApp({
  credential: admin.credential.cert(JSON.parse(readFileSync(CREDS, "utf8"))),
});

const email = process.argv[2] || "ojoqamorudeen88@gmail.com";
const newPassword = process.argv[3]; // optional: set a temporary password

const u = await admin.auth().getUserByEmail(email);
console.log("email:    ", u.email);
console.log("providers:", u.providerData.map((p) => p.providerId).join(", ") || "NONE");
console.log("disabled: ", u.disabled);
console.log("claims:   ", JSON.stringify(u.customClaims || {}));

if (newPassword) {
  await admin.auth().updateUser(u.uid, { password: newPassword });
  console.log("password: ", "UPDATED (temporary — change after first login)");
}
process.exit(0);
