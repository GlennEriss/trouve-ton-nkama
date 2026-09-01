export const REELS_RAW_PREFIX = 'reels-raw/';
export const REEL_MAX_DURATION_SECONDS = 600;
// Downscale proportionnel si la vidéo source dépasse cette hauteur (format vertical) — pas
// d'upscale si la source est plus petite.
export const REEL_MAX_HEIGHT_PX = 1920;
export const REEL_VIDEO_BITRATE = '2500k';
export const REEL_THUMBNAIL_TIMESTAMP_SECONDS = 1;

// Un trigger Storage doit tourner dans la même région que le bucket, qui diffère par projet
// (vérifié via l'API Storage : us-east1 en prod, europe-west1 en dev) — REEL_STORAGE_REGION
// vient de functions/.env.<project-id>, auto-chargé par firebase-tools au déploiement selon
// le projet ciblé (--project). Fallback us-east1 (prod) si jamais absent.
// Un trigger Storage doit tourner dans la même région que le bucket, qui diffère par projet
// (vérifié via l'API Storage : us-east1 en prod, europe-west1 en dev). Les fichiers
// functions/.env.<project-id> NE conviennent PAS ici : `firebase deploy` ne les injecte que
// dans le conteneur runtime de la fonction déployée, pas dans le process Node local qui
// détermine la config du trigger (region) au moment du déploiement — vérifié empiriquement,
// process.env.REEL_STORAGE_REGION vaut toujours undefined à ce stade. GCLOUD_PROJECT, lui,
// est bien renseigné localement pendant le déploiement (`--project` cible) : on l'utilise.
const REGION_BY_PROJECT: Record<string, string> = {
  'location-maison-prod-167da': 'us-east1',
  'location-maison-dev': 'europe-west1',
};

export const TRANSCODE_FUNCTION_OPTIONS = {
  memory: '2GiB',
  // 540s : plafond MAXIMUM autorisé par ce type de déclencheur (trigger Storage 2e génération)
  // — confirmé au déploiement ("functions have timeouts that exceed the maximum allowed", voir
  // https://firebase.google.com/docs/functions/quotas#time_limits), pas une marge choisie. Ne
  // peut donc pas être relevé en même temps que REEL_MAX_DURATION_SECONDS (300 -> 600s) ;
  // l'encodage h264 (`-preset veryfast`, 2 vCPU) reste largement plus rapide que le temps réel
  // pour une vidéo de 10 min, donc cette limite reste confortable en pratique malgré la durée
  // vidéo doublée.
  timeoutSeconds: 540,
  cpu: 2,
  region: REGION_BY_PROJECT[process.env.GCLOUD_PROJECT ?? ''] ?? 'us-east1',
} as const;
