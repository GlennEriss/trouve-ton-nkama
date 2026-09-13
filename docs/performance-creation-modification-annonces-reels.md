# Performance de création et de modification des annonces et des réels

## État d'avancement — ✅ implémenté (2026-09-13)

Les 8 points ont été implémentés et vérifiés (`tsc --noEmit` propre, suite Jest complète
verte — 250/251 suites, 1758/1764 tests ; le seul point non concerné, `ads-config.test.ts`,
appartient à un autre chantier en cours en parallèle).

| Point | Fichiers principaux | Note |
|---|---|---|
| 1 — Géographie hors chemin critique | `functions/src/location/*`, `useOnSubmitFormProperty.ts` | Trigger `.onWrite` (v1) sur `properties/{id}`, logique extraite dans `handleLocationSyncEvent` (v1 CloudFunction non appelable directement en test). Coordonnées techniques désormais **conservées** dans le document (inversion assumée). Cloud Function écrite, **pas déployée**. |
| 2 — Suggestions non bloquantes | `property.form.provider.tsx` | `updateOrCreateSuggestion` retiré (suppression, pas fire-and-forget). |
| 3 — Pipeline vignette parallèle | `file.db.ts` | Upload principal + compression/upload vignette démarrés en parallèle. |
| 4 — Concurrence contrôlée | `src/lib/async/map-with-concurrency.ts`, `uploadPropertyImages()` | Concurrence 3, câblé dans le hook immobilier + les 2 pages IA. |
| 5 — Parcours IA | `property/create/page.tsx`, `category-listing/create/page.tsx` | Garde-fou "état de requête catégories inconnu" (bug réel trouvé en e2e), progression par phases (photos/génération/validation/enregistrement). |
| 6 — Upload Reel reprenable | `reel.db.ts` (`uploadRawReelVideo`), `CreateOrphanReelClient.tsx`, `EditReelClient.tsx` | `uploadBytesResumable` + progression 0-100 + annulation (signal/timeout), barre `role="progressbar"` accessible dans les deux écrans. |
| 7 — Invalidations Reel non bloquantes | `EditReelClient.tsx` | `setQueryData` immédiat + invalidations en arrière-plan (`void ... .catch(logger.warn)`). |
| 8 — Instrumentation | `src/lib/observability/submission-performance.ts` | Module testé (11 tests), câblé dans `property.form.provider.tsx` et les 2 pages IA (phases `image_upload`/`ai`/`property_write`). Pas encore câblé dans les Reels. |

