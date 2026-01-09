function toRad(deg) {
  return (deg * Math.PI) / 180;
}

// Haversine distance en km
function haversineKm(a, b) {
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const sinDLat = Math.sin(dLat / 2);
  const sinDLon = Math.sin(dLon / 2);

  const h =
    sinDLat * sinDLat +
    Math.cos(lat1) * Math.cos(lat2) * (sinDLon * sinDLon);
  const c = 2 * Math.asin(Math.sqrt(h));
  return R * c;
}

function nearestByCenter(point, candidates) {
  if (!point || !candidates || candidates.length === 0) return null;
  let best = null;
  let bestDist = Infinity;
  for (const c of candidates) {
    if (!c || !c.center) continue;
    const d = haversineKm(point, c.center);
    if (d < bestDist) {
      bestDist = d;
      best = c;
    }
  }
  if (!best) return null;
  return { item: best, distanceKm: bestDist };
}

module.exports = { haversineKm, nearestByCenter };


