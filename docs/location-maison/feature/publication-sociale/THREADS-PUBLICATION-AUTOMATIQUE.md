# Publication automatique des annonces approuvées sur Threads

**Projet :** Trouve Ton Nkama  
**Date de décision :** 18 septembre 2026  
**Statut :** spécification prête pour implémentation  
**Périmètre MVP :** annonces immobilières et annonces multi-catégories approuvées  
**Hors périmètre :** repost, citation, réponses, multi-comptes, demandes de recherche et
publication dans des groupes Facebook

---

## 1. Objectif produit

Lorsqu'un administrateur approuve une annonce, Trouve Ton Nkama doit publier automatiquement
un post sur le compte Threads officiel de la plateforme. La publication contient :

- le titre de l'annonce ;
- son prix ;
- sa catégorie ;
- sa ou ses villes de disponibilité ;
- la première image exploitable, lorsqu'elle existe ;
- le lien canonique `https://www.tonnkama.com/annonce/{propertyId}`.

Le propriétaire de l'annonce ne réalise aucune action supplémentaire. Une panne de Threads
ne doit jamais annuler, ralentir ou invalider l'approbation dans Trouve Ton Nkama.

### Critères de succès

- une annonce n'est publiée qu'après une transition réelle vers `APPROVED` ;
- une annonce ne produit au maximum qu'un post Threads confirmé ;
- l'échec de Threads ne change pas le statut de modération ;
- le développeur et l'administrateur peuvent connaître l'état exact de la diffusion ;
- une erreur sûre peut être relancée sans intervention technique ;
- une erreur ambiguë ne provoque jamais une republication automatique aveugle ;
- aucun jeton ou secret Meta n'est écrit dans Firestore ou dans les logs.

---

## 2. Capacités de l'API Threads utilisées

L'API officielle utilise `https://graph.threads.net`. La publication d'un contenu avec image
se déroule en deux étapes :

1. création d'un conteneur avec `POST /{threads-user-id}/threads` ;
2. publication du conteneur avec `POST /{threads-user-id}/threads_publish`.

L'image doit être disponible via une URL publique afin que Meta puisse la télécharger. Les
images Firebase Storage déjà enregistrées dans `properties.images[].fileURL` répondent à ce
besoin, sous réserve d'un contrôle HTTP avant activation.

Permissions minimales :

- `threads_basic` ;
- `threads_content_publish`.

Références à revalider au moment de l'implémentation, car Meta fait évoluer ses contrats :

