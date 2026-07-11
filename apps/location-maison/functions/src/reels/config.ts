export const REELS_RAW_PREFIX = 'reels-raw/';
export const REEL_MAX_DURATION_SECONDS = 300;
// Downscale proportionnel si la vidéo source dépasse cette hauteur (format vertical) — pas
// d'upscale si la source est plus petite.
export const REEL_MAX_HEIGHT_PX = 1920;
export const REEL_VIDEO_BITRATE = '2500k';
export const REEL_THUMBNAIL_TIMESTAMP_SECONDS = 1;

export const TRANSCODE_FUNCTION_OPTIONS = {
  memory: '2GiB',
  timeoutSeconds: 540,
  cpu: 2,
  // Un trigger Storage doit tourner dans la même région que le bucket. Le reste des fonctions
  // de ce repo est implicitement us-central1 (aucun setGlobalOptions), mais le bucket Storage
  // de ce projet est en us-east1 (vérifié via l'API Storage) — région explicite nécessaire ici,
  // spécifique à cette fonction, pas un changement global.
  region: 'us-east1',
} as const;
