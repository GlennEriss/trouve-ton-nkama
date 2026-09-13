# Vision produit — recommandation personnalisée

## Problème

Les résultats sont aujourd'hui principalement déterminés par les filtres, la pertinence Algolia,
la récence et les promotions. Deux personnes ayant des préférences différentes peuvent recevoir
le même ordre alors que leur historique montre des intentions différentes.

## Objectif

Augmenter la probabilité qu'un utilisateur trouve une annonce pertinente, sans dégrader les
contraintes explicites de sa recherche, la diversité, la fraîcheur du catalogue ou la visibilité
équitable des nouvelles annonces.

## Acteurs

- visiteur anonyme identifié par une session courte ;
- utilisateur connecté ;
- annonceur, dont les propres consultations doivent être exclues des signaux d'intérêt ;
- équipe produit/data, responsable des poids, modèles et expérimentations ;
- administrateur habilité, lecteur des métriques agrégées et des versions de modèle.

## Résultats attendus

- davantage de consultations utiles, favoris et contacts ;
- moins de résultats manifestement éloignés du budget ou de la zone recherchée ;
- recommandations disponibles même pour un nouvel utilisateur ;
- explication simple : « proche de votre recherche », « similaire à vos favoris » ;
- fallback déterministe si le modèle ou les données sont indisponibles.

## Principes

1. Les filtres explicites gagnent toujours sur le modèle.
2. Un contact WhatsApp/appel est plus important qu'un clic superficiel.
3. Une absence de clic n'est négative que si l'annonce a réellement été visible.
4. Les promotions sont appliquées comme règle métier identifiable, pas apprises comme préférence.
5. Les données personnelles brutes ne sont jamais des caractéristiques du modèle.
6. Toute version est mesurable, réversible et comparée à un groupe témoin.

## Indicateurs

Indicateur principal du MVP : taux de contact par session ayant reçu des recommandations.

Indicateurs secondaires : CTR, favoris par impression, temps jusqu'au premier contact, diversité
des annonces exposées et taux de résultats sans interaction.

Garde-fous : latence P95, taux d'erreur, couverture des nouvelles annonces, concentration des
impressions par annonceur, signalements et sorties rapides.

