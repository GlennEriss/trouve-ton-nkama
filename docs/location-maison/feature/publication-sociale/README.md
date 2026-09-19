# Publication sociale automatique

Ce dossier centralise la conception des publications automatiques déclenchées après
l'approbation d'une annonce Trouve Ton Nkama.

## Documents

| Document | Contenu | Statut |
|---|---|---|
| [Publication automatique sur Threads](./THREADS-PUBLICATION-AUTOMATIQUE.md) | Vision, périmètre, architecture, données, erreurs, sécurité, tests, déploiement et exploitation | Spécification prête pour implémentation |

## État du produit

- Facebook Page : déjà implémenté dans `apps/location-maison/functions/src/social/`.
- Threads : documenté, pas encore implémenté.
- Facebook Groups : hors périmètre ; Meta ne fournit plus d'API officielle de publication
  automatisée dans les groupes.

## Ordre de lecture

1. Lire le périmètre et les invariants de la spécification Threads.
2. Valider les prérequis Meta et le compte Threads cible.
3. Implémenter les lots dans l'ordre indiqué par la section « Plan d'implémentation ».
4. Ne configurer les secrets de production qu'après validation des tests et du compte de test.

