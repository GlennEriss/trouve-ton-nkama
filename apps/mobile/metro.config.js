// Config Metro pour un monorepo npm workspaces (voir guide officiel Expo) : sans ça, Metro ne
// regarde que node_modules de apps/mobile et ne voit jamais les paquets hissés à la racine du
// monorepo (react, la plupart des dépendances partagées).
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// Surveille aussi les fichiers du reste du monorepo (utile si on importe un jour du code
// de packages/core) ET permet à Metro de voir les paquets hissés à la racine.
config.watchFolders = [workspaceRoot];

// PAS de resolver.nodeModulesPaths explicite ici (contrairement à une version antérieure de ce
// fichier) : le fournir désactive la recherche normale de Metro dans les node_modules imbriqués
// d'un paquet tiers (ex. react-native/node_modules/invariant,
// @tanstack/react-query/node_modules/@tanstack/query-core) — Metro se limitait alors strictement
// aux 2 chemins listés et échouait sur "Unable to resolve X ... in these directories: node_modules,
// ../../node_modules". watchFolders seul suffit : Metro (RN 0.86/Expo SDK 57) résout déjà
// nativement les workspaces npm en remontant l'arborescence depuis chaque fichier importeur.

module.exports = withNativeWind(config, { input: './global.css' });
