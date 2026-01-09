const fs = require("node:fs");
const path = require("node:path");

function loadGabonOsmJson() {
  const filePath = path.join(__dirname, "gabon_osm.json");
  const raw = fs.readFileSync(filePath, "utf8");
  return JSON.parse(raw);
}

function pickBestName(item) {
  if (!item) return "";
  const fr = item.names && item.names.fr;
  // Fallback "0 perte" : si pas de nom, générer un identifiant lisible et stable
  if (fr || item.name) return fr || item.name;
  if (item.osm && item.osm.type && item.osm.id) {
    return `osm_${item.osm.type}_${item.osm.id}`;
  }
  return "osm_unknown";
}

function pickCenter(item) {
  // Fallback "0 perte" : si pas de center, on met 0/0 (et le name fallback assure l'unicité)
  if (item && item.center && typeof item.center.lat === "number" && typeof item.center.lon === "number") {
    return item.center;
  }
  return { lat: 0, lon: 0 };
}

module.exports = { loadGabonOsmJson, pickBestName, pickCenter };


