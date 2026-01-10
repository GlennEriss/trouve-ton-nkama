// gabon_osm_export.mjs
import fs from "node:fs/promises";

// Overpass peut être instable (429/502/504). On essaie plusieurs endpoints + retries.
const OVERPASS_URLS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.nchc.org.tw/api/interpreter",
  "https://overpass.openstreetmap.ru/api/interpreter",
];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableStatus(status) {
  return status === 429 || status === 502 || status === 503 || status === 504;
}

async function overpass(query) {
  const body = new URLSearchParams({ data: query }).toString();

  const maxAttemptsPerEndpoint = 3;
  const baseDelayMs = 1200;

  let lastErr = null;

  for (const endpoint of OVERPASS_URLS) {
    for (let attempt = 1; attempt <= maxAttemptsPerEndpoint; attempt++) {
      try {
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
          body,
        });

        if (!res.ok) {
          const text = await res.text().catch(() => "");
          const msg = `Overpass error ${res.status} @ ${endpoint}: ${text.slice(0, 500)}`;

          // 400 = requête invalide, pas besoin de retry sur le même endpoint
          if (!isRetryableStatus(res.status)) {
            throw new Error(msg);
          }

          lastErr = new Error(msg);
          const delay = baseDelayMs * Math.pow(2, attempt - 1);
          console.warn(`Retryable Overpass status ${res.status} (attempt ${attempt}/${maxAttemptsPerEndpoint}) -> wait ${delay}ms`);
          await sleep(delay);
          continue;
        }

        return res.json();
      } catch (e) {
        lastErr = e;
        // Erreur réseau / endpoint KO -> petit backoff puis on réessaie (ou on passera au prochain endpoint)
        if (attempt < maxAttemptsPerEndpoint) {
          const delay = baseDelayMs * Math.pow(2, attempt - 1);
          console.warn(`Overpass request failed (attempt ${attempt}/${maxAttemptsPerEndpoint}) -> wait ${delay}ms`);
          await sleep(delay);
          continue;
        }
      }
    }

    console.warn(`Switching Overpass endpoint after failures: ${endpoint}`);
  }

  throw lastErr ?? new Error("Overpass error: all endpoints failed");
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

// Recherche ciblée pour des quartiers connus localement mais pas forcément taggés place=*
// Objectif: récupérer "Marseille 2" à Akanda si OSM le contient sous un autre type (ex: landuse/boundary avec name)
const TARGETED_MARSEILLE2_QUERY = `
[out:json][timeout:180];
rel["boundary"="administrative"]["admin_level"="2"]["ISO3166-1"="GA"];
map_to_area -> .ga;

(
  // Overpass regex flags use a comma: ["name"~"regex",i]
  // On évite \\s (qui peut varier selon moteur regex) et on tolère des espaces simples.
  nwr(area.ga)["name"~"^Marseille *2$",i];
  nwr(area.ga)["name:fr"~"^Marseille *2$",i];
  nwr(area.ga)["name"~"^Marseille *II$",i];
  nwr(area.ga)["name:fr"~"^Marseille *II$",i];
);
out tags center;
`;

