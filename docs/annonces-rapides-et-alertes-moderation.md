# Annonces rapides et alertes de modération

Document de cadrage — 27 octobre 2026. Aucune implémentation ni modification de production dans ce lot d'analyse.

## 1. Décisions validées

- Module Web ouvert aux annonceurs authentifiés, pas seulement à l'administration.
- Parcours simplifié en deux étapes : texte libre, puis province/ville/quartier/téléphone.
- Aucun champ supplémentaire de prix, surface ou caractéristiques à imposer. L'annonceur peut les préciser dans son texte.
- Publication à 200 FCFA via MyPayGa existant ; confirmation serveur avant entrée en modération.
- Annonce toujours sans photos, y compris en modification. Publier avec photos nécessite une nouvelle annonce classique : pas de conversion automatique.
- Avertissements sur les visites, paiements anticipés, identité et documents avant engagement. Absence de photos explicitement signalée ; aucune garantie de fiabilité des annonces photographiées par comparaison.
- Accueil : Annonces récentes → Demandes de recherche → Annonces rapides, avec Voir tout sur les nouvelles sections.
- Catalogue : filtre rapide après Demandes.
- Navigation connectée : Accueil remplace Annonces ; Mes annonces accessible dans Profil. Autres destinations inchangées.
- E-mail administrateur : expédition et réception actuellement glenneriss@gmail.com. Elles doivent rester configurables indépendamment pour le futur changement de boîte.
- Brevo mobile traité en dernier, après clarification du canal des messages.

## 2. Existant réellement inspecté

Chemins relatifs à la racine du monorepo :

| Élément | Référence | Constat |
| --- | --- | --- |
| Envoi e-mail Web | `apps/location-maison/src/services/email.service.ts` | EmailService, initialisation lazy, Gmail ou Hostinger selon HOSTINGER_EMAIL_USER, résultat simulated/accepted/rejected |
| Notifications de modération | `apps/location-maison/functions/src/notification/index.ts` | onPropertyModerationStatusChange notifie l'annonceur après décision ; ce n'est pas une alerte administrateur de mise en attente |
| File administrateur annonces | `apps/location-maison-admin/src/app/(admin)/dashboard/moderation/page.tsx` | Lecture de `/api/admin/v1/listings/moderation/pending?limit=50` |
| Autres files | Pages `dashboard/reels-moderation` et `dashboard/search-requests-moderation` | Files distinctes : ne pas confondre leur périmètre avec les annonces |
| Paiement demandes | `apps/location-maison/functions/src/payments/search-requests/initiateSearchRequestPayment.ts` et `webhook.ts` | Demande non modérable avant confirmation ; transition vers PENDING après paiement |
| Tarification demandes | `apps/location-maison/functions/src/payments/search-requests/constants.ts` | Base actuelle 500 FCFA, boost 1500 FCFA : ne pas les remplacer par le tarif des annonces rapides |
| UX paiement demandes | `apps/location-maison/src/hooks/use-search-request-payment.ts` | Référence existante pour suivi du paiement ; audit détaillé des modales encore nécessaire |
| Localisation et téléphone | `components/location/LocalLocationPicker.tsx`, `SmartLocationPicker.tsx`, `components/shared/form/PhoneNumberFormAppSimple.tsx` dans l'app Web | Candidats identifiés, interfaces à examiner avant de sélectionner les composants réutilisés |

Attention : les utilitaires SMTP de certaines Cloud Functions sont encore configurés directement pour Hostinger. Ne pas supposer qu'importer leur code reproduit le service Gmail Web. Aucun secret n'a été consulté ni recopié pour cet audit.

## 3. Premier lot de développement : alerte e-mail administrateur

### Comportement proposé

1. Détecter la création d'une annonce en PENDING et la transition d'un autre statut vers PENDING, indépendamment du client Web/mobile/admin.
2. Ne rien envoyer pour un brouillon ou un paiement non confirmé. Une modification sans changement de statut ne doit pas produire un nouvel e-mail.
3. Enregistrer un travail d'envoi avec une clé stable liée à l'événement et à l'annonce ; deux annonces distinctes donnent deux alertes.
4. Réutiliser EmailService dans son environnement serveur existant pour l'expédition, sans endpoint public d'envoi arbitraire. Déterminer après audit du déploiement le raccordement sûr du trigger au worker ; ne pas importer un service Next.js avec alias dans une Function sans adaptation.
5. Afficher titre, catégorie, date de soumission et lien vers la file admin. Texte utilisateur échappé, pas de secrets, pas de lien permettant d'approuver sans authentification.
6. Conserver la notification in-app et la publication même si SMTP échoue. Conserver l'échec et permettre une reprise bornée.

