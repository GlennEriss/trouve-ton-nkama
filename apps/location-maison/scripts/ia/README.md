# Dossier IA

Ce dossier contient les scripts d'intelligence artificielle pour transformer les données brutes Facebook (property.json) en objets typés selon les types définis dans scripts/axesso/types/.

## Objectif

Transformer le fichier `property.json` (posts Facebook bruts) en objets structurés compatibles avec les types Property, Studio, Apartment, etc. définis dans `scripts/axesso/types/annonce.d.ts`.

## Structure

- `config/` : Configuration des clés API et paramètres
- `extractors/` : Fonctions d'extraction de données depuis les posts Facebook
- `mappers/` : Mappers IA pour transformer les données extraites en objets typés
- `utils/` : Utilitaires (gestion des clés API, rotation, etc.)

## Workflow

1. **Extraction** : Parser les posts Facebook pour extraire les informations brutes
2. **Analyse IA** : Utiliser l'IA pour structurer et enrichir les données
3. **Mapping** : Transformer en objets typés selon les types définis
4. **Validation** : Vérifier la cohérence des données générées 