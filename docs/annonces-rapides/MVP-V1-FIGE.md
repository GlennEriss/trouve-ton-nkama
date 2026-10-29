# Périmètre v1 — gel partiel

28 octobre 2026. Architecture et périmètre annonces rapides validés ; facturation transversale planifiée au dernier lot.

## IN confirmé

- Avec ou sans compte ; 200 FCFA par nouvelle annonce, montant imposé serveur. Voir [accès anonyme](ACCES-ANONYME.md), qui remplace l'ancienne restriction aux annonceurs authentifiés.
- Étape 1 : un champ texte. Étape 2 : province, ville, quartier, téléphone. Pas de titre/prix/type de bien obligatoire ajouté.
- Paiement via MyPayGa et modales existantes. Confirmation serveur puis modération ; paiement ≠ publication.
- Jamais de photos ; une offre avec photos nécessite une autre annonce classique.
- Avertissements, aperçu accueil après les demandes, catalogue avec filtre Rapides, Voir tout.

## Règles complémentaires validées

- Immobilier uniquement au lancement ; nom de travail « Annonces rapides ».
- Correction après refus et modification après approbation gratuites avec nouvelle modération.
- Aucune expiration automatique, conservation jusqu'à suppression par un administrateur. Visibilité toujours soumise à approbation ; pas de renouvellement payant périodique.
- Demande de remboursement à `glenneriss@gmail.com` avec facture et motif. Aucun remboursement automatique garanti ; critères et exécution à définir au lot 12.
- Factures par e-mail pour tous les paiements MyPayGa confirmés : chantier transversal après toutes les tâches précédentes, pas une fonctionnalité déjà disponible.

## OUT

Photos, conversion vers annonce classique, boost, extraction automatique de prix/catégorie, paiement en crédits, nouveau prestataire, application mobile et Brevo. Pas de migration des annonces existantes.

## Critères de release

Offre impayée/non approuvée inaccessible au public ; compte tiers interdit ; montant client ignoré ; aucun second débit sur double clic ou retry réseau ; callback confirmé jamais rétrogradé ; carte/détail/contact/partage cohérents ; état récupérable après fermeture de modale ; absence de données payeur dans les réponses publiques.

Un scénario dev crée une seule annonce, confirme un paiement de test via un moyen autorisé, modère, vérifie la visibilité puis teste la suppression administrateur et nettoie les seuls documents créés. Aucun faux succès en production, aucun débit réel sans accord. Les preuves financières ne sont pas effacées si un vrai débit a eu lieu.

Toute modification de périmètre doit être consignée ici avant changement du contrat. L'activation attend les arbitrages, les tests et l'autorisation de déploiement.
