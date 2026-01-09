// Reproduction exacte de src/db/generic.db.ts -> LocationIdGenerator
// IMPORTANT: on ne change PAS la normalisation (pas de suppression d'accents / ponctuation),
// pour rester 100% compatible avec les IDs déjà utilisés dans l'app.

function normalizeName(name) {
  return String(name || "").toLowerCase().replace(/\s+/g, "");
}

function formatCoord(n) {
  // Firestore IDs doivent être stables: même précision que l'app (toFixed(5))
  return Number(n).toFixed(5);
}

function generateId(name, lon, lat) {
  const normalizedName = normalizeName(name);
  const formattedLongitude = formatCoord(lon);
  const formattedLatitude = formatCoord(lat);
  return `${normalizedName}_${formattedLongitude}_${formattedLatitude}`;
}

module.exports = {
  normalizeName,
  formatCoord,
  generateProvinceId: generateId,
  generateCityId: generateId,
  generateStreetId: generateId,
};


