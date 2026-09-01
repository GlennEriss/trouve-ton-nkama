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
  // Relevé avec REEL_MAX_DURATION_SECONDS (300 -> 600s) : le job (download + probe + transcode
  // + miniature + upload) doit avoir le temps de traiter une vidéo deux fois plus longue, avec
  // de la marge pour le cas où canRemuxToMp4() retombe sur un ré-encodage complet (plus lent
  // qu'une simple copie de flux).
  timeoutSeconds: 900,
  cpu: 2,
  region: REGION_BY_PROJECT[process.env.GCLOUD_PROJECT ?? ''] ?? 'us-east1',
} as const;
