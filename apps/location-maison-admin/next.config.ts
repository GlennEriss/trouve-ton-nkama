import type { NextConfig } from "next";
import withPWA from "@ducanh2912/next-pwa";

const nextConfig: NextConfig = {
  /* config options here */
};

// Ce tableau de bord ne manipule que des données sensibles (annonces, utilisateurs, finances,
// décisions de modération). Contrairement à l'app publique location-maison, l'objectif ici
// n'est PAS le hors-ligne mais juste l'installabilité ("ajouter à l'écran d'accueil" sur
// mobile). On désactive donc volontairement `extendDefaultRuntimeCaching` et on ne fournit
// aucune stratégie de mise en cache runtime : ni les API, ni les pages/RSC rendues (qui
// embarquent des données sensibles) ne sont mises en cache par le service worker. Seul le
// pré-cache de l'app shell (JS/CSS nécessaires au démarrage) est généré, ce qui suffit pour
// que l'app soit installable.
const withPwaConfig = withPWA({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  extendDefaultRuntimeCaching: false,
  workboxOptions: {
    runtimeCaching: [],
  },
});

export default withPwaConfig(nextConfig);
