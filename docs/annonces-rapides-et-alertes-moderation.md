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
- Brevo mobile traité après les annonces rapides ; le nouveau lot facturation MyPayGa vient ensuite, en dernier.
- Immobilier au lancement ; corrections et modifications gratuites avec nouvelle modération, selon validation utilisateur.
- Aucune expiration automatique : conservation jusqu'à suppression par un administrateur. La visibilité reste soumise au paiement confirmé et à l'approbation.
- Demande de remboursement à `glenneriss@gmail.com`, avec facture prouvant le paiement et motif. Adresse configurable ; pas de remboursement automatique garanti.

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

1. Critères, délai et exécution des remboursements : à définir au lot 12 ; canal e-mail, facture et motif validés.
2. Nom de travail « Annonces rapides ». Immobilier, corrections/modifications gratuites avec remodération et absence d'expiration validés.
3. Alertes immédiates limitées aux annonces ou également aux réels/demandes ? Fréquence éventuelle des rappels ?

## 5. Suivi

Marqueurs : ⬜ à faire · 🟡 en cours · ✅ terminé · ⛔ bloqué.

| État | Lot | Condition de clôture |
| --- | --- | --- |
| 🟡 | 1. Cadrage et audit | Règles consignées ; décisions ci-dessus et raccordement technique encore à finaliser |
| 🟡 | 2. Alertes e-mail de modération — priorité remontée | Implémentation locale et tests ; réception réelle et activation non effectuées |
| ✅ | 3. Navigation Web connectée | Implémentation locale : Accueil et accès Mes annonces testés ; non déployée |
| ✅ | 4. Demandes de recherche sur l'accueil | Implémentation locale et tests validés ; vérification visuelle et déploiement restants |
| ✅ | 5. Architecture annonces rapides | Architecture validée ; absence d'expiration et procédure de demande de remboursement consignées ; facturation reportée au lot 12 |
| 🟡 | 6. Avertissements et affichage | Composants, détail serveur et métadonnées textuelles implémentés/testés ; validation visuelle et partage réel restants |
| ⬜ | 7. Catalogue et accueil | Filtres compatibles, Voir tout et visibilité vérifiés |
| ⬜ | 8. Publication en deux étapes | Composants réutilisés et validations testées |
| ⬜ | 9. Paiement MyPayGa 200 FCFA | Confirmation serveur, échecs et doublons testés |
| ⬜ | 10. Validation complète | E2E dev avec nettoyage, non-régression puis déploiement autorisé |
| ⬜ | 11. Brevo mobile | Canal défini, intégration backend auditée, secrets exclusivement serveur |
| ⬜ | 12. Factures MyPayGa et remboursements | Dernier lot : couverture des paiements confirmés, facture/e-mail idempotents et traitement contrôlé des demandes |

## 6. Implémentation locale de l'alerte administrateur

Le raccordement retenu évite un nouvel endpoint Web : transport Nodemailer extrait de
la Cloud Function de vérification vers `functions/src/email/transport.ts`, réutilisé par
celle-ci et par `onListingPendingNotifyAdmin`. Sélection Gmail/Hostinger identique au
service Web ; délais SMTP bornés. Aucun changement du parcours de vérification utilisateur.

Le trigger couvre uniquement `properties` (immobilier et mode), créations et entrées en
PENDING. Pas d'alerte pour les archives, suppression, paiements en attente ou modifications
ordinaires. Le texte est échappé et le lien mène à la file authentifiée, sans action d'approbation.

Les suivis sont stockés dans `admin_moderation_email_dispatches`, accès Admin SDK uniquement
(aucune règle client ajoutée). Clé SHA-256 de l'événement, acquisition transactionnelle avec
bail 120 secondes, cinq tentatives maximum. Les retries sont ceux de Cloud Functions.
Après cinq échecs : statut `failed`, reprise opérationnelle manuelle à prévoir après diagnostic.
Un résultat SMTP accepté est enregistré `sent`, sans prétendre prouver la réception dans la boîte.
Un crash après l'acceptation SMTP peut toujours causer un doublon ; le Message-ID stable aide
au diagnostic mais ne constitue pas une garantie de déduplication SMTP.

Configuration à appliquer uniquement lors du déploiement autorisé :