**Non fait, hors code applicatif** : déploiement de la Cloud Function `onPropertyLocationSync`
(`firebase deploy --only functions`) ; câblage de l'instrumentation dans les parcours Reel ;
mesure réelle en développement pour établir une baseline avant/après (le doc le demande
explicitement — c'est la suite naturelle une fois déployé). Rien n'est commité.

## Objet du document

Ce document prépare l'analyse puis l'optimisation des parcours suivants dans l'application
`apps/location-maison` :

- création et modification d'une annonce immobilière ;
- création et modification d'une annonce de catégorie, notamment Mode ;
- création et modification d'un réel, avec ou sans annonce rattachée.

Le premier audit montre que les lenteurs viennent surtout d'opérations asynchrones placées sur
le chemin critique : compression, transferts Firebase Storage, appels IA, lectures et écritures
Firestore, invalidations de cache et redirections. Il ne met pas en évidence une fonction
JavaScript synchrone unique qui bloquerait à elle seule l'application.

`Promise.all` est déjà utilisé pour envoyer plusieurs images. Il reste utile à certains
endroits, mais il ne doit pas être appliqué mécaniquement : certaines opérations ont une
dépendance fonctionnelle, tandis qu'un parallélisme illimité peut dégrader les performances sur
une connexion mobile.

## Méthode d'analyse commune aux huit points

Avant chaque modification, il faudra relever au minimum :

- le temps total entre le clic sur « Publier/Enregistrer » et la confirmation ;
- le temps de chaque phase réseau ou CPU ;
- le nombre et la taille des images ou de la vidéo ;
- le type de connexion lorsque l'information est disponible ;
- le résultat de chaque phase : succès, erreur, abandon ou timeout ;
- le comportement sur ordinateur et sur téléphone milieu de gamme.

Les optimisations devront préserver quatre garanties : aucune annonce partiellement publiée,
aucun crédit IA débité à cause d'un upload déjà en échec, aucune perte silencieuse d'image et
aucun réel traité avant que ses métadonnées indispensables existent.

## Vue d'ensemble des priorités

| Point | Sujet | Gain attendu | Risque | Priorité proposée |
|---|---|---:|---:|---:|
| 1 | Entités géographiques hors chemin critique | Élevé, immobilier | Moyen | P0 |
| 2 | Suggestions géographiques non bloquantes | Moyen à élevé | Faible | P0 |
| 3 | Vignette et image principale mieux parallélisées | Élevé, toutes annonces | Moyen | P0 |
| 4 | Concurrence contrôlée des uploads | Élevé sur mobile | Moyen | P0 |
| 5 | Préparation anticipée des parcours IA | Moyen | Moyen | P1 |
| 6 | Upload Reel reprenable avec progression | Fort gain UX | Moyen à élevé | P1 |
| 7 | Invalidations de cache non bloquantes | Faible à moyen | Faible | P0 |
| 8 | Instrumentation par phase | Indirect mais indispensable | Faible | À faire en premier |

## 1. Sortir les entités géographiques du chemin critique

### Constat

Le formulaire immobilier appelle `createLocationEntities` avant de retourner la propriété à
enregistrer. Cette fonction traite successivement la province, la ville puis la rue.

Chaque niveau commence par une recherche Firestore et peut ensuite effectuer une écriture. Le
chemin défavorable représente donc jusqu'à six opérations réseau successives :

```text
chercher province -> créer province
                  -> chercher ville -> créer ville
                                    -> chercher rue -> créer rue
                                                      -> enregistrer annonce
```

Fichiers concernés :

- `apps/location-maison/src/hooks/useOnSubmitFormProperty.ts` ;
- `apps/location-maison/src/db/province.db.ts` ;
- `apps/location-maison/src/db/city.db.ts` ;
- `apps/location-maison/src/db/street.db.ts`.

### Pourquoi un simple `Promise.all` ne suffit pas

La ville utilise l'identifiant de la province et la rue utilise ceux de la ville et de la
province. Ces dépendances empêchent de paralléliser naïvement les trois niveaux sans modifier le
modèle ou la méthode de génération des identifiants.

### Proposition à analyser

Enregistrer d'abord l'annonce, puis mettre à jour les collections de suggestions géographiques
en tâche secondaire. Ces collections ne semblent pas nécessaires à l'intégrité du document
`properties` : l'annonce contient déjà ses données de localisation.

Deux options devront être comparées :

1. lancer la synchronisation en `best effort` côté client après la création ;
2. déclencher une synchronisation côté serveur ou par événement Firestore après l'écriture de
   l'annonce.

La seconde option est plus fiable en cas de fermeture immédiate de la page. La première est plus
simple, mais ne garantit pas l'exécution complète.

### Risques et questions

- Vérifier si une autre fonctionnalité attend immédiatement les documents province/ville/rue.
- Vérifier les doublons et les courses lorsque plusieurs annonces créent la même localisation.
- Définir si un échec de synchronisation doit être rejoué.
- Ne pas bloquer la publication si cette donnée secondaire échoue.

### Critère de validation

La confirmation de création ou modification ne doit plus attendre les recherches et écritures
des trois collections géographiques. L'annonce doit néanmoins conserver toutes ses informations
de localisation.

### Analyse détaillée du point 1

#### Conclusion technique

La synchronisation province/ville/rue peut être retirée de
`useOnSubmitFormProperty.onSubmit` sans modifier la forme du document `properties` retourné par
le hook. Les identifiants créés par cette synchronisation ne sont jamais recopiés dans
l'annonce : ils servent uniquement à construire la hiérarchie des collections secondaires
`provinces`, `cities` et `streets`.

Ces collections sont ensuite consommées par les API de sélection géographique :

- `/api/location/provinces` lit toutes les provinces ;
- `/api/location/cities?provinceId=...` filtre les villes par `provinceId` ;
- `/api/location/streets?cityId=...` filtre les rues par `cityId`.

La dépendance parent-enfant est donc réelle dans les collections géographiques, mais elle ne
fait pas partie de l'intégrité de l'annonce elle-même. L'ordre province, puis ville, puis rue
doit être conservé dans le traitement secondaire. Il n'est pas nécessaire de chercher à le
remplacer par `Promise.all` une fois qu'il ne bloque plus la publication.

#### Solution retenue pour l'implémentation

Ajouter une Cloud Function Firestore dédiée à la synchronisation de localisation :

```text
écriture properties/{propertyId}
             |
             +-> réponse immédiate au parcours de publication
             |
             +-> trigger localisation
                    -> créer/réutiliser province
                    -> créer/réutiliser ville avec provinceId
                    -> créer/réutiliser rue avec cityId et provinceId
```

Le trigger doit écouter les créations et les modifications avec `onWrite`, et non uniquement
les créations : une annonce immobilière peut changer de ville, de province ou de rue pendant
son édition. Il doit ignorer les suppressions.

Cette solution est préférée à un appel client lancé avec `void` après `createProperty` : la
navigation peut fermer ou suspendre la page avant la fin des écritures. Elle est également
préférée à une promesse serveur non attendue dans une route Next.js, car une instance serverless
peut être arrêtée dès que la réponse HTTP est envoyée.

#### Portée exacte du trigger

Le trigger ne doit synchroniser que la hiérarchie historique à champs scalaires :

- `province` non vide ;
- `city` non vide ;
- `street` non vide pour créer une rue ;
- `country`, avec `Gabon` comme valeur de compatibilité uniquement si le document historique ne
  la contient pas ;
- `countryCode`, avec `GA` comme valeur de compatibilité uniquement si elle manque ;
- coordonnées disponibles pour chaque niveau.

Les annonces Mode utilisent notamment `cities` et `zones`. Elles ne doivent pas être
interprétées implicitement par ce premier changement : cela étendrait la portée fonctionnelle et
pourrait créer plusieurs villes avec une province placeholder. Leur éventuelle synchronisation
multi-zone devra faire l'objet d'une décision séparée.

Sur une modification, le trigger doit comparer avant/après uniquement les champs utiles à la
localisation. Une mise à jour de prix, de description, de modération ou de `sortTimestamp` ne
doit provoquer aucune lecture ni écriture géographique.

Champs proposés pour la comparaison :

```text
province, city, street, country, countryCode,
provinceLon, provinceLat, cityLon, cityLat, streetLon, streetLat
```

Attention : `useOnSubmitFormProperty` retire actuellement les six coordonnées techniques du
document `properties` avant son écriture. Le trigger ne pourra donc pas les lire dans les
annonces créées par ce formulaire. Il faut choisir explicitement l'une des deux stratégies :

1. conserver ces coordonnées techniques dans le document pour que le trigger reproduise les
   données actuelles ;
2. ne pas les conserver et créer les entrées secondaires sans coordonnées lorsque celles-ci ne
   sont pas disponibles.

La recommandation est la stratégie 1 avec des champs clairement documentés, car supprimer les
coordonnées empêcherait de reproduire le comportement actuel. Ces champs ne doivent toutefois
pas être exposés comme coordonnées exactes du bien : `provinceLon/cityLon/streetLon` décrivent
des points de référence de la hiérarchie, contrairement à `longitude/latitude` qui peuvent
décrire la position du bien. Il faudra vérifier les règles de confidentialité et les payloads
publics avant de les conserver.

Si cette vérification conclut que les champs techniques ne doivent pas être persistés, la
stratégie 2 devient le choix sûr et les tests devront accepter des coordonnées absentes dans les
documents secondaires.

#### Idempotence et concurrence

Les événements Firestore peuvent être livrés plusieurs fois. La fonction doit donc être
idempotente : rejouer le même événement ne doit pas créer de doublon ni modifier inutilement les
dates.

Le code actuel effectue `find...ByName`, puis `setDoc` avec un identifiant déterministe construit
à partir du nom et des coordonnées. Cette approche limite les doublons, mais comporte deux cas
à traiter :

- deux événements simultanés peuvent tous deux ne rien trouver avant d'écrire ;
- une même localité créée une fois avec coordonnées puis une fois sans coordonnées produit deux
  identifiants déterministes différents.

Pour le premier lot, il ne faut pas changer silencieusement le format des identifiants existants,
car les API enfants les utilisent comme clés de relation. L'implémentation devra réutiliser en
priorité un document trouvé par son nom et son parent, puis employer le générateur d'identifiant
historique seulement lorsqu'aucun document n'existe. Une refonte vers des identifiants fondés
uniquement sur un libellé normalisé nécessiterait une migration séparée.

Les écritures existantes ne doivent pas être réécrites à chaque événement. Cela évite de changer
inutilement `updatedAt`, de multiplier les coûts Firestore et de provoquer d'autres traitements.

#### Gestion des erreurs et reprise

Le résultat de la publication principale ne dépendra plus du résultat de la synchronisation. Il
faut néanmoins rendre les échecs observables :

- données permanentes invalides, par exemple province ou ville vide : journaliser puis ignorer ;
- erreur Firestore transitoire : journaliser avec `propertyId`, niveau en échec et identifiant
  d'événement, puis laisser la politique de retry choisie rejouer l'opération ;
- province créée mais ville en échec : le rejeu doit réutiliser la province existante ;
- ville créée mais rue en échec : le rejeu doit réutiliser les deux parents existants.

Il ne faut pas écrire un statut d'erreur dans `properties` lors de ce premier lot : cette écriture
redéclencherait `onWrite` et compliquerait la protection contre les boucles. Si un suivi métier
devient nécessaire, utiliser une collection technique dédiée ou un champ explicitement exclu
par la fonction de comparaison.

#### Cache des listes géographiques

Les trois API de localisation utilisent un cache avec un TTL par défaut de 1 800 secondes. Une
nouvelle ville correctement créée peut donc ne pas apparaître immédiatement dans une réponse
déjà mise en cache.

Ce problème existe déjà avec les écritures client actuelles. Le déplacement dans un trigger ne
doit pas le masquer. Deux solutions seront à évaluer avec le point 2 :

- invalider les clés `provinces:all`, `cities:province:{provinceId}` et
  `streets:city:{cityId}` après une création réelle ;
- accepter la cohérence différée jusqu'à expiration du TTL.

L'invalidation ne doit jamais être exécutée quand les documents existaient déjà.

#### Découpage précis des changements envisagés

1. Extraire une fonction pure qui lit et normalise la localisation utile depuis un document
   `properties`.
2. Extraire une fonction pure `shouldSyncLocation(before, after)` qui ignore suppression,
   modification sans changement d'adresse et documents incomplets.
3. Créer un service Functions qui réalise la séquence idempotente province, ville, rue avec
   l'Admin SDK.
4. Créer le trigger Firestore `properties/{propertyId}` et l'exporter depuis
   `functions/src/index.ts`.
5. Retirer `createLocationEntities` et les imports `createProvince/createCity/createStreet` de
   `useOnSubmitFormProperty.ts`.
6. Garder dans le hook la préparation des images, le nettoyage des données, `createdBy` et la
   gestion du brouillon : ces responsabilités ne changent pas.
7. Décider puis implémenter la conservation ou non des six coordonnées techniques nécessaires
   au trigger.
8. Déployer d'abord sur l'environnement de développement et vérifier les documents Firestore
   réels avant tout déploiement de production.

#### Fichiers qui devraient être modifiés

Minimum attendu :

- `apps/location-maison/src/hooks/useOnSubmitFormProperty.ts` ;
- `apps/location-maison/__tests__/hooks/useOnSubmitFormProperty.test.ts` ;
- `apps/location-maison/functions/src/index.ts` ;
- nouveau module sous `apps/location-maison/functions/src/location/` ;
- nouveaux tests sous `apps/location-maison/functions/__tests__/location/`.

Les fichiers `province.db.ts`, `city.db.ts` et `street.db.ts` peuvent rester en place car
`SimpleLocationUpdater` les utilise encore. Ils ne doivent pas être supprimés dans ce chantier.
Le service Functions ne doit pas importer directement les modules client de
`apps/location-maison/src/db`, qui dépendent du SDK Web Firebase ; il utilisera l'Admin SDK.

#### Tests existants à préserver ou adapter

`apps/location-maison/__tests__/hooks/useOnSubmitFormProperty.test.ts` couvre actuellement :

- upload parallèle des nouvelles images et conservation des anciennes ;
- suppression des coordonnées techniques du payload ;
- conservation de la position exacte ;
- création séquentielle province/ville/rue ;
- tolérance aux erreurs de création géographique ;
- gestion du brouillon en création et modification ;
- réutilisation des images pré-uploadées par le parcours IA.

Les tests images, coordonnées finales, position exacte, brouillon et pré-upload doivent rester
inchangés autant que possible. Les deux tests qui affirment la création géographique dans le
hook doivent être remplacés : après le changement, ils testeraient une responsabilité qui
n'appartient plus au hook.

`apps/location-maison/__tests__/property/property-form-provider.test.tsx` doit continuer à
garantir :

- l'anti-double-soumission ;
- la conservation du brouillon pendant l'authentification ;
- la création ou modification unique de l'annonce ;
- le retour d'une annonce rejetée à `PENDING` lors d'une modification.

Aucune attente de synchronisation géographique ne devra être ajoutée à ces tests de formulaire.

Les tests de `SimpleLocationUpdater` doivent rester verts : ce service constitue un autre point
d'entrée et continuera à utiliser les repositories client existants.

#### Nouveaux tests unitaires requis

Pour la politique pure du trigger :

1. synchronise lors de la création d'une annonce immobilière valide ;
2. ignore une suppression ;
3. ignore une modification de prix ou description ;
4. synchronise lorsque province, ville ou rue change ;
5. ignore un document sans province ou sans ville ;
6. ne crée pas de rue lorsque `street` est vide ;
7. ignore une annonce Mode ne contenant que `cities/zones` ;
8. normalise les espaces sans modifier le libellé métier attendu ;
9. distingue coordonnées de hiérarchie et coordonnées exactes du bien.

Pour le service de synchronisation :

1. crée province, ville et rue dans cet ordre avec les bons identifiants parents ;
2. réutilise les trois documents lorsqu'ils existent ;
3. réutilise une province existante et crée les descendants manquants ;
4. un rejeu identique ne crée aucun doublon ;
5. une erreur ville empêche la création d'une rue sans parent valide ;
6. une erreur rue ne remet pas en cause les parents déjà créés ;
7. ne réécrit pas un document existant sans changement ;
8. conserve les coordonnées de référence dans les documents nouvellement créés.

Pour le handler du trigger :

1. transmet le `propertyId` et la localisation normalisée au service ;
2. retourne sans appeler le service lorsque la politique dit d'ignorer l'événement ;
3. journalise les données invalides sans lever d'erreur rejouable ;
4. propage une erreur transitoire selon la politique de retry retenue.

#### Test d'intégration recommandé avec émulateur

Un test Firestore Emulator devra écrire une annonce immobilière et vérifier, avec attente
bornée, la présence de la province, de la ville et de la rue ainsi que leurs liens parents. Une
seconde mise à jour limitée au prix devra vérifier qu'aucun document géographique supplémentaire
n'est créé. Une modification de ville devra enfin créer ou réutiliser la nouvelle branche.

Le test devra éviter une temporisation fixe longue. Il utilisera un polling borné ou les outils
de test Firebase Functions, afin de rester stable en CI.

#### Tests de performance ciblés

Ajouter un test unitaire avec promesses contrôlées pour démontrer que
`useOnSubmitFormProperty.onSubmit` se résout sans attendre le service géographique. La mesure
réelle en développement devra ensuite comparer :

```text
avant : images + province + ville + rue + écriture annonce
après : images + écriture annonce
```

Le gain attendu correspond au cumul des lectures/écritures géographiques retirées du chemin
critique, pas à la durée de l'upload des images.

#### Conditions de déploiement sans régression

1. Faire passer les tests unitaires actuels de l'application.
2. Faire passer les nouveaux tests Functions.
3. Construire l'application et les Cloud Functions.
4. Tester création et modification immobilières sur émulateur.
5. Tester qu'une annonce Mode reste inchangée et ne crée pas de hiérarchie parasite.
6. Déployer la fonction en développement avant de retirer le comportement client en production.
7. Pendant une transition de déploiement, accepter que client et trigger puissent tous deux
   tenter la synchronisation : l'idempotence doit rendre ce chevauchement sans danger.
8. Une fois la fonction observée en développement, déployer l'application sans l'attente client.
9. Surveiller erreurs, doublons et latence pendant au moins un cycle représentatif avant le
   déploiement production.

#### Décisions proposées pour ce lot

Afin que l'implémentation reste limitée et testable, le plan retient les décisions suivantes :

1. **Conserver les six coordonnées techniques dans `properties`** au lieu de les retirer dans le
   hook. Elles sont déjà produites par le formulaire et décrivent les points de référence de la
   province, de la ville et de la rue. Les sélecteurs consomment les coordonnées des documents
   secondaires pour positionner la carte ; les perdre lors d'une nouvelle création dégraderait
   ce comportement. Avant codage, une vérification ciblée des API publiques confirmera qu'elles
   ne sont pas confondues avec la position exacte du logement.
2. **Ne pas inclure l'invalidation Redis dans le point 1.** Elle appartient au point 2 et le
   package Functions ne partage actuellement pas le service de cache Next.js. Le TTL existant
   reste inchangé pendant ce lot, donc il n'y a pas de nouvelle régression par rapport au
   comportement actuel.
3. **Rendre le traitement idempotent et observable avant d'activer les retries.** La première
   version journalisera précisément les échecs et sera vérifiée en développement. Le retry
   automatique ne sera activé qu'après classification des erreurs permanentes et transitoires,
   afin d'éviter une boucle coûteuse sur une donnée invalide.
4. **Limiter le trigger à l'immobilier scalaire.** Les champs multi-zones de Mode restent hors
   scope et inchangés.
5. **Ne pas modifier le format historique des identifiants dans ce lot.** Une normalisation ou
   migration des identifiants sera traitée séparément si les tests révèlent des doublons.

Avec ces décisions, le point 1 peut être implémenté sans changer le contrat visible de création
d'annonce : seule la disponibilité des coordonnées techniques dans le document évolue, pour
permettre au traitement secondaire de reproduire les documents géographiques actuels.

## 2. Rendre la mise à jour des suggestions non bloquante

### Constat

Après `createProperty` ou `updateProperty`, la mutation du formulaire appelle
`updateOrCreateSuggestion` et attend son résultat, avec un timeout de huit secondes. La
redirection et le message de succès n'arrivent qu'après cette étape.

Fichier principal :

- `apps/location-maison/src/providers/property.form.provider.tsx`.

L'annonce peut donc être correctement enregistrée alors que l'utilisateur voit encore un état
de chargement pendant plusieurs secondes à cause d'une donnée auxiliaire.

### Proposition à analyser

- Afficher le succès et rediriger dès que l'écriture principale est confirmée.
- Exécuter l'actualisation des suggestions en arrière-plan, idéalement côté serveur.
- Journaliser son échec séparément sans transformer une publication réussie en erreur visible.

Ce point est distinct du point 1 : il faut vérifier si `updateOrCreateSuggestion` duplique déjà
une partie de `createLocationEntities`. Si les deux mécanismes servent le même besoin, leur
fusion ou la suppression de l'un d'eux serait préférable à deux traitements asynchrones.

### Risques et questions

- Une promesse simplement lancée avec `void` dans le navigateur peut être interrompue par la
  navigation.
- Il faut éviter les rejets de promesse non traités.
- Une exécution serveur devra être idempotente.

### Critère de validation

La redirection doit suivre immédiatement la réussite de l'écriture principale. Un échec des
suggestions ne doit ni ralentir ni invalider une annonce enregistrée.

## 3. Paralléliser la préparation de la vignette et l'upload principal

### Constat

`createFile` effectue actuellement, pour chaque image :

```text
upload image principale -> récupération URL -> compression vignette
                         -> upload vignette -> récupération URL vignette
```

Les différentes images sont déjà traitées avec `Promise.all`, mais les étapes internes à une
image restent largement séquentielles. La vignette ajoute donc compression et upload après la
fin de l'image principale.

Fichier principal :

- `apps/location-maison/src/db/file.db.ts`.

### Proposition à analyser

Démarrer la compression de la vignette et l'upload de l'image principale en parallèle. Une fois
la compression terminée, l'upload de la vignette peut commencer sans attendre l'URL principale.

La forme cible serait conceptuellement :

```text
                         /-> upload image principale --\
fichier déjà compressé -|                              |-> résultat Image
                         \-> compression -> upload thumb/
```

La vignette doit rester `best effort` : son échec ne doit jamais empêcher la création de
l'annonce.

### Risques et questions

- Deux traitements simultanés par image augmentent la charge CPU et réseau.
- Sur un téléphone peu puissant, plusieurs compressions parallèles peuvent bloquer l'interface.
- Il faut conserver le fallback `thumbURL -> fileURL`.
- Les noms et chemins Storage doivent rester uniques.

### Critère de validation

Sur un lot représentatif d'images, le temps par image doit tendre vers le maximum des deux
branches plutôt que vers leur somme, sans augmentation des échecs ni perte de vignette.

## 4. Remplacer le parallélisme illimité par une concurrence contrôlée

### Constat

Les formulaires immobilier, Mode et le hook partagé utilisent déjà :

```ts
await Promise.all(images.map((file) => createFile(file, userId, 'property')))
```

Cela lance immédiatement tous les uploads. Pour peu d'images et une bonne connexion, ce choix
est rapide. Avec davantage de photos ou une connexion mobile limitée, chaque upload se dispute
la même bande passante. Les compressions et créations de vignettes peuvent également saturer le
CPU et la mémoire.

Fichiers concernés :

- `apps/location-maison/src/hooks/useOnSubmitFormProperty.ts` ;
- `apps/location-maison/src/app/(protected)/property/create/page.tsx` ;
- `apps/location-maison/src/app/(protected)/category-listing/create/page.tsx`.

### Proposition à analyser

Créer un utilitaire partagé d'upload avec une limite de concurrence, initialement fixée à trois
images simultanées puis ajustée par mesure. Il devra :

- conserver l'ordre des images choisi par l'utilisateur ;
- remonter précisément l'image en erreur ;
- annuler ou ignorer proprement le lot en cas d'échec bloquant ;
- permettre ultérieurement une progression globale.

Il faut comparer au minimum les limites 2, 3 et 4, ainsi que le `Promise.all` actuel. Le but
n'est pas de réduire arbitrairement le parallélisme, mais d'obtenir le meilleur temps réel sur
les appareils et réseaux visés.

### Risques et questions

- Une limite trop basse rallongera le parcours sur fibre ou Wi-Fi rapide.
- Une limite trop haute recréera le problème actuel.
- `Promise.all` ne permet pas d'annuler les uploads déjà démarrés après le premier rejet.

### Critère de validation

Le temps médian ne doit pas régresser sur une bonne connexion et le percentile 95 doit
s'améliorer sur mobile, avec moins de timeouts et une interface qui reste réactive.

## 5. Anticiper les travaux indépendants dans les parcours assistés par IA

### Constat

Les deux parcours IA suivent volontairement cet ordre :

```text
upload des images -> appel IA -> préparation métier/localisation -> écriture annonce
```

L'upload précède l'appel IA afin de ne pas débiter un crédit si les images ne peuvent pas être
envoyées. Cette garantie découle d'un incident réel et doit être conservée.

Fichiers concernés :

- `apps/location-maison/src/app/(protected)/property/create/page.tsx` ;
- `apps/location-maison/src/app/(protected)/category-listing/create/page.tsx`.

### Proposition à analyser

Sans lancer prématurément l'appel facturable, plusieurs préparations peuvent commencer plus tôt :

- charger dynamiquement les modules nécessaires dès l'entrée dans le parcours ;
- compresser et préparer les images dès leur sélection ;
- charger ou mettre en cache les catégories publiables ;
- valider localement les champs pendant la saisie ;
- préparer les métadonnées et aperçus avant le clic final.

Après la réussite des uploads, l'appel IA reste séquentiel par contrainte métier. Il faudra aussi
étudier une évolution serveur capable de réserver puis confirmer un crédit, mais celle-ci change
le protocole de facturation et dépasse une simple optimisation avec `Promise.all`.

### Risques et questions

- Éviter une double compression entre la sélection et `createFile`.
- Nettoyer les ressources préparées si l'utilisateur retire une image.
- Ne jamais débiter le crédit avant que les préconditions définies soient remplies.
- Définir le devenir des images uploadées si l'appel IA échoue ensuite.

### Critère de validation

Réduire le temps entre le clic final et l'affichage de l'aperçu, sans changer la règle de débit
du crédit ni multiplier les traitements d'une même image.

## 6. Utiliser un upload Reel reprenable et afficher sa progression

### Constat

La création d'un réel exécute d'abord l'API de création du document, puis attend l'upload complet
de la vidéo avec `uploadBytes`. La modification avec nouveau montage suit le même principe : la
demande de retrim prépare le document, puis la vidéo est envoyée.

Fichiers concernés :

- `apps/location-maison/src/db/reel.db.ts` ;
- `apps/location-maison/src/components/reels/CreateOrphanReelClient.tsx` ;
- `apps/location-maison/src/components/reels/EditReelClient.tsx` ;
- `apps/location-maison/src/app/api/reels/route.ts`.

L'ordre document puis vidéo est justifié : l'upload Storage déclenche la Cloud Function de
transcodage, qui doit pouvoir retrouver le Reel et ses instructions de montage. Paralléliser ces
deux opérations créerait une course.

La durée ressentie dépend principalement du poids de la vidéo et du débit montant. Un
`Promise.all` ne réduira pas le temps physique du transfert.

### Proposition à analyser

Remplacer `uploadBytes` par `uploadBytesResumable` et exposer :

- le pourcentage envoyé ;
- les octets envoyés et le total ;
- éventuellement une estimation du temps restant ;
- pause, reprise ou annulation lorsque Firebase le permet ;
- un statut clair entre upload, transcodage et modération.

Évaluer également la compression ou le transcodage léger côté client avant l'upload, seulement
si son coût CPU, sa compatibilité mobile et la perte de qualité sont acceptables. Le transcodage
serveur actuel reste la source de vérité.

### Risques et questions

- Gérer le document Reel laissé en `uploading` après abandon.
- Permettre une reprise cohérente sans créer un second Reel.
- Éviter deux déclenchements de transcodage pour le même identifiant.
- Conserver `markReelUploadFailed` et définir une politique de nettoyage.

### Critère de validation

La durée brute peut rester liée au réseau, mais l'utilisateur doit voir une progression fiable,
pouvoir comprendre l'étape en cours et ne pas croire que l'application est bloquée.

## 7. Ne pas attendre les invalidations de cache avant la redirection

### Constat

Après la modification d'un Reel, le composant attend trois invalidations React Query via
`Promise.all` avant d'afficher le succès et de rediriger :

- liste des réels de l'utilisateur ;
- détail du réel édité ;
- flux public des réels.

Fichier principal :

- `apps/location-maison/src/components/reels/EditReelClient.tsx`.

Ces invalidations sont indépendantes les unes des autres et déjà parallélisées. Le problème est
qu'elles restent sur le chemin critique de l'interface.

### Proposition à analyser

- Mettre immédiatement à jour les données utiles avec `setQueryData` si nécessaire.
- Marquer les requêtes comme obsolètes sans attendre leur rechargement complet.
- Afficher le succès et naviguer dès que l'API de modification répond positivement.
- Laisser React Query rafraîchir les écrans concernés selon leur cycle normal.

La même vérification devra être faite sur les créations et modifications d'annonces, notamment
les invalidations de compteurs et de cache SEO.

### Risques et questions

- La page cible pourrait brièvement afficher une ancienne valeur si son cache reste actif.
- Il faut distinguer `invalidateQueries` de `refetchQueries` et vérifier le comportement de la
  version installée de React Query.
- Une mise à jour optimiste doit être annulée si l'écriture principale échoue.

### Critère de validation

La redirection doit suivre la réussite de la mutation principale sans attendre plusieurs
requêtes réseau, et la page cible doit afficher la nouvelle donnée immédiatement ou après un
rafraîchissement non bloquant.

## 8. Instrumenter toutes les phases avant et après optimisation

### Constat

Les parcours possèdent quelques logs de début, succès et erreur, mais pas une chronologie
homogène permettant d'attribuer précisément la lenteur à une phase. Sans mesure, une
optimisation peut déplacer le temps au lieu de le réduire.

### Proposition à analyser

Définir un identifiant de soumission et mesurer les phases suivantes :

#### Annonces classiques

- validation finale ;
- compression ou préparation des images ;
- upload principal par image ;
- génération et upload de vignette par image ;
- création des entités géographiques ;
- écriture ou mise à jour de l'annonce ;
- suggestions et invalidations ;
- temps jusqu'à la redirection.

#### Annonces assistées par IA

- toutes les phases précédentes ;
- attente de l'API IA ;
- validation et transformation de la réponse IA ;
- statut du débit de crédit.

#### Réels

- création ou préparation du document Reel ;
- upload de la vidéo ;
- délai avant le démarrage du transcodage ;
- durée du transcodage ;
- génération de miniature ;
- temps jusqu'au statut prêt ;
- invalidations et redirection lors d'une modification.

Les mesures côté client peuvent utiliser `performance.mark` et `performance.measure`. Les logs
serveur doivent reprendre le même identifiant de corrélation lorsque cela est possible. Aucun
contenu personnel, numéro de téléphone, description ou nom de fichier sensible ne doit être
envoyé dans la télémétrie.

### Indicateurs recommandés

- médiane, percentile 75 et percentile 95 du temps total ;
- durée moyenne de chaque phase ;
- débit d'upload observé ;
- taux d'échec et de timeout par phase ;
- taux d'abandon pendant l'attente ;
- répartition par nombre d'images et classes de taille vidéo.

### Critère de validation

Chaque soumission doit produire une chronologie exploitable en développement, puis une
télémétrie agrégée et respectueuse des données personnelles en production. Toute optimisation
devra être comparée à une mesure de référence.

## Ordre proposé pour l'analyse détaillée

1. Point 8 : poser la mesure minimale et établir une référence.
2. Points 1 et 2 : retirer les écritures géographiques secondaires du chemin critique.
3. Points 3 et 4 : optimiser le pipeline d'images et sa concurrence.
4. Point 7 : supprimer les attentes d'invalidation visibles.
5. Point 5 : réduire le délai des parcours IA sans compromettre les crédits.
6. Point 6 : améliorer le transfert et l'expérience des Reels.

Cet ordre pourra être ajusté après les premières mesures. Il évite de conclure à un gain sur la
seule base d'une impression locale.

## État de décision

À ce stade, les huit points sont des sujets d'analyse validés, pas encore des décisions
d'implémentation. Pour chaque point, l'étape suivante consiste à confirmer les dépendances dans
le code, établir une mesure de référence, choisir une option, écrire les tests de non-régression,
puis seulement modifier le parcours.

## Analyses détaillées des points 2 à 8

Les sections suivantes complètent les synthèses précédentes avec le même niveau de précision que
l'analyse du point 1. Elles définissent un plan ; elles n'autorisent pas encore une modification
groupée des sept sujets.

## Analyse détaillée du point 2 — Suggestions non bloquantes

### Conclusion technique

`updateOrCreateSuggestion` met à jour le document unique `suggestions/data` après l'écriture de
l'annonce. Il relit tout le document, reconstruit l'objet province/ville/rues, puis réécrit le
document complet. La fonction absorbe elle-même ses erreurs ; le timeout du provider protège
donc surtout contre une promesse réseau qui ne répond pas.

Cette donnée est secondaire et déjà synchronisée pendant la saisie par `useLocationSync` dans
certains formulaires. L'attente supplémentaire dans `property.form.provider.tsx` est redondante
et ne doit pas retarder la confirmation d'une création ou modification réussie.

### Solution retenue

- Retirer `updateOrCreateSuggestion` de la mutation finale du provider.
- Conserver provisoirement `useLocationSync`, car son retrait relève d'une consolidation du
  système de suggestions et non d'une optimisation de la soumission.
- Ne pas lancer la même écriture avec `void` juste avant `router.push` : elle ne serait pas
  garantie.
- Ajouter ultérieurement la mise à jour de `suggestions/data` au traitement serveur du point 1,
  ou remplacer définitivement ce document historique par les collections hiérarchiques. Cette
  décision fonctionnelle devra précéder toute nouvelle écriture serveur.

Le changement minimal de ce point consiste donc à supprimer une attente redondante, sans changer
la source utilisée par les formulaires.

### Risque important identifié

Le modèle `getDoc` puis `setDoc` du document unique est sujet aux mises à jour perdues : deux
utilisateurs publiant simultanément peuvent lire la même version et le dernier `setDoc` écrase
le premier. Ce risque n'est pas créé par l'optimisation, mais il interdit de présenter ce
document comme une file fiable. Toute consolidation future devra utiliser une transaction ou
des documents granulaires.

### Fichiers concernés

- `src/providers/property.form.provider.tsx` : retirer import et attente finale ;
- `__tests__/property/property-form-provider.test.tsx` : adapter les assertions ;
- `src/hooks/use-location-sync.ts` et `src/db/suggestion.db.ts` : inchangés dans ce lot.

### Tests

Tests existants à préserver : anti-double-soumission, création unique, modification d'une annonce
rejetée, authentification différée et redirection après succès.

Nouveaux tests requis :

1. la redirection intervient dès la résolution de `createProperty` ;
2. une promesse de suggestion volontairement pendante ne peut plus bloquer la soumission ;
3. une erreur d'écriture principale empêche toujours toast de succès et redirection ;
4. `useLocationSync` conserve séparément son comportement actuel ;
5. aucune écriture de suggestion n'est déclenchée deux fois par le provider final.

### Déploiement et retour arrière

Changement client isolé et réversible. Exécuter les tests du provider et du hook de
synchronisation, puis un E2E création/modification. Aucun changement Firestore ni déploiement de
fonction n'est requis pour le retrait minimal.

## Analyse détaillée du point 3 — Pipeline image et vignette

### Conclusion technique

Les images d'un lot sont parallélisées, mais `createFile` attend l'image principale avant de
démarrer `uploadThumbnail`. Le téléchargement dynamique de Firebase Storage est aussi effectué
une première fois par le chemin principal, puis demandé de nouveau par la fonction vignette,
même si le cache de modules limite normalement son coût après résolution.

### Solution retenue

Dans `createFile` :

1. importer en parallèle Storage et `browser-image-compression` ;
2. construire une seule fois les références principale et vignette ;
3. démarrer immédiatement l'upload principal ;
4. démarrer simultanément la compression de vignette, puis chaîner son upload ;
5. attendre le résultat principal, obligatoire ;
6. attendre la branche vignette, `best effort`, avant de retourner l'objet `Image` ;
7. construire les URL depuis les métadonnées, avec le fallback actuel inchangé.

Le résultat fonctionnel reste `{fileURL, filePATH, thumbURL?, thumbPATH?}`. L'échec principal
reste bloquant ; l'échec de vignette reste non bloquant.

### Limite de cette optimisation

Le fichier reçu par `createFile` est normalement déjà compressé par `useImageDropzone`. La
branche vignette applique une seconde compression pour atteindre 640 px/80 Ko. Il ne faut pas
réintroduire une compression de l'image principale dans `createFile` sans analyser le hook, sous
peine de doubler le travail CPU.

### Fichiers concernés

- `src/db/file.db.ts` ;
- `__tests__/db/file.db.test.ts` ;
- éventuellement un utilitaire de pipeline si le fichier devient difficile à tester.

### Tests

Préserver les tests existants : URL depuis métadonnées, fallback `getDownloadURL`, retries,
encodage du chemin, vignette optionnelle et traduction des erreurs Storage.

Ajouter :

1. une preuve avec promesses contrôlées que la compression démarre avant la résolution de
   l'upload principal ;
2. l'upload vignette peut commencer pendant que l'upload principal est encore en attente ;
3. `createFile` ne se résout pas avant le succès principal ;
4. un échec rapide de vignette ne rejette pas la branche principale ;
5. un échec principal rejette même si la vignette réussit ;
6. aucune promesse rejetée non gérée lorsque les deux branches échouent ;
7. les timeouts et retries restent propres à chaque branche ;
8. les deux références partagent exactement le même nom unique.

### Validation performance

Tester 1, 3, 5 et le maximum autorisé d'images, sur CPU ralenti et réseau simulé. Comparer temps
total, temps CPU, mémoire maximale et taux d'échec. Le changement sera conservé uniquement si le
temps total baisse sans gel perceptible du thread principal.

### Déploiement

Déployer séparément du limiteur du point 4 pour mesurer son effet propre. La forme Firestore des
images ne change pas ; le retour arrière est un retour au séquencement interne précédent.

## Analyse détaillée du point 4 — Concurrence contrôlée des images

### Conclusion technique

Trois parcours lancent actuellement toutes les images avec `Promise.all`. Le nombre maximal est
borné par `MAX_IMAGES_UPLOAD`, mais chaque image peut entraîner un upload principal, une
compression de vignette et un upload de vignette. Après le point 3, la pression simultanée sera
encore plus forte.

### Solution retenue

Créer un utilitaire indépendant, par exemple `mapWithConcurrency`, puis un service métier
`uploadPropertyImages`. Valeur initiale : trois images simultanées, configurable par constante
et non par variable distante dans le premier lot.

Contrat attendu :

- résultat dans le même ordre que les fichiers d'entrée ;
- limite stricte du nombre de tâches actives ;
- arrêt du lancement de nouvelles tâches après le premier échec ;
- attente ou gestion explicite des tâches déjà commencées pour éviter les rejets orphelins ;
- erreur enrichie avec index et nom non sensible destiné uniquement à l'interface locale ;
- tableau vide accepté ;
- pas de mutation du tableau fourni.

Les trois appels directs à `Promise.all(images.map(createFile))` utiliseront le service partagé.
Le hook conservera la fusion actuelle entre nouvelles images et images existantes.

### Annulation

`uploadBytes` ne fournit pas d'annulation. L'arrêt du lot sera donc coopératif : ne plus démarrer
de nouveaux fichiers, mais laisser se terminer ceux déjà envoyés. Une annulation réseau réelle
nécessiterait `uploadBytesResumable` également pour les images et n'est pas incluse dans ce lot.

### Fichiers concernés

- nouveau `src/lib/async/map-with-concurrency.ts` ;
- nouveau ou existant service d'upload d'images ;
- `src/hooks/useOnSubmitFormProperty.ts` ;
- pages IA immobilier et catégories ;
- tests unitaires du limiteur et tests des trois appelants.

### Tests

1. jamais plus de trois opérations actives ;
2. préservation de l'ordre malgré des résolutions désordonnées ;
3. traitement correct de 0, 1, 2, 3 et plus de 3 fichiers ;
4. arrêt des nouvelles tâches après erreur ;
5. absence de rejet non géré pour les tâches déjà actives ;
6. conservation de l'ordre visuel des images dans `Property.images` ;
7. aucune régression du chemin `preUploadedImages` ;
8. les pages IA appellent le même service partagé ;
9. le double clic ne démarre pas un second lot.

### Mesure et réglage

Comparer concurrence 2, 3, 4 et comportement actuel sur Wi-Fi rapide, réseau mobile lent et CPU
ralenti. La valeur 3 est une hypothèse initiale, pas une vérité. Documenter le résultat avant de
la figer.

### Déploiement

Livrer derrière une constante facile à ajuster. Surveiller temps médian, P95, timeouts Storage et
erreurs mémoire. Aucun changement de données ou de règles Firebase.

## Analyse détaillée du point 5 — Parcours IA

### Conclusion technique

L'ordre upload puis IA est une contrainte métier volontaire : l'API IA débite le crédit et une
panne d'upload ne doit pas laisser l'utilisateur débité sans annonce. `Promise.all` entre appel
IA et upload violerait cette garantie.

Les gains sûrs se trouvent avant le clic final et dans les opérations non facturables.

### Solution retenue

Premier lot sans changement du protocole de crédit :

1. garder `uploads -> IA -> validation -> écriture` ;
2. centraliser l'upload via le service du point 4 ;
3. précharger le chunk de compression et les dépendances du formulaire quand l'utilisateur
   entre dans le parcours ;
4. conserver la compression au moment de la sélection réalisée par `useImageDropzone` ;
5. charger les catégories publiables en amont comme aujourd'hui et interdire la soumission tant
   que la requête n'a pas un état connu ;
6. afficher une progression par phases : photos, génération, validation, enregistrement ;
7. conserver les images pré-uploadées lors de l'appel à `useOnSubmitFormProperty`.

Ne pas envoyer la description à l'IA avant le clic : cela consommerait du crédit et traiterait
potentiellement des données que l'utilisateur n'a pas décidé de soumettre.

### Sujet connexe à traiter séparément

Les images deviennent orphelines si l'upload réussit puis l'IA ou Firestore échoue. Un mécanisme
de brouillon/expiration Storage est recommandé, mais il s'agit d'un chantier de cohérence et de
coûts distinct. Il ne doit pas être introduit implicitement dans une optimisation de latence.

### Fichiers concernés

- pages `property/create` et `category-listing/create` ;
- `useImageDropzone` ;
- service d'upload du point 4 ;
- routes IA uniquement pour ajouter corrélation et mesure, sans changer la facturation.

### Tests

1. l'appel IA ne commence jamais avant le succès de tous les uploads ;
2. un upload en échec interdit l'appel IA et ne débite donc aucun crédit ;
3. les images pré-uploadées ne sont pas renvoyées ;
4. une erreur IA empêche `createProperty` ;
5. une réponse IA invalide affiche une erreur sans créer d'annonce ;
6. `createProperty` n'est appelé qu'une fois ;
7. les états de progression suivent l'ordre réel ;
8. Mode refuse une catégorie IA absente des feuilles publiables ;
9. immobilier conserve la validation Zod par type ;
10. les contacts et localisations de fallback restent inchangés.

### E2E

Étendre le test existant de création immobilier/Mode avec interception des requêtes pour prouver
l'ordre temporel upload, IA, écriture. Ajouter les scénarios upload refusé, API IA 500 et réponse
IA invalide. Les tests ne doivent jamais appeler réellement Gemini ni débiter un crédit.

### Déploiement

Livrer l'affichage des phases et le service partagé sans modifier l'API de crédits. Toute
réservation/confirmation de crédit fera l'objet d'une spécification et de tests financiers
séparés.

## Analyse détaillée du point 6 — Upload Reel reprenable

### Conclusion technique

Le document Reel doit exister avant l'objet Storage : le trigger de transcodage a besoin du
chemin, du propriétaire et des paramètres de montage. La séquence `createReel` puis upload est
donc conservée. Le gain visé est la résilience et la perception, pas une parallélisation risquée.

### Solution retenue

Faire évoluer `uploadRawReelVideo` vers une API à callbacks ou événements :

```ts
uploadRawReelVideo(file, ownerId, reelId, {
  onProgress,
  signal,
})
```

Elle utilisera `uploadBytesResumable`, écoutera `state_changed`, calculera un pourcentage borné
de 0 à 100 et retournera le même `rawVideoPath`. Une petite couche dédiée convertira la tâche
Firebase en Promise afin de préserver les `await` existants.

Les écrans distingueront : préparation, envoi, traitement serveur, prêt et échec. Pause/reprise
ne sera exposée que si l'UX et la persistance de la tâche dans la même session sont maîtrisées.
Une reprise après fermeture du navigateur n'est pas promise par ce premier lot.

### Compatibilité

- conserver le chemin `reels-raw/{ownerId}/{reelId}.{extension}` ;
- conserver les métadonnées owner/reelId ;
- conserver timeout de dix minutes, mais annuler explicitement la tâche lorsqu'il expire ;
- conserver `markReelUploadFailed` ;
- ne pas changer le contrat du trigger de transcodage ;
- empêcher une seconde soumission par le verrou existant.

### Fichiers concernés

- `src/db/reel.db.ts` ;
- `CreateOrphanReelClient.tsx` ;
- `EditReelClient.tsx` ;
- composants d'affichage de progression ;
- tests DB, composants et E2E Reel.

### Tests

1. abonnement correct à `state_changed` ;
2. progression 0, intermédiaire et 100 sans division par zéro ;
3. résolution avec le même chemin après succès ;
4. traduction des erreurs Firebase inchangée ;
5. timeout annule la tâche et marque le Reel en échec ;
6. démontage du composant n'entraîne aucune mise à jour d'état tardive ;
7. double clic : une création et une tâche seulement ;
8. échec création : aucun upload ;
9. échec upload : un appel `markReelUploadFailed` ;
10. retrim : paramètres écrits avant l'upload et statut cohérent ;
11. la progression affichée est accessible (`progressbar`, valeur et libellé) ;
12. le toast « traitement démarre » n'apparaît qu'après upload complet.

### E2E et environnement réel

Préserver `property-add-reel.spec.ts` et le smoke test Reel. Ajouter un test avec tâche Storage
simulée pour la progression. Sur Firebase dev, tester petite vidéo, vidéo proche de la limite,
réseau interrompu et onglet quitté. Ne jamais utiliser la production pour les essais de panne.

### Déploiement

Déployer le client sans modifier la Cloud Function de transcodage. Surveiller durée, taux
d'annulation, documents bloqués en `uploading` et doubles objets Storage. Prévoir un nettoyage
séparé des Reels abandonnés.

## Analyse détaillée du point 7 — Invalidations non bloquantes

### Conclusion technique

Les trois invalidations de `EditReelClient` sont déjà parallèles. Leur attente avant toast et
navigation est le seul problème. `invalidateQueries` peut déclencher le refetch des requêtes
actives ; la durée dépend donc du réseau et non de la mutation réussie.

### Solution retenue

Après succès API :

1. mettre à jour ou retirer du cache le détail édité avec `setQueryData` ;
2. mettre à jour les champs simples dans la liste « mes réels » lorsque cela reste trivial ;
3. appeler les invalidations avec `void` et un gestionnaire d'erreur explicite ;
4. afficher le toast puis naviguer sans attendre les refetch ;
5. ne pas modifier optimistiquement le cache avant la réussite serveur dans ce premier lot.

Pour un retrim, le cache doit refléter `processingStatus: uploading` et retirer l'ancienne URL
prête si l'interface pourrait sinon afficher une vidéo périmée.

### Extension aux annonces

Dans `property.form.provider.tsx`, `invalidateQueries` et l'invalidation du compteur sont déjà
lancées sans attente. Il faudra seulement confirmer qu'aucune page cible ne dépend d'un cache
stale. Ce point ne doit pas transformer toutes les invalidations du projet sans besoin mesuré.

### Fichiers concernés

- `EditReelClient.tsx` et son test dédié à créer ou compléter ;
- éventuellement un helper de mise à jour du cache Reel ;
- pas de modification globale de React Query.

### Tests

1. une invalidation pendante ne bloque ni toast ni navigation ;
2. les trois clés sont toujours invalidées ;
3. un rejet d'invalidation est journalisé sans toast d'échec de modification ;
4. une erreur API bloque toujours la navigation ;
5. le cache détail contient contact et description mis à jour ;
6. un retrim place le cache en état de traitement ;
7. aucune mise à jour de cache n'a lieu avant le succès serveur ;
8. le démontage après navigation ne produit pas d'erreur.

### Déploiement

Changement purement client, livrable séparément. Vérifier « modifier puis revenir immédiatement »
et navigation lente. Retour arrière simple : rétablir l'attente du `Promise.all`.

## Analyse détaillée du point 8 — Instrumentation

### Conclusion technique

Ce point doit précéder les optimisations, mais l'instrumentation doit rester légère et ne jamais
devenir elle-même une dépendance de publication. Les logs actuels du provider donnent début,
succès et échec, sans durée par étape ni corrélation client/serveur.

### Solution retenue

Créer un petit module `submission-performance` indépendant du fournisseur de télémétrie. Il
exposera conceptuellement :

- création d'un `submissionId` aléatoire ;
- début/fin d'une phase avec `performance.now()` ;
- ajout de dimensions non personnelles ;
- émission `best effort` ;
- nettoyage des marques après soumission.

Phases normalisées : `validation`, `image_prepare`, `image_upload`, `thumbnail`, `ai`,
`location_sync`, `property_write`, `reel_create`, `video_upload`, `cache_invalidation` et
`navigation`.

Dimensions autorisées : type de parcours, création/modification, catégorie racine, nombre de
fichiers, classe de taille, succès/échec, code d'erreur interne, type réseau générique si
disponible. Interdits : description, titre, téléphone, UID, URL Storage, nom de fichier, adresse
et coordonnées.

Le `submissionId` peut être transmis dans un header applicatif aux routes internes et repris dans
les logs serveur. Il ne doit pas servir d'identifiant utilisateur durable.

### Comportement en cas d'indisponibilité

- `performance` absent : utiliser une horloge simple ou désactiver la mesure ;
- télémétrie refusée ou hors ligne : ignorer sans retry bloquant ;
- erreur d'émission : ne jamais modifier le résultat de la soumission ;
- tests : injecter une horloge déterministe.

### Fichiers concernés

- nouveau module sous `src/lib/observability/` ;
- providers/pages de création et modification ;
- pipeline image et Reel ;
- routes IA, property et reels pour la corrélation ;
- logger existant, sans introduire obligatoirement un nouveau fournisseur externe.

### Tests unitaires

1. durées calculées avec une horloge injectée ;
2. phases imbriquées ou répétées distinguées par fichier/index ;
3. fin de phase après erreur ;
4. émission non bloquante ;
5. panne du transport sans impact métier ;
6. suppression des clés interdites ;
7. aucune valeur personnelle dans le payload final ;
8. nettoyage des marques ;
9. même `submissionId` sur les phases d'une soumission ;
10. nouvel identifiant lors d'une nouvelle tentative.

### Tests d'intégration

Pour chaque parcours, injecter un transport en mémoire et vérifier l'ordre des phases et leur
statut sur succès, upload refusé, erreur IA, erreur Firestore et timeout. Ne pas rendre les tests
dépendants des valeurs exactes de durée, seulement de valeurs positives et de l'ordre causal.

### Mise en production progressive

1. activer d'abord les mesures uniquement en développement ;
2. établir la baseline sur les scénarios contrôlés ;
3. vérifier volume et absence de données personnelles ;
4. activer un échantillonnage en production plutôt qu'un événement par sous-opération pour tous
   les utilisateurs ;
5. construire un tableau médiane/P75/P95 et taux d'échec ;
6. comparer chaque optimisation avec la même version de métriques.

### Critère de sortie

Une optimisation ne sera considérée validée que si la phase ciblée s'améliore sans hausse du
taux d'échec, sans régression du temps total P95 et sans nouvelle exposition de données.

## Matrice finale de séquencement

| Lot | Contenu | Prérequis | Tests bloquants |
|---|---|---|---|
| A | Instrumentation minimale (8) | Aucun | confidentialité + horloge + parcours succès/échec |
| B | Géographie hors chemin critique (1) | A | hook + Functions + émulateur |
| C | Suppression attente suggestions (2) | A, décision de source | provider + E2E création/modification |
| D | Pipeline vignette (3) | A | `file.db` + charge CPU/réseau |
| E | Limiteur d'uploads (4) | D conseillé | utilitaire + ordre + erreurs + trois appelants |
| F | Parcours IA (5) | D et E | ordre upload/IA/crédit + E2E sans Gemini réel |
| G | Invalidations Reel (7) | A | cache + navigation + erreurs API |
| H | Upload Reel reprenable (6) | A | DB + composants + E2E Firebase dev |

Chaque lot doit être fusionnable et réversible indépendamment. Les changements utilisateur déjà
présents dans le dépôt et les résultats E2E locaux ne font pas partie de ces lots.
