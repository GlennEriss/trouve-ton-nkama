// gabon_osm_export.mjs
import fs from "node:fs/promises";

const OVERPASS_URL = "https://overpass-api.de/api/interpreter"; // :contentReference[oaicite:2]{index=2}

async function overpass(query) {
  const res = await fetch(OVERPASS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
    body: new URLSearchParams({ data: query }).toString(),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Overpass error ${res.status}: ${text.slice(0, 500)}`);
  }
  return res.json();
}

function toItem(el) {
  const tags = el.tags || {};
  const center = el.center
    ? { lat: el.center.lat, lon: el.center.lon }
    : el.lat && el.lon
      ? { lat: el.lat, lon: el.lon }
      : null;

  return {
    osm: { type: el.type, id: el.id },
    name: tags.name || null,
    names: {
      fr: tags["name:fr"] || null,
      en: tags["name:en"] || null,
      local: tags["name:ln"] || tags["name:fan"] || null
    },
    tags,
    center
  };
}

const ADMIN_QUERY = `
[out:json][timeout:180];
rel["boundary"="administrative"]["admin_level"="2"]["ISO3166-1"="GA"];
map_to_area -> .ga;

(
  rel(area.ga)["boundary"="administrative"]["admin_level"="4"];
  rel(area.ga)["boundary"="administrative"]["admin_level"="6"];
  rel(area.ga)["boundary"="administrative"]["admin_level"="8"];
  rel(area.ga)["boundary"="administrative"]["admin_level"="9"];
  rel(area.ga)["boundary"="administrative"]["admin_level"="10"];
);
out tags center;
`;

const PLACES_QUERY = `
[out:json][timeout:180];
rel["boundary"="administrative"]["admin_level"="2"]["ISO3166-1"="GA"];
map_to_area -> .ga;

(
  nwr(area.ga)["place"="city"];
  nwr(area.ga)["place"="town"];
  nwr(area.ga)["place"="village"];
  nwr(area.ga)["place"="hamlet"];
  nwr(area.ga)["place"="suburb"];
  nwr(area.ga)["place"="neighbourhood"];
  nwr(area.ga)["place"="quarter"];
  nwr(area.ga)["place"="locality"];
);
out tags center;
`;

function groupAdmin(elements) {
  const out = { "4": [], "6": [], "8": [], "9": [], "10": [] };
  for (const el of elements) {
    if (!el.tags) continue;
    const lvl = el.tags.admin_level;
    if (lvl && out[lvl]) out[lvl].push(toItem(el));
  }
  return out;
}

function groupPlaces(elements) {
  const out = {
    city: [], town: [], village: [], hamlet: [],
    suburb: [], neighbourhood: [], quarter: [], locality: []
  };
  for (const el of elements) {
    if (!el.tags) continue;
    const p = el.tags.place;
    if (p && out[p]) out[p].push(toItem(el));
  }
  return out;
}

const now = new Date().toISOString();

console.log("Fetching admin boundaries...");
const adminJson = await overpass(ADMIN_QUERY);
console.log("Fetching places...");
const placesJson = await overpass(PLACES_QUERY);

const data = {
  country: { name: "Gabon", iso2: "GA" },
  generated_at: now,
  source: { provider: "OpenStreetMap", method: "Overpass API", endpoint: OVERPASS_URL },
  admin_boundaries: groupAdmin(adminJson.elements || []),
  places: groupPlaces(placesJson.elements || [])
};

await fs.writeFile("gabon_osm.json", JSON.stringify(data, null, 2), "utf-8");
console.log("Done -> gabon_osm.json");
