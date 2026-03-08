# Architecture - Assistant IA Recherche

## 1. Principes

- L'IA n'est pas une boite noire: chaque tour est mesure (usage, cout, revenu).
- Le debit credits suit l'usage utile (appel recherche), pas le simple bavardage.
- Les garde-fous securite sont appliques en deux couches: prompt + validation applicative.
- Toute decision critique (debit, marge, alerting) doit etre pilotable par configuration.

## 2. Vue logique

1. `Search UI classique` (`/search`)
- Reste centree sur les filtres standards.
- Expose un CTA vers `/search-with-ia`.

2. `Search With IA UI` (`/search-with-ia`)
- Affiche le chat IA dedie.
- Envoie les messages utilisateur + contexte de filtres.
- Affiche les resultats et l'information de debit.

3. `AI Search Gateway API` (backend applicatif)
- Point d'entree unique pour la conversation.
- Orchestration: agent, debit credits, analytics, observabilite.
- Enforcement des policies (scope, refus, paliers credits, limites).

4. `Conversation Runtime (serveur applicatif)`
- Genere la reponse conversationnelle IA cote serveur (aucun appel modele IA en front).
- Applique guardrails et fallback deterministe.
- Ne peut pas debiter de credits sans transaction backend.

5. `Algolia Search + Analytics`
- Execute les requetes de logements.
- Expose les metriques analytiques de recherche (top recherches, no result, filtres, clics).
- Recoit les evenements clics/resultats pour enrichir l'analytics.

6. `Credit Service`
- Debit atomique via transaction.
- Journal d'historique des depenses.

7. `Analytics & Cost Store`
- Stocke sessions/tours avec tokens, appels recherche, cout estime, revenu estime.
- Sert aux rapports quotidiens et alertes.

8. `Admin Read APIs`
- Expose les metriques (produit, finance, marge) en lecture seule.

## 3. Contrat d'API recommande

## 3.1 Endpoint conversation

- `POST /api/ai-search/conversations/{conversationId}/messages`

Request (exemple):

```json
{
  "message": "Je cherche une maison 3 chambres a 190000 a Libreville",
  "searchContext": {
    "query": "maison 3 chambres",
    "filters": {
      "province": "Estuaire",
      "city": "Libreville",
      "minPrice": 150000,
      "maxPrice": 190000
    }
  }
}
```

Response (exemple):

```json
{
  "assistantMessage": "A 190000 FCFA, je ne trouve pas de 3 chambres. Voulez-vous tester 220000 FCFA ou une zone voisine ?",
  "suggestedActions": [
    {"type": "APPLY_FILTERS", "payload": {"maxPrice": 220000}},
    {"type": "APPLY_FILTERS", "payload": {"city": "Akanda"}}
  ],
  "usage": {
    "searchCallsDelta": 1,
    "inputTokens": 632,
    "outputTokens": 184
  },
  "billing": {
    "creditsDebited": 1,
    "creditsRemaining": 9
  }
}
```

## 3.2 Journalisation minimale

Collection `ai_search_turns`:

- `conversationId`
- `userId`
- `messageRole` (`user|assistant|system`)
- `searchCallsDelta`
- `inputTokens`
- `outputTokens`
- `creditsDebited`
- `costEstimatedFcfa`
- `revenueEstimatedFcfa`
- `marginRate`
- `createdAt`

## 4. Politique de debit (reference)

- `if searchCallsDelta == 0 => creditsDebited = 0`
- `if firstSearchCallInConversation => creditsDebited = 1`
- `if additionalSearchCallsCrossThreshold => creditsDebited += 1`
- `if technicalFailure => rollback/no debit`

Note: la politique doit etre parametrable (seuils, plafond, periode).

## 5. Securite et gouvernance

- Validation d'entree: taille message, anti-spam, anti-prompt injection basique.
- Validation de sortie: blocage des reponses hors scope et ton inapproprie.
- Journal des refus: conserver les cas hors perimetre pour ameliorer prompts.
- Versionnage prompt: chaque tour stocke `promptVersion`.

## 6. Diagramme de sequence

Voir: `ia-recherche-sequence-diagram.puml`

## 7. Decisions techniques recommandees

1. Introduire un feature flag `ai_search_assistant_enabled`.
2. Isoler l'orchestration IA dans une API backend (pas de debit direct en front).
3. Garder Algolia comme moteur unique de recherche + analytics.
4. Centraliser les constantes de pricing dans une config server.
5. Mettre en place un job quotidien de calcul marge (`daily_margin_report`).
6. Garder `/search` simple et router les usages IA vers `/search-with-ia`.
