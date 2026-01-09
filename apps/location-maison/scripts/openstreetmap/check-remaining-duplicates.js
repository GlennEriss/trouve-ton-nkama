/* eslint-disable no-console */
/**
 * Vérification des doublons potentiels restants après déduplication
 *
 * Usage:
 *   node scripts/openstreetmap/check-remaining-duplicates.js
 */

const { initFirestoreAdmin } = require("./firestore-admin");
const { haversineKm } = require("./geo");
const { normalizeName } = require("./id-generator");

async function checkDuplicates() {
  console.log("🔍 Recherche de doublons potentiels restants...\n");

  const { db } = initFirestoreAdmin();

  // Vérifier cities
  const citiesSnap = await db.collection("cities").get();
  const cities = [];
  citiesSnap.forEach((doc) => {
    const data = doc.data();
    cities.push({
      id: doc.id,
      name: data.name || "",
      provinceName: data.provinceName || "",
      lat: data.latitude || 0,
      lon: data.longitude || 0,
    });
  });

  const cityGroups = new Map();
  cities.forEach((c) => {
    const key = `${normalizeName(c.name)}|${normalizeName(c.provinceName || "")}`;
    if (!cityGroups.has(key)) cityGroups.set(key, []);
    cityGroups.get(key).push(c);
  });

  const cityDupes = [];
  cityGroups.forEach((group) => {
    if (group.length > 1) {
      // Vérifier distances
      for (let i = 0; i < group.length; i++) {
        for (let j = i + 1; j < group.length; j++) {
          const c1 = group[i];
          const c2 = group[j];
          if (c1.lat && c1.lon && c2.lat && c2.lon && c1.lat !== 0 && c1.lon !== 0 && c2.lat !== 0 && c2.lon !== 0) {
            const dist = haversineKm({ lat: c1.lat, lon: c1.lon }, { lat: c2.lat, lon: c2.lon });
            if (dist <= 1.0) {
              cityDupes.push({ c1, c2, dist });
            }
          }
        }
      }
    }
  });

  if (cityDupes.length > 0) {
    console.log(`⚠️  ${cityDupes.length} paires de cities potentiellement en doublon (distance <= 1km):`);
    cityDupes.slice(0, 10).forEach(({ c1, c2, dist }) => {
      console.log(`   - ${c1.name} (${c1.id}) <-> ${c2.name} (${c2.id}) : ${dist.toFixed(3)} km`);
    });
  } else {
    console.log("✅ Aucun doublon de cities détecté");
  }

  // Vérifier streets
  const streetsSnap = await db.collection("streets").get();
  const streets = [];
  streetsSnap.forEach((doc) => {
    const data = doc.data();
    streets.push({
      id: doc.id,
      name: data.name || "",
      cityId: data.cityId || "",
      lat: data.latitude || 0,
      lon: data.longitude || 0,
    });
  });

  // Normalisation simple pour streets
  function norm(s) {
    return (s || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]/g, "");
  }

  const streetGroups = new Map();
  streets.forEach((s) => {
    const key = `${norm(s.name)}|${s.cityId}`;
    if (!streetGroups.has(key)) streetGroups.set(key, []);
    streetGroups.get(key).push(s);
  });

  const streetDupes = [];
  streetGroups.forEach((group) => {
    if (group.length > 1) {
      for (let i = 0; i < group.length; i++) {
        for (let j = i + 1; j < group.length; j++) {
          const s1 = group[i];
          const s2 = group[j];
          if (s1.lat && s1.lon && s2.lat && s2.lon && s1.lat !== 0 && s1.lon !== 0 && s2.lat !== 0 && s2.lon !== 0) {
            const dist = haversineKm({ lat: s1.lat, lon: s1.lon }, { lat: s2.lat, lon: s2.lon });
            if (dist <= 1.0) {
              streetDupes.push({ s1, s2, dist });
            }
          }
        }
      }
    }
  });

  if (streetDupes.length > 0) {
    console.log(`\n⚠️  ${streetDupes.length} paires de streets potentiellement en doublon (distance <= 1km):`);
    streetDupes.slice(0, 10).forEach(({ s1, s2, dist }) => {
      console.log(`   - ${s1.name} (${s1.id.substring(0, 40)}...) <-> ${s2.name} (${s2.id.substring(0, 40)}...) : ${dist.toFixed(3)} km`);
    });
  } else {
    console.log("\n✅ Aucun doublon de streets détecté");
  }

  // Résumé
  console.log("\n📊 Résumé:");
  if (cityDupes.length === 0 && streetDupes.length === 0) {
    console.log("   ✅ Aucun doublon restant détecté !");
  } else {
    if (cityDupes.length > 0) console.log(`   ⚠️  ${cityDupes.length} paires de cities en doublon`);
    if (streetDupes.length > 0) console.log(`   ⚠️  ${streetDupes.length} paires de streets en doublon`);
  }
}

checkDuplicates()
  .then(() => {
    process.exit(0);
  })
  .catch((e) => {
    console.error("❌ Erreur:", e);
    process.exit(1);
  });