- `ADMIN_MODERATION_EMAIL_ENABLED=true` (inactif par défaut).
- `ADMIN_MODERATION_EMAIL_TO=glenneriss@gmail.com`.
- `ADMIN_MODERATION_APP_URL` : origine HTTPS réelle du dashboard admin, à confirmer avant activation.
- Secrets existants : `HOSTINGER_EMAIL_USER`, `HOSTINGER_EMAIL_PASS`, `EMAIL_DISPLAY_NAME`.
  L'expéditeur attendu actuellement est glenneriss@gmail.com ; aucun secret n'est modifié ici.
- Dans l'émulateur, pas d'envoi sauf activation explicite `FORCE_REAL_EMAILS=true`.

Pas de rattrapage des annonces anciennes, pas de rappel périodique, pas d'extension aux réels
ou demandes dans ce lot. Ces points nécessitent des décisions séparées.

Tests ciblés : politiques, échappement, choix SMTP, rejeu, bail actif/expiré, échec et reprise,
destinataire refusé, maximum de tentatives, annonce déjà traitée, activation et configuration.
Mocks uniquement : pas de test SMTP réel ou de test de concurrence avec Firestore Emulator.
La tâche ne sera marquée terminée qu'après test de réception et activation validés.

### Déploiement du 27 octobre 2026

`onListingPendingNotifyAdmin` déployée en génération 1, Node 22, us-central1 :

- `location-maison-dev` : ACTIVE, version 2.
- `location-maison-prod-167da` : ACTIVE, version 2.
- Destinataire : `glenneriss@gmail.com`.
- URL admin confirmée par l'utilisateur : `https://location-maison-admin.vercel.app` (commune aux deux environnements).
- **Envoi désactivé** (`ADMIN_MODERATION_EMAIL_ENABLED=false`) dans les deux environnements.

Blocage activation : les secrets SMTP Firebase existants désignent `contact@tonnkama.com`,
et non Gmail. Versions liées : dev user/pass 2, display name 3 ; prod user/pass/display name 1.
Aucun secret modifié. Configuration Gmail demandée à l'utilisateur, sans demander de mot de passe dans le chat.
Aucun e-mail réel envoyé ni annonce de production modifiée.

Déploiement ciblé gcloud depuis un répertoire temporaire contenant uniquement source compilée,
sources TypeScript, manifests npm et tsconfig, sans `.env`. Le champ `main` du manifest de
déploiement pointe vers `lib/email/moderation-alert.js` : cela évite de charger les autres
triggers (le chargement global échouait sur le bucket requis par le module vidéo).
Le manifest du repository n'a pas été modifié. Aucun autre service déployé.

## 7. Navigation Web — lot réalisé

- `BottomNavigation.tsx` : Accueil (icône Home, lien `/`) remplace Annonces pour le rôle Announcer.
  Bouton Publier, Recherche, Réels, Profil, safe areas et styles conservés.
- `ProfilDetails.tsx` : entrée Mes annonces vers `/property`, pour les annonceurs,
  dans les variantes mobile et desktop. Droits et parcours Devenir annonceur inchangés.
- Les menus des visiteurs et comptes non annonceurs restent inchangés.
- `aria-current` expose l'état actif sans changer le style (contrôle d'accessibilité issu du skill UI/UX).
- Deux suites Jest ciblées : 17 tests réussis ; TypeScript et `git diff --check` réussis.
  La première invocation ciblée avec couverture globale activée échouait au seuil global
  malgré les 17 tests verts ; relance ciblée avec `--coverage=false`, sans changement des seuils du projet.
- Pas de vérification visuelle navigateur/E2E, ni déploiement, commit ou push dans ce lot.
- Suite réalisée : aperçu des demandes de recherche sur l'accueil et bouton Voir tout (lot 4 ci-dessous).

## Lot 4 — Demandes de recherche sur l'accueil

