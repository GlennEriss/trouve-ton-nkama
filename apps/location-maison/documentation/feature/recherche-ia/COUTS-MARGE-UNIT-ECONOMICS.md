# Couts, Credits et Marge - Assistant IA Recherche

## 1. Objectif

Eviter une facture tokens/requetes excessive et maintenir un modele rentable.

## 2. Donnees de base (packs actuels)

Valeur implicite d'un credit selon pack:

- Starter: `2000 / 5 = 400 FCFA`
- Standard: `3500 / 10 = 350 FCFA`
- Avance: `7500 / 25 = 300 FCFA`
- Premium: `12500 / 50 = 250 FCFA`

Hypothese prudente pour calcul marge:

- `valeur_credit_reference_fcfa = 250` (pire cas)

## 3. Formules

Revenu par session:

```text
revenue_fcfa = credits_debited * valeur_credit_reference_fcfa
```

Cout par session:

```text
cost_fcfa = cost_tokens_fcfa + cost_search_requests_fcfa + cost_infra_fcfa
```

Marge brute:

```text
gross_margin_rate = (revenue_fcfa - cost_fcfa) / revenue_fcfa
```

## 4. Politique de debit recommandee (V1)

1. `0 credit` si `searchCallsDelta == 0`.
2. `1 credit` au premier appel recherche de la conversation.
3. `+1 credit` toutes les 3 recherches additionnelles.
4. `max 3 credits` par conversation.

Pourquoi:

- percu comme juste (paiement sur valeur reelle)
- protege contre les conversations longues non productives
- donne un cadre de marge previsible

## 5. Instrumentation obligatoire

Par tour (`ai_search_turns`):

- `inputTokens`
- `outputTokens`
- `searchCallsDelta`
- `creditsDebited`
- `costEstimatedFcfa`
- `revenueEstimatedFcfa`
- `marginRate`

Par jour (`ai_search_daily_kpi`):

- `totalSessions`
- `totalCreditsDebited`
- `totalCostFcfa`
- `totalRevenueFcfa`
- `grossMarginRate`
- `rescuedSessionsRate`
- `avgCostPerSessionFcfa`
- `avgRevenuePerSessionFcfa`

## 6. Seuils d'alerte

Alertes finance:

- `grossMarginRate < 0.65` (alerte rouge)
- `avgCostPerSessionFcfa` en hausse > 20% sur 7 jours
- `searchCallsPerSession` > seuil cible
- `outputTokensPerSession` > seuil cible

Alertes produit:

- `rescuedSessionsRate` en baisse (moins de recuperation des "0 resultat")
- `noResultSessionsRate` en hausse

## 7. Leviers de reduction de cout

1. Limiter `max output tokens` par tour.
2. Limiter le nombre d'appels recherche par conversation.
3. Activer et exploiter le cache des completions.
4. Compresser le contexte conversationnel (historique court).
5. Preferer des modeles moins couteux pour les taches simples.

## 8. Rapport quotidien "gagnant"

Le rapport journalier doit afficher:

- `cout total`
- `revenu total`
- `marge brute`
- `top 10 causes de surcout` (sessions longues, appels repetes, tokens excessifs)
- `actions correctives proposees`

Sans ce rapport, la monétisation n'est pas pilotable.

## 9. Gouvernance

- Revue hebdomadaire produit + finance.
- Ajustement mensuel des paliers credits.
- Historique des changements de pricing versionne.
