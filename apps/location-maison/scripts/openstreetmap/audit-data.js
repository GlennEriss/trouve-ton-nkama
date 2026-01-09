/* eslint-disable no-console */
/**
 * Audit de cohérence des données dans Firestore
 *
 * Vérifie:
 * - Références orphelines (streets -> cities, cities -> provinces, streets -> provinces)
 * - Documents sans nom
 * - Coordonnées manquantes/invalides
 * - Statistiques générales
 *
 * Usage:
 *   node scripts/openstreetmap/audit-data.js
 */

const { initFirestoreAdmin } = require("./firestore-admin");

async function audit() {
  console.log("🔍 Audit de cohérence des données...\n");

  const { db } = initFirestoreAdmin();

  // 1. Vérifier les références orphelines : streets -> cities
  console.log("1️⃣  Vérification des références streets -> cities...");
  const citiesSnap = await db.collection("cities").get();
  const cityIds = new Set();
  citiesSnap.forEach((doc) => cityIds.add(doc.id));

  const streetsSnap = await db.collection("streets").get();
  const orphanStreets = [];
  streetsSnap.forEach((doc) => {
    const data = doc.data();
    const cityId = data.cityId;
    if (cityId && !cityIds.has(cityId)) {
      orphanStreets.push({
        id: doc.id,
        name: data.name,
        cityId,
        cityName: data.cityName,
      });
    }
  });

  if (orphanStreets.length > 0) {
    console.log(`   ⚠️  ${orphanStreets.length} streets référencent des cities inexistantes:`);
    orphanStreets.slice(0, 10).forEach((s) => {
      console.log(`      - ${s.name} (streetId: ${s.id}) -> cityId: ${s.cityId} (cityName: ${s.cityName})`);
    });
    if (orphanStreets.length > 10) {
      console.log(`      ... et ${orphanStreets.length - 10} autres`);
    }
  } else {
    console.log("   ✅ Toutes les streets référencent des cities valides");
  }

  // 2. Vérifier les références orphelines : cities -> provinces
  console.log("\n2️⃣  Vérification des références cities -> provinces...");
  const provincesSnap = await db.collection("provinces").get();
  const provinceIds = new Set();
  provincesSnap.forEach((doc) => provinceIds.add(doc.id));

  const orphanCities = [];
  citiesSnap.forEach((doc) => {
    const data = doc.data();
    const provinceId = data.provinceId;
    if (provinceId && !provinceIds.has(provinceId)) {
      orphanCities.push({
        id: doc.id,
        name: data.name,
        provinceId,
        provinceName: data.provinceName,
      });
    }
  });

  if (orphanCities.length > 0) {
    console.log(`   ⚠️  ${orphanCities.length} cities référencent des provinces inexistantes:`);
    orphanCities.slice(0, 10).forEach((c) => {
      console.log(`      - ${c.name} (cityId: ${c.id}) -> provinceId: ${c.provinceId} (provinceName: ${c.provinceName})`);
    });
    if (orphanCities.length > 10) {
      console.log(`      ... et ${orphanCities.length - 10} autres`);
    }
  } else {
    console.log("   ✅ Toutes les cities référencent des provinces valides");
  }

  // 3. Vérifier les références orphelines : streets -> provinces
  console.log("\n3️⃣  Vérification des références streets -> provinces...");
  const orphanStreetsProvince = [];
  streetsSnap.forEach((doc) => {
    const data = doc.data();
    const provinceId = data.provinceId;
    if (provinceId && !provinceIds.has(provinceId)) {
      orphanStreetsProvince.push({
        id: doc.id,
        name: data.name,
        provinceId,
        provinceName: data.provinceName,
      });
    }
  });

  if (orphanStreetsProvince.length > 0) {
    console.log(`   ⚠️  ${orphanStreetsProvince.length} streets référencent des provinces inexistantes:`);
    orphanStreetsProvince.slice(0, 10).forEach((s) => {
      console.log(`      - ${s.name} (streetId: ${s.id}) -> provinceId: ${s.provinceId} (provinceName: ${s.provinceName})`);
    });
    if (orphanStreetsProvince.length > 10) {
      console.log(`      ... et ${orphanStreetsProvince.length - 10} autres`);
    }
  } else {
    console.log("   ✅ Toutes les streets référencent des provinces valides");
  }

  // 4. Statistiques générales
  console.log("\n4️⃣  Statistiques générales:");
  console.log(`   - Provinces: ${provincesSnap.size}`);
  console.log(`   - Cities: ${citiesSnap.size}`);
  console.log(`   - Streets: ${streetsSnap.size}`);

  // 5. Vérifier les documents sans nom
  console.log("\n5️⃣  Documents sans nom:");
  let citiesWithoutName = 0;
  let streetsWithoutName = 0;
  citiesSnap.forEach((doc) => {
    if (!doc.data().name || doc.data().name.trim() === "") citiesWithoutName++;
  });
  streetsSnap.forEach((doc) => {
    if (!doc.data().name || doc.data().name.trim() === "") streetsWithoutName++;
  });
  console.log(`   - Cities sans nom: ${citiesWithoutName}`);
  console.log(`   - Streets sans nom: ${streetsWithoutName}`);

  // 6. Vérifier les coordonnées manquantes/invalides
  console.log("\n6️⃣  Coordonnées manquantes ou invalides:");
  let citiesWithoutCoords = 0;
  let streetsWithoutCoords = 0;
  citiesSnap.forEach((doc) => {
    const data = doc.data();
    if (!data.latitude || !data.longitude || data.latitude === 0 || data.longitude === 0) {
      citiesWithoutCoords++;
    }
  });
  streetsSnap.forEach((doc) => {
    const data = doc.data();
    if (!data.latitude || !data.longitude || data.latitude === 0 || data.longitude === 0) {
      streetsWithoutCoords++;
    }
  });
  console.log(`   - Cities sans coordonnées valides: ${citiesWithoutCoords}`);
  console.log(`   - Streets sans coordonnées valides: ${streetsWithoutCoords}`);

  // 7. Résumé des problèmes
  console.log("\n📊 Résumé:");
  const totalIssues =
    orphanStreets.length + orphanCities.length + orphanStreetsProvince.length + citiesWithoutName + streetsWithoutName;
  if (totalIssues === 0) {
    console.log("   ✅ Aucun problème détecté ! Les données sont cohérentes.");
  } else {
    console.log(`   ⚠️  ${totalIssues} problème(s) détecté(s)`);
    if (orphanStreets.length > 0)
      console.log(`      - ${orphanStreets.length} références streets -> cities orphelines`);
    if (orphanCities.length > 0)
      console.log(`      - ${orphanCities.length} références cities -> provinces orphelines`);
    if (orphanStreetsProvince.length > 0)
      console.log(`      - ${orphanStreetsProvince.length} références streets -> provinces orphelines`);
    if (citiesWithoutName > 0) console.log(`      - ${citiesWithoutName} cities sans nom`);
    if (streetsWithoutName > 0) console.log(`      - ${streetsWithoutName} streets sans nom`);
  }
}

audit()
  .then(() => {
    process.exit(0);
  })
  .catch((e) => {
    console.error("❌ Erreur:", e);
    process.exit(1);
  });