- Composant partagé `HomeSearchRequestsSection.tsx`, inséré après `RecentSection` dans les variantes Web mobile et desktop, avant les catégories.
- Réutilisation de `SearchRequestCard` sans changer ses contacts ni son rendu métier.
- Réutilisation de `getSearchRequests({ limitPerPage: 4, lastDoc: null })` : demandes actives (`IN_PROGRESS`) et approuvées (`APPROVED`), les plus récentes d'abord. Aucun chargement intégral ni filtrage client. Le service existant effectue une lecture supplémentaire bornée à un document lorsque la page est pleine pour calculer son curseur.
- Cache React Query de 60 secondes, une reprise automatique, lien Voir tout vers `/demandes-recherche`, états chargement/vide/erreur avec reprise manuelle.
- Grille responsive : une colonne sur téléphone, deux dès `md`, quatre dès `xl`. Guide UI/UX appliqué pour les contrôles accessibles et les états explicites ; styles et cartes existants préservés.
- Validation : 6 suites ciblées, 50 tests réussis ; TypeScript sans erreur. Les tests d'assemblage vérifient l'ordre des sections sur les deux variantes.
- Pas de validation visuelle navigateur ni de test Firebase réel dans ce lot. Aucun commit, push ou déploiement effectué.
- Prochain lot : architecture détaillée des annonces rapides et réutilisation du paiement MyPayGa à 200 FCFA avant développement du formulaire.

## Lot 5 — Architecture (28 octobre 2026)

[Dossier développeur et index](annonces-rapides/README.md) : audit des composants réutilisables, modèle public/privé, contrats API, sécurité, transitions de paiement, index, plan de tests et quatre diagrammes PlantUML.

Collection dédiée proposée, aucun champ immobilier fictif. Paiement 200 FCFA imposé serveur ; identité serveur et droit annonceur ; données payeur privées ; callbacks monotones et idempotents. Pas de copie du parcours anonyme des demandes de recherche. Aucun endpoint ni paiement activé dans ce lot.

Architecture validée le 28 octobre. Les précisions utilisateur suivantes sont intégrées : aucune expiration automatique ; remboursement demandé par e-mail avec facture et motif ; réalisation de la facturation transversale en dernier.

## Lot 12 — Factures MyPayGa et remboursement (à réaliser en dernier)

- Inventorier tous les usages MyPayGa, notamment recharges, cadeaux, demandes de recherche et annonces rapides ; couvrir chaque paiement réel confirmé, pas seulement le nouveau module.
- Générer une facture unique après confirmation serveur, puis l'envoyer par e-mail. Aucun justificatif de paiement pour une simple initiation, un timeout ou un refus.
- Associer durablement facture et transaction ; callbacks rejoués ou concurrents et reprises SMTP ne créent pas de nouvelle facture. Une réémission conserve sa référence.
- Réutiliser le transport e-mail existant après vérification de sa disponibilité. Échec d'envoi : conserver le paiement, tracer l'état et permettre une reprise bornée, jamais un nouveau débit.
- Contenu proposé : numéro unique, date, référence transaction, service, montant/devise et identités disponibles. Mentions comptables/fiscales et éventuel avoir à valider avant réalisation ; aucune taxe ou identité légale inventée.
- Auditer la collecte d'un e-mail de facturation pour les visiteurs anonymes et comptes téléphone sans e-mail. Ne pas utiliser d'adresse technique fictive. Ne pas ajouter ce champ au formulaire rapide maintenant : ce chantier est différé explicitement.
- Factures privées, conservation financière définie séparément de la durée des annonces ; aucun secret fournisseur dans les documents ou logs.

### Procédure demandée

Écrire à **glenneriss@gmail.com** en joignant la facture prouvant le paiement et le motif de remboursement. Cette adresse doit être configurable pour le futur changement de boîte. Prévoir cette instruction dans la facture et l'e-mail.

Rapprocher la facture de la transaction confirmée côté serveur avant toute décision : une pièce jointe seule ne suffit pas. Prévenir les remboursements multiples et conserver une trace des décisions/exécutions. Pas de remboursement automatique après rejet d'annonce ou réception d'un e-mail.

Critères d'acceptation, délais, remboursement partiel éventuel et mécanisme effectif de remboursement restent à définir. La procédure ne promet pas une acceptation systématique.

### Validation attendue

Succès unique/rejoué/concurrent, échec/timeout, e-mail absent/invalide, panne/reprise SMTP, accès non autorisé à une facture, réémission, rapprochement facture/transaction, demande répétée de remboursement. Aucun envoi massif rétroactif ou remboursement réel sans instruction explicite.

Lot 4 : rendu localhost validé visuellement par l'utilisateur (« c'est parfait »), sans déploiement.
