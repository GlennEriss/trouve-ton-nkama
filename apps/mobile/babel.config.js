// N'existait pas avant (Metro utilise les défauts internes d'Expo sans ce fichier), mais
// jest-expo en a besoin explicitement pour transformer JSX/TS — Jest ne passe pas par Metro.
// jsxImportSource + nativewind/babel : requis par NativeWind (voir
// [[feedback-mobile-reuse-pwa-design]] — React Native Reusables/NativeWind choisis comme kit
// UI mobile, équivalent le plus proche de shadcn pour RN).
module.exports = function (api) {
  api.cache(true);
  return {
    presets: [['babel-preset-expo', { jsxImportSource: 'nativewind' }], 'nativewind/babel'],
  };
};