// Injections manuelles (pour les lieux connus localement mais absents d'OSM ou non trouvables par Overpass)
// IMPORTANT: ça permet de conserver l'entrée même après régénération.
const MANUAL_PLACE_ITEMS = [
  {
    osm: { type: "manual", id: "marseille_2_akanda" },
    name: "Marseille 2",
    names: { fr: "Marseille 2", en: null, local: null },
    tags: {
      name: "Marseille 2",
      place: "suburb",
      "addr:city": "Akanda",
      source: "manual_from_google_maps",
      "source:url":
        "https://www.google.com/maps/place/Akanda,+Gabon/@0.606005,9.28619,14z/data=!4m10!1m2!2m1!1smarseille+2+akanda+gabon!3m6!1s0x107ed7ce5ff2d70b:0x8ba0e9fb0a16620!8m2!3d0.6112932!4d9.3226158!15sChhtYXJzZWlsbGUgMiBha2FuZGEgZ2Fib26SAQhsb2NhbGl0eeABAA!16s%2Fg%2F11bwkbw2bg?entry=ttu&g_ep=EgoyMDI2MDEwNi4wIKXMDSoKLDEwMDc5MjA3M0gBUAM%3D",
      note: "Coordonnées reprises du lien Google Maps fourni; à affiner si besoin avec un point exact Marseille 2.",
    },
    center: { lat: 0.6112932, lon: 9.3226158 },
  },
  {
    osm: { type: "manual", id: "1er_campement_akanda" },
    name: "1er Campement",
    names: { fr: "1er Campement", en: null, local: null },
    tags: {
      name: "1er Campement",
      place: "suburb",
      "addr:city": "Akanda",
      source: "manual_from_overpass",
      "source:osm": "relation/17207110 (also relation/17208241)",
      note: "Basé sur l'objet OSM 'Cité des ailes-1er campement' trouvé via Overpass autour d'Akanda.",
    },
    center: { lat: 0.5032194, lon: 9.3854418 },
  },
];

function injectManualPlaces(placesGrouped) {
  for (const item of MANUAL_PLACE_ITEMS) {
    // Déjà présent ?
    const already =
      (placesGrouped.suburb || []).some((x) => x?.name === item.name) ||
      (placesGrouped.neighbourhood || []).some((x) => x?.name === item.name) ||
      (placesGrouped.quarter || []).some((x) => x?.name === item.name) ||
      (placesGrouped.locality || []).some((x) => x?.name === item.name);

    if (already) continue;

    // Par défaut: on injecte dans suburb (quartier)
    placesGrouped.suburb = placesGrouped.suburb || [];
    placesGrouped.suburb.push(item);
  }
  return placesGrouped;
}

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
    const name = el.tags.name || el.tags["name:fr"] || "";
    const isMarseille2 =
      /^Marseille\s*2$/i.test(String(name)) || /^Marseille\s*II$/i.test(String(name));

    // Cas normal: place=*
    const p = el.tags.place;
    if (p && out[p]) {
      out[p].push(toItem(el));
      continue;
    }

    // Fallback ciblé: Marseille 2 sans place=* => on le force dans suburb pour qu'il apparaisse en "Quartier"
    if (isMarseille2) {
      // Cloner et annoter légèrement (sans casser les tags OSM existants)
      const forced = {
        ...el,
        tags: {
          ...el.tags,
          place: "suburb",
          "ttn:source": "targeted_name_fallback"
        }
      };
      out.suburb.push(toItem(forced));
    }
  }
  return out;
}

const now = new Date().toISOString();

console.log("Fetching admin boundaries...");
const adminJson = await overpass(ADMIN_QUERY);
console.log("Fetching places...");
const placesJson = await overpass(PLACES_QUERY);
console.log("Fetching targeted places (Marseille 2)...");
const targetedJson = await overpass(TARGETED_MARSEILLE2_QUERY).catch((e) => {
  console.warn("Targeted query failed (Marseille 2):", e?.message || e);
  return { elements: [] };
});

// Fusion + déduplication par type/id
const mergedPlacesElements = (() => {
  const all = [...(placesJson.elements || []), ...(targetedJson.elements || [])];
  const seen = new Set();
  const out = [];
  for (const el of all) {
    if (!el) continue;
    const key = `${el.type}/${el.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(el);
  }
  return out;
})();

const data = {
  country: { name: "Gabon", iso2: "GA" },
  generated_at: now,
  source: { provider: "OpenStreetMap", method: "Overpass API", endpoint: OVERPASS_URLS },
  admin_boundaries: groupAdmin(adminJson.elements || []),
  places: injectManualPlaces(groupPlaces(mergedPlacesElements))
};

// Écrire dans le même dossier que ce script (scripts/openstreetmap/)
const OUT_PATH = new URL("./gabon_osm.json", import.meta.url);
await fs.writeFile(OUT_PATH, JSON.stringify(data, null, 2), "utf-8");
console.log("Done ->", OUT_PATH.pathname);
