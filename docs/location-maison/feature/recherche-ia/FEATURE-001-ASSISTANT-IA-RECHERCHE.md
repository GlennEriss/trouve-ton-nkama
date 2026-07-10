# FEATURE-001 - Assistant IA de Recherche Logement

## 1. Contexte

La page `/search` reste la recherche classique via filtres.
Le besoin est de lancer une experience dediee sur `/search-with-ia` pour ajouter un assistant IA qui:

- comprend les intentions en langage naturel
- suggere des alternatives utiles quand il y a peu/pas de resultats
- reste strictement dans le perimetre immobilier
- est monétisé par credits avec un modele rentable

## 2. Objectifs

## 2.1 Objectifs utilisateur

- Trouver plus vite un logement pertinent.
- Obtenir des suggestions concretes sans refaire tous les filtres a la main.
- Comprendre pourquoi une recherche renvoie peu/pas de resultats.

## 2.2 Objectifs business

- Recuperer les recherches "0 resultat" (rescue rate).
- Augmenter les interactions a valeur (consultation, WhatsApp, favoris).
- Monétiser l'assistance IA tout en gardant une marge brute cible >= 65%.

## 3. Perimetre fonctionnel V1

## 3.1 Inclus

- Page dediee `/search-with-ia` pour la recherche conversationnelle IA.
- Chat IA integre a `/search-with-ia`.
- CTA de redirection depuis `/search` vers `/search-with-ia`.
- Analyse de la demande utilisateur (budget, chambres, zone, type, tags).
- Suggestions d'assouplissement des criteres.
- Application guidee des filtres de recherche.
- Regles de debit credits basees sur l'usage recherche reel.
- Journalisation des couts (tokens/requetes) et de la rentabilite.

## 3.2 Hors perimetre V1

- Surcharge de l'UI `/search` avec un chat IA complet.
- Negociation locative automatisée.
- Evaluation juridique d'un contrat.
- Promesses de disponibilite non verifiee.
- Voice bot, appels telephoniques, WhatsApp bot automatique.

## 4. Regles metier de facturation (V1)

1. Tant qu'aucun appel recherche n'est declenche, la conversation coute `0 credit`.
2. Au premier appel recherche: debit `1 credit`.
3. Au-dela: debit par paliers (exemple: `+1 credit` toutes les 3 recherches additionnelles).
4. Plafond par conversation (exemple: max 3 credits) pour limiter les surprises utilisateur.
5. En cas d'erreur technique de l'agent: pas de debit.

Les seuils exacts sont configures dans `COUTS-MARGE-UNIT-ECONOMICS.md`.

## 5. Exigences non fonctionnelles

- Securite reponse: aucune insulte, aucun contenu haineux, aucun conseil hors perimetre recherche logement.
- Observabilite: chaque tour doit etre tracable (tokens, appels recherche, credits debites).
- Transparence: l'UI doit afficher clairement quand un debit est possible.
- Performance: 95e percentile de reponse conversationnelle <= 4s (hors timeout fournisseur externe).

## 6. Criteres d'acceptation

1. L'agent reste dans le perimetre immobilier et refuse les demandes abusives/hors scope.
2. Le debit ne se produit pas pour un simple echange de clarification sans appel recherche.
3. Chaque session expose un rapport cout/revenu exploitable.
4. Le taux de "0 resultat" converti en ">=1 resultat" est mesurable.
5. Le taux de marge quotidienne est calculable automatiquement.

## 7. KPIs produit et finance

- `ai_search_entrypoint_source` (`search_cta`, `direct`, `other`)
- `ai_search_sessions_total`
- `ai_search_sessions_with_no_results_initial`
- `ai_search_rescued_sessions_total`
- `ai_search_search_calls_total`
- `ai_search_input_tokens_total`
- `ai_search_output_tokens_total`
- `ai_search_credits_debited_total`
- `ai_search_cost_fcfa_total`
- `ai_search_revenue_fcfa_total`
- `ai_search_gross_margin_rate`

## 8. Plan de rollout

1. `Phase 1` - Instrumentation + guardrails + debit policy.
2. `Phase 2` - Activation progressive (feature flag) sur un pourcentage d'utilisateurs.
3. `Phase 3` - Ajustement des paliers credits selon marge observee.
4. `Phase 4` - Dashboard admin dedie (hors scope de ce document).
