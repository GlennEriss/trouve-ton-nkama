/// <reference types="nativewind/types" />

// nativewind/types ne déclare que les props `className` (via react-native-css-interop/types),
// pas le module `*.css` lui-même : sans ceci, l'import `./global.css` dans App.tsx (requis par
// NativeWind pour charger les directives @tailwind) casse `tsc --noEmit` avec TS2882.
declare module '*.css';
