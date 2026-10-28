# Lot 8 — formulaire deux étapes

## Livraison locale

Route `/annonces-rapides/publier`, accessible depuis Publier pour un annonceur connecté. Le middleware et la page serveur contrôlent l'accès. Les routes publiques restent publiques.

1. Texte libre (10 à 3 000 caractères).
2. Province, ville, quartier et téléphone : réutilisation des combobox OSM et du composant téléphone existants. Vérification de l'appartenance des sélections à leur parent et normalisation du téléphone gabonais.

Retour entre les étapes sans perte des valeurs. La saisie est conservée uniquement en mémoire, pas après rechargement ou fermeture. Les avertissements restent visibles. Aucun média ni champ métier supplémentaire.

## Limite volontaire avant lot 9

Le bouton final **Vérifier mon annonce** affiche un récapitulatif local, pas une publication. Aucun document Firestore, débit, appel MyPayGa ou e-mail. Le texte indique explicitement cette limite. Le tarif annoncé est 200 FCFA. Ne pas déployer ce parcours comme une publication opérationnelle avant le raccordement du paiement et de la modération.

La validation locale devra être répétée côté serveur dans le lot 9 ; elle ne constitue pas une autorisation de paiement ou publication.

## Fichiers

- `src/components/quick-listings/QuickListingForm.tsx` : étapes, validation, récapitulatif.
- `src/features/quick-listings/draft.ts` : schémas et tarif ; schémas description/contact également réutilisés par le DTO public.
- `src/app/(protected)/annonces-rapides/publier/page.tsx` : garde serveur.
- `src/middleware.ts`, `src/constantes/routes.ts`, `src/components/publish/PublishChoiceClient.tsx` : accès et navigation.

## Vérification

Tests ciblés du formulaire (composants localisation/téléphone simulés), schémas, retours entre étapes, invalidation du récapitulatif, refus d'une ville incohérente, garde middleware et régressions d'affichage public. La manipulation réelle des combobox dans un navigateur reste à vérifier. Aucun test de paiement ni écriture Firebase : aucun nettoyage nécessaire.