- [Documentation Threads API](https://developers.facebook.com/docs/threads/)
- [Collection officielle Threads API de Meta](https://www.postman.com/meta/threads/documentation/dht3nzz/threads-api)
- [Journal des changements Threads](https://developers.facebook.com/docs/threads/changelog)

Le MVP ne dépend pas de l'endpoint de repost. Il crée un nouveau post appartenant au compte
Threads officiel de Trouve Ton Nkama.

---

## 3. Existant réutilisable

La publication Facebook actuelle fournit déjà plusieurs briques pertinentes :

| Brique existante | Emplacement | Réutilisation Threads |
|---|---|---|
| Détection de transition vers `APPROVED` | `functions/src/social/facebook-page.policy.ts` | Extraire une politique commune indépendante du réseau |
| Construction de l'URL canonique | `buildListingUrl` | Réutilisation directe |
| Construction d'un message | `buildListingPostMessage` | Créer un builder Threads respectant ses contraintes |
| Trigger Firestore | `functions/src/social/index.ts` | Conserver un déclencheur distinct ou créer un orchestrateur commun |
| Secrets Firebase | `runWith({ secrets: [...] })` | Même mécanisme, secrets Threads séparés |
| Marqueur de succès | `properties.facebookPost` | Ajouter `properties.threadsPublication` |
| Lien dans le back-office | gestion des annonces admin | Ajouter statut, lien et action de relance Threads |

La publication Facebook continue de fonctionner indépendamment. L'échec de Facebook ne doit
pas empêcher Threads, et réciproquement.

### Limite de l'implémentation Facebook à ne pas reproduire

Le trigger Facebook appelle Meta puis écrit le marqueur Firestore. Une interruption entre ces
deux opérations peut publier sur Facebook sans enregistrer l'identifiant reçu. Un rejeu peut
alors créer un doublon. Threads adoptera une machine d'état et traitera explicitement cette
fenêtre d'incertitude.

---

## 4. Architecture cible

```text
properties/{propertyId}
  PENDING/REJECTED → APPROVED
             │
             ▼
onListingApprovedEnqueueSocialPublications
             │ transaction Firestore idempotente
             ▼
social_publication_jobs/threads_listing_{propertyId}
             │ status = PENDING
             ▼
Cloud Task / worker Threads
             │
             ├── vérifie l'annonce et réclame le job (lease)
             ├── construit le message
             ├── crée le conteneur Threads
             ├── attend que le média soit prêt
             ├── publie le conteneur
             └── enregistre postId + permalink
                         │
                         ▼
properties/{propertyId}.threadsPublication
```

### Pourquoi une file dédiée

Un appel direct à Threads depuis le trigger de modération paraît plus simple mais mélange trois
responsabilités : validation métier, appel externe lent et reprise après incident. La file
dédiée apporte :

- une approbation non bloquante ;
- une clé d'idempotence déterministe ;
- des tentatives et délais contrôlés ;
- une traçabilité indépendante des logs éphémères ;
- une relance administrateur ;
- la possibilité d'ajouter plus tard Instagram ou un autre canal sans modifier la modération.

### Composants proposés

```text
functions/src/social/
├── listing-social.policy.ts          # transition APPROVED commune
├── listing-social-message.ts         # URL, prix, catégories, zones
├── social-publication-job.repository.ts
├── threads.client.ts                 # HTTP pur vers graph.threads.net
├── threads.policy.ts                 # éligibilité et composition du post
├── threads.worker.ts                 # machine d'état et reprise
└── index.ts                           # exports des triggers/functions
```

Le client HTTP ne connaît ni Firestore ni les règles de modération. Le worker orchestre ; les
policies restent pures et testables sans réseau.

---

## 5. Flux détaillé

### 5.1 Déclenchement

Le trigger réagit uniquement si :

- `after.moderationStatus === "APPROVED"` ;
- `before.moderationStatus !== "APPROVED"` ;
- `after.state !== "ARCHIVED"` ;
- aucun succès Threads n'est déjà enregistré ;
- le document correspond à une annonce publiable.

Il crée dans une transaction le job déterministe :

```text
threads_listing_{propertyId}
```

Si ce document existe déjà, le trigger ne crée rien. Les rejeux Firestore deviennent ainsi
inoffensifs.

### 5.2 Prise en charge du job

Le worker pose une lease atomique :

- `status = PROCESSING` ;
- `lockedAt = serverTimestamp()` ;
- `lockedBy = invocationId` ;
- `attemptCount += 1`.

Un job `PROCESSING` dont la lease n'est pas expirée est ignoré. Une lease expirée peut être
réclamée uniquement si l'étape précédente est connue comme sûre à rejouer.

### 5.3 Construction du contenu

Le builder reçoit le document Firestore courant, pas une copie ancienne stockée dans le job.
Il produit un texte déterministe et borné :

```text
{titre}

{prix} · {catégorie} · {Libreville, Franceville}
{extrait de description si l'espace le permet}

👉 {URL canonique}
```

Règles :

- préserver intégralement l'URL ;
- tronquer d'abord la description, puis les informations secondaires ;
- ne jamais tronquer au milieu d'une paire de substitution Unicode ;
- ne jamais inclure le téléphone dans le texte public ;
- utiliser `zones` via le helper existant, avec repli sur `city` ;
- éviter une accumulation de hashtags ;
- garantir la limite Threads par un test unitaire, sans dépendre de Meta pour la validation.

### 5.4 Choix du média

Ordre de préférence :

1. `images[0].fileURL` ;
2. `images[0].thumbURL` si l'image principale est absente ;
3. publication texte seule si aucune image n'est disponible.

Le MVP publie une seule image. Le carrousel est volontairement différé : il multiplie les
conteneurs enfants, les états intermédiaires et les risques d'échec partiel sans être
nécessaire à la valeur initiale.

### 5.5 Publication

Pour une image :

1. `POST /{userId}/threads` avec `media_type=IMAGE`, `image_url`, `text` ;
2. sauvegarde immédiate de `containerId` dans le job ;
3. interrogation bornée du statut du conteneur si le contrat Meta l'exige ;
4. passage du job à `PUBLISHING` ;
5. `POST /{userId}/threads_publish?creation_id={containerId}` ;
6. sauvegarde immédiate du `postId` ;
7. récupération du permalink, ou construction uniquement si Meta documente sa forme ;
8. finalisation du job et du marqueur sur l'annonce.

Pour un texte seul, suivre le contrat officiel actif au moment du développement. Le client
masque cette différence au worker.

---

## 6. Modèle de données

### 6.1 Marqueur sur l'annonce

```ts
type ThreadsPublication = {
  status: "PENDING" | "PROCESSING" | "PUBLISHING" | "PUBLISHED" | "FAILED" | "UNKNOWN";
  jobId: string;
  containerId?: string;
  postId?: string;
  permalink?: string;
  publishedAt?: Timestamp;
  lastAttemptAt?: Timestamp;
  errorCode?: string;
  errorMessage?: string;
};
```

Le résumé sur `properties` facilite l'affichage dans le back-office. L'historique technique
complet reste dans le job.

### 6.2 Document de job

Collection : `social_publication_jobs`.

```ts
type SocialPublicationJob = {
  id: string;                         // threads_listing_{propertyId}
  platform: "threads";
  resourceType: "listing";
  resourceId: string;
  status: "PENDING" | "PROCESSING" | "PUBLISHING" | "PUBLISHED" | "FAILED" | "UNKNOWN";
  attemptCount: number;
  maxAttempts: number;
  nextAttemptAt?: Timestamp;
  lockedAt?: Timestamp;
  lockedBy?: string;
  containerId?: string;
  externalPostId?: string;
  permalink?: string;
  lastError?: {
    code: string;
    category: "AUTH" | "RATE_LIMIT" | "MEDIA" | "VALIDATION" | "NETWORK" | "META" | "UNKNOWN";
    message: string;                  // assaini, jamais de jeton
    retryable: boolean;
    occurredAt: Timestamp;
  };
  createdAt: Timestamp;
  updatedAt: Timestamp;
  publishedAt?: Timestamp;
};
```

### 6.3 Indexes

Prévoir seulement les requêtes réellement utilisées :

- `platform + status + nextAttemptAt` pour le worker planifié ;
- `resourceType + resourceId + platform` si l'identifiant déterministe n'est pas utilisé.

Avec l'identifiant déterministe recommandé, le second index est inutile.

---

## 7. Idempotence et gestion du doublon

Cloud Functions et Cloud Tasks garantissent une livraison au moins une fois. L'API externe et
Firestore ne partagent aucune transaction distribuée : une garantie mathématique « exactement
une fois » n'est donc pas possible.

Les protections retenues sont :

1. job Firestore déterministe par annonce et plateforme ;
2. création transactionnelle du job ;
3. lease avant traitement ;
4. `containerId` persisté avant la publication ;
5. aucun retry automatique après un résultat de publication ambigu ;
6. succès persisté immédiatement après réception du `postId` ;
7. vérification du marqueur sur l'annonce avant toute relance manuelle.

### Fenêtre ambiguë

Si Threads publie le post mais que la réponse est perdue ou que la fonction s'arrête avant
l'écriture Firestore, le job devient `UNKNOWN`, pas `FAILED`. Il ne doit pas être retenté
automatiquement. L'administrateur vérifie le compte Threads puis choisit :

- « Marquer comme publié » en renseignant le lien ou l'identifiant ;
- « Confirmer l'absence et relancer ».

Cette décision privilégie l'absence de doublon à la publication immédiate.

---

## 8. Gestion des erreurs

| Catégorie | Exemples | Retry automatique | Action |
|---|---|---:|---|
| Configuration | secret absent, user ID absent | Non | Fonction inerte + alerte de configuration |
| Authentification | jeton expiré/révoqué, permission absente | Non | `FAILED/AUTH`, rotation du jeton |
| Validation | texte ou média refusé | Non | `FAILED/VALIDATION`, correction du builder/donnée |
| Média avant publication | URL inaccessible, format refusé, traitement échoué | Oui, borné | Backoff puis texte seul seulement si politique validée |
| Limite Meta | HTTP 429 ou code documenté équivalent | Oui | Respecter `Retry-After`, backoff avec jitter |
| Réseau avant `threads_publish` | DNS, timeout création/statut | Oui, borné | Réessayer l'étape sûre |
| Timeout pendant/après `threads_publish` | résultat inconnu | Non | `UNKNOWN`, réconciliation manuelle |
| Erreur serveur Meta avant publication | 5xx | Oui, borné | Backoff exponentiel |
| Firestore après succès Meta | écriture impossible | Non aveugle | `UNKNOWN`/réconciliation ; alerte critique |

### Politique de retry proposée

- maximum 4 tentatives pour les étapes sûres ;
- backoff : 1 min, 5 min, 30 min, 2 h ;
- prise en compte de `Retry-After` lorsqu'il est fourni ;
- pas de boucle d'attente longue dans une Function ;
- chaque tentative est observable et incrémente `attemptCount` ;
- au-delà du maximum : `FAILED` et action manuelle.

Les délais exacts restent configurables. Aucun retry ne doit contourner une limitation Meta.

---

## 9. Secrets et cycle du jeton

Secrets Firebase/Google Secret Manager proposés :

```text
THREADS_USER_ID
THREADS_ACCESS_TOKEN
THREADS_GRAPH_API_VERSION
NEXT_PUBLIC_APP_URL            # déjà utilisé
```

Règles :

- ne jamais utiliser de variable `NEXT_PUBLIC_*` pour le jeton ;
- ne jamais enregistrer le jeton dans Firestore, Vercel ou le dépôt Git ;
- ne jamais journaliser l'URL complète si elle contient un token en query string ;
- utiliser un jeton longue durée lorsque le contrat Threads le permet ;
- documenter sa date d'émission, son échéance et son propriétaire dans le gestionnaire de
  secrets, sans recopier sa valeur ;
- tester périodiquement sa validité via une opération de lecture peu coûteuse ;
- déclencher une alerte avant expiration ;
- prévoir une rotation sans modification du code.

Le client reçoit le jeton dans l'en-tête ou le mécanisme recommandé par la version officielle
de l'API au moment de l'implémentation.

---

## 10. Back-office administrateur

La liste et le détail d'une annonce doivent afficher :

- `Non configuré` ;
- `En attente` ;
- `Publication en cours` ;
- `Publié` avec lien vers Threads ;
- `Échec` avec une erreur compréhensible ;
- `À vérifier` pour `UNKNOWN`.

Actions :

- ouvrir le post Threads ;
- relancer une erreur explicitement réessayable ;
- confirmer l'absence puis relancer un état `UNKNOWN` ;
- marquer manuellement un état `UNKNOWN` comme publié ;
- copier le lien du post.

La relance doit passer par une route serveur authentifiée et autorisée. Elle ne doit jamais
accepter un jeton Threads envoyé par le navigateur. Recommandation : permission RBAC dédiée
`social.publications.retry`, plutôt que de l'inférer d'une permission générique de lecture.

---

## 11. Observabilité

### Logs structurés

Chaque log contient au minimum :

- `platform: "threads"` ;
- `jobId` ;
- `propertyId` ;
- `attemptCount` ;
- `stage` (`ENQUEUE`, `CREATE_CONTAINER`, `WAIT_MEDIA`, `PUBLISH`, `PERSIST`) ;
- `status` ;
- `errorCode` si échec.

Ne jamais journaliser le token, les en-têtes d'authentification ou l'URL d'appel complète.

### Métriques

- jobs créés ;
- publications réussies ;
- publications échouées par catégorie ;
- états `UNKNOWN` ;
- délai approbation → publication ;
- nombre de retries ;
- âge du plus vieux job `PENDING`.

### Alertes minimales

- au moins un `AUTH` en production ;
- au moins un état `UNKNOWN` ;
- taux d'échec supérieur à 10 % sur 30 minutes avec un minimum de volume ;
- job `PENDING/PROCESSING` plus vieux que 30 minutes ;
- aucun succès pendant 24 h alors que des annonces ont été approuvées.

---

## 12. Stratégie de tests

### Tests unitaires — policies et messages

- refuse `PENDING → PENDING` ;
- refuse `APPROVED → APPROVED` ;
- accepte `PENDING/REJECTED → APPROVED` ;
- refuse une annonce archivée ;
- refuse une annonce ayant déjà un `threadsPublication.postId` ;
- formate prix, catégorie et zones multiples ;
- replie correctement `zones` vers `city` ;
- respecte la limite du texte ;
- conserve toujours l'URL canonique ;
- n'inclut aucun numéro de téléphone.

### Tests unitaires — client Threads

- création texte ;
- création image ;
- succès `threads_publish` ;
- réponse 2xx sans identifiant ;
- erreur Meta structurée ;
- 401/403 classé `AUTH` ;
- 429 classé `RATE_LIMIT` avec `Retry-After` ;
- timeout avant publication classé réessayable ;
- timeout de publication classé ambigu ;
- assainissement des logs et messages d'erreur.

### Tests worker/repository

- deux événements concurrents ne créent qu'un job ;
- une seule invocation acquiert la lease ;
- une lease active bloque un second worker ;
- une lease expirée est reprise uniquement à une étape sûre ;
- `containerId` est persisté avant `threads_publish` ;
- `postId` finalise job et annonce ;
- une panne Firestore après publication conduit à `UNKNOWN` ;
- un retry ne republie jamais un job `PUBLISHED` ou `UNKNOWN`.

### Tests émulateur

- transition Firestore réelle et création du job déterministe ;
- absence de job pour une modification ordinaire ;
- absence de couplage avec le trigger Facebook ;
- mise à jour correcte de `properties.threadsPublication`.

### Smoke test préproduction

Utiliser un compte Threads de test et une seule annonce dédiée :

1. créer l'annonce ;
2. l'approuver ;
3. vérifier le post et son image ;
4. vérifier le lien vers l'annonce ;
5. déclencher un rejeu contrôlé et confirmer l'absence de doublon ;
6. supprimer l'annonce et le post de test ;
7. vérifier le nettoyage des jobs de test.

Comme pour les E2E annonces, un test crée une seule ressource, réutilise cette ressource puis la
supprime. Aucun test de charge ne doit publier de vrais contenus sur le compte officiel.

---

## 13. Déploiement progressif

### Phase 0 — compte et accès

- créer/configurer l'application Meta avec le cas d'usage Threads ;
- autoriser le compte Threads officiel ;
- obtenir les permissions nécessaires ;
- générer et stocker les secrets ;
- vérifier que la première image d'une annonce est téléchargeable par Meta.

### Phase 1 — code inerte

- déployer repository, policies, client et tests ;
- laisser la fonctionnalité inactive si les secrets sont absents ;
- vérifier qu'aucune approbation existante n'est affectée.

### Phase 2 — compte de test

- activer les secrets sur un projet non production ;
- exécuter le smoke test avec une annonce unique ;
- tester succès, token invalide et timeout simulé.

### Phase 3 — production contrôlée

- activer la fonctionnalité sur les nouvelles transitions `APPROVED` uniquement ;
- ne pas republier automatiquement les annonces déjà approuvées ;
- surveiller les 10 premières publications ;
- vérifier chaque image, texte, lien et absence de doublon.

### Phase 4 — exploitation

- activer l'écran admin et la relance manuelle ;
- configurer alertes et tableau de bord ;
- écrire le runbook de rotation du jeton ;
- décider séparément si un backfill éditorial limité est pertinent.

---

## 14. Plan d'implémentation

### Lot 1 — domaine pur

- extraire la politique commune de transition d'approbation ;
- créer `threads.policy.ts` et le builder du texte ;
- ajouter les tests unitaires.

### Lot 2 — client Threads

- résolution de configuration ;
- création de conteneur ;
- interrogation du statut média ;
- publication ;
- classification des erreurs ;
- tests réseau mockés.

### Lot 3 — file et worker

- collection `social_publication_jobs` ;
- enqueue transactionnel ;
- lease ;
- retries bornés ;
- états `FAILED` et `UNKNOWN` ;
- tests de concurrence/idempotence.

### Lot 4 — back-office

- exposition du statut dans le repository admin ;
- badge et lien Threads ;
- route de relance protégée ;
- résolution manuelle d'un état ambigu ;
- tests RBAC et UI.

### Lot 5 — configuration et déploiement

- application Meta et OAuth ;
- secrets par environnement ;
- smoke test ;
- activation progressive ;
- alertes et runbook.

---

## 15. Décisions figées pour le MVP

| Sujet | Décision |
|---|---|
| Événement | Transition vers `APPROVED` uniquement |
| Contenu | Nouveau post Threads, pas un repost |
| Compte | Compte officiel Trouve Ton Nkama uniquement |
| Catégories | Immobilier et toutes les catégories marketplace |
| Média | Première image ; texte seul en absence d'image |
| Carrousel | Différé |
| Demandes de recherche | Hors périmètre |
| Backfill des anciennes annonces | Désactivé par défaut |
| Échec Threads | Ne bloque jamais la modération |
| Résultat ambigu | Pas de retry automatique |
| Publication Facebook | Indépendante et inchangée |

---

## 16. Checklist avant de commencer le code

- [ ] Le compte Threads officiel est identifié.
- [ ] L'application Meta possède le cas d'usage Threads.
- [ ] Les permissions `threads_basic` et `threads_content_publish` sont disponibles.
- [ ] Le cycle d'expiration/rotation du jeton est compris et attribué à un responsable.
- [ ] Les URLs Firebase Storage sont accessibles à Meta sans session.
- [ ] Le modèle `social_publication_jobs` est validé.
- [ ] La politique `UNKNOWN` et sa résolution admin sont acceptées.
- [ ] Le texte final du post est validé par le produit.
- [ ] Le compte Threads de test est disponible.
- [ ] Les alertes et le runbook de rotation sont prévus avant l'activation production.

Lorsque ces points sont cochés, l'implémentation peut commencer par le Lot 1 sans dépendre des
secrets de production.

