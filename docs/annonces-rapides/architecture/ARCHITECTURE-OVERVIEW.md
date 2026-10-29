# Vue d'ensemble

## Décisions

| Brique | Décision | Motif / coût / risque |
| --- | --- | --- |
| Next.js, Auth existante, Firestore, Functions, MyPayGa | Use now | Même exploitation ; pas de prestataire ni base supplémentaire |
| Collections `quick_listings` et `quick_listing_payments` | Use now (cible) | Modèle minimal sans champs immobiliers fictifs ; paiements privés séparés. Coût : règles/index et file admin dédiés |
| Variante dans `properties` | Not now | Risque de contaminer cartes, filtres prix, photos, recherche et publication classiques ; réévaluer seulement après unification explicite des contrats catalogue |
| Redis, broker, nouveau moteur de recherche | Not now | Pas de besoin démontré ; réévaluer sur mesures de charge/latence |
| Extraction du texte, recherche plein texte | Re-evaluate later | Requiert qualité mesurée et besoin confirmé ; aucun prix deviné |

## Frontières

UI → API authentifiée Next.js → Firestore Admin pour réservation → Function d'initiation MyPayGa → callback signé → Firestore → modération admin → visibilité publique.

L'API ne transmet pas un UID déclaré par le navigateur. La Function d'initiation reçoit uniquement une référence réservée et un ticket serveur privé, à usage unique ; elle recharge le paiement privé. L'appel direct sans ticket valide est interdit. Le ticket est stocké haché avec expiration, lié à l'opération, jamais renvoyé au navigateur ni loggé. Si l'infrastructure permet un appel IAM authentifié, préférer celui-ci ; le mode doit être choisi et testé avant exposition de la Function. Pas de confiance dans un simple en-tête UID.

## Cibles non fonctionnelles (à mesurer, non garanties)

- Catalogue : 20 résultats par page, plafond 50, curseur stable, pas d'offset ni de scan intégral.
- Accueil : 4 offres maximum ; pas de téléchargement de tout le catalogue.
- API lecture p95 < 1 s hors réseau utilisateur ; polling 3 s pendant 3 min, ensuite état « vérification en cours » récupérable.
- Réponse webhook seulement après commit durable ; erreur transitoire serveur 5xx pour permettre reprise fournisseur.
- Disponibilité dépendante des services existants, pas de promesse chiffrée sans mesure.

## Risques

Double débit : clé d'idempotence + réservation transactionnelle, pas de retry fournisseur aveugle. Timeout : statut indéterminé, rapprochement nécessaire. Fuite payeur : collection privée + DTO explicite. Publication prématurée : prédicat commun paiement/modération/état. Fraude : avertissements et modération, sans badge de logement vérifié inventé. E-mail admin : émission à l'entrée PENDING uniquement ; l'envoi SMTP reste soumis à sa configuration effective.

Dev et prod doivent avoir références et callbacks propres ; aucun secret recopié dans le client. Activation désactivée par défaut tant que conditions commerciales et validations ne sont pas terminées.
