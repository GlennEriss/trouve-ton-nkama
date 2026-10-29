# Annonces rapides — dossier développeur

**Décision actuelle : publication ouverte sans compte.** Voir [accès anonyme et impacts paiement](ACCES-ANONYME.md), qui remplace les exigences d'authentification obligatoire de la conception initiale ci-dessous.

28 octobre 2026 — lot 5, conception technique. **Aucun paiement ni endpoint nouveau implémenté dans ce lot.**

1. [Cadrage et suivi global](../annonces-rapides-et-alertes-moderation.md)
2. [Périmètre v1 et décisions ouvertes](MVP-V1-FIGE.md)
3. [Architecture](architecture/README.md)
4. [Lot 6 : affichage, fichiers, tests et limites](LOT-6-AFFICHAGE.md)
5. [Lot 7 : accueil et catalogue](LOT-7-CATALOGUE.md)
6. [Lot 8 : formulaire et limites avant paiement](LOT-8-FORMULAIRE.md)
7. [Lot 9 : paiement, modération, tests et activation](LOT-9-PAIEMENT.md)

La fonctionnalité est distincte des demandes de recherche : offre sans photo rédigée avec ou sans compte, publication à **200 FCFA**, puis modération. Le montant des demandes de recherche reste inchangé.

## Références réellement inspectées

Chemins relatifs à `apps/location-maison/` :

| Existant | Réutilisation / différence |
| --- | --- |
| `src/lib/server/authenticated-uid.ts` | `resolveAuthenticatedUid` accepte session NextAuth ou token Firebase vérifié ; le rôle annonceur doit être contrôlé séparément côté serveur |
| `src/components/my-balance/PaymentStatusModal.tsx` | Modale pending/success/failed, texte personnalisable. Remplacer le message par défaut sur les crédits par « Paiement confirmé, annonce en attente de modération » via la prop `message`, sans modifier le parcours crédits |
| `src/components/shared/form/PhoneNumberFormAppSimple.tsx` | Téléphone avec React Hook Form, `control`, `name`, validation et format pays existants |
| `src/components/location/LocalLocationPicker.tsx` | Réutilise Province/City/QuarterCombobox et FormProvider ; affiche aussi une carte. Préférer ces combobox directement dans le formulaire simple ; examiner leurs noms de champs avant raccordement |
| `src/hooks/use-search-request-payment.ts` | Référence de polling 3 s / 3 min. Ne pas réutiliser le contrat de demande anonyme ni transformer un timeout en autorisation de repayer |
| `src/app/api/search-requests/initiate/route.ts` | Proxy public, donc non réutilisable comme endpoint d'annonce authentifiée |
| `functions/src/payments/search-requests/initiateSearchRequestPayment.ts` | Exemple de requête MyPayGa et normalisation. Ne pas reprendre les budgets, boost, anonymat ou limitation non transactionnelle tels quels |
| `functions/src/payments/mypayga/config.ts` et `callback-shared.ts` | Configuration privée, HMAC SHA-512 et comparaison sûre réutilisables |
| `functions/src/payments/search-requests/webhook.ts` | Transaction d'application du succès ; branche échec hors transaction susceptible de dégrader un succès. Nouveau module : transitions monotones, montant strict, existence revérifiée dans transaction |
| `firestore.rules`, bloc `search_requests` | Lecture seulement sur APPROVED, sans masquage de champs. Ne pas reproduire le stockage des données payeur dans un document public |

## Ordre de livraison

1. Architecture validée : implémenter contrat partagé et tests de transitions, sans activation. Aucune expiration automatique ; suppression administrateur uniquement.
2. Avertissements, cartes et détail textuel ; aucune image de logement fictive.
3. Requêtes publiques paginées, accueil et filtre Rapides après Demandes.
4. Formulaire deux étapes avec composants existants, accès annonceur contrôlé.
5. Initiation MyPayGa, callback, reprise et modération admin ; alerte e-mail au premier passage PENDING.
6. Tests dev, contrôle visuel, paiement contrôlé et nettoyage des seuls objets de test ; déploiement sur instruction explicite.

## Vérification de ce lot

Audit local de code et revue des contrats ; pas de test Jest/E2E ni de transaction réelle nécessaire pour ces documents. Les diagrammes PlantUML sont des sources, pas des rendus visuellement validés. Architecture validée par l'utilisateur le 28 octobre. Factures MyPayGa et procédure de remboursement reportées au lot 12 du suivi global, après toutes les tâches précédentes.
