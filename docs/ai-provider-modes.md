# Gemini : désactivation réversible et mode manuel

## Configuration unique (backend Web)

`AI_PROVIDER=none` désactive Gemini. C'est aussi le comportement par défaut lorsque la variable est absente ou invalide. La présence d'une clé Gemini seule ne suffit plus à activer l'IA.

`AI_PROVIDER=gemini` réactive les implémentations existantes. Conserver les clés et la configuration du modèle ; ne jamais les exposer au mobile ou à l'endpoint de capacités.

Après modification de la variable, redémarrer le serveur local ou redéployer le backend sur l'environnement concerné. Aucun changement de code n'est nécessaire pour les bascules suivantes.

Le Web et le mobile interrogent `GET /api/ai/capabilities` (sans cache). La configuration ne dépend pas d'une variable publique compilée dans chaque frontend. Une réponse invalide/indisponible bascule vers le mode sans IA. Réouvrir le formulaire pour actualiser son mode après une bascule.

## Impacts fonctionnels

| Parcours | Mode `none` | Mode `gemini` |
|---|---|---|
| Immobilier Web | Choix du type et formulaire manuel existant `/property/add/*` | Génération existante depuis la description |
| Mode / catégories Web | Titre, prix, catégorie, villes et attributs saisis explicitement | Détection / extraction existantes |
| Création mobile | Champs explicites selon le type de bien ou le schéma de catégorie ; API de publication existante | API Web de génération existantes |
| Assistant de formulaire | Lanceurs masqués ; appel direct refusé avec `AI_DISABLED` | Assistant existant |
| Recherche conversationnelle | Extraction déterministe, Algolia et réponses déterministes ; aucun débit IA | Gemini peut reformuler les résultats ; tarification interne existante |
| Fallback Firebase AI navigateur | Bloqué par vérification des capacités, même si son ancien flag est activé | Reste soumis au flag existant |
| Admin / Cloud Functions | Pas d'appel direct Gemini identifié, aucun changement | Inchangé |

Aucun texte n'est artificiellement « généré » en mode manuel. Aucune inférence de prix/type/contact depuis la description. Les utilisateurs remplissent les données structurées. Les photos, la publication, l'authentification et la modération suivent les circuits existants.

Le mode sans IA ne débite pas de crédit d'assistance IA. Il ne supprime pas les frais des autres produits (boost, annonce rapide, etc.). Algolia, Storage et Firestore restent utilisés et peuvent conserver leurs propres coûts.

## Protections

- Les trois endpoints de génération/assistant refusent avant l'appel fournisseur et la logique de crédit.
- La recherche choisit le fournisseur sans IA avant le chargement du SDK Gemini.
- Le secours navigateur revérifie le mode avant tout appel Firebase AI.
- Les entrées manuelles sont validées avant l'upload ; les validations de publication existantes restent actives.
- Aucun document, secret ou crédit existant n'est supprimé ou modifié par le changement de mode.

## Déploiement et limites

Ces changements doivent être déployés pour affecter la production. Déployer le backend Web et distribuer la version mobile mise à jour. Les anciennes versions mobiles qui ne connaissent pas le mode manuel recevront `AI_DISABLED` sur les anciennes API de génération.

Les onglets PWA déjà ouverts doivent être rechargés. Un ancien bundle pouvant appeler directement Firebase AI ne connaît pas nécessairement ce coupe-circuit applicatif : une interdiction absolue de tous les anciens clients exige une restriction du service côté Google/Firebase. Les appels déjà en cours ne sont pas annulés rétroactivement.

Avant réactivation : vérifier le prépaiement du bon projet Google, les quotas et le modèle. Puis définir `AI_PROVIDER=gemini`, redéployer le Web et rouvrir les formulaires. Le mobile mis à jour récupère le mode depuis le backend sans nouvelle configuration Meta/Firebase ni nouvelle compilation pour chaque bascule.

## Vérifications

Tests dédiés : fournisseur absent/invalide, réactivation, endpoints désactivés avant accès DB, recherche sans appel Gemini ni débit, conservation du mode IA avec mocks, publication mobile manuelle Immobilier/Mode, validation des attributs et des types de biens. Aucun test ne nécessite de consommation Gemini réelle.