### Fiabilité

- Statuts d'envoi explicites : en attente, traitement avec bail temporaire, envoyé, échec.
- Ne pas marquer envoyé avant l'acceptation SMTP ; un envoi simulé ne valide pas un envoi réel.
- Rejeux et traitements concurrents couverts par une acquisition transactionnelle du travail.
- SMTP ne garantit pas l'exactement-une-fois : un crash après acceptation SMTP mais avant écriture du résultat laisse une ambiguïté. Ne pas promettre zéro doublon absolu ; documenter la politique de reprise.
- Acceptation SMTP et réception effective dans la boîte sont deux vérifications différentes.
- Aucun rattrapage massif d'anciennes annonces sans validation. Proposer un récapitulatif unique du stock existant.
- Rappel périodique des annonces encore en attente : proposition à valider, pas une fréquence décidée implicitement.

### Configuration et validation avant activation

- Réutiliser l'expéditeur et les credentials existants. Ajouter une configuration dédiée au destinataire admin, distincte de l'expéditeur.
- Vérifier le runtime qui détient les credentials et les permissions avant de choisir le raccordement définitif.
- Tests : création PENDING, transition PENDING, modification sans transition, rejet/approbation, paiement non confirmé, rejeu, concurrence, exception SMTP, refus destinataire, simulation dev, échappement HTML.
- Test d'envoi contrôlé en dev, puis vérification de réception. Déploiement et éventuel récapitulatif prod soumis à validation explicite.

## 4. Analyse à approfondir pour les annonces rapides

- Texte libre uniquement à l'étape 1 ; étape 2 avec composants géographiques et téléphone existants. Définir les limites du texte, le brouillon et le retour entre étapes.
- Paiement déclenché après les deux étapes, avec la modale existante : aucun troisième formulaire métier complexe.
- Montant fixé côté serveur à 200 FCFA. Ne pas faire confiance au prix client, à une fermeture de modale ou à un retour navigateur pour déclarer le paiement réussi.
- Réutiliser la vérification MyPayGa, le suivi et l'idempotence ; isoler le tarif de celui des demandes de recherche.
- Aucun prix structuré fourni : un filtre de budget ne peut pas être appliqué fidèlement sans données supplémentaires. Proposition : masquer les filtres incompatibles dans ce mode ; pas d'extraction automatique inventée.
- Choix de stockage et de catégorie non arrêté : comparer les modèles actuels avant de décider entre variante et collection dédiée. Ne pas forcer des attributs fictifs dans un modèle immobilier complexe.
- Annonce publique seulement si paiement confirmé et modération approuvée. Le refus ne doit pas être confondu avec l'échec du paiement.

### Décisions encore attendues

1. Après refus : correction possible sans second paiement ? Politique de remboursement ?
2. Après publication : modification gratuite avec nouvelle modération ?
3. Durée de visibilité et coût d'une republication ?
4. Immobilier uniquement au lancement, et nom définitif « Annonces rapides » ?
5. Alertes immédiates limitées aux annonces ou également aux réels/demandes ? Fréquence éventuelle des rappels ?

## 5. Suivi

Marqueurs : ⬜ à faire · 🟡 en cours · ✅ terminé · ⛔ bloqué.

| État | Lot | Condition de clôture |
| --- | --- | --- |
| 🟡 | 1. Cadrage et audit | Règles consignées ; décisions ci-dessus et raccordement technique encore à finaliser |
| ⬜ | 2. Alertes e-mail de modération — priorité remontée | Tests + réception réelle contrôlée + activation vérifiée |
| ⬜ | 3. Navigation Web connectée | Accueil et accès Mes annonces testés |
| ⬜ | 4. Demandes de recherche sur l'accueil | Aperçu et Voir tout vérifiés |
| ⬜ | 5. Architecture annonces rapides | Modèle, sécurité et paiement documentés et validés |
| ⬜ | 6. Avertissements et affichage | Cartes, détail et partage sans photo trompeuse |
| ⬜ | 7. Catalogue et accueil | Filtres compatibles, Voir tout et visibilité vérifiés |
| ⬜ | 8. Publication en deux étapes | Composants réutilisés et validations testées |
| ⬜ | 9. Paiement MyPayGa 200 FCFA | Confirmation serveur, échecs et doublons testés |
| ⬜ | 10. Validation complète | E2E dev avec nettoyage, non-régression puis déploiement autorisé |
| ⬜ | 11. Brevo mobile | Canal défini, intégration backend auditée, secrets exclusivement serveur |
