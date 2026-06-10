/* eslint-disable no-console */

const bufferModule = require("node:buffer");
if (!bufferModule.SlowBuffer) {
  bufferModule.SlowBuffer = bufferModule.Buffer;
}

const { initFirestoreAdmin } = require("./openstreetmap/firestore-admin");

async function main() {
  const email = "monsieurleproprietaire@ttn.ga";
  const { admin, db } = initFirestoreAdmin();
  const userRecord = await admin.auth().getUserByEmail(email);

  await db.collection("users").doc(userRecord.uid).set(
    {
      birthDate: "1980-01-01",
      metadata: {
        needsProfileCompletion: false,
      },
      updatedAt: admin.firestore.Timestamp.now(),
    },
    { merge: true }
  );

  console.log(`Profil complete pour ${email} (${userRecord.uid})`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
