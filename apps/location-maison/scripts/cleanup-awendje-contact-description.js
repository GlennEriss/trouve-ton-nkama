/* eslint-disable no-console */

const bufferModule = require("node:buffer");
if (!bufferModule.SlowBuffer) {
  bufferModule.SlowBuffer = bufferModule.Buffer;
}

const { initFirestoreAdmin } = require("./openstreetmap/firestore-admin");

const PROPERTY_ID = "LUb9RKvnGJ3gxndhG7dI";
const CONTACT_PATTERNS = [
  /\s*Contact proprietaire\s*:\s*077\s*41\s*33\s*82\.?/gi,
  /\s*Contact propriétaire\s*:\s*077\s*41\s*33\s*82\.?/gi,
];

function cleanText(value) {
  if (typeof value !== "string") return value;
  return CONTACT_PATTERNS.reduce((text, pattern) => text.replace(pattern, ""), value)
    .replace(/\s+\./g, ".")
    .replace(/\s{2,}/g, " ")
    .trim();
}

async function main() {
  const { admin, db } = initFirestoreAdmin();
  const ref = db.collection("properties").doc(PROPERTY_ID);
  const snapshot = await ref.get();

  if (!snapshot.exists) {
    throw new Error(`Annonce introuvable: ${PROPERTY_ID}`);
  }

  const data = snapshot.data();
  const updates = {};

  for (const field of ["description", "detail", "details", "additionalInformation", "additionnalInformation", "complementaryInfo"]) {
    if (typeof data[field] === "string") {
      const cleaned = cleanText(data[field]);
      if (cleaned !== data[field]) updates[field] = cleaned;
    }
  }

  if (Object.keys(updates).length === 0) {
    console.log("Aucun champ à modifier. Champs texte actuels:");
    console.log(
      JSON.stringify(
        {
          description: data.description,
          detail: data.detail,
          details: data.details,
          additionalInformation: data.additionalInformation,
          additionnalInformation: data.additionnalInformation,
          complementaryInfo: data.complementaryInfo,
        },
        null,
        2
      )
    );
    return;
  }

  updates.updatedAt = admin.firestore.Timestamp.now();
  await ref.update(updates);

  console.log("Annonce mise à jour:");
  console.log(JSON.stringify(updates, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
