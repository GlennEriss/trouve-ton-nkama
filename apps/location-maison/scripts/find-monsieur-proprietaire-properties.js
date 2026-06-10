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
  const snapshot = await db
    .collection("properties")
    .where("createdBy", "==", userRecord.uid)
    .orderBy("createdAt", "desc")
    .limit(10)
    .get();

  console.log(`Proprietes pour ${email} (${userRecord.uid}): ${snapshot.size}`);
  snapshot.forEach((doc) => {
    const data = doc.data();
    console.log(JSON.stringify({
      id: doc.id,
      title: data.title,
      name: data.name,
      typeProperty: data.typeProperty,
      state: data.state,
      status: data.status,
      price: data.price,
      createdAt: data.createdAt?.toDate?.()?.toISOString?.() || data.createdAt,
    }, null, 2));
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
