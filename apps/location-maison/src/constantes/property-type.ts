// Transitoire : ré-export depuis @trouve-ton-nkama/core, source unique désormais partagée
// avec apps/location-maison-admin. À terme, les sites d'import de ce fichier seront repointés
// directement vers @trouve-ton-nkama/core/domain et ce fichier supprimé.
export { TypePropertyEnum, TypeProperty, getTypePropertyKey } from "@trouve-ton-nkama/core/domain";
