module.exports = {
  preset: 'jest-expo',
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@sentry/react-native|native-base|react-native-svg|lucide-react-native)',
  ],
  collectCoverageFrom: ['src/**/*.{ts,tsx}', '!src/**/*.d.ts'],
  // react-native-reanimated (requis par @react-navigation/drawer) essaie de charger son module
  // natif (via react-native-worklets) même en environnement Jest, ce qui plante — mock officiel
  // du package, redirigé pour TOUS les tests plutôt que jest.mock() répété par fichier.
  moduleNameMapper: {
    '^react-native-reanimated$': '<rootDir>/node_modules/react-native-reanimated/mock.js',
    // lucide-react-native publie un build ESM (.mjs) que Jest résout en priorité via sa
    // condition d'export "react-native" — redirigé de force vers le build CJS pour éviter
    // d'avoir à transformer de l'ESM en environnement Jest.
    '^lucide-react-native$': '<rootDir>/node_modules/lucide-react-native/dist/cjs/lucide-react-native.js',
  },
};
